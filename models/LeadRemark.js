import mongoose from 'mongoose';

// Append-only: never update or delete
const LeadRemarkSchema = new mongoose.Schema(
  {
    lead_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    lead_type: { type: String, enum: ['social', 'dataentry'], required: true },
    remark_text: { type: String, required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

LeadRemarkSchema.index({ lead_id: 1, lead_type: 1, createdAt: -1 });

export default mongoose.models.LeadRemark || mongoose.model('LeadRemark', LeadRemarkSchema);
