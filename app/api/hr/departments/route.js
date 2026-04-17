export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { withPermission, withAuth } from '@/lib/permissions';
import Department from '@/models/Department';
import Employee from '@/models/Employee';

// GET — list all active departments (any authenticated user can read)
export const GET = withAuth(async (req) => {
  await connectDB();
  // Ensure Employee model is loaded for populate
  await import('@/models/Employee');
  const departments = await Department.find({ isActive: true })
    .populate('head', 'firstName lastName employeeId')
    .sort({ name: 1 })
    .lean();
  return NextResponse.json(departments);
});

// POST — create department
export const POST = withPermission('hr.departments.manage', async (req) => {
  await connectDB();
  const body = await req.json();
  const { name, code, description } = body;
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const dept = await Department.create({ name, code, description });
  return NextResponse.json(dept, { status: 201 });
});

// PATCH — update department
export const PATCH = withPermission('hr.departments.manage', async (req) => {
  await connectDB();
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const dept = await Department.findByIdAndUpdate(id, { $set: updates }, { new: true });
  if (!dept) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(dept);
});

// DELETE — soft delete
export const DELETE = withPermission('hr.departments.manage', async (req) => {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await Department.findByIdAndUpdate(id, { isActive: false });
  return NextResponse.json({ success: true });
});
