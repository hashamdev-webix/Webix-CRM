import mongoose from 'mongoose';

const AdMetricSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    spend: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    costPerLead: { type: Number, default: 0 },
    syncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AdMetricSchema.index({ campaignId: 1, date: -1 }, { unique: true });
AdMetricSchema.index({ date: -1 });

export default mongoose.models.AdMetric || mongoose.model('AdMetric', AdMetricSchema);
