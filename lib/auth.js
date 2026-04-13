import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export async function getSession(req) {
  return await getServerSession(authOptions);
}

export async function requireAuth(req) {
  const session = await getSession(req);
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), session: null };
  }
  return { error: null, session };
} 

export async function requireAdmin(req) {
  const { error, session } = await requireAuth(req);
  if (error) return { error, session: null };
  if (session.user.role !== 'admin') {
    return {
      error: NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 }),
      session: null,
    };
  }
  return { error: null, session }; 
}

export function sanitizeError(message = 'Internal server error') {
  return NextResponse.json({ error: message }, { status: 500 });
}
  