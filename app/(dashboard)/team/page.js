'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { UserPlus, ToggleLeft, ToggleRight, Trash2, Shield, User } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';

function CreateUserDialog({ open, onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', roleValue: '', company_id: '' });
  const [dbRoles, setDbRoles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      axios.get('/api/roles').then((r) => setDbRoles(r.data)).catch(() => {});
      axios.get('/api/admin/config/companies').then((r) => setCompanies(r.data.filter((c) => c.is_active))).catch(() => {});
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.roleValue) {
      setError('Please select a role');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/users', form);
      onCreate(res.data);
      setForm({ name: '', email: '', password: '', roleValue: '', company_id: '' });
      onClose();
      toast({ title: 'Team member created successfully', variant: 'success' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>Create a new user account for your team</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="john@webixsolutions.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.roleValue} onValueChange={(v) => setForm((f) => ({ ...f, roleValue: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {/* Admin is always first and permanent */}
                <SelectItem value="admin">
                  <span className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-blue-500" />
                    Admin
                  </span>
                </SelectItem>
                {/* Dynamic roles from DB */}
                {dbRoles.map((r) => (
                  <SelectItem key={r._id} value={r._id}>
                    {r.name}
                    {r.description && (
                      <span className="text-xs text-gray-400 ml-1">— {r.description}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Company (optional)</Label>
            <Select value={form.company_id} onValueChange={(v) => setForm((f) => ({ ...f, company_id: v === 'none' ? '' : v }))}>
              <SelectTrigger>
                <SelectValue placeholder="No company assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No company</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-md">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    axios.get('/api/users')
      .then((res) => setUsers(res.data))
      .catch(() => toast({ title: 'Failed to load team', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleActive = async (user) => {
    try {
      const res = await axios.patch(`/api/users/${user._id}`, { isActive: !user.isActive });
      setUsers((prev) => prev.map((u) => (u._id === res.data._id ? res.data : u)));
      toast({
        title: `${res.data.name} ${res.data.isActive ? 'activated' : 'deactivated'}`,
        variant: 'success',
      });
    } catch {
      toast({ title: 'Failed to update user', variant: 'destructive' });
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/users/${user._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      toast({ title: 'User deleted', variant: 'success' });
    } catch {
      toast({ title: 'Failed to delete user', variant: 'destructive' });
    }
  };

  return (
    <>
      <Header title="Team Management" subtitle="Manage your sales team members" />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{users.length} team member{users.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Add Member</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {/* Mobile card list */}
            <div className="md:hidden divide-y">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 space-y-2">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                  </div>
                ))
              ) : users.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400 text-sm">
                  No team members yet. Add your first member.
                </div>
              ) : (
                users.map((user) => (
                  <div key={user._id} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                        {user.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                      <Badge variant={user.isActive ? 'success' : 'outline'} className="text-xs shrink-0">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          {user.role === 'admin'
                            ? <Shield className="h-3.5 w-3.5 text-blue-500" />
                            : <User className="h-3.5 w-3.5 text-gray-400" />
                          }
                          <span className="text-gray-700 text-xs">
                            {user.role === 'admin' ? 'Admin' : (user.roles?.[0]?.name || 'Sales Member')}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{formatDate(user.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(user)}>
                          {user.isActive
                            ? <ToggleRight className="h-4 w-4 text-green-500" />
                            : <ToggleLeft className="h-4 w-4 text-gray-400" />
                          }
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(user)}>
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Member</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Company</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-4">
                            <div className="h-4 bg-gray-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        No team members yet. Add your first member.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                              {user.name[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-xs text-gray-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            {user.role === 'admin'
                              ? <Shield className="h-3.5 w-3.5 text-blue-500" />
                              : <User className="h-3.5 w-3.5 text-gray-400" />
                            }
                            <span className="text-gray-700">
                              {user.role === 'admin' ? 'Admin' : (user.roles?.[0]?.name || 'Sales Member')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-600 text-sm">
                          {user.company_id?.name || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={user.isActive ? 'success' : 'outline'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-gray-500">{formatDate(user.createdAt)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleToggleActive(user)} title={user.isActive ? 'Deactivate' : 'Activate'}>
                              {user.isActive
                                ? <ToggleRight className="h-4 w-4 text-green-500" />
                                : <ToggleLeft className="h-4 w-4 text-gray-400" />
                              }
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(user)} title="Delete user">
                              <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateUserDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={(user) => setUsers((prev) => [user, ...prev])}
      />
    </>
  );
}
