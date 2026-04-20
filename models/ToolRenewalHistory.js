import mongoose from 'mongoose';

if (process.env.NODE_ENV === 'development') delete mongoose.models.ToolRenewalHistory;

const schema = new mongoose.Schema({
  tool_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tool', required: true },
  renewal_number: { type: Number, required: true },
  purchase_date: { type: Date, required: true },
  expiry_date: { type: Date, required: true },
  amount_paid: { type: Number, required: true },
  plan_duration_days: { type: Number, required: true },
  renewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('ToolRenewalHistory', schema);
