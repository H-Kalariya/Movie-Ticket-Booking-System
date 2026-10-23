import { asyncHandler, ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { Booking } from '../models/Booking.js';
import { Theatre } from '../models/Theatre.js';
import { ROLES } from '../constants/roles.js';
import { logActivity } from '../models/ActivityLog.js';

// Admin: list all users.
export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  res.json({
    users: users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt,
    })),
  });
});

// Admin: change a user's role.
export const setUserRole = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    throw ApiError.badRequest('You cannot change your own role.');
  }
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found.');
  user.role = req.body.role;
  await user.save();
  await logActivity(req.user, `Set role of ${user.email} to ${user.role}`);
  res.json({ user: user.toSafeJSON() });
});

// Admin: delete a user (blocked if they still have active bookings or theatres).
export const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    throw ApiError.badRequest('You cannot remove your own account.');
  }
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found.');

  const hasBookings = await Booking.exists({ user: user._id, status: 'confirmed' });
  if (hasBookings) throw ApiError.conflict('This user has active bookings.');

  if (user.role === ROLES.THEATRE_OWNER) {
    const owns = await Theatre.exists({ owner: user._id });
    if (owns) throw ApiError.conflict('Reassign or delete this owner\'s theatres first.');
  }

  await user.deleteOne();
  await logActivity(req.user, `Removed user ${user.email}`);
  res.json({ ok: true });
});

// Admin/owner helper: list theatre owners (for the "assign owner" dropdown).
export const listOwners = asyncHandler(async (_req, res) => {
  const owners = await User.find({ role: ROLES.THEATRE_OWNER }).select('name email').lean();
  res.json({ owners: owners.map((o) => ({ id: o._id.toString(), name: o.name, email: o.email })) });
});
