import { asyncHandler } from '../utils/ApiError.js';
import { logActivity } from '../models/ActivityLog.js';

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, password } = req.body;
  const user = req.user;

  user.name = name;
  user.phone = phone || '';
  if (password) await user.setPassword(password);
  await user.save();

  await logActivity(user, 'Updated profile');
  res.json({ user: user.toSafeJSON() });
});
