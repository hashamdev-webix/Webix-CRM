import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SocialLead from '@/models/SocialLead';
import LeadRemark from '@/models/LeadRemark';
import { withPermission } from '@/lib/permissions';

const BLOCK_STATUSES = ['active', 'in_progress', 'won'];

export const GET = withPermission('leads.social.create', async (req) => {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url')?.trim();
  if (!url) return NextResponse.json({ duplicate: false });

  await connectDB();

  // Find the most recent lead with this URL
  const existing = await SocialLead.findOne({ customer_id_url: url })
    .sort({ createdAt: -1 })
    .populate('owner_user_id', 'name')
    .populate('platform_id', 'name')
    .lean();

  if (!existing) return NextResponse.json({ duplicate: false });

  // Fetch last remark
  const lastRemark = await LeadRemark.findOne({ lead_id: existing._id, lead_type: 'social' })
    .sort({ createdAt: -1 })
    .lean();

  const blocked = BLOCK_STATUSES.includes(existing.status);

  return NextResponse.json({
    duplicate: true,
    blocked,
    lead: {
      _id: existing._id,
      status: existing.status,
      owner: existing.owner_user_id?.name || 'Unassigned',
      platform: existing.platform_id?.name,
      createdAt: existing.createdAt,
      last_remark: lastRemark?.remark_text?.substring(0, 100) || null,
    },
    message: blocked
      ? `This lead is already being handled by ${existing.owner_user_id?.name || 'a team member'} (Status: ${existing.status}). You cannot create a duplicate.`
      : `A previous record exists with status "${existing.status}". A new lead will be created.`,
  });
});
