import { asyncHandler, ApiError } from '../utils/ApiError.js';
import { Theatre } from '../models/Theatre.js';
import { Show } from '../models/Show.js';
import { Booking } from '../models/Booking.js';
import { User } from '../models/User.js';
import { ROLES } from '../constants/roles.js';
import { logActivity } from '../models/ActivityLog.js';

// Load a theatre and assert the requester may manage it.
// Admins manage all; owners manage only their own.
async function loadManageable(user, theatreId) {
  const theatre = await Theatre.findById(theatreId);
  if (!theatre) throw ApiError.notFound('Theatre not found.');
  const isOwner = theatre.owner.toString() === user._id.toString();
  if (user.role !== ROLES.ADMIN && !isOwner) {
    throw ApiError.forbidden('You can only manage your own theatres.');
  }
  return theatre;
}

async function hasConfirmed(showQuery) {
  const shows = await Show.find(showQuery).select('_id').lean();
  if (!shows.length) return false;
  return Boolean(
    await Booking.exists({ show: { $in: shows.map((s) => s._id) }, status: 'confirmed' })
  );
}

// Public: all theatres (catalogue view).
export const listTheatres = asyncHandler(async (_req, res) => {
  const theatres = await Theatre.find().populate('owner', 'name email').lean();
  res.json({ theatres });
});

// Owner/admin: theatres scoped to what the requester may manage.
export const listManageableTheatres = asyncHandler(async (req, res) => {
  const filter = req.user.role === ROLES.ADMIN ? {} : { owner: req.user._id };
  const theatres = await Theatre.find(filter).populate('owner', 'name email').lean();
  res.json({ theatres });
});

export const createTheatre = asyncHandler(async (req, res) => {
  const { name, area, owner } = req.body;
  // Only admins can assign a theatre to another owner; owners own what they create.
  let ownerId = req.user._id;
  if (req.user.role === ROLES.ADMIN && owner) {
    const ownerUser = await User.findById(owner);
    if (!ownerUser) throw ApiError.badRequest('Owner account not found.');
    ownerId = ownerUser._id;
  }
  const theatre = await Theatre.create({ name, area, owner: ownerId, screens: [] });
  await logActivity(req.user, `Added theatre ${name}`);
  res.status(201).json({ theatre });
});

export const updateTheatre = asyncHandler(async (req, res) => {
  const theatre = await loadManageable(req.user, req.params.id);
  theatre.name = req.body.name;
  theatre.area = req.body.area || '';
  // Reassigning ownership is an admin-only action.
  if (req.user.role === ROLES.ADMIN && req.body.owner) {
    const ownerUser = await User.findById(req.body.owner);
    if (!ownerUser) throw ApiError.badRequest('Owner account not found.');
    theatre.owner = ownerUser._id;
  }
  await theatre.save();
  await logActivity(req.user, `Updated theatre ${theatre.name}`);
  res.json({ theatre });
});

export const deleteTheatre = asyncHandler(async (req, res) => {
  const theatre = await loadManageable(req.user, req.params.id);
  if (theatre.screens.length) throw ApiError.conflict("Delete this theatre's screens first.");
  await theatre.deleteOne();
  await logActivity(req.user, `Deleted theatre ${theatre.name}`);
  res.json({ ok: true });
});

// ---- Screens (embedded in a theatre) ----

export const addScreen = asyncHandler(async (req, res) => {
  const theatre = await loadManageable(req.user, req.params.id);
  theatre.screens.push({ name: req.body.name, rows: req.body.rows, cols: req.body.cols });
  await theatre.save();
  await logActivity(req.user, `Added screen ${req.body.name} to ${theatre.name}`);
  res.status(201).json({ theatre });
});

export const updateScreen = asyncHandler(async (req, res) => {
  const theatre = await loadManageable(req.user, req.params.id);
  const screen = theatre.screens.id(req.params.screenId);
  if (!screen) throw ApiError.notFound('Screen not found.');

  // Changing a layout with active bookings would corrupt seat maps.
  const locked = await hasConfirmed({ theatre: theatre._id, screenId: screen._id });
  if (locked) throw ApiError.conflict('This screen has active bookings. Cancel them before changing its layout.');

  screen.name = req.body.name;
  screen.rows = req.body.rows;
  screen.cols = req.body.cols;
  await theatre.save();
  await logActivity(req.user, `Updated screen ${screen.name}`);
  res.json({ theatre });
});

export const deleteScreen = asyncHandler(async (req, res) => {
  const theatre = await loadManageable(req.user, req.params.id);
  const screen = theatre.screens.id(req.params.screenId);
  if (!screen) throw ApiError.notFound('Screen not found.');
  const hasShows = await Show.exists({ theatre: theatre._id, screenId: screen._id });
  if (hasShows) throw ApiError.conflict("Delete this screen's shows first.");
  screen.deleteOne();
  await theatre.save();
  await logActivity(req.user, `Deleted screen ${screen.name}`);
  res.json({ theatre });
});
