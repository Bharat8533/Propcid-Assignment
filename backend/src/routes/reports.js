import { Router } from 'express';
import { repo } from '../db/repo.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Reports are restricted to administrators only
router.use(authenticate);
router.use(requireAdmin);

// GET /reports/summary
router.get('/summary', async (req, res, next) => {
  try {
    const reportData = await repo.getSummaryReport();
    return res.json(reportData);
  } catch (err) {
    next(err);
  }
});

export default router;
