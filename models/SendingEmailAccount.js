import mongoose from 'mongoose';

const SendingEmailAccountSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    email_address: { type: String, required: true, trim: true, lowercase: true },
    is_active: { type: Boolean, default: true, index: true },
    assigned_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.SendingEmailAccount;
}

export default mongoose.models.SendingEmailAccount ||
  mongoose.model('SendingEmailAccount', SendingEmailAccountSchema);
