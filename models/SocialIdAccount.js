import mongoose from 'mongoose';

const SocialIdAccountSchema = new mongoose.Schema(
  {
    platform_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', required: true, index: true },
    account_name: { type: String, required: true, trim: true },
    account_url: { type: String, trim: true },
    is_active: { type: Boolean, default: true, index: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

SocialIdAccountSchema.index({ platform_id: 1, is_active: 1 });

export default mongoose.models.SocialIdAccount || mongoose.model('SocialIdAccount', SocialIdAccountSchema);
