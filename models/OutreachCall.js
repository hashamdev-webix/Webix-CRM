import mongoose from 'mongoose';

const OUTCOMES = [
  'connected', 'no_answer', 'busy', 'wrong_number',
  'interested', 'not_interested', 'follow_up_requested',
];

const OutreachCallSchema = new mongoose.Schema(
  {
    lead_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    lead_type: { type: String, enum: ['social', 'dataentry'], required: true },
    phone_option_id: { type: mongoose.Schema.Types.ObjectId, ref: 'OutboundPhone' },
    script_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CallScript', default: null },
    outcome: { type: String, enum: OUTCOMES, required: true },
    notes: { type: String, default: '' },
    called_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    called_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

OutreachCallSchema.index({ lead_id: 1, lead_type: 1, called_at: -1 });

export default mongoose.models.OutreachCall || mongoose.model('OutreachCall', OutreachCallSchema);
