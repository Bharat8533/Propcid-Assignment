import { Router } from 'express';
import { repo } from '../db/repo.js';
import { authenticate, requireAgent } from '../middleware/auth.js';
import {
  validateDraft,
  validateSubmit,
  calculateCompletion,
  normaliseMobile,
  isDraftStale
} from '../utils/validation.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { q, status, type, from, to, page, limit, scope } = req.query;
    let agentId = req.query.agentId;

    if (req.user.role === 'agent') {
      agentId = req.user.id;
    }

    const result = await repo.listRegistrations({
      q,
      status,
      type,
      agentId,
      from,
      to,
      page,
      limit
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAgent, async (req, res, next) => {
  try {
    const formData = req.body || {};

    const { isValid, errors } = validateDraft(formData);
    if (!isValid) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Draft validation failed. Please check the fields.',
          fields: errors
        }
      });
    }

    if (formData.mobile) {
      const dupMobile = await repo.findActiveByMobile(formData.mobile);
      if (dupMobile) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_MOBILE',
            message: `A registration with mobile ${normaliseMobile(formData.mobile)} already exists (Status: ${dupMobile.status}, Held by: ${dupMobile.agent_name || 'Staff'})`
          }
        });
      }
    }

    if (formData.email) {
      const dupEmail = await repo.findActiveByEmail(formData.email);
      if (dupEmail) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_EMAIL',
            message: `A registration with email ${formData.email.toLowerCase()} already exists (Status: ${dupEmail.status}, Held by: ${dupEmail.agent_name || 'Staff'})`
          }
        });
      }
    }

    const completion = calculateCompletion(formData);

    const created = await repo.createRegistration({
      ...formData,
      agent_id: req.user.id,
      status: 'draft',
      completion,
      email_verified: false,
      mobile_verified: false
    });

    return res.status(201).json({ registration: created });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const reg = await repo.findRegistrationById(req.params.id);
    if (!reg) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Registration not found'
        }
      });
    }

    if (req.user.role === 'agent' && reg.agent_id !== req.user.id) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this registration'
        }
      });
    }

    return res.json({
      registration: {
        ...reg,
        is_stale: isDraftStale(reg.updated_at, reg.status)
      }
    });
  } catch (err) {
    next(err);
  }
});

const handleUpdate = async (req, res, next) => {
  try {
    const reg = await repo.findRegistrationById(req.params.id);
    if (!reg) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Registration not found'
        }
      });
    }

    if (reg.agent_id !== req.user.id) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only edit registrations you created'
        }
      });
    }

    if (reg.status === 'submitted') {
      return res.status(400).json({
        error: {
          code: 'RECORD_LOCKED',
          message: 'Submitted registrations are read-only and cannot be modified'
        }
      });
    }

    const updates = req.body || {};

    let email_verified = reg.email_verified;
    if (updates.email !== undefined) {
      const oldEmail = String(reg.email || '').trim().toLowerCase();
      const newEmail = String(updates.email || '').trim().toLowerCase();
      if (oldEmail !== newEmail) {
        email_verified = false;
      }
    }

    let mobile_verified = reg.mobile_verified;
    if (updates.mobile !== undefined) {
      const oldMobile = normaliseMobile(reg.mobile);
      const newMobile = normaliseMobile(updates.mobile);
      if (oldMobile !== newMobile) {
        mobile_verified = false;
      }
    }

    const merged = {
      ...reg,
      ...updates,
      email_verified,
      mobile_verified
    };

    const { isValid, errors } = validateDraft(merged);
    if (!isValid) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Draft validation failed. Please check the fields.',
          fields: errors
        }
      });
    }

    if (merged.mobile) {
      const dupMobile = await repo.findActiveByMobile(merged.mobile, reg.id);
      if (dupMobile) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_MOBILE',
            message: `A registration with mobile ${normaliseMobile(merged.mobile)} already exists (Status: ${dupMobile.status}, Held by: ${dupMobile.agent_name || 'Staff'})`
          }
        });
      }
    }

    if (merged.email) {
      const dupEmail = await repo.findActiveByEmail(merged.email, reg.id);
      if (dupEmail) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_EMAIL',
            message: `A registration with email ${merged.email.toLowerCase()} already exists (Status: ${dupEmail.status}, Held by: ${dupEmail.agent_name || 'Staff'})`
          }
        });
      }
    }

    merged.completion = calculateCompletion(merged);

    const updated = await repo.updateRegistration(reg.id, merged);
    return res.json({ registration: updated });
  } catch (err) {
    next(err);
  }
};

router.put('/:id', requireAgent, handleUpdate);
router.patch('/:id', requireAgent, handleUpdate);

router.delete('/:id', async (req, res, next) => {
  try {
    const reg = await repo.findRegistrationById(req.params.id);
    if (!reg) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Registration not found'
        }
      });
    }

    let deleteReason = req.body?.reason ? String(req.body.reason).trim() : null;

    if (req.user.role === 'agent') {
      if (reg.agent_id !== req.user.id) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Agents can only delete their own registrations'
          }
        });
      }
      if (reg.status === 'submitted') {
        return res.status(400).json({
          error: {
            code: 'RECORD_LOCKED',
            message: 'Agents cannot delete submitted registrations'
          }
        });
      }
    } else if (req.user.role === 'admin') {
      if (!deleteReason || deleteReason.length < 10 || deleteReason.length > 200) {
        return res.status(400).json({
          error: {
            code: 'REASON_REQUIRED',
            message: 'Admin deletion requires a mandatory reason between 10 and 200 characters'
          }
        });
      }
    }

    await repo.softDeleteRegistration(reg.id, req.user.id, deleteReason);
    return res.json({
      success: true,
      message: 'Registration successfully deleted'
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/otp/send', requireAgent, async (req, res, next) => {
  try {
    const reg = await repo.findRegistrationById(req.params.id);
    if (!reg) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Registration not found'
        }
      });
    }

    if (reg.agent_id !== req.user.id) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }

    if (reg.status === 'submitted') {
      return res.status(400).json({
        error: {
          code: 'RECORD_LOCKED',
          message: 'Registration is already submitted'
        }
      });
    }

    const { channel } = req.body;
    if (!['email', 'mobile'].includes(channel)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CHANNEL',
          message: 'Channel must be "email" or "mobile"'
        }
      });
    }

    const targetValue = channel === 'email' ? reg.email : normaliseMobile(reg.mobile);
    if (!targetValue) {
      return res.status(400).json({
        error: {
          code: 'MISSING_TARGET',
          message: `Please save a valid ${channel} before requesting an OTP`
        }
      });
    }

    const existingOtp = await repo.findOtp(reg.id, channel);
    if (existingOtp && new Date() < new Date(existingOtp.resend_after)) {
      const waitSeconds = Math.ceil((new Date(existingOtp.resend_after) - new Date()) / 1000);
      return res.status(429).json({
        error: {
          code: 'COOLDOWN_ACTIVE',
          message: `Please wait ${waitSeconds}s before requesting a new OTP`
        }
      });
    }

    const code = '123456';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const resendAfter = new Date(Date.now() + 30 * 1000).toISOString();

    await repo.upsertOtp(reg.id, channel, targetValue, code, expiresAt, resendAfter);

    console.log(`[OTP] Generated dummy OTP "${code}" for ${channel}: ${targetValue} (Reg ID: ${reg.id})`);

    return res.json({
      success: true,
      channel,
      target: targetValue,
      expiresAt,
      resendAfter
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/otp/verify', requireAgent, async (req, res, next) => {
  try {
    const reg = await repo.findRegistrationById(req.params.id);
    if (!reg) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Registration not found'
        }
      });
    }

    if (reg.agent_id !== req.user.id) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }

    const { channel, code } = req.body;
    if (!['email', 'mobile'].includes(channel)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CHANNEL',
          message: 'Channel must be "email" or "mobile"'
        }
      });
    }

    const otp = await repo.findOtp(reg.id, channel);
    if (!otp) {
      return res.status(400).json({
        error: {
          code: 'OTP_NOT_FOUND',
          message: 'No OTP requested for this channel. Please request an OTP first.'
        }
      });
    }

    if (new Date() > new Date(otp.expires_at)) {
      return res.status(400).json({
        error: {
          code: 'OTP_EXPIRED',
          message: 'OTP has expired. Please request a new OTP.'
        }
      });
    }

    if (otp.attempts_left <= 0) {
      return res.status(400).json({
        error: {
          code: 'MAX_ATTEMPTS_EXCEEDED',
          message: 'Maximum verification attempts exceeded. Please request a new OTP.'
        }
      });
    }

    if (String(code || '').trim() !== String(otp.code).trim()) {
      const remaining = otp.attempts_left - 1;
      await repo.updateOtpAttempts(otp.id, remaining);
      return res.status(400).json({
        error: {
          code: 'INVALID_OTP',
          message: remaining > 0 
            ? `Invalid OTP. ${remaining} attempt(s) remaining.`
            : 'Invalid OTP. Maximum attempts exceeded. Please request a new OTP.',
          attemptsLeft: remaining
        },
        attemptsLeft: remaining
      });
    }

    await repo.deleteOtp(reg.id, channel);

    const updatePayload = {
      ...reg,
      [channel === 'email' ? 'email_verified' : 'mobile_verified']: true
    };
    updatePayload.completion = calculateCompletion(updatePayload);

    const updated = await repo.updateRegistration(reg.id, updatePayload);

    return res.json({
      success: true,
      message: `${channel === 'email' ? 'Email' : 'Mobile'} successfully verified`,
      registration: updated
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/submit', requireAgent, async (req, res, next) => {
  try {
    const reg = await repo.findRegistrationById(req.params.id);
    if (!reg) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Registration not found'
        }
      });
    }

    if (reg.agent_id !== req.user.id) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }

    if (reg.status === 'submitted') {
      return res.status(400).json({
        error: {
          code: 'ALREADY_SUBMITTED',
          message: 'Registration is already submitted'
        }
      });
    }

    let target = { ...reg };
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      target = {
        ...reg,
        ...req.body,
        email_verified: reg.email_verified,
        mobile_verified: reg.mobile_verified
      };
    }

    const { isValid, errors } = validateSubmit(target);
    if (!isValid) {
      return res.status(400).json({
        error: {
          code: 'SUBMIT_VALIDATION_FAILED',
          message: 'Cannot submit registration. All mandatory fields and verifications are required.',
          fields: errors
        }
      });
    }

    const updated = await repo.updateRegistration(reg.id, {
      ...target,
      status: 'submitted',
      completion: 100
    });

    return res.json({
      success: true,
      message: 'Registration submitted successfully',
      registration: updated
    });
  } catch (err) {
    next(err);
  }
});

export default router;
