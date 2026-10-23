import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    genre: { type: String, required: true, trim: true },
    language: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 30, max: 300 },
    desc: { type: String, default: '', maxlength: 2000 },
    status: { type: String, enum: ['now', 'upcoming'], default: 'now', index: true },
    hue: { type: Number, default: () => Math.floor(Math.random() * 360) },
  },
  { timestamps: true }
);

// Note: our document has a field literally named "language" (the film's spoken
// language). By default Mongo would treat that as a text-index language override
// and reject values like "Hindi". Point the override at a field we never use.
movieSchema.index(
  { title: 'text', genre: 'text', desc: 'text' },
  { language_override: 'textLang', default_language: 'none' }
);

export const Movie = mongoose.model('Movie', movieSchema);
