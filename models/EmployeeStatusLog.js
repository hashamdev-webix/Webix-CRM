import mongoose from 'mongoose';

const EmployeeStatusLogSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    previousStatus: { type: String },
    newStatus: { type: String, required: true },
    reason: { type: String, trim: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV === 'development') delete mongoose.models.EmployeeStatusLog;
export default mongoose.models.EmployeeStatusLog || mongoose.model('EmployeeStatusLog', EmployeeStatusLogSchema);
