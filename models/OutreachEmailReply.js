import mongoose from 'mongoose';

const OutreachEmailReplySchema = new mongoose.Schema(
  {
    outreach_email_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OutreachEmail',
      required: true,
      index: true,
    },
    reply_text: { type: String, required: true },
    logged_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    logged_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.OutreachEmailReply ||
  mongoose.model('OutreachEmailReply', OutreachEmailReplySchema);
