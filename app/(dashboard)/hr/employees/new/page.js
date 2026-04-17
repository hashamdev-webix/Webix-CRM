'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { ArrowLeft, ArrowRight, Check, Save, User, Briefcase, DollarSign, Upload } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/use-permission';
import { PhoneInputField } from '@/components/ui/phone-input';

const STEPS = [
  { id: 0, label: 'Personal', icon: User },
  { id: 1, label: 'Employment', icon: Briefcase },
  { id: 2, label: 'Financial', icon: DollarSign },
];

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-Time' },
  { value: 'part_time', label: 'Part-Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
];

const WORK_LOCATIONS = [
  { value: 'office', label: 'Office' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
];

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const MARITAL_STATUSES = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
];

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, options, placeholder }) {
  return (
    <select
      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export default function AddEmployeePage() {
  const router = useRouter();
  const canManageFinancial = usePermission('hr.employees.financial');
  const [step, setStep] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [form, setForm] = useState({
    // Personal
    firstName: '', lastName: '', fatherName: '',
    dateOfBirth: '', gender: 'male', maritalStatus: 'single',
    cnic: '', nationality: 'Pakistani', religion: '',
    // Contact
    email: '', phone: '', personalEmail: '',
    address: { street: '', city: '', state: '', country: 'Pakistan', postalCode: '' },
    emergencyContact: { name: '', relation: '', phone: '' },
    // Social
    socialLinks: { facebook: '', instagram: '', linkedin: '' },
    // Employment
    department: '', designation: '', employmentType: 'full_time',
    joinDate: '', probationEndDate: '', workLocation: 'office', reportingTo: '',
    // Financial
    bankName: '', accountNumber: '', accountTitle: '',
    salary: '', salaryType: 'monthly', allowances: '', deductions: '',
  });

  useEffect(() => {
    Promise.all([
      axios.get('/api/hr/departments'),
      axios.get('/api/hr/employees?limit=200'),
    ]).then(([d, e]) => {
      setDepartments(d.data || []);
      setEmployees(e.data.employees || []);
    }).catch(() => {});
  }, []);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const setNested = (parent, field, value) =>
    setForm((prev) => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast({ title: 'First and last name are required', variant: 'destructive' });
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.salary) delete payload.salary;
      if (!payload.allowances) delete payload.allowances;
      if (!payload.deductions) delete payload.deductions;
      if (!payload.reportingTo) delete payload.reportingTo;
      if (!payload.department) delete payload.department;

      const res = await axios.post('/api/hr/employees', payload);
      const newId = res.data._id;

      // Upload photo if selected
      if (photoFile && newId) {
        const fd = new FormData();
        fd.append('photo', photoFile);
        await axios.post(`/api/hr/employees/${newId}/photo`, fd).catch(() => {});
      }

      toast({ title: 'Employee added successfully', variant: 'success' });
      router.push(`/hr/employees/${newId}`);
    } catch (err) {
      toast({
        title: 'Failed to add employee',
        description: err.response?.data?.error || 'Server error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const maxStep = canManageFinancial ? 2 : 1;

  return (
    <>
      <Header title="Add New Employee" subtitle="Fill in employee details" />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Step indicator */}
          <div className="flex items-center gap-0">
            {STEPS.filter((s) => canManageFinancial || s.id < 2).map((s, idx, arr) => {
              const Icon = s.icon;
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <button
                    onClick={() => step > s.id && setStep(s.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                      active ? 'bg-red-600 text-white shadow-sm' :
                      done ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer' :
                      'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {idx < arr.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${done ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step 0: Personal Info */}
          {step === 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Photo Upload */}
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <label className="cursor-pointer">
                      <span className="text-sm font-medium text-red-600 hover:text-red-700 underline">
                        {photoPreview ? 'Change photo' : 'Upload profile photo'}
                      </span>
                      <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} />
                    </label>
                    <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG or WebP. Max 5MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="First Name" required>
                    <Input className="h-9" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Muhammad" />
                  </Field>
                  <Field label="Last Name" required>
                    <Input className="h-9" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Ali" />
                  </Field>
                  <Field label="Father's Name">
                    <Input className="h-9" value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} placeholder="Father's name" />
                  </Field>
                  <Field label="Date of Birth">
                    <Input type="date" className="h-9" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
                  </Field>
                  <Field label="Gender">
                    <SelectField value={form.gender} onChange={(v) => set('gender', v)} options={GENDERS} />
                  </Field>
                  <Field label="Marital Status">
                    <SelectField value={form.maritalStatus} onChange={(v) => set('maritalStatus', v)} options={MARITAL_STATUSES} />
                  </Field>
                  <Field label="CNIC">
                    <Input className="h-9" value={form.cnic} onChange={(e) => set('cnic', e.target.value)} placeholder="XXXXX-XXXXXXX-X" />
                  </Field>
                  <Field label="Nationality">
                    <Input className="h-9" value={form.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="Pakistani" />
                  </Field>
                  <Field label="Religion">
                    <Input className="h-9" value={form.religion} onChange={(e) => set('religion', e.target.value)} placeholder="Optional" />
                  </Field>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Work Email">
                      <Input type="email" className="h-9" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@company.com" />
                    </Field>
                    <Field label="Phone Number">
                      <PhoneInputField value={form.phone} onChange={(v) => set('phone', v || '')} defaultCountry="PK" />
                    </Field>
                    <Field label="Personal Email">
                      <Input type="email" className="h-9" value={form.personalEmail} onChange={(e) => set('personalEmail', e.target.value)} placeholder="personal@email.com" />
                    </Field>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Address</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Street">
                      <Input className="h-9" value={form.address.street} onChange={(e) => setNested('address', 'street', e.target.value)} placeholder="123 Main St" />
                    </Field>
                    <Field label="City">
                      <Input className="h-9" value={form.address.city} onChange={(e) => setNested('address', 'city', e.target.value)} placeholder="Karachi" />
                    </Field>
                    <Field label="State / Province">
                      <Input className="h-9" value={form.address.state} onChange={(e) => setNested('address', 'state', e.target.value)} placeholder="Sindh" />
                    </Field>
                    <Field label="Country">
                      <Input className="h-9" value={form.address.country} onChange={(e) => setNested('address', 'country', e.target.value)} placeholder="Pakistan" />
                    </Field>
                    <Field label="Postal Code">
                      <Input className="h-9" value={form.address.postalCode} onChange={(e) => setNested('address', 'postalCode', e.target.value)} placeholder="75500" />
                    </Field>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Emergency Contact</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Name">
                      <Input className="h-9" value={form.emergencyContact.name} onChange={(e) => setNested('emergencyContact', 'name', e.target.value)} placeholder="Contact name" />
                    </Field>
                    <Field label="Relation">
                      <Input className="h-9" value={form.emergencyContact.relation} onChange={(e) => setNested('emergencyContact', 'relation', e.target.value)} placeholder="Father / Spouse" />
                    </Field>
                    <Field label="Phone">
                      <PhoneInputField value={form.emergencyContact.phone} onChange={(v) => setNested('emergencyContact', 'phone', v || '')} defaultCountry="PK" />
                    </Field>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Social Profiles <span className="text-gray-400 font-normal normal-case">(optional)</span></p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    <Field label="LinkedIn">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0077B5]">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        </span>
                        <Input className="h-9 pl-9" value={form.socialLinks.linkedin} onChange={(e) => setNested('socialLinks', 'linkedin', e.target.value)} placeholder="linkedin.com/in/username" />
                      </div>
                    </Field>
                    <Field label="Facebook">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1877F2]">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </span>
                        <Input className="h-9 pl-9" value={form.socialLinks.facebook} onChange={(e) => setNested('socialLinks', 'facebook', e.target.value)} placeholder="facebook.com/username" />
                      </div>
                    </Field>
                    <Field label="Instagram">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E4405F]">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                        </span>
                        <Input className="h-9 pl-9" value={form.socialLinks.instagram} onChange={(e) => setNested('socialLinks', 'instagram', e.target.value)} placeholder="instagram.com/username" />
                      </div>
                    </Field>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Employment */}
          {step === 1 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  Employment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Department">
                    <SelectField
                      value={form.department}
                      onChange={(v) => set('department', v)}
                      placeholder="Select department"
                      options={departments.map((d) => ({ value: d._id, label: d.name }))}
                    />
                  </Field>
                  <Field label="Designation / Job Title">
                    <Input className="h-9" value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="Software Engineer" />
                  </Field>
                  <Field label="Employment Type">
                    <SelectField value={form.employmentType} onChange={(v) => set('employmentType', v)} options={EMPLOYMENT_TYPES} />
                  </Field>
                  <Field label="Work Location">
                    <SelectField value={form.workLocation} onChange={(v) => set('workLocation', v)} options={WORK_LOCATIONS} />
                  </Field>
                  <Field label="Join Date">
                    <Input type="date" className="h-9" value={form.joinDate} onChange={(e) => set('joinDate', e.target.value)} />
                  </Field>
                  <Field label="Probation End Date">
                    <Input type="date" className="h-9" value={form.probationEndDate} onChange={(e) => set('probationEndDate', e.target.value)} />
                  </Field>
                  <Field label="Reporting To">
                    <SelectField
                      value={form.reportingTo}
                      onChange={(v) => set('reportingTo', v)}
                      placeholder="Select manager"
                      options={employees.map((e) => ({
                        value: e._id,
                        label: `${e.firstName} ${e.lastName} (${e.employeeId})`,
                      }))}
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Financial (restricted) */}
          {step === 2 && canManageFinancial && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  Financial Details
                  <span className="ml-auto text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded">HR Confidential</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Bank Name">
                    <Input className="h-9" value={form.bankName} onChange={(e) => set('bankName', e.target.value)} placeholder="HBL / MCB / UBL" />
                  </Field>
                  <Field label="Account Title">
                    <Input className="h-9" value={form.accountTitle} onChange={(e) => set('accountTitle', e.target.value)} placeholder="Account holder name" />
                  </Field>
                  <Field label="Account Number">
                    <Input className="h-9" value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} placeholder="IBAN or account no." />
                  </Field>
                  <Field label="Salary Type">
                    <SelectField
                      value={form.salaryType}
                      onChange={(v) => set('salaryType', v)}
                      options={[{ value: 'monthly', label: 'Monthly' }, { value: 'hourly', label: 'Hourly' }]}
                    />
                  </Field>
                  <Field label="Basic Salary (PKR)">
                    <Input type="number" className="h-9" value={form.salary} onChange={(e) => set('salary', e.target.value)} placeholder="0" min="0" />
                  </Field>
                  <Field label="Allowances (PKR)">
                    <Input type="number" className="h-9" value={form.allowances} onChange={(e) => set('allowances', e.target.value)} placeholder="0" min="0" />
                  </Field>
                  <Field label="Deductions (PKR)">
                    <Input type="number" className="h-9" value={form.deductions} onChange={(e) => set('deductions', e.target.value)} placeholder="0" min="0" />
                  </Field>
                  {(Number(form.salary) > 0) && (
                    <div className="sm:col-span-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <p className="text-xs text-emerald-700 font-medium">Net Salary</p>
                      <p className="text-lg font-bold text-emerald-800">
                        PKR {(Number(form.salary) + Number(form.allowances || 0) - Number(form.deductions || 0)).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pb-6">
            <div className="flex gap-2">
              <Link href="/hr/employees">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Cancel
                </Button>
              </Link>
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                </Button>
              )}
            </div>
            <div>
              {step < maxStep ? (
                <Button size="sm" onClick={() => setStep(step + 1)} className="bg-red-600 hover:bg-red-700">
                  Next <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleSubmit} disabled={saving} className="bg-red-600 hover:bg-red-700">
                  {saving ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-1.5" /> Save Employee</>
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
