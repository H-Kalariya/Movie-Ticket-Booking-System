import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import { showSchema } from '../validation/schemas.js';
import {
  listShows,
  getShow,
  listManageableShows,
  createShow,
  updateShow,
  deleteShow,
} from '../controllers/showController.js';

const router = Router();
const manager = [requireAuth, requireRole(ROLES.THEATRE_OWNER, ROLES.ADMIN)];

// Public.
router.get('/', listShows);

// Scoped management list must come before /:id.
router.get('/manage/list', ...manager, listManageableShows);

router.get('/:id', getShow);
router.post('/', ...manager, validate(showSchema), createShow);
router.put('/:id', ...manager, validate(showSchema), updateShow);
router.delete('/:id', ...manager, deleteShow);

export default router;
