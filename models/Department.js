import mongoose from 'mongoose';

const DepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, trim: true, uppercase: true },
    description: { type: String, trim: true },
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV === 'development') delete mongoose.models.Department;
export default mongoose.models.Department || mongoose.model('Department', DepartmentSchema);
