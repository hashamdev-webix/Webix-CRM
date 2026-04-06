export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Campaign from '@/models/Campaign';

export async function GET(req) {
  const { error } = await requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const filter = {};

    if (searchParams.get('platform')) filter.platform = searchParams.get('platform');
    if (searchParams.get('status')) filter.status = searchParams.get('status');

    const campaigns = await Campaign.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json(campaigns);
  } catch (err) {
    console.error('[Campaigns GET]', err);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}
