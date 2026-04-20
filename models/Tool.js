import mongoose from 'mongoose';

if (process.env.NODE_ENV === 'development') delete mongoose.models.Tool;

const schema = new mongoose.Schema({
  // Section A — Identity
  name: { type: String, required: true, trim: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ToolCategory', required: true },
  access_url: { type: String, required: true, trim: true },
  license_type: { type: String, enum: ['Individual', 'Team', 'Enterprise', 'Shared', 'Lifetime', 'Other', ''], default: '' },
  seats: { type: Number },
  description: { type: String, trim: true },

  // Section B — Credentials
  login_email: { type: String, required: true, trim: true },
  password_encrypted: { type: String, required: true },
  account_owner: { type: String, trim: true },
  additional_login_notes: { type: String },

  // Section C — Purchase & Billing
  seller_name: { type: String, required: true, trim: true },
  purchase_date: { type: Date, required: true },
  price: { type: Number, required: true },
  billing_cycle: { type: String, required: true, enum: ['Monthly', 'Quarterly', '6-Monthly', 'Annual', 'Lifetime', 'One-time'] },
  plan_name: { type: String, required: true, trim: true },
  plan_duration_days: { type: Number, required: true },
  expiry_date: { type: Date, required: true },
  auto_renewal: { type: Boolean, default: false },

  // Section D — Assignment
  primary_owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Section E — Status & Visibility
  status: { type: String, required: true, enum: ['active', 'expired', 'cancelled', 'paused', 'pending_renewal'], default: 'active' },
  visibility: { type: String, required: true, enum: ['company', 'department', 'admin_hr'], default: 'company' },

  // SMM Panel specific
  is_smm_panel: { type: Boolean, default: false },
  smm_panel_type: { type: String, enum: ['SMM Panel', 'Meta Ad Account', 'Google Ads Account', 'TikTok Ads', 'Other', ''], default: '' },
  smm_current_balance: { type: Number },
  smm_low_balance_threshold: { type: Number },

  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deleted_at: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('Tool', schema);
