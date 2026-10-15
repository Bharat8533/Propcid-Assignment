import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

let server;
let baseUrl;

let agentToken = '';
let agentUser = null;
let adminToken = '';
let adminUser = null;
let agent2Token = '';
let createdDraftId = null;

test.before(async () => {
  process.env.NODE_ENV = 'test';
  await new Promise(resolve => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // Login Vikram (Agent)
  const resAgent = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vikram@test.com', password: 'Agent@123' })
  });
  const dataAgent = await resAgent.json();
  agentToken = dataAgent.token;
  agentUser = dataAgent.user;

  // Login Asha (Admin)
  const resAdmin = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'Admin@123' })
  });
  const dataAdmin = await resAdmin.json();
  adminToken = dataAdmin.token;
  adminUser = dataAdmin.user;

  // Login Meera (Agent 2)
  const resAgent2 = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'meera@test.com', password: 'Agent@123' })
  });
  const dataAgent2 = await resAgent2.json();
  agent2Token = dataAgent2.token;
});

test.after(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
});

test('1. Authentication Verification', async () => {
  assert.ok(agentToken, 'Agent token should be present');
  assert.equal(agentUser.email, 'vikram@test.com');
  assert.equal(agentUser.role, 'agent');
  assert.equal(adminUser.role, 'admin');

  // Verify wrong password fails
  const badLogin = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vikram@test.com', password: 'WrongPassword' })
  });
  assert.equal(badLogin.status, 401);
});

test('2. Rule R1: Draft Validation & Rule R6: Role Guards', async () => {
  // Admin cannot create draft (R6)
  const adminDraft = await fetch(`${baseUrl}/registrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ user_type: 'broker', full_name: 'Test Broker' })
  });
  assert.equal(adminDraft.status, 403);

  // Draft missing name AND mobile fails (R1)
  const emptyDraft = await fetch(`${baseUrl}/registrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agentToken}`
    },
    body: JSON.stringify({ user_type: 'broker' })
  });
  assert.equal(emptyDraft.status, 400);
  const emptyData = await emptyDraft.json();
  assert.ok(emptyData.error.fields.full_name);
  assert.ok(emptyData.error.fields.mobile);

  // PAN 4th letter validation check for Broker
  const invalidPanRes = await fetch(`${baseUrl}/registrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agentToken}`
    },
    body: JSON.stringify({
      user_type: 'broker',
      full_name: 'Rajesh Sharma',
      mobile: '9876543210',
      pan_number: 'ABCDE1234F' // 4th char is not P
    })
  });
  assert.equal(invalidPanRes.status, 400);

  // Create valid draft
  const validRes = await fetch(`${baseUrl}/registrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agentToken}`
    },
    body: JSON.stringify({
      user_type: 'broker',
      full_name: 'Rajesh Sharma',
      mobile: '9876543210',
      email: 'rajesh@sharmarealty.in',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      gender: 'Male',
      dob: '1985-06-15',
      office_address: '101 Marine Drive, Nariman Point',
      experience_years: 10,
      languages: ['English', 'Hindi', 'Marathi'],
      areas_of_expertise: ['Luxury Properties'],
      pan_number: 'ABCPS1234F',
      about: 'Experienced luxury property consultant in South Mumbai with over 10 years of trusted industry service.'
    })
  });

  if (validRes.status !== 201) {
    const err = await validRes.json();
    console.error('Validation error on draft creation:', err);
  }
  assert.equal(validRes.status, 201);
  const validData = await validRes.json();
  assert.ok(validData.registration.id);
  assert.equal(validData.registration.status, 'draft');
  assert.ok(validData.registration.completion > 50);
  createdDraftId = validData.registration.id;
});

test('3. Rule R5: Duplicate Protection across active records', async () => {
  // Mobile duplicate check
  const dupMobileRes = await fetch(`${baseUrl}/registrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agentToken}`
    },
    body: JSON.stringify({
      user_type: 'broker',
      full_name: 'Another Broker',
      mobile: '+91 98765 43210' // Normalised duplicate
    })
  });
  assert.equal(dupMobileRes.status, 409);
  const dupMobileData = await dupMobileRes.json();
  assert.equal(dupMobileData.error.code, 'DUPLICATE_MOBILE');
  assert.ok(dupMobileData.error.message.includes('Vikram'));

  // Email duplicate check
  const dupEmailRes = await fetch(`${baseUrl}/registrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agentToken}`
    },
    body: JSON.stringify({
      user_type: 'broker',
      full_name: 'Duplicate Email Person',
      email: 'RAJESH@sharmarealty.in' // Case-insensitive duplicate
    })
  });
  assert.equal(dupEmailRes.status, 409);
  const dupEmailData = await dupEmailRes.json();
  assert.equal(dupEmailData.error.code, 'DUPLICATE_EMAIL');
});

test('4. Rule R6: Ownership Isolation', async () => {
  // Agent 2 cannot view Agent 1's draft
  const getRes = await fetch(`${baseUrl}/registrations/${createdDraftId}`, {
    headers: { Authorization: `Bearer ${agent2Token}` }
  });
  assert.equal(getRes.status, 403);

  // Agent 2 cannot edit Agent 1's draft
  const putRes = await fetch(`${baseUrl}/registrations/${createdDraftId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agent2Token}`
    },
    body: JSON.stringify({ city: 'Pune' })
  });
  assert.equal(putRes.status, 403);

  // Admin CAN view draft
  const adminViewRes = await fetch(`${baseUrl}/registrations/${createdDraftId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(adminViewRes.status, 200);
});

test('5. Rule R3 & R4: Dummy OTP & Revocation on Value Change', async () => {
  // Send OTP
  const sendRes = await fetch(`${baseUrl}/registrations/${createdDraftId}/otp/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agentToken}`
    },
    body: JSON.stringify({ channel: 'email' })
  });
  assert.equal(sendRes.status, 200);
  const sendData = await sendRes.json();
  assert.equal(sendData.success, true);
  assert.ok(sendData.expiresAt);
  assert.ok(sendData.resendAfter);
  assert.equal(sendData.code, undefined); // Code must NOT be returned

  // Cooldown active
  const cooldownRes = await fetch(`${baseUrl}/registrations/${createdDraftId}/otp/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agentToken}`
    },
    body: JSON.stringify({ channel: 'email' })
  });
  assert.equal(cooldownRes.status, 429);

  // Wrong OTP decreases attempts
  const wrongRes = await fetch(`${baseUrl}/registrations/${createdDraftId}/otp/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agentToken}`
    },
    body: JSON.stringify({ channel: 'email', code: '000000' })
  });
  assert.equal(wrongRes.status, 400);
  const wrongData = await wrongRes.json();
  assert.equal(wrongData.attemptsLeft, 2);

  // Valid OTP 123456 verifies email
  const verifyEmailRes = await fetch(`${baseUrl}/registrations/${createdDraftId}/otp/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agentToken}`
    },
    body: JSON.stringify({ channel: 'email', code: '123456' })
  });
  assert.equal(verifyEmailRes.status, 200);
  const verifyEmailData = await verifyEmailRes.json();
  assert.equal(verifyEmailData.registration.email_verified, true);

  // Rule R4: Changing email revokes verification
  const changeEmailRes = await fetch(`${baseUrl}/registrations/${createdDraftId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agentToken}`
    },
    body: JSON.stringify({ email: 'rajesh.updated@sharmarealty.in' })
  });
  assert.equal(changeEmailRes.status, 200);
  const changeEmailData = await changeEmailRes.json();
  assert.equal(changeEmailData.registration.email_verified, false);

  // Now verify both email and mobile so we can test submission
  await fetch(`${baseUrl}/registrations/${createdDraftId}/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({ channel: 'email' })
  });
  await fetch(`${baseUrl}/registrations/${createdDraftId}/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({ channel: 'email', code: '123456' })
  });

  await fetch(`${baseUrl}/registrations/${createdDraftId}/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({ channel: 'mobile' })
  });
  await fetch(`${baseUrl}/registrations/${createdDraftId}/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({ channel: 'mobile', code: '123456' })
  });
});

test('6. Rule R2: Final Submission & Read-Only Lock', async () => {
  // Final submission succeeds when all fields & OTPs are verified
  const submitRes = await fetch(`${baseUrl}/registrations/${createdDraftId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${agentToken}` }
  });
  if (submitRes.status !== 200) {
    const err = await submitRes.json();
    console.error('Submit error details:', JSON.stringify(err, null, 2));
  }
  assert.equal(submitRes.status, 200);
  const submitData = await submitRes.json();
  assert.equal(submitData.registration.status, 'submitted');
  assert.equal(submitData.registration.completion, 100);

  // Submitted record is read-only (R2)
  const putLockedRes = await fetch(`${baseUrl}/registrations/${createdDraftId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agentToken}`
    },
    body: JSON.stringify({ city: 'Navi Mumbai' })
  });
  assert.equal(putLockedRes.status, 400);
  const lockedData = await putLockedRes.json();
  assert.equal(lockedData.error.code, 'RECORD_LOCKED');
});

test('7. Rule R10: Admin Soft Delete with Reason', async () => {
  // Admin delete without reason (< 10 chars) fails
  const badDeleteRes = await fetch(`${baseUrl}/registrations/${createdDraftId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ reason: 'short' })
  });
  assert.equal(badDeleteRes.status, 400);

  // Admin soft delete with 10-200 char reason succeeds
  const goodDeleteRes = await fetch(`${baseUrl}/registrations/${createdDraftId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ reason: 'Client opted out of partnership agreement per audit #402' })
  });
  assert.equal(goodDeleteRes.status, 200);

  // Fetching deleted record returns 404
  const getDeletedRes = await fetch(`${baseUrl}/registrations/${createdDraftId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(getDeletedRes.status, 404);
});

test('8. Reports Summary', async () => {
  // Agent forbidden
  const agentRepRes = await fetch(`${baseUrl}/reports/summary`, {
    headers: { Authorization: `Bearer ${agentToken}` }
  });
  assert.equal(agentRepRes.status, 403);

  // Admin allowed
  const adminRepRes = await fetch(`${baseUrl}/reports/summary`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(adminRepRes.status, 200);
  const data = await adminRepRes.json();
  assert.ok(data.summary);
  assert.ok(Array.isArray(data.agentStats));
});
