const API_BASE = '';

function getAuthHeaders() {
  const token = localStorage.getItem('estatedesk_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('estatedesk_registrations');
    localStorage.removeItem('estatedesk_otp_state');
  } catch (e) {
  }
}

export const api = {
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Invalid email or password');
    }
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to authenticate user');
    }
    return data.user;
  },

  async getRegistrations(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/registrations?${qs}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error?.message || 'Failed to fetch registrations from database');
    }
    return {
      items: json.data || json.items || [],
      pagination: json.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
    };
  },

  async getRegistration(id) {
    const res = await fetch(`${API_BASE}/registrations/${id}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error?.message || 'Registration not found in database');
    }
    return json.registration || json;
  },

  async createDraft(formData) {
    const res = await fetch(`${API_BASE}/registrations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data?.error?.message || 'Error creating draft in database');
      error.code = data?.error?.code;
      error.fields = data?.error?.fields;
      throw error;
    }
    return data.registration || data;
  },

  async updateDraft(id, formData, isPatch = false) {
    const res = await fetch(`${API_BASE}/registrations/${id}`, {
      method: isPatch ? 'PATCH' : 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data?.error?.message || 'Error updating draft in database');
      error.code = data?.error?.code;
      error.fields = data?.error?.fields;
      throw error;
    }
    return data.registration || data;
  },

  async deleteRegistration(id, reason) {
    const res = await fetch(`${API_BASE}/registrations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data?.error?.message || 'Error deleting registration from database');
      error.code = data?.error?.code;
      throw error;
    }
    return data;
  },

  async sendOtp(registrationId, channel) {
    const res = await fetch(`${API_BASE}/registrations/${registrationId}/otp/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ channel })
    });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data?.error?.message || 'Error generating OTP in database');
      error.code = data?.error?.code;
      throw error;
    }
    return data;
  },

  async verifyOtp(registrationId, channel, code) {
    const res = await fetch(`${API_BASE}/registrations/${registrationId}/otp/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ channel, code })
    });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data?.error?.message || 'Invalid OTP code');
      error.code = data?.error?.code;
      throw error;
    }
    return data.registration || data;
  },

  async submitRegistration(id, formData = null) {
    const res = await fetch(`${API_BASE}/registrations/${id}/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData ? JSON.stringify(formData) : undefined
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data?.error?.message || 'Submission failed in database');
      err.code = data?.error?.code;
      err.fields = data?.error?.fields;
      throw err;
    }
    return data.registration || data;
  },

  async getSummary(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/reports/summary?${qs}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to fetch summary from database');
    }
    return data;
  }
};
