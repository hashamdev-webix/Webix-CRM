'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save, X } from 'lucide-react';
import Link from 'next/link';

// Group permissions by module
function groupByModule(catalog) {
  return catalog.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});
}

export default function RoleDetailPage() {
  const { id } = useParams();
  const [role, setRole] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [checkedKeys, setCheckedKeys] = useState(new Set());
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`/api/roles/${id}`),
      axios.get(`/api/roles/${id}/permissions`),
    ]).then(([roleRes, permRes]) => {
      setRole(roleRes.data);
      setUsers(roleRes.data.users || []);
      setCatalog(permRes.data.catalog || []);
      setCheckedKeys(new Set(permRes.data.rolePermissions || []));
    }).catch(() => toast({ title: 'Failed to load role', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleKey = (key) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      await axios.put(`/api/roles/${id}/permissions`, { permissionKeys: [...checkedKeys] });
      toast({ title: 'Permissions saved', variant: 'success' });
    } catch {
      toast({ title: 'Failed to save permissions', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveUser = async (userId) => {
    try {
      await axios.delete(`/api/users/${userId}/roles/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      toast({ title: 'Role removed from user', variant: 'success' });
    } catch {
      toast({ title: 'Failed to remove role', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400">Loading...</div>;
  if (!role) return <div className="flex-1 flex items-center justify-center text-gray-400">Role not found</div>;

  const grouped = groupByModule(catalog);

  return (
    <>
      <Header title={`Role: ${role.name}`} subtitle={role.description || 'No description'} />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">

        <Link href="/admin/roles">
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Roles
          </Button>
        </Link>

        {/* Permission Matrix */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Permissions</CardTitle>
              <Button size="sm" onClick={handleSavePermissions} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Permissions'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(grouped).map(([module, perms]) => (
              <div key={module}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 capitalize">
                  {module}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {perms.map((p) => (
                    <label key={p.key} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-red-600"
                        checked={checkedKeys.has(p.key)}
                        onChange={() => toggleKey(p.key)}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{p.label}</p>
                        <p className="text-xs text-gray-400 font-mono">{p.key}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Users with this role */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Users with this Role ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-sm text-gray-400">No users have been assigned this role yet.</p>
            ) : (
              <div className="divide-y">
                {users.map((u) => (
                  <div key={u._id} className="flex items-center gap-3 py-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {u.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                    <Badge variant={u.isActive ? 'success' : 'outline'} className="text-xs">
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveUser(u._id)}>
                      <X className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
