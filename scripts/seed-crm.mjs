/**
 * CRM Extension Seed Script
 * Run: node scripts/seed-crm.mjs
 *
 * Seeds:
 *  - Platforms (social + dataentry)
 *  - Target niches
 *  - Sample call script
 *  - Permissions catalog
 *  - Default roles (Salesperson, Sales Manager)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI not set in .env.local');
  process.exit(1);
}

await mongoose.connect(MONGODB_URI);
console.log('✅  Connected to MongoDB');

// ─── Dynamic model imports ────────────────────────────────────────────────────
const platformSchema = new mongoose.Schema({ name: String, type: String, icon_slug: String, is_active: Boolean }, { timestamps: true });
const nicheSchema = new mongoose.Schema({ name: String, description: String, is_active: Boolean }, { timestamps: true });
const callScriptSchema = new mongoose.Schema({ title: String, body_text: String, platform_id: mongoose.Schema.Types.ObjectId, is_active: Boolean, created_by: mongoose.Schema.Types.ObjectId }, { timestamps: true });
const permissionSchema = new mongoose.Schema({ key: String, label: String, module: String }, { timestamps: true });
const roleSchema = new mongoose.Schema({ name: String, description: String, permissionKeys: [String], isSystem: Boolean }, { timestamps: true });

const Platform = mongoose.models.Platform || mongoose.model('Platform', platformSchema);
const TargetNiche = mongoose.models.TargetNiche || mongoose.model('TargetNiche', nicheSchema);
const CallScript = mongoose.models.CallScript || mongoose.model('CallScript', callScriptSchema);
const Permission = mongoose.models.Permission || mongoose.model('Permission', permissionSchema);
const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);

// ─── Platforms ────────────────────────────────────────────────────────────────
const platformsData = [
  { name: 'Facebook', type: 'social', icon_slug: 'facebook', is_active: true },
  { name: 'Instagram', type: 'social', icon_slug: 'instagram', is_active: true },
  { name: 'LinkedIn', type: 'social', icon_slug: 'linkedin', is_active: true },
  { name: 'Twitter/X', type: 'social', icon_slug: 'twitter', is_active: true },
  { name: 'TikTok', type: 'social', icon_slug: 'tiktok', is_active: true },
  { name: 'General', type: 'dataentry', icon_slug: 'database', is_active: true },
];

for (const p of platformsData) {
  const exists = await Platform.findOne({ name: p.name });
  if (!exists) {
    await Platform.create(p);
    console.log(`  ✓ Platform: ${p.name}`);
  } else {
    console.log(`  · Platform already exists: ${p.name}`);
  }
}

// ─── Target Niches ────────────────────────────────────────────────────────────
const nichesData = [
  'Digital Marketing', 'E-commerce', 'Real Estate', 'Health & Wellness',
  'Education', 'Finance', 'Legal', 'Hospitality', 'Construction', 'Retail',
];

for (const name of nichesData) {
  const exists = await TargetNiche.findOne({ name });
  if (!exists) {
    await TargetNiche.create({ name, description: '', is_active: true });
    console.log(`  ✓ Niche: ${name}`);
  } else {
    console.log(`  · Niche already exists: ${name}`);
  }
}

// ─── Sample Call Script ───────────────────────────────────────────────────────
const scriptExists = await CallScript.findOne({ title: 'General Outreach Script' });
if (!scriptExists) {
  await CallScript.create({
    title: 'General Outreach Script',
    body_text: `Hi, this is [Your Name] from Webix Solutions.

I noticed your business [Business Name] and I believe we could help you grow your digital presence.

We specialize in Digital Marketing, Web Development, and Graphic Design.

Would you have 5 minutes to hear how we've helped similar businesses in your area?

If not, when would be a good time to call back?`,
    is_active: true,
  });
  console.log('  ✓ Call Script: General Outreach Script');
}

// ─── Permissions catalog ─────────────────────────────────────────────────────
const PERMISSION_CATALOG = [
  { key: 'roles.manage', label: 'Manage Roles', module: 'admin' },
  { key: 'permissions.manage', label: 'Manage Permissions', module: 'admin' },
  { key: 'leads.social.view', label: 'View Own Social Leads', module: 'leads' },
  { key: 'leads.social.view.all', label: 'View All Social Leads', module: 'leads' },
  { key: 'leads.social.create', label: 'Create Social Leads', module: 'leads' },
  { key: 'leads.social.edit', label: 'Edit Social Leads', module: 'leads' },
  { key: 'leads.social.delete', label: 'Delete Social Leads', module: 'leads' },
  { key: 'leads.dataentry.view', label: 'View Own Data-Entry Leads', module: 'leads' },
  { key: 'leads.dataentry.view.all', label: 'View All Data-Entry Leads', module: 'leads' },
  { key: 'leads.dataentry.create', label: 'Create Data-Entry Leads', module: 'leads' },
  { key: 'leads.dataentry.edit', label: 'Edit Data-Entry Leads', module: 'leads' },
  { key: 'leads.dataentry.delete', label: 'Delete Data-Entry Leads', module: 'leads' },
  { key: 'leads.assign', label: 'Assign Leads to Users', module: 'leads' },
  { key: 'leads.export', label: 'Export Leads to CSV', module: 'leads' },
  { key: 'outreach.email.send', label: 'Send Outreach Emails', module: 'outreach' },
  { key: 'outreach.phone.log', label: 'Log Phone Calls', module: 'outreach' },
  { key: 'admin.config.view', label: 'View Admin Config', module: 'admin' },
  { key: 'admin.config.manage', label: 'Manage Admin Config', module: 'admin' },
  { key: 'reports.view', label: 'View Reports', module: 'reports' },
  { key: 'audit.view', label: 'View Audit Log', module: 'audit' },
];

for (const p of PERMISSION_CATALOG) {
  const exists = await Permission.findOne({ key: p.key });
  if (!exists) {
    await Permission.create(p);
    console.log(`  ✓ Permission: ${p.key}`);
  } else {
    console.log(`  · Permission already exists: ${p.key}`);
  }
}

// ─── Default roles ────────────────────────────────────────────────────────────
const ROLES_DATA = [
  {
    name: 'Salesperson',
    description: 'Can create and manage own leads, log outreach',
    isSystem: true,
    permissionKeys: [
      'leads.social.view', 'leads.social.create', 'leads.social.edit',
      'leads.dataentry.view', 'leads.dataentry.create', 'leads.dataentry.edit',
      'outreach.email.send', 'outreach.phone.log',
    ],
  },
  {
    name: 'Sales Manager',
    description: 'Can view all leads, assign, and export',
    isSystem: true,
    permissionKeys: [
      'leads.social.view', 'leads.social.view.all', 'leads.social.create', 'leads.social.edit',
      'leads.dataentry.view', 'leads.dataentry.view.all', 'leads.dataentry.create', 'leads.dataentry.edit',
      'leads.assign', 'leads.export',
      'outreach.email.send', 'outreach.phone.log',
      'reports.view',
      'admin.config.view',
    ],
  },
];

for (const r of ROLES_DATA) {
  const exists = await Role.findOne({ name: r.name });
  if (!exists) {
    await Role.create(r);
    console.log(`  ✓ Role: ${r.name}`);
  } else {
    console.log(`  · Role already exists: ${r.name}`);
  }
}

// ─── Done ─────────────────────────────────────────────────────────────────────
console.log('\n✅  CRM seed complete!\n');
console.log('Next steps:');
console.log('  1. Add ENCRYPTION_KEY=<64 hex chars> to .env.local');
console.log('  2. npm install nodemailer  (for actual email sending)');
console.log('  3. Visit /admin/config to add Social ID Accounts, Sending Email Accounts, etc.');
console.log('  4. Visit /admin/roles to assign roles to sales team members.');

await mongoose.disconnect();
process.exit(0);
