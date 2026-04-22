'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import {
  ArrowLeft, ArrowRight, Check, Save,
  UserCircle, Megaphone, FolderOpen, Users, DollarSign,
  AlertCircle,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { PhoneInputField } from '@/components/ui/phone-input';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────
const CLIENT_TYPES     = ['Business', 'Individual', 'Startup', 'Enterprise', 'NGO'];
const INDUSTRIES       = ['E-commerce', 'Real Estate', 'Food & Restaurant', 'Education', 'Fashion', 'Healthcare', 'Construction', 'Technology', 'Finance', 'Travel', 'Beauty & Salon', 'Fitness', 'Automotive', 'Retail', 'Other'];
const LEAD_SOURCES     = ['Facebook Organic', 'Instagram DM', 'Google Ads', 'Meta Ads', 'Referral', 'Cold Call', 'Walk-in', 'LinkedIn', 'Website Form', 'WhatsApp', 'Other'];
const SERVICES         = ['SMM', 'SEO', 'Google Ads', 'Meta Ads', 'Web Development', 'Graphic Design', 'Video Editing', 'Flutter App', 'CRM', 'GMB', 'Content Writing', 'Other'];
const PROJECT_TYPES    = ['One-time Project', 'Monthly Retainer', 'Quarterly', 'Annual Contract'];
const PROJECT_STATUSES = ['Planning', 'Active', 'On Hold', 'Under Review', 'Completed', 'Cancelled'];
const PRIORITIES       = ['High', 'Normal', 'Low'];
const PAYMENT_TERMS    = ['Monthly', 'Milestone-based', 'Upfront', '50-50', 'Custom'];
const CURRENCIES       = ['PKR', 'USD', 'EUR', 'GBP'];
const CLIENT_STATUSES  = [
  { value: 'active',           label: 'Active' },
  { value: 'on_hold',          label: 'On Hold' },
  { value: 'under_review',     label: 'Under Review' },
  { value: 'trial',            label: 'Trial / Pilot' },
  { value: 'completed',        label: 'Completed' },
  { value: 'churned',          label: 'Churned' },
  { value: 'potential_upsell', label: 'Potential Upsell' },
];

const STEPS = [
  { id: 0, label: 'Client Info', icon: UserCircle },
  { id: 1, label: 'Acquisition', icon: Megaphone },
  { id: 2, label: 'Project',     icon: FolderOpen },
  { id: 3, label: 'Team',        icon: Users },
  { id: 4, label: 'Contract',    icon: DollarSign },
];

function toDateInput(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return '';
  return date.toISOString().slice(0, 10);
}

function extractId(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val._id || val.id || String(val);
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, required, error, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EditClientPage() {
  const { id } = useParams();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [customIndustry, setCustomIndustry] = useState('');
  const [showCustomIndustry, setShowCustomIndustry] = useState(false);

  const [form, setForm] = useState(null);

  // Load client + reference data
  useEffect(() => {
    Promise.all([
      axios.get(`/api/clients/${id}`),
      axios.get('/api/users'),
      axios.get('/api/hr/departments'),
      axios.get('/api/hr/employees?limit=200'),
    ]).then(([c, u, d, e]) => {
      const cl = c.data;

      const knownIndustries = INDUSTRIES;
      const isCustom = cl.industry && !knownIndustries.includes(cl.industry);
      if (isCustom) {
        setShowCustomIndustry(true);
        setCustomIndustry(cl.industry);
      }

      setForm({
        brand_name:          cl.brand_name || '',
        client_type:         cl.client_type || '',
        industry:            isCustom ? '' : (cl.industry || ''),
        contact_name:        cl.contact_name || '',
        contact_designation: cl.contact_designation || '',
        phone:               cl.phone || '',
        alt_phone:           cl.alt_phone || '',
        email:               cl.email || '',
        location:            cl.location || '',
        website:             cl.website || '',

        lead_source:         cl.lead_source || '',
        lead_source_detail:  cl.lead_source_detail || '',
        referred_by:         cl.referred_by || '',
        sales_person_id:     extractId(cl.sales_person_id),
        original_lead_date:  toDateInput(cl.original_lead_date),
        conversion_date:     toDateInput(cl.conversion_date),
        how_client_found_us: cl.how_client_found_us || '',

        services:             cl.services || [],
        project_title:        cl.project_title || '',
        project_description:  cl.project_description || '',
        project_type:         cl.project_type || '',
        contract_start_date:  toDateInput(cl.contract_start_date),
        contract_end_date:    toDateInput(cl.contract_end_date),
        delivery_date:        toDateInput(cl.delivery_date),
        timeline_notes:       cl.timeline_notes || '',
        priority:             cl.priority || 'Normal',
        project_status:       cl.project_status || 'Planning',
        internal_notes:       cl.internal_notes || '',

        departments_involved: (cl.departments_involved || []).map(extractId),
        pm_employee_id:       extractId(cl.pm_employee_id),
        account_manager_id:   extractId(cl.account_manager_id),
        team_members:         (cl.team_members || []).map(extractId),

        contract_value:   cl.contract_value ?? '',
        currency:         cl.currency || 'PKR',
        monthly_retainer: cl.monthly_retainer ?? '',
        payment_terms:    cl.payment_terms || '',
        advance_paid:     cl.advance_paid ?? '',
        advance_date:     toDateInput(cl.advance_date),

        social_links: {
          facebook:             cl.social_links?.facebook || '',
          instagram:            cl.social_links?.instagram || '',
          google_business:      cl.social_links?.google_business || '',
          meta_ad_account_id:   cl.social_links?.meta_ad_account_id || '',
          google_ads_account_id:cl.social_links?.google_ads_account_id || '',
          website_campaign:     cl.social_links?.website_campaign || '',
          other_links:          cl.social_links?.other_links || '',
        },
        status: cl.status || 'active',
      });

      setUsers(Array.isArray(u.data) ? u.data : u.data?.users || []);
      setDepartments(d.data || []);
      setEmployees(
        (e.data.employees || e.data || []).map(emp => ({
          ...emp,
          name: `${emp.firstName} ${emp.lastName}`.trim(),
        }))
      );
    }).catch(() => {
      toast({ title: 'Failed to load client', variant: 'destructive' });
      router.push('/clients');
    }).finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSocial = (k, v) => setForm(f => ({ ...f, social_links: { ...f.social_links, [k]: v } }));

  const toggleService = (s) => {
    set('services', form.services.includes(s)
      ? form.services.filter(x => x !== s)
      : [...form.services, s]);
    if (errors.services) setErrors(e => ({ ...e, services: undefined }));
  };

  const toggleDept = (did) => {
    set('departments_involved', form.departments_involved.includes(did)
      ? form.departments_involved.filter(x => x !== did)
      : [...form.departments_involved, did]);
    if (errors.departments_involved) setErrors(e => ({ ...e, departments_involved: undefined }));
  };

  const toggleTeamMember = (mid) => {
    set('team_members', form.team_members.includes(mid)
      ? form.team_members.filter(x => x !== mid)
      : [...form.team_members, mid]);
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => { setErrors({}); setStep(s => s - 1); };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        industry: showCustomIndustry ? customIndustry : form.industry,
        contract_value:   form.contract_value !== '' ? Number(form.contract_value) : null,
        monthly_retainer: form.monthly_retainer !== '' ? Number(form.monthly_retainer) : null,
        advance_paid:     form.advance_paid !== '' ? Number(form.advance_paid) : null,
        original_lead_date: form.original_lead_date || null,
        contract_end_date:  form.contract_end_date || null,
        delivery_date:      form.delivery_date || null,
        advance_date:       form.advance_date || null,
        pm_employee_id:       form.pm_employee_id || null,
        account_manager_id:   form.account_manager_id || null,
      };
      await axios.patch(`/api/clients/${id}`, payload);
      toast({ title: 'Client updated successfully' });
      router.push(`/clients/${id}`);
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Failed to update client', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (field) => cn('h-9', errors[field] && 'border-red-400 focus-visible:ring-red-400');

  if (loading || !form) return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Edit Client" subtitle="Loading..." />
      <div className="flex-1 p-6 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  // ── Steps ──────────────────────────────────────────────────────────────────
  const Step0 = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-gray-400" /> Client Identity & Contact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Client / Brand Name" required error={errors.brand_name}>
            <Input className={inputCls('brand_name')} value={form.brand_name}
              onChange={e => { set('brand_name', e.target.value); setErrors(x => ({...x, brand_name: undefined})); }}
              placeholder="e.g. Ali Electronics" />
          </Field>

          <Field label="Client Type" required error={errors.client_type}>
            <Select value={form.client_type} onValueChange={v => { set('client_type', v); setErrors(x => ({...x, client_type: undefined})); }}>
              <SelectTrigger className={inputCls('client_type')}><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{CLIENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <Field label="Industry / Niche" required error={errors.industry}>
            {!showCustomIndustry ? (
              <div className="flex gap-2">
                <Select value={form.industry} onValueChange={v => { set('industry', v); setErrors(x => ({...x, industry: undefined})); }}>
                  <SelectTrigger className={cn('h-9 flex-1', errors.industry && 'border-red-400')}><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" className="h-9 px-2 text-xs"
                  onClick={() => setShowCustomIndustry(true)}>Custom</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input className={cn('h-9 flex-1', errors.industry && 'border-red-400')} value={customIndustry}
                  onChange={e => { setCustomIndustry(e.target.value); setErrors(x => ({...x, industry: undefined})); }}
                  placeholder="Type your industry..." />
                <Button type="button" variant="ghost" size="sm" className="h-9 px-2 text-xs"
                  onClick={() => { setShowCustomIndustry(false); setCustomIndustry(''); }}>List</Button>
              </div>
            )}
          </Field>

          <Field label="Client Status">
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{CLIENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <Field label="Contact Person Name" required error={errors.contact_name}>
            <Input className={inputCls('contact_name')} value={form.contact_name}
              onChange={e => { set('contact_name', e.target.value); setErrors(x => ({...x, contact_name: undefined})); }}
              placeholder="Owner / Manager name" />
          </Field>

          <Field label="Designation of Contact">
            <Input className="h-9" value={form.contact_designation}
              onChange={e => set('contact_designation', e.target.value)}
              placeholder="CEO, Owner, Marketing Manager" />
          </Field>

          <Field label="Phone Number" required error={errors.phone}>
            <div className={cn(errors.phone && 'rounded-md ring-1 ring-red-400')}>
              <PhoneInputField value={form.phone}
                onChange={v => { set('phone', v || ''); setErrors(x => ({...x, phone: undefined})); }}
                placeholder="Primary contact number" />
            </div>
          </Field>

          <Field label="Alternative Phone">
            <PhoneInputField value={form.alt_phone}
              onChange={v => set('alt_phone', v || '')}
              placeholder="Secondary number (optional)" />
          </Field>

          <Field label="Email Address">
            <Input type="email" className="h-9" value={form.email}
              onChange={e => set('email', e.target.value)} placeholder="client@example.com" />
          </Field>

          <Field label="Location">
            <Input className="h-9" value={form.location}
              onChange={e => set('location', e.target.value)} placeholder="Karachi, Lahore, Dubai..." />
          </Field>

          <Field label="Client Website">
            <Input className="h-9" value={form.website}
              onChange={e => set('website', e.target.value)} placeholder="https://clientsite.com" />
          </Field>
        </div>
      </CardContent>
    </Card>
  );

  const Step1 = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-gray-400" /> Acquisition Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Lead Source" required error={errors.lead_source}>
            <Select value={form.lead_source} onValueChange={v => { set('lead_source', v); setErrors(x => ({...x, lead_source: undefined})); }}>
              <SelectTrigger className={inputCls('lead_source')}><SelectValue placeholder="How did they come?" /></SelectTrigger>
              <SelectContent>{LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <Field label="Lead Source Detail">
            <Input className="h-9" value={form.lead_source_detail}
              onChange={e => set('lead_source_detail', e.target.value)}
              placeholder="Which post, which referrer..." />
          </Field>

          <Field label="Referred By">
            <Input className="h-9" value={form.referred_by}
              onChange={e => set('referred_by', e.target.value)}
              placeholder="Person who referred (if any)" />
          </Field>

          <Field label="Assigned Sales Person" required error={errors.sales_person_id}>
            <Select value={form.sales_person_id} onValueChange={v => { set('sales_person_id', v); setErrors(x => ({...x, sales_person_id: undefined})); }}>
              <SelectTrigger className={inputCls('sales_person_id')}><SelectValue placeholder="Select team member" /></SelectTrigger>
              <SelectContent>
                {users.map(u => <SelectItem key={u._id} value={u._id}>{u.name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Original Lead Date">
            <Input type="date" className="h-9" value={form.original_lead_date}
              onChange={e => set('original_lead_date', e.target.value)} />
          </Field>

          <Field label="Conversion Date" required error={errors.conversion_date}>
            <Input type="date" className={inputCls('conversion_date')} value={form.conversion_date}
              onChange={e => { set('conversion_date', e.target.value); setErrors(x => ({...x, conversion_date: undefined})); }} />
          </Field>
        </div>

        <Field label="How Client Found Us">
          <textarea className="w-full min-h-[80px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.how_client_found_us}
            onChange={e => set('how_client_found_us', e.target.value)}
            placeholder="In the client's own words — how did they hear about us?" />
        </Field>
      </CardContent>
    </Card>
  );

  const Step2 = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-gray-400" /> Project & Services
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Field label="Services Subscribed" required error={errors.services}>
          <div className={cn('flex flex-wrap gap-2 p-3 border rounded-md bg-gray-50/50', errors.services && 'border-red-400')}>
            {SERVICES.map(s => (
              <button key={s} type="button" onClick={() => toggleService(s)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  form.services.includes(s)
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600'
                )}>
                {s}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Project Title / Name" required error={errors.project_title} className="sm:col-span-2">
            <Input className={inputCls('project_title')} value={form.project_title}
              onChange={e => { set('project_title', e.target.value); setErrors(x => ({...x, project_title: undefined})); }}
              placeholder="e.g. Ali Electronics SEO + Meta Ads" />
          </Field>

          <Field label="Project Type" required error={errors.project_type}>
            <Select value={form.project_type} onValueChange={v => { set('project_type', v); setErrors(x => ({...x, project_type: undefined})); }}>
              <SelectTrigger className={inputCls('project_type')}><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <Field label="Project Status" required error={errors.project_status}>
            <Select value={form.project_status} onValueChange={v => { set('project_status', v); setErrors(x => ({...x, project_status: undefined})); }}>
              <SelectTrigger className={inputCls('project_status')}><SelectValue /></SelectTrigger>
              <SelectContent>{PROJECT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <Field label="Contract Start Date" required error={errors.contract_start_date}>
            <Input type="date" className={inputCls('contract_start_date')} value={form.contract_start_date}
              onChange={e => { set('contract_start_date', e.target.value); setErrors(x => ({...x, contract_start_date: undefined})); }} />
          </Field>

          <Field label="Contract End Date">
            <Input type="date" className="h-9" value={form.contract_end_date}
              onChange={e => set('contract_end_date', e.target.value)} />
          </Field>

          <Field label="Expected Delivery Date">
            <Input type="date" className="h-9" value={form.delivery_date}
              onChange={e => set('delivery_date', e.target.value)} />
          </Field>

          <Field label="Priority Level">
            <Select value={form.priority} onValueChange={v => set('priority', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Project Description" required error={errors.project_description}>
          <textarea className={cn('w-full min-h-[90px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring', errors.project_description && 'border-red-400')}
            value={form.project_description}
            onChange={e => { set('project_description', e.target.value); setErrors(x => ({...x, project_description: undefined})); }}
            placeholder="Detailed brief: what needs to be done, client's goals, deliverables..." />
        </Field>

        <Field label="Timeline Notes">
          <textarea className="w-full min-h-[60px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.timeline_notes}
            onChange={e => set('timeline_notes', e.target.value)}
            placeholder="Milestones, phases, key dates..." />
        </Field>

        <Field label="Internal Notes (Not visible to client)">
          <textarea className="w-full min-h-[60px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-amber-50/40"
            value={form.internal_notes}
            onChange={e => set('internal_notes', e.target.value)}
            placeholder="Internal-only remarks..." />
        </Field>
      </CardContent>
    </Card>
  );

  const Step3 = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" /> Department & Team Assignment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Field label="Departments Involved" required error={errors.departments_involved}>
          <div className={cn('flex flex-wrap gap-2 p-3 border rounded-md bg-gray-50/50', errors.departments_involved && 'border-red-400')}>
            {departments.length === 0 && <p className="text-xs text-gray-400">No departments found</p>}
            {departments.map(d => (
              <button key={d._id} type="button" onClick={() => toggleDept(d._id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  form.departments_involved.includes(d._id)
                    ? 'bg-gray-800 text-white border-gray-800 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-500'
                )}>
                {d.name}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Project Manager / Lead">
            <Select value={form.pm_employee_id || '_none'} onValueChange={v => set('pm_employee_id', v === '_none' ? '' : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select PM" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— None —</SelectItem>
                {employees.map(e => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Account Manager">
            <Select value={form.account_manager_id || '_none'} onValueChange={v => set('account_manager_id', v === '_none' ? '' : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select AM" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— None —</SelectItem>
                {employees.map(e => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Assigned Team Members">
          <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-gray-50/50 min-h-[52px]">
            {employees.length === 0 && <p className="text-xs text-gray-400">No employees loaded</p>}
            {employees.map(e => (
              <button key={e._id} type="button" onClick={() => toggleTeamMember(e._id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                  form.team_members.includes(e._id)
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                )}>
                <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold">
                  {e.name?.charAt(0)}
                </span>
                {e.name}
              </button>
            ))}
          </div>
          {form.team_members.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{form.team_members.length} member{form.team_members.length > 1 ? 's' : ''} selected</p>
          )}
        </Field>
      </CardContent>
    </Card>
  );

  const Step4 = (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            Financial & Contract Details
            <span className="ml-auto text-xs font-normal bg-red-50 text-red-600 px-2 py-0.5 rounded">Restricted</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            This section is visible only to Admin, CEO, Sales Manager, and HR/Finance.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Contract Value (Total)" required error={errors.contract_value}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">{form.currency}</span>
                <Input type="number" min="0" step="0.01"
                  className={cn('h-9 pl-12', errors.contract_value && 'border-red-400')}
                  value={form.contract_value}
                  onChange={e => { set('contract_value', e.target.value); setErrors(x => ({...x, contract_value: undefined})); }}
                  placeholder="0" />
              </div>
            </Field>

            <Field label="Currency" required error={errors.currency}>
              <Select value={form.currency} onValueChange={v => set('currency', v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            <Field label="Monthly Retainer Amount">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">{form.currency}</span>
                <Input type="number" min="0" step="0.01" className="h-9 pl-12"
                  value={form.monthly_retainer}
                  onChange={e => set('monthly_retainer', e.target.value)} placeholder="0" />
              </div>
            </Field>

            <Field label="Payment Terms" required error={errors.payment_terms}>
              <Select value={form.payment_terms} onValueChange={v => { set('payment_terms', v); setErrors(x => ({...x, payment_terms: undefined})); }}>
                <SelectTrigger className={inputCls('payment_terms')}><SelectValue placeholder="Select terms" /></SelectTrigger>
                <SelectContent>{PAYMENT_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            <Field label="Advance Paid">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">{form.currency}</span>
                <Input type="number" min="0" step="0.01" className="h-9 pl-12"
                  value={form.advance_paid}
                  onChange={e => set('advance_paid', e.target.value)} placeholder="0" />
              </div>
            </Field>

            <Field label="Advance Date">
              <Input type="date" className="h-9" value={form.advance_date}
                onChange={e => set('advance_date', e.target.value)} />
            </Field>
          </div>

          {form.contract_value > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
                <p className="text-xs text-emerald-600 font-medium mb-0.5">Contract Value</p>
                <p className="text-lg font-bold text-emerald-700">{form.currency} {Number(form.contract_value).toLocaleString()}</p>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-center">
                <p className="text-xs text-orange-600 font-medium mb-0.5">Outstanding (after advance)</p>
                <p className="text-lg font-bold text-orange-700">
                  {form.currency} {(Number(form.contract_value) - Number(form.advance_paid || 0)).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gray-700">Social & Ad Account Links <span className="font-normal text-gray-400 text-sm">(optional)</span></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'facebook',              label: 'Facebook Page URL',      placeholder: 'facebook.com/page' },
              { key: 'instagram',             label: 'Instagram Profile URL',  placeholder: 'instagram.com/handle' },
              { key: 'google_business',       label: 'Google Business Profile', placeholder: 'g.co/kgs/...' },
              { key: 'meta_ad_account_id',    label: 'Meta Ad Account ID',     placeholder: 'act_XXXXXXXXXX' },
              { key: 'google_ads_account_id', label: 'Google Ads Account ID',  placeholder: '123-456-7890' },
              { key: 'website_campaign',      label: 'Website / Landing Page', placeholder: 'https://...' },
            ].map(({ key, label, placeholder }) => (
              <Field key={key} label={label}>
                <Input className="h-9" value={form.social_links[key]}
                  onChange={e => setSocial(key, e.target.value)} placeholder={placeholder} />
              </Field>
            ))}
            <Field label="Other Platform Links" className="sm:col-span-2">
              <textarea className="w-full min-h-[60px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.social_links.other_links}
                onChange={e => setSocial('other_links', e.target.value)}
                placeholder="YouTube, TikTok, LinkedIn, or any other relevant links..." />
            </Field>
          </div>
        </CardContent>
      </Card>
    </>
  );

  const STEP_CONTENT = [Step0, Step1, Step2, Step3, Step4];

  return (
    <>
      <Header title={`Edit: ${form.brand_name || 'Client'}`} subtitle="Update client information across all sections" />
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
                  <button type="button"
                    onClick={() => { setErrors({}); setStep(s.id); }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium',
                      active ? 'bg-red-600 text-white shadow-sm' :
                      done   ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer' :
                               'bg-gray-100 text-gray-400 hover:bg-gray-200 cursor-pointer'
                    )}>
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={cn('flex-1 h-0.5 mx-1', done ? 'bg-emerald-300' : 'bg-gray-200')} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="space-y-4">
            {STEP_CONTENT[step]}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pb-6">
            <div className="flex gap-2">
              <Link href={`/clients/${id}`}>
                <Button variant="outline" size="sm" type="button">
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Cancel
                </Button>
              </Link>
              {step > 0 && (
                <Button variant="outline" size="sm" type="button" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                </Button>
              )}
            </div>
            <div>
              {step < STEPS.length - 1 ? (
                <Button size="sm" type="button" onClick={handleNext} className="bg-red-600 hover:bg-red-700 text-white">
                  Next <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              ) : (
                <Button size="sm" type="button" onClick={handleSubmit} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
                  {saving ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-1.5" />Save Changes</>
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
