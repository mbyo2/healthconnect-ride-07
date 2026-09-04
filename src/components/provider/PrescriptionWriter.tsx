import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkInteractions, getPatientActiveMedications, isBlocking, summarize } from "@/utils/drug-interactions";
import { AlertTriangle, Plus, Trash2, Pill, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface MedicationItem {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string;
  notes: string;
}

export const PrescriptionWriter = () => {
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string; email: string } | null>(null);
  const [interactionWarning, setInteractionWarning] = useState<string>("");
  const [overrideAck, setOverrideAck] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalNotes, setGeneralNotes] = useState("");

  const [medications, setMedications] = useState<MedicationItem[]>([
    {
      id: "med-1",
      medication_name: "",
      dosage: "500mg",
      frequency: "Twice daily",
      duration: "7",
      quantity: "14",
      notes: "Take with food",
    }
  ]);

  const { data: patientResults = [] } = useQuery({
    queryKey: ["writer-patients", patientSearch],
    queryFn: async () => {
      if (!patientSearch || patientSearch.length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .or(`first_name.ilike.%${patientSearch}%,last_name.ilike.%${patientSearch}%,email.ilike.%${patientSearch}%`)
        .limit(8);
      return data || [];
    },
    enabled: patientSearch.length >= 2,
  });

  const handleAddMed = () => {
    setMedications((prev) => [
      ...prev,
      {
        id: `med-${Date.now()}`,
        medication_name: "",
        dosage: "500mg",
        frequency: "Once daily",
        duration: "7",
        quantity: "7",
        notes: "",
      }
    ]);
  };

  const handleRemoveMed = (id: string) => {
    if (medications.length <= 1) {
      toast.info("Prescription must have at least one medication");
      return;
    }
    setMedications((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateMed = (id: string, field: keyof MedicationItem, val: string) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
  };

  const runInteractionCheck = async (): Promise<{ blocking: boolean; message: string }> => {
    if (!selectedPatient) return { blocking: false, message: "" };
    const names = medications.map((m) => m.medication_name.trim()).filter(Boolean);
    if (!names.length) return { blocking: false, message: "" };

    const existing = await getPatientActiveMedications(selectedPatient.id);
    const allKnown = [...existing];
    let allInteractions: any[] = [];

    for (const name of names) {
      const others = names.filter((n) => n !== name).concat(allKnown);
      const res = await checkInteractions(name, others);
      allInteractions = allInteractions.concat(res);
    }

    if (!allInteractions.length) return { blocking: false, message: "" };
    const blocking = allInteractions.some((i) => isBlocking(i.severity));
    return { blocking, message: summarize(allInteractions) };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    const invalid = medications.some((m) => !m.medication_name.trim() || !m.dosage.trim());
    if (invalid) {
      toast.error("Please fill in medication name and dosage for all items");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const check = await runInteractionCheck();
      if (check.message) {
        setInteractionWarning(check.message);
        if (check.blocking && !overrideAck) {
          toast.error("Major drug interaction detected — review and confirm to override.");
          setIsSubmitting(false);
          return;
        }
      }

      const rxNumber = `RX-${Date.now().toString(36).toUpperCase()}`;
      const prescribedDate = new Date().toISOString();

      const inserts = medications.map((m) => ({
        patient_id: selectedPatient.id,
        medication_name: m.medication_name.trim(),
        dosage: `${m.dosage} - ${m.frequency}`,
        instructions: `${m.frequency}. ${m.notes || ''}`.trim(),
        duration_days: parseInt(m.duration) || 7,
        quantity: parseInt(m.quantity) || 1,
        provider_id: user.id,
        prescription_number: rxNumber,
        prescribed_date: prescribedDate,
        status: 'active',
        notes: check.message
          ? `${generalNotes || ''}\n[Interaction alert acknowledged]: ${check.message}`
          : generalNotes || null
      }));

      const { error } = await (supabase as any)
        .from('comprehensive_prescriptions')
        .insert(inserts);

      if (error) throw error;

      toast.success(`Prescription with ${medications.length} medication(s) created (Rx #${rxNumber})`);
      setInteractionWarning("");
      setOverrideAck(false);
      setSelectedPatient(null);
      setPatientSearch("");
      setGeneralNotes("");
      setMedications([
        {
          id: "med-1",
          medication_name: "",
          dosage: "500mg",
          frequency: "Twice daily",
          duration: "7",
          quantity: "14",
          notes: "Take with food",
        }
      ]);
    } catch (error: any) {
      console.error("Error creating prescription:", error);
      toast.error(error?.message || "Failed to create prescription");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs font-sans">
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#e6e9ef] dark:border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Pill className="h-5 w-5 text-[#0073ea]" />
            Write E-Prescription (Multi-Medication)
          </h2>
          <p className="text-xs text-slate-400">Prescribe multiple medications with safety &amp; interaction screening</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Patient Selection */}
        <div>
          <Label className="font-bold text-slate-700 dark:text-slate-300">Select Patient *</Label>
          <Input
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            placeholder="Search patient by name or email..."
            className="mt-1 rounded-xl"
          />
          {patientResults.length > 0 && !selectedPatient && (
            <div className="mt-1 border rounded-xl max-h-36 overflow-y-auto bg-white dark:bg-slate-950 shadow-sm">
              {patientResults.map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[#f0f2f7] dark:hover:bg-slate-800 flex items-center justify-between border-b last:border-b-0"
                  onClick={() => {
                    setSelectedPatient({ id: p.id, name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email, email: p.email });
                    setPatientSearch(`${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email);
                  }}
                >
                  <span className="font-bold">{p.first_name} {p.last_name} ({p.email})</span>
                  <span className="text-[#0073ea] font-bold">Select</span>
                </button>
              ))}
            </div>
          )}
          {selectedPatient && (
            <div className="mt-2 p-2.5 rounded-xl bg-[#0073ea]/10 border border-[#0073ea]/30 flex items-center justify-between">
              <span className="font-bold text-[#0073ea]">Patient: {selectedPatient.name}</span>
              <button
                type="button"
                onClick={() => { setSelectedPatient(null); setPatientSearch(""); }}
                className="text-rose-500 font-bold hover:underline"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Medication Rows */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label className="font-bold text-slate-700 dark:text-slate-300 uppercase">
              Medications ({medications.length} item{medications.length > 1 ? 's' : ''})
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddMed}
              className="text-[#0073ea] font-bold rounded-xl h-8 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Medication
            </Button>
          </div>

          {medications.map((m, idx) => (
            <div key={m.id} className="p-4 rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-950 space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-[#0073ea] text-white font-black text-[10px]">
                  Medication #{idx + 1}
                </span>
                {medications.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMed(m.id)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div>
                <Label className="font-semibold">Medication Name *</Label>
                <Input
                  value={m.medication_name}
                  onChange={(e) => handleUpdateMed(m.id, "medication_name", e.target.value)}
                  placeholder="e.g. Amoxicillin 500mg"
                  className="mt-1 rounded-xl bg-white dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="font-semibold">Dosage *</Label>
                  <Input
                    value={m.dosage}
                    onChange={(e) => handleUpdateMed(m.id, "dosage", e.target.value)}
                    placeholder="e.g. 500mg / 1 tab"
                    className="mt-1 rounded-xl bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <Label className="font-semibold">Frequency *</Label>
                  <Input
                    value={m.frequency}
                    onChange={(e) => handleUpdateMed(m.id, "frequency", e.target.value)}
                    placeholder="e.g. Twice daily"
                    className="mt-1 rounded-xl bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="font-semibold">Duration (Days)</Label>
                  <Input
                    value={m.duration}
                    onChange={(e) => handleUpdateMed(m.id, "duration", e.target.value)}
                    placeholder="7"
                    type="number"
                    className="mt-1 rounded-xl bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <Label className="font-semibold">Total Quantity</Label>
                  <Input
                    value={m.quantity}
                    onChange={(e) => handleUpdateMed(m.id, "quantity", e.target.value)}
                    placeholder="14"
                    type="number"
                    className="mt-1 rounded-xl bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <Label className="font-semibold">Instructions / Notes</Label>
                <Input
                  value={m.notes}
                  onChange={(e) => handleUpdateMed(m.id, "notes", e.target.value)}
                  placeholder="e.g. Take after meals with plenty of water"
                  className="mt-1 rounded-xl bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          ))}
        </div>

        {/* General Notes */}
        <div>
          <Label className="font-bold text-slate-700 dark:text-slate-300">Clinical Diagnosis &amp; General Remarks</Label>
          <Textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="Diagnosis, follow-up dates, or patient instructions..."
            rows={2}
            className="mt-1 rounded-xl"
          />
        </div>

        {interactionWarning && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 p-3 space-y-2 text-rose-900 dark:text-rose-300">
            <div className="flex items-start gap-2 text-xs">
              <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
              <div className="whitespace-pre-line">{interactionWarning}</div>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold pt-1">
              <input type="checkbox" checked={overrideAck} onChange={(e) => setOverrideAck(e.target.checked)} />
              I have reviewed and will proceed despite the interaction.
            </label>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold rounded-xl"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {isSubmitting ? "Issuing Prescription..." : `Issue Multi-Medication E-Prescription (${medications.length} Meds)`}
        </Button>
      </form>
    </Card>
  );
};