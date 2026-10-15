import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { repo } from '../db/repo.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-estatedesk-jwt-key-2026';

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Email and password are required'
        }
      });
    }

    const staff = await repo.findStaffByEmail(email);
    if (!staff) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    const isValidPassword = await bcrypt.compare(password, staff.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    const payload = {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: payload
    });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const staff = await repo.findStaffById(req.user.id);
    if (!staff) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User profile not found'
        }
      });
    }
    return res.json({ user: staff });
  } catch (err) {
    next(err);
  }
});

// GET /auth/staff (List agents for dropdowns/filters)
router.get('/staff', authenticate, async (req, res, next) => {
  try {
    const staffList = await repo.getAllStaff();
    return res.json({ data: staffList });
  } catch (err) {
    next(err);
  }
});

export default router;
