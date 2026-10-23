import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import movieRoutes from './movieRoutes.js';
import theatreRoutes from './theatreRoutes.js';
import showRoutes from './showRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import logRoutes from './logRoutes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/movies', movieRoutes);
router.use('/theatres', theatreRoutes);
router.use('/shows', showRoutes);
router.use('/bookings', bookingRoutes);
router.use('/logs', logRoutes);

export default router;
