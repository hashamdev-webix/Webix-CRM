import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    // Legacy single-role field kept for backward compatibility (admin | sales_member)
    role: { type: String, enum: ['admin', 'sales_member'], default: 'sales_member' },
    // Dynamic RBAC roles (Phase 1 extension)
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    // Company assignment — one user belongs to one company
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

/**
 * Resolve flattened permission keys for this user.
 * Admin users get wildcard ['*'].
 * Must be called after .populate('roles') on a user document.
 */
UserSchema.methods.resolvePermissions = function () {
  if (this.role === 'admin') return ['*'];
  const keys = new Set();
  for (const r of this.roles || []) {
    for (const key of r.permissionKeys || []) {
      keys.add(key);
    }
  }
  return [...keys];
};

// Delete cached model in dev so schema changes (like adding `roles`) take effect after HMR
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.User;
}
export default mongoose.models.User || mongoose.model('User', UserSchema);
