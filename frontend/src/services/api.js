import { DEMO_STAFF_USERS } from '../constants/indianData';
import { validateDraft, validateSubmit, calculateCompletion, normaliseMobile } from '../utils/validation';

const API_BASE = ''; // Uses Vite proxy (configured in vite.config.js to localhost:5000)

// Helper for Auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('estatedesk_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

// -------------------------------------------------------------
// LOCAL STORAGE MOCK DATABASE (Fallback if backend is offline)
// -------------------------------------------------------------
const STORAGE_KEY = 'estatedesk_registrations';
const OTP_STORAGE_KEY = 'estatedesk_otp_state';

function getMockRegistrations() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
  }

  // Pre-seed with realistic sample data
  const seeds = [
    {
      id: 1,
      agent_id: 2,
      agent_name: 'Vikram Agent',
      user_type: 'builder',
      full_name: 'Rajesh Sharma',
      email: 'rajesh.sharma@apexbuild.com',
      email_verified: true,
      mobile: '9820112233',
      mobile_verified: true,
      gender: 'Male',
      dob: '1984-06-15',
      office_address: 'Level 4, Skyline Cyberpark, Sector 62',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201309',
      experience_years: 18,
      languages: ['English', 'Hindi'],
      areas_of_expertise: ['High-Rise Apartments', 'Commercial Leasing'],
      company_name: 'Apex Infrastructure Private Limited',
      company_type: 'Private Limited',
      gst_number: '09AAACA1234C1Z5',
      pan_number: 'AAACA1234C',
      about_company: 'Apex Infrastructure has delivered over 2 million square feet of premium commercial and residential towers across NCR.',
      status: 'submitted',
      completion: 100,
      created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      deleted_at: null,
      deleted_by: null,
      delete_reason: null
    },
    {
      id: 2,
      agent_id: 2,
      agent_name: 'Vikram Agent',
      user_type: 'broker',
      full_name: 'Amitabh Sen',
      email: 'amitabh.sen@primeestates.in',
      email_verified: true,
      mobile: '9810445566',
      mobile_verified: false,
      gender: 'Male',
      dob: '1990-11-20',
      office_address: 'Suite 201, Regus Business Centre, MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      experience_years: 10,
      languages: ['English', 'Hindi', 'Bengali'],
      areas_of_expertise: ['Luxury Properties'],
      pan_number: 'ABCPS5432P',
      about: 'Specialised luxury property consultant catering to NRI investments and boutique high-value residences in Central Bangalore.',
      status: 'draft',
      completion: 87,
      created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      deleted_at: null,
      deleted_by: null,
      delete_reason: null
    },
    {
      id: 3,
      agent_id: 3,
      agent_name: 'Meera Agent',
      user_type: 'broker',
      full_name: 'Sunita Narang',
      email: 'sunita.broker@gmail.com',
      email_verified: false,
      mobile: '9711889900',
      mobile_verified: false,
      gender: 'Female',
      dob: '1995-03-12',
      office_address: '14/B Heritage Chambers, Linking Road, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      experience_years: 6,
      languages: ['English', 'Hindi', 'Marathi'],
      areas_of_expertise: ['High-Rise Apartments', 'Affordable Housing'],
      pan_number: 'BFEPN9988P',
      about: 'Assisting young professionals and families to find quality apartments across Bandra, Khar, and Santacruz suburban clusters.',
      status: 'draft',
      completion: 68,
      created_at: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(), // Stale draft (>7 days)
      updated_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
      deleted_at: null,
      deleted_by: null,
      delete_reason: null
    }
  ];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds));
  return seeds;
}

function saveMockRegistrations(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// -------------------------------------------------------------
// API CLIENT
// -------------------------------------------------------------
export const api = {
  // Staff Login
  async login(email, password) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 401) {
        const data = await res.json();
        throw new Error(data?.error?.message || 'Invalid email or password');
      }
    } catch (err) {
      // If server unreachable or error, run mock auth
      if (err.message !== 'Invalid email or password') {
        const staff = DEMO_STAFF_USERS.find(
          u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
        );
        if (staff) {
          const fakeToken = `mock-token-${staff.id}-${Date.now()}`;
          return {
            token: fakeToken,
            user: {
              id: staff.id,
              name: staff.name,
              email: staff.email,
              role: staff.role
            }
          };
        }
        throw new Error('Invalid email or password');
      }
      throw err;
    }
  },

  // Read list for report
  async getRegistrations(params = {}) {
    const qs = new URLSearchParams(params).toString();
    try {
      const res = await fetch(`${API_BASE}/registrations?${qs}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // Offline mock fallback
    }

    // Mock handler
    const currentUser = JSON.parse(localStorage.getItem('estatedesk_user') || '{}');
    let list = getMockRegistrations().filter(r => !r.deleted_at);

    // Rule R6: Agents only see their own
    if (currentUser.role === 'agent') {
      list = list.filter(r => r.agent_id === currentUser.id);
    } else if (params.agentId) {
      list = list.filter(r => r.agent_id === Number(params.agentId));
    }

    if (params.status) list = list.filter(r => r.status === params.status);
    if (params.type) list = list.filter(r => r.user_type === params.type);

    if (params.from) {
      const fromDate = new Date(params.from);
      list = list.filter(r => new Date(r.created_at) >= fromDate);
    }
    if (params.to) {
      const toDate = new Date(params.to);
      toDate.setHours(23, 59, 59, 999);
      list = list.filter(r => new Date(r.created_at) <= toDate);
    }

    if (params.q) {
      const q = params.q.toLowerCase().trim();
      list = list.filter(r =>
        (r.full_name && r.full_name.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.mobile && r.mobile.includes(q))
      );
    }

    list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    const page = Number(params.page) || 1;
    const limit = Math.min(50, Number(params.limit) || 10);
    const total = list.length;
    const items = list.slice((page - 1) * limit, page * limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  // Read single registration
  async getRegistration(id) {
    try {
      const res = await fetch(`${API_BASE}/registrations/${id}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) return await res.json();
      if (res.status === 404) throw new Error('Registration not found or deleted');
      if (res.status === 403) throw new Error('Forbidden: Not your registration');
    } catch (e) {
      if (e.message.startsWith('Registration') || e.message.startsWith('Forbidden')) throw e;
    }

    // Mock handler
    const currentUser = JSON.parse(localStorage.getItem('estatedesk_user') || '{}');
    const record = getMockRegistrations().find(r => r.id === Number(id));

    if (!record || record.deleted_at) {
      throw new Error('Registration not found');
    }
    if (currentUser.role === 'agent' && record.agent_id !== currentUser.id) {
      throw new Error('Forbidden: Access denied');
    }
    return record;
  },

  // Create Draft (R1)
  async createDraft(formData) {
    const val = validateDraft(formData);
    if (!val.isValid) {
      const err = new Error('Some fields are invalid');
      err.fields = val.errors;
      throw err;
    }

    try {
      const res = await fetch(`${API_BASE}/registrations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      if (res.ok) return await res.json();
      const data = await res.json();
      const error = new Error(data?.error?.message || 'Error creating draft');
      error.fields = data?.error?.fields;
      throw error;
    } catch (e) {
      if (e.fields || (e.message && !e.message.includes('fetch'))) throw e;
    }

    // Mock handler
    const currentUser = JSON.parse(localStorage.getItem('estatedesk_user') || '{}');
    if (currentUser.role !== 'agent') {
      throw new Error('Only agents can create registrations');
    }

    const list = getMockRegistrations();
    // Rule R5: Duplicate check across non-deleted
    const normMob = normaliseMobile(formData.mobile);
    if (normMob) {
      const dup = list.find(r => !r.deleted_at && normaliseMobile(r.mobile) === normMob);
      if (dup) {
        throw new Error(`Mobile number already exists in a ${dup.status} registration held by ${dup.agent_name}`);
      }
    }
    if (formData.email) {
      const dup = list.find(r => !r.deleted_at && r.email?.toLowerCase() === formData.email.toLowerCase().trim());
      if (dup) {
        throw new Error(`Email already exists in a ${dup.status} registration held by ${dup.agent_name}`);
      }
    }

    const newId = list.length > 0 ? Math.max(...list.map(r => r.id)) + 1 : 1;
    const now = new Date().toISOString();
    const newRecord = {
      ...formData,
      id: newId,
      agent_id: currentUser.id,
      agent_name: currentUser.name,
      status: 'draft',
      completion: calculateCompletion(formData),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      deleted_by: null,
      delete_reason: null
    };

    list.unshift(newRecord);
    saveMockRegistrations(list);
    return newRecord;
  },

  // Update Draft (PUT / PATCH)
  async updateDraft(id, formData, isPatch = false) {
    const val = validateDraft(formData);
    if (!val.isValid) {
      const err = new Error('Some fields are invalid');
      err.fields = val.errors;
      throw err;
    }

    try {
      const method = isPatch ? 'PATCH' : 'PUT';
      const res = await fetch(`${API_BASE}/registrations/${id}`, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      if (res.ok) return await res.json();
      const data = await res.json();
      const error = new Error(data?.error?.message || 'Error updating draft');
      error.fields = data?.error?.fields;
      throw error;
    } catch (e) {
      if (e.fields || (e.message && !e.message.includes('fetch'))) throw e;
    }

    // Mock handler
    const currentUser = JSON.parse(localStorage.getItem('estatedesk_user') || '{}');
    const list = getMockRegistrations();
    const idx = list.findIndex(r => r.id === Number(id));
    if (idx === -1 || list[idx].deleted_at) throw new Error('Registration not found');

    const existing = list[idx];
    if (existing.status === 'submitted') throw new Error('Cannot edit a submitted registration');
    if (currentUser.role === 'agent' && existing.agent_id !== currentUser.id) {
      throw new Error('Forbidden: You can only edit your own drafts');
    }

    // Duplicate check
    const normMob = normaliseMobile(formData.mobile);
    if (normMob) {
      const dup = list.find(r => r.id !== Number(id) && !r.deleted_at && normaliseMobile(r.mobile) === normMob);
      if (dup) {
        throw new Error(`Mobile already registered in a ${dup.status} registration held by ${dup.agent_name}`);
      }
    }

    // Rule R4: Verification follows the value
    let emailVerified = existing.email_verified;
    if (formData.email !== undefined && formData.email?.toLowerCase().trim() !== existing.email?.toLowerCase().trim()) {
      emailVerified = false;
    }

    let mobileVerified = existing.mobile_verified;
    if (formData.mobile !== undefined && normaliseMobile(formData.mobile) !== normaliseMobile(existing.mobile)) {
      mobileVerified = false;
    }

    const updated = {
      ...existing,
      ...formData,
      email_verified: emailVerified,
      mobile_verified: mobileVerified,
      completion: calculateCompletion({ ...existing, ...formData, email_verified: emailVerified, mobile_verified: mobileVerified }),
      updated_at: new Date().toISOString()
    };

    list[idx] = updated;
    saveMockRegistrations(list);
    return updated;
  },

  // Submit Draft (R2)
  async submitRegistration(id) {
    try {
      const res = await fetch(`${API_BASE}/registrations/${id}/submit`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) return await res.json();
      const data = await res.json();
      const error = new Error(data?.error?.message || 'Cannot submit registration');
      error.fields = data?.error?.fields;
      throw error;
    } catch (e) {
      if (e.fields || (e.message && !e.message.includes('fetch'))) throw e;
    }

    // Mock handler
    const list = getMockRegistrations();
    const idx = list.findIndex(r => r.id === Number(id));
    if (idx === -1 || list[idx].deleted_at) throw new Error('Registration not found');

    const record = list[idx];
    if (record.status === 'submitted') throw new Error('Registration is already submitted');

    const val = validateSubmit(record);
    if (!val.isValid) {
      const err = new Error('Incomplete registration. Fill all mandatory fields and verify email and mobile.');
      err.fields = val.errors;
      throw err;
    }

    record.status = 'submitted';
    record.completion = 100;
    record.updated_at = new Date().toISOString();
    list[idx] = record;
    saveMockRegistrations(list);
    return record;
  },

  // Soft Delete (R10)
  async deleteRegistration(id, reason = '') {
    try {
      const res = await fetch(`${API_BASE}/registrations/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: reason ? JSON.stringify({ reason }) : undefined
      });
      if (res.status === 204 || res.ok) return true;
      const data = await res.json();
      throw new Error(data?.error?.message || 'Error deleting registration');
    } catch (e) {
      if (e.message && !e.message.includes('fetch')) throw e;
    }

    // Mock handler
    const currentUser = JSON.parse(localStorage.getItem('estatedesk_user') || '{}');
    const list = getMockRegistrations();
    const idx = list.findIndex(r => r.id === Number(id));
    if (idx === -1 || list[idx].deleted_at) throw new Error('Registration not found');

    const record = list[idx];

    if (currentUser.role === 'agent') {
      if (record.status === 'submitted') {
        throw new Error('Agents cannot delete submitted registrations');
      }
      if (record.agent_id !== currentUser.id) {
        throw new Error('Forbidden: You can only delete your own drafts');
      }
    } else if (currentUser.role === 'admin') {
      if (!reason || reason.trim().length < 10 || reason.trim().length > 200) {
        throw new Error('Admin must provide a deletion reason between 10 and 200 characters');
      }
    }

    record.deleted_at = new Date().toISOString();
    record.deleted_by = currentUser.id;
    record.delete_reason = reason.trim() || null;
    list[idx] = record;
    saveMockRegistrations(list);
    return true;
  },

  // OTP Send (R3)
  async sendOtp(id, channel) {
    try {
      const res = await fetch(`${API_BASE}/registrations/${id}/otp/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ channel })
      });
      if (res.ok) return await res.json();
      const data = await res.json();
      throw new Error(data?.error?.message || 'Failed to send OTP');
    } catch (e) {
      if (e.message && !e.message.includes('fetch')) throw e;
    }

    // Mock handler
    const rawOtp = localStorage.getItem(OTP_STORAGE_KEY) || '{}';
    const otpMap = JSON.parse(rawOtp);
    const key = `${id}_${channel}`;
    const now = Date.now();

    const existing = otpMap[key];
    if (existing && now < existing.resendAfter) {
      const waitSec = Math.ceil((existing.resendAfter - now) / 1000);
      throw new Error(`Please wait ${waitSec} seconds before resending OTP`);
    }

    // Generate dummy OTP state
    otpMap[key] = {
      code: '123456', // Specified in requirement: always 123456
      attemptsLeft: 3,
      expiresAt: now + 5 * 60 * 1000, // 5 mins
      resendAfter: now + 30 * 1000 // 30 sec cooldown
    };
    localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otpMap));

    console.log(`[DUMMY OTP] Sent to ${channel.toUpperCase()} for registration #${id}: 123456 (Expires in 5 min)`);

    return {
      expiresAt: new Date(otpMap[key].expiresAt).toISOString(),
      resendAfter: new Date(otpMap[key].resendAfter).toISOString(),
      message: `OTP sent to ${channel}. (Demo code: 123456)`
    };
  },

  // OTP Verify (R3)
  async verifyOtp(id, channel, code) {
    try {
      const res = await fetch(`${API_BASE}/registrations/${id}/otp/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ channel, code })
      });
      if (res.ok) return await res.json();
      const data = await res.json();
      throw new Error(data?.error?.message || 'Invalid OTP');
    } catch (e) {
      if (e.message && !e.message.includes('fetch')) throw e;
    }

    // Mock handler
    const rawOtp = localStorage.getItem(OTP_STORAGE_KEY) || '{}';
    const otpMap = JSON.parse(rawOtp);
    const key = `${id}_${channel}`;
    const otpInfo = otpMap[key];

    if (!otpInfo) throw new Error('No OTP sent. Please request a new code.');
    if (Date.now() > otpInfo.expiresAt) throw new Error('OTP has expired. Please request a new code.');
    if (otpInfo.attemptsLeft <= 0) throw new Error('Too many failed attempts. Please request a new code.');

    if (code.trim() !== otpInfo.code) {
      otpInfo.attemptsLeft -= 1;
      localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otpMap));
      if (otpInfo.attemptsLeft <= 0) {
        throw new Error('Too many failed attempts. This OTP has been invalidated.');
      }
      throw new Error(`Incorrect OTP code. ${otpInfo.attemptsLeft} attempt(s) remaining.`);
    }

    // Success! Update registration
    delete otpMap[key];
    localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otpMap));

    const list = getMockRegistrations();
    const idx = list.findIndex(r => r.id === Number(id));
    if (idx !== -1) {
      if (channel === 'email') list[idx].email_verified = true;
      if (channel === 'mobile') list[idx].mobile_verified = true;
      list[idx].completion = calculateCompletion(list[idx]);
      saveMockRegistrations(list);
    }

    return { success: true, message: `${channel.toUpperCase()} verified successfully!` };
  },

  // Reports Summary
  async getSummary(params = {}) {
    const qs = new URLSearchParams(params).toString();
    try {
      const res = await fetch(`${API_BASE}/reports/summary?${qs}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // Offline mock fallback
    }

    // Mock handler
    const currentUser = JSON.parse(localStorage.getItem('estatedesk_user') || '{}');
    let list = getMockRegistrations().filter(r => !r.deleted_at);

    if (currentUser.role === 'agent') {
      list = list.filter(r => r.agent_id === currentUser.id);
    }

    if (params.from) {
      const fromDate = new Date(params.from);
      list = list.filter(r => new Date(r.created_at) >= fromDate);
    }
    if (params.to) {
      const toDate = new Date(params.to);
      toDate.setHours(23, 59, 59, 999);
      list = list.filter(r => new Date(r.created_at) <= toDate);
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    const calcGroup = (items) => ({
      total: items.length,
      builder: items.filter(i => i.user_type === 'builder').length,
      broker: items.filter(i => i.user_type === 'broker').length
    });

    const submitted = list.filter(r => r.status === 'submitted');
    const drafts = list.filter(r => r.status === 'draft');
    const staleDrafts = drafts.filter(r => {
      const diff = (Date.now() - new Date(r.updated_at)) / (1000 * 3600 * 24);
      return diff > 7;
    });
    const todayList = list.filter(r => r.created_at.slice(0, 10) === todayStr);

    const summary = {
      total: calcGroup(list),
      submitted: calcGroup(submitted),
      drafts: calcGroup(drafts),
      staleDrafts: calcGroup(staleDrafts),
      createdToday: calcGroup(todayList)
    };

    // Per agent stats (admins only)
    let agentStats = [];
    if (currentUser.role === 'admin') {
      const agents = DEMO_STAFF_USERS.filter(u => u.role === 'agent');
      agentStats = agents.map(agent => {
        const agentRecords = list.filter(r => r.agent_id === agent.id);
        const aDrafts = agentRecords.filter(r => r.status === 'draft');
        const aSubmitted = agentRecords.filter(r => r.status === 'submitted');
        const aSubmittedToday = aSubmitted.filter(r => r.updated_at?.slice(0, 10) === todayStr);

        const avgComp = aDrafts.length > 0
          ? Math.round(aDrafts.reduce((acc, c) => acc + (c.completion || 0), 0) / aDrafts.length)
          : 0;

        return {
          agentId: agent.id,
          agentName: agent.name,
          draftsCount: aDrafts.length,
          submittedCount: aSubmitted.length,
          submittedTodayCount: aSubmittedToday.length,
          avgDraftCompletion: avgComp
        };
      });
    }

    return { summary, agentStats };
  }
};
