import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import { theatreSchema, screenSchema } from '../validation/schemas.js';
import {
  listTheatres,
  listManageableTheatres,
  createTheatre,
  updateTheatre,
  deleteTheatre,
  addScreen,
  updateScreen,
  deleteScreen,
} from '../controllers/theatreController.js';

const router = Router();
const manager = [requireAuth, requireRole(ROLES.THEATRE_OWNER, ROLES.ADMIN)];

// Public catalogue of theatres.
router.get('/', listTheatres);

// Scoped management list (owners see only their own).
router.get('/manage/list', ...manager, listManageableTheatres);

router.post('/', ...manager, validate(theatreSchema), createTheatre);
router.put('/:id', ...manager, validate(theatreSchema), updateTheatre);
router.delete('/:id', ...manager, deleteTheatre);

// Screens (embedded).
router.post('/:id/screens', ...manager, validate(screenSchema), addScreen);
router.put('/:id/screens/:screenId', ...manager, validate(screenSchema), updateScreen);
router.delete('/:id/screens/:screenId', ...manager, deleteScreen);

export default router;
