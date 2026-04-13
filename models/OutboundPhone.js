import mongoose from 'mongoose';

const OutboundPhoneSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    number: { type: String, required: true, trim: true },
    type: { type: String, enum: ['sim', 'voip', 'softphone'], required: true },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.OutboundPhone || mongoose.model('OutboundPhone', OutboundPhoneSchema);
