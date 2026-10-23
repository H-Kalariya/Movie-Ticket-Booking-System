import { asyncHandler, ApiError } from '../utils/ApiError.js';
import { Movie } from '../models/Movie.js';
import { Show } from '../models/Show.js';
import { logActivity } from '../models/ActivityLog.js';

// Public: list movies with optional keyword / genre / language / status filters.
export const listMovies = asyncHandler(async (req, res) => {
  const { q, genre, language, status } = req.query;
  const filter = {};
  if (genre) filter.genre = genre;
  if (language) filter.language = language;
  if (status) filter.status = status;
  if (q) {
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: rx }, { genre: rx }, { desc: rx }];
  }
  const movies = await Movie.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ movies });
});

export const getMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id).lean();
  if (!movie) throw ApiError.notFound('Movie not found.');
  res.json({ movie });
});

// Admin only.
export const createMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.create(req.body);
  await logActivity(req.user, `Added movie ${movie.title}`);
  res.status(201).json({ movie });
});

export const updateMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!movie) throw ApiError.notFound('Movie not found.');
  await logActivity(req.user, `Updated movie ${movie.title}`);
  res.json({ movie });
});

export const deleteMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) throw ApiError.notFound('Movie not found.');
  const hasShows = await Show.exists({ movie: movie._id });
  if (hasShows) throw ApiError.conflict("Delete this movie's shows first.");
  await movie.deleteOne();
  await logActivity(req.user, `Deleted movie ${movie.title}`);
  res.json({ ok: true });
});
