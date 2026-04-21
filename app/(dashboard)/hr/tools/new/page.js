'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import {
  ArrowLeft, ArrowRight, Check, Save, Wrench, Shield, DollarSign, Users, Search, X,
  Eye, EyeOff, CalendarClock, Info,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const LICENSE_TYPES = ['Individual', 'Team', 'Enterprise', 'Shared', 'Lifetime', 'Other'];
const BILLING_CYCLES = ['Monthly', 'Quarterly', '6-Monthly', 'Annual', 'Lifetime', 'One-time'];
const ACCESS_TYPES = ['Full Access', 'View Only', 'Limited', 'Admin Access'];
const VISIBILITY_OPTIONS = [
  { value: 'company', label: 'Company-wide' },
  { value: 'department', label: 'Department-specific' },
  { value: 'admin_hr', label: 'Admin/HR Only' },
];
const STATUS_LIST = [
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'paused', label: 'Paused' },
  { value: 'pending_renewal', label: 'Pending Renewal' },
];
const SMM_PANEL_TYPES = ['SMM Panel', 'Meta Ad Account', 'Google Ads Account', 'TikTok Ads', 'Other'];

const STEPS = [
  { id: 0, label: 'Tool Info',    icon: Wrench },
  { id: 1, label: 'Credentials', icon: Shield },
  { id: 2, label: 'Billing',     icon: DollarSign },
  { id: 3, label: 'Assignment',  icon: Users },
];

// ─── Shared Field wrapper ─────────────────────────────────────────────────────
function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AddToolPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Assignment state
  const [assignments, setAssignments] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDD, setShowUserDD] = useState(false);
  const userDDRef = useRef(null);

  const emptyForm = {
    name: '', category_id: '', access_url: '', license_type: '', seats: '', description: '',
    login_email: '', password: '', account_owner: '', additional_login_notes: '',
    seller_name: '', purchase_date: '', price: '', billing_cycle: 'Monthly', plan_name: '',
    plan_duration_days: '', expiry_date: '', auto_renewal: false,
    primary_owner: '', status: 'active', visibility: 'company',
    is_smm_panel: false, smm_panel_type: '', smm_current_balance: '', smm_low_balance_threshold: '',
  };
  const [form, setForm] = useState(emptyForm);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    Promise.all([
      axios.get('/api/tools/categories'),
      axios.get('/api/hr/employees?limit=200'),
    ]).then(([cRes, uRes]) => {
      setCategories(cRes.data || []);
      setUsers(
        (uRes.data.employees || uRes.data || []).map(e => ({
          ...e,
          name: `${e.firstName} ${e.lastName}`.trim(),
        }))
      );
    }).catch(() => {});
  }, []);

  // Auto-detect SMM category
  const selectedCat = categories.find(c => c._id === form.category_id);
  useEffect(() => {
    if (selectedCat?.is_smm_type) set('is_smm_panel', true);
  }, [selectedCat]);

  // Auto-calc expiry from purchase date + duration
  useEffect(() => {
    if (form.purchase_date && form.plan_duration_days) {
      const d = new Date(form.purchase_date);
      d.setDate(d.getDate() + (parseInt(form.plan_duration_days) || 0));
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

  // Click outside user dropdown
  useEffect(() => {
    const handler = (e) => {
      if (userDDRef.current && !userDDRef.current.contains(e.target)) setShowUserDD(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) &&
    !assignments.find(a => a.employee_id === u._id)
  );

  const addAssignee = (u) => {
    setAssignments(prev => [
      ...prev,
      { employee_id: u._id, name: u.name, access_type: '', access_given_date: new Date().toISOString().split('T')[0] },
    ]);
    setUserSearch(''); setShowUserDD(false);
  };
  const removeAssignee = (id) => setAssignments(prev => prev.filter(a => a.employee_id !== id));
  const setAssigneeField = (id, k, v) =>
    setAssignments(prev => prev.map(a => a.employee_id === id ? { ...a, [k]: v } : a));

  const handleSubmit = async () => {
    if (!form.name?.trim()) {
      toast({ title: 'Tool name is required', variant: 'destructive' }); setStep(0); return;
    }
    if (!form.login_email?.trim()) {
      toast({ title: 'Login email is required', variant: 'destructive' }); setStep(1); return;
    }
    if (!form.password?.trim()) {
      toast({ title: 'Password is required', variant: 'destructive' }); setStep(1); return;
    }
    setSaving(true);
    try {
      await axios.post('/api/tools', { ...form, assigned_users: assignments });
      toast({ title: 'Tool added successfully', variant: 'success' });
      router.push('/hr/tools');
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Failed to save tool', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  // ── Computed values for billing preview ───────────────────────────────────
  const price = Number(form.price) || 0;
  const days = Number(form.plan_duration_days) || 0;
  const monthlyEst = days > 0 ? Math.round((price / days) * 30) : 0;

  return (
    <>
      <Header title="Add New Tool" subtitle="Register a software subscription, credential, and team access" />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Step Indicator */}
          <div className="flex items-center gap-0">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const done   = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => done && setStep(s.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                      active ? 'bg-red-600 text-white shadow-sm' :
                      done   ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer' :
                               'bg-gray-100 text-gray-400 cursor-default'
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${done ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Step 0: Tool Identity ───────────────────────────────────────── */}
          {step === 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-gray-400" />
                  Tool Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Tool / Software Name" required>
                    <Input className="h-9" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Canva Pro" />
                  </Field>
                  <Field label="Category" required>
                    <Select value={form.category_id} onValueChange={v => set('category_id', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Access URL" required hint="Direct login link for this tool">
                    <Input type="url" className="h-9" value={form.access_url} onChange={e => set('access_url', e.target.value)} placeholder="https://app.example.com/login" />
                  </Field>
                  <Field label="License Type">
                    <Select value={form.license_type || '_none'} onValueChange={v => set('license_type', v === '_none' ? '' : v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— None —</SelectItem>
                        {LICENSE_TYPES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Number of Seats" hint="Leave blank if unlimited">
                    <Input type="number" min="1" className="h-9" value={form.seats} onChange={e => set('seats', e.target.value)} placeholder="e.g. 5" />
                  </Field>
                </div>

                <Field label="Description / Notes">
                  <textarea
                    className="w-full min-h-[80px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="What is this tool used for? Any important notes..."
                  />
                </Field>

                {/* SMM Panel toggle (only if not auto-detected via category) */}
                {!selectedCat?.is_smm_type && (
                  <label className="flex items-center gap-2.5 cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      className="rounded w-4 h-4 accent-red-600"
                      checked={form.is_smm_panel}
                      onChange={e => set('is_smm_panel', e.target.checked)}
                    />
                    <span className="text-sm text-gray-700">This is an SMM Panel / Ad Account</span>
                  </label>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Step 1: Credentials ──────────────────────────────────────────── */}
          {step === 1 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-400" />
                  Credentials
                  <span className="ml-auto text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded">AES-256 Encrypted</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Passwords are stored encrypted. Only Admins can reveal them. Every reveal is permanently logged.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Login Email / Username" required>
                    <Input className="h-9" value={form.login_email} onChange={e => set('login_email', e.target.value)} placeholder="login@example.com" />
                  </Field>
                  <Field label="Password" required>
                    <div className="relative">
                      <Input
                        type={showPw ? 'text' : 'password'}
                        className="h-9 pr-10"
                        value={form.password}
                        onChange={e => set('password', e.target.value)}
                        placeholder="Enter password"
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPw(p => !p)}>
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Account Owner / Registered Under" hint="Person or company the account is registered to">
                    <Input className="h-9" value={form.account_owner} onChange={e => set('account_owner', e.target.value)} placeholder="CEO / Company Name" />
                  </Field>
                </div>

                <Field label="Additional Login Notes">
                  <textarea
                    className="w-full min-h-[80px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    value={form.additional_login_notes}
                    onChange={e => set('additional_login_notes', e.target.value)}
                    placeholder="e.g. Use VPN before logging in, 2FA required, recovery codes stored in..."
                  />
                </Field>
              </CardContent>
            </Card>
          )}

          {/* ── Step 2: Purchase & Billing ───────────────────────────────────── */}
          {step === 2 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  Purchase & Billing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Seller / Purchased From" required>
                    <Input className="h-9" value={form.seller_name} onChange={e => set('seller_name', e.target.value)} placeholder="Hostinger, Envato, etc." />
                  </Field>
                  <Field label="Purchase Date" required>
                    <Input type="date" className="h-9" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} />
                  </Field>
                  <Field label="Price Paid" required>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">PKR</span>
                      <Input type="number" min="0" step="0.01" className="h-9 pl-11" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0" />
                    </div>
                  </Field>
                  <Field label="Billing Cycle" required>
                    <Select value={form.billing_cycle} onValueChange={v => set('billing_cycle', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{BILLING_CYCLES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Package / Plan Name" required>
                    <Input className="h-9" value={form.plan_name} onChange={e => set('plan_name', e.target.value)} placeholder="Business Plan, Pro, etc." />
                  </Field>
                  <Field label="Duration (Days)" required hint="Auto-calculates expiry date">
                    <Input type="number" min="1" className="h-9" value={form.plan_duration_days} onChange={e => set('plan_duration_days', e.target.value)} placeholder="365" />
                  </Field>
                  <Field label="Expiry Date" required>
                    <div className="relative">
                      <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input type="date" className="h-9 pl-9" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
                    </div>
                  </Field>
                  <Field label="Auto-Renewal">
                    <label className="flex items-center gap-2.5 h-9 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded w-4 h-4 accent-red-600"
                        checked={form.auto_renewal}
                        onChange={e => set('auto_renewal', e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">Enabled</span>
                    </label>
                  </Field>
                </div>

                {/* Price preview */}
                {price > 0 && days > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                      <p className="text-xs text-blue-500 font-medium mb-0.5">Monthly Estimate</p>
                      <p className="text-lg font-bold text-blue-700">PKR {monthlyEst.toLocaleString()}</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-center">
                      <p className="text-xs text-purple-500 font-medium mb-0.5">Annual Estimate</p>
                      <p className="text-lg font-bold text-purple-700">PKR {(monthlyEst * 12).toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {/* SMM Panel fields */}
                {form.is_smm_panel && (
                  <div className="border-t pt-4 space-y-4">
                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">SMM Panel / Ad Account Details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Panel Type">
                        <Select value={form.smm_panel_type || '_none'} onValueChange={v => set('smm_panel_type', v === '_none' ? '' : v)}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            {SMM_PANEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Current Balance">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">PKR</span>
                          <Input type="number" min="0" step="0.01" className="h-9 pl-11" value={form.smm_current_balance} onChange={e => set('smm_current_balance', e.target.value)} placeholder="0" />
                        </div>
                      </Field>
                      <Field label="Low Balance Alert Threshold">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">PKR</span>
                          <Input type="number" min="0" step="0.01" className="h-9 pl-11" value={form.smm_low_balance_threshold} onChange={e => set('smm_low_balance_threshold', e.target.value)} placeholder="5000" />
                        </div>
                      </Field>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Step 3: Assignment & Settings ───────────────────────────────── */}
          {step === 3 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  Assignment & Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Primary owner + Status + Visibility */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Primary Owner / Responsible" required>
                    <Select value={form.primary_owner} onValueChange={v => set('primary_owner', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {users.map(u => (
                          <SelectItem key={u._id} value={u._id}>
                            {u.name} <span className="text-xs text-gray-400">({u.email})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Tool Status" required>
                    <Select value={form.status} onValueChange={v => set('status', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_LIST.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Visibility" required hint="Who can see this tool in the directory">
                    <Select value={form.visibility} onValueChange={v => set('visibility', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{VISIBILITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>

                {/* Assign Employees */}
                <div className="border-t pt-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assign Access to Employees</p>
                  <p className="text-xs text-gray-400">Optional. You can add more from the tool detail page later.</p>

                  {/* User search */}
                  <div className="relative" ref={userDDRef}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      className="h-9 pl-9"
                      value={userSearch}
                      onChange={e => { setUserSearch(e.target.value); setShowUserDD(true); }}
                      onFocus={() => setShowUserDD(true)}
                      placeholder="Search employee name..."
                    />
                    {showUserDD && filteredUsers.length > 0 && (
                      <div className="absolute z-50 top-full mt-1 w-full bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                        {filteredUsers.slice(0, 8).map(u => (
                          <button key={u._id} type="button" onMouseDown={() => addAssignee(u)}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3 border-b last:border-0">
                            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700 flex-shrink-0">
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{u.name}</p>
                              <p className="text-xs text-gray-400">{u.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assigned list */}
                  {assignments.length > 0 && (
                    <div className="space-y-2 mt-1">
                      {assignments.map(a => (
                        <div key={a.employee_id} className="flex items-center gap-2 bg-gray-50 border rounded-lg p-2.5">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700 flex-shrink-0">
                            {a.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium flex-1 min-w-0 truncate">{a.name}</span>
                          <Select value={a.access_type || '_none'} onValueChange={v => setAssigneeField(a.employee_id, 'access_type', v === '_none' ? '' : v)}>
                            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Access type" /></SelectTrigger>
                            <SelectContent>{ACCESS_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                          </Select>
                          <Input
                            type="date"
                            className="h-8 w-36 text-xs"
                            value={a.access_given_date}
                            onChange={e => setAssigneeField(a.employee_id, 'access_given_date', e.target.value)}
                          />
                          <button type="button" onClick={() => removeAssignee(a.employee_id)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Final summary */}
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Summary</p>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Tool</span><span className="font-medium">{form.name || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Category</span><span>{categories.find(c => c._id === form.category_id)?.name || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Login</span><span className="text-gray-700">{form.login_email || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Plan</span><span>{form.plan_name || '—'} · {form.billing_cycle}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="font-semibold text-gray-900">PKR {Number(form.price || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Expiry</span><span>{form.expiry_date || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Assignees</span><span>{assignments.length > 0 ? `${assignments.length} employee${assignments.length > 1 ? 's' : ''}` : 'None yet'}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pb-6">
            <div className="flex gap-2">
              <Link href="/hr/tools">
                <Button variant="outline" size="sm" type="button">
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Cancel
                </Button>
              </Link>
              {step > 0 && (
                <Button variant="outline" size="sm" type="button" onClick={() => setStep(s => s - 1)}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                </Button>
              )}
            </div>
            <div>
              {step < STEPS.length - 1 ? (
                <Button size="sm" type="button" onClick={() => setStep(s => s + 1)} className="bg-red-600 hover:bg-red-700 text-white">
                  Next <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              ) : (
                <Button size="sm" type="button" onClick={handleSubmit} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
                  {saving ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-1.5" />Save Tool</>
                  )}
                </Button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
