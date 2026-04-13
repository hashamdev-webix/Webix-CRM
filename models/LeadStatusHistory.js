import mongoose from 'mongoose';

const LeadStatusHistorySchema = new mongoose.Schema(
  {
    lead_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    lead_type: { type: String, enum: ['social', 'dataentry'], required: true },
    previous_status: { type: String },
    new_status: { type: String, required: true },
    changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changed_at: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
  },
  { timestamps: false }
);

LeadStatusHistorySchema.index({ lead_id: 1, lead_type: 1, changed_at: -1 });

export default mongoose.models.LeadStatusHistory ||
  mongoose.model('LeadStatusHistory', LeadStatusHistorySchema);
