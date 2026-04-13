import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import AuditEvent from '@/models/AuditEvent';
import { withPermission } from '@/lib/permissions';

export const GET = withPermission('audit.view', async (req) => {
  await connectDB();
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '50'));

  const filter = {};
  if (searchParams.get('event_type')) filter.event_type = searchParams.get('event_type');
  if (searchParams.get('entity_type')) filter.entity_type = searchParams.get('entity_type');
  if (searchParams.get('actor')) filter.actor_user_id = searchParams.get('actor');
  if (searchParams.get('startDate') || searchParams.get('endDate')) {
    filter.createdAt = {};
    if (searchParams.get('startDate')) filter.createdAt.$gte = new Date(searchParams.get('startDate'));
    if (searchParams.get('endDate')) filter.createdAt.$lte = new Date(searchParams.get('endDate'));
  }

  const [total, events] = await Promise.all([
    AuditEvent.countDocuments(filter),
    AuditEvent.find(filter)
      .populate('actor_user_id', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);

  return NextResponse.json({ events, total, page, pages: Math.ceil(total / pageSize) });
});
