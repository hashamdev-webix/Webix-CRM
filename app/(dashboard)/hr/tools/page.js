'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  Plus, X, Eye, EyeOff, Pencil, Trash2, RefreshCw, ChevronRight,
  Wrench, ExternalLink, AlertTriangle, CheckCircle, Clock, XCircle,
  PauseCircle, Search, UserPlus, Shield, DollarSign, CalendarClock,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500', icon: XCircle },
  paused: { label: 'Paused', color: 'bg-amber-100 text-amber-700', icon: PauseCircle },
  pending_renewal: { label: 'Pending Renewal', color: 'bg-orange-100 text-orange-700', icon: Clock },
};
const STATUS_LIST = Object.keys(STATUS_CONFIG);
const LICENSE_TYPES = ['Individual', 'Team', 'Enterprise', 'Shared', 'Lifetime', 'Other'];
const BILLING_CYCLES = ['Monthly', 'Quarterly', '6-Monthly', 'Annual', 'Lifetime', 'One-time'];
const ACCESS_TYPES = ['Full Access', 'View Only', 'Limited', 'Admin Access'];
const VISIBILITY_OPTIONS = [
  { value: 'company', label: 'Company-wide' },
  { value: 'department', label: 'Department-specific' },
  { value: 'admin_hr', label: 'Admin/HR Only' },
];

function getExpiryStyle(daysLeft, status) {
  if (status !== 'active') return 'text-gray-400';
  if (daysLeft <= 0) return 'text-gray-400 line-through';
  if (daysLeft <= 7) return 'text-red-600 font-semibold';
  if (daysLeft <= 30) return 'text-amber-500 font-medium';
  return 'text-gray-600';
}

function getRowBg(daysLeft, status) {
  if (status !== 'active') return '';
  if (daysLeft <= 7) return 'bg-red-50/40';
  if (daysLeft <= 30) return 'bg-amber-50/30';
  return '';
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

function AvatarChips({ assignees }) {
  const show = assignees.slice(0, 4);
  const rest = assignees.length - 4;
  return (
    <div className="flex items-center gap-0.5">
      {show.map((a, i) => (
        <div key={i} title={a.name} className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 border-2 border-white -ml-1 first:ml-0">
          {a.name?.charAt(0).toUpperCase()}
        </div>
      ))}
      {rest > 0 && <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white border-2 border-white -ml-1">+{rest}</div>}
    </div>
  );
}

// ─── Add/Edit Tool Form ───────────────────────────────────────────────────────
function ToolForm({ categories, users, onSuccess, onClose, editTool = null }) {
  const emptyForm = {
    name: '', category_id: '', access_url: '', license_type: '', seats: '', description: '',
    login_email: '', password: '', account_owner: '', additional_login_notes: '',
    seller_name: '', purchase_date: '', price: '', billing_cycle: 'Monthly', plan_name: '',
    plan_duration_days: '', expiry_date: '', auto_renewal: false,
    primary_owner: '', status: 'active', visibility: 'company',
    is_smm_panel: false, smm_panel_type: '', smm_current_balance: '', smm_low_balance_threshold: '',
  };
  const [form, setForm] = useState(editTool ? {
    ...emptyForm, ...editTool,
    category_id: editTool.category_id?._id || editTool.category_id || '',
    primary_owner: editTool.primary_owner?._id || editTool.primary_owner || '',
    purchase_date: editTool.purchase_date ? new Date(editTool.purchase_date).toISOString().split('T')[0] : '',
    expiry_date: editTool.expiry_date ? new Date(editTool.expiry_date).toISOString().split('T')[0] : '',
    password: '',
  } : emptyForm);
  const [assignments, setAssignments] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDD, setShowUserDD] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-calc expiry
  useEffect(() => {
    if (form.purchase_date && form.plan_duration_days && !editTool) {
      const d = new Date(form.purchase_date);
      d.setDate(d.getDate() + parseInt(form.plan_duration_days) || 0);
      set('expiry_date', d.toISOString().split('T')[0]);
    }
  }, [form.purchase_date, form.plan_duration_days]);

  // Auto-fill account_owner from primary_owner
  useEffect(() => {
    if (form.primary_owner && !form.account_owner) {
      const u = users.find(u => u._id === form.primary_owner);
      if (u) set('account_owner', u.name);
    }
  }, [form.primary_owner]);

  const selectedCat = categories.find(c => c._id === form.category_id);
  const isSmmCat = selectedCat?.is_smm_type;

  useEffect(() => { if (isSmmCat) set('is_smm_panel', true); }, [isSmmCat]);

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) &&
    !assignments.find(a => a.employee_id === u._id)
  );

  const addAssignee = (u) => {
    setAssignments(prev => [...prev, { employee_id: u._id, name: u.name, access_type: '', access_given_date: new Date().toISOString().split('T')[0] }]);
    setUserSearch(''); setShowUserDD(false);
  };

  const removeAssignee = (id) => setAssignments(prev => prev.filter(a => a.employee_id !== id));
  const setAssigneeField = (id, k, v) => setAssignments(prev => prev.map(a => a.employee_id === id ? { ...a, [k]: v } : a));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, assigned_users: assignments };
      if (editTool) {
        await axios.patch(`/api/tools/${editTool._id}`, payload);
        toast({ title: 'Tool updated', variant: 'success' });
      } else {
        await axios.post('/api/tools', payload);
        toast({ title: 'Tool added successfully', variant: 'success' });
      }
      onSuccess?.();
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Failed', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const SectionHeader = ({ label, color = 'bg-gray-800' }) => (
    <div className={`${color} text-white text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded`}>{label}</div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <h2 className="font-semibold text-gray-900">{editTool ? 'Edit Tool' : 'Add New Tool'}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 overflow-auto px-6 py-4 space-y-6">

        {/* Section A */}
        <div className="space-y-3">
          <SectionHeader label="A — Tool Identity" color="bg-gray-800" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tool / Software Name <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Canva Pro" required />
            </div>
            <div className="space-y-1">
              <Label>Category <span className="text-red-500">*</span></Label>
              <Select value={form.category_id} onValueChange={v => set('category_id', v)} required>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Access URL <span className="text-red-500">*</span></Label>
              <Input type="url" value={form.access_url} onChange={e => set('access_url', e.target.value)} placeholder="https://..." required />
            </div>
            <div className="space-y-1">
              <Label>License Type</Label>
              <Select value={form.license_type || '_none'} onValueChange={v => set('license_type', v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {LICENSE_TYPES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Number of Seats</Label>
              <Input type="number" min="1" value={form.seats} onChange={e => set('seats', e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Description / Notes</Label>
              <textarea className="w-full min-h-[60px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.description} onChange={e => set('description', e.target.value)} placeholder="What this tool is used for..." />
            </div>
          </div>
        </div>

        {/* Section B */}
        <div className="space-y-3">
          <SectionHeader label="B — Credentials (Secure Vault)" color="bg-red-700" />
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded p-2">Passwords are encrypted using AES-256. Only Admin can reveal them.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Login Email / Username <span className="text-red-500">*</span></Label>
              <Input value={form.login_email} onChange={e => set('login_email', e.target.value)} placeholder="login@example.com" required />
            </div>
            <div className="space-y-1">
              <Label>Password {!editTool && <span className="text-red-500">*</span>}</Label>
              <div className="relative">
                <Input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder={editTool ? 'Leave blank to keep current' : 'Enter password'} required={!editTool} className="pr-10" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPw(p => !p)}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Account Owner / Registered In</Label>
              <Input value={form.account_owner} onChange={e => set('account_owner', e.target.value)} placeholder="CEO / Webix Solutions" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Additional Login Notes</Label>
              <textarea className="w-full min-h-[50px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.additional_login_notes} onChange={e => set('additional_login_notes', e.target.value)} placeholder="e.g. Use VPN before logging in..." />
            </div>
          </div>
        </div>

        {/* Section C */}
        <div className="space-y-3">
          <SectionHeader label="C — Purchase & Billing" color="bg-blue-700" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Seller / Purchased From <span className="text-red-500">*</span></Label>
              <Input value={form.seller_name} onChange={e => set('seller_name', e.target.value)} placeholder="Hostinger.com" required />
            </div>
            <div className="space-y-1">
              <Label>Purchase Date <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Price Paid <span className="text-red-500">*</span></Label>
              <Input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="5000" required />
            </div>
            <div className="space-y-1">
              <Label>Billing Cycle <span className="text-red-500">*</span></Label>
              <Select value={form.billing_cycle} onValueChange={v => set('billing_cycle', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BILLING_CYCLES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Package / Plan Name <span className="text-red-500">*</span></Label>
              <Input value={form.plan_name} onChange={e => set('plan_name', e.target.value)} placeholder="Business Plan" required />
            </div>
            <div className="space-y-1">
              <Label>Duration (Days) <span className="text-red-500">*</span></Label>
              <Input type="number" min="1" value={form.plan_duration_days} onChange={e => set('plan_duration_days', e.target.value)} placeholder="365" required />
            </div>
            <div className="space-y-1">
              <Label>Expiry Date <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} required />
            </div>
            <div className="space-y-1 flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.auto_renewal} onChange={e => set('auto_renewal', e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">Auto-Renewal Enabled</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section D */}
        <div className="space-y-3">
          <SectionHeader label="D — Assignment" color="bg-purple-700" />
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Primary Owner / Responsible <span className="text-red-500">*</span></Label>
              <Select value={form.primary_owner} onValueChange={v => set('primary_owner', v)}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u._id} value={u._id}>{u.name} ({u.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!editTool && (
              <div className="space-y-2">
                <Label>Assign To Employees (Optional)</Label>
                <div className="relative">
                  <Input value={userSearch} onChange={e => { setUserSearch(e.target.value); setShowUserDD(true); }} onFocus={() => setShowUserDD(true)}
                    placeholder="Search employee name..." className="pr-8" />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  {showUserDD && filteredUsers.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                      {filteredUsers.slice(0, 8).map(u => (
                        <button key={u._id} type="button" onMouseDown={() => addAssignee(u)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">{u.name?.charAt(0)}</div>
                          <span>{u.name}</span>
                          <span className="text-gray-400 text-xs">{u.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {assignments.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {assignments.map(a => (
                      <div key={a.employee_id} className="flex items-center gap-2 bg-gray-50 rounded-md p-2">
                        <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700 flex-shrink-0">{a.name?.charAt(0)}</div>
                        <span className="text-sm font-medium flex-1">{a.name}</span>
                        <Select value={a.access_type || '_none'} onValueChange={v => setAssigneeField(a.employee_id, 'access_type', v === '_none' ? '' : v)}>
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="Access type" /></SelectTrigger>
                          <SelectContent>{ACCESS_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="date" value={a.access_given_date} onChange={e => setAssigneeField(a.employee_id, 'access_given_date', e.target.value)} className="h-7 w-36 text-xs" />
                        <button type="button" onClick={() => removeAssignee(a.employee_id)} className="text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section E */}
        <div className="space-y-3">
          <SectionHeader label="E — Status & Visibility" color="bg-green-700" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tool Status <span className="text-red-500">*</span></Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_LIST.map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Visibility <span className="text-red-500">*</span></Label>
              <Select value={form.visibility} onValueChange={v => set('visibility', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VISIBILITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* SMM Panel Section */}
        {(form.is_smm_panel || isSmmCat) && (
          <div className="space-y-3">
            <SectionHeader label="SMM Panel — Fund Tracker" color="bg-orange-600" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Panel Type</Label>
                <Select value={form.smm_panel_type || '_none'} onValueChange={v => set('smm_panel_type', v === '_none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {['SMM Panel', 'Meta Ad Account', 'Google Ads Account', 'TikTok Ads', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Current Balance</Label>
                <Input type="number" min="0" step="0.01" value={form.smm_current_balance} onChange={e => set('smm_current_balance', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>Low Balance Alert Threshold</Label>
                <Input type="number" min="0" step="0.01" value={form.smm_low_balance_threshold} onChange={e => set('smm_low_balance_threshold', e.target.value)} placeholder="5000" />
              </div>
            </div>
          </div>
        )}
      </form>
      <div className="flex gap-2 justify-end px-6 py-4 border-t bg-white">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
          {saving ? 'Saving...' : (editTool ? 'Update Tool' : 'Add Tool')}
        </Button>
      </div>
    </div>
  );
}

// ─── Tool Detail Drawer ───────────────────────────────────────────────────────
function ToolDetailDrawer({ tool, isAdmin, users, categories, onClose, onRefresh }) {
  const [tab, setTab] = useState('overview');
  const [password, setPassword] = useState(null);
  const [revealing, setRevealing] = useState(false);
  const [pwTimer, setPwTimer] = useState(0);
  const [assignments, setAssignments] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [topups, setTopups] = useState([]);
  const [showRenewForm, setShowRenewForm] = useState(false);
  const [showTopupForm, setShowTopupForm] = useState(false);
  const [renewForm, setRenewForm] = useState({ purchase_date: '', amount_paid: '', plan_duration_days: '' });
  const [topupForm, setTopupForm] = useState({ topup_date: '', amount: '', payment_method: '', notes: '' });
  const [addAssign, setAddAssign] = useState({ employee_id: '', access_type: '', access_given_date: new Date().toISOString().split('T')[0] });
  const [userSearch, setUserSearch] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (tab === 'assignments') fetchAssignments();
    if (tab === 'renewals') fetchRenewals();
    if (tab === 'topups') fetchTopups();
  }, [tab, tool._id]);

  const fetchAssignments = async () => {
    try { const r = await axios.get(`/api/tools/${tool._id}/assignments`); setAssignments(r.data); } catch {}
  };
  const fetchRenewals = async () => {
    try { const r = await axios.get(`/api/tools/${tool._id}/renew`); setRenewals(r.data); } catch {}
  };
  const fetchTopups = async () => {
    try { const r = await axios.get(`/api/tools/${tool._id}/topups`); setTopups(r.data); } catch {}
  };

  const revealPassword = async () => {
    if (!confirm('Viewing this password will be logged. Continue?')) return;
    setRevealing(true);
    try {
      const r = await axios.post(`/api/tools/${tool._id}/reveal`);
      setPassword(r.data.password);
      setPwTimer(30);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setPwTimer(t => {
          if (t <= 1) { clearInterval(timerRef.current); setPassword(null); return 0; }
          return t - 1;
        });
      }, 1000);
    } catch (err) { toast({ title: err.response?.data?.error || 'Failed', variant: 'destructive' }); }
    finally { setRevealing(false); }
  };

  const revokeAssignment = async (assignId) => {
    if (!confirm('Revoke this access?')) return;
    try {
      await axios.patch(`/api/tools/${tool._id}/assignments/${assignId}`);
      fetchAssignments();
      toast({ title: 'Access revoked', variant: 'success' });
    } catch { toast({ title: 'Failed', variant: 'destructive' }); }
  };

  const submitAssign = async () => {
    if (!addAssign.employee_id) return toast({ title: 'Select an employee', variant: 'destructive' });
    try {
      await axios.post(`/api/tools/${tool._id}/assignments`, addAssign);
      fetchAssignments(); setAddAssign({ employee_id: '', access_type: '', access_given_date: new Date().toISOString().split('T')[0] });
      toast({ title: 'Access assigned', variant: 'success' });
    } catch (err) { toast({ title: err.response?.data?.error || 'Failed', variant: 'destructive' }); }
  };

  const submitRenew = async () => {
    try {
      await axios.post(`/api/tools/${tool._id}/renew`, renewForm);
      fetchRenewals(); setShowRenewForm(false); onRefresh();
      toast({ title: 'Tool renewed', variant: 'success' });
    } catch (err) { toast({ title: err.response?.data?.error || 'Failed', variant: 'destructive' }); }
  };

  const submitTopup = async () => {
    try {
      await axios.post(`/api/tools/${tool._id}/topups`, topupForm);
      fetchTopups(); setShowTopupForm(false); onRefresh();
      toast({ title: 'Top-up logged', variant: 'success' });
    } catch (err) { toast({ title: err.response?.data?.error || 'Failed', variant: 'destructive' }); }
  };

  const today = new Date(); const expiry = new Date(tool.expiry_date);
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  const catColor = tool.category_id?.color || '#6366f1';

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'credentials', label: 'Credentials' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'renewals', label: 'Renewals' },
    ...(tool.is_smm_panel ? [{ id: 'topups', label: 'SMM Topups' }] : []),
  ];

  const InfoRow = ({ label, value, mono }) => value ? (
    <div className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 w-40 flex-shrink-0">{label}</span>
      <span className={`text-sm text-gray-800 text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  ) : null;

  if (showEditForm) return (
    <ToolForm categories={categories} users={users} editTool={tool} onSuccess={() => { setShowEditForm(false); onRefresh(); }} onClose={() => setShowEditForm(false)} />
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderTop: `4px solid ${catColor}` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ background: catColor }} />
              <span className="text-xs text-gray-500">{tool.category_id?.name}</span>
            </div>
            <h2 className="font-semibold text-gray-900 text-lg truncate">{tool.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={tool.status} />
              {tool.access_url && (
                <a href={tool.access_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 flex items-center gap-0.5 hover:underline">
                  <ExternalLink className="h-3 w-3" /> Open
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isAdmin && <Button variant="ghost" size="sm" onClick={() => setShowEditForm(true)}><Pencil className="h-4 w-4" /></Button>}
            <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>
        {/* Expiry bar */}
        <div className={`mt-3 flex items-center gap-2 text-sm ${getExpiryStyle(daysLeft, tool.status)}`}>
          <CalendarClock className="h-4 w-4" />
          <span>Expires {formatDate(tool.expiry_date)}</span>
          {tool.status === 'active' && <span className="font-semibold">({daysLeft > 0 ? `${daysLeft} days left` : 'Expired'})</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b px-6 overflow-x-auto flex-shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t.id ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {tab === 'overview' && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tool Details</p>
              <InfoRow label="License Type" value={tool.license_type} />
              <InfoRow label="Number of Seats" value={tool.seats} />
              <InfoRow label="Description" value={tool.description} />
              <InfoRow label="Visibility" value={VISIBILITY_OPTIONS.find(o => o.value === tool.visibility)?.label} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Purchase & Billing</p>
              <InfoRow label="Seller" value={tool.seller_name} />
              <InfoRow label="Purchase Date" value={formatDate(tool.purchase_date)} />
              <InfoRow label="Price Paid" value={tool.price?.toLocaleString()} />
              <InfoRow label="Billing Cycle" value={tool.billing_cycle} />
              <InfoRow label="Plan Name" value={tool.plan_name} />
              <InfoRow label="Duration" value={`${tool.plan_duration_days} days`} />
              <InfoRow label="Auto-Renewal" value={tool.auto_renewal ? 'Enabled' : 'Disabled'} />
              <InfoRow label="Monthly Est." value={`${Math.round((tool.price / tool.plan_duration_days) * 30).toLocaleString()}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Assignment</p>
              <InfoRow label="Primary Owner" value={tool.primary_owner?.name} />
              <InfoRow label="Account Owner" value={tool.account_owner} />
            </div>
            {tool.is_smm_panel && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">SMM Panel</p>
                <InfoRow label="Panel Type" value={tool.smm_panel_type} />
                <InfoRow label="Current Balance" value={tool.smm_current_balance?.toLocaleString()} />
                <InfoRow label="Low Balance Alert" value={tool.smm_low_balance_threshold?.toLocaleString()} />
              </div>
            )}
          </div>
        )}

        {tab === 'credentials' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              All credential views are permanently logged. Password auto-hides after 30 seconds.
            </div>
            <div className="space-y-3">
              <InfoRow label="Login Email" value={tool.login_email} mono />
              <InfoRow label="Account Owner" value={tool.account_owner} />
              <InfoRow label="Additional Notes" value={tool.additional_login_notes} />
            </div>
            {isAdmin && (
              <div className="pt-2">
                <p className="text-xs text-gray-500 mb-2">Password</p>
                {password ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-900 text-green-400 font-mono text-sm px-3 py-2 rounded-md">{password}</div>
                    <span className="text-xs text-gray-400">{pwTimer}s</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 text-gray-400 px-3 py-2 rounded-md text-sm">••••••••••••</div>
                    <Button size="sm" variant="outline" onClick={revealPassword} disabled={revealing}>
                      <Eye className="h-3.5 w-3.5 mr-1" />{revealing ? 'Loading...' : 'Reveal'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'assignments' && (
          <div className="space-y-4">
            {isAdmin && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-600">Add Access</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Select value={addAssign.employee_id} onValueChange={v => setAddAssign(a => ({ ...a, employee_id: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>{users.map(u => <SelectItem key={u._id} value={u._id} className="text-xs">{u.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={addAssign.access_type || '_none'} onValueChange={v => setAddAssign(a => ({ ...a, access_type: v === '_none' ? '' : v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Access type" /></SelectTrigger>
                    <SelectContent>{ACCESS_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="date" className="h-8 text-xs" value={addAssign.access_given_date} onChange={e => setAddAssign(a => ({ ...a, access_given_date: e.target.value }))} />
                </div>
                <Button size="sm" onClick={submitAssign} className="bg-red-600 hover:bg-red-700 text-white">
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Assign Access
                </Button>
              </div>
            )}
            <div className="space-y-2">
              {assignments.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No assignments yet.</p>}
              {assignments.map(a => (
                <div key={a._id} className={`flex items-center justify-between p-3 rounded-lg border ${a.status === 'revoked' ? 'bg-gray-50 opacity-60' : 'bg-white'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700">
                      {a.employee_id ? `${a.employee_id.firstName || ''}${a.employee_id.lastName || ''}`.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{a.employee_id ? `${a.employee_id.firstName} ${a.employee_id.lastName}` : '—'}</p>
                      <p className="text-xs text-gray-400">{a.employee_id?.designation || a.access_type || 'No type set'} · Given {formatDate(a.access_given_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {a.status === 'active' ? 'Active' : `Revoked ${formatDate(a.access_revoked_date)}`}
                    </span>
                    {isAdmin && a.status === 'active' && (
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 px-2" onClick={() => revokeAssignment(a._id)}>
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'renewals' && (
          <div className="space-y-4">
            {isAdmin && (
              <Button size="sm" onClick={() => setShowRenewForm(p => !p)} className="bg-green-600 hover:bg-green-700 text-white">
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Mark as Renewed
              </Button>
            )}
            {showRenewForm && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-green-700">Log New Renewal</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1"><Label className="text-xs">New Purchase Date</Label><Input type="date" value={renewForm.purchase_date} onChange={e => setRenewForm(f => ({ ...f, purchase_date: e.target.value }))} className="h-8 text-xs" /></div>
                  <div className="space-y-1"><Label className="text-xs">Amount Paid</Label><Input type="number" value={renewForm.amount_paid} onChange={e => setRenewForm(f => ({ ...f, amount_paid: e.target.value }))} placeholder="0" className="h-8 text-xs" /></div>
                  <div className="space-y-1"><Label className="text-xs">Duration (Days)</Label><Input type="number" value={renewForm.plan_duration_days} onChange={e => setRenewForm(f => ({ ...f, plan_duration_days: e.target.value }))} placeholder="365" className="h-8 text-xs" /></div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={submitRenew} className="bg-green-600 hover:bg-green-700 text-white">Save Renewal</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowRenewForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {renewals.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No renewal history yet.</p>}
              {renewals.map((r, i) => (
                <div key={r._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">#{r.renewal_number} — {i === 0 ? 'Initial Purchase' : 'Renewal'}</p>
                    <p className="text-xs text-gray-400">{formatDate(r.purchase_date)} → {formatDate(r.expiry_date)} · by {r.renewed_by?.name}</p>
                  </div>
                  <p className="text-sm font-semibold text-green-600">{r.amount_paid?.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'topups' && tool.is_smm_panel && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Current Balance</p>
                <p className="text-2xl font-bold text-gray-900">{tool.smm_current_balance?.toLocaleString() || '0'}</p>
              </div>
              {isAdmin && <Button size="sm" onClick={() => setShowTopupForm(p => !p)} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="h-3.5 w-3.5 mr-1" /> Add Top-up</Button>}
            </div>
            {showTopupForm && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Date</Label><Input type="date" value={topupForm.topup_date} onChange={e => setTopupForm(f => ({ ...f, topup_date: e.target.value }))} className="h-8 text-xs" /></div>
                  <div className="space-y-1"><Label className="text-xs">Amount</Label><Input type="number" value={topupForm.amount} onChange={e => setTopupForm(f => ({ ...f, amount: e.target.value }))} placeholder="10000" className="h-8 text-xs" /></div>
                  <div className="space-y-1"><Label className="text-xs">Payment Method</Label><Input value={topupForm.payment_method} onChange={e => setTopupForm(f => ({ ...f, payment_method: e.target.value }))} placeholder="Bank Transfer / JazzCash" className="h-8 text-xs" /></div>
                  <div className="space-y-1"><Label className="text-xs">Notes</Label><Input value={topupForm.notes} onChange={e => setTopupForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" className="h-8 text-xs" /></div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={submitTopup} className="bg-orange-600 hover:bg-orange-700 text-white">Save Top-up</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowTopupForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {topups.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No top-up history.</p>}
              {topups.map((t, i) => (
                <div key={t._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">#{topups.length - i} · {formatDate(t.topup_date)}</p>
                    <p className="text-xs text-gray-400">{t.payment_method || 'No method'} · {t.added_by?.name} {t.notes ? `· ${t.notes}` : ''}</p>
                  </div>
                  <p className="text-sm font-semibold text-orange-600">+{t.amount?.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard Panel ──────────────────────────────────────────────────────────
function DashboardPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/tools/stats').then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400">Loading dashboard...</div>;
  if (!stats) return <div className="text-center text-gray-400 py-12">Dashboard unavailable (Admin only)</div>;

  const STAT_CARDS = [
    { label: 'Total Active Tools', value: stats.totalActive, icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Monthly Spend (Est.)', value: stats.monthlySpend?.toLocaleString(), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Annual Spend (Est.)', value: stats.annualSpend?.toLocaleString(), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Expiring This Month', value: stats.expiringThisMonth, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const COLORS = stats.categoryBreakdown?.map(c => c.color) || [];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((s, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Category-wise Monthly Spend</h3>
            {stats.categoryBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={stats.categoryBreakdown} dataKey="totalCost" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                    {stats.categoryBreakdown.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => v.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-400 text-center py-8">No data yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Tools by Status</h3>
            {stats.statusBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={stats.statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }) => `${status} (${count})`}>
                    {stats.statusBreakdown.map((s, i) => {
                      const colors = { active: '#22c55e', expired: '#ef4444', cancelled: '#9ca3af', paused: '#f59e0b', pending_renewal: '#f97316' };
                      return <Cell key={i} fill={colors[s.status] || '#6366f1'} />;
                    })}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-400 text-center py-8">No data yet</p>}
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Expensive */}
      {stats.topExpensive?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 5 Most Expensive Tools</h3>
            <div className="space-y-2">
              {stats.topExpensive.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">#{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.billing_cycle}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{t.price?.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ToolsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const [tools, setTools] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('directory');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');

  const fetchTools = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (catFilter) params.set('category', catFilter);
      const r = await axios.get(`/api/tools?${params}`);
      setTools(r.data);
    } catch { toast({ title: 'Failed to load tools', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [search, statusFilter, catFilter]);

  useEffect(() => {
    Promise.all([
      axios.get('/api/tools/categories'),
      axios.get('/api/hr/employees?limit=200'),
    ]).then(([cRes, uRes]) => {
      setCategories(cRes.data);
      // Normalize employee name
      setUsers((uRes.data.employees || uRes.data).map(e => ({
        ...e,
        name: `${e.firstName} ${e.lastName}`.trim(),
      })));
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchTools(); }, [fetchTools]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this tool? It will be soft-deleted.')) return;
    try {
      await axios.delete(`/api/tools/${id}`);
      toast({ title: 'Tool deleted', variant: 'success' });
      fetchTools();
      if (selectedTool?._id === id) setSelectedTool(null);
    } catch { toast({ title: 'Failed', variant: 'destructive' }); }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Content */}
      <div className={`flex flex-col flex-1 overflow-hidden transition-all ${(showAddForm || selectedTool) ? 'mr-[480px]' : ''}`}>
        <Header title="Tools & Access Management" subtitle="Track all software subscriptions, credentials, and team access" />
        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">

          {/* Top Tabs */}
          <div className="flex items-center justify-between border-b">
            <div className="flex">
              {[{ id: 'directory', label: 'Tool Directory' }, { id: 'dashboard', label: 'Dashboard' }].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            {isAdmin && activeTab === 'directory' && (
              <Button size="sm" onClick={() => { setShowAddForm(true); setSelectedTool(null); }} className="bg-red-600 hover:bg-red-700 text-white">
                <Plus className="h-4 w-4 mr-1" /> Add Tool
              </Button>
            )}
          </div>

          {activeTab === 'dashboard' ? <DashboardPanel /> : (
            <>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-48 max-w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools..." className="pl-8 h-9" />
                </div>
                <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9 w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUS_LIST.map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={catFilter} onValueChange={v => setCatFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9 w-48"><SelectValue placeholder="All categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">{tools.length} tools</p>
              </div>

              {/* Table */}
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Tool</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Assigned To</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Expiry</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Monthly Est.</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Owner</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {loading ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                        ))}</tr>
                      )) : tools.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-12 text-gray-400">No tools found. {isAdmin && 'Add your first tool above.'}</td></tr>
                      ) : tools.map(tool => {
                        const catColor = tool.category_id?.color || '#6366f1';
                        return (
                          <tr key={tool._id} className={`cursor-pointer transition-colors hover:bg-gray-50 ${getRowBg(tool.daysLeft, tool.status)}`}
                            onClick={() => { setSelectedTool(tool); setShowAddForm(false); }}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: catColor }} />
                                <div>
                                  <p className="font-medium text-gray-900">{tool.name}</p>
                                  {tool.plan_name && <p className="text-xs text-gray-400">{tool.plan_name}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${catColor}20`, color: catColor }}>
                                {tool.category_id?.name || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              {tool.assignees?.length > 0 ? <AvatarChips assignees={tool.assignees} /> : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={tool.status} /></td>
                            <td className="px-4 py-3">
                              <p className={`text-xs ${getExpiryStyle(tool.daysLeft, tool.status)}`}>{formatDate(tool.expiry_date)}</p>
                              {tool.status === 'active' && (
                                <p className={`text-xs ${getExpiryStyle(tool.daysLeft, tool.status)}`}>
                                  {tool.daysLeft > 0 ? `${tool.daysLeft}d left` : 'Expired'}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{tool.monthlyEst?.toLocaleString()}</td>
                            <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{tool.primary_owner?.name || '—'}</td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-gray-400 hover:text-blue-600" onClick={() => { setSelectedTool(tool); setShowAddForm(false); }}>
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                                {isAdmin && (
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-red-300 hover:text-red-600" onClick={e => handleDelete(tool._id, e)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Right Drawer Panel */}
      {(showAddForm || selectedTool) && (
        <div className="fixed right-0 top-0 h-full w-[480px] bg-white border-l shadow-2xl z-30 flex flex-col">
          {showAddForm && (
            <ToolForm
              categories={categories}
              users={users}
              onSuccess={() => { setShowAddForm(false); fetchTools(); }}
              onClose={() => setShowAddForm(false)}
            />
          )}
          {selectedTool && !showAddForm && (
            <ToolDetailDrawer
              tool={selectedTool}
              isAdmin={isAdmin}
              users={users}
              categories={categories}
              onClose={() => setSelectedTool(null)}
              onRefresh={() => { fetchTools(); }}
            />
          )}
        </div>
      )}
    </div>
  );
}
