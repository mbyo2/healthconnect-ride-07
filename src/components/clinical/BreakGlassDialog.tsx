import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, Siren, Search, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BreakGlassDialogProps {
  /** Preselected patient — skips the search step. */
  patientId?: string;
  patientName?: string;
  onGranted?: () => void;
  triggerLabel?: string;
  /** Controlled open state (e.g. opened from PatientRecords with a selection). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface FoundPatient {
  pid: string;
  nm: string;
}

/**
 * Epic-style break-the-glass emergency access.
 *
 * Two entry modes:
 *  - Preselected: patientId/patientName given (e.g. from a records row) — goes
 *    straight to the reason step.
 *  - Search: no patient given — the clinician finds the patient by name via
 *    find_patient_for_emergency (identity only, every lookup audit-logged),
 *    then gives the reason.
 *
 * Clinical staff only; mandatory reason (10+ chars) + explicit confirmation;
 * the grant lasts 4 hours and is fully audited.
 */
export function BreakGlassDialog({
  patientId,
  patientName,
  onGranted,
  triggerLabel,
  open,
  onOpenChange,
}: BreakGlassDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<FoundPatient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [chosenId, setChosenId] = useState<string | undefined>(undefined);
  const [chosenName, setChosenName] = useState<string | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [confirmUnderstood, setConfirmUnderstood] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setDialogOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };

  // Fresh state on every open; preselect when the caller passes a patient.
  useEffect(() => {
    if (dialogOpen) {
      setSearch("");
      setResults([]);
      setSearched(false);
      setReason("");
      setConfirmUnderstood(false);
      setChosenId(patientId);
      setChosenName(patientName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen]);

  const runSearch = async () => {
    const term = search.trim();
    if (term.length < 2 || searching) return;
    setSearching(true);
    try {
      const { data, error } = await (supabase as any).rpc("emergency_patient_search", {
        q: term,
      });
      if (error) throw error;
      const rows = (data || []) as FoundPatient[];
      // Fail-closed accountability: the lookup is audit-logged before any
      // identity is shown. If the audit write fails, show nothing.
      if (rows.length > 0) {
        const { error: logError } = await (supabase as any).rpc("log_emergency_lookup", {
          p_term: term,
          p_ids: rows.map((r) => r.pid),
        });
        if (logError) throw logError;
      }
      setResults(rows);
      setSearched(true);
    } catch (e: any) {
      toast.error(e?.message || "Patient search failed");
    } finally {
      setSearching(false);
    }
  };

  const activePatientId = chosenId ?? patientId;
  const activePatientName = chosenName ?? patientName;
  const canSubmit =
    !!activePatientId && reason.trim().length >= 10 && confirmUnderstood && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || !activePatientId) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await (supabase as any).rpc("request_break_glass_access", {
        p_patient_id: activePatientId,
        p_reason: reason.trim(),
      });
      if (error) throw error;
      toast.success("Emergency access granted for 4 hours. This access is audit-logged.", {
        description: `Patient: ${activePatientName ?? "selected patient"}`,
      });
      setDialogOpen(false);
      onGranted?.();
    } catch (e: any) {
      toast.error(e?.message || "Failed to grant emergency access");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm" className="gap-2 min-h-[44px]">
            <Siren className="h-4 w-4" />
            {triggerLabel || "Emergency Access"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Break-the-Glass Emergency Access
          </DialogTitle>
          <DialogDescription>
            Override normal access controls for a patient in a genuine clinical emergency.
            Every access is logged, time-limited to 4 hours, and reviewed by administrators.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step 1 — patient (search unless preselected) */}
          {!patientId ? (
            <div className="space-y-2">
              <Label htmlFor="bg-patient-search">Find patient (required)</Label>
              {activePatientId ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5">
                  <span className="text-sm font-bold flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    {activePatientName}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={() => {
                      setChosenId(undefined);
                      setChosenName(undefined);
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      id="bg-patient-search"
                      placeholder="Patient name (min 2 characters)"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && runSearch()}
                      className="min-h-[44px]"
                    />
                    <Button
                      variant="outline"
                      onClick={runSearch}
                      disabled={search.trim().length < 2 || searching}
                      className="min-h-[44px] min-w-[44px]"
                      aria-label="Search patients"
                    >
                      {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  {searched && results.length === 0 && (
                    <p className="text-xs text-muted-foreground">No patients found for “{search.trim()}”.</p>
                  )}
                  {results.length > 0 && (
                    <ul className="max-h-40 overflow-y-auto rounded-xl border divide-y">
                      {results.map((r) => (
                        <li key={r.pid}>
                          <button
                            onClick={() => {
                              setChosenId(r.pid);
                              setChosenName(r.nm || "Patient");
                            }}
                            className="w-full text-left px-3 py-2.5 min-h-[44px] text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            {r.nm || "Patient"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Lookups are audit-logged. Search only for patients you are treating.
                  </p>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm">
              Patient: <strong>{patientName}</strong>
            </p>
          )}

          {/* Step 2 — reason + confirmation */}
          <div className="space-y-2">
            <Label htmlFor="bg-reason">Emergency reason (required, min 10 characters)</Label>
            <Textarea
              id="bg-reason"
              placeholder="e.g. Patient arrived unconscious in ED, no prior relationship, need allergy and medication history immediately to treat safely."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{reason.trim().length}/10 minimum characters</p>
          </div>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={confirmUnderstood}
              onChange={(e) => setConfirmUnderstood(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>
              I confirm this is a genuine clinical emergency and I understand this access
              will be audit-logged and reviewed.
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting} className="min-h-[44px]">
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!canSubmit} className="min-h-[44px]">
            {isSubmitting ? "Granting..." : "Grant Emergency Access"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
