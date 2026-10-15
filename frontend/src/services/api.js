const API_BASE = ''; // Uses Vite proxy -> http://localhost:5000

// Helper for Auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('estatedesk_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

// Clean up legacy localStorage keys
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('estatedesk_registrations');
    localStorage.removeItem('estatedesk_otp_state');
  } catch (e) {
    // Ignore storage errors
  }
}

export const api = {
  // Staff Login - authenticates against PostgreSQL database
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

  // Get current staff profile from database
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

  // List registrations from database with filters and pagination
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

  // Read single registration from database
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

  // Create Draft in database (R1, R5, R6)
  async createDraft(formData) {
    const res = await fetch(`${API_BASE}/registrations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data?.error?.message || 'Error creating draft in database');
      error.fields = data?.error?.fields;
      throw error;
    }
    return data.registration || data;
  },

  // Update Draft in database (PUT / PATCH)
  async updateDraft(id, formData, isPatch = false) {
    const res = await fetch(`${API_BASE}/registrations/${id}`, {
      method: isPatch ? 'PATCH' : 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data?.error?.message || 'Error updating draft in database');
      error.fields = data?.error?.fields;
      throw error;
    }
    return data.registration || data;
  },

  // Soft Delete Registration in database (R6, R10)
  async deleteRegistration(id, reason) {
    const res = await fetch(`${API_BASE}/registrations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Error deleting registration from database');
    }
    return data;
  },

  // Dummy OTP Engine: Send OTP (R3)
  async sendOtp(registrationId, channel) {
    const res = await fetch(`${API_BASE}/registrations/${registrationId}/otp/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ channel })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Error generating OTP in database');
    }
    return data;
  },

  // Dummy OTP Engine: Verify OTP (R3)
  async verifyOtp(registrationId, channel, code) {
    const res = await fetch(`${API_BASE}/registrations/${registrationId}/otp/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ channel, code })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Invalid OTP code');
    }
    return data.registration || data;
  },

  // Final Submit to database (R2)
  async submitRegistration(id) {
    const res = await fetch(`${API_BASE}/registrations/${id}/submit`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data?.error?.message || 'Submission failed in database');
      err.fields = data?.error?.fields;
      throw err;
    }
    return data.registration || data;
  },

  // Summary Metrics from database (R7, R8, R9)
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
