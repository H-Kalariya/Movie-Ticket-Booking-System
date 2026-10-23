import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorEmail: { type: String, default: '' },
    actorRole: { type: String, default: '' },
    action: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ createdAt: -1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export async function logActivity(actor, action) {
  try {
    await ActivityLog.create({
      actor: actor?._id || actor?.id || null,
      actorEmail: actor?.email || '',
      actorRole: actor?.role || '',
      action,
    });
  } catch (e) {
    // Logging must never break the main flow.
    console.error('[activity] failed to log:', e.message);
  }
}
