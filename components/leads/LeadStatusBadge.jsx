'use client';

import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG = {
  new: { label: 'New', variant: 'secondary' },
  active: { label: 'Active', variant: 'info' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  not_interested: { label: 'Not Interested', variant: 'outline' },
  won: { label: 'Won', variant: 'success' },
  closed: { label: 'Closed', variant: 'destructive' },
};

export default function LeadStatusBadge({ status, className }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: 'secondary' };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

export { STATUS_CONFIG };
