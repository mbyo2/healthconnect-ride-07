import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRightLeft, Plus, ArrowRight, ArrowLeft, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { usePatientNames } from '@/hooks/usePatientNames';
import { useHospitalPatients } from '@/hooks/useHospitalPatients';
import { HospitalPatientSelect } from '@/components/hospital/HospitalPatientSelect';
import { ListSkeleton } from '@/components/ui/list-skeleton';

export const ReferralManagement = ({ hospital }: { hospital: any }) => {
  const { data: outgoing, loading, error, refresh } = useHospitalModule<any>(
    'referrals', 'hospital_id', hospital?.id, { orderBy: 'referral_date', ascending: false }
  );
  const { data: incoming, refresh: refreshIncoming } = useHospitalModule<any>(
    'referrals', 'referred_to_hospital_id', hospital?.id, { orderBy: 'referral_date', ascending: false }
  );
  const referrals = [...outgoing, ...incoming];

  const { nameFor } = usePatientNames(referrals.map((r: any) => r.patient_id));
  const { patients, loading: patientsLoading } = useHospitalPatients(hospital?.id);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patient_id: '',
    referred_to_department: '',
    referred_to_doctor: '',
    reason_for_referral: '',
    diagnosis: '',
    priority: 'routine',
    notes: '',
  });

  const submit = async () => {
    if (!form.patient_id) {
      toast.error('Select a patient first');
      return;
    }
    if (!form.reason_for_referral.trim()) {
      toast.error('Add a reason for the referral');
      return;
    }
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error: err } = await (supabase.from('referrals' as any) as any).insert({
        hospital_id: hospital?.id,
        patient_id: form.patient_id,
        referring_doctor_id: auth?.user?.id,
        referral_number: `REF-${Date.now().toString().slice(-8)}`,
        referral_date: new Date().toISOString().slice(0, 10),
        referred_to_department: form.referred_to_department || null,
        referred_to_doctor: form.referred_to_doctor || null,
        reason_for_referral: form.reason_for_referral,
        diagnosis: form.diagnosis || null,
        priority: form.priority,
        status: 'pending',
        notes: form.notes || null,
      });
      if (err) throw err;
      toast.success('Referral created');
      setOpen(false);
      setForm({ patient_id: '', referred_to_department: '', referred_to_doctor: '', reason_for_referral: '', diagnosis: '', priority: 'routine', notes: '' });
      refresh();
      refreshIncoming();
    } catch (e: any) {
      toast.error(e?.message || 'Could not create referral');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error: err } = await (supabase.from('referrals' as any) as any).update({ status }).eq('id', id);
      if (err) throw err;
      toast.success(`Referral marked ${status}`);
      refresh();
      refreshIncoming();
    } catch (e: any) {
      toast.error(e?.message || 'Could not update referral');
    }
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );

  const ReferralRow = ({ item: r, actions }: { item: any; actions?: React.ReactNode }) => (
    <Card key={r.id}>
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{nameFor(r.patient_id)}</p>
          <p className="text-xs text-muted-foreground">{r.reason_for_referral}</p>
          <p className="text-xs text-muted-foreground">
            {r.referral_number} · {r.referred_to_department || 'No department'} · {r.referral_date}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={r.priority === 'urgent' ? 'destructive' : 'outline'} className="capitalize">{r.priority || 'routine'}</Badge>
          <Badge variant={r.status === 'accepted' || r.status === 'completed' ? 'default' : 'secondary'} className="capitalize">{r.status || 'pending'}</Badge>
          {actions}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Referral Management</h3>
          <p className="text-sm text-muted-foreground">Incoming, outgoing & internal referral tracking</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Create Referral
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Referral</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <HospitalPatientSelect
              patients={patients}
              loading={patientsLoading}
              value={form.patient_id}
              onChange={(id) => setForm({ ...form, patient_id: id })}
              emptyHint="No patients registered at this facility yet. Register a patient in OPD Management or admit one in IPD before creating a referral."
            />
            <div className="space-y-1.5">
              <Label>Refer to department</Label>
              <Input value={form.referred_to_department} onChange={(e) => setForm({ ...form, referred_to_department: e.target.value })} placeholder="e.g. Cardiology" />
            </div>
            <div className="space-y-1.5">
              <Label>Refer to doctor / facility</Label>
              <Input value={form.referred_to_doctor} onChange={(e) => setForm({ ...form, referred_to_doctor: e.target.value })} placeholder="e.g. Dr. Banda, UTH" />
            </div>
            <div className="space-y-1.5">
              <Label>Reason for referral *</Label>
              <Textarea value={form.reason_for_referral} onChange={(e) => setForm({ ...form, reason_for_referral: e.target.value })} placeholder="Clinical reason for referring this patient" />
            </div>
            <div className="space-y-1.5">
              <Label>Working diagnosis</Label>
              <Input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.patient_id}>{saving ? 'Saving…' : 'Create referral'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <ArrowLeft className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{incoming.length}</p>
          <p className="text-xs text-muted-foreground">Incoming</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <ArrowRight className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{outgoing.length}</p>
          <p className="text-xs text-muted-foreground">Outgoing</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <ArrowRightLeft className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{referrals.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </CardContent></Card>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Tabs defaultValue="outgoing" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="outgoing" className="gap-1.5"><ArrowRight className="h-3.5 w-3.5" /> Outgoing</TabsTrigger>
          <TabsTrigger value="incoming" className="gap-1.5"><ArrowLeft className="h-3.5 w-3.5" /> Incoming</TabsTrigger>
        </TabsList>

        <TabsContent value="outgoing" className="space-y-2">
          {loading ? <ListSkeleton count={3} variant="compact" /> : outgoing.length === 0 ? (
            <EmptyState message="No outgoing referrals yet — use Create Referral to refer a patient onward." />
          ) : outgoing.map((r: any) => (
            <ReferralRow
              key={r.id}
              item={r}
              actions={r.status === 'pending' ? (
                <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'completed')}>Close</Button>
              ) : null}
            />
          ))}
        </TabsContent>

        <TabsContent value="incoming" className="space-y-2">
          {loading ? <ListSkeleton count={3} variant="compact" /> : incoming.length === 0 ? (
            <EmptyState message="No incoming referrals yet. Other facilities referring patients to you will appear here." />
          ) : incoming.map((r: any) => (
            <ReferralRow
              key={r.id}
              item={r}
              actions={r.status === 'pending' ? (
                <Button size="sm" onClick={() => updateStatus(r.id, 'accepted')}>Accept</Button>
              ) : null}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};
