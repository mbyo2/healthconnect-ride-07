import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FileX2, Plus, Loader2, AlertTriangle, Clock, CheckCircle, Archive, Inbox,
  Eye, RefreshCw, User, Building2, CalendarClock, XCircle,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { DenialSummaryWidget } from './DenialSummaryWidget';

type DenialStatus = 'new' | 'in_review' | 'appealed' | 'resolved' | 'written_off';

interface ClaimDenial {
  id: string;
  institution_id: string;
  claim_id: string | null;
  denial_code: string | null;
  denial_reason: string;
  denied_amount: number;
  status: DenialStatus;
  assigned_to: string | null;
  appeal_deadline: string | null;
  appeal_notes: string | null;
  supporting_documents: unknown[];
  created_at: string;
  resolved_at: string | null;
  updated_at: string;
  insurance_claims?: {
    policy_number: string | null;
    patient_name: string | null;
    insurance_provider: string | null;
    denied?: boolean;
  } | null;
}

interface DeniedClaimOption {
  id: string;
  policy_number: string;
  patient_name: string;
  insurance_provider: string;
  claim_amount: number;
  rejection_reason: string | null;
}

interface StaffOption {
  provider_id: string;
  name: string;
}

const STATUS_CONFIG: Record<DenialStatus, { label: string; badgeClass: string; icon: React.ReactNode }> = {
  new: { label: 'New', badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', icon: <Inbox className="h-3 w-3" /> },
  in_review: { label: 'In Review', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', icon: <Eye className="h-3 w-3" /> },
  appealed: { label: 'Appealed', badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', icon: <RefreshCw className="h-3 w-3" /> },
  resolved: { label: 'Resolved', badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', icon: <CheckCircle className="h-3 w-3" /> },
  written_off: { label: 'Written Off', badgeClass: 'bg-muted text-muted-foreground', icon: <Archive className="h-3 w-3" /> },
};

const formatMoney = (n: number) => `K${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Deadline urgency: 0 = overdue, 1 = due soon, 2 = later, 3 = none (null deadlines sort last). */
const deadlineBucket = (deadline: string | null): number => {
  if (!deadline) return 3;
  const days = differenceInDays(parseISO(deadline), startOfToday());
  if (days < 0) return 0;
  if (days <= 7) return 1;
  return 2;
};

export const DenialWorkqueue: React.FC = () => {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();

  const [denials, setDenials] = useState<ClaimDenial[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [deniedClaimOptions, setDeniedClaimOptions] = useState<DeniedClaimOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  const [selected, setSelected] = useState<ClaimDenial | null>(null);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [showWriteoffDialog, setShowWriteoffDialog] = useState(false);

  const [appealNotes, setAppealNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [writeoffReason, setWriteoffReason] = useState('');

  const [logForm, setLogForm] = useState({
    claim_id: '__standalone__',
    denial_code: '',
    denial_reason: '',
    denied_amount: 0,
    appeal_deadline: '',
    assigned_to: '__unassigned__',
  });

  const staffName = useCallback(
    (providerId: string | null) => {
      if (!providerId) return 'Unassigned';
      const found = staff.find(s => s.provider_id === providerId);
      if (found) return found.name;
      if (user?.id === providerId) return 'You';
      return providerId.slice(0, 8) + '…';
    },
    [staff, user]
  );

  const fetchDenials = useCallback(async () => {
    if (!institutionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('claim_denials')
        .select('*, insurance_claims ( policy_number, patient_name, insurance_provider )')
        .eq('institution_id', institutionId)
        .limit(200);

      if (error) throw error;
      setDenials((data as unknown as ClaimDenial[]) || []);
    } catch (err) {
      console.error('Failed to fetch denials:', err);
      toast.error('Failed to load denial workqueue');
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  const fetchStaff = useCallback(async () => {
    if (!institutionId) return;
    try {
      const { data, error } = await supabase
        .from('institution_staff')
        .select('provider_id, profile:profiles!institution_staff_provider_id_fkey(first_name, last_name)')
        .eq('institution_id', institutionId)
        .eq('is_active', true);

      if (error) throw error;
      const rows = (data || []) as Array<{ provider_id: string; profile: { first_name?: string; last_name?: string } | null }>;
      setStaff(
        rows.map(r => ({
          provider_id: r.provider_id,
          name: `${r.profile?.first_name || ''} ${r.profile?.last_name || ''}`.trim() || 'Staff member',
        }))
      );
    } catch (err) {
      console.error('Failed to fetch staff list:', err);
    }
  }, [institutionId]);

  const fetchDeniedClaims = useCallback(async () => {
    if (!institutionId) return;
    try {
      const { data, error } = await supabase
        .from('insurance_claims')
        .select('id, policy_number, patient_name, insurance_provider, claim_amount, rejection_reason')
        .eq('institution_id', institutionId)
        .eq('status', 'denied')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setDeniedClaimOptions((data as unknown as DeniedClaimOption[]) || []);
    } catch (err) {
      console.error('Failed to fetch denied claims:', err);
    }
  }, [institutionId]);

  useEffect(() => {
    fetchDenials();
    fetchStaff();
    fetchDeniedClaims();
  }, [fetchDenials, fetchStaff, fetchDeniedClaims]);

  const updateDenial = async (id: string, patch: Record<string, unknown>, successMsg: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('claim_denials').update(patch).eq('id', id);
      if (error) throw error;
      toast.success(successMsg);
      await fetchDenials();
      setSelected(prev => (prev && prev.id === id ? ({ ...prev, ...patch } as ClaimDenial) : prev));
    } catch (err) {
      console.error('Failed to update denial:', err);
      toast.error('Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selected) return;
    await updateDenial(selected.id, { appeal_notes: appealNotes }, 'Appeal notes saved');
  };

  const handleMarkStatus = async (status: DenialStatus) => {
    if (!selected) return;
    const patch: Record<string, unknown> = { status };
    if (status === 'in_review' && selected.status === 'new' && !selected.assigned_to && user?.id) {
      patch.assigned_to = user.id; // auto-assign on first touch
    }
    await updateDenial(selected.id, patch, `Denial marked as ${STATUS_CONFIG[status].label}`);
    setShowWriteoffDialog(false);
  };

  const handleWriteoffConfirm = async () => {
    if (!selected) return;
    const notes = writeoffReason.trim();
    const patch: Record<string, unknown> = { status: 'written_off' as DenialStatus };
    if (notes) {
      patch.appeal_notes = `${selected.appeal_notes ? selected.appeal_notes + '\n\n' : ''}Write-off reason: ${notes}`;
    }
    await updateDenial(selected.id, patch, 'Denial written off');
    setWriteoffReason('');
  };

  const handleAssign = async (providerId: string) => {
    if (!selected) return;
    await updateDenial(
      selected.id,
      { assigned_to: providerId === '__unassigned__' ? null : providerId },
      providerId === '__unassigned__' ? 'Denial unassigned' : `Assigned to ${staffName(providerId)}`
    );
  };

  const handleLogDenial = async () => {
    if (!institutionId) return;
    if (!logForm.denial_reason.trim()) {
      toast.error('Denial reason is required');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        institution_id: institutionId,
        denial_code: logForm.denial_code.trim() || null,
        denial_reason: logForm.denial_reason.trim(),
        denied_amount: Number(logForm.denied_amount) || 0,
        appeal_deadline: logForm.appeal_deadline || null,
        assigned_to: logForm.assigned_to === '__unassigned__' ? null : logForm.assigned_to,
      };
      if (logForm.claim_id !== '__standalone__') {
        payload.claim_id = logForm.claim_id;
        const opt = deniedClaimOptions.find(c => c.id === logForm.claim_id);
        if (opt && !payload.denied_amount) payload.denied_amount = opt.claim_amount;
      }
      const { error } = await supabase.from('claim_denials').insert(payload);
      if (error) throw error;
      toast.success('Denial logged to workqueue');
      setShowLogDialog(false);
      setLogForm({ claim_id: '__standalone__', denial_code: '', denial_reason: '', denied_amount: 0, appeal_deadline: '', assigned_to: '__unassigned__' });
      fetchDenials();
    } catch (err) {
      console.error('Failed to log denial:', err);
      toast.error('Failed to log denial. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const sortedDenials = useMemo(() => {
    let list = [...denials];
    if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter);
    if (assigneeFilter === 'unassigned') list = list.filter(d => !d.assigned_to);
    else if (assigneeFilter !== 'all') list = list.filter(d => d.assigned_to === assigneeFilter);
    return list.sort((a, b) => {
      const bucketDiff = deadlineBucket(a.appeal_deadline) - deadlineBucket(b.appeal_deadline);
      if (bucketDiff !== 0) return bucketDiff;
      if (a.appeal_deadline && b.appeal_deadline) return a.appeal_deadline.localeCompare(b.appeal_deadline);
      return b.created_at.localeCompare(a.created_at);
    });
  }, [denials, statusFilter, assigneeFilter]);

  const renderDeadlineBadge = (deadline: string | null) => {
    if (!deadline) {
      return <Badge variant="outline" className="text-xs">No deadline</Badge>;
    }
    const days = differenceInDays(parseISO(deadline), startOfToday());
    if (days < 0) {
      return (
        <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Overdue · {format(parseISO(deadline), 'MMM d')}
        </Badge>
      );
    }
    if (days <= 7) {
      return (
        <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          <Clock className="h-3 w-3 mr-1" />
          {days === 0 ? 'Due today' : `${days}d left`} · {format(parseISO(deadline), 'MMM d')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        <CalendarClock className="h-3 w-3 mr-1" />
        {format(parseISO(deadline), 'MMM d, yyyy')}
      </Badge>
    );
  };

  const openDetail = (denial: ClaimDenial) => {
    setSelected(denial);
    setAppealNotes(denial.appeal_notes || '');
    setWriteoffReason('');
  };

  return (
    <div className="space-y-6">
      <DenialSummaryWidget />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Denial Workqueue</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Denied claims sorted by appeal urgency — work overdue deadlines first.
          </p>
        </div>
        <Button onClick={() => setShowLogDialog(true)} className="min-h-[44px] rounded-xl">
          <Plus className="h-4 w-4 mr-2" /> Log denial
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="min-h-[44px] rounded-xl mt-1">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="appealed">Appealed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="written_off">Written Off</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-52">
          <Label className="text-xs text-muted-foreground">Assignee</Label>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="min-h-[44px] rounded-xl mt-1">
              <SelectValue placeholder="All assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {staff.map(s => (
                <SelectItem key={s.provider_id} value={s.provider_id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Queue */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sortedDenials.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-10 text-center">
            <FileX2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold">No denials in this view</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              {denials.length === 0
                ? 'No denied claims have been logged yet. Log one to start working appeals.'
                : 'Try clearing your filters to see more denials.'}
            </p>
            <Button
              onClick={() => {
                if (denials.length === 0) setShowLogDialog(true);
                else { setStatusFilter('all'); setAssigneeFilter('all'); }
              }}
              className="min-h-[44px] rounded-xl"
            >
              {denials.length === 0 ? <><Plus className="h-4 w-4 mr-2" /> Log your first denial</> : 'Clear filters'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedDenials.map(denial => {
            const cfg = STATUS_CONFIG[denial.status];
            return (
              <Card
                key={denial.id}
                className="rounded-2xl cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => openDetail(denial)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {denial.insurance_claims?.policy_number || 'Standalone denial'}
                        </span>
                        <Badge className={`text-xs ${cfg.badgeClass}`}>
                          {cfg.icon}<span className="ml-1">{cfg.label}</span>
                        </Badge>
                        {renderDeadlineBadge(denial.appeal_deadline)}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {denial.insurance_claims?.patient_name || '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {denial.insurance_claims?.insurance_provider || '—'}
                        </span>
                        <span className="font-semibold text-foreground">{formatMoney(Number(denial.denied_amount))}</span>
                      </div>
                      <p className="text-xs text-destructive line-clamp-2">
                        {denial.denial_code ? `${denial.denial_code} · ` : ''}{denial.denial_reason}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Assigned to: <span className="font-medium">{staffName(denial.assigned_to)}</span>
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="min-h-[44px] shrink-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base flex items-center gap-2">
                  <FileX2 className="h-4 w-4 text-destructive" />
                  {selected.insurance_claims?.policy_number || 'Standalone denial'}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Logged {format(parseISO(selected.created_at), 'MMM d, yyyy')} ·
                  Last updated {format(parseISO(selected.updated_at), 'MMM d, yyyy')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="flex flex-wrap gap-2">
                  <Badge className={`text-xs ${STATUS_CONFIG[selected.status].badgeClass}`}>
                    {STATUS_CONFIG[selected.status].icon}
                    <span className="ml-1">{STATUS_CONFIG[selected.status].label}</span>
                  </Badge>
                  {renderDeadlineBadge(selected.appeal_deadline)}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Patient</p>
                    <p className="font-medium">{selected.insurance_claims?.patient_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Insurance provider</p>
                    <p className="font-medium">{selected.insurance_claims?.insurance_provider || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Denied amount</p>
                    <p className="font-semibold text-destructive">{formatMoney(Number(selected.denied_amount))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Appeal deadline</p>
                    <p className="font-medium">
                      {selected.appeal_deadline ? format(parseISO(selected.appeal_deadline), 'MMM d, yyyy') : 'Not set'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Denial reason</p>
                  <p className="text-sm bg-destructive/5 border border-destructive/20 rounded-xl p-3">
                    {selected.denial_code ? <span className="font-semibold">{selected.denial_code} · </span> : null}
                    {selected.denial_reason}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Appeal notes</Label>
                  <Textarea
                    value={appealNotes}
                    onChange={e => setAppealNotes(e.target.value)}
                    placeholder="Add appeal strategy, payer contacts, reference numbers…"
                    className="rounded-xl min-h-[88px]"
                  />
                  <Button variant="outline" size="sm" onClick={handleSaveNotes} disabled={saving} className="min-h-[44px] rounded-xl">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save notes
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Assign to</Label>
                  <Select
                    value={selected.assigned_to || '__unassigned__'}
                    onValueChange={handleAssign}
                  >
                    <SelectTrigger className="min-h-[44px] rounded-xl">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unassigned__">Unassigned</SelectItem>
                      {staff.map(s => (
                        <SelectItem key={s.provider_id} value={s.provider_id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {selected.status !== 'appealed' && selected.status !== 'resolved' && selected.status !== 'written_off' && (
                    <Button
                      onClick={() => handleMarkStatus('appealed')}
                      disabled={saving}
                      className="min-h-[44px] rounded-xl"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> Mark as appealed
                    </Button>
                  )}
                  {selected.status !== 'resolved' && selected.status !== 'written_off' && (
                    <Button
                      variant="outline"
                      onClick={() => handleMarkStatus('resolved')}
                      disabled={saving}
                      className="min-h-[44px] rounded-xl"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" /> Mark resolved
                    </Button>
                  )}
                  {selected.status !== 'resolved' && selected.status !== 'written_off' && (
                    <Button
                      variant="destructive"
                      onClick={() => setShowWriteoffDialog(true)}
                      disabled={saving}
                      className="min-h-[44px] rounded-xl"
                    >
                      <XCircle className="h-4 w-4 mr-2" /> Write off
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Write-off confirmation */}
      <Dialog open={showWriteoffDialog} onOpenChange={setShowWriteoffDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Write off this denial?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Writing off closes the denial permanently and marks
              {' '}{selected ? formatMoney(Number(selected.denied_amount)) : ''} as unrecoverable.
              This cannot be undone from the workqueue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Write-off reason (optional)</Label>
            <Textarea
              value={writeoffReason}
              onChange={e => setWriteoffReason(e.target.value)}
              placeholder="e.g. Payer final decision, amount below appeal cost…"
              className="rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowWriteoffDialog(false)} className="min-h-[44px] rounded-xl">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleWriteoffConfirm} disabled={saving} className="min-h-[44px] rounded-xl">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm write-off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log denial dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Log denial</DialogTitle>
            <DialogDescription className="text-xs">
              Create a denial work item from a denied claim, or log a standalone denial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Denied claim</Label>
              <Select
                value={logForm.claim_id}
                onValueChange={v => setLogForm(f => ({ ...f, claim_id: v }))}
              >
                <SelectTrigger className="min-h-[44px] rounded-xl">
                  <SelectValue placeholder="Select a denied claim" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__standalone__">Standalone denial (no claim)</SelectItem>
                  {deniedClaimOptions.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.policy_number} · {c.patient_name} · {formatMoney(Number(c.claim_amount))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Denial code</Label>
              <Input
                value={logForm.denial_code}
                onChange={e => setLogForm(f => ({ ...f, denial_code: e.target.value }))}
                placeholder="e.g. CO-97, PR-204"
                className="min-h-[44px] rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Denial reason *</Label>
              <Textarea
                value={logForm.denial_reason}
                onChange={e => setLogForm(f => ({ ...f, denial_reason: e.target.value }))}
                placeholder="Reason given by the payer…"
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Denied amount (K)</Label>
                <Input
                  type="number"
                  min={0}
                  value={logForm.denied_amount || ''}
                  onChange={e => setLogForm(f => ({ ...f, denied_amount: Number(e.target.value) }))}
                  placeholder="0"
                  className="min-h-[44px] rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Appeal deadline</Label>
                <Input
                  type="date"
                  value={logForm.appeal_deadline}
                  onChange={e => setLogForm(f => ({ ...f, appeal_deadline: e.target.value }))}
                  className="min-h-[44px] rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Assign to</Label>
              <Select
                value={logForm.assigned_to}
                onValueChange={v => setLogForm(f => ({ ...f, assigned_to: v }))}
              >
                <SelectTrigger className="min-h-[44px] rounded-xl">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__">Unassigned</SelectItem>
                  {staff.map(s => (
                    <SelectItem key={s.provider_id} value={s.provider_id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowLogDialog(false)} className="min-h-[44px] rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleLogDenial} disabled={saving} className="min-h-[44px] rounded-xl">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Log denial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DenialWorkqueue;
