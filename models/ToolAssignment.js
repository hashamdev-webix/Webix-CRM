import mongoose from 'mongoose';

if (process.env.NODE_ENV === 'development') delete mongoose.models.ToolAssignment;

const schema = new mongoose.Schema({
  tool_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tool', required: true },
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  access_type: { type: String, enum: ['Full Access', 'View Only', 'Limited', 'Admin Access', ''], default: '' },
  access_given_date: { type: Date, required: true },
  access_revoked_date: { type: Date },
  revoked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['active', 'revoked'], default: 'active' },
  notes: { type: String },
  assigned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.index({ tool_id: 1, employee_id: 1 });

export default mongoose.model('ToolAssignment', schema);
