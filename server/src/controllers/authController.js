import { asyncHandler, ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens.js';
import { logActivity } from '../models/ActivityLog.js';

const LOCK_THRESHOLD = 5;
const LOCK_MS = 30_000;

function authPayload(user) {
  return {
    user: user.toSafeJSON(),
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  const exists = await User.findOne({ email });
  if (exists) throw ApiError.conflict('An account with this email already exists.');

  const user = new User({ name, email, phone: phone || '', role });
  await user.setPassword(password);
  await user.save();

  await logActivity(user, `Registered as ${role}`);
  res.status(201).json(authPayload(user));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash +failedLogins +lockUntil');
  if (!user) throw ApiError.unauthorized('Email or password is incorrect.');

  if (user.lockUntil && user.lockUntil > Date.now()) {
    const secs = Math.ceil((user.lockUntil - Date.now()) / 1000);
    throw ApiError.tooMany(`Too many failed attempts. Try again in ${secs} seconds.`);
  }

  const ok = await user.verifyPassword(password);
  if (!ok) {
    user.failedLogins = (user.failedLogins || 0) + 1;
    if (user.failedLogins >= LOCK_THRESHOLD) {
      user.lockUntil = new Date(Date.now() + LOCK_MS);
      user.failedLogins = 0;
    }
    await user.save();
    throw ApiError.unauthorized('Email or password is incorrect.');
  }

  user.failedLogins = 0;
  user.lockUntil = null;
  await user.save();

  res.json(authPayload(user));
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.unauthorized('No refresh token.');

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Session expired. Please log in again.');
  }
  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('Account not found.');

  res.json({ user: user.toSafeJSON(), accessToken: signAccessToken(user) });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});
