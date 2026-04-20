import mongoose from 'mongoose';

if (process.env.NODE_ENV === 'development') delete mongoose.models.ToolCategory;

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 30 },
  color: { type: String, default: '#6366f1' },
  is_active: { type: Boolean, default: true },
  is_smm_type: { type: Boolean, default: false }, // marks SMM Panels category
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('ToolCategory', schema);
