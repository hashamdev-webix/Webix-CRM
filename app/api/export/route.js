export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Lead from '@/models/Lead';
import { buildLeadsFilter } from '@/lib/utils';

export async function GET(req) {
  const { error, session } = await requireAdmin(req);
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams.entries());
    const filter = buildLeadsFilter(params, session.user.role, session.user.id);

    const leads = await Lead.find(filter)
      .sort({ receivedAt: -1 })
      .limit(10000)
      .populate('campaignId', 'name platform')
      .populate('assignedTo', 'name email')
      .lean();

    // Build CSV
    const headers = [
      'Name', 'Email', 'Phone', 'Source', 'Service', 'Status',
      'Campaign', 'Assigned To', 'Notes', 'Received At', 'Created At',
    ];

    const rows = leads.map((l) => [
      l.name,
      l.email,
      l.phone,
      l.source,
      l.service,
      l.status,
      l.campaignId?.name || '',
      l.assignedTo?.name || '',
      `"${(l.notes || '').replace(/"/g, '""')}"`,
      l.receivedAt ? new Date(l.receivedAt).toISOString() : '',
      l.createdAt ? new Date(l.createdAt).toISOString() : '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="leads-${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    console.error('[Export]', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
