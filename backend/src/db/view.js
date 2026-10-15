import { initDb, isDbConnected, pool, memoryDb } from './index.js';

async function viewDatabase() {
  await initDb();
  const isPg = isDbConnected();

  console.log('\n======================================================');
  console.log(`  ESTATEDESK DATABASE VIEWER (${isPg ? 'PostgreSQL Active' : 'Fallback Adapter Active'})`);
  console.log('======================================================\n');

  // 1. Staff
  console.log('--- [1. STAFF ACCOUNTS] ---');
  let staffRows = [];
  if (isPg) {
    const res = await pool.query('SELECT id, name, email, role FROM staff ORDER BY id ASC');
    staffRows = res.rows;
  } else {
    staffRows = memoryDb.staff.map(({ id, name, email, role }) => ({ id, name, email, role }));
  }
  console.table(staffRows);

  // 2. Registrations
  console.log('\n--- [2. REGISTRATIONS TABLE] ---');
  let regRows = [];
  if (isPg) {
    const res = await pool.query(`
      SELECT r.id, s.name as agent, r.user_type as type, r.full_name as applicant, 
             r.mobile, r.status, r.completion || '%' as completion, 
             to_char(r.updated_at, 'YYYY-MM-DD HH24:MI') as last_updated,
             CASE WHEN r.deleted_at IS NOT NULL THEN 'YES' ELSE 'NO' END as deleted
      FROM registrations r
      JOIN staff s ON r.agent_id = s.id
      ORDER BY r.id DESC
    `);
    regRows = res.rows;
  } else {
    regRows = memoryDb.registrations.map(r => {
      const agent = memoryDb.staff.find(s => s.id === r.agent_id);
      return {
        id: r.id,
        agent: agent?.name || 'Agent',
        type: r.user_type,
        applicant: r.full_name || '—',
        mobile: r.mobile || '—',
        status: r.status,
        completion: `${r.completion || 0}%`,
        last_updated: r.updated_at?.slice(0, 16) || '—',
        deleted: r.deleted_at ? 'YES' : 'NO'
      };
    });
  }

  if (regRows.length === 0) {
    console.log('(No registrations currently in database)');
  } else {
    console.table(regRows);
  }

  // 3. OTPs
  console.log('\n--- [3. ACTIVE OTPS] ---');
  let otpRows = [];
  if (isPg) {
    const res = await pool.query(`
      SELECT id, registration_id as reg_id, channel, target_value as target, 
             attempts_left, to_char(expires_at, 'YYYY-MM-DD HH24:MI:SS') as expires_at
      FROM otps
      ORDER BY id DESC
    `);
    otpRows = res.rows;
  } else {
    otpRows = memoryDb.otps.map(o => ({
      id: o.id,
      reg_id: o.registration_id,
      channel: o.channel,
      target: o.target_value,
      attempts_left: o.attempts_left,
      expires_at: o.expires_at?.slice(0, 19)
    }));
  }

  if (otpRows.length === 0) {
    console.log('(No active OTPs)');
  } else {
    console.table(otpRows);
  }

  console.log('\n======================================================\n');
  process.exit(0);
}

viewDatabase().catch(err => {
  console.error('Error viewing database:', err);
  process.exit(1);
});
