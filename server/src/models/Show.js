import mongoose from 'mongoose';

const showSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true, index: true },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre', required: true, index: true },
    // The embedded screen's _id within the theatre document.
    screenId: { type: mongoose.Schema.Types.ObjectId, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:mm
    price: { type: Number, required: true, min: 1, max: 5000 },
  },
  { timestamps: true }
);

// A screen can only have one show at a given date+time.
showSchema.index({ theatre: 1, screenId: 1, date: 1, time: 1 }, { unique: true });

export const Show = mongoose.model('Show', showSchema);
