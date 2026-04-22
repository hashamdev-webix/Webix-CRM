'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import {
  ArrowLeft, Edit3, Briefcase, DollarSign, Users, Globe,
  Phone, Mail, MapPin, Calendar, Save, X, Plus, Trash2,
  AlertCircle, Check, TrendingUp, Building2, User, Link2,
  CreditCard, FileText, Activity, ChevronDown, ExternalLink,
  Clock, Tag, Star,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active:           { label: 'Active',           dot: 'bg-emerald-400', pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  on_hold:          { label: 'On Hold',          dot: 'bg-orange-400',  pill: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  under_review:     { label: 'Under Review',     dot: 'bg-yellow-400',  pill: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  trial:            { label: 'Trial / Pilot',    dot: 'bg-blue-400',    pill: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  completed:        { label: 'Completed',         dot: 'bg-teal-400',    pill: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' },
  churned:          { label: 'Churned',           dot: 'bg-red-500',     pill: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  potential_upsell: { label: 'Potential Upsell', dot: 'bg-purple-400',  pill: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' },
};

const PROJECT_STATUS_CONFIG = {
  'Planning':      'bg-blue-50 text-blue-700',
  'Active':        'bg-emerald-50 text-emerald-700',
  'On Hold':       'bg-orange-50 text-orange-700',
  'Under Review':  'bg-yellow-50 text-yellow-700',
  'Completed':     'bg-teal-50 text-teal-700',
  'Cancelled':     'bg-red-50 text-red-700',
};

const SERVICE_COLORS = {
  SMM: 'bg-blue-50 text-blue-700 border border-blue-100',
  SEO: 'bg-green-50 text-green-700 border border-green-100',
  'Google Ads': 'bg-yellow-50 text-yellow-700 border border-yellow-100',
  'Meta Ads': 'bg-indigo-50 text-indigo-700 border border-indigo-100',
  'Web Development': 'bg-purple-50 text-purple-700 border border-purple-100',
  'Graphic Design': 'bg-pink-50 text-pink-700 border border-pink-100',
  CRM: 'bg-gray-100 text-gray-700 border border-gray-200',
};

const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'JazzCash', 'EasyPaisa', 'Stripe', 'PayPal', 'Cheque', 'Other'];
const TABS = ['Overview', 'Project', 'Team', 'Financials', 'Social Links'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(d) {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}
function fmtCurrency(n, currency = 'PKR') {
  if (n == null) return '—';
  return `${currency} ${Number(n).toLocaleString()}`;
}

// ─── Small Components ─────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, dot: 'bg-gray-400', pill: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function InfoRow({ label, value, accent }) {
  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm font-medium break-words flex-1 ${accent ? 'text-red-600' : 'text-gray-800'}`}>
        {value || <span className="text-gray-300 font-normal">—</span>}
      </span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, action }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ServiceTag({ service }) {
  const cls = SERVICE_COLORS[service] || 'bg-gray-50 text-gray-600 border border-gray-100';
  return <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${cls}`}>{service}</span>;
}

// ─── Add Payment Modal ────────────────────────────────────────────────────────
function AddPaymentModal({ clientId, currency, onClose, onAdded }) {
  const [form, setForm] = useState({
    payment_date: new Date().toISOString().slice(0, 10),
    amount: '',
    currency: currency || 'PKR',
    method: '',
    invoice_number: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  const handleSave = async () => {
    const e = {};
    if (!form.payment_date) e.payment_date = 'Date required';
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Valid amount required';
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setSaving(true);
    try {
      const res = await axios.post(`/api/clients/${clientId}/payments`, form);
      onAdded(res.data);
      toast({ title: 'Payment logged successfully' });
      onClose();
    } catch {
      toast({ title: 'Failed to log payment', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-up">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-red-500" />
            </div>
            <span className="font-semibold text-gray-800">Log Payment</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">Date <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)}
                className={errors.payment_date ? 'border-red-400' : ''} />
              {errors.payment_date && <p className="text-xs text-red-500">{errors.payment_date}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">Currency</Label>
              <select className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                value={form.currency} onChange={e => set('currency', e.target.value)}>
                {['PKR','USD','EUR','GBP'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">Amount <span className="text-red-500">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">{form.currency}</span>
              <Input type="number" min="0" placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)}
                className={`pl-12 ${errors.amount ? 'border-red-400' : ''}`} />
            </div>
            {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">Payment Method</Label>
            <select className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
              value={form.method} onChange={e => set('method', e.target.value)}>
              <option value="">Select method</option>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">Invoice # (optional)</Label>
            <Input placeholder="INV-001" value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">Notes (optional)</Label>
            <textarea className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 resize-none"
              rows={2} placeholder="Any notes about this payment..." value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 p-5 pt-0">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Log Payment'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Change Dropdown ───────────────────────────────────────────────────
function StatusDropdown({ current, onSelect }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[current] || { label: current, dot: 'bg-gray-400', pill: 'bg-gray-100 text-gray-600' };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity hover:opacity-80 ${cfg.pill}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
        <ChevronDown className="h-3 w-3 ml-0.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl border border-gray-200 shadow-xl py-1 min-w-[160px]">
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <button key={key}
                onClick={() => { onSelect(key); setOpen(false); }}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${key === current ? 'font-semibold' : ''}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${val.dot}`} />
                {val.label}
                {key === current && <Check className="h-3 w-3 ml-auto text-gray-400" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const canEdit = isAdmin || (session?.user?.permissions || []).includes('clients.create');

  const [client, setClient] = useState(null);
  const [payments, setPayments] = useState([]);
  const [totalReceived, setTotalReceived] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const fetchClient = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/clients/${id}`);
      setClient(res.data);
      setPayments(res.data.payments || []);
      setTotalReceived(res.data.total_received || 0);
    } catch {
      toast({ title: 'Failed to load client', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  const handleStatusChange = async (newStatus) => {
    setStatusSaving(true);
    try {
      await axios.patch(`/api/clients/${id}`, { status: newStatus });
      setClient(c => ({ ...c, status: newStatus }));
      toast({ title: `Status updated to ${STATUS_CONFIG[newStatus]?.label}` });
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    } finally { setStatusSaving(false); }
  };

  const handlePaymentAdded = (payment) => {
    const newPayments = [payment, ...payments];
    setPayments(newPayments);
    const newTotal = newPayments.reduce((s, p) => s + (p.amount || 0), 0);
    setTotalReceived(newTotal);
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm('Delete this payment record?')) return;
    try {
      await axios.delete(`/api/clients/${id}/payments?paymentId=${paymentId}`);
      const newPayments = payments.filter(p => p._id !== paymentId);
      setPayments(newPayments);
      setTotalReceived(newPayments.reduce((s, p) => s + (p.amount || 0), 0));
      toast({ title: 'Payment removed' });
    } catch {
      toast({ title: 'Failed to delete payment', variant: 'destructive' });
    }
  };

  if (loading) return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Client" subtitle="Loading..." />
      <div className="flex-1 p-6 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  if (!client) return (
    <div className="flex flex-col flex-1 items-center justify-center gap-4">
      <AlertCircle className="h-10 w-10 text-gray-300" />
      <p className="text-gray-400">Client not found.</p>
      <Button variant="outline" onClick={() => router.push('/clients')}>Back to Clients</Button>
    </div>
  );

  const outstanding = (client.contract_value || 0) - totalReceived;
  const paidPercent = client.contract_value > 0 ? Math.min(100, Math.round((totalReceived / client.contract_value) * 100)) : 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title={client.brand_name}
        subtitle={`${client.client_type} · ${client.industry}`}
      />

      <div className="flex-1 overflow-auto p-4 md:p-6">

        {/* Top bar — back + status + actions */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <Button variant="ghost" size="sm" onClick={() => router.push('/clients')} className="text-gray-500 hover:text-gray-800 -ml-1">
            <ArrowLeft className="h-4 w-4 mr-1" /> Clients
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            {canEdit && (
              <StatusDropdown current={client.status} onSelect={handleStatusChange} />
            )}
            {!canEdit && <StatusBadge status={client.status} />}
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => router.push(`/clients/${id}/edit`)} className="h-8">
                <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit
              </Button>
            )}
          </div>
        </div>

        {/* Client hero card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-lg shadow-red-100">
              {client.brand_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{client.brand_name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{client.contact_name}{client.contact_designation ? ` · ${client.contact_designation}` : ''}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(client.services || []).slice(0, 6).map(s => <ServiceTag key={s} service={s} />)}
              </div>
            </div>
            {/* Quick contact pills */}
            <div className="hidden md:flex flex-col gap-1.5">
              {client.phone && (
                <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors">
                  <Phone className="h-3.5 w-3.5" /> {client.phone}
                </a>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors">
                  <Mail className="h-3.5 w-3.5" /> {client.email}
                </a>
              )}
              {client.location && (
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <MapPin className="h-3.5 w-3.5" /> {client.location}
                </span>
              )}
            </div>
          </div>

          {/* Financial summary strip */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Contract Value</p>
                <p className="text-base font-bold text-gray-800 mt-0.5">{fmtCurrency(client.contract_value, client.currency)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Received</p>
                <p className="text-base font-bold text-emerald-600 mt-0.5">{fmtCurrency(totalReceived, client.currency)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Outstanding</p>
                <p className={`text-base font-bold mt-0.5 ${outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {outstanding > 0 ? fmtCurrency(outstanding, client.currency) : 'Fully Paid'}
                </p>
              </div>
            </div>
          )}
          {isAdmin && client.contract_value > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Payment Progress</span><span>{paidPercent}% paid</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${paidPercent >= 100 ? 'bg-emerald-400' : 'bg-red-500'}`}
                  style={{ width: `${paidPercent}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-200">
          {TABS.map(tab => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Client Info" icon={User}>
              <InfoRow label="Brand Name" value={client.brand_name} />
              <InfoRow label="Client Type" value={client.client_type} />
              <InfoRow label="Industry" value={client.industry} />
              <InfoRow label="Contact Person" value={client.contact_name} />
              {client.contact_designation && <InfoRow label="Designation" value={client.contact_designation} />}
              <InfoRow label="Phone" value={client.phone} />
              {client.alt_phone && <InfoRow label="Alt Phone" value={client.alt_phone} />}
              {client.email && <InfoRow label="Email" value={client.email} />}
              {client.location && <InfoRow label="Location" value={client.location} />}
              {client.website && (
                <div className="flex items-start gap-2 py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400 w-36 flex-shrink-0 pt-0.5">Website</span>
                  <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-red-600 hover:underline flex items-center gap-1 flex-1">
                    {client.website} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Acquisition" icon={TrendingUp}>
              <InfoRow label="Lead Source" value={client.lead_source} />
              {client.lead_source_detail && <InfoRow label="Source Detail" value={client.lead_source_detail} />}
              {client.referred_by && <InfoRow label="Referred By" value={client.referred_by} />}
              <InfoRow label="Sales Person" value={client.sales_person_id?.name} />
              <InfoRow label="Conversion Date" value={fmt(client.conversion_date)} />
              {client.original_lead_date && <InfoRow label="Original Lead Date" value={fmt(client.original_lead_date)} />}
              {client.how_client_found_us && <InfoRow label="How Found Us" value={client.how_client_found_us} />}
              <InfoRow label="Status" value={<StatusBadge status={client.status} />} />
              <InfoRow label="Member Since" value={fmt(client.createdAt)} />
            </SectionCard>
          </div>
        )}

        {/* ── PROJECT TAB ── */}
        {activeTab === 'Project' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Project Details" icon={Briefcase}>
              <InfoRow label="Project Title" value={client.project_title} />
              <InfoRow label="Project Type" value={client.project_type} />
              <InfoRow label="Project Status" value={
                client.project_status ? (
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${PROJECT_STATUS_CONFIG[client.project_status] || 'bg-gray-50 text-gray-600'}`}>
                    {client.project_status}
                  </span>
                ) : null
              } />
              <InfoRow label="Priority" value={client.priority} />
              <InfoRow label="Contract Start" value={fmt(client.contract_start_date)} />
              {client.contract_end_date && <InfoRow label="Contract End" value={fmt(client.contract_end_date)} />}
              {client.delivery_date && <InfoRow label="Delivery Date" value={fmt(client.delivery_date)} />}
            </SectionCard>

            <div className="space-y-4">
              <SectionCard title="Services" icon={Tag}>
                <div className="flex flex-wrap gap-2">
                  {(client.services || []).length > 0
                    ? client.services.map(s => <ServiceTag key={s} service={s} />)
                    : <p className="text-sm text-gray-300">No services listed</p>
                  }
                </div>
              </SectionCard>

              {client.project_description && (
                <SectionCard title="Project Description" icon={FileText}>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{client.project_description}</p>
                </SectionCard>
              )}

              {client.timeline_notes && (
                <SectionCard title="Timeline Notes" icon={Clock}>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{client.timeline_notes}</p>
                </SectionCard>
              )}

              {client.internal_notes && (
                <SectionCard title="Internal Notes" icon={FileText}>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{client.internal_notes}</p>
                </SectionCard>
              )}
            </div>
          </div>
        )}

        {/* ── TEAM TAB ── */}
        {activeTab === 'Team' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Key Roles" icon={Users}>
              {client.pm_employee_id ? (
                <InfoRow label="Project Manager"
                  value={`${client.pm_employee_id.firstName || ''} ${client.pm_employee_id.lastName || ''}`.trim()} />
              ) : <InfoRow label="Project Manager" value={null} />}
              {client.account_manager_id ? (
                <InfoRow label="Account Manager"
                  value={`${client.account_manager_id.firstName || ''} ${client.account_manager_id.lastName || ''}`.trim()} />
              ) : <InfoRow label="Account Manager" value={null} />}
              <InfoRow label="Sales Person" value={client.sales_person_id?.name} />
            </SectionCard>

            <SectionCard title="Departments Involved" icon={Building2}>
              <div className="flex flex-wrap gap-2">
                {(client.departments_involved || []).length > 0
                  ? client.departments_involved.map(d => (
                    <span key={d._id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color || '#9ca3af' }} />
                      {d.name}
                    </span>
                  ))
                  : <p className="text-sm text-gray-300">No departments assigned</p>
                }
              </div>
            </SectionCard>

            {(client.team_members || []).length > 0 && (
              <SectionCard title="Team Members" icon={Users}>
                <div className="space-y-2">
                  {client.team_members.map(m => (
                    <div key={m._id} className="flex items-center gap-3 py-1.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                        {(m.firstName?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {`${m.firstName || ''} ${m.lastName || ''}`.trim() || '—'}
                        </p>
                        {m.designation && <p className="text-xs text-gray-400">{m.designation}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {/* ── FINANCIALS TAB ── */}
        {activeTab === 'Financials' && (
          <div className="space-y-4">
            {/* Contract summary */}
            {isAdmin && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Contract Value', value: fmtCurrency(client.contract_value, client.currency), color: 'text-gray-800' },
                  { label: 'Total Received', value: fmtCurrency(totalReceived, client.currency), color: 'text-emerald-600' },
                  { label: 'Outstanding', value: outstanding > 0 ? fmtCurrency(outstanding, client.currency) : 'Fully Paid', color: outstanding > 0 ? 'text-red-600' : 'text-emerald-600' },
                  { label: 'Payment Terms', value: client.payment_terms, color: 'text-gray-800' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{label}</p>
                    <p className={`text-base font-bold mt-1 ${color}`}>{value || '—'}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Advance paid */}
            {isAdmin && client.advance_paid > 0 && (
              <SectionCard title="Advance Details" icon={CreditCard}>
                <InfoRow label="Advance Paid" value={fmtCurrency(client.advance_paid, client.currency)} accent />
                {client.advance_date && <InfoRow label="Advance Date" value={fmt(client.advance_date)} />}
              </SectionCard>
            )}

            {/* Payment log */}
            <SectionCard title="Payment History"
              icon={Activity}
              action={canEdit && (
                <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600 hover:bg-red-50"
                  onClick={() => setShowPaymentModal(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Log Payment
                </Button>
              )}>
              {payments.length === 0 ? (
                <div className="text-center py-10">
                  <DollarSign className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No payments logged yet</p>
                  {canEdit && (
                    <Button size="sm" className="mt-3 bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => setShowPaymentModal(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Log First Payment
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-2 text-xs font-semibold text-gray-400">Date</th>
                        <th className="text-left px-5 py-2 text-xs font-semibold text-gray-400">Amount</th>
                        <th className="text-left px-5 py-2 text-xs font-semibold text-gray-400 hidden sm:table-cell">Method</th>
                        <th className="text-left px-5 py-2 text-xs font-semibold text-gray-400 hidden md:table-cell">Invoice #</th>
                        <th className="text-left px-5 py-2 text-xs font-semibold text-gray-400 hidden lg:table-cell">Logged By</th>
                        <th className="text-left px-5 py-2 text-xs font-semibold text-gray-400 hidden lg:table-cell">Notes</th>
                        {isAdmin && <th className="px-5 py-2" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {payments.map(p => (
                        <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 text-xs text-gray-600">{fmt(p.payment_date)}</td>
                          <td className="px-5 py-3 font-semibold text-emerald-600">{fmtCurrency(p.amount, p.currency)}</td>
                          <td className="px-5 py-3 text-xs text-gray-500 hidden sm:table-cell">{p.method || '—'}</td>
                          <td className="px-5 py-3 text-xs text-gray-500 hidden md:table-cell">{p.invoice_number || '—'}</td>
                          <td className="px-5 py-3 text-xs text-gray-500 hidden lg:table-cell">{p.logged_by?.name || '—'}</td>
                          <td className="px-5 py-3 text-xs text-gray-400 hidden lg:table-cell max-w-[180px] truncate">{p.notes || '—'}</td>
                          {isAdmin && (
                            <td className="px-5 py-3">
                              <button onClick={() => handleDeletePayment(p._id)}
                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 bg-gray-50/50">
                        <td className="px-5 py-2 text-xs font-semibold text-gray-500">Total</td>
                        <td className="px-5 py-2 text-sm font-bold text-emerald-600">{fmtCurrency(totalReceived, client.currency)}</td>
                        <td colSpan={5} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* ── SOCIAL LINKS TAB ── */}
        {activeTab === 'Social Links' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Social & Ad Accounts" icon={Link2}>
              {[
                { label: 'Facebook Page', key: 'facebook' },
                { label: 'Instagram', key: 'instagram' },
                { label: 'Google Business', key: 'google_business' },
                { label: 'Meta Ad Account', key: 'meta_ad_account_id' },
                { label: 'Google Ads Account', key: 'google_ads_account_id' },
                { label: 'Website / Campaign', key: 'website_campaign' },
                { label: 'Other Links', key: 'other_links' },
              ].map(({ label, key }) => {
                const val = client.social_links?.[key];
                if (!val) return <InfoRow key={key} label={label} value={null} />;
                const isUrl = val.startsWith('http') || val.includes('.');
                return (
                  <div key={key} className="flex items-start gap-2 py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-400 w-40 flex-shrink-0 pt-0.5">{label}</span>
                    {isUrl ? (
                      <a href={val.startsWith('http') ? val : `https://${val}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-red-600 hover:underline flex items-center gap-1 flex-1 min-w-0 truncate">
                        {val} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-sm font-medium text-gray-800 flex-1">{val}</span>
                    )}
                  </div>
                );
              })}
            </SectionCard>
          </div>
        )}

      </div>

      {/* Add Payment Modal */}
      {showPaymentModal && (
        <AddPaymentModal
          clientId={id}
          currency={client.currency}
          onClose={() => setShowPaymentModal(false)}
          onAdded={handlePaymentAdded}
        />
      )}
    </div>
  );
}
