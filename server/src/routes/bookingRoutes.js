import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import { bookingSchema } from '../validation/schemas.js';
import {
  createBooking,
  myBookings,
  getBooking,
  cancelOwnBooking,
  listManageableBookings,
  cancelManagedBooking,
} from '../controllers/bookingController.js';

const router = Router();
const manager = [requireAuth, requireRole(ROLES.THEATRE_OWNER, ROLES.ADMIN)];

// Customer.
router.post('/', requireAuth, validate(bookingSchema), createBooking);
router.get('/mine', requireAuth, myBookings);
router.post('/:id/cancel', requireAuth, cancelOwnBooking);

// Owner/admin management (define before /:id to avoid route shadowing).
router.get('/manage/list', ...manager, listManageableBookings);
router.post('/manage/:id/cancel', ...manager, cancelManagedBooking);

// Shared single-booking view (access checked in the controller).
router.get('/:id', requireAuth, getBooking);

export default router;
