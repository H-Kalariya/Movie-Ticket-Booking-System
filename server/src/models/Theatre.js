import mongoose from 'mongoose';

const screenSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rows: { type: Number, required: true, min: 3, max: 15 },
    cols: { type: Number, required: true, min: 4, max: 16 },
  },
  { _id: true }
);

const theatreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    area: { type: String, default: '', trim: true },
    // The theatre_owner who manages this venue. Admins can reassign ownership.
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    screens: { type: [screenSchema], default: [] },
  },
  { timestamps: true }
);

export const Theatre = mongoose.model('Theatre', theatreSchema);
