import mongoose from 'mongoose';

// Section A: Exit Initiation | Section B: Clearance Checklist
// Section C (Final Payment Settlement) is EXCLUDED per requirement
const EmployeeExitSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },

    // ── Section A: Exit Initiation ────────────────────────────────────────────
    exitType: { type: String, enum: ['resignation', 'termination', 'retirement', 'contract_end'], required: true },
    exitDate: { type: Date, required: true },
    lastWorkingDay: { type: Date },
    noticePeriodDays: { type: Number, default: 30 },
    noticePeriodWaived: { type: Boolean, default: false },
    exitReason: { type: String, trim: true },
    exitInterviewConducted: { type: Boolean, default: false },
    exitInterviewNotes: { type: String, trim: true },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Section B: Clearance Checklist ───────────────────────────────────────
    clearance: {
      assets: {
        status: { type: String, enum: ['pending', 'cleared', 'na'], default: 'pending' },
        notes: String,
        clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        clearedAt: Date,
      },
      it: {
        status: { type: String, enum: ['pending', 'cleared', 'na'], default: 'pending' },
        notes: String,
        clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        clearedAt: Date,
      },
      finance: {
        status: { type: String, enum: ['pending', 'cleared', 'na'], default: 'pending' },
        notes: String,
        clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        clearedAt: Date,
      },
      hr: {
        status: { type: String, enum: ['pending', 'cleared', 'na'], default: 'pending' },
        notes: String,
        clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        clearedAt: Date,
      },
      admin: {
        status: { type: String, enum: ['pending', 'cleared', 'na'], default: 'pending' },
        notes: String,
        clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        clearedAt: Date,
      },
    },

    overallStatus: {
      type: String,
      enum: ['initiated', 'in_progress', 'cleared', 'completed'],
      default: 'initiated',
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV === 'development') delete mongoose.models.EmployeeExit;
export default mongoose.models.EmployeeExit || mongoose.model('EmployeeExit', EmployeeExitSchema);
