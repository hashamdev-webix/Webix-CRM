import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    // Array of permission keys (e.g. 'leads.social.create') directly on the role
    permissionKeys: [{ type: String }],
    isSystem: { type: Boolean, default: false }, // system roles cannot be deleted
  },
  { timestamps: true }
);

// name: unique:true above already creates the {name:1} index — no schema.index() needed

export default mongoose.models.Role || mongoose.model('Role', RoleSchema);
