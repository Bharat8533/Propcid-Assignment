import { DEMO_STAFF_USERS } from '../constants/indianData';
import { validateDraft, validateSubmit, calculateCompletion, normaliseMobile } from '../utils/validation';

const API_BASE = ''; // Uses Vite proxy -> http://localhost:5000

// Helper for Auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('estatedesk_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

const STORAGE_KEY = 'estatedesk_registrations';
const OTP_STORAGE_KEY = 'estatedesk_otp_state';

// Remove legacy dummy seeded registrations once so user starts with a clean slate
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && (raw.includes('Apex Infrastructure') || raw.includes('Prime Estates') || raw.includes('Sunita Narang'))) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    // Ignore storage errors
  }
}

function getMockRegistrations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveMockRegistrations(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    // Ignore
  }
}

export const api = {
  // Staff Login
  async login(email, password) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok) {
        return data;
      }
      throw new Error(data?.error?.message || 'Invalid email or password');
    } catch (err) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
      // Offline fallback for known demo credentials
      const staff = DEMO_STAFF_USERS.find(
        u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
      );
      if (staff) {
        return {
          token: `offline-token-${staff.id}-${Date.now()}`,
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
  },

  // Read list for report
  async getRegistrations(params = {}) {
    const qs = new URLSearchParams(params).toString();
    try {
      const res = await fetch(`${API_BASE}/registrations?${qs}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        return {
          items: json.data || json.items || [],
          pagination: json.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
        };
      }
    } catch (e) {
      // Offline fallback
    }

    // Mock handler (Empty by default if no user registrations saved)
    const currentUser = JSON.parse(localStorage.getItem('estatedesk_user') || '{}');
    let list = getMockRegistrations().filter(r => !r.deleted_at);

    if (currentUser.role === 'agent') {
      list = list.filter(r => r.agent_id === currentUser.id);
    } else if (params.agentId) {
      list = list.filter(r => r.agent_id === Number(params.agentId));
    }

    if (params.status && params.status !== 'all') list = list.filter(r => r.status === params.status);
    if (params.type && params.type !== 'all') list = list.filter(r => r.user_type === params.type);

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
      if (res.ok) {
        const json = await res.json();
        return json.registration || json;
      }
      if (res.status === 404) throw new Error('Registration not found or deleted');
      if (res.status === 403) throw new Error('Forbidden: Not your registration');
      const errData = await res.json();
      throw new Error(errData?.error?.message || 'Error fetching registration');
    } catch (e) {
      if (e.message.startsWith('Registration') || e.message.startsWith('Forbidden')) throw e;
    }

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
      const data = await res.json();
      if (res.ok) {
        return data.registration || data;
      }
      const error = new Error(data?.error?.message || 'Error creating draft');
      error.fields = data?.error?.fields;
      throw error;
    } catch (e) {
      if (e.fields || (e.message && !e.message.includes('fetch'))) throw e;
    }

    // Mock handler (Only for offline fallback)
    const currentUser = JSON.parse(localStorage.getItem('estatedesk_user') || '{}');
    if (currentUser.role !== 'agent') {
      throw new Error('Only agents can create registrations');
    }

    const list = getMockRegistrations();
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
      const res = await fetch(`${API_BASE}/registrations/${id}`, {
        method: isPatch ? 'PATCH' : 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        return data.registration || data;
      }
      const error = new Error(data?.error?.message || 'Error updating draft');
      error.fields = data?.error?.fields;
      throw error;
    } catch (e) {
      if (e.fields || (e.message && !e.message.includes('fetch'))) throw e;
    }

    const currentUser = JSON.parse(localStorage.getItem('estatedesk_user') || '{}');
    const list = getMockRegistrations();
    const index = list.findIndex(r => r.id === Number(id));

    if (index === -1 || list[index].deleted_at) {
      throw new Error('Registration not found');
    }

    const existing = list[index];
    if (currentUser.role === 'agent' && existing.agent_id !== currentUser.id) {
      throw new Error('Forbidden: You can only edit your own registrations');
    }
    if (existing.status === 'submitted') {
      throw new Error('Record is submitted and locked (read-only)');
    }

    let email_verified = existing.email_verified;
    if (formData.email !== undefined && formData.email !== existing.email) {
      email_verified = false;
    }

    let mobile_verified = existing.mobile_verified;
    if (formData.mobile !== undefined && normaliseMobile(formData.mobile) !== normaliseMobile(existing.mobile)) {
      mobile_verified = false;
    }

    const normMob = normaliseMobile(formData.mobile);
    if (normMob) {
      const dup = list.find(r => r.id !== Number(id) && !r.deleted_at && normaliseMobile(r.mobile) === normMob);
      if (dup) {
        throw new Error(`Mobile number already exists in a ${dup.status} registration held by ${dup.agent_name}`);
      }
    }
    if (formData.email) {
      const dup = list.find(r => r.id !== Number(id) && !r.deleted_at && r.email?.toLowerCase() === formData.email.toLowerCase().trim());
      if (dup) {
        throw new Error(`Email already exists in a ${dup.status} registration held by ${dup.agent_name}`);
      }
    }

    const updatedRecord = {
      ...existing,
      ...formData,
      email_verified,
      mobile_verified,
      completion: calculateCompletion({ ...existing, ...formData, email_verified, mobile_verified }),
      updated_at: new Date().toISOString()
    };

    list[index] = updatedRecord;
    saveMockRegistrations(list);
    return updatedRecord;
  },

  // Soft Delete Registration (R6, R10)
  async deleteRegistration(id, reason) {
    try {
      const res = await fetch(`${API_BASE}/registrations/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (res.ok) return data;
      throw new Error(data?.error?.message || 'Error deleting registration');
    } catch (e) {
      if (e.message && !e.message.includes('fetch')) throw e;
    }

    const currentUser = JSON.parse(localStorage.getItem('estatedesk_user') || '{}');
    const list = getMockRegistrations();
    const index = list.findIndex(r => r.id === Number(id));

    if (index === -1 || list[index].deleted_at) {
      throw new Error('Registration not found');
    }

    const existing = list[index];

    if (currentUser.role === 'agent') {
      if (existing.agent_id !== currentUser.id) {
        throw new Error('Forbidden: You can only delete your own registrations');
      }
      if (existing.status === 'submitted') {
        throw new Error('Forbidden: Agents cannot delete submitted registrations');
      }
    } else if (currentUser.role === 'admin') {
      const r = (reason || '').trim();
      if (r.length < 10 || r.length > 200) {
        throw new Error('Admin deletion requires a reason between 10 and 200 characters');
      }
    }

    list[index].deleted_at = new Date().toISOString();
    list[index].deleted_by = currentUser.id;
    list[index].delete_reason = reason || 'Deleted by user';
    saveMockRegistrations(list);

    return { success: true };
  },

  // Dummy OTP Engine: Send OTP (R3)
  async sendOtp(registrationId, channel) {
    try {
      const res = await fetch(`${API_BASE}/registrations/${registrationId}/otp/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ channel })
      });
      const data = await res.json();
      if (res.ok) return data;
      throw new Error(data?.error?.message || 'Error sending OTP');
    } catch (e) {
      if (e.message && !e.message.includes('fetch')) throw e;
    }

    const reg = await this.getRegistration(registrationId);
    const target = channel === 'email' ? reg.email : reg.mobile;
    if (!target) throw new Error(`Cannot send OTP: ${channel} is empty`);

    const states = JSON.parse(localStorage.getItem(OTP_STORAGE_KEY) || '{}');
    const key = `${registrationId}_${channel}`;
    const now = Date.now();

    if (states[key] && states[key].resendAfter > now) {
      const wait = Math.ceil((states[key].resendAfter - now) / 1000);
      throw new Error(`Cooldown active. Wait ${wait}s before requesting a new OTP.`);
    }

    states[key] = {
      channel,
      target,
      code: '123456',
      attemptsLeft: 3,
      expiresAt: now + 5 * 60 * 1000,
      resendAfter: now + 30 * 1000
    };

    localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(states));
    console.log(`[OTP DUMMY] Generated code for ${channel} (${target}): 123456`);

    return {
      success: true,
      channel,
      expiresAt: new Date(states[key].expiresAt).toISOString(),
      resendAfter: new Date(states[key].resendAfter).toISOString()
    };
  },

  // Dummy OTP Engine: Verify OTP (R3)
  async verifyOtp(registrationId, channel, code) {
    try {
      const res = await fetch(`${API_BASE}/registrations/${registrationId}/otp/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ channel, code })
      });
      const data = await res.json();
      if (res.ok) {
        return data.registration || data;
      }
      throw new Error(data?.error?.message || 'Invalid OTP');
    } catch (e) {
      if (e.message && !e.message.includes('fetch')) throw e;
    }

    const states = JSON.parse(localStorage.getItem(OTP_STORAGE_KEY) || '{}');
    const key = `${registrationId}_${channel}`;
    const otp = states[key];

    if (!otp) throw new Error('No OTP requested. Please click Send OTP first.');
    if (Date.now() > otp.expiresAt) throw new Error('OTP has expired. Please request a new one.');
    if (otp.attemptsLeft <= 0) throw new Error('Maximum 3 attempts reached. Please request a new OTP.');

    if (String(code).trim() !== String(otp.code)) {
      otp.attemptsLeft -= 1;
      localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(states));
      if (otp.attemptsLeft <= 0) {
        throw new Error('Maximum 3 attempts reached. Please request a new OTP.');
      }
      throw new Error(`Incorrect OTP. ${otp.attemptsLeft} attempt(s) remaining.`);
    }

    delete states[key];
    localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(states));

    const patchField = channel === 'email' ? { email_verified: true } : { mobile_verified: true };
    return await this.updateDraft(registrationId, patchField, true);
  },

  // Final Submit (R2)
  async submitRegistration(id) {
    try {
      const res = await fetch(`${API_BASE}/registrations/${id}/submit`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        return data.registration || data;
      }
      const err = new Error(data?.error?.message || 'Submission failed');
      err.fields = data?.error?.fields;
      throw err;
    } catch (e) {
      if (e.fields || (e.message && !e.message.includes('fetch'))) throw e;
    }

    const reg = await this.getRegistration(id);
    const subVal = validateSubmit(reg);
    if (!subVal.isValid) {
      const err = new Error('All mandatory fields must be valid and verified by OTP to submit');
      err.fields = subVal.errors;
      throw err;
    }

    const updated = await this.updateDraft(id, {
      status: 'submitted',
      completion: 100
    }, true);

    return updated;
  },

  // Summary Metrics (R7, R8, R9)
  async getSummary(params = {}) {
    const qs = new URLSearchParams(params).toString();
    try {
      const res = await fetch(`${API_BASE}/reports/summary?${qs}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // Offline fallback
    }

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
          id: agent.id,
          name: agent.name,
          email: agent.email,
          total: agentRecords.length,
          drafts: aDrafts.length,
          submitted: aSubmitted.length,
          stale: aDrafts.filter(r => (Date.now() - new Date(r.updated_at)) / (1000 * 3600 * 24) > 7).length,
          avgCompletion: avgComp
        };
      });
    }

    return { summary, agentStats };
  }
};
