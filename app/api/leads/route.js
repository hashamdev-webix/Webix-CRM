export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Lead from '@/models/Lead';
import { buildLeadsFilter, paginate } from '@/lib/utils';

export async function GET(req) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams.entries());

    const filter = buildLeadsFilter(params, session.user.role, session.user.id);
    const { skip, limit } = paginate(params, params.page, params.limit || 20);

    const sortField = params.sortField || 'receivedAt';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate('campaignId', 'name platform service')
        .populate('assignedTo', 'name email')
        .lean(),
      Lead.countDocuments(filter),
    ]);

    return NextResponse.json({
      leads,
      total,
      page: parseInt(params.page || 1),
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[Leads GET]', err);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(req) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();
    const body = await req.json();

    const lead = await Lead.create({
      name: body.name,
      email: body.email,
      phone: body.phone,
      source: body.source || 'manual',
      campaignId: body.campaignId || null,
      service: body.service,
      status: 'new',
      assignedTo: body.assignedTo || null,
      notes: body.notes || '',
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    console.error('[Leads POST]', err);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}
