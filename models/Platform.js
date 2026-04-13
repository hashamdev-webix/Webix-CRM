import mongoose from 'mongoose';

const PlatformSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['social', 'dataentry'], required: true },
    icon_slug: { type: String, default: '' }, // e.g. 'facebook', 'instagram'
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

PlatformSchema.index({ type: 1, is_active: 1 });

export default mongoose.models.Platform || mongoose.model('Platform', PlatformSchema);
