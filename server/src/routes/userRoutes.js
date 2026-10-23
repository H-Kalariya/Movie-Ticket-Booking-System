import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import { profileSchema, roleUpdateSchema } from '../validation/schemas.js';
import { updateProfile } from '../controllers/profileController.js';
import { listUsers, setUserRole, deleteUser, listOwners } from '../controllers/userController.js';

const router = Router();

// Any signed-in user manages their own profile.
router.put('/me', requireAuth, validate(profileSchema), updateProfile);

// Owners/admins need the owner list to assign theatres.
router.get('/owners', requireAuth, requireRole(ROLES.THEATRE_OWNER, ROLES.ADMIN), listOwners);

// Admin-only user administration.
router.get('/', requireAuth, requireRole(ROLES.ADMIN), listUsers);
router.put('/:id/role', requireAuth, requireRole(ROLES.ADMIN), validate(roleUpdateSchema), setUserRole);
router.delete('/:id', requireAuth, requireRole(ROLES.ADMIN), deleteUser);

export default router;
