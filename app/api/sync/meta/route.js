export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { syncMetaLeads, syncMetaMetrics } from '@/lib/meta-api';

// Manual trigger for Meta sync (admin only)
export async function POST(req) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'leads'; // 'leads' | 'metrics' | 'all'

    const results = {};

    if (type === 'leads' || type === 'all') {
      results.leads = await syncMetaLeads();
    }
    if (type === 'metrics' || type === 'all') {
      results.metrics = await syncMetaMetrics();
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error('[Sync Meta]', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
