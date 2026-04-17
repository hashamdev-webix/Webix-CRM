'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import {
  ArrowLeft, Edit3, User, Briefcase, DollarSign, FileText,
  Activity, LogOut, Phone, Mail, Building2, Calendar, Save,
  X, Upload, Trash2, Eye, Download, Check, History, Plus,
  MapPin, AlertCircle, TrendingUp, Users, Clock,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/use-permission';
import { PhoneInputField } from '@/components/ui/phone-input';

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active:     { label: 'Active',     dot: 'bg-emerald-400', pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', glow: 'shadow-emerald-200' },
  on_leave:   { label: 'On Leave',   dot: 'bg-amber-400',   pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',   glow: 'shadow-amber-200' },
  inactive:   { label: 'Inactive',   dot: 'bg-gray-400',    pill: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',    glow: 'shadow-gray-200' },
  terminated: { label: 'Terminated', dot: 'bg-red-500',     pill: 'bg-red-50 text-red-700 ring-1 ring-red-200',     glow: 'shadow-red-200' },
  resigned:   { label: 'Resigned',   dot: 'bg-orange-400',  pill: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',  glow: 'shadow-orange-200' },
};
const TYPE_LABELS  = { full_time: 'Full-Time', part_time: 'Part-Time', contract: 'Contract', intern: 'Intern' };
const LOC_LABELS   = { office: 'Office', remote: 'Remote', hybrid: 'Hybrid' };
const DOC_LABELS   = { cnic: 'CNIC', contract: 'Contract', education: 'Education', experience: 'Experience', photo: 'Photo', offer_letter: 'Offer Letter', nda: 'NDA', other: 'Other' };
const EXIT_TYPES   = [{ value: 'resignation', label: 'Resignation' }, { value: 'termination', label: 'Termination' }, { value: 'retirement', label: 'Retirement' }, { value: 'contract_end', label: 'Contract End' }];

function fmt(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
function socialHref(u) { return u?.startsWith('http') ? u : `https://${u}`; }

// ── Social SVGs ───────────────────────────────────────────────────────────────
const LIIcon  = () => <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>;
const FBIcon  = () => <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
const IGIcon  = () => <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>;

// ── Small reusable components ─────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-600">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      {children}
    </div>
  );
}
function SelectField({ value, onChange, options, placeholder }) {
  return (
    <select className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-colors" value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function InfoCard({ icon: Icon, label, value, accent }) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border bg-white transition-shadow hover:shadow-sm ${accent || 'border-gray-100'}`}>
      <div className={`p-2 rounded-lg flex-shrink-0 ${accent ? 'bg-red-50' : 'bg-gray-50'}`}>
        <Icon className={`h-4 w-4 ${accent ? 'text-red-500' : 'text-gray-400'}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-gray-800 mt-0.5 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}
function SectionLabel({ children }) {
  return <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-4 h-px bg-gray-300 inline-block" />{children}<span className="flex-1 h-px bg-gray-100 inline-block" /></p>;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ employee, size = 'xl', preview }) {
  const sizes = { xl: 'w-28 h-28 text-3xl', lg: 'w-20 h-20 text-2xl', sm: 'w-10 h-10 text-sm' };
  const sz = sizes[size] || sizes.xl;
  const initials = `${employee?.firstName?.[0] || ''}${employee?.lastName?.[0] || ''}`.toUpperCase();
  const src = preview || (employee?.profilePhoto?.filePath ? `/api/hr/files/${employee.profilePhoto.filePath}` : null);
  if (src) return <img src={src} alt={initials} className={`${sz} rounded-2xl object-cover ring-4 ring-white shadow-xl`} />;
  return <div className={`${sz} rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center font-bold ring-4 ring-white shadow-xl`}>{initials}</div>;
}

// ── Modals ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, width = 'max-w-sm' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${width} mx-4 overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function StatusModal({ current, onClose, onSave }) {
  const [newStatus, setNewStatus] = useState(current);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <Modal title="Change Employee Status" onClose={onClose}>
      <div className="space-y-4">
        <Field label="New Status">
          <SelectField value={newStatus} onChange={setNewStatus} options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} />
        </Field>
        <Field label="Reason">
          <textarea className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 min-h-[90px] resize-none" placeholder="Reason for this change…" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving || newStatus === current} onClick={async () => { setSaving(true); await onSave(newStatus, reason); setSaving(false); }} className="bg-red-600 hover:bg-red-700">
            {saving ? 'Saving…' : 'Update Status'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SalaryModal({ current, onClose, onSave }) {
  const [form, setForm] = useState({ newSalary: current?.salary || '', allowances: current?.allowances || '', deductions: current?.deductions || '', effectiveDate: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const net = (Number(form.newSalary) || 0) + (Number(form.allowances) || 0) - (Number(form.deductions) || 0);
  return (
    <Modal title="Record Salary Revision" onClose={onClose} width="max-w-md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="New Salary (PKR)" required><Input type="number" className="h-9" value={form.newSalary} onChange={(e) => setForm({ ...form, newSalary: e.target.value })} min="0" /></Field>
          <Field label="Allowances (PKR)"><Input type="number" className="h-9" value={form.allowances} onChange={(e) => setForm({ ...form, allowances: e.target.value })} min="0" /></Field>
          <Field label="Deductions (PKR)"><Input type="number" className="h-9" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} min="0" /></Field>
          <Field label="Effective Date" required><Input type="date" className="h-9" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} /></Field>
        </div>
        <Field label="Reason"><Input className="h-9" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Annual increment, promotion…" /></Field>
        {net > 0 && <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-3 flex items-center justify-between"><span className="text-xs font-medium text-emerald-700">Net Salary</span><span className="text-lg font-bold text-emerald-700">PKR {net.toLocaleString()}</span></div>}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving} onClick={async () => { if (!form.newSalary || !form.effectiveDate) { toast({ title: 'Salary and date required', variant: 'destructive' }); return; } setSaving(true); await onSave(form); setSaving(false); }} className="bg-red-600 hover:bg-red-700">{saving ? 'Saving…' : 'Save Revision'}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeeProfilePage() {
  const { id } = useParams();
  const router = useRouter();

  const canEdit         = usePermission('hr.employees.edit');
  const canViewFin      = usePermission('hr.employees.financial');
  const canDocs         = usePermission('hr.employees.documents');
  const canStatus       = usePermission('hr.employees.status');
  const canExit         = usePermission('hr.employees.exit');
  const canDelete       = usePermission('hr.employees.delete');

  const [tab, setTab]   = useState('personal');
  const [emp, setEmp]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [ef, setEf]     = useState({});
  const [saving, setSaving] = useState(false);

  const [statusLogs, setStatusLogs]     = useState([]);
  const [docs, setDocs]                 = useState([]);
  const [salaryHist, setSalaryHist]     = useState([]);
  const [exitRec, setExitRec]           = useState(null);
  const [depts, setDepts]               = useState([]);
  const [allEmps, setAllEmps]           = useState([]);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showExitForm, setShowExitForm]       = useState(false);
  const [exitForm, setExitForm]               = useState({ exitType: 'resignation', exitDate: '', lastWorkingDay: '', noticePeriodDays: 30, noticePeriodWaived: false, exitReason: '', exitInterviewConducted: false, exitInterviewNotes: '' });
  const [uploadingDoc, setUploadingDoc]       = useState(false);
  const [photoFile, setPhotoFile]             = useState(null);
  const [photoPreview, setPhotoPreview]       = useState(null);

  const fetchEmp = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`/api/hr/employees/${id}`);
      setEmp(r.data.employee); setEf(r.data.employee);
    } catch { toast({ title: 'Employee not found', variant: 'destructive' }); router.push('/hr/employees'); }
    finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => { fetchEmp(); }, [fetchEmp]);
  useEffect(() => {
    axios.get('/api/hr/departments').then((r) => setDepts(r.data || [])).catch(() => {});
    axios.get('/api/hr/employees?limit=200').then((r) => setAllEmps(r.data.employees || [])).catch(() => {});
  }, []);
  useEffect(() => {
    if (!emp) return;
    if (tab === 'history') axios.get(`/api/hr/employees/${id}/status`).then((r) => setStatusLogs(r.data || [])).catch(() => {});
    if (tab === 'documents' && canDocs) axios.get(`/api/hr/employees/${id}/documents`).then((r) => setDocs(r.data || [])).catch(() => {});
    if (tab === 'financial' && canViewFin) axios.get(`/api/hr/employees/${id}/salary`).then((r) => setSalaryHist(r.data || [])).catch(() => {});
    if (tab === 'exit' && canExit) axios.get(`/api/hr/employees/${id}/exit`).then((r) => setExitRec(r.data)).catch(() => {});
  }, [tab, emp, id, canDocs, canViewFin, canExit]);

  const saveEdit = async () => {
    setSaving(true);
    try {
      const p = { ...ef }; ['_id','__v','employeeId','createdBy','createdAt','updatedAt'].forEach((k) => delete p[k]);
      await axios.patch(`/api/hr/employees/${id}`, p);
      if (photoFile) { const fd = new FormData(); fd.append('photo', photoFile); await axios.post(`/api/hr/employees/${id}/photo`, fd).catch(() => {}); }
      await fetchEmp(); setEditing(false); setPhotoFile(null); setPhotoPreview(null);
      toast({ title: 'Saved', variant: 'success' });
    } catch { toast({ title: 'Failed to save', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const onStatusChange = async (newStatus, reason) => {
    try {
      await axios.post(`/api/hr/employees/${id}/status`, { newStatus, reason });
      await fetchEmp(); setShowStatusModal(false);
      if (tab === 'history') axios.get(`/api/hr/employees/${id}/status`).then((r) => setStatusLogs(r.data || [])).catch(() => {});
      toast({ title: 'Status updated', variant: 'success' });
    } catch { toast({ title: 'Failed', variant: 'destructive' }); }
  };

  const onSalaryRevision = async (data) => {
    try {
      await axios.post(`/api/hr/employees/${id}/salary`, data);
      await fetchEmp(); setShowSalaryModal(false);
      axios.get(`/api/hr/employees/${id}/salary`).then((r) => setSalaryHist(r.data || [])).catch(() => {});
      toast({ title: 'Revision recorded', variant: 'success' });
    } catch { toast({ title: 'Failed', variant: 'destructive' }); }
  };

  const uploadDoc = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingDoc(true);
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('name', file.name); fd.append('docType', 'other');
      await axios.post(`/api/hr/employees/${id}/documents`, fd);
      const r = await axios.get(`/api/hr/employees/${id}/documents`); setDocs(r.data || []);
      toast({ title: 'Uploaded', variant: 'success' });
    } catch { toast({ title: 'Upload failed', variant: 'destructive' }); }
    finally { setUploadingDoc(false); e.target.value = ''; }
  };

  const deleteDoc = async (docId) => {
    if (!confirm('Delete this document?')) return;
    try { await axios.delete(`/api/hr/employees/${id}/documents?docId=${docId}`); setDocs((p) => p.filter((d) => d._id !== docId)); toast({ title: 'Deleted', variant: 'success' }); }
    catch { toast({ title: 'Failed', variant: 'destructive' }); }
  };

  const deactivate = async () => {
    if (!confirm('Deactivate this employee?')) return;
    try { await axios.delete(`/api/hr/employees/${id}`); toast({ title: 'Deactivated', variant: 'success' }); router.push('/hr/employees'); }
    catch { toast({ title: 'Failed', variant: 'destructive' }); }
  };

  const initiateExit = async () => {
    try {
      await axios.post(`/api/hr/employees/${id}/exit`, exitForm);
      const r = await axios.get(`/api/hr/employees/${id}/exit`); setExitRec(r.data);
      await fetchEmp(); setShowExitForm(false); toast({ title: 'Exit initiated', variant: 'success' });
    } catch (e) { toast({ title: e.response?.data?.error || 'Failed', variant: 'destructive' }); }
  };

  const updateClearance = async (section, status, notes) => {
    try {
      await axios.patch(`/api/hr/employees/${id}/exit`, { [`clearance.${section}.status`]: status, [`clearance.${section}.notes`]: notes });
      const r = await axios.get(`/api/hr/employees/${id}/exit`); setExitRec(r.data);
      toast({ title: 'Updated', variant: 'success' });
    } catch { toast({ title: 'Failed', variant: 'destructive' }); }
  };

  const set  = (f, v)    => setEf((p) => ({ ...p, [f]: v }));
  const setN = (p, f, v) => setEf((prev) => ({ ...prev, [p]: { ...(prev[p] || {}), [f]: v } }));

  if (loading) return (
    <>
      <Header title="Employee Profile" />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </>
  );
  if (!emp) return null;

  const sc = STATUS_CONFIG[emp.status] || STATUS_CONFIG.active;
  const socials = [
    emp.socialLinks?.linkedin  && { href: socialHref(emp.socialLinks.linkedin),  icon: <LIIcon />, color: 'bg-[#0077B5]',                                              label: 'LinkedIn'  },
    emp.socialLinks?.facebook  && { href: socialHref(emp.socialLinks.facebook),  icon: <FBIcon />, color: 'bg-[#1877F2]',                                              label: 'Facebook'  },
    emp.socialLinks?.instagram && { href: socialHref(emp.socialLinks.instagram), icon: <IGIcon />, color: 'bg-gradient-to-br from-[#833AB4] via-[#E4405F] to-[#FCAF45]', label: 'Instagram' },
  ].filter(Boolean);

  const tabs = [
    { id: 'personal',    label: 'Personal',    icon: User },
    { id: 'employment',  label: 'Employment',  icon: Briefcase },
    ...(canViewFin ? [{ id: 'financial',  label: 'Financial',   icon: DollarSign }] : []),
    ...(canDocs    ? [{ id: 'documents',  label: 'Documents',   icon: FileText }]   : []),
    { id: 'history',     label: 'Status Log',  icon: Activity },
    ...(canExit    ? [{ id: 'exit',       label: 'Exit',        icon: LogOut }]     : []),
  ];

  const netSalary = (Number(emp.salary) || 0) + (Number(emp.allowances) || 0) - (Number(emp.deductions) || 0);

  return (
    <>
      {showStatusModal && <StatusModal current={emp.status} onClose={() => setShowStatusModal(false)} onSave={onStatusChange} />}
      {showSalaryModal && <SalaryModal current={emp} onClose={() => setShowSalaryModal(false)} onSave={onSalaryRevision} />}

      <Header title="Employee Profile" subtitle={`${emp.firstName} ${emp.lastName} · ${emp.employeeId}`} />
      <div className="flex-1 overflow-auto">

        {/* ── Hero Banner ────────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-900/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.15),transparent_60%)]" />

          <div className="relative px-4 md:px-8 pt-6 pb-8">
            {/* Back button */}
            <button onClick={() => router.push('/hr/employees')} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors group">
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Directory
            </button>

            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <Avatar employee={emp} size="xl" preview={photoPreview} />
                {editing && canEdit && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-5 w-5 text-white" />
                      <span className="text-[10px] text-white font-medium">Change</span>
                    </div>
                    <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); } }} />
                  </label>
                )}
                {/* Online/status dot */}
                <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${sc.dot}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{emp.firstName} {emp.lastName}</h1>
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${sc.pill}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                  </span>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  {emp.designation || <span className="italic opacity-60">No designation</span>}
                  {emp.department?.name && <><span className="mx-2 opacity-40">·</span><span className="text-gray-400">{emp.department.name}</span></>}
                </p>

                {/* Quick meta */}
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-red-400" />{emp.employeeId}</span>
                  {emp.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-red-400" />{emp.email}</span>}
                  {emp.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-red-400" />{emp.phone}</span>}
                  {emp.joinDate && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-red-400" />Joined {fmt(emp.joinDate)}</span>}
                  {emp.workLocation && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-red-400" />{LOC_LABELS[emp.workLocation]}</span>}
                </div>

                {/* Social icons */}
                {socials.length > 0 && (
                  <div className="flex gap-2 mt-4">
                    {socials.map((s) => (
                      <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" title={s.label}
                        className={`w-8 h-8 rounded-xl ${s.color} text-white flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl transition-all duration-200`}>
                        {s.icon}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 flex-shrink-0 md:pb-1">
                {canStatus && !editing && (
                  <Button size="sm" onClick={() => setShowStatusModal(true)}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm gap-1.5">
                    <Activity className="h-4 w-4" /> Status
                  </Button>
                )}
                {canEdit && !editing && (
                  <Button size="sm" onClick={() => setEditing(true)}
                    className="bg-red-600 hover:bg-red-500 text-white gap-1.5">
                    <Edit3 className="h-4 w-4" /> Edit Profile
                  </Button>
                )}
                {editing && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(false); setEf(emp); setPhotoFile(null); setPhotoPreview(null); }}
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                      <X className="h-4 w-4 mr-1.5" /> Cancel
                    </Button>
                    <Button size="sm" disabled={saving} onClick={saveEdit} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5">
                      {saving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save</>}
                    </Button>
                  </>
                )}
                {canDelete && !editing && (
                  <Button size="sm" onClick={deactivate}
                    className="bg-white/10 hover:bg-red-600/80 text-white border border-white/20 backdrop-blur-sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Employment type chip */}
          {emp.employmentType && (
            <div className="absolute top-6 right-6 hidden md:block">
              <span className="text-xs font-medium text-gray-300 bg-white/10 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                {TYPE_LABELS[emp.employmentType]}
              </span>
            </div>
          )}
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200 px-4 md:px-8 sticky top-0 z-10 shadow-sm">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-all duration-150 ${
                    active ? 'border-red-600 text-red-600 bg-red-50/50' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}>
                  <Icon className={`h-4 w-4 ${active ? 'text-red-500' : 'text-gray-400'}`} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Tab content ─────────────────────────────────────────────────── */}
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">

          {/* ── PERSONAL TAB ── */}
          {tab === 'personal' && (
            <div className="space-y-6">
              {!editing ? (
                <>
                  <div>
                    <SectionLabel>Identity</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <InfoCard icon={User}     label="First Name"      value={emp.firstName} accent />
                      <InfoCard icon={User}     label="Last Name"       value={emp.lastName} accent />
                      <InfoCard icon={Users}    label="Father's Name"   value={emp.fatherName} />
                      <InfoCard icon={Calendar} label="Date of Birth"   value={fmt(emp.dateOfBirth)} />
                      <InfoCard icon={User}     label="Gender"          value={emp.gender ? emp.gender.charAt(0).toUpperCase() + emp.gender.slice(1) : null} />
                      <InfoCard icon={User}     label="Marital Status"  value={emp.maritalStatus ? emp.maritalStatus.charAt(0).toUpperCase() + emp.maritalStatus.slice(1) : null} />
                      <InfoCard icon={FileText} label="CNIC"            value={emp.cnic} />
                      <InfoCard icon={MapPin}   label="Nationality"     value={emp.nationality} />
                      <InfoCard icon={User}     label="Religion"        value={emp.religion} />
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Contact Information</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <InfoCard icon={Mail}  label="Work Email"     value={emp.email} accent />
                      <InfoCard icon={Phone} label="Phone"          value={emp.phone} accent />
                      <InfoCard icon={Mail}  label="Personal Email" value={emp.personalEmail} />
                      {(emp.address?.street || emp.address?.city) && (
                        <div className="sm:col-span-2 lg:col-span-3">
                          <InfoCard icon={MapPin} label="Address" value={[emp.address?.street, emp.address?.city, emp.address?.state, emp.address?.country, emp.address?.postalCode].filter(Boolean).join(', ')} />
                        </div>
                      )}
                    </div>
                  </div>

                  {(emp.emergencyContact?.name || emp.emergencyContact?.phone) && (
                    <div>
                      <SectionLabel>Emergency Contact</SectionLabel>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <InfoCard icon={AlertCircle} label="Name"     value={emp.emergencyContact?.name} accent />
                        <InfoCard icon={Users}       label="Relation" value={emp.emergencyContact?.relation} />
                        <InfoCard icon={Phone}       label="Phone"    value={emp.emergencyContact?.phone} />
                      </div>
                    </div>
                  )}

                  {socials.length > 0 && (
                    <div>
                      <SectionLabel>Social Profiles</SectionLabel>
                      <div className="flex flex-wrap gap-3">
                        {emp.socialLinks?.linkedin && (
                          <a href={socialHref(emp.socialLinks.linkedin)} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-white hover:border-[#0077B5]/30 hover:bg-[#0077B5]/5 transition-all group">
                            <span className="w-8 h-8 rounded-lg bg-[#0077B5] text-white flex items-center justify-center flex-shrink-0"><LIIcon /></span>
                            <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">LinkedIn</p><p className="text-sm text-gray-700 group-hover:text-[#0077B5] transition-colors">{emp.socialLinks.linkedin}</p></div>
                          </a>
                        )}
                        {emp.socialLinks?.facebook && (
                          <a href={socialHref(emp.socialLinks.facebook)} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-white hover:border-[#1877F2]/30 hover:bg-[#1877F2]/5 transition-all group">
                            <span className="w-8 h-8 rounded-lg bg-[#1877F2] text-white flex items-center justify-center flex-shrink-0"><FBIcon /></span>
                            <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Facebook</p><p className="text-sm text-gray-700 group-hover:text-[#1877F2] transition-colors">{emp.socialLinks.facebook}</p></div>
                          </a>
                        )}
                        {emp.socialLinks?.instagram && (
                          <a href={socialHref(emp.socialLinks.instagram)} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-white hover:border-pink-300 hover:bg-pink-50 transition-all group">
                            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#833AB4] via-[#E4405F] to-[#FCAF45] text-white flex items-center justify-center flex-shrink-0"><IGIcon /></span>
                            <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Instagram</p><p className="text-sm text-gray-700 group-hover:text-pink-600 transition-colors">{emp.socialLinks.instagram}</p></div>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* ── Edit form: Personal ── */
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
                  <div>
                    <SectionLabel>Identity</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="First Name" required><Input className="h-9" value={ef.firstName || ''} onChange={(e) => set('firstName', e.target.value)} /></Field>
                      <Field label="Last Name" required><Input className="h-9" value={ef.lastName || ''} onChange={(e) => set('lastName', e.target.value)} /></Field>
                      <Field label="Father's Name"><Input className="h-9" value={ef.fatherName || ''} onChange={(e) => set('fatherName', e.target.value)} /></Field>
                      <Field label="Date of Birth"><Input type="date" className="h-9" value={ef.dateOfBirth ? ef.dateOfBirth.split('T')[0] : ''} onChange={(e) => set('dateOfBirth', e.target.value)} /></Field>
                      <Field label="Gender"><SelectField value={ef.gender || 'male'} onChange={(v) => set('gender', v)} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} /></Field>
                      <Field label="Marital Status"><SelectField value={ef.maritalStatus || 'single'} onChange={(v) => set('maritalStatus', v)} options={[{ value: 'single', label: 'Single' }, { value: 'married', label: 'Married' }, { value: 'divorced', label: 'Divorced' }, { value: 'widowed', label: 'Widowed' }]} /></Field>
                      <Field label="CNIC"><Input className="h-9" value={ef.cnic || ''} onChange={(e) => set('cnic', e.target.value)} /></Field>
                      <Field label="Nationality"><Input className="h-9" value={ef.nationality || ''} onChange={(e) => set('nationality', e.target.value)} /></Field>
                      <Field label="Religion"><Input className="h-9" value={ef.religion || ''} onChange={(e) => set('religion', e.target.value)} /></Field>
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Contact</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Work Email"><Input type="email" className="h-9" value={ef.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
                      <Field label="Phone"><PhoneInputField value={ef.phone || ''} onChange={(v) => set('phone', v || '')} defaultCountry="PK" /></Field>
                      <Field label="Personal Email"><Input type="email" className="h-9" value={ef.personalEmail || ''} onChange={(e) => set('personalEmail', e.target.value)} /></Field>
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Address</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Street"><Input className="h-9" value={ef.address?.street || ''} onChange={(e) => setN('address', 'street', e.target.value)} /></Field>
                      <Field label="City"><Input className="h-9" value={ef.address?.city || ''} onChange={(e) => setN('address', 'city', e.target.value)} /></Field>
                      <Field label="State"><Input className="h-9" value={ef.address?.state || ''} onChange={(e) => setN('address', 'state', e.target.value)} /></Field>
                      <Field label="Country"><Input className="h-9" value={ef.address?.country || ''} onChange={(e) => setN('address', 'country', e.target.value)} /></Field>
                      <Field label="Postal Code"><Input className="h-9" value={ef.address?.postalCode || ''} onChange={(e) => setN('address', 'postalCode', e.target.value)} /></Field>
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Emergency Contact</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Field label="Name"><Input className="h-9" value={ef.emergencyContact?.name || ''} onChange={(e) => setN('emergencyContact', 'name', e.target.value)} /></Field>
                      <Field label="Relation"><Input className="h-9" value={ef.emergencyContact?.relation || ''} onChange={(e) => setN('emergencyContact', 'relation', e.target.value)} /></Field>
                      <Field label="Phone"><PhoneInputField value={ef.emergencyContact?.phone || ''} onChange={(v) => setN('emergencyContact', 'phone', v || '')} defaultCountry="PK" /></Field>
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Social Profiles <span className="normal-case font-normal text-gray-400">(optional)</span></SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Field label="LinkedIn">
                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0077B5]"><LIIcon /></span><Input className="h-9 pl-9" value={ef.socialLinks?.linkedin || ''} onChange={(e) => setN('socialLinks', 'linkedin', e.target.value)} placeholder="linkedin.com/in/username" /></div>
                      </Field>
                      <Field label="Facebook">
                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1877F2]"><FBIcon /></span><Input className="h-9 pl-9" value={ef.socialLinks?.facebook || ''} onChange={(e) => setN('socialLinks', 'facebook', e.target.value)} placeholder="facebook.com/username" /></div>
                      </Field>
                      <Field label="Instagram">
                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E4405F]"><IGIcon /></span><Input className="h-9 pl-9" value={ef.socialLinks?.instagram || ''} onChange={(e) => setN('socialLinks', 'instagram', e.target.value)} placeholder="instagram.com/username" /></div>
                      </Field>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── EMPLOYMENT TAB ── */}
          {tab === 'employment' && (
            <div className="space-y-6">
              {!editing ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <InfoCard icon={Building2} label="Employee ID"      value={emp.employeeId} accent />
                    <InfoCard icon={Building2} label="Department"       value={emp.department?.name} />
                    <InfoCard icon={Briefcase} label="Designation"      value={emp.designation} accent />
                    <InfoCard icon={Users}     label="Employment Type"  value={TYPE_LABELS[emp.employmentType]} />
                    <InfoCard icon={MapPin}    label="Work Location"    value={LOC_LABELS[emp.workLocation]} />
                    <InfoCard icon={Calendar}  label="Join Date"        value={fmt(emp.joinDate)} />
                    <InfoCard icon={Clock}     label="Probation End"    value={fmt(emp.probationEndDate)} />
                    <InfoCard icon={Users}     label="Reporting To"     value={emp.reportingTo ? `${emp.reportingTo.firstName} ${emp.reportingTo.lastName} (${emp.reportingTo.employeeId})` : null} />
                    <InfoCard icon={Activity}  label="Status"           value={sc.label} accent />
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <SectionLabel>Employment Details</SectionLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Department"><SelectField value={ef.department?._id || ef.department || ''} onChange={(v) => set('department', v)} placeholder="Select department" options={depts.map((d) => ({ value: d._id, label: d.name }))} /></Field>
                    <Field label="Designation"><Input className="h-9" value={ef.designation || ''} onChange={(e) => set('designation', e.target.value)} /></Field>
                    <Field label="Employment Type"><SelectField value={ef.employmentType || 'full_time'} onChange={(v) => set('employmentType', v)} options={Object.entries(TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))} /></Field>
                    <Field label="Work Location"><SelectField value={ef.workLocation || 'office'} onChange={(v) => set('workLocation', v)} options={Object.entries(LOC_LABELS).map(([k, v]) => ({ value: k, label: v }))} /></Field>
                    <Field label="Join Date"><Input type="date" className="h-9" value={ef.joinDate ? ef.joinDate.split('T')[0] : ''} onChange={(e) => set('joinDate', e.target.value)} /></Field>
                    <Field label="Probation End Date"><Input type="date" className="h-9" value={ef.probationEndDate ? ef.probationEndDate.split('T')[0] : ''} onChange={(e) => set('probationEndDate', e.target.value)} /></Field>
                    <Field label="Reporting To"><SelectField value={ef.reportingTo?._id || ef.reportingTo || ''} onChange={(v) => set('reportingTo', v)} placeholder="Select manager" options={allEmps.filter((e) => e._id !== id).map((e) => ({ value: e._id, label: `${e.firstName} ${e.lastName} (${e.employeeId})` }))} /></Field>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── FINANCIAL TAB ── */}
          {tab === 'financial' && canViewFin && (
            <div className="space-y-6">
              {/* Salary summary cards */}
              {!editing && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
                    <p className="text-xs font-medium text-gray-400 mb-1">Basic Salary</p>
                    <p className="text-2xl font-bold">PKR {Number(emp.salary || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">{emp.salaryType === 'hourly' ? 'Hourly Rate' : 'Monthly'}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                    <p className="text-xs font-medium text-emerald-600 mb-1">Allowances</p>
                    <p className="text-2xl font-bold text-emerald-700">+PKR {Number(emp.allowances || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                    <p className="text-xs font-medium text-red-600 mb-1">Deductions</p>
                    <p className="text-2xl font-bold text-red-700">-PKR {Number(emp.deductions || 0).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {!editing && (
                <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-5 flex items-center justify-between text-white shadow-lg shadow-red-200">
                  <div><p className="text-sm font-medium text-red-100">Net Take-Home</p><p className="text-xs text-red-200/70 mt-0.5">Basic + Allowances − Deductions</p></div>
                  <div className="text-right"><p className="text-3xl font-bold">PKR {netSalary.toLocaleString()}</p></div>
                </div>
              )}

              {/* Bank info */}
              {!editing ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <SectionLabel>Bank Details</SectionLabel>
                    {canEdit && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowSalaryModal(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Revision</Button>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <InfoCard icon={Building2} label="Bank Name"       value={emp.bankName} />
                    <InfoCard icon={FileText}  label="Account Title"  value={emp.accountTitle} />
                    <InfoCard icon={FileText}  label="Account Number" value={emp.accountNumber} />
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <SectionLabel>Financial Details</SectionLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Bank Name"><Input className="h-9" value={ef.bankName || ''} onChange={(e) => set('bankName', e.target.value)} /></Field>
                    <Field label="Account Title"><Input className="h-9" value={ef.accountTitle || ''} onChange={(e) => set('accountTitle', e.target.value)} /></Field>
                    <Field label="Account Number"><Input className="h-9" value={ef.accountNumber || ''} onChange={(e) => set('accountNumber', e.target.value)} /></Field>
                    <Field label="Salary Type"><SelectField value={ef.salaryType || 'monthly'} onChange={(v) => set('salaryType', v)} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'hourly', label: 'Hourly' }]} /></Field>
                    <Field label="Basic Salary (PKR)"><Input type="number" className="h-9" value={ef.salary || ''} onChange={(e) => set('salary', e.target.value)} min="0" /></Field>
                    <Field label="Allowances (PKR)"><Input type="number" className="h-9" value={ef.allowances || ''} onChange={(e) => set('allowances', e.target.value)} min="0" /></Field>
                    <Field label="Deductions (PKR)"><Input type="number" className="h-9" value={ef.deductions || ''} onChange={(e) => set('deductions', e.target.value)} min="0" /></Field>
                  </div>
                </div>
              )}

              {/* Salary history */}
              <div>
                <SectionLabel>Salary History</SectionLabel>
                {salaryHist.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No revisions recorded</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Effective</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Previous</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">New Salary</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">By</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {salaryHist.map((h) => (
                          <tr key={h._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3.5 font-medium text-gray-700">{fmt(h.effectiveDate)}</td>
                            <td className="px-5 py-3.5 text-right text-gray-400">PKR {Number(h.previousSalary).toLocaleString()}</td>
                            <td className="px-5 py-3.5 text-right font-semibold text-emerald-600">PKR {Number(h.newSalary).toLocaleString()}</td>
                            <td className="px-5 py-3.5 text-gray-500">{h.reason || '—'}</td>
                            <td className="px-5 py-3.5 text-gray-400">{h.changedBy?.name || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── DOCUMENTS TAB ── */}
          {tab === 'documents' && canDocs && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
                <label className="cursor-pointer">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 gap-1.5" asChild>
                    <span>{uploadingDoc ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4" /> Upload Document</>}</span>
                  </Button>
                  <input type="file" className="hidden" disabled={uploadingDoc} onChange={uploadDoc} accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.webp" />
                </label>
              </div>

              {docs.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3"><FileText className="h-7 w-7 text-gray-300" /></div>
                  <p className="text-sm font-medium text-gray-500">No documents yet</p>
                  <p className="text-xs text-gray-400 mt-1">Upload contracts, CNIC, certificates, and more</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {docs.map((doc) => {
                    const isImg = doc.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.fileName);
                    const isPdf = doc.mimeType === 'application/pdf' || doc.fileName?.endsWith('.pdf');
                    return (
                      <div key={doc._id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all group">
                        {/* Preview */}
                        <div className="relative h-40 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                          {isImg ? (
                            <img src={`/api/hr/files/${doc.filePath}`} alt={doc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : isPdf ? (
                            <iframe src={`/api/hr/files/${doc.filePath}`} className="w-full h-full border-0 pointer-events-none" title={doc.name} />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center"><FileText className="h-6 w-6 text-red-500" /></div>
                              <span className="text-xs font-medium text-gray-400 uppercase">{doc.fileName?.split('.').pop()}</span>
                            </div>
                          )}
                          {/* Type chip */}
                          <div className="absolute top-2 left-2"><span className="text-[10px] font-semibold bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">{DOC_LABELS[doc.docType] || 'Doc'}</span></div>
                        </div>
                        {/* Footer */}
                        <div className="p-4">
                          <p className="text-sm font-semibold text-gray-900 truncate">{doc.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{doc.uploadedBy?.name || '—'} · {fmt(doc.createdAt)}</p>
                          <div className="flex gap-2 mt-3">
                            <a href={`/api/hr/files/${doc.filePath}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                              <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1"><Eye className="h-3 w-3" /> Preview</Button>
                            </a>
                            <a href={`/api/hr/files/${doc.filePath}?download=1`} download>
                              <Button size="sm" variant="outline" className="h-8 text-xs px-2.5"><Download className="h-3.5 w-3.5" /></Button>
                            </a>
                            <Button size="sm" variant="ghost" className="h-8 text-xs px-2.5 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteDoc(doc._id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── STATUS HISTORY TAB ── */}
          {tab === 'history' && (
            <div>
              {statusLogs.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30 text-gray-400" />
                  <p className="text-sm text-gray-500">No status changes recorded</p>
                </div>
              ) : (
                <div className="relative space-y-3">
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-red-200 via-gray-200 to-transparent" />
                  {statusLogs.map((log, i) => {
                    const lsc = STATUS_CONFIG[log.newStatus] || STATUS_CONFIG.active;
                    return (
                      <div key={log._id} className="flex gap-4 pl-14 relative">
                        <div className={`absolute left-3.5 w-3 h-3 rounded-full border-2 border-white shadow ${lsc.dot}`} style={{ top: '16px' }} />
                        <div className="flex-1 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${lsc.pill}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${lsc.dot}`} />{lsc.label}
                            </span>
                            {log.previousStatus && (
                              <span className="text-xs text-gray-400">← from {STATUS_CONFIG[log.previousStatus]?.label || log.previousStatus}</span>
                            )}
                          </div>
                          {log.reason && <p className="text-sm text-gray-700">{log.reason}</p>}
                          <p className="text-xs text-gray-400 mt-2">{log.changedBy?.name || 'System'} · {fmt(log.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── EXIT TAB ── */}
          {tab === 'exit' && canExit && (
            <div className="space-y-5">
              {!exitRec && !showExitForm && (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3"><LogOut className="h-7 w-7 text-orange-400" /></div>
                  <p className="text-sm font-medium text-gray-600">No exit process initiated</p>
                  <p className="text-xs text-gray-400 mt-1 mb-5">Use this to manage resignations, terminations, and retirements</p>
                  <Button size="sm" onClick={() => setShowExitForm(true)} className="border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors gap-1.5">
                    <LogOut className="h-4 w-4" /> Initiate Exit Process
                  </Button>
                </div>
              )}

              {showExitForm && !exitRec && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                    <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center"><LogOut className="h-5 w-5 text-red-500" /></div>
                    <div><p className="font-semibold text-gray-900">Exit Initiation — Section A</p><p className="text-xs text-gray-400">Fill in the exit details below</p></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Exit Type" required><SelectField value={exitForm.exitType} onChange={(v) => setExitForm((p) => ({ ...p, exitType: v }))} options={EXIT_TYPES} /></Field>
                    <Field label="Exit Date" required><Input type="date" className="h-9" value={exitForm.exitDate} onChange={(e) => setExitForm((p) => ({ ...p, exitDate: e.target.value }))} /></Field>
                    <Field label="Last Working Day"><Input type="date" className="h-9" value={exitForm.lastWorkingDay} onChange={(e) => setExitForm((p) => ({ ...p, lastWorkingDay: e.target.value }))} /></Field>
                    <Field label="Notice Period (Days)"><Input type="number" className="h-9" value={exitForm.noticePeriodDays} onChange={(e) => setExitForm((p) => ({ ...p, noticePeriodDays: e.target.value }))} min="0" /></Field>
                  </div>
                  <Field label="Exit Reason"><textarea className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 min-h-[80px] resize-none" value={exitForm.exitReason} onChange={(e) => setExitForm((p) => ({ ...p, exitReason: e.target.value }))} /></Field>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" className="rounded" checked={exitForm.noticePeriodWaived} onChange={(e) => setExitForm((p) => ({ ...p, noticePeriodWaived: e.target.checked }))} />Notice period waived</label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" className="rounded" checked={exitForm.exitInterviewConducted} onChange={(e) => setExitForm((p) => ({ ...p, exitInterviewConducted: e.target.checked }))} />Exit interview conducted</label>
                  </div>
                  {exitForm.exitInterviewConducted && <Field label="Interview Notes"><textarea className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 min-h-[80px] resize-none" value={exitForm.exitInterviewNotes} onChange={(e) => setExitForm((p) => ({ ...p, exitInterviewNotes: e.target.value }))} /></Field>}
                  <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setShowExitForm(false)}>Cancel</Button><Button size="sm" onClick={initiateExit} className="bg-red-600 hover:bg-red-700">Initiate Exit</Button></div>
                </div>
              )}

              {exitRec && (
                <>
                  {/* Section A */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center"><FileText className="h-5 w-5 text-gray-500" /></div>
                      <div><p className="font-semibold text-gray-900">Section A — Exit Details</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${exitRec.overallStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{exitRec.overallStatus?.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <InfoCard icon={LogOut}   label="Exit Type"          value={EXIT_TYPES.find((t) => t.value === exitRec.exitType)?.label} accent />
                      <InfoCard icon={Calendar} label="Exit Date"          value={fmt(exitRec.exitDate)} />
                      <InfoCard icon={Calendar} label="Last Working Day"   value={fmt(exitRec.lastWorkingDay)} />
                      <InfoCard icon={Clock}    label="Notice Period"      value={exitRec.noticePeriodWaived ? 'Waived' : `${exitRec.noticePeriodDays} days`} />
                      <InfoCard icon={FileText} label="Exit Interview"     value={exitRec.exitInterviewConducted ? 'Conducted' : 'Not Conducted'} />
                      <InfoCard icon={Users}    label="Initiated By"       value={exitRec.initiatedBy?.name} />
                      {exitRec.exitReason && <div className="sm:col-span-2 lg:col-span-3"><InfoCard icon={FileText} label="Exit Reason" value={exitRec.exitReason} /></div>}
                    </div>
                  </div>

                  {/* Section B — Clearance */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center"><Check className="h-5 w-5 text-gray-500" /></div>
                      <p className="font-semibold text-gray-900">Section B — Clearance Checklist</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {['assets', 'it', 'finance', 'hr', 'admin'].map((sec) => {
                        const cl = exitRec.clearance?.[sec] || {};
                        const bg = { pending: 'bg-amber-50 border-amber-200', cleared: 'bg-emerald-50 border-emerald-200', na: 'bg-gray-50 border-gray-200' };
                        const textC = { pending: 'text-amber-700', cleared: 'text-emerald-700', na: 'text-gray-500' };
                        const st = cl.status || 'pending';
                        return (
                          <div key={sec} className={`rounded-xl border p-4 ${bg[st]}`}>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold text-gray-800 capitalize">{sec === 'it' ? 'IT' : sec.charAt(0).toUpperCase() + sec.slice(1)}</p>
                              <span className={`text-xs font-bold ${textC[st]}`}>{st === 'na' ? 'N/A' : st.charAt(0).toUpperCase() + st.slice(1)}</span>
                            </div>
                            {cl.notes && <p className="text-xs text-gray-500 mb-2">{cl.notes}</p>}
                            <div className="flex gap-1.5 mt-2">
                              {['pending', 'cleared', 'na'].map((s) => (
                                <button key={s} onClick={() => updateClearance(sec, s, cl.notes)}
                                  className={`flex-1 text-[10px] font-semibold py-1.5 rounded-lg border transition-all ${st === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                                  {s === 'na' ? 'N/A' : s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
