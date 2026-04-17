'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Building2, Plus, Edit3, Trash2, X, Save, Users, ChevronRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/use-permission';
import Link from 'next/link';

const DEFAULT_DEPARTMENTS = [
  'Human Resources', 'Finance & Accounts', 'Information Technology',
  'Sales & Marketing', 'Operations', 'Administration', 'Customer Support',
  'Research & Development', 'Legal & Compliance', 'Procurement',
  'Business Development', 'Quality Assurance', 'Project Management',
];

function DeptFormDialog({ dept, onClose, onSave }) {
  const [form, setForm] = useState({ name: dept?.name || '', code: dept?.code || '', description: dept?.description || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Department name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900">{dept ? 'Edit Department' : 'New Department'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">Department Name <span className="text-red-500">*</span></Label>
            <Input className="h-9" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Human Resources" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">Code</Label>
            <Input className="h-9" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. HR" maxLength={10} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">Description</Label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[70px] resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of this department..."
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving} onClick={handleSave} className="bg-red-600 hover:bg-red-700">
            {saving ? 'Saving...' : <><Save className="h-4 w-4 mr-1.5" /> Save</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const canManage = usePermission('hr.departments.manage');

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const r = await axios.get('/api/hr/departments');
      setDepartments(r.data || []);
    } catch {
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDepts(); }, []);

  const handleCreate = async (form) => {
    try {
      await axios.post('/api/hr/departments', form);
      await fetchDepts();
      setShowForm(false);
      toast({ title: 'Department created', variant: 'success' });
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Failed to create', variant: 'destructive' });
    }
  };

  const handleUpdate = async (form) => {
    try {
      await axios.patch('/api/hr/departments', { id: editDept._id, ...form });
      await fetchDepts();
      setEditDept(null);
      toast({ title: 'Department updated', variant: 'success' });
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Failed to update', variant: 'destructive' });
    }
  };

  const handleDelete = async (dept) => {
    if (!confirm(`Remove "${dept.name}"?`)) return;
    try {
      await axios.delete(`/api/hr/departments?id=${dept._id}`);
      setDepartments((prev) => prev.filter((d) => d._id !== dept._id));
      toast({ title: 'Department removed', variant: 'success' });
    } catch {
      toast({ title: 'Failed to remove', variant: 'destructive' });
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const existingNames = new Set(departments.map((d) => d.name.toLowerCase()));
      const toCreate = DEFAULT_DEPARTMENTS.filter((n) => !existingNames.has(n.toLowerCase()));
      await Promise.all(toCreate.map((name) =>
        axios.post('/api/hr/departments', { name }).catch(() => {})
      ));
      await fetchDepts();
      toast({ title: `${toCreate.length} departments added`, variant: 'success' });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <>
      {(showForm || editDept) && (
        <DeptFormDialog
          dept={editDept}
          onClose={() => { setShowForm(false); setEditDept(null); }}
          onSave={editDept ? handleUpdate : handleCreate}
        />
      )}

      <Header title="Departments" subtitle="Manage company departments" />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-5">

        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {departments.length} department{departments.length !== 1 ? 's' : ''} configured
          </p>
          {canManage && (
            <div className="flex gap-2">
              {departments.length === 0 && (
                <Button size="sm" variant="outline" onClick={handleSeedDefaults} disabled={seeding}>
                  {seeding ? 'Creating...' : 'Add Default Departments'}
                </Button>
              )}
              <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> New Department
              </Button>
            </div>
          )}
        </div>

        {/* Department List */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm mb-4">No departments yet</p>
            {canManage && (
              <div className="flex gap-2 justify-center">
                <Button size="sm" variant="outline" onClick={handleSeedDefaults}>Add Default Departments</Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> New Department
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div key={dept._id} className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{dept.name}</p>
                      {dept.code && (
                        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{dept.code}</span>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => setEditDept(dept)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(dept)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {dept.description && (
                  <p className="text-xs text-gray-500 mt-3 line-clamp-2">{dept.description}</p>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  <Link href={`/hr/employees?department=${dept._id}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors">
                    <Users className="h-3 w-3" /> View employees
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                  {dept.head && (
                    <span className="text-xs text-gray-400">
                      Head: {dept.head.firstName} {dept.head.lastName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
