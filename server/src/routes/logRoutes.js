import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { listLogs } from '../controllers/logController.js';

const router = Router();
router.get('/', requireAuth, requireRole(ROLES.ADMIN), listLogs);
export default router;
