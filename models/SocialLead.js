import mongoose from 'mongoose';

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.SocialLead;
}

const STATUSES = ['new', 'active', 'in_progress', 'not_interested', 'won', 'closed'];
const LOCK_ON = ['active', 'in_progress', 'won'];

const SocialLeadSchema = new mongoose.Schema(
  {
    platform_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', required: true, index: true },
    social_account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SocialIdAccount', required: true },
    target_niche_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TargetNiche', index: true },
    customer_id_url: { type: String, required: true, trim: true, index: true },
    // assigned_to: the person the admin formally assigned the lead to
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    // owner_user_id: set when lead first goes to 'active' (first-claim lock)
    owner_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, enum: STATUSES, default: 'new', index: true },
    locked_at: { type: Date, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null, index: true },
  },
  { timestamps: true }
);

SocialLeadSchema.index({ status: 1, owner_user_id: 1 });
SocialLeadSchema.index({ createdAt: -1 });
SocialLeadSchema.index({ platform_id: 1, status: 1 });

SocialLeadSchema.statics.LOCK_ON_STATUSES = LOCK_ON;
SocialLeadSchema.statics.ALL_STATUSES = STATUSES;

export default mongoose.models.SocialLead || mongoose.model('SocialLead', SocialLeadSchema);
