import { asyncHandler } from '../utils/ApiError.js';
import { ActivityLog } from '../models/ActivityLog.js';

// Admin: recent activity log.
export const listLogs = asyncHandler(async (_req, res) => {
  const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({
    logs: logs.map((l) => ({
      at: l.createdAt,
      by: l.actorEmail || 'system',
      role: l.actorRole || '',
      action: l.action,
    })),
  });
});
