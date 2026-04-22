import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Client;
}

const CLIENT_STATUSES = ['active', 'on_hold', 'under_review', 'trial', 'completed', 'churned', 'potential_upsell'];

const ClientSchema = new mongoose.Schema(
  {
    // Section A — Identity & Contact
    brand_name:          { type: String, required: true, trim: true },
    client_type:         { type: String, enum: ['Business', 'Individual', 'Startup', 'Enterprise', 'NGO'], required: true },
    industry:            { type: String, required: true, trim: true },
    contact_name:        { type: String, required: true, trim: true },
    contact_designation: { type: String, trim: true, default: '' },
    phone:               { type: String, required: true, trim: true },
    alt_phone:           { type: String, trim: true, default: '' },
    email:               { type: String, lowercase: true, trim: true, default: '' },
    location:            { type: String, trim: true, default: '' },
    website:             { type: String, trim: true, default: '' },

    // Section B — Acquisition
    lead_source:        { type: String, required: true },
    lead_source_detail: { type: String, default: '' },
    referred_by:        { type: String, default: '' },
    sales_person_id:    { type: ObjectId, ref: 'User', required: true },
    original_lead_date: { type: Date, default: null },
    conversion_date:    { type: Date, required: true },
    how_client_found_us:{ type: String, default: '' },
    lead_id:            { type: ObjectId, default: null },

    // Section C — Project & Services
    services:           { type: [String], default: [] },
    project_title:      { type: String, trim: true, default: '' },
    project_description:{ type: String, default: '' },
    project_type:       { type: String, enum: ['One-time Project', 'Monthly Retainer', 'Quarterly', 'Annual Contract', ''], default: '' },
    contract_start_date:{ type: Date, default: null },
    contract_end_date:  { type: Date, default: null },
    delivery_date:      { type: Date, default: null },
    timeline_notes:     { type: String, default: '' },
    priority:           { type: String, enum: ['High', 'Normal', 'Low', ''], default: 'Normal' },
    project_status:     { type: String, enum: ['Planning', 'Active', 'On Hold', 'Under Review', 'Completed', 'Cancelled', ''], default: 'Planning' },
    internal_notes:     { type: String, default: '' },

    // Section D — Team Assignment
    departments_involved: [{ type: ObjectId, ref: 'Department' }],
    pm_employee_id:       { type: ObjectId, ref: 'Employee', default: null },
    account_manager_id:   { type: ObjectId, ref: 'Employee', default: null },
    team_members:         [{ type: ObjectId, ref: 'Employee' }],

    // Section E — Financials (restricted)
    contract_value:  { type: Number, default: null },
    currency:        { type: String, enum: ['PKR', 'USD', 'EUR', 'GBP'], default: 'PKR' },
    monthly_retainer:{ type: Number, default: null },
    payment_terms:   { type: String, enum: ['Monthly', 'Milestone-based', 'Upfront', '50-50', 'Custom', ''], default: '' },
    advance_paid:    { type: Number, default: null },
    advance_date:    { type: Date, default: null },

    // Section G — Social & Ad Links
    social_links: {
      facebook:            { type: String, default: '' },
      instagram:           { type: String, default: '' },
      google_business:     { type: String, default: '' },
      meta_ad_account_id:  { type: String, default: '' },
      google_ads_account_id:{ type: String, default: '' },
      website_campaign:    { type: String, default: '' },
      other_links:         { type: String, default: '' },
    },

    // Status & Meta
    status:     { type: String, enum: CLIENT_STATUSES, default: 'active', index: true },
    company_id: { type: ObjectId, ref: 'Company', default: null },
    created_by: { type: ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ClientSchema.index({ brand_name: 'text', contact_name: 'text', email: 'text' });
ClientSchema.index({ status: 1, createdAt: -1 });
ClientSchema.index({ sales_person_id: 1 });
ClientSchema.index({ company_id: 1, createdAt: -1 });
ClientSchema.index({ conversion_date: -1 });

ClientSchema.statics.ALL_STATUSES = CLIENT_STATUSES;

export default mongoose.models.Client || mongoose.model('Client', ClientSchema);
