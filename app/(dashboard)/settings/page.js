'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { RefreshCw, CheckCircle, Server, Clock } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

// ─── Profile Edit Form ────────────────────────────────────────────────────────
function ProfileEditForm({ session }) {
  const [name, setName] = useState(session?.user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword && newPassword.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = { name };
      if (newPassword) payload.newPassword = newPassword;
      await axios.patch('/api/profile', payload);
      toast({ title: 'Profile updated successfully', variant: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Failed to update profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Full Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input value={session?.user?.email || ''} disabled className="bg-gray-50 text-gray-500" />
          <p className="text-xs text-gray-400">Contact an admin to change your email</p>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Change Password</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>New Password</Label>
            <Input type="password" placeholder="At least 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} />
          </div>
          <div className="space-y-1">
            <Label>Confirm New Password</Label>
            <Input type="password" placeholder="Repeat new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">Leave blank to keep your current password</p>
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save Profile'}
      </Button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
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

        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">My Profile</CardTitle>
                <CardDescription>Update your name and password</CardDescription>
              </div>
              <Badge variant={isAdmin ? 'info' : 'secondary'} className="mt-1">
                {session?.user?.role?.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ProfileEditForm session={session} />
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
