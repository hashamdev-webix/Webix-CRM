'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';
import { Mail, Phone, Copy, CheckCircle, Send, MessageSquare } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';

const CALL_OUTCOMES = [
  { value: 'connected', label: 'Connected' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'busy', label: 'Busy' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'follow_up_requested', label: 'Follow-up Requested' },
];

function copyToClipboard(text, label) {
  navigator.clipboard.writeText(text).then(() => {
    toast({ title: `${label} copied to clipboard`, variant: 'success' });
  });
}

// ─── Email Panel ──────────────────────────────────────────────────────────────
function EmailPanel({ lead, leadType }) {
  const [emails, setEmails] = useState([]);
  const [notes, setNotes] = useState('');
  const [logging, setLogging] = useState(false);
  const canSend = usePermission('outreach.email.send');

  const fetchEmails = useCallback(async () => {
    try {
      const res = await axios.get(`/api/outreach/email?lead_id=${lead._id}&lead_type=${leadType}`);
      setEmails(res.data);
    } catch {}
  }, [lead._id, leadType]);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  const handleLogEmail = async () => {
    setLogging(true);
    try {
      await axios.post('/api/outreach/email', {
        lead_id: lead._id,
        lead_type: leadType,
        message_body: notes.trim() || '(Manual outreach — no notes)',
      });
      toast({ title: 'Email logged & follow-up scheduled', variant: 'success' });
      setNotes('');
      fetchEmails();
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Failed to log email', variant: 'destructive' });
    } finally {
      setLogging(false);
    }
  };

  const email = lead.email_address;

  return (
    <div className="space-y-4">
      {/* Email address display */}
      <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
        <Mail className="h-5 w-5 text-indigo-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-0.5">Email Address</p>
          <p className="font-semibold text-gray-900 truncate">{email || 'No email on file'}</p>
        </div>
        {email && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => copyToClipboard(email, 'Email')}
            className="flex-shrink-0"
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            Copy
          </Button>
        )}
      </div>

      {/* Log manual email */}
      {canSend && email && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700">Log Email Sent</h3>
          <p className="text-xs text-gray-500">Copy the email above, send it manually, then log it here to track outreach and schedule a follow-up.</p>
          <div className="space-y-1">
            <Label className="text-xs">Notes (optional)</Label>
            <textarea
              className="w-full min-h-[70px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="What did you write about? Any key points..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={handleLogEmail} disabled={logging} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {logging ? 'Logging...' : 'Mark Email as Sent'}
          </Button>
        </div>
      )}

      {/* History */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Email History ({emails.length})
        </h3>
        {emails.length === 0 ? (
          <p className="text-xs text-gray-400 pl-1">No emails logged yet.</p>
        ) : emails.map((em) => (
          <div key={em._id} className="border rounded-lg p-3 bg-white space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs font-medium text-gray-700">Email sent</span>
              </div>
              <span className="text-xs text-gray-400">{formatDateTime(em.sent_at)}</span>
            </div>
            {em.message_body && em.message_body !== '(Manual outreach — no notes)' && (
              <p className="text-xs text-gray-500 pl-5">{em.message_body}</p>
            )}
            <p className="text-xs text-gray-400 pl-5">by {em.sent_by?.name || 'Unknown'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Phone Panel ──────────────────────────────────────────────────────────────
function PhonePanel({ lead, leadType }) {
  const [scripts, setScripts] = useState([]);
  const [form, setForm] = useState({ script_id: '', outcome: '', notes: '' });
  const [selectedScript, setSelectedScript] = useState(null);
  const [logging, setLogging] = useState(false);
  const [calls, setCalls] = useState([]);
  const canLog = usePermission('outreach.phone.log');

  useEffect(() => {
    axios.get('/api/admin/config/call_scripts')
      .then((r) => setScripts(r.data.filter((s) => s.is_active)))
      .catch(() => {});
    axios.get(`/api/outreach/call?lead_id=${lead._id}&lead_type=${leadType}`)
      .then((r) => setCalls(r.data))
      .catch(() => {});
  }, [lead._id, leadType]);

  const handleScriptChange = (scriptId) => {
    setForm((f) => ({ ...f, script_id: scriptId }));
    setSelectedScript(scripts.find((s) => s._id === scriptId) || null);
  };

  const handleLog = async () => {
    if (!form.outcome) {
      toast({ title: 'Please select a call outcome', variant: 'destructive' });
      return;
    }
    setLogging(true);
    try {
      const res = await axios.post('/api/outreach/call', {
        lead_id: lead._id,
        lead_type: leadType,
        ...form,
      });
      toast({ title: 'Call logged', variant: 'success' });
      setCalls((prev) => [res.data?.call || {}, ...prev]);
      setForm({ script_id: '', outcome: '', notes: '' });
      setSelectedScript(null);
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Failed to log call', variant: 'destructive' });
    } finally {
      setLogging(false);
    }
  };

  const phone = lead.phone_number;

  return (
    <div className="space-y-4">
      {/* Phone number display */}
      <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg border border-orange-100">
        <Phone className="h-5 w-5 text-orange-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-0.5">Phone Number</p>
          <p className="font-semibold text-gray-900">{phone || 'No phone on file'}</p>
        </div>
        {phone && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => copyToClipboard(phone, 'Phone number')}
            className="flex-shrink-0"
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            Copy
          </Button>
        )}
      </div>

      {/* Log call */}
      {canLog && phone && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700">Log Call</h3>

          {scripts.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Script (optional)</Label>
              <Select value={form.script_id} onValueChange={handleScriptChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a script to view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No script</SelectItem>
                  {scripts.map((s) => <SelectItem key={s._id} value={s._id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedScript && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg text-xs text-gray-700 whitespace-pre-wrap max-h-28 overflow-y-auto">
                  {selectedScript.body_text}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Call Outcome <span className="text-red-500">*</span></Label>
            <Select value={form.outcome} onValueChange={(v) => setForm((f) => ({ ...f, outcome: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="What happened?" />
              </SelectTrigger>
              <SelectContent>
                {CALL_OUTCOMES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Notes (optional)</Label>
            <textarea
              className="w-full min-h-[60px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="What was discussed?"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <Button size="sm" onClick={handleLog} disabled={logging} className="w-full">
            <Phone className="h-4 w-4 mr-2" />
            {logging ? 'Logging...' : 'Log Call'}
          </Button>
        </div>
      )}

      {/* Call history */}
      {calls.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">Call History ({calls.length})</h3>
          {calls.map((call, i) => (
            <div key={call._id || i} className="border rounded-lg p-3 bg-white space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={call.outcome === 'interested' ? 'success' : call.outcome === 'not_interested' ? 'destructive' : 'secondary'} className="text-xs capitalize">
                  {call.outcome?.replace('_', ' ') || 'logged'}
                </Badge>
                <span className="text-xs text-gray-400">{formatDateTime(call.logged_at || call.createdAt)}</span>
              </div>
              {call.notes && <p className="text-xs text-gray-500">{call.notes}</p>}
              <p className="text-xs text-gray-400">by {call.logged_by?.name || 'Unknown'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── OutreachPanel: channel selector ─────────────────────────────────────────
export default function OutreachPanel({ lead, leadType }) {
  const contactType = lead.contact_type;
  const showEmail = !contactType || contactType === 'email' || contactType === 'both' || leadType === 'social';
  const showPhone = contactType === 'phone' || contactType === 'both';
  const [channel, setChannel] = useState(showEmail ? 'email' : 'phone');

  return (
    <div className="space-y-4">
      {showEmail && showPhone && (
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
          <button
            onClick={() => setChannel('email')}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              channel === 'email' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Mail className="h-4 w-4" /> Email
          </button>
          <button
            onClick={() => setChannel('phone')}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              channel === 'phone' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Phone className="h-4 w-4" /> Phone
          </button>
        </div>
      )}

      {channel === 'email' && showEmail && <EmailPanel lead={lead} leadType={leadType} />}
      {channel === 'phone' && showPhone && <PhonePanel lead={lead} leadType={leadType} />}
    </div>
  );
}
