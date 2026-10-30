import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Baby, Plus, Loader2, ShieldAlert, ChevronRight, CalendarDays, UserPlus, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/utils/friendly-error";

const CYCLE_TYPES = ["IVF", "IUI", "ICSI", "FET"];
const STAGES = ["consultation", "stimulation", "retrieval", "fertilization", "transfer", "waiting", "completed"];
const STAGE_LABELS: Record<string, string> = {
  consultation: "Consultation",
  stimulation: "Stimulation",
  retrieval: "Retrieval",
  fertilization: "Fertilization",
  transfer: "Transfer",
  waiting: "Two-Week Wait",
  completed: "Completed",
  cancelled: "Cancelled",
};

const stageIndex = (status: string) => {
  const i = STAGES.indexOf(status);
  return i === -1 ? 0 : i;
};

const getStagePill = (status: string) => {
  if (status === "completed") return <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold text-white bg-green-600">Completed</span>;
  if (status === "cancelled") return <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold text-white bg-slate-500">Cancelled</span>;
  return <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold text-white bg-blue-600">{STAGE_LABELS[status] || status}</span>;
};

export const ARTModule = ({ hospital: hospitalProp }: { hospital?: any }) => {
  const { institution } = useInstitutionContext();
  const hospital = hospitalProp || institution;
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState<any | null>(null);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [showNewCycle, setShowNewCycle] = useState(false);
  const [showProcedure, setShowProcedure] = useState(false);
  const [showAssignStaff, setShowAssignStaff] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cycleForm, setCycleForm] = useState({ patient_id: "", partner_patient_id: "", cycle_type: "IVF", start_date: "", notes: "" });
  const [procForm, setProcForm] = useState({ procedure_type: "", procedure_date: new Date().toISOString().slice(0, 10), outcome: "", notes: "" });
  const [staffId, setStaffId] = useState("");

  const loadCycles = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from("art_cycles" as any) as any)
        .select("*")
        .eq("institution_id", hospital?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCycles(data || []);
    } catch (e: any) {
      toast.error("Could not load ART cycles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (hospital?.id) loadCycles(); }, [hospital?.id]);

  const loadCycleDetail = async (cycle: any) => {
    setSelectedCycle(cycle);
    try {
      const [{ data: procs }, { data: assigned }] = await Promise.all([
        (supabase.from("art_procedures" as any) as any).select("*").eq("cycle_id", cycle.id).order("procedure_date", { ascending: false }),
        (supabase.from("art_cycle_staff" as any) as any).select("*, staff:staff_id(id)").eq("cycle_id", cycle.id),
      ]);
      setProcedures(procs || []);
      setStaff(assigned || []);
    } catch { /* non-fatal */ }
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleForm.patient_id.trim()) { toast.error("Patient ID is required"); return; }
    setIsSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await (supabase.from("art_cycles" as any) as any).insert({
        institution_id: hospital.id,
        patient_id: cycleForm.patient_id.trim(),
        partner_patient_id: cycleForm.partner_patient_id.trim() || null,
        cycle_type: cycleForm.cycle_type,
        start_date: cycleForm.start_date || null,
        notes: cycleForm.notes || null,
        created_by: user.user?.id,
      }).select().single();
      if (error) throw error;
      // Auto-assign creator as staff so they retain access
      if (user.user?.id) {
        await (supabase.from("art_cycle_staff" as any) as any).insert({ cycle_id: data.id, staff_id: user.user.id, role: "lead_clinician" });
      }
      toast.success("ART cycle created — access restricted to assigned staff");
      setShowNewCycle(false);
      setCycleForm({ patient_id: "", partner_patient_id: "", cycle_type: "IVF", start_date: "", notes: "" });
      loadCycles();
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, "Failed to create cycle"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvanceStage = async (newStatus: string) => {
    if (!selectedCycle) return;
    if (newStatus === "cancelled" && !window.confirm("Cancel this ART cycle? This cannot be undone.")) return;
    try {
      const { error } = await (supabase.from("art_cycles" as any) as any)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", selectedCycle.id);
      if (error) throw error;
      toast.success(`Cycle moved to ${STAGE_LABELS[newStatus] || newStatus}`);
      const updated = { ...selectedCycle, status: newStatus };
      setSelectedCycle(updated);
      loadCycles();
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, "Failed to update stage"));
    }
  };

  const handleLogProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procForm.procedure_type.trim()) { toast.error("Procedure type is required"); return; }
    setIsSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await (supabase.from("art_procedures" as any) as any).insert({
        cycle_id: selectedCycle.id,
        procedure_type: procForm.procedure_type.trim(),
        procedure_date: procForm.procedure_date,
        outcome: procForm.outcome || null,
        notes: procForm.notes || null,
        performed_by: user.user?.id,
      });
      if (error) throw error;
      toast.success("Procedure logged");
      setShowProcedure(false);
      setProcForm({ procedure_type: "", procedure_date: new Date().toISOString().slice(0, 10), outcome: "", notes: "" });
      loadCycleDetail(selectedCycle);
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, "Failed to log procedure"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId.trim()) { toast.error("Staff user ID is required"); return; }
    setIsSubmitting(true);
    try {
      const { error } = await (supabase.from("art_cycle_staff" as any) as any).insert({
        cycle_id: selectedCycle.id,
        staff_id: staffId.trim(),
        role: "clinician",
      });
      if (error) throw error;
      toast.success("Staff member granted confidential access");
      setShowAssignStaff(false);
      setStaffId("");
      loadCycleDetail(selectedCycle);
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, "Failed to assign staff"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCount = cycles.filter((c) => !["completed", "cancelled"].includes(c.status)).length;

  if (selectedCycle) {
    const idx = stageIndex(selectedCycle.status);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedCycle(null)} className="min-h-[44px]">← All cycles</Button>
        </div>

        <div className="rounded-2xl bg-card p-5 dark:bg-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Cycle #{selectedCycle.cycle_number} — {selectedCycle.cycle_type}</h2>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Confidential — visible only to assigned staff and the patient
              </p>
            </div>
            {getStagePill(selectedCycle.status)}
          </div>

          {/* Stage pipeline */}
          <div className="mt-5">
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {STAGES.map((s, i) => (
                <React.Fragment key={s}>
                  <button
                    onClick={() => i !== idx && handleAdvanceStage(s)}
                    disabled={i === idx}
                    className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-semibold min-h-[44px] transition-colors ${
                      i < idx ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : i === idx ? "bg-blue-600 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {STAGE_LABELS[s]}
                  </button>
                  {i < STAGES.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </React.Fragment>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Tap a stage to move the cycle forward. Cancelling requires confirmation.</p>
          </div>

          {selectedCycle.notes && (
            <p className="mt-4 text-[15px] text-muted-foreground">{selectedCycle.notes}</p>
          )}
        </div>

        {/* Procedures */}
        <div className="rounded-2xl bg-card p-5 dark:bg-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Procedures</h3>
            <Button size="sm" onClick={() => setShowProcedure(true)} className="min-h-[44px]">
              <Plus className="w-4 h-4 mr-1" /> Log procedure
            </Button>
          </div>
          {procedures.length === 0 ? (
            <EmptyState icon={FileText} title="No procedures yet" description="Log ultrasounds, retrievals, transfers, and lab work for this cycle." />
          ) : (
            <ul className="divide-y divide-border">
              {procedures.map((p) => (
                <li key={p.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[15px]">{p.procedure_type}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <CalendarDays className="w-3.5 h-3.5" /> {p.procedure_date}
                      {p.outcome && <span className="ml-2">· {p.outcome}</span>}
                    </p>
                    {p.notes && <p className="text-sm text-muted-foreground mt-1">{p.notes}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Confidential access */}
        <div className="rounded-2xl bg-card p-5 dark:bg-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Confidential access</h3>
            <Button size="sm" variant="outline" onClick={() => setShowAssignStaff(true)} className="min-h-[44px]">
              <UserPlus className="w-4 h-4 mr-1" /> Assign staff
            </Button>
          </div>
          {staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">Only the creator and the patient can view this cycle. Assign clinicians to grant access.</p>
          ) : (
            <ul className="space-y-2">
              {staff.map((s) => (
                <li key={s.id} className="text-sm flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="font-mono text-xs">{s.staff_id.slice(0, 8)}…</span>
                  <span className="text-xs text-muted-foreground">{s.role}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Procedure dialog */}
        <Dialog open={showProcedure} onOpenChange={setShowProcedure}>
          <DialogContent>
            <DialogHeader><DialogTitle>Log procedure</DialogTitle></DialogHeader>
            <form onSubmit={handleLogProcedure} className="space-y-4">
              <div><Label>Procedure type</Label><Input value={procForm.procedure_type} onChange={(e) => setProcForm({ ...procForm, procedure_type: e.target.value })} placeholder="e.g. Follicle ultrasound, Egg retrieval, Embryo transfer" className="min-h-[44px] text-base" required /></div>
              <div><Label>Date</Label><Input type="date" value={procForm.procedure_date} onChange={(e) => setProcForm({ ...procForm, procedure_date: e.target.value })} className="min-h-[44px] text-base" /></div>
              <div><Label>Outcome</Label><Input value={procForm.outcome} onChange={(e) => setProcForm({ ...procForm, outcome: e.target.value })} placeholder="e.g. 12 oocytes retrieved" className="min-h-[44px] text-base" /></div>
              <div><Label>Notes</Label><Textarea value={procForm.notes} onChange={(e) => setProcForm({ ...procForm, notes: e.target.value })} rows={3} className="text-base" /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowProcedure(false)} className="min-h-[44px]">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="min-h-[44px]">{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Assign staff dialog */}
        <Dialog open={showAssignStaff} onOpenChange={setShowAssignStaff}>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign staff — confidential access</DialogTitle></DialogHeader>
            <form onSubmit={handleAssignStaff} className="space-y-4">
              <p className="text-sm text-muted-foreground">Only assigned staff, the creator, and the patient will be able to view this cycle.</p>
              <div><Label>Staff user ID</Label><Input value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="Paste the staff member's user ID" className="min-h-[44px] text-base" required /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAssignStaff(false)} className="min-h-[44px]">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="min-h-[44px]">{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Grant access</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Baby className="w-6 h-6" /> Fertility (ART/IVF)</h2>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" /> All cycles are confidential — restricted to assigned staff and the patient
          </p>
        </div>
        <Button onClick={() => setShowNewCycle(true)} className="min-h-[44px]">
          <Plus className="w-4 h-4 mr-1" /> New cycle
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card p-5 dark:bg-card">
          <p className="text-xs text-muted-foreground">Active cycles</p>
          <p className="text-2xl font-bold mt-1">{loading ? "…" : activeCount}</p>
        </div>
        <div className="rounded-2xl bg-card p-5 dark:bg-card">
          <p className="text-xs text-muted-foreground">Total cycles</p>
          <p className="text-2xl font-bold mt-1">{loading ? "…" : cycles.length}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading cycles…</p>
      ) : cycles.length === 0 ? (
        <EmptyState icon={Baby} title="No ART cycles yet" description="Start a fertility treatment cycle. Access is automatically restricted to assigned staff and the patient." actionLabel="New cycle" onAction={() => setShowNewCycle(true)} />
      ) : (
        <ul className="space-y-3">
          {cycles.map((c) => (
            <li key={c.id}>
              <button onClick={() => loadCycleDetail(c)} className="w-full text-left rounded-2xl bg-card p-5 dark:bg-card hover:bg-muted/50 transition-colors min-h-[44px]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[17px]">Cycle #{c.cycle_number} — {c.cycle_type}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Started {c.start_date || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStagePill(c.status)}
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={showNewCycle} onOpenChange={setShowNewCycle}>
        <DialogContent>
          <DialogHeader><DialogTitle>New ART cycle</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateCycle} className="space-y-4">
            <div><Label>Patient user ID</Label><Input value={cycleForm.patient_id} onChange={(e) => setCycleForm({ ...cycleForm, patient_id: e.target.value })} placeholder="Patient's user ID" className="min-h-[44px] text-base" required /></div>
            <div><Label>Partner user ID (optional)</Label><Input value={cycleForm.partner_patient_id} onChange={(e) => setCycleForm({ ...cycleForm, partner_patient_id: e.target.value })} placeholder="Partner's user ID" className="min-h-[44px] text-base" /></div>
            <div>
              <Label>Cycle type</Label>
              <Select value={cycleForm.cycle_type} onValueChange={(v) => setCycleForm({ ...cycleForm, cycle_type: v })}>
                <SelectTrigger className="min-h-[44px] text-base"><SelectValue /></SelectTrigger>
                <SelectContent>{CYCLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Start date</Label><Input type="date" value={cycleForm.start_date} onChange={(e) => setCycleForm({ ...cycleForm, start_date: e.target.value })} className="min-h-[44px] text-base" /></div>
            <div><Label>Notes</Label><Textarea value={cycleForm.notes} onChange={(e) => setCycleForm({ ...cycleForm, notes: e.target.value })} rows={3} className="text-base" placeholder="Confidential clinical notes" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewCycle(false)} className="min-h-[44px]">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="min-h-[44px]">{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create cycle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ARTModule;
