import mongoose from 'mongoose';

const SyncLogSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['meta', 'meta_metrics', 'google', 'google_metrics'],
    required: true,
  },
  status: { type: String, enum: ['success', 'failed'], required: true },
  message: { type: String },
  timestamp: { type: Date, default: Date.now },
});

SyncLogSchema.index({ timestamp: -1 });
SyncLogSchema.index({ platform: 1, timestamp: -1 });

export default mongoose.models.SyncLog || mongoose.model('SyncLog', SyncLogSchema);
