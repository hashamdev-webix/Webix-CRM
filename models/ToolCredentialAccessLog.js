import mongoose from 'mongoose';

if (process.env.NODE_ENV === 'development') delete mongoose.models.ToolCredentialAccessLog;

const schema = new mongoose.Schema({
  tool_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tool', required: true },
  viewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['revealed_password'], required: true },
  ip_address: { type: String },
  viewed_at: { type: Date, default: Date.now },
}, { timestamps: false });

export default mongoose.model('ToolCredentialAccessLog', schema);
