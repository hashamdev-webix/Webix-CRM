'use client';

import { useSession } from 'next-auth/react';
import { Bell, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

export default function Header({ title, subtitle }) {
  const { data: session } = useSession();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await Promise.all([
        axios.post('/api/sync/meta?type=all'),
        axios.post('/api/sync/google?type=all'),
      ]);
      toast({ title: 'Sync complete', description: 'Data synced from Meta and Google Ads.', variant: 'success' });
    } catch {
      toast({ title: 'Sync failed', description: 'Could not sync all platforms.', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {session?.user?.role === 'admin' && (
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        )}
        <div className="relative">
          <Bell className="h-5 w-5 text-gray-500" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
            {session?.user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
