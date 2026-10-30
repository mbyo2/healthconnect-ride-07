import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { BarcodeScanner } from "@/components/shared/BarcodeScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ShieldCheck,
  User,
  FileText,
  History,
  ChevronRight,
  ArrowLeft,
  Search,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { cn } from "@/lib/utils";

interface PatientRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface PrescriptionRow {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  quantity: number | null;
  prescription_number: string | null;
  barcode: string | null;
  status: string | null;
  prescribed_date: string | null;
}

interface ScanRecord {
  id: string;
  medication_name: string;
  barcode_scanned: string;
  expected_barcode: string | null;
  verification_result: "match" | "mismatch";
  scanned_at: string;
  override_reason: string | null;
}

type Stage = "patient" | "prescription" | "verify";

const normalize = (s: string) => s.trim().toUpperCase().replace(/[\s-]+/g, "");

const patientName = (p: PatientRow) =>
  [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Patient";

export function BarcodeVerify() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { institution, institutionId } = useInstitutionContext();

  const [stage, setStage] = useState<Stage>("patient");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientList, setPatientList] = useState<PatientRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);

  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [loadingRx, setLoadingRx] = useState(false);
  const [selectedRx, setSelectedRx] = useState<PrescriptionRow | null>(null);
  const [expectedBarcode, setExpectedBarcode] = useState("");
  const [expectedName, setExpectedName] = useState("");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<ScanRecord | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideSaving, setOverrideSaving] = useState(false);

  const [history, setHistory] = useState<ScanRecord[]>([]);

  // ------------------------------------------------------------------
  // Step 1 — patient search (permission-gated RPC, same as pharmacy Rx)
  // ------------------------------------------------------------------
  const searchPatients = useCallback(async (query: string) => {
    setPatientSearch(query);
    if (!query || query.length < 2) {
      setPatientList([]);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase.rpc("search_patients_for_provider", {
        p_search: query,
      });
      if (error) throw error;
      setPatientList((data as PatientRow[]) || []);
    } catch (err: any) {
      toast.error("Patient search failed", { description: friendlyErrorMessage(err) });
    } finally {
      setSearching(false);
    }
  }, []);

  // ------------------------------------------------------------------
  // Step 2 — active prescriptions for the patient
  // ------------------------------------------------------------------
  const loadPrescriptions = useCallback(
    async (patient: PatientRow) => {
      setLoadingRx(true);
      try {
        let query = (supabase as any)
          .from("comprehensive_prescriptions")
          .select(
            "id, patient_id, medication_name, dosage, quantity, prescription_number, barcode, status, prescribed_date"
          )
          .eq("patient_id", patient.id)
          .in("status", ["pending", "partially_filled"])
          .order("prescribed_date", { ascending: false })
          .limit(50);
        if (institutionId) {
          query = query.or(`pharmacy_id.eq.${institutionId},pharmacy_id.is.null`);
        }
        const { data, error } = await query;
        if (error) throw error;
        setPrescriptions((data as PrescriptionRow[]) || []);
      } catch (err: any) {
        toast.error("Could not load prescriptions", { description: friendlyErrorMessage(err) });
      } finally {
        setLoadingRx(false);
      }
    },
    [institutionId]
  );

  const pickPatient = (p: PatientRow) => {
    setSelectedPatient(p);
    setSelectedRx(null);
    setLastResult(null);
    loadPrescriptions(p);
    setStage("prescription");
  };

  const pickPrescription = (rx: PrescriptionRow) => {
    setSelectedRx(rx);
    setExpectedName(rx.medication_name);
    setExpectedBarcode(rx.barcode || rx.prescription_number || "");
    setLastResult(null);
    setStage("verify");
  };

  // ------------------------------------------------------------------
  // Step 3 — scan + compare. Every scan is logged, match or mismatch.
  // ------------------------------------------------------------------
  const logScan = async (payload: {
    barcode_scanned: string;
    expected_barcode: string | null;
    verification_result: "match" | "mismatch";
  }): Promise<ScanRecord | null> => {
    if (!selectedRx || !selectedPatient) return null;
    const { data, error } = await (supabase as any)
      .from("medication_scans")
      .insert({
        patient_id: selectedPatient.id,
        prescription_id: selectedRx.id,
        medication_name: selectedRx.medication_name,
        barcode_scanned: payload.barcode_scanned,
        expected_barcode: payload.expected_barcode,
        verification_result: payload.verification_result,
        scanned_by: user?.id ?? null,
        location: institution?.name ?? null,
        institution_id: institutionId ?? null,
      })
      .select(
        "id, medication_name, barcode_scanned, expected_barcode, verification_result, scanned_at, override_reason"
      )
      .single();
    if (error) throw error;
    const record = data as ScanRecord;
    setHistory((prev) => [record, ...prev].slice(0, 25));
    return record;
  };

  const handleScan = async (code: string) => {
    setScannerOpen(false);
    if (!expectedBarcode.trim()) {
      toast.error("Set the expected barcode first", {
        description: "Enter the barcode printed on the prescription label.",
      });
      return;
    }
    setSaving(true);
    try {
      const scanned = code.trim();
      const isMatch = normalize(scanned) === normalize(expectedBarcode);
      const record = await logScan({
        barcode_scanned: scanned,
        expected_barcode: expectedBarcode.trim(),
        verification_result: isMatch ? "match" : "mismatch",
      });
      setLastResult(record);
      if (isMatch) {
        toast.success("Barcode verified — safe to dispense");
      }
      // Mismatch: the hard-stop overlay renders from lastResult; no toast needed.
    } catch (err: any) {
      toast.error("Scan could not be logged", { description: friendlyErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  // Pharmacist override: typed reason only, written back to the audit row.
  const submitOverride = async () => {
    if (!lastResult || overrideReason.trim().length < 10) {
      toast.error("A detailed reason is required", {
        description: "Type at least 10 characters explaining why the mismatch is safe.",
      });
      return;
    }
    setOverrideSaving(true);
    try {
      const { data, error } = await (supabase as any)
        .from("medication_scans")
        .update({ override_reason: overrideReason.trim() })
        .eq("id", lastResult.id)
        .select(
          "id, medication_name, barcode_scanned, expected_barcode, verification_result, scanned_at, override_reason"
        )
        .single();
      if (error) throw error;
      const updated = data as ScanRecord;
      setLastResult(updated);
      setHistory((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
      setOverrideOpen(false);
      setOverrideReason("");
      toast.success("Override recorded", {
        description: "The mismatch was overridden with a documented reason.",
      });
    } catch (err: any) {
      toast.error("Override failed", { description: friendlyErrorMessage(err) });
    } finally {
      setOverrideSaving(false);
    }
  };

  const resetToPatient = () => {
    setStage("patient");
    setSelectedPatient(null);
    setSelectedRx(null);
    setLastResult(null);
    setPrescriptions([]);
    setPatientSearch("");
    setPatientList([]);
  };

  const mismatched = lastResult?.verification_result === "mismatch" && !lastResult?.override_reason;
  const matched = lastResult?.verification_result === "match";
  const overridden = lastResult?.verification_result === "mismatch" && !!lastResult?.override_reason;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Header — one clear title, one caption (Apple type scale) */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ScanLine className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">
              Medication Verification
            </h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">
              Scan-to-verify before dispensing — every scan is logged for safety audit.
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="mt-4 flex items-center gap-2" aria-label="Verification steps">
          {[
            { key: "patient", label: "Patient" },
            { key: "prescription", label: "Prescription" },
            { key: "verify", label: "Scan & Verify" },
          ].map((s, i) => {
            const idx = ["patient", "prescription", "verify"].indexOf(stage);
            const active = s.key === stage;
            const done = i < idx;
            return (
              <React.Fragment key={s.key}>
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium",
                    active && "bg-primary text-primary-foreground",
                    done && "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
                    !active && !done && "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  )}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : <span>{i + 1}</span>}
                  {s.label}
                </div>
                {i < 2 && <ChevronRight className="h-4 w-4 text-slate-300" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------ Step 1: patient */}
      {stage === "patient" && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[18px] font-semibold">
              <User className="h-5 w-5 text-primary" /> Select patient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-11 pl-9 text-[16px]"
                placeholder="Search patient by name or email…"
                value={patientSearch}
                onChange={(e) => searchPatients(e.target.value)}
                aria-label="Search patient"
              />
            </div>
            {searching && <p className="text-[13px] text-slate-500">Searching…</p>}
            {!searching && patientSearch.length >= 2 && patientList.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-6 text-center dark:bg-slate-800/50">
                <p className="text-[15px] font-medium">No patients found</p>
                <p className="mt-1 text-[13px] text-slate-500">
                  Only patients with a care relationship to you are searchable.
                </p>
              </div>
            )}
            {patientList.map((p) => (
              <button
                key={p.id}
                onClick={() => pickPatient(p)}
                className="flex min-h-[52px] w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-primary hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-900"
              >
                <div>
                  <p className="text-[16px] font-medium">{patientName(p)}</p>
                  {p.email && <p className="text-[13px] text-slate-500">{p.email}</p>}
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </button>
            ))}
            {patientSearch.length < 2 && (
              <p className="text-[13px] text-slate-500">
                Type at least 2 characters to search the patient directory.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------- Step 2: prescription select */}
      {stage === "prescription" && selectedPatient && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-[18px] font-semibold">
                <FileText className="h-5 w-5 text-primary" /> Active prescriptions
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={resetToPatient} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Patient
              </Button>
            </div>
            <p className="text-[13px] text-slate-500">
              Verifying for <span className="font-medium text-slate-700 dark:text-slate-200">{patientName(selectedPatient)}</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingRx && <p className="text-[13px] text-slate-500">Loading prescriptions…</p>}
            {!loadingRx && prescriptions.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-6 text-center dark:bg-slate-800/50">
                <p className="text-[15px] font-medium">No active prescriptions</p>
                <p className="mt-1 text-[13px] text-slate-500">
                  This patient has no pending prescriptions to verify.
                </p>
                <Button variant="outline" className="mt-3" onClick={resetToPatient}>
                  Choose another patient
                </Button>
              </div>
            )}
            {prescriptions.map((rx) => (
              <button
                key={rx.id}
                onClick={() => pickPrescription(rx)}
                className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-primary hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-medium">{rx.medication_name}</p>
                  <p className="text-[13px] text-slate-500">
                    {rx.dosage}
                    {rx.quantity ? ` · Qty ${rx.quantity}` : ""}
                    {rx.prescription_number ? ` · ${rx.prescription_number}` : ""}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------- Step 3: scan & verify */}
      {stage === "verify" && selectedRx && (
        <>
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-[18px] font-semibold">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Verify medication
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedRx(null); setLastResult(null); setStage("prescription"); }} className="gap-1">
                  <ArrowLeft className="h-4 w-4" /> Prescriptions
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Expected medication summary */}
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <p className="text-[13px] font-medium uppercase tracking-wide text-slate-500">Expected</p>
                <p className="mt-1 text-[17px] font-semibold">{selectedRx.medication_name}</p>
                <p className="text-[14px] text-slate-500">
                  {selectedRx.dosage}
                  {selectedRx.prescription_number ? ` · ${selectedRx.prescription_number}` : ""}
                </p>
              </div>

              {/* Expected barcode — prefilled from the prescription label, editable fallback */}
              <div className="space-y-1.5">
                <Label htmlFor="expected-barcode" className="text-[14px] font-medium">
                  Expected barcode <span className="font-normal text-slate-500">(as printed on the prescription label)</span>
                </Label>
                <Input
                  id="expected-barcode"
                  className="h-11 font-mono text-[15px]"
                  value={expectedBarcode}
                  onChange={(e) => setExpectedBarcode(e.target.value)}
                  placeholder="e.g. RX20261018-0001234567"
                />
              </div>

              {/* Primary action: scan */}
              <Button
                onClick={() => setScannerOpen(true)}
                disabled={saving}
                className="h-[52px] w-full gap-2 text-[17px] font-semibold"
              >
                <ScanLine className="h-5 w-5" />
                {saving ? "Logging scan…" : "Scan Medication Barcode"}
              </Button>
              <p className="text-center text-[12px] text-slate-500">
                Camera scanning with manual-entry fallback. Every scan is logged.
              </p>

              {/* Match result */}
              {matched && lastResult && (
                <div className="rounded-2xl border-2 border-green-500 bg-green-50 p-6 text-center dark:bg-green-950/40" role="alert">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 dark:text-green-400" />
                  <p className="mt-2 text-[20px] font-bold text-green-800 dark:text-green-200">
                    VERIFIED — Safe to Dispense
                  </p>
                  <p className="mt-1 text-[14px] text-green-700 dark:text-green-300">
                    Scanned <span className="font-mono font-semibold">{lastResult.barcode_scanned}</span> matches the prescription.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" className="h-11 flex-1" onClick={() => setLastResult(null)}>
                      Verify another medication
                    </Button>
                    <Button className="h-11 flex-1 bg-green-600 hover:bg-green-700" onClick={() => navigate("/prescriptions")}>
                      Go to dispensing
                    </Button>
                  </div>
                </div>
              )}

              {/* Override-recorded state (post-override) */}
              {overridden && lastResult && (
                <div className="rounded-2xl border-2 border-amber-500 bg-amber-50 p-5 dark:bg-amber-950/40" role="alert">
                  <p className="text-[17px] font-bold text-amber-800 dark:text-amber-200">
                    Dispensed under pharmacist override
                  </p>
                  <p className="mt-1 text-[14px] text-amber-700 dark:text-amber-300">
                    Reason: “{lastResult.override_reason}”
                  </p>
                  <p className="mt-1 text-[12px] text-amber-600 dark:text-amber-400">
                    Logged {new Date(lastResult.scanned_at).toLocaleString()} · audit trail retained.
                  </p>
                  <Button variant="outline" className="mt-3 h-11 w-full" onClick={() => setLastResult(null)}>
                    Verify another medication
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ----------------------------------------------- Session scan history */}
      {history.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[17px] font-semibold">
              <History className="h-5 w-5 text-primary" /> Session scan log
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium">{h.medication_name}</p>
                  <p className="font-mono text-[12px] text-slate-500">
                    {h.barcode_scanned} · {new Date(h.scanned_at).toLocaleTimeString()}
                    {h.override_reason ? " · override recorded" : ""}
                  </p>
                </div>
                <Badge
                  className={cn(
                    "shrink-0 gap-1",
                    h.verification_result === "match"
                      ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-200"
                      : "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-200"
                  )}
                >
                  {h.verification_result === "match" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  {h.verification_result === "match" ? "Match" : "Mismatch"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------- Scanner dialog */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan medication package</DialogTitle>
          </DialogHeader>
          <BarcodeScanner
            title="Scan the barcode on the medication package"
            onScan={handleScan}
            onClose={() => setScannerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ================================================= MISMATCH HARD STOP
           Full-screen, non-dismissible except by re-scan or typed override. */}
      {mismatched && lastResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-red-600 p-4" role="alertdialog" aria-modal="true" aria-label="Barcode mismatch — do not dispense" tabIndex={-1} ref={(el) => el?.focus()}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-slate-950 sm:p-8">
            <AlertOctagon className="mx-auto h-16 w-16 text-red-600" />
            <h2 className="mt-3 text-[28px] font-bold tracking-tight text-red-700 dark:text-red-400">
              BARCODE MISMATCH
            </h2>
            <p className="mt-1 text-[18px] font-bold text-slate-900 dark:text-white">
              DO NOT DISPENSE · DO NOT ADMINISTER
            </p>
            <p className="mt-2 text-[14px] text-slate-600 dark:text-slate-300">
              The scanned medication does not match the prescription. This event has been
              logged to the safety audit trail.
            </p>
            <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-left dark:bg-slate-900">
              <div className="flex justify-between gap-2 text-[14px]">
                <span className="text-slate-500">Medication</span>
                <span className="font-medium">{lastResult.medication_name}</span>
              </div>
              <div className="flex justify-between gap-2 text-[14px]">
                <span className="text-slate-500">Scanned</span>
                <span className="font-mono font-semibold text-red-700 dark:text-red-400">{lastResult.barcode_scanned}</span>
              </div>
              <div className="flex justify-between gap-2 text-[14px]">
                <span className="text-slate-500">Expected</span>
                <span className="font-mono font-semibold">{lastResult.expected_barcode}</span>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                className="h-[52px] text-[16px]"
                onClick={() => { setLastResult(null); setScannerOpen(true); }}
              >
                Re-scan package
              </Button>
              <Button
                variant="destructive"
                className="h-[52px] text-[16px]"
                onClick={() => setOverrideOpen(true)}
              >
                Pharmacist override
              </Button>
            </div>
            <p className="mt-3 text-[12px] text-slate-500">
              Override requires a typed clinical reason and is permanently logged against your account.
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------- Override dialog */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertOctagon className="h-5 w-5" /> Pharmacist override
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[14px] text-slate-600 dark:text-slate-300">
              You are overriding a barcode <strong>mismatch</strong>. This is a patient-safety
              event and will be permanently logged with your identity, the scanned and
              expected barcodes, and the reason below.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="override-reason" className="text-[14px] font-medium">
                Clinical reason for override *
              </Label>
              <Textarea
                id="override-reason"
                rows={4}
                className="text-[15px]"
                placeholder="e.g. Manufacturer repackaged under a new GTIN; verified medication name, strength and batch against the prescription with the supervising pharmacist…"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
              <p className="text-[12px] text-slate-500">Minimum 10 characters. Be specific — this is the audit record.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setOverrideOpen(false); setOverrideReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitOverride}
              disabled={overrideSaving || overrideReason.trim().length < 10}
              className="min-h-[44px]"
            >
              {overrideSaving ? "Recording…" : "Confirm override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print shortcut hint for the label loop */}
      <p className="flex items-center justify-center gap-2 text-center text-[12px] text-slate-500">
        <Printer className="h-4 w-4" />
        Prescription labels printed from the dispensing queue carry the scannable barcode value used above.
      </p>
    </div>
  );
}

export default BarcodeVerify;
