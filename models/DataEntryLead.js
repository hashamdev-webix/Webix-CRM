import mongoose from 'mongoose';

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.DataEntryLead;
}

const STATUSES = ['new', 'active', 'in_progress', 'not_interested', 'won', 'closed'];

const SocialLinkSchema = new mongoose.Schema(
  {
    platform_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform' },
    url: { type: String, trim: true },
  },
  { _id: false }
);

const DataEntryLeadSchema = new mongoose.Schema(
  {
    platform_name: { type: String, trim: true, default: '' },
    business_name: { type: String, required: true, trim: true },
    owner_name: { type: String, trim: true, default: '' },
    business_category: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    phone_number: { type: String, trim: true, default: '' },
    email_address: { type: String, trim: true, lowercase: true, default: '' },
    website: { type: String, trim: true, default: '' },
    num_reviews: { type: Number, default: null },
    social_links: { type: [SocialLinkSchema], default: [] },
    pain_points: { type: String, default: '' },
    observed_on: { type: String, default: '' },
    // Auto-computed: email | phone | both
    contact_type: { type: String, enum: ['email', 'phone', 'both'], required: true, index: true },
    owner_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, enum: STATUSES, default: 'new', index: true },
    locked_at: { type: Date, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null, index: true },
  },
  { timestamps: true }
);

DataEntryLeadSchema.index({ status: 1, contact_type: 1 });
DataEntryLeadSchema.index({ createdAt: -1 });
DataEntryLeadSchema.index({ owner_user_id: 1, status: 1 });

DataEntryLeadSchema.statics.ALL_STATUSES = STATUSES;

DataEntryLeadSchema.index({ status: 1, createdAt: -1 });
DataEntryLeadSchema.index({ contact_type: 1, status: 1 });
DataEntryLeadSchema.index({ created_by: 1, createdAt: -1 });
DataEntryLeadSchema.index({ assigned_to: 1, status: 1 });
DataEntryLeadSchema.index({ company_id: 1, createdAt: -1 });

export default mongoose.models.DataEntryLead || mongoose.model('DataEntryLead', DataEntryLeadSchema);
