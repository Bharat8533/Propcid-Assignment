import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import registrationsRouter from './routes/registrations.js';
import reportsRouter from './routes/reports.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/auth', authRouter);
app.use('/registrations', registrationsRouter);
app.use('/reports', reportsRouter);

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`
    }
  });
});

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);

  if (err.code === '23505') {
    const isMobile = err.constraint === 'idx_unique_mobile_active' || String(err.detail || err.message).includes('mobile');
    const isEmail = err.constraint === 'idx_unique_email_active' || String(err.detail || err.message).includes('email');
    if (isMobile) {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_MOBILE',
          message: 'A registration with this mobile number already exists'
        }
      });
    }
    if (isEmail) {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_EMAIL',
          message: 'A registration with this email already exists'
        }
      });
    }
  }

  if (['ETIMEDOUT', 'ECONNRESET', 'ECONNABORTED'].includes(err.code) || String(err.message || '').toLowerCase().includes('timeout')) {
    return res.status(503).json({
      error: {
        code: 'DB_TIMEOUT',
        message: 'Database connection timed out. Please try again in a moment.'
      }
    });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'An unexpected internal error occurred'
    }
  });
});

export default app;
