'use client';

import { usePermission } from '@/hooks/use-permission';

/**
 * Renders children only when the current user has the given permission.
 * Renders `fallback` (default null) otherwise.
 *
 * Usage:
 *   <PermissionGate permission="leads.social.create">
 *     <CreateLeadButton />
 *   </PermissionGate>
 */
export default function PermissionGate({ permission, fallback = null, children }) {
  const allowed = usePermission(permission);
  if (!allowed) return fallback;
  return children;
}
