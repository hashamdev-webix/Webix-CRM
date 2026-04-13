import mongoose from 'mongoose';

const TargetNicheSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.TargetNiche || mongoose.model('TargetNiche', TargetNicheSchema);
