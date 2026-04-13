'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const TABS = [
  { id: 'companies', label: 'Companies' },
  { id: 'platforms', label: 'Platforms' },
  { id: 'social_accounts', label: 'Social ID Accounts' },
  { id: 'niches', label: 'Target Niches' },
  { id: 'email_accounts', label: 'Email Accounts' },
  { id: 'phones', label: 'Phone Options' },
  { id: 'call_scripts', label: 'Call Scripts' },
];

function EntityTable({ entity, items, onToggle, onDelete, onEdit }) {
  if (items.length === 0) return <p className="text-sm text-gray-400 text-center py-8">No items yet.</p>;

  return (
    <div className="divide-y">
      {items.map((item) => (
        <div key={item._id} className="flex items-center gap-3 py-3 px-1">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {item.name || item.label || item.account_name || item.title || item.business_name}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {item.type && <span className="capitalize mr-2">{item.type}</span>}
              {item.email_address && item.email_address}
              {item.number && item.number}
              {item.platform_id?.name && `Platform: ${item.platform_id.name}`}
            </p>
          </div>
          <Badge variant={item.is_active ? 'success' : 'outline'} className="text-xs shrink-0">
            {item.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onToggle(item)}>
              {item.is_active
                ? <ToggleRight className="h-4 w-4 text-green-500" />
                : <ToggleLeft className="h-4 w-4 text-gray-400" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
              <Edit2 className="h-4 w-4 text-gray-500" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(item)}>
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EntityForm({ entity, platforms, item, onSave, onCancel }) {
  const isEdit = !!item;
  const [form, setForm] = useState(item ? { ...item, smtp_pass: '' } : { is_active: true });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await axios.patch(`/api/admin/config/${entity}`, { id: item._id, ...form });
        toast({ title: 'Updated', variant: 'success' });
      } else {
        await axios.post(`/api/admin/config/${entity}`, form);
        toast({ title: 'Created', variant: 'success' });
      }
      onSave();
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {entity === 'companies' && (
        <>
          <div className="space-y-1"><Label>Company Name</Label><Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} required /></div>
          <div className="space-y-1"><Label>Description (optional)</Label><Input value={form.description || ''} onChange={(e) => set('description', e.target.value)} /></div>
        </>
      )}

      {entity === 'platforms' && (
        <>
          <div className="space-y-1"><Label>Name</Label><Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} required /></div>
          <div className="space-y-1"><Label>Type</Label>
            <Select value={form.type || ''} onValueChange={(v) => set('type', v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="dataentry">Data Entry</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Icon Slug (optional)</Label><Input value={form.icon_slug || ''} onChange={(e) => set('icon_slug', e.target.value)} placeholder="e.g. facebook" /></div>
        </>
      )}

      {entity === 'social_accounts' && (
        <>
          <div className="space-y-1"><Label>Platform</Label>
            <Select value={form.platform_id || ''} onValueChange={(v) => set('platform_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
              <SelectContent>
                {platforms.filter((p) => p.type === 'social').map((p) => (
                  <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Account Name</Label><Input value={form.account_name || ''} onChange={(e) => set('account_name', e.target.value)} required /></div>
          <div className="space-y-1"><Label>Account URL (optional)</Label><Input type="url" value={form.account_url || ''} onChange={(e) => set('account_url', e.target.value)} /></div>
        </>
      )}

      {entity === 'niches' && (
        <>
          <div className="space-y-1"><Label>Name</Label><Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} required /></div>
          <div className="space-y-1"><Label>Description (optional)</Label><Input value={form.description || ''} onChange={(e) => set('description', e.target.value)} /></div>
        </>
      )}

      {entity === 'email_accounts' && (
        <>
          <div className="space-y-1"><Label>Label</Label><Input value={form.label || ''} onChange={(e) => set('label', e.target.value)} required /></div>
          <div className="space-y-1"><Label>Email Address</Label><Input type="email" value={form.email_address || ''} onChange={(e) => set('email_address', e.target.value)} required /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label>SMTP Host</Label><Input value={form.smtp_host || ''} onChange={(e) => set('smtp_host', e.target.value)} required /></div>
            <div className="space-y-1"><Label>SMTP Port</Label><Input type="number" value={form.smtp_port || 587} onChange={(e) => set('smtp_port', parseInt(e.target.value))} required /></div>
          </div>
          <div className="space-y-1"><Label>SMTP User</Label><Input value={form.smtp_user || ''} onChange={(e) => set('smtp_user', e.target.value)} required /></div>
          <div className="space-y-1">
            <Label>{isEdit ? 'New Password (leave blank to keep current)' : 'SMTP Password'}</Label>
            <Input type="password" value={form.smtp_pass || ''} onChange={(e) => set('smtp_pass', e.target.value)} required={!isEdit} />
          </div>
        </>
      )}

      {entity === 'phones' && (
        <>
          <div className="space-y-1"><Label>Label</Label><Input value={form.label || ''} onChange={(e) => set('label', e.target.value)} required /></div>
          <div className="space-y-1"><Label>Number</Label><Input value={form.number || ''} onChange={(e) => set('number', e.target.value)} required /></div>
          <div className="space-y-1"><Label>Type</Label>
            <Select value={form.type || ''} onValueChange={(v) => set('type', v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">SIM</SelectItem>
                <SelectItem value="voip">VoIP</SelectItem>
                <SelectItem value="softphone">Softphone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {entity === 'call_scripts' && (
        <>
          <div className="space-y-1"><Label>Title</Label><Input value={form.title || ''} onChange={(e) => set('title', e.target.value)} required /></div>
          <div className="space-y-1"><Label>Platform (optional)</Label>
            <Select value={form.platform_id || ''} onValueChange={(v) => set('platform_id', v)}>
              <SelectTrigger><SelectValue placeholder="Any platform" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                {platforms.map((p) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Script Body</Label>
            <textarea
              className="w-full min-h-[120px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.body_text || ''}
              onChange={(e) => set('body_text', e.target.value)}
              required
            />
          </div>
        </>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}</Button>
      </DialogFooter>
    </form>
  );
}

export default function AdminConfigPage() {
  const [activeTab, setActiveTab] = useState('platforms');
  const [items, setItems] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/admin/config/${activeTab}`);
      setItems(res.data);
    } catch {
      toast({ title: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Load platforms for dropdowns in sub-entities
  useEffect(() => {
    axios.get('/api/admin/config/platforms').then((r) => setPlatforms(r.data)).catch(() => {});
  }, []);

  const handleToggle = async (item) => {
    try {
      await axios.patch(`/api/admin/config/${activeTab}`, { id: item._id, is_active: !item.is_active });
      setItems((prev) => prev.map((i) => i._id === item._id ? { ...i, is_active: !i.is_active } : i));
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleDelete = async (item) => {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    try {
      await axios.delete(`/api/admin/config/${activeTab}?id=${item._id}`);
      setItems((prev) => prev.filter((i) => i._id !== item._id));
      toast({ title: 'Deleted', variant: 'success' });
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditItem(null);
    fetchItems();
  };

  return (
    <>
      <Header title="Admin Configuration" subtitle="Manage master data for platforms, niches, and outreach" />
      <div className="flex-1 overflow-auto p-4 md:p-6">

        {/* Tab bar */}
        <div className="flex gap-1 border-b mb-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">{items.length} items</p>
          <Button size="sm" onClick={() => { setEditItem(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add {TABS.find((t) => t.id === activeTab)?.label}
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <EntityTable
                entity={activeTab}
                items={items}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={(item) => { setEditItem(item); setShowForm(true); }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditItem(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit' : 'Add'} {TABS.find((t) => t.id === activeTab)?.label}</DialogTitle>
          </DialogHeader>
          <EntityForm
            entity={activeTab}
            platforms={platforms}
            item={editItem}
            onSave={handleFormSave}
            onCancel={() => { setShowForm(false); setEditItem(null); }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
