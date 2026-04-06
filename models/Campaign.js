import mongoose from 'mongoose';

const CampaignSchema = new mongoose.Schema(
  {
    platformCampaignId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    platform: { type: String, enum: ['meta', 'google'], required: true },
    service: {
      type: String,
      enum: ['Digital Marketing', 'Graphic Designing', 'Web Development'],
      default: 'Digital Marketing',
    },
    status: { type: String, enum: ['active', 'paused', 'ended'], default: 'active' },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
);

CampaignSchema.index({ platform: 1 });
CampaignSchema.index({ status: 1 });
// platformCampaignId unique:true above already creates its index — no schema.index() needed

export default mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
