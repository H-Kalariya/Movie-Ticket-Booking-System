import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { User } from '../models/User.js';
import { can } from '../constants/roles.js';

// Verifies the bearer token and attaches req.user. Throws 401 if missing/invalid.
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Session expired. Please log in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('Account not found.');

  req.user = user;
  next();
});

// Optional auth: attaches req.user when a valid token is present, but never fails.
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = await User.findById(payload.sub);
    } catch {
      /* ignore invalid tokens on public routes */
    }
  }
  next();
});

// Restrict a route to specific roles.
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};

// Restrict a route by capability (preferred over raw role checks).
export const requireCapability = (capability) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!can(req.user.role, capability)) return next(ApiError.forbidden());
  next();
};
