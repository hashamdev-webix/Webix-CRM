import mongoose from 'mongoose';

// SMTP credentials are encrypted at rest via lib/encrypt.js
const SendingEmailAccountSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    email_address: { type: String, required: true, trim: true, lowercase: true },
    smtp_host: { type: String, required: true },
    smtp_port: { type: Number, required: true, default: 587 },
    smtp_user: { type: String, required: true },
    // AES-256-GCM encrypted: iv:tag:ciphertext (hex-encoded, colon-separated)
    smtp_pass_encrypted: { type: String, required: true, select: false },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.SendingEmailAccount ||
  mongoose.model('SendingEmailAccount', SendingEmailAccountSchema);
