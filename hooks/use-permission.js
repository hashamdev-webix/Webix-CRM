'use client';

import { useSession } from 'next-auth/react';

/**
 * Returns true if the current user has the given permission key.
 * Admin users (role === 'admin' OR permissions includes '*') always return true.
 */
export function usePermission(permissionKey) {
  const { data: session } = useSession();
  if (!session?.user) return false;
  if (session.user.role === 'admin') return true;
  const perms = session.user.permissions || [];
  return perms.includes('*') || perms.includes(permissionKey);
}

/**
 * Returns true if the current user has ANY of the given permission keys.
 */
export function useAnyPermission(...keys) {
  const { data: session } = useSession();
  if (!session?.user) return false;
  if (session.user.role === 'admin') return true;
  const perms = session.user.permissions || [];
  if (perms.includes('*')) return true;
  return keys.some((k) => perms.includes(k));
}

/**
 * Returns true if the current user is an admin.
 */
export function useIsAdmin() {
  const { data: session } = useSession();
  return session?.user?.role === 'admin';
}
