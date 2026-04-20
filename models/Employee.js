import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true, sparse: true }, // WBX-001 auto-generated

    // Optional link to CRM user account
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // ── Personal Information ─────────────────────────────────────────────────
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    fatherName: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
    maritalStatus: { type: String, enum: ['single', 'married', 'divorced', 'widowed'], default: 'single' },
    cnic: { type: String, trim: true },
    nationality: { type: String, trim: true, default: 'Pakistani' },
    religion: { type: String, trim: true },

    // ── Contact Information ──────────────────────────────────────────────────
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    personalEmail: { type: String, trim: true, lowercase: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true, default: 'Pakistan' },
      postalCode: { type: String, trim: true },
    },
    emergencyContact: {
      name: { type: String, trim: true },
      relation: { type: String, trim: true },
      phone: { type: String, trim: true },
    },

    // ── Employment Details ───────────────────────────────────────────────────
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    designation: { type: String, trim: true },
    employmentType: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'intern'],
      default: 'full_time',
    },
    joinDate: { type: Date },
    probationEndDate: { type: Date },
    workLocation: { type: String, enum: ['office', 'remote', 'hybrid'], default: 'office' },
    reportingTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },

    // ── Financial Details (restricted to Admin/HR Manager) ──────────────────
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    accountTitle: { type: String, trim: true },
    salary: { type: Number, default: 0 },
    salaryType: { type: String, enum: ['monthly', 'hourly'], default: 'monthly' },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },

    // ── Status ───────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'on_leave', 'inactive', 'terminated', 'resigned'],
      default: 'active',
    },

    // ── Social Links ─────────────────────────────────────────────────────────
    socialLinks: {
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
      linkedin: { type: String, trim: true },
    },

    // ── Profile Photo ────────────────────────────────────────────────────────
    profilePhoto: {
      fileName: { type: String },
      filePath: { type: String },
      mimeType: { type: String },
    },

    // ── Soft Delete ──────────────────────────────────────────────────────────
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ status: 1 });
EmployeeSchema.index({ isActive: 1 });
EmployeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Auto-generate employeeId before save if not set
EmployeeSchema.pre('save', async function (next) {
  if (this.employeeId) return next();
  try {
    const last = await this.constructor
      .findOne({ employeeId: { $regex: /^WBX-/ } })
      .sort({ createdAt: -1 })
      .lean();
    let nextNum = 1;
    if (last?.employeeId) {
      const num = parseInt(last.employeeId.replace('WBX-', ''), 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    this.employeeId = `WBX-${String(nextNum).padStart(3, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

if (process.env.NODE_ENV === 'development') delete mongoose.models.Employee;
EmployeeSchema.index({ status: 1 });
EmployeeSchema.index({ department: 1, status: 1 });
EmployeeSchema.index({ firstName: 1, lastName: 1 });

export default mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);
