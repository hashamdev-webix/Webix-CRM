import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ToolCategory from '@/models/ToolCategory';
import { withPermission } from '@/lib/permissions';

const DEFAULTS = [
  { name: 'AI & Automation Tools', color: '#8b5cf6' },
  { name: 'Hosting & Infrastructure', color: '#3b82f6' },
  { name: 'Domain Management', color: '#06b6d4' },
  { name: 'SEO Tools', color: '#10b981' },
  { name: 'Design & Creative', color: '#f59e0b' },
  { name: 'Video & Media', color: '#ef4444' },
  { name: 'Social Media Management', color: '#ec4899' },
  { name: 'SMM Panels & Ad Accounts', color: '#f97316', is_smm_type: true },
  { name: 'Email & Communication', color: '#6366f1' },
  { name: 'Project Management', color: '#14b8a6' },
  { name: 'Development Tools', color: '#64748b' },
  { name: 'CRM & Sales Tools', color: '#dc2626' },
  { name: 'Analytics & Reporting', color: '#0ea5e9' },
  { name: 'Security & VPN', color: '#78716c' },
  { name: 'Client Delivery Tools', color: '#a855f7' },
  { name: 'Other / Miscellaneous', color: '#9ca3af' },
];

export const GET = withPermission('hr.view', async (req, _ctx, session) => {
  await connectDB();
  const count = await ToolCategory.countDocuments({ company_id: session.user.company_id });
  if (count === 0) {
    await ToolCategory.insertMany(
      DEFAULTS.map((d) => ({ ...d, company_id: session.user.company_id, created_by: session.user.id }))
    );
  }
  const cats = await ToolCategory.find({ is_active: true }).sort({ name: 1 }).lean();
  return NextResponse.json(cats);
});

export const POST = withPermission('hr.view', async (req, _ctx, session) => {
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  await connectDB();
  const { name, color } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const cat = await ToolCategory.create({ name: name.trim(), color: color || '#6366f1', company_id: session.user.company_id, created_by: session.user.id });
  return NextResponse.json(cat, { status: 201 });
});
