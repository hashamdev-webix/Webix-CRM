export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { syncGoogleLeads, syncGoogleMetrics } from '@/lib/google-ads-api';

export async function POST(req) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'leads';

    const results = {};

    if (type === 'leads' || type === 'all') {
      results.leads = await syncGoogleLeads();
    }
    if (type === 'metrics' || type === 'all') {
      results.metrics = await syncGoogleMetrics();
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error('[Sync Google]', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
