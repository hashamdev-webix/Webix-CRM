'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Users, Building2, Briefcase, RefreshCw, ArrowRight, SlidersHorizontal, X,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermission } from '@/hooks/use-permission';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active:     { label: 'Active',     dot: 'bg-emerald-400', text: 'text-emerald-600', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  on_leave:   { label: 'On Leave',   dot: 'bg-amber-400',   text: 'text-amber-600',   pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
  inactive:   { label: 'Inactive',   dot: 'bg-gray-400',    text: 'text-gray-500',    pill: 'bg-gray-50 text-gray-600 ring-gray-200' },
  terminated: { label: 'Terminated', dot: 'bg-red-500',     text: 'text-red-600',     pill: 'bg-red-50 text-red-700 ring-red-200' },
  resigned:   { label: 'Resigned',   dot: 'bg-orange-400',  text: 'text-orange-600',  pill: 'bg-orange-50 text-orange-700 ring-orange-200' },
};

const TYPE_LABELS = {
  full_time: 'Full-Time', part_time: 'Part-Time', contract: 'Contract', intern: 'Intern',
};

// ── Social SVGs ───────────────────────────────────────────────────────────────
const LinkedInIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);
const FacebookIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);
const InstagramIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
  </svg>
);

function socialHref(url) {
  if (!url) return '#';
  return url.startsWith('http') ? url : `https://${url}`;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function EmployeeAvatar({ employee }) {
  const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();
  if (employee.profilePhoto?.filePath) {
    return (
      <img
        src={`/api/hr/files/${employee.profilePhoto.filePath}`}
        alt={initials}
        className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-md"
      />
    );
  }
  const colors = ['bg-red-600', 'bg-rose-600', 'bg-pink-600', 'bg-red-700'];
  const color = colors[(initials.charCodeAt(0) || 0) % colors.length];
  return (
    <div className={`w-20 h-20 rounded-full ${color} text-white flex items-center justify-center text-2xl font-bold ring-4 ring-white shadow-md`}>
      {initials}
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm animate-pulse">
      <div className="h-24 bg-gray-200" />
      <div className="px-5 pb-5 pt-12 flex flex-col items-center gap-3">
        <div className="h-4 w-32 bg-gray-200 rounded-full" />
        <div className="h-3 w-24 bg-gray-100 rounded-full" />
        <div className="h-3 w-20 bg-gray-100 rounded-full" />
        <div className="h-6 w-16 bg-gray-100 rounded-full mt-1" />
      </div>
    </div>
  );
}

// ── Employee Card ─────────────────────────────────────────────────────────────
function EmployeeCard({ emp, onClick }) {
  const sc = STATUS_CONFIG[emp.status] || STATUS_CONFIG.active;
  const socials = [
    emp.socialLinks?.linkedin && { href: socialHref(emp.socialLinks.linkedin), icon: <LinkedInIcon />, color: 'bg-[#0077B5]', label: 'LinkedIn', delay: 0 },
    emp.socialLinks?.facebook && { href: socialHref(emp.socialLinks.facebook), icon: <FacebookIcon />, color: 'bg-[#1877F2]', label: 'Facebook', delay: 60 },
    emp.socialLinks?.instagram && { href: socialHref(emp.socialLinks.instagram), icon: <InstagramIcon />, color: 'bg-gradient-to-br from-[#833AB4] via-[#E4405F] to-[#FCAF45]', label: 'Instagram', delay: 120 },
  ].filter(Boolean);

  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-red-200 transition-all duration-300 cursor-pointer hover:-translate-y-1"
    >
      {/* ── Dark header banner ── */}
      <div className="relative h-24 bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-red-600/20 blur-xl" />
        <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/5" />
        {/* Status badge top-right */}
        <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ring-1 backdrop-blur-sm ${sc.pill}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
          {sc.label}
        </div>
      </div>

      {/* ── Avatar — overlaps banner ── */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2">
        <EmployeeAvatar employee={emp} />
      </div>

      {/* ── Card body ── */}
      <div className="px-5 pb-5 pt-14 text-center">
        <p className="font-bold text-gray-900 text-sm group-hover:text-red-600 transition-colors duration-200 leading-tight truncate">
          {emp.firstName} {emp.lastName}
        </p>
        <p className="text-xs font-medium text-red-500 mt-0.5 truncate">{emp.employeeId}</p>

        <div className="mt-3 space-y-1.5">
          {emp.designation && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
              <Briefcase className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span className="truncate">{emp.designation}</span>
            </div>
          )}
          {emp.department && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
              <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span className="truncate">{emp.department.name}</span>
            </div>
          )}
        </div>

        {emp.employmentType && (
          <div className="mt-3">
            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {TYPE_LABELS[emp.employmentType] || emp.employmentType}
            </span>
          </div>
        )}
      </div>

      {/* ── Hover overlay — slides up from bottom ── */}
      <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
        <div className="bg-gradient-to-t from-gray-900 via-gray-900/97 to-gray-900/90 px-5 py-4">
          {/* Social icons */}
          {socials.length > 0 && (
            <div className="flex items-center justify-center gap-2.5 mb-3">
              {socials.map((s, i) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.label}
                  onClick={(e) => e.stopPropagation()}
                  className={`w-9 h-9 rounded-xl ${s.color} text-white flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl transition-all duration-200`}
                  style={{ transitionDelay: `${s.delay}ms` }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          )}

          {/* View Profile button */}
          <button
            onClick={onClick}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors duration-150"
          >
            View Full Profile <ArrowRight className="h-3.5 w-3.5" />
          </button>
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
            <Input
              placeholder="Search name, ID, designation…"
              className="pl-9 h-9 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFilters((v) => !v)}
            className={`relative gap-2 ${hasFilters ? 'border-red-400 text-red-600 bg-red-50' : ''}`}
          >
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
          <Card className="border-red-100 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Department</label>
                  <select
                    className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 min-w-[160px]"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
                  <select
                    className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 min-w-[140px]"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Employment Type</label>
                  <select
                    className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 min-w-[140px]"
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                  >
                    <option value="">All Types</option>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {hasFilters && (
                  <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-600 gap-1.5"
                    onClick={() => { setDepartment(''); setStatus(''); setEmploymentType(''); }}>
                    <X className="h-3.5 w-3.5" /> Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Active filter pills ── */}
        {hasFilters && !showFilters && (
          <div className="flex flex-wrap gap-2">
            {department && (
              <span className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full">
                {departments.find((d) => d._id === department)?.name || 'Dept'}
                <button onClick={() => setDepartment('')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {status && (
              <span className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full">
                {STATUS_CONFIG[status]?.label}
                <button onClick={() => setStatus('')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {employmentType && (
              <span className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full">
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
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 opacity-40" />
            </div>
            <p className="text-sm font-medium text-gray-500">No employees found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
            {canCreate && (
              <Link href="/hr/employees/new">
                <Button size="sm" className="mt-5 bg-red-600 hover:bg-red-700 gap-1.5">
                  <Plus className="h-4 w-4" /> Add First Employee
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {employees.map((emp) => (
              <EmployeeCard
                key={emp._id}
                emp={emp}
                onClick={() => router.push(`/hr/employees/${emp._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
