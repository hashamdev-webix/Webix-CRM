'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { RefreshCw, CheckCircle, XCircle, Server, Database, Clock } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

function SyncCard({ title, platform, type, color, icon: Icon }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);
    try {
      const endpoint = platform === 'meta' ? '/api/sync/meta' : '/api/sync/google';
      const res = await axios.post(`${endpoint}?type=${type}`);
      setResult({ success: true, data: res.data.results });
      toast({ title: `${title} sync complete`, variant: 'success' });
    } catch (err) {
      setResult({ success: false, error: err.response?.data?.error || 'Sync failed' });
      toast({ title: `${title} sync failed`, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 p-4 rounded-lg border bg-gray-50">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="font-medium text-sm text-gray-900">{title}</p>
          {result && (
            <p className={`text-xs mt-0.5 ${result.success ? 'text-green-600' : 'text-red-500'}`}>
              {result.success
                ? `Success — ${result.data?.leads?.newLeads ?? result.data?.metrics?.rows ?? 0} records`
                : result.error}
            </p>
          )}
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={handleSync} disabled={loading}>
        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Syncing...' : 'Sync Now'}
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  const cronSchedule = [
    { label: 'Meta Lead Sync', schedule: 'Every 10 minutes', platform: 'Meta' },
    { label: 'Google Lead Sync', schedule: 'Every 10 minutes', platform: 'Google' },
    { label: 'Meta Metrics Sync', schedule: 'Every 15 minutes', platform: 'Meta' },
    { label: 'Google Metrics Sync', schedule: 'Every 15 minutes', platform: 'Google' },
  ];

  return (
    <>
      <Header title="Settings" subtitle="Application configuration and sync management" />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4 md:space-y-6">

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Name</p>
                <p className="font-medium text-sm mt-1">{session?.user?.name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium text-sm mt-1">{session?.user?.email}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Role</p>
                <Badge variant={isAdmin ? 'info' : 'secondary'} className="mt-1">
                  {session?.user?.role?.replace('_', ' ')}
                </Badge>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Session Expires</p>
                <p className="font-medium text-sm mt-1">24 hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Sync (Admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manual Data Sync</CardTitle>
              <CardDescription>
                Trigger a sync manually in addition to the automatic cron schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <SyncCard
                title="Sync Meta Leads"
                platform="meta"
                type="leads"
                color="bg-blue-100 text-blue-600"
                icon={RefreshCw}
              />
              <SyncCard
                title="Sync Meta Ad Metrics"
                platform="meta"
                type="metrics"
                color="bg-blue-100 text-blue-600"
                icon={Server}
              />
              <SyncCard
                title="Sync Google Leads"
                platform="google"
                type="leads"
                color="bg-red-100 text-red-600"
                icon={RefreshCw}
              />
              <SyncCard
                title="Sync Google Ad Metrics"
                platform="google"
                type="metrics"
                color="bg-red-100 text-red-600"
                icon={Server}
              />
            </CardContent>
          </Card>
        )}

        {/* Cron Schedule */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Automatic Sync Schedule</CardTitle>
              <CardDescription>
                Cron jobs run automatically on the server. Leads appear within 15 minutes of submission.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cronSchedule.map((job, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{job.label}</span>
                      <Badge variant={job.platform === 'Meta' ? 'purple' : 'destructive'} className="text-xs">
                        {job.platform}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{job.schedule}</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Info */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Framework', value: 'Next.js 14 (App Router)' },
                  { label: 'Database', value: 'MongoDB + Mongoose' },
                  { label: 'Auth', value: 'NextAuth.js (JWT)' },
                  { label: 'Meta API', value: process.env.NEXT_PUBLIC_META_CONFIGURED ? 'Configured' : 'Check .env' },
                  { label: 'Google API', value: 'Check .env' },
                  { label: 'Environment', value: process.env.NODE_ENV || 'development' },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-sm font-medium mt-1">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
