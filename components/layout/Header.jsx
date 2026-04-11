'use client';

import { useSession } from 'next-auth/react';
import { Bell, RefreshCw, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useSidebar } from './SidebarContext';

export default function Header({ title, subtitle }) {
  const { data: session } = useSession();
  const [syncing, setSyncing] = useState(false);
  const { toggle } = useSidebar();

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
    <header className="h-14 md:h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger - mobile only */}
        <button
          onClick={toggle}
          className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h2 className="font-semibold text-gray-900 text-sm md:text-base">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {session?.user?.role === 'admin' && (
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="hidden sm:flex">
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        )}
        {/* Sync icon only on mobile for admin */}
        {session?.user?.role === 'admin' && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="sm:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="Sync"
          >
            <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        )}
        <div className="relative">
          <Bell className="h-5 w-5 text-gray-500" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">
            {session?.user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
