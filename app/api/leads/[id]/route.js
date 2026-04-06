export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Lead from '@/models/Lead';

export async function GET(req, { params }) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const lead = await Lead.findById(params.id)
      .populate('campaignId', 'name platform service')
      .populate('assignedTo', 'name email')
      .lean();

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    // Sales members can only see their own leads
    if (
      session.user.role === 'sales_member' &&
      lead.assignedTo?._id?.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(lead);
  } catch (err) {
    console.error('[Lead GET]', err);
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();

    const lead = await Lead.findById(params.id);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    // Sales members can only update their own leads, and only status/notes
    if (session.user.role === 'sales_member') {
      if (lead.assignedTo?.toString() !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Restrict fields sales_member can update
      if (body.status !== undefined) lead.status = body.status;
      if (body.notes !== undefined) lead.notes = body.notes;
    } else {
      // Admin can update all fields
      if (body.status !== undefined) lead.status = body.status;
      if (body.notes !== undefined) lead.notes = body.notes;
      if (body.assignedTo !== undefined) lead.assignedTo = body.assignedTo || null;
      if (body.service !== undefined) lead.service = body.service;
      if (body.name !== undefined) lead.name = body.name;
      if (body.email !== undefined) lead.email = body.email;
      if (body.phone !== undefined) lead.phone = body.phone;
    }

    await lead.save();
    const updated = await Lead.findById(params.id)
      .populate('campaignId', 'name platform')
      .populate('assignedTo', 'name email')
      .lean();

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[Lead PATCH]', err);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();
    await Lead.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Lead DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
