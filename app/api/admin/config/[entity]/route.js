import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { withPermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

// Dynamic entity → model mapping
async function getModel(entity) {
  const map = {
    platforms: (await import('@/models/Platform')).default,
    social_accounts: (await import('@/models/SocialIdAccount')).default,
    niches: (await import('@/models/TargetNiche')).default,
    email_accounts: (await import('@/models/SendingEmailAccount')).default,
    phones: (await import('@/models/OutboundPhone')).default,
    call_scripts: (await import('@/models/CallScript')).default,
    companies: (await import('@/models/Company')).default,
  };
  return map[entity] || null;
}

const VALID_ENTITIES = ['platforms', 'social_accounts', 'niches', 'email_accounts', 'phones', 'call_scripts', 'companies'];

// ─── GET list ─────────────────────────────────────────────────────────────────
export const GET = withPermission('admin.config.view', async (req, { params }) => {
  if (!VALID_ENTITIES.includes(params.entity)) {
    return NextResponse.json({ error: 'Unknown entity' }, { status: 404 });
  }
  await connectDB();
  const Model = await getModel(params.entity);

  let query = Model.find().sort({ createdAt: -1 });
  // Populate platform_id for social_accounts and call_scripts
  if (['social_accounts', 'call_scripts'].includes(params.entity)) {
    query = query.populate('platform_id', 'name type');
  }
  const items = await query.lean();
  return NextResponse.json(items);
});

// ─── POST create ──────────────────────────────────────────────────────────────
export const POST = withPermission('admin.config.manage', async (req, { params }, session) => {
  if (!VALID_ENTITIES.includes(params.entity)) {
    return NextResponse.json({ error: 'Unknown entity' }, { status: 404 });
  }
  await connectDB();
  const Model = await getModel(params.entity);
  const body = await req.json();


  // Set created_by if model has it
  if (['social_accounts', 'call_scripts'].includes(params.entity)) {
    body.created_by = session.user.id;
  }

  const item = await Model.create(body);

  await writeAudit({
    event_type: 'config.created',
    entity_type: 'config',
    entity_id: item._id,
    actor_user_id: session.user.id,
    metadata: { entity: params.entity },
  });

  return NextResponse.json(item, { status: 201 });
});

// ─── PATCH update ─────────────────────────────────────────────────────────────
export const PATCH = withPermission('admin.config.manage', async (req, { params }, session) => {
  if (!VALID_ENTITIES.includes(params.entity)) {
    return NextResponse.json({ error: 'Unknown entity' }, { status: 404 });
  }
  await connectDB();
  const Model = await getModel(params.entity);
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });


  const item = await Model.findByIdAndUpdate(id, { $set: updates }, { new: true });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await writeAudit({
    event_type: 'config.updated',
    entity_type: 'config',
    entity_id: id,
    actor_user_id: session.user.id,
    metadata: { entity: params.entity },
  });

  return NextResponse.json(item);
});

// ─── DELETE ───────────────────────────────────────────────────────────────────
export const DELETE = withPermission('admin.config.manage', async (req, { params }, session) => {
  if (!VALID_ENTITIES.includes(params.entity)) {
    return NextResponse.json({ error: 'Unknown entity' }, { status: 404 });
  }
  await connectDB();
  const Model = await getModel(params.entity);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  await Model.findByIdAndDelete(id);

  await writeAudit({
    event_type: 'config.deleted',
    entity_type: 'config',
    entity_id: id,
    actor_user_id: session.user.id,
    metadata: { entity: params.entity },
  });

  return NextResponse.json({ success: true });
});
