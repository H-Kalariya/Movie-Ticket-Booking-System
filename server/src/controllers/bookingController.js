import mongoose from 'mongoose';
import { asyncHandler, ApiError } from '../utils/ApiError.js';
import { Booking } from '../models/Booking.js';
import { Show } from '../models/Show.js';
import { Theatre } from '../models/Theatre.js';
import { ROLES } from '../constants/roles.js';
import { isPast, canCancel, makeBookingCode, rowLabel } from '../utils/helpers.js';
import { logActivity } from '../models/ActivityLog.js';

function validSeatsForScreen(seats, screen) {
  const allowed = new Set();
  for (let r = 0; r < screen.rows; r++) {
    for (let c = 1; c <= screen.cols; c++) allowed.add(rowLabel(r) + c);
  }
  return seats.every((s) => allowed.has(s));
}

// Customer: create a booking. Seat conflicts are re-checked atomically.
export const createBooking = asyncHandler(async (req, res) => {
  const { show: showId, seats } = req.body;

  const show = await Show.findById(showId).lean();
  if (!show) throw ApiError.notFound('Show not found.');
  if (isPast(show)) throw ApiError.badRequest('This show has already started.');

  const theatre = await Theatre.findById(show.theatre).lean();
  const screen = theatre?.screens.find((s) => s._id.toString() === show.screenId.toString());
  if (!screen) throw ApiError.badRequest('Screen not found.');
  if (!validSeatsForScreen(seats, screen)) throw ApiError.badRequest('One or more seats are not on this screen.');

  // Prefer an atomic transaction (replica set / Atlas). If the server is a
  // standalone that rejects transactions, retry the same logic without one.
  try {
    const booking = await bookSeats(req.user, show, seats, true);
    await logActivity(req.user, `Booked ${seats.length} seat(s) on show ${show._id}`);
    return res.status(201).json({ booking });
  } catch (e) {
    const unsupported =
      e?.code === 20 ||
      /Transaction numbers|replica set|not supported/i.test(e?.message || '');
    if (!unsupported) throw e;
  }
  const booking = await bookSeats(req.user, show, seats, false);
  await logActivity(req.user, `Booked ${seats.length} seat(s) on show ${show._id}`);
  res.status(201).json({ booking });
});

// Shared booking logic; runs inside a transaction when withTxn is true.
async function bookSeats(user, show, seats, withTxn) {
  let session = null;
  if (withTxn) {
    session = await mongoose.startSession();
    session.startTransaction();
  }
  try {
    const confirmed = await Booking.find({ show: show._id, status: 'confirmed' })
      .select('seats')
      .session(session)
      .lean();
    const taken = new Set(confirmed.flatMap((b) => b.seats));
    const clash = seats.filter((s) => taken.has(s));
    if (clash.length) {
      throw ApiError.conflict(`Seat ${clash.join(', ')} was just booked. Please choose other seats.`);
    }

    let code;
    do {
      code = makeBookingCode();
    } while (await Booking.exists({ code }).session(session));

    const [booking] = await Booking.create(
      [
        {
          code,
          user: user._id,
          show: show._id,
          theatre: show.theatre,
          seats,
          total: seats.length * show.price,
          status: 'confirmed',
        },
      ],
      session ? { session } : {}
    );

    if (session) await session.commitTransaction();
    return booking;
  } catch (e) {
    if (session) await session.abortTransaction().catch(() => {});
    throw e;
  } finally {
    if (session) session.endSession();
  }
}

// Customer: their own bookings.
export const myBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate({ path: 'show', populate: [{ path: 'movie', select: 'title hue' }, { path: 'theatre', select: 'name area screens' }] })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ bookings: bookings.map(withCancelFlag) });
});

function withCancelFlag(b) {
  const show = b.show;
  return { ...b, canCancel: b.status === 'confirmed' && show && canCancel(show) };
}

// A single booking: owner of the booking, theatre owner, or admin may view.
export const getBooking = asyncHandler(async (req, res) => {
  const b = await Booking.findById(req.params.id)
    .populate({ path: 'show', populate: [{ path: 'movie', select: 'title hue' }, { path: 'theatre', select: 'name area screens owner' }] })
    .lean();
  if (!b) throw ApiError.notFound('Booking not found.');

  const uid = req.user._id.toString();
  const isOwnerOfBooking = b.user.toString() === uid;
  const isTheatreOwner = b.show?.theatre?.owner?.toString() === uid;
  const isAdmin = req.user.role === ROLES.ADMIN;
  if (!isOwnerOfBooking && !isTheatreOwner && !isAdmin) {
    throw ApiError.forbidden('You can only view your own bookings.');
  }
  res.json({ booking: withCancelFlag(b) });
});

// Customer cancels their own booking (respecting the 2-hour window).
export const cancelOwnBooking = asyncHandler(async (req, res) => {
  const b = await Booking.findById(req.params.id).populate('show');
  if (!b) throw ApiError.notFound('Booking not found.');
  if (b.user.toString() !== req.user._id.toString()) throw ApiError.forbidden();
  if (b.status !== 'confirmed') throw ApiError.badRequest('This booking is already cancelled.');
  if (!canCancel(b.show)) throw ApiError.badRequest('Cancellation closes 2 hours before the show.');

  b.status = 'cancelled';
  b.cancelledAt = new Date();
  await b.save();
  await logActivity(req.user, `Cancelled booking ${b.code}`);
  res.json({ ok: true });
});

// Owner/admin bookings management. Owners see only bookings on their theatres.
export const listManageableBookings = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role !== ROLES.ADMIN) {
    const owned = await Theatre.find({ owner: req.user._id }).select('_id').lean();
    filter = { theatre: { $in: owned.map((t) => t._id) } };
  }
  const bookings = await Booking.find(filter)
    .populate('user', 'name email')
    .populate({ path: 'show', populate: [{ path: 'movie', select: 'title' }, { path: 'theatre', select: 'name' }] })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ bookings });
});

// Owner/admin force-cancel a booking (no time window; they are operators).
export const cancelManagedBooking = asyncHandler(async (req, res) => {
  const b = await Booking.findById(req.params.id);
  if (!b) throw ApiError.notFound('Booking not found.');

  if (req.user.role !== ROLES.ADMIN) {
    const theatre = await Theatre.findById(b.theatre).select('owner').lean();
    if (!theatre || theatre.owner.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('You can only cancel bookings for your own theatres.');
    }
  }
  if (b.status !== 'confirmed') throw ApiError.badRequest('This booking is already cancelled.');
  b.status = 'cancelled';
  b.cancelledAt = new Date();
  await b.save();
  await logActivity(req.user, `Cancelled booking ${b.code} (operator)`);
  res.json({ ok: true });
});
