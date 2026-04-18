'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Users, Building2, Briefcase, RefreshCw,
  ArrowRight, SlidersHorizontal, X, MapPin,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermission } from '@/hooks/use-permission';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active:     { label: 'Active',     dot: 'bg-emerald-400', ring: 'ring-emerald-400/30', pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', glow: 'rgba(52,211,153,0.25)' },
  on_leave:   { label: 'On Leave',   dot: 'bg-amber-400',   ring: 'ring-amber-400/30',   pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',     glow: 'rgba(251,191,36,0.2)' },
  inactive:   { label: 'Inactive',   dot: 'bg-gray-400',    ring: 'ring-gray-400/20',    pill: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',       glow: 'rgba(156,163,175,0.15)' },
  terminated: { label: 'Terminated', dot: 'bg-red-500',     ring: 'ring-red-500/30',     pill: 'bg-red-50 text-red-700 ring-1 ring-red-200',           glow: 'rgba(239,68,68,0.2)' },
  resigned:   { label: 'Resigned',   dot: 'bg-orange-400',  ring: 'ring-orange-400/25',  pill: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',   glow: 'rgba(251,146,60,0.2)' },
};

const TYPE_LABELS = { full_time: 'Full-Time', part_time: 'Part-Time', contract: 'Contract', intern: 'Intern' };
const TYPE_COLORS = {
  full_time: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  part_time: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  contract:  'bg-amber-500/15 text-amber-300 border-amber-500/20',
  intern:    'bg-pink-500/15 text-pink-300 border-pink-500/20',
};

// ── Social SVGs ───────────────────────────────────────────────────────────────
const LIIcon = () => <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>;
const FBIcon = () => <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
const IGIcon = () => <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>;

function socialHref(url) { return url?.startsWith('http') ? url : `https://${url}`; }

// ── Avatar ────────────────────────────────────────────────────────────────────
function EmployeeAvatar({ employee, size = 'lg' }) {
  const sz = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-14 h-14 text-lg';
  const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();
  if (employee.profilePhoto?.filePath) {
    return <img src={`/api/hr/files/${employee.profilePhoto.filePath}`} alt={initials} className={`${sz} rounded-2xl object-cover`} />;
  }
  const hues = [0, 340, 20, 350];
  const hue = hues[(initials.charCodeAt(0) || 65) % hues.length];
  return (
    <div className={`${sz} rounded-2xl text-white flex items-center justify-center font-bold flex-shrink-0`}
      style={{ background: `linear-gradient(135deg, hsl(${hue},72%,40%), hsl(${hue},85%,30%))` }}>
      {initials}
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
      <div className="h-28 skeleton-shimmer" />
      <div className="px-5 pb-5 pt-12 flex flex-col items-center gap-3">
        <div className="h-3.5 w-28 skeleton-shimmer rounded-full" />
        <div className="h-3 w-20 skeleton-shimmer rounded-full" />
        <div className="h-3 w-24 skeleton-shimmer rounded-full" />
        <div className="h-6 w-16 skeleton-shimmer rounded-full mt-1" />
      </div>
    </div>
  );
}

// ── Employee Card ─────────────────────────────────────────────────────────────
function EmployeeCard({ emp, index, onClick }) {
  const sc = STATUS_CONFIG[emp.status] || STATUS_CONFIG.active;
  const socials = [
    emp.socialLinks?.linkedin  && { href: socialHref(emp.socialLinks.linkedin),  icon: <LIIcon />, bg: 'bg-[#0077B5]', label: 'LinkedIn',  i: 0 },
    emp.socialLinks?.facebook  && { href: socialHref(emp.socialLinks.facebook),  icon: <FBIcon />, bg: 'bg-[#1877F2]', label: 'Facebook',  i: 1 },
    emp.socialLinks?.instagram && { href: socialHref(emp.socialLinks.instagram), icon: <IGIcon />, bg: 'bg-gradient-to-br from-[#833AB4] via-[#E4405F] to-[#FCAF45]', label: 'Instagram', i: 2 },
  ].filter(Boolean);

  return (
    <div
      className="animate-fade-up group relative rounded-2xl cursor-pointer select-none"
      style={{ animationDelay: `${index * 55}ms` }}
      onClick={onClick}
    >
      {/* Outer hover glow ring */}
      <div className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `linear-gradient(135deg, rgba(220,38,38,0.4), rgba(220,38,38,0.1))`, filter: 'blur(1px)' }} />

      {/* Card shell */}
      <div className="relative rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm
        group-hover:shadow-2xl group-hover:border-transparent group-hover:-translate-y-2
        transition-all duration-400 ease-out h-full"
        style={{ '--glow': sc.glow }}>

        {/* ── Dark header ── */}
        <div className="relative h-28 bg-gradient-to-br from-gray-900 via-gray-850 to-black overflow-hidden">
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          {/* Animated blobs */}
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-2xl transition-all duration-700 group-hover:scale-125"
            style={{ background: `radial-gradient(circle, ${sc.glow.replace(')', ', 0.6)').replace('rgba', 'rgba')}, transparent 70%)`, animation: 'floatBlob 9s ease-in-out infinite' }} />
          <div className="absolute -bottom-8 -left-4 w-20 h-20 rounded-full bg-white/[0.03] blur-xl"
            style={{ animation: 'floatBlob2 13s ease-in-out infinite' }} />
          {/* Subtle red accent line at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent
            scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />

          {/* Status badge */}
          <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold backdrop-blur-sm ${sc.pill}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${emp.status === 'active' ? 'animate-pulse' : ''}`} />
            {sc.label}
          </div>

          {/* Employment type — top left */}
          {emp.employmentType && (
            <div className="absolute top-3 left-3">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${TYPE_COLORS[emp.employmentType] || TYPE_COLORS.full_time}`}>
                {TYPE_LABELS[emp.employmentType]}
              </span>
            </div>
          )}
        </div>

        {/* ── Avatar overlapping ── */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '68px' }}>
          <div className="relative">
            {/* Glow ring */}
            <div className={`absolute inset-0 rounded-2xl blur-md opacity-0 group-hover:opacity-60 transition-opacity duration-500`}
              style={{ background: sc.glow, transform: 'scale(1.15)' }} />
            {/* Status pulse ring for active */}
            {emp.status === 'active' && (
              <div className="absolute inset-0 rounded-2xl border-2 border-emerald-400/40"
                style={{ animation: 'pulseRingOut 2s ease-out infinite' }} />
            )}
            <div className="relative ring-4 ring-white rounded-2xl shadow-xl group-hover:scale-105 transition-transform duration-300">
              <EmployeeAvatar employee={emp} />
            </div>
          </div>
        </div>

        {/* ── Card body ── */}
        <div className="px-5 pb-5 pt-14 text-center">
          <h3 className="font-bold text-gray-900 text-[15px] group-hover:text-red-600 transition-colors duration-300 leading-snug">
            {emp.firstName} {emp.lastName}
          </h3>
          <p className="text-[10px] font-semibold text-red-500/70 mt-0.5 tracking-wider font-mono">{emp.employeeId}</p>

          <div className="mt-3 space-y-1.5 text-xs text-gray-500">
            {emp.designation && (
              <div className="flex items-center justify-center gap-1.5">
                <Briefcase className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="truncate font-medium">{emp.designation}</span>
              </div>
            )}
            {emp.department?.name && (
              <div className="flex items-center justify-center gap-1.5">
                <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="truncate">{emp.department.name}</span>
              </div>
            )}
            {emp.workLocation && (
              <div className="flex items-center justify-center gap-1.5">
                <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="truncate capitalize">{emp.workLocation}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Slide-up hover overlay ── */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-350 ease-out pointer-events-none group-hover:pointer-events-auto">
          {/* Gradient fade from transparent to dark */}
          <div className="relative px-5 pt-10 pb-5"
            style={{ background: 'linear-gradient(to top, #0f0f0f 0%, #111827 60%, transparent 100%)' }}>

            {/* Social icons */}
            {socials.length > 0 && (
              <div className="flex items-center justify-center gap-2 mb-3">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={s.label}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-8 h-8 rounded-xl ${s.bg} text-white flex items-center justify-center shadow-lg
                      opacity-0 group-hover:opacity-100
                      translate-y-3 group-hover:translate-y-0
                      hover:scale-110 hover:brightness-110 active:scale-95
                      transition-all duration-300`}
                    style={{ transitionDelay: `${80 + s.i * 55}ms` }}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            )}

            {/* View profile button */}
            <button
              onClick={onClick}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-xs font-bold tracking-wide
                opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0
                transition-all duration-300 active:scale-95"
              style={{
                transitionDelay: '60ms',
                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                boxShadow: '0 4px 20px rgba(220,38,38,0.4)',
              }}
            >
              View Profile <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EmployeeDirectoryPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const canCreate = usePermission('hr.employees.create');
  const router = useRouter();

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (department) params.set('department', department);
      if (status) params.set('status', status);
      if (employmentType) params.set('employmentType', employmentType);
      const res = await axios.get(`/api/hr/employees?${params}`);
      setEmployees(res.data.employees || []);
      setTotal(res.data.total || 0);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [search, department, status, employmentType]);

  useEffect(() => {
    axios.get('/api/hr/departments').then((r) => setDepartments(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(t);
  }, [fetchEmployees]);

  const hasFilters = department || status || employmentType;
  const activeFilterCount = [department, status, employmentType].filter(Boolean).length;

  return (
    <>
      <Header title="Employee Directory" subtitle={`${total} employee${total !== 1 ? 's' : ''}`} />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-5">

        {/* ── Top bar ── */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search name, ID, designation…" className="pl-9 h-9 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowFilters((v) => !v)}
            className={`relative gap-2 ${hasFilters ? 'border-red-400 text-red-600 bg-red-50' : ''}`}>
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={fetchEmployees} disabled={loading} className="px-2.5">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {canCreate && (
            <Link href="/hr/employees/new">
              <Button size="sm" className="bg-red-600 hover:bg-red-700 gap-1.5">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Employee</span>
              </Button>
            </Link>
          )}
        </div>

        {/* ── Collapsible filters ── */}
        {showFilters && (
          <div className="animate-fade-scale bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
            <div className="flex flex-wrap gap-3 items-end">
              {[
                { label: 'Department', value: department, onChange: setDepartment, options: [{ value: '', label: 'All Departments' }, ...departments.map((d) => ({ value: d._id, label: d.name }))] },
                { label: 'Status', value: status, onChange: setStatus, options: [{ value: '', label: 'All Statuses' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))] },
                { label: 'Type', value: employmentType, onChange: setEmploymentType, options: [{ value: '', label: 'All Types' }, ...Object.entries(TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))] },
              ].map(({ label, value, onChange, options }) => (
                <div key={label}>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
                  <select className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 min-w-[140px]"
                    value={value} onChange={(e) => onChange(e.target.value)}>
                    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ))}
              {hasFilters && (
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-600 gap-1.5"
                  onClick={() => { setDepartment(''); setStatus(''); setEmploymentType(''); }}>
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Active filter pills ── */}
        {hasFilters && !showFilters && (
          <div className="flex flex-wrap gap-2">
            {department && (
              <span className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full animate-fade-scale">
                {departments.find((d) => d._id === department)?.name}
                <button onClick={() => setDepartment('')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {status && (
              <span className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full animate-fade-scale">
                {STATUS_CONFIG[status]?.label}
                <button onClick={() => setStatus('')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {employmentType && (
              <span className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full animate-fade-scale">
                {TYPE_LABELS[employmentType]}
                <button onClick={() => setEmploymentType('')}><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 animate-fade-scale">
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-5 shadow-inner">
              <Users className="h-9 w-9 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">No employees found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
            {canCreate && (
              <Link href="/hr/employees/new">
                <Button size="sm" className="mt-6 bg-red-600 hover:bg-red-700 gap-1.5 shadow-lg shadow-red-100">
                  <Plus className="h-4 w-4" /> Add First Employee
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {employees.map((emp, i) => (
              <EmployeeCard
                key={emp._id}
                emp={emp}
                index={i}
                onClick={() => router.push(`/hr/employees/${emp._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
