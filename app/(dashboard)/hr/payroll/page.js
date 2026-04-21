'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Download, FileText, Users, Search, RefreshCw,
  Printer, ChevronDown, ChevronRight, Save, CheckCircle2,
  Building2, DollarSign,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWorkingDays(year, month) {
  const d = new Date(year, month - 1, 1);
  let count = 0;
  while (d.getMonth() === month - 1) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function calcNet(e) {
  const wd = e.workingDays || 26;
  const absent = Math.max(0, wd - (e.presentDays || 0) - (e.leaves || 0));
  const dailyRate = wd > 0 ? (e.basicSalary || 0) / wd : 0;
  return Math.round((e.basicSalary || 0) + (e.allowances || 0) - (e.deductions || 0) - dailyRate * absent);
}

function fmt(n) { return Number(n || 0).toLocaleString('en-PK'); }

// ─── Fetch logo as base64 ──────────────────────────────────────────────────
async function fetchLogoBase64() {
  const urls = ['/s-logo.png', '/logo.jpeg'];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch { continue; }
  }
  return null;
}

// ─── Premium Full-Page Salary Slip HTML ───────────────────────────────────────
function generateSlipHTML(emp, monthName, year, logoBase64) {
  const wd            = emp.workingDays || 26;
  const absent        = Math.max(0, wd - (emp.presentDays || 0) - (emp.leaves || 0));
  const dailyRate     = wd > 0 ? (emp.basicSalary || 0) / wd : 0;
  const absentDeduct  = Math.round(dailyRate * absent);
  const totalEarnings = Math.round((emp.basicSalary || 0) + (emp.allowances || 0));
  const totalDeduct   = Math.round((emp.deductions  || 0) + absentDeduct);
  const netSalary     = totalEarnings - totalDeduct;
  const today         = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' });
  const joinDateFmt   = emp.joinDate
    ? new Date(emp.joinDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Salary Slip — ${emp.firstName} ${emp.lastName} — ${monthName} ${year}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#e8eaf0;font-family:'Segoe UI',Calibri,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{display:flex;justify-content:center;align-items:flex-start;padding:20px 16px 32px}

/* ── Page wrapper — full A4 ── */
.page{
  width:210mm;min-height:297mm;
  background:#fff;
  display:flex;flex-direction:column;
  box-shadow:0 8px 48px rgba(0,0,0,.18);
  position:relative;overflow:hidden;
}

/* ══ HEADER ══ */
.hdr{
  background:linear-gradient(135deg,#0a0e1a 0%,#111827 55%,#0a0e1a 100%);
  padding:0;display:flex;flex-direction:column;flex-shrink:0;
  position:relative;overflow:hidden;
}
/* decorative circles */
.hdr::before{content:'';position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:rgba(220,38,38,.07);pointer-events:none}
.hdr::after{content:'';position:absolute;right:60px;top:-90px;width:160px;height:160px;border-radius:50%;background:rgba(220,38,38,.05);pointer-events:none}

.hdr-top{display:flex;align-items:center;justify-content:space-between;padding:28px 36px 20px}
.hdr-brand{display:flex;align-items:center;gap:18px;z-index:1}
.hdr-logo{width:80px;height:80px;object-fit:contain;border-radius:12px;background:#1e2a3a;padding:6px;display:block;flex-shrink:0}
.hdr-logo-box{width:80px;height:80px;border-radius:12px;background:#1e2a3a;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.hdr-logo-box span{color:#475569;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
.co-name{color:#f1f5f9;font-size:22px;font-weight:800;letter-spacing:.4px;line-height:1.2}
.co-sub{color:#475569;font-size:10.5px;margin-top:4px;text-transform:uppercase;letter-spacing:1.2px;font-weight:600}
.co-divider{width:36px;height:2px;background:linear-gradient(90deg,#dc2626,transparent);margin-top:8px;border-radius:2px}

.hdr-right{text-align:right;z-index:1}
.slip-label{color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px}
.slip-title{color:#f1f5f9;font-size:32px;font-weight:900;letter-spacing:4px;text-transform:uppercase;line-height:1;text-shadow:0 2px 12px rgba(0,0,0,.4)}
.slip-period{margin-top:10px;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(90deg,#dc2626,#9f1239);color:#fff;font-size:10px;font-weight:800;padding:5px 16px;border-radius:100px;letter-spacing:2px;text-transform:uppercase}

/* Red accent strip */
.hdr-bar{height:4px;background:linear-gradient(90deg,#dc2626 0%,#f87171 40%,#dc2626 70%,#7f1d1d 100%)}

/* ══ EMPLOYEE SECTION ══ */
.emp-section{background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:20px 36px;flex-shrink:0}
.emp-header-row{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}
.emp-name-block .emp-name{font-size:20px;font-weight:800;color:#0f172a;line-height:1.2}
.emp-name-block .emp-meta{font-size:11px;color:#64748b;margin-top:4px;font-weight:500}
.emp-id-badge{background:#0f172a;color:#f1f5f9;font-size:10px;font-weight:800;padding:5px 14px;border-radius:6px;letter-spacing:1.5px;text-transform:uppercase;white-space:nowrap}
.emp-details-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px 20px}
.ed{padding:10px 14px;background:#fff;border:1px solid #e2e8f0;border-radius:8px}
.ed label{display:block;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:3px}
.ed span{font-size:11.5px;font-weight:700;color:#1e293b;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* ══ BODY ══ */
.body{padding:22px 36px;flex:1;display:flex;flex-direction:column;gap:16px}

/* section title */
.sec-title{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:1.8px;color:#94a3b8;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.sec-title::after{content:'';flex:1;height:1px;background:#e2e8f0}

/* ── Earnings & Deductions table ── */
.fin-table{width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
.fin-table thead tr th{padding:10px 16px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px}
.fin-table thead .th-earn{background:linear-gradient(90deg,#052e16,#14532d);color:#86efac;text-align:left;width:50%}
.fin-table thead .th-deduct{background:linear-gradient(90deg,#450a0a,#7f1d1d);color:#fca5a5;text-align:left;border-left:2px solid #fff}
.fin-table tbody tr td{padding:9px 16px;font-size:12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
.fin-table tbody tr:last-child td{border-bottom:none}
.fin-table tbody .td-earn-lbl{color:#475569;width:30%}
.fin-table tbody .td-earn-val{color:#0f172a;font-weight:700;text-align:right;width:20%}
.fin-table tbody .td-deduct-lbl{color:#475569;border-left:2px solid #f1f5f9;padding-left:20px;width:30%}
.fin-table tbody .td-deduct-val{color:#0f172a;font-weight:700;text-align:right;width:20%}
.fin-table tfoot td{padding:10px 16px;font-size:12.5px;font-weight:800}
.fin-table tfoot .tf-earn{background:#f0fdf4;color:#15803d}
.fin-table tfoot .tf-earn-val{background:#f0fdf4;color:#15803d;text-align:right}
.fin-table tfoot .tf-deduct{background:#fef2f2;color:#dc2626;border-left:2px solid #fff;padding-left:20px}
.fin-table tfoot .tf-deduct-val{background:#fef2f2;color:#dc2626;text-align:right}

/* ── Attendance ── */
.att-row{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
.att-cell{text-align:center;padding:16px 10px;border-right:1px solid #e2e8f0;position:relative}
.att-cell:last-child{border-right:none}
.att-cell .icon-bar{width:28px;height:3px;border-radius:2px;margin:0 auto 10px}
.att-cell.wdays .icon-bar{background:#3b82f6}
.att-cell.present .icon-bar{background:#22c55e}
.att-cell.leaves .icon-bar{background:#f59e0b}
.att-cell.absent .icon-bar{background:#ef4444}
.att-big{font-size:30px;font-weight:900;line-height:1;color:#0f172a}
.att-cell.present .att-big{color:#16a34a}
.att-cell.leaves .att-big{color:#d97706}
.att-cell.absent .att-big{color:${absent > 0 ? '#dc2626' : '#94a3b8'}}
.att-small{font-size:9px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#94a3b8;margin-top:5px}

/* ── Net Salary ── */
.net-band{
  background:linear-gradient(135deg,#0a0e1a 0%,#111827 60%,#1e1030 100%);
  border-radius:12px;padding:22px 32px;
  display:flex;align-items:center;justify-content:space-between;
  position:relative;overflow:hidden;flex-shrink:0;
}
.net-band::before{content:'';position:absolute;left:-30px;bottom:-30px;width:140px;height:140px;border-radius:50%;background:rgba(220,38,38,.08)}
.net-band::after{content:'';position:absolute;right:80px;top:-50px;width:120px;height:120px;border-radius:50%;background:rgba(220,38,38,.05)}
.net-left{z-index:1}
.net-label{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#475569;margin-bottom:6px}
.net-amount{font-size:36px;font-weight:900;color:#f8fafc;letter-spacing:.5px;line-height:1}
.net-amount .net-cur{font-size:15px;color:#94a3b8;font-weight:500;margin-right:6px;vertical-align:middle}
.net-right{text-align:right;z-index:1}
.net-verified{background:linear-gradient(90deg,#dc2626,#7f1d1d);color:#fff;font-size:9px;font-weight:800;padding:5px 16px;border-radius:100px;letter-spacing:2px;text-transform:uppercase;display:inline-block;margin-bottom:8px}
.net-period-text{color:#475569;font-size:10px;font-weight:600}
.net-breakdown{color:#374151;font-size:10px;margin-top:4px}

/* ── Spacer ── */
.spacer{flex:1}

/* ── Footer ── */
.footer{border-top:2px solid #e2e8f0;padding:20px 36px 24px;flex-shrink:0;background:#f8fafc}
.footer-inner{display:flex;align-items:flex-end;justify-content:space-between}
.sig-block{text-align:center;min-width:160px}
.sig-space{height:40px}
.sig-line-el{border-bottom:1.5px dashed #94a3b8;width:160px;margin:0 auto 6px}
.sig-name{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#475569}
.sig-title{font-size:8px;color:#94a3b8;margin-top:2px}
.footer-center{text-align:center}
.stamp-circle{width:64px;height:64px;border-radius:50%;border:2px dashed #e2e8f0;margin:0 auto 8px;display:flex;align-items:center;justify-content:center}
.stamp-text{font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#cbd5e1;text-align:center;line-height:1.4}
.gen-date{font-size:8.5px;color:#94a3b8;margin-top:4px}
.footer-bar{margin-top:16px;height:3px;background:linear-gradient(90deg,#dc2626 0%,#f87171 40%,#dc2626 70%,#111827 100%);border-radius:2px}

/* ══ PRINT ══ */
@media print{
  html,body{background:#fff !important;padding:0 !important;margin:0 !important;height:auto !important}
  .page{box-shadow:none !important;width:100% !important;min-height:100vh !important}
  @page{size:A4 portrait;margin:0}
}
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="hdr">
    <div class="hdr-top">
      <div class="hdr-brand">
        ${logoBase64
          ? `<img class="hdr-logo" src="${logoBase64}" alt="Company Logo">`
          : `<div class="hdr-logo-box"><span>LOGO</span></div>`
        }
        <div>
          <div class="co-name">Webix Solutions</div>
          <div class="co-sub">Digital Marketing Agency</div>
          <div class="co-divider"></div>
        </div>
      </div>
      <div class="hdr-right">
        <div class="slip-label">Official Document</div>
        <div class="slip-title">Salary Slip</div>
        <div class="slip-period">${monthName} &nbsp; ${year}</div>
      </div>
    </div>
    <div class="hdr-bar"></div>
  </div>

  <!-- EMPLOYEE INFO -->
  <div class="emp-section">
    <div class="emp-header-row">
      <div class="emp-name-block">
        <div class="emp-name">${emp.firstName} ${emp.lastName}</div>
        <div class="emp-meta">${emp.designation || 'Employee'} &nbsp;·&nbsp; ${emp.department?.name || 'N/A'} &nbsp;·&nbsp; Pay Period: ${monthName} ${year}</div>
      </div>
      <div class="emp-id-badge">${emp.employeeId || 'EMP'}</div>
    </div>
    <div class="emp-details-grid">
      <div class="ed"><label>Department</label><span>${emp.department?.name || '—'}</span></div>
      <div class="ed"><label>Designation</label><span>${emp.designation || '—'}</span></div>
      <div class="ed"><label>Join Date</label><span>${joinDateFmt}</span></div>
      <div class="ed"><label>Employment Type</label><span>Full Time</span></div>
      <div class="ed"><label>Bank Name</label><span>${emp.bankName || '—'}</span></div>
      <div class="ed"><label>Account Number</label><span>${emp.accountNumber || '—'}</span></div>
      <div class="ed"><label>Account Title</label><span>${emp.accountTitle || emp.firstName + ' ' + emp.lastName}</span></div>
      <div class="ed"><label>Pay Date</label><span>${today}</span></div>
    </div>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- Earnings & Deductions -->
    <div>
      <div class="sec-title">Earnings &amp; Deductions</div>
      <table class="fin-table">
        <thead>
          <tr>
            <th class="th-earn" colspan="2">&#9650; Earnings</th>
            <th class="th-deduct" colspan="2">&#9660; Deductions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="td-earn-lbl">Basic Salary</td>
            <td class="td-earn-val">PKR ${fmt(emp.basicSalary)}</td>
            <td class="td-deduct-lbl">Deductions</td>
            <td class="td-deduct-val">PKR ${fmt(emp.deductions)}</td>
          </tr>
          <tr>
            <td class="td-earn-lbl">Allowances</td>
            <td class="td-earn-val">PKR ${fmt(emp.allowances)}</td>
            <td class="td-deduct-lbl">Absent Deduction</td>
            <td class="td-deduct-val">PKR ${fmt(absentDeduct)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td class="tf-earn">Total Earnings</td>
            <td class="tf-earn-val">PKR ${fmt(totalEarnings)}</td>
            <td class="tf-deduct">Total Deductions</td>
            <td class="tf-deduct-val">PKR ${fmt(totalDeduct)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Attendance -->
    <div>
      <div class="sec-title">Attendance Summary</div>
      <div class="att-row">
        <div class="att-cell wdays">
          <div class="icon-bar"></div>
          <div class="att-big">${wd}</div>
          <div class="att-small">Working Days</div>
        </div>
        <div class="att-cell present">
          <div class="icon-bar"></div>
          <div class="att-big">${emp.presentDays || 0}</div>
          <div class="att-small">Present</div>
        </div>
        <div class="att-cell leaves">
          <div class="icon-bar"></div>
          <div class="att-big">${emp.leaves || 0}</div>
          <div class="att-small">Paid Leaves</div>
        </div>
        <div class="att-cell absent">
          <div class="icon-bar"></div>
          <div class="att-big">${absent}</div>
          <div class="att-small">Absent</div>
        </div>
      </div>
    </div>

    <div class="spacer"></div>

    <!-- Net Salary -->
    <div class="net-band">
      <div class="net-left">
        <div class="net-label">Net Salary Payable</div>
        <div class="net-amount"><span class="net-cur">PKR</span>${fmt(netSalary)}</div>
        <div class="net-breakdown" style="color:#475569;margin-top:6px;font-size:10px">
          PKR ${fmt(totalEarnings)} earnings &minus; PKR ${fmt(totalDeduct)} deductions
        </div>
      </div>
      <div class="net-right">
        <div class="net-verified">&#10003; Verified</div>
        <div class="net-period-text">${monthName} ${year}</div>
      </div>
    </div>

  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-inner">
      <div class="sig-block">
        <div class="sig-space"></div>
        <div class="sig-line-el"></div>
        <div class="sig-name">HR Manager</div>
        <div class="sig-title">Human Resources</div>
      </div>
      <div class="footer-center">
        <div class="stamp-circle">
          <div class="stamp-text">COMPANY<br>SEAL</div>
        </div>
        <div class="gen-date">Generated on ${today}</div>
        <div style="font-size:7.5px;color:#cbd5e1;margin-top:2px">This is a system-generated document</div>
      </div>
      <div class="sig-block">
        <div class="sig-space"></div>
        <div class="sig-line-el"></div>
        <div class="sig-name">Employee</div>
        <div class="sig-title">${emp.firstName} ${emp.lastName}</div>
      </div>
    </div>
    <div class="footer-bar"></div>
  </div>

</div>
</body>
</html>`;
}

// ─── Print helpers ─────────────────────────────────────────────────────────────
async function printSingleSlip(emp, monthName, year) {
  const logo = await fetchLogoBase64();
  const win = window.open('', '_blank', 'width=950,height=750');
  win.document.write(generateSlipHTML(emp, monthName, year, logo));
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 700);
}

async function printMultipleSlips(employees, monthName, year) {
  const logo = await fetchLogoBase64();
  const slips = employees.map(e =>
    generateSlipHTML(e, monthName, year, logo)
      .replace(/<!DOCTYPE[^>]*>|<html[^>]*>|<\/html>|<head>[\s\S]*?<\/head>|<body[^>]*>|<\/body>/gi, '')
      .trim()
  );
  const combined = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{background:#e8eaf0;font-family:'Segoe UI',Arial,sans-serif}
  .slip-wrapper{page-break-after:always;break-after:page;padding:20px 0}
  .slip-wrapper:last-child{page-break-after:avoid;break-after:avoid}
  @media print{
    html,body{background:#fff !important;padding:0 !important}
    .slip-wrapper{padding:0 !important}
    @page{size:A4 portrait;margin:0}
  }
</style>
</head><body>${slips.map(s => `<div class="slip-wrapper">${s}</div>`).join('')}</body></html>`;
  const win = window.open('', '_blank', 'width=960,height=800');
  win.document.write(combined);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 900);
}

// ─── EditableCell ──────────────────────────────────────────────────────────────
function EditableCell({ value, onChange, min = 0, width = 'w-24' }) {
  return (
    <Input
      type="number" min={min} value={value ?? ''}
      onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      className={`h-7 ${width} text-xs text-center px-1 border-gray-200 focus:border-red-400 focus:ring-red-100`}
    />
  );
}

// ─── Department Group ──────────────────────────────────────────────────────────
function DeptGroup({ deptName, employees, monthName, year, onChange, savedIds }) {
  const [collapsed, setCollapsed] = useState(false);
  const deptNet = employees.reduce((s, e) => s + calcNet(e), 0);

  return (
    <div className="mb-4 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
      <div
        onClick={() => setCollapsed(p => !p)}
        className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          {collapsed ? <ChevronRight className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          <Building2 className="h-4 w-4 text-red-400" />
          <span className="font-semibold text-sm">{deptName}</span>
          <span className="text-gray-500 text-xs">({employees.length})</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Total: <strong className="text-white font-bold">PKR {fmt(deptNet)}</strong>
          </span>
          <Button size="sm" variant="ghost"
            className="h-7 text-xs text-gray-300 hover:text-white hover:bg-gray-700 border border-gray-700 px-2.5"
            onClick={e => { e.stopPropagation(); printMultipleSlips(employees, monthName, year); }}>
            <Printer className="h-3 w-3 mr-1" /> Print Dept
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-500 w-48">Employee</th>
                <th className="text-right px-3 py-2.5 font-semibold text-gray-500">Basic Salary</th>
                <th className="text-center px-3 py-2.5 font-semibold text-gray-500">Allowances</th>
                <th className="text-center px-3 py-2.5 font-semibold text-gray-500">Deductions</th>
                <th className="text-center px-3 py-2.5 font-semibold text-gray-500">Work Days</th>
                <th className="text-center px-3 py-2.5 font-semibold text-gray-500">Present</th>
                <th className="text-center px-3 py-2.5 font-semibold text-gray-500">Leaves</th>
                <th className="text-center px-3 py-2.5 font-semibold text-red-500">Absent</th>
                <th className="text-right px-3 py-2.5 font-semibold text-green-600">Net Salary</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map(emp => {
                const absent = Math.max(0, (emp.workingDays || 26) - (emp.presentDays || 0) - (emp.leaves || 0));
                const net = calcNet(emp);
                const isSaved = savedIds.has(emp._id);
                return (
                  <tr key={emp._id} className={`hover:bg-gray-50 transition-colors ${isSaved ? 'bg-green-50/40' : ''}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {isSaved && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />}
                        <div>
                          <p className="font-semibold text-gray-900">{emp.firstName} {emp.lastName}</p>
                          <p className="text-gray-400 text-[10px]">{emp.employeeId} · {emp.designation || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-800">{fmt(emp.basicSalary)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <EditableCell value={emp.allowances} onChange={v => onChange(emp._id, 'allowances', v)} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <EditableCell value={emp.deductions} onChange={v => onChange(emp._id, 'deductions', v)} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <EditableCell value={emp.workingDays} onChange={v => onChange(emp._id, 'workingDays', v)} min={1} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <EditableCell value={emp.presentDays} onChange={v => onChange(emp._id, 'presentDays', v)} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <EditableCell value={emp.leaves} onChange={v => onChange(emp._id, 'leaves', v)} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-bold tabular-nums ${absent > 0 ? 'text-red-500' : 'text-gray-300'}`}>{absent}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`font-bold tabular-nums ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        PKR {fmt(net)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Button size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-gray-800 hover:bg-gray-100"
                        onClick={() => printSingleSlip(emp, monthName, year)}
                        title="Print slip">
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300">
                <td colSpan={8} className="px-4 py-2.5 text-right text-xs font-bold text-gray-600">Department Total:</td>
                <td className="px-3 py-2.5 text-right font-bold text-green-600">PKR {fmt(deptNet)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PayrollPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [deptFilter, setDeptFilter] = useState('');
  const [search, setSearch] = useState('');
  const [departments, setDepartments] = useState([]);
  const [payroll, setPayroll] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());

  useEffect(() => {
    axios.get('/api/hr/departments').then(r => setDepartments(r.data || [])).catch(() => {});
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, recordRes] = await Promise.all([
        axios.get('/api/hr/employees?limit=500&status=active&financial=true'),
        axios.get(`/api/hr/payroll?month=${month}&year=${year}`).catch(() => ({ data: [] })),
      ]);

      const emps    = empRes.data.employees || empRes.data || [];
      const records = recordRes.data || [];
      const workDays = getWorkingDays(year, month);

      // Build a map of saved records by employee_id
      const recordMap = {};
      records.forEach(r => {
        const eid = r.employee_id?._id || r.employee_id;
        recordMap[eid] = r;
      });

      const map = {};
      emps.forEach(e => {
        const saved = recordMap[e._id];
        map[e._id] = {
          ...e,
          // Pre-fill from employee table; override with saved record if exists
          basicSalary:  saved ? saved.basicSalary  : (e.salary      || 0),
          allowances:   saved ? saved.allowances   : (e.allowances  || 0),
          deductions:   saved ? saved.deductions   : (e.deductions  || 0),
          workingDays:  saved ? saved.workingDays  : workDays,
          presentDays:  saved ? saved.presentDays  : workDays,
          leaves:       saved ? saved.leaves       : 0,
        };
      });

      setSavedIds(new Set(Object.keys(recordMap)));
      setPayroll(map);
      setLoaded(true);
    } catch {
      toast({ title: 'Failed to load employees', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  const handleChange = (empId, field, value) => {
    setPayroll(prev => ({ ...prev, [empId]: { ...prev[empId], [field]: value } }));
  };

  const handleSave = async (finalize = false) => {
    const allEmps = Object.values(payroll);
    if (!allEmps.length) return;
    setSaving(true);
    try {
      const records = allEmps.map(e => {
        const wd     = e.workingDays || 26;
        const absent = Math.max(0, wd - (e.presentDays || 0) - (e.leaves || 0));
        return {
          employee_id: e._id,
          basicSalary: e.basicSalary || 0,
          allowances:  e.allowances  || 0,
          deductions:  e.deductions  || 0,
          workingDays: wd,
          presentDays: e.presentDays || 0,
          leaves:      e.leaves      || 0,
          absentDays:  absent,
          netSalary:   calcNet(e),
        };
      });
      await axios.post('/api/hr/payroll', { month, year, records, finalize });
      setSavedIds(new Set(allEmps.map(e => e._id)));
      toast({ title: finalize ? 'Payroll finalized!' : 'Payroll saved as draft', description: `${records.length} records stored for ${MONTHS[month - 1]} ${year}` });
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const monthName = MONTHS[month - 1];
  const allEmps   = Object.values(payroll);

  const filtered = allEmps.filter(e => {
    const deptId = e.department?._id || e.department;
    if (deptFilter && deptId?.toString() !== deptFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (`${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || (e.employeeId || '').toLowerCase().includes(q));
    }
    return true;
  });

  const grouped = {};
  filtered.forEach(e => {
    const name = e.department?.name || 'No Department';
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push(e);
  });

  const totalNet  = filtered.reduce((s, e) => s + calcNet(e), 0);
  const years     = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const savedCount = [...filtered].filter(e => savedIds.has(e._id)).length;

  return (
    <>
      <Header title="Payroll" subtitle="Manage monthly payroll, attendance and generate salary slips" />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">

        {/* Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500">Month</p>
                <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                  <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500">Year</p>
                <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                  <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500">Department</p>
                <Select value={deptFilter || 'all'} onValueChange={v => setDeptFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9 w-44"><SelectValue placeholder="All Departments" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500">Search</p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or ID..." className="h-9 pl-8 w-44" />
                </div>
              </div>

              <Button onClick={loadEmployees} disabled={loading} className="h-9 bg-gray-900 hover:bg-gray-800 text-white">
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                {loaded ? 'Reload' : 'Load Employees'}
              </Button>

              {loaded && (
                <div className="flex items-center gap-2 ml-auto">
                  <Button onClick={() => handleSave(false)} disabled={saving}
                    variant="outline" className="h-9 border-gray-300 text-gray-700 hover:bg-gray-50">
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {saving ? 'Saving…' : 'Save Draft'}
                  </Button>
                  <Button onClick={() => handleSave(true)} disabled={saving}
                    className="h-9 bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Finalize Payroll
                  </Button>
                  <Button onClick={() => printMultipleSlips(filtered, monthName, year)}
                    className="h-9 bg-red-600 hover:bg-red-700 text-white">
                    <Printer className="h-3.5 w-3.5 mr-1.5" />
                    Print All ({filtered.length})
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {loaded && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Employees', value: filtered.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Departments', value: Object.keys(grouped).length, icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Total Net Payroll', value: `PKR ${fmt(totalNet)}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
              {
                label: savedCount > 0 ? `${savedCount} Saved` : 'Unsaved',
                value: `${monthName} ${year}`,
                icon: savedCount === filtered.length && filtered.length > 0 ? CheckCircle2 : FileText,
                color: savedCount === filtered.length && filtered.length > 0 ? 'text-green-600' : 'text-gray-500',
                bg: savedCount === filtered.length && filtered.length > 0 ? 'bg-green-50' : 'bg-gray-100',
              },
            ].map((s, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                    <s.icon className={`h-4.5 w-4.5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900 leading-tight">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loaded && (
          <div className="text-center py-24 text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium text-gray-500">Select month &amp; year, then click <strong>Load Employees</strong></p>
            <p className="text-xs mt-1">Salary, allowances &amp; deductions will be pre-filled from employee records</p>
          </div>
        )}

        {loaded && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">No employees match the current filters.</div>
        )}

        {/* Payroll Grid */}
        {loaded && Object.entries(grouped).map(([deptName, emps]) => (
          <DeptGroup
            key={deptName}
            deptName={deptName}
            employees={emps}
            monthName={monthName}
            year={year}
            onChange={handleChange}
            savedIds={savedIds}
          />
        ))}

        {/* Grand Total */}
        {loaded && filtered.length > 0 && (
          <div className="flex items-center justify-between bg-gray-900 text-white rounded-xl px-6 py-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-400" />
              <span className="font-semibold">Grand Total Payroll — {monthName} {year}</span>
            </div>
            <span className="text-xl font-bold text-green-400">PKR {fmt(totalNet)}</span>
          </div>
        )}

      </div>
    </>
  );
}
