import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import { movieSchema } from '../validation/schemas.js';
import {
  listMovies,
  getMovie,
  createMovie,
  updateMovie,
  deleteMovie,
} from '../controllers/movieController.js';

const router = Router();

// Public catalogue.
router.get('/', listMovies);
router.get('/:id', getMovie);

// Movie catalogue is curated centrally by admins.
router.post('/', requireAuth, requireRole(ROLES.ADMIN), validate(movieSchema), createMovie);
router.put('/:id', requireAuth, requireRole(ROLES.ADMIN), validate(movieSchema), updateMovie);
router.delete('/:id', requireAuth, requireRole(ROLES.ADMIN), deleteMovie);

export default router;
