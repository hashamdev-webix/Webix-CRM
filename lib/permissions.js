import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

// ─── Permission key catalog ────────────────────────────────────────────────────
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',

  // RBAC management
  ROLES_MANAGE: 'roles.manage',
  PERMISSIONS_MANAGE: 'permissions.manage',

  // Social leads
  LEADS_SOCIAL_VIEW: 'leads.social.view',
  LEADS_SOCIAL_VIEW_ALL: 'leads.social.view.all',
  LEADS_SOCIAL_CREATE: 'leads.social.create',
  LEADS_SOCIAL_EDIT: 'leads.social.edit',
  LEADS_SOCIAL_DELETE: 'leads.social.delete',

  // Data-entry leads
  LEADS_DATAENTRY_VIEW: 'leads.dataentry.view',
  LEADS_DATAENTRY_VIEW_ALL: 'leads.dataentry.view.all',
  LEADS_DATAENTRY_CREATE: 'leads.dataentry.create',
  LEADS_DATAENTRY_EDIT: 'leads.dataentry.edit',
  LEADS_DATAENTRY_DELETE: 'leads.dataentry.delete',

  // Lead actions
  LEADS_ASSIGN: 'leads.assign',
  LEADS_EXPORT: 'leads.export',

  // Outreach
  OUTREACH_EMAIL_SEND: 'outreach.email.send',
  OUTREACH_PHONE_LOG: 'outreach.phone.log',

  // Admin
  ADMIN_CONFIG_VIEW: 'admin.config.view',
  ADMIN_CONFIG_MANAGE: 'admin.config.manage',

  // Reports & audit
  REPORTS_VIEW: 'reports.view',
  AUDIT_VIEW: 'audit.view',

  // HR Module
  HR_VIEW: 'hr.view',
  HR_EMPLOYEES_VIEW: 'hr.employees.view',
  HR_EMPLOYEES_CREATE: 'hr.employees.create',
  HR_EMPLOYEES_EDIT: 'hr.employees.edit',
  HR_EMPLOYEES_DELETE: 'hr.employees.delete',
  HR_EMPLOYEES_FINANCIAL: 'hr.employees.financial',
  HR_EMPLOYEES_DOCUMENTS: 'hr.employees.documents',
  HR_EMPLOYEES_STATUS: 'hr.employees.status',
  HR_EMPLOYEES_EXIT: 'hr.employees.exit',
  HR_DEPARTMENTS_MANAGE: 'hr.departments.manage',
};

// Seeding data — each permission with its label and module
export const PERMISSION_CATALOG = [
  { key: 'dashboard.view', label: 'View Dashboard', module: 'dashboard' },
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
  // HR
  { key: 'hr.view', label: 'View HR Dashboard', module: 'hr' },
  { key: 'hr.employees.view', label: 'View All Employees', module: 'hr' },
  { key: 'hr.employees.create', label: 'Add New Employees', module: 'hr' },
  { key: 'hr.employees.edit', label: 'Edit Employee Info', module: 'hr' },
  { key: 'hr.employees.delete', label: 'Deactivate Employees', module: 'hr' },
  { key: 'hr.employees.financial', label: 'View Employee Financial Details', module: 'hr' },
  { key: 'hr.employees.documents', label: 'Manage Employee Documents', module: 'hr' },
  { key: 'hr.employees.status', label: 'Change Employee Status', module: 'hr' },
  { key: 'hr.employees.exit', label: 'Manage Employee Exit', module: 'hr' },
  { key: 'hr.departments.manage', label: 'Manage Departments', module: 'hr' },
];

// ─── Server-side permission helpers ───────────────────────────────────────────

/**
 * Check if a session user has a given permission.
 * Admin users always pass (wildcard '*').
 */
export function hasPermission(session, permissionKey) {
  if (!session?.user) return false;
  if (session.user.role === 'admin') return true; // admin bypass
  const perms = session.user.permissions || [];
  if (perms.includes('*')) return true; // wildcard bypass
  return perms.includes(permissionKey);
}

/**
 * Higher-order wrapper for Next.js App Router API route handlers.
 *
 * Usage:
 *   export const GET = withPermission('leads.social.view', async (req, ctx, session) => { ... });
 */
export function withPermission(permissionKey, handler) {
  return async (req, ctx) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session, permissionKey)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return handler(req, ctx, session);
  };
}

/**
 * Require authentication only (no specific permission).
 */
export function withAuth(handler) {
  return async (req, ctx) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(req, ctx, session);
  };
}

/**
 * Require admin role specifically.
 */
export function withAdmin(handler) {
  return async (req, ctx) => {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }
    return handler(req, ctx, session);
  };
}
