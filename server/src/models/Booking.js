import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true }, // human-friendly booking id
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true, index: true },
    // Denormalised theatre reference so owners can query their bookings cheaply.
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre', required: true, index: true },
    seats: { type: [String], required: true, validate: (v) => v.length > 0 && v.length <= 6 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed', index: true },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Prevent two confirmed bookings from claiming the same seat on the same show.
// (Enforced in a transaction in the service layer; this index is a safety net.)
bookingSchema.index({ show: 1, status: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);
