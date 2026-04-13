import mongoose from 'mongoose';

const OutreachEmailSchema = new mongoose.Schema(
  {
    lead_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    lead_type: { type: String, enum: ['social', 'dataentry'], required: true },
    sending_email_account_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SendingEmailAccount',
      required: false,
      default: null,
    },
    message_body: { type: String, required: true },
    sent_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sent_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

OutreachEmailSchema.index({ lead_id: 1, lead_type: 1, sent_at: -1 });

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.OutreachEmail;
}
export default mongoose.models.OutreachEmail || mongoose.model('OutreachEmail', OutreachEmailSchema);
