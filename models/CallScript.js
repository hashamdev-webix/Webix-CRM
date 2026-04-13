import mongoose from 'mongoose';

const CallScriptSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body_text: { type: String, required: true },
    platform_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', default: null },
    is_active: { type: Boolean, default: true, index: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.CallScript || mongoose.model('CallScript', CallScriptSchema);
