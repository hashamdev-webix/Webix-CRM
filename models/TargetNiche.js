import mongoose from 'mongoose';

const TargetNicheSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    is_active: { type: Boolean, default: true, index: true },
    assigned_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

if (process.env.NODE_ENV === 'development') delete mongoose.models.TargetNiche;
export default mongoose.models.TargetNiche || mongoose.model('TargetNiche', TargetNicheSchema);
