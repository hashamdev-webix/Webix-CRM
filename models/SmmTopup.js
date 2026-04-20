import mongoose from 'mongoose';

if (process.env.NODE_ENV === 'development') delete mongoose.models.SmmTopup;

const schema = new mongoose.Schema({
  tool_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tool', required: true },
  topup_date: { type: Date, required: true },
  amount: { type: Number, required: true },
  payment_method: { type: String },
  added_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String },
}, { timestamps: true });

export default mongoose.model('SmmTopup', schema);
