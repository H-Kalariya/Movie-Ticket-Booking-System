import { asyncHandler, ApiError } from '../utils/ApiError.js';
import { Show } from '../models/Show.js';
import { Theatre } from '../models/Theatre.js';
import { Booking } from '../models/Booking.js';
import { ROLES } from '../constants/roles.js';
import { dayStr } from '../utils/helpers.js';
import { logActivity } from '../models/ActivityLog.js';

// Public: shows for a movie (optionally a date), with seats-taken counts.
export const listShows = asyncHandler(async (req, res) => {
  const { movie, date } = req.query;
  const filter = {};
  if (movie) filter.movie = movie;
  if (date) filter.date = date;
  const shows = await Show.find(filter)
    .populate('movie', 'title genre language duration hue status')
    .populate('theatre', 'name area screens')
    .sort({ date: 1, time: 1 })
    .lean();

  const ids = shows.map((s) => s._id);
  const bookings = await Booking.find({ show: { $in: ids }, status: 'confirmed' })
    .select('show seats')
    .lean();
  const takenMap = {};
  for (const b of bookings) {
    takenMap[b.show] = (takenMap[b.show] || []).concat(b.seats);
  }
  const enriched = shows.map((s) => ({ ...s, takenSeats: takenMap[s._id] || [] }));
  res.json({ shows: enriched });
});

// Public: a single show with its taken seats and screen layout.
export const getShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id)
    .populate('movie', 'title genre language duration hue status')
    .populate('theatre', 'name area screens')
    .lean();
  if (!show) throw ApiError.notFound('Show not found.');
  const screen = show.theatre.screens.find((s) => s._id.toString() === show.screenId.toString());
  const bookings = await Booking.find({ show: show._id, status: 'confirmed' }).select('seats').lean();
  const takenSeats = bookings.flatMap((b) => b.seats);
  res.json({ show: { ...show, screen, takenSeats } });
});

// Owner/admin: shows the requester may manage.
export const listManageableShows = asyncHandler(async (req, res) => {
  let theatreFilter = {};
  if (req.user.role !== ROLES.ADMIN) {
    const owned = await Theatre.find({ owner: req.user._id }).select('_id').lean();
    theatreFilter = { theatre: { $in: owned.map((t) => t._id) } };
  }
  const shows = await Show.find(theatreFilter)
    .populate('movie', 'title')
    .populate('theatre', 'name area screens owner')
    .sort({ date: 1, time: 1 })
    .lean();

  const ids = shows.map((s) => s._id);
  const counts = await Booking.aggregate([
    { $match: { show: { $in: ids }, status: 'confirmed' } },
    { $unwind: '$seats' },
    { $group: { _id: '$show', sold: { $sum: 1 } } },
  ]);
  const soldMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.sold]));
  const enriched = shows.map((s) => ({ ...s, seatsSold: soldMap[s._id.toString()] || 0 }));
  res.json({ shows: enriched });
});

export const createShow = asyncHandler(async (req, res) => {
  const { movie, theatre: theatreId, screenId, date, time, price } = req.body;

  const theatre = await Theatre.findById(theatreId);
  if (!theatre) throw ApiError.badRequest('Theatre not found.');
  if (req.user.role !== ROLES.ADMIN && theatre.owner.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only schedule shows in your own theatres.');
  }
  if (!theatre.screens.id(screenId)) throw ApiError.badRequest('Screen not found in that theatre.');
  if (date < dayStr()) throw ApiError.badRequest('Pick today or a future date.');

  try {
    const show = await Show.create({ movie, theatre: theatreId, screenId, date, time, price });
    await logActivity(req.user, `Added show on ${date} ${time}`);
    res.status(201).json({ show });
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('That screen already has a show at this date and time.');
    throw e;
  }
});

export const updateShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id);
  if (!show) throw ApiError.notFound('Show not found.');

  const theatre = await Theatre.findById(show.theatre);
  if (req.user.role !== ROLES.ADMIN && theatre.owner.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only manage shows in your own theatres.');
  }

  const hasConfirmed = await Booking.exists({ show: show._id, status: 'confirmed' });
  const { movie, theatre: newTheatre, screenId, date, time, price } = req.body;
  const moved = String(show.movie) !== movie || String(show.theatre) !== newTheatre ||
    String(show.screenId) !== screenId || show.date !== date || show.time !== time;
  if (hasConfirmed && moved) {
    throw ApiError.conflict('This show has bookings. Only the price can be changed.');
  }

  Object.assign(show, { movie, theatre: newTheatre, screenId, date, time, price });
  try {
    await show.save();
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('That screen already has a show at this date and time.');
    throw e;
  }
  await logActivity(req.user, `Updated show ${show._id}`);
  res.json({ show });
});

export const deleteShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id);
  if (!show) throw ApiError.notFound('Show not found.');
  const theatre = await Theatre.findById(show.theatre);
  if (req.user.role !== ROLES.ADMIN && theatre.owner.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only manage shows in your own theatres.');
  }
  const hasConfirmed = await Booking.exists({ show: show._id, status: 'confirmed' });
  if (hasConfirmed) throw ApiError.conflict('This show has active bookings. Cancel them first.');
  await show.deleteOne();
  await logActivity(req.user, `Deleted show ${show._id}`);
  res.json({ ok: true });
});
