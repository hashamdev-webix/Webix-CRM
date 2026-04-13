'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Shield, ChevronRight, Trash2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get('/api/roles')
      .then((r) => setRoles(r.data))
      .catch(() => toast({ title: 'Failed to load roles', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.post('/api/roles', form);
      setRoles((prev) => [res.data, ...prev]);
      setShowCreate(false);
      setForm({ name: '', description: '' });
      toast({ title: 'Role created', variant: 'success' });
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Failed to create role', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    if (!confirm(`Delete role "${role.name}"? This will remove it from all users.`)) return;
    try {
      await axios.delete(`/api/roles/${role._id}`);
      setRoles((prev) => prev.filter((r) => r._id !== role._id));
      toast({ title: 'Role deleted', variant: 'success' });
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Failed to delete role', variant: 'destructive' });
    }
  };

  return (
    <>
      <Header title="Roles & Permissions" subtitle="Manage dynamic RBAC roles" />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{roles.length} role{roles.length !== 1 ? 's' : ''}</p>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Role
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : roles.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No roles yet. Create your first role.</div>
            ) : (
              <div className="divide-y">
                {roles.map((role) => (
                  <div key={role._id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <Shield className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{role.name}</p>
                        {role.isSystem && <Badge variant="secondary" className="text-xs">System</Badge>}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{role.description || 'No description'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {role.permissionKeys?.length || 0} permissions · Created {formatDateTime(role.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/roles/${role._id}`}>
                        <Button variant="outline" size="sm">
                          Edit <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                      {!role.isSystem && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(role)}>
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Role Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label>Role Name</Label>
              <Input
                placeholder="e.g. Sales Manager"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                placeholder="What this role can do..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Role'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
