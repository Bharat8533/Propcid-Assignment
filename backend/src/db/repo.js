import { pool, isDbConnected, memoryDb } from './index.js';
import { isDraftStale, normaliseMobile } from '../utils/validation.js';

let memRegIdCounter = 100;
let memOtpIdCounter = 100;

export const repo = {
  // Staff methods
  async findStaffByEmail(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (isDbConnected()) {
      const res = await pool.query('SELECT * FROM staff WHERE lower(email) = lower($1)', [cleanEmail]);
      return res.rows[0] || null;
    }
    return memoryDb.staff.find(s => s.email.toLowerCase() === cleanEmail) || null;
  },

  async findStaffById(id) {
    const numId = Number(id);
    if (isDbConnected()) {
      const res = await pool.query('SELECT id, name, email, role FROM staff WHERE id = $1', [numId]);
      return res.rows[0] || null;
    }
    const staff = memoryDb.staff.find(s => s.id === numId);
    if (!staff) return null;
    const { password_hash, ...safe } = staff;
    return safe;
  },

  async getAllStaff() {
    if (isDbConnected()) {
      const res = await pool.query('SELECT id, name, email, role FROM staff ORDER BY id ASC');
      return res.rows;
    }
    return memoryDb.staff.map(({ password_hash, ...safe }) => safe);
  },

  // Registration methods
  async findActiveByMobile(mobile, excludeId = null) {
    const cleanMobile = normaliseMobile(mobile);
    if (!cleanMobile) return null;

    if (isDbConnected()) {
      let q = `
        SELECT r.*, s.name as agent_name 
        FROM registrations r
        JOIN staff s ON r.agent_id = s.id
        WHERE r.deleted_at IS NULL AND r.mobile = $1
      `;
      const params = [cleanMobile];
      if (excludeId) {
        q += ' AND r.id != $2';
        params.push(Number(excludeId));
      }
      const res = await pool.query(q, params);
      return res.rows[0] || null;
    }

    const found = memoryDb.registrations.find(r => {
      if (r.deleted_at !== null) return false;
      if (excludeId && r.id === Number(excludeId)) return false;
      return normaliseMobile(r.mobile) === cleanMobile;
    });
    if (!found) return null;
    const staff = memoryDb.staff.find(s => s.id === found.agent_id);
    return { ...found, agent_name: staff?.name || 'Staff' };
  },

  async findActiveByEmail(email, excludeId = null) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) return null;

    if (isDbConnected()) {
      let q = `
        SELECT r.*, s.name as agent_name 
        FROM registrations r
        JOIN staff s ON r.agent_id = s.id
        WHERE r.deleted_at IS NULL AND lower(r.email) = $1
      `;
      const params = [cleanEmail];
      if (excludeId) {
        q += ' AND r.id != $2';
        params.push(Number(excludeId));
      }
      const res = await pool.query(q, params);
      return res.rows[0] || null;
    }

    const found = memoryDb.registrations.find(r => {
      if (r.deleted_at !== null) return false;
      if (excludeId && r.id === Number(excludeId)) return false;
      return String(r.email || '').trim().toLowerCase() === cleanEmail;
    });
    if (!found) return null;
    const staff = memoryDb.staff.find(s => s.id === found.agent_id);
    return { ...found, agent_name: staff?.name || 'Staff' };
  },

  async findRegistrationById(id) {
    const numId = Number(id);
    if (isDbConnected()) {
      const q = `
        SELECT r.*, s.name as agent_name, s.email as agent_email
        FROM registrations r
        JOIN staff s ON r.agent_id = s.id
        WHERE r.id = $1 AND r.deleted_at IS NULL
      `;
      const res = await pool.query(q, [numId]);
      return res.rows[0] || null;
    }
    const reg = memoryDb.registrations.find(r => r.id === numId && r.deleted_at === null);
    if (!reg) return null;
    const agent = memoryDb.staff.find(s => s.id === reg.agent_id);
    return {
      ...reg,
      agent_name: agent?.name || 'Unknown Agent',
      agent_email: agent?.email || ''
    };
  },

  async createRegistration(data) {
    const now = new Date().toISOString();
    if (isDbConnected()) {
      const q = `
        INSERT INTO registrations (
          agent_id, user_type, status, completion,
          full_name, email, email_verified, mobile, mobile_verified,
          gender, dob, office_address, city, state, pincode,
          experience_years, languages, areas_of_expertise,
          pan_number, about, company_name, company_type, gst_number, about_company,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15,
          $16, $17, $18,
          $19, $20, $21, $22, $23, $24,
          $25, $26
        ) RETURNING *
      `;
      const params = [
        data.agent_id,
        data.user_type,
        data.status || 'draft',
        data.completion || 0,
        data.full_name || null,
        data.email || null,
        Boolean(data.email_verified),
        data.mobile || null,
        Boolean(data.mobile_verified),
        data.gender || null,
        data.dob || null,
        data.office_address || null,
        data.city || null,
        data.state || null,
        data.pincode || null,
        data.experience_years !== undefined && data.experience_years !== null ? Number(data.experience_years) : null,
        data.languages || [],
        data.areas_of_expertise || [],
        data.pan_number ? String(data.pan_number).toUpperCase() : null,
        data.about || null,
        data.company_name || null,
        data.company_type || null,
        data.gst_number ? String(data.gst_number).toUpperCase() : null,
        data.about_company || null,
        now,
        now
      ];
      const res = await pool.query(q, params);
      return res.rows[0];
    }

    const newRecord = {
      id: ++memRegIdCounter,
      agent_id: data.agent_id,
      user_type: data.user_type,
      status: data.status || 'draft',
      completion: data.completion || 0,
      full_name: data.full_name || null,
      email: data.email || null,
      email_verified: Boolean(data.email_verified),
      mobile: data.mobile || null,
      mobile_verified: Boolean(data.mobile_verified),
      gender: data.gender || null,
      dob: data.dob || null,
      office_address: data.office_address || null,
      city: data.city || null,
      state: data.state || null,
      pincode: data.pincode || null,
      experience_years: data.experience_years !== undefined && data.experience_years !== null ? Number(data.experience_years) : null,
      languages: Array.isArray(data.languages) ? data.languages : [],
      areas_of_expertise: Array.isArray(data.areas_of_expertise) ? data.areas_of_expertise : [],
      pan_number: data.pan_number ? String(data.pan_number).toUpperCase() : null,
      about: data.about || null,
      company_name: data.company_name || null,
      company_type: data.company_type || null,
      gst_number: data.gst_number ? String(data.gst_number).toUpperCase() : null,
      about_company: data.about_company || null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      deleted_by: null,
      delete_reason: null
    };

    memoryDb.registrations.push(newRecord);
    return newRecord;
  },

  async updateRegistration(id, data) {
    const numId = Number(id);
    const now = new Date().toISOString();

    if (isDbConnected()) {
      const q = `
        UPDATE registrations SET
          user_type = COALESCE($1, user_type),
          status = COALESCE($2, status),
          completion = COALESCE($3, completion),
          full_name = $4,
          email = $5,
          email_verified = $6,
          mobile = $7,
          mobile_verified = $8,
          gender = $9,
          dob = $10,
          office_address = $11,
          city = $12,
          state = $13,
          pincode = $14,
          experience_years = $15,
          languages = $16,
          areas_of_expertise = $17,
          pan_number = $18,
          about = $19,
          company_name = $20,
          company_type = $21,
          gst_number = $22,
          about_company = $23,
          updated_at = $24
        WHERE id = $25 AND deleted_at IS NULL
        RETURNING *
      `;
      const params = [
        data.user_type,
        data.status,
        data.completion,
        data.full_name,
        data.email,
        Boolean(data.email_verified),
        data.mobile,
        Boolean(data.mobile_verified),
        data.gender,
        data.dob,
        data.office_address,
        data.city,
        data.state,
        data.pincode,
        data.experience_years !== undefined && data.experience_years !== null ? Number(data.experience_years) : null,
        data.languages || [],
        data.areas_of_expertise || [],
        data.pan_number ? String(data.pan_number).toUpperCase() : null,
        data.about,
        data.company_name,
        data.company_type,
        data.gst_number ? String(data.gst_number).toUpperCase() : null,
        data.about_company,
        now,
        numId
      ];
      const res = await pool.query(q, params);
      return res.rows[0] || null;
    }

    const idx = memoryDb.registrations.findIndex(r => r.id === numId && r.deleted_at === null);
    if (idx === -1) return null;

    const current = memoryDb.registrations[idx];
    const updated = {
      ...current,
      ...data,
      pan_number: data.pan_number !== undefined ? (data.pan_number ? String(data.pan_number).toUpperCase() : null) : current.pan_number,
      gst_number: data.gst_number !== undefined ? (data.gst_number ? String(data.gst_number).toUpperCase() : null) : current.gst_number,
      updated_at: now
    };
    memoryDb.registrations[idx] = updated;
    return updated;
  },

  async softDeleteRegistration(id, deletedBy, reason) {
    const numId = Number(id);
    const now = new Date().toISOString();

    if (isDbConnected()) {
      const q = `
        UPDATE registrations 
        SET deleted_at = $1, deleted_by = $2, delete_reason = $3
        WHERE id = $4 AND deleted_at IS NULL
        RETURNING id
      `;
      const res = await pool.query(q, [now, deletedBy, reason || null, numId]);
      return res.rowCount > 0;
    }

    const record = memoryDb.registrations.find(r => r.id === numId && r.deleted_at === null);
    if (!record) return false;
    record.deleted_at = now;
    record.deleted_by = deletedBy;
    record.delete_reason = reason || null;
    return true;
  },

  async listRegistrations({ q, status, type, agentId, from, to, page = 1, limit = 10 }) {
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));
    const offset = (pageNum - 1) * pageSize;

    if (isDbConnected()) {
      const conditions = ['r.deleted_at IS NULL'];
      const params = [];
      let pIdx = 1;

      if (status && status !== 'all') {
        conditions.push(`r.status = $${pIdx++}`);
        params.push(status);
      }
      if (type && type !== 'all') {
        conditions.push(`r.user_type = $${pIdx++}`);
        params.push(type);
      }
      if (agentId) {
        conditions.push(`r.agent_id = $${pIdx++}`);
        params.push(Number(agentId));
      }
      if (from) {
        conditions.push(`r.created_at >= $${pIdx++}`);
        params.push(new Date(from).toISOString());
      }
      if (to) {
        conditions.push(`r.created_at <= $${pIdx++}`);
        params.push(new Date(to).toISOString());
      }
      if (q) {
        const queryTerm = `%${q.trim()}%`;
        conditions.push(`(
          r.full_name ILIKE $${pIdx} OR 
          r.email ILIKE $${pIdx} OR 
          r.mobile ILIKE $${pIdx} OR 
          r.city ILIKE $${pIdx} OR 
          r.company_name ILIKE $${pIdx}
        )`);
        params.push(queryTerm);
        pIdx++;
      }

      const whereClause = conditions.join(' AND ');
      const countRes = await pool.query(`SELECT COUNT(*) FROM registrations r WHERE ${whereClause}`, params);
      const total = Number(countRes.rows[0].count);

      const listQuery = `
        SELECT r.*, s.name as agent_name, s.email as agent_email
        FROM registrations r
        JOIN staff s ON r.agent_id = s.id
        WHERE ${whereClause}
        ORDER BY r.updated_at DESC
        LIMIT $${pIdx++} OFFSET $${pIdx++}
      `;
      const listRes = await pool.query(listQuery, [...params, pageSize, offset]);
      const data = listRes.rows.map(row => ({
        ...row,
        is_stale: isDraftStale(row.updated_at, row.status)
      }));

      return {
        data,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    }

    // In-Memory list & filter
    let items = memoryDb.registrations.filter(r => r.deleted_at === null);

    if (status && status !== 'all') {
      items = items.filter(r => r.status === status);
    }
    if (type && type !== 'all') {
      items = items.filter(r => r.user_type === type);
    }
    if (agentId) {
      items = items.filter(r => r.agent_id === Number(agentId));
    }
    if (from) {
      const fromDate = new Date(from).getTime();
      items = items.filter(r => new Date(r.created_at).getTime() >= fromDate);
    }
    if (to) {
      const toDate = new Date(to).getTime();
      items = items.filter(r => new Date(r.created_at).getTime() <= toDate);
    }
    if (q) {
      const term = q.trim().toLowerCase();
      items = items.filter(r => 
        (r.full_name && r.full_name.toLowerCase().includes(term)) ||
        (r.email && r.email.toLowerCase().includes(term)) ||
        (r.mobile && r.mobile.includes(term)) ||
        (r.city && r.city.toLowerCase().includes(term)) ||
        (r.company_name && r.company_name.toLowerCase().includes(term))
      );
    }

    items.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const total = items.length;
    const paginated = items.slice(offset, offset + pageSize).map(item => {
      const agent = memoryDb.staff.find(s => s.id === item.agent_id);
      return {
        ...item,
        agent_name: agent?.name || 'Agent',
        agent_email: agent?.email || '',
        is_stale: isDraftStale(item.updated_at, item.status)
      };
    });

    return {
      data: paginated,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  },

  // OTP methods
  async upsertOtp(registrationId, channel, targetValue, code, expiresAt, resendAfter) {
    const regId = Number(registrationId);
    if (isDbConnected()) {
      const q = `
        INSERT INTO otps (registration_id, channel, target_value, code, attempts_left, expires_at, resend_after, created_at)
        VALUES ($1, $2, $3, $4, 3, $5, $6, NOW())
        ON CONFLICT (registration_id, channel)
        DO UPDATE SET
          target_value = EXCLUDED.target_value,
          code = EXCLUDED.code,
          attempts_left = 3,
          expires_at = EXCLUDED.expires_at,
          resend_after = EXCLUDED.resend_after,
          created_at = NOW()
        RETURNING *
      `;
      const res = await pool.query(q, [regId, channel, targetValue, code, expiresAt, resendAfter]);
      return res.rows[0];
    }

    const existingIdx = memoryDb.otps.findIndex(o => o.registration_id === regId && o.channel === channel);
    const otpData = {
      id: existingIdx >= 0 ? memoryDb.otps[existingIdx].id : ++memOtpIdCounter,
      registration_id: regId,
      channel,
      target_value: targetValue,
      code,
      attempts_left: 3,
      expires_at: expiresAt,
      resend_after: resendAfter,
      created_at: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      memoryDb.otps[existingIdx] = otpData;
    } else {
      memoryDb.otps.push(otpData);
    }
    return otpData;
  },

  async findOtp(registrationId, channel) {
    const regId = Number(registrationId);
    if (isDbConnected()) {
      const res = await pool.query('SELECT * FROM otps WHERE registration_id = $1 AND channel = $2', [regId, channel]);
      return res.rows[0] || null;
    }
    return memoryDb.otps.find(o => o.registration_id === regId && o.channel === channel) || null;
  },

  async updateOtpAttempts(id, attemptsLeft) {
    const numId = Number(id);
    if (isDbConnected()) {
      await pool.query('UPDATE otps SET attempts_left = $1 WHERE id = $2', [attemptsLeft, numId]);
      return;
    }
    const otp = memoryDb.otps.find(o => o.id === numId);
    if (otp) otp.attempts_left = attemptsLeft;
  },

  async deleteOtp(registrationId, channel) {
    const regId = Number(registrationId);
    if (isDbConnected()) {
      await pool.query('DELETE FROM otps WHERE registration_id = $1 AND channel = $2', [regId, channel]);
      return;
    }
    const idx = memoryDb.otps.findIndex(o => o.registration_id === regId && o.channel === channel);
    if (idx >= 0) memoryDb.otps.splice(idx, 1);
  },

  // Reports
  async getSummaryReport() {
    const allStaff = await this.getAllStaff();
    const agents = allStaff.filter(s => s.role === 'agent');

    if (isDbConnected()) {
      const activeRegsRes = await pool.query(`
        SELECT r.*, s.name as agent_name
        FROM registrations r
        JOIN staff s ON r.agent_id = s.id
        WHERE r.deleted_at IS NULL
      `);
      const activeRegs = activeRegsRes.rows;

      return buildSummaryObject(activeRegs, agents);
    }

    const activeRegs = memoryDb.registrations.filter(r => r.deleted_at === null);
    return buildSummaryObject(activeRegs, agents);
  }
};

function buildSummaryObject(activeRegs, agents) {
  const summary = {
    total: { total: 0, builder: 0, broker: 0 },
    drafts: { total: 0, builder: 0, broker: 0 },
    submitted: { total: 0, builder: 0, broker: 0 },
    stale: { total: 0, builder: 0, broker: 0 }
  };

  activeRegs.forEach(r => {
    const type = r.user_type === 'builder' ? 'builder' : 'broker';
    summary.total.total++;
    summary.total[type]++;

    if (r.status === 'draft') {
      summary.drafts.total++;
      summary.drafts[type]++;

      if (isDraftStale(r.updated_at, r.status)) {
        summary.stale.total++;
        summary.stale[type]++;
      }
    } else if (r.status === 'submitted') {
      summary.submitted.total++;
      summary.submitted[type]++;
    }
  });

  const agentStats = agents.map(agent => {
    const agentRegs = activeRegs.filter(r => r.agent_id === agent.id);
    const drafts = agentRegs.filter(r => r.status === 'draft').length;
    const submitted = agentRegs.filter(r => r.status === 'submitted').length;
    const stale = agentRegs.filter(r => r.status === 'draft' && isDraftStale(r.updated_at, r.status)).length;

    return {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      total: agentRegs.length,
      drafts,
      submitted,
      stale
    };
  });

  return { summary, agentStats };
}
