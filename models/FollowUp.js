import mongoose from 'mongoose';

const FollowUpSchema = new mongoose.Schema(
  {
    lead_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    lead_type: { type: String, enum: ['social', 'dataentry'], required: true },
    outreach_email_id: { type: mongoose.Schema.Types.ObjectId, ref: 'OutreachEmail', default: null },
    outreach_call_id: { type: mongoose.Schema.Types.ObjectId, ref: 'OutreachCall', default: null },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    due_at: { type: Date, required: true, index: true },
    completed_at: { type: Date, default: null },
  },
  { timestamps: true }
);

FollowUpSchema.index({ assigned_to: 1, due_at: 1, completed_at: 1 });

export default mongoose.models.FollowUp || mongoose.model('FollowUp', FollowUpSchema);
