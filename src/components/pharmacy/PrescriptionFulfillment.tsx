import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useOfflineMode } from "@/hooks/use-offline-mode";
import { safeCryptoUUID } from "@/utils/storage";
import {
  Pill, AlertTriangle, CheckCircle, Package, Plus, Trash2,
  Printer, Search, User, FileText, CheckCircle2
} from "lucide-react";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

interface Prescription {
  id: string;
  prescription_number?: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  quantity?: number;
  duration_days?: number;
  frequency?: string;
  prescribed_by: string;
  prescribed_date: string;
  notes?: string;
  fulfillment_status?: "pending" | "filled" | "partially_filled" | "cancelled";
  patient_name?: string;
}

interface MedicationItem {
  id: string;
  medication_name: string;
  dosage: string;
  instructions: string;
  quantity: number;
  duration_days: number;
}

export function PrescriptionFulfillment() {
  const { user } = useAuth();
  const { institutionId, loading: institutionLoading } = useInstitutionContext();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isOnline, queueOfflineAction, cacheForOffline, getOfflineCache } = useOfflineMode();

  // Multi-medication prescribing state
  const [showNewRxDialog, setShowNewRxDialog] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientList, setPatientList] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [rxNotes, setRxNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [medicationItems, setMedicationItems] = useState<MedicationItem[]>([
    {
      id: "med-1",
      medication_name: "",
      dosage: "1 tab twice daily",
      instructions: "Take with meals",
      quantity: 10,
      duration_days: 5,
    },
  ]);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);

      if (!isOnline) {
        const cachedData = await getOfflineCache("pharmacy_prescriptions");
        if (cachedData) {
          setPrescriptions(cachedData);
          setLoading(false);
          return;
        }
      }

      let query = (supabase as any).from("comprehensive_prescriptions").select("*");

      if (institutionId) {
        query = query.or(`pharmacy_id.eq.${institutionId},pharmacy_id.is.null`);
      }

      const { data: prescriptionsData, error } = await query.order("prescribed_date", { ascending: false });
      if (error) throw error;

      // Batch fetch profile names
      const patientIds = Array.from(new Set((prescriptionsData || []).map((p: any) => p.patient_id).filter(Boolean)));
      const providerIds = Array.from(new Set((prescriptionsData || []).map((p: any) => p.provider_id).filter(Boolean)));
      const allProfileIds = Array.from(new Set([...patientIds, ...providerIds]));

      let profileMap: Record<string, any> = {};
      if (allProfileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", allProfileIds);
        (profiles || []).forEach((prof) => {
          profileMap[prof.id] = prof;
        });
      }

      const prescriptionsWithStatus = (prescriptionsData || []).map((prescription: any) => {
        const patientProf = profileMap[prescription.patient_id];
        const providerProf = profileMap[prescription.provider_id];
        return {
          id: prescription.id,
          prescription_number: prescription.prescription_number,
          patient_id: prescription.patient_id,
          medication_name: prescription.medication_name,
          dosage: prescription.dosage,
          quantity: prescription.quantity,
          duration_days: prescription.duration_days,
          frequency: prescription.instructions,
          prescribed_by: providerProf
            ? `Dr. ${providerProf.first_name || ""} ${providerProf.last_name || ""}`.trim()
            : "Pharmacy / Attending Provider",
          prescribed_date: prescription.prescribed_date,
          notes: prescription.notes,
          fulfillment_status: prescription.status as "pending" | "filled" | "partially_filled" | "cancelled",
          patient_name: patientProf
            ? `${patientProf.first_name || ""} ${patientProf.last_name || ""}`.trim() || patientProf.email
            : "Walk-in Patient",
        };
      });

      setPrescriptions(prescriptionsWithStatus);
      await cacheForOffline("pharmacy_prescriptions", prescriptionsWithStatus);
    } catch (error) {
      console.error("Error loading prescriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, [institutionId, institutionLoading, isOnline, cacheForOffline, getOfflineCache]);

  const searchPatients = async (query: string) => {
    setPatientSearch(query);
    if (!query || query.length < 2) {
      setPatientList([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(8);
    setPatientList(data || []);
  };

  const handleAddMedication = () => {
    setMedicationItems((prev) => [
      ...prev,
      {
        id: `med-${Date.now()}`,
        medication_name: "",
        dosage: "1 tab daily",
        instructions: "Take as directed",
        quantity: 10,
        duration_days: 7,
      },
    ]);
  };

  const handleRemoveMedication = (id: string) => {
    if (medicationItems.length <= 1) {
      toast({ title: "Must contain at least 1 medication" });
      return;
    }
    setMedicationItems((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateMed = (id: string, field: keyof MedicationItem, val: any) => {
    setMedicationItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
  };

  const handleCreateMultiRx = async () => {
    if (!selectedPatient) {
      toast({ title: "Please select a patient", variant: "destructive" });
      return;
    }
    const invalid = medicationItems.some((m) => !m.medication_name.trim() || !m.dosage.trim());
    if (invalid) {
      toast({ title: "Fill in medication name and dosage for all items", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const rxNo = `RX-PHARM-${Date.now().toString(36).toUpperCase()}`;
      const prescribedDate = new Date().toISOString();

      const inserts = medicationItems.map((m) => ({
        provider_id: user?.id || selectedPatient.id,
        patient_id: selectedPatient.id,
        pharmacy_id: institutionId || null,
        prescription_number: rxNo,
        medication_name: m.medication_name.trim(),
        dosage: m.dosage.trim(),
        instructions: m.instructions.trim(),
        quantity: m.quantity || 1,
        duration_days: m.duration_days || 7,
        status: "filled", // Pharmacy dispenses directly
        prescribed_date: prescribedDate,
        notes: rxNotes || "Direct Pharmacy Dispensing",
      }));

      const { error } = await (supabase as any)
        .from("comprehensive_prescriptions")
        .insert(inserts);

      if (error) throw error;

      toast({
        title: "Prescription Dispensed",
        description: `Successfully dispensed ${medicationItems.length} medication(s) under Rx #${rxNo}`,
      });

      setShowNewRxDialog(false);
      setSelectedPatient(null);
      setPatientSearch("");
      setRxNotes("");
      setMedicationItems([
        {
          id: "med-1",
          medication_name: "",
          dosage: "1 tab twice daily",
          instructions: "Take with meals",
          quantity: 10,
          duration_days: 5,
        },
      ]);
      loadPrescriptions();
    } catch (e: any) {
      console.error("Error creating pharmacy prescription:", e);
      toast({ title: "Failed to dispense prescription", description: e?.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFulfillmentStatus = async (prescriptionId: string, newStatus: string) => {
    try {
      setPrescriptions((prev) =>
        prev.map((p) => {
          if (p.id === prescriptionId) {
            return {
              ...p,
              fulfillment_status: newStatus as any,
            };
          }
          return p;
        })
      );

      if (!isOnline) {
        await queueOfflineAction({
          id: safeCryptoUUID(),
          type: "UPDATE_PRESCRIPTION_STATUS",
          table: "comprehensive_prescriptions",
          data: { id: prescriptionId, status: newStatus },
        });
        toast({ title: "Status saved offline" });
        return;
      }

      const { error } = await (supabase as any)
        .from("comprehensive_prescriptions")
        .update({ status: newStatus })
        .eq("id", prescriptionId);
      if (error) throw error;

      toast({ title: "Prescription Status Updated" });
    } catch (error) {
      console.error("Error updating fulfillment status:", error);
    }
  };

  const handlePrintSlip = (item: Prescription) => {
    // Find all items sharing the same prescription number
    const batch = item.prescription_number
      ? prescriptions.filter((p) => p.prescription_number === item.prescription_number)
      : [item];

    const printWin = window.open("", "_blank");
    if (!printWin) return;

    const itemsHtml = batch.map((b, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; font-weight: bold;">${idx + 1}. ${b.medication_name}</td>
        <td style="padding: 8px;">${b.dosage}</td>
        <td style="padding: 8px;">${b.quantity || 1} units</td>
        <td style="padding: 8px; color: #475569;">${b.frequency || 'Take as directed'}</td>
      </tr>
    `).join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dispensing Slip - ${item.prescription_number || item.id}</title>
          <style>
            body { font-family: sans-serif; padding: 25px; max-width: 750px; margin: auto; }
            .header { border-bottom: 2px solid #0073ea; padding-bottom: 10px; margin-bottom: 15px; }
            .title { font-size: 20px; font-weight: bold; color: #0073ea; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
            th { background: #0f172a; color: white; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">DOC' O CLOCK PHARMACY NETWORK</div>
            <div>Official Prescription Dispensing Slip</div>
          </div>
          <p><strong>Patient:</strong> ${item.patient_name || "Patient"}</p>
          <p><strong>Prescription #:</strong> ${item.prescription_number || item.id}</p>
          <p><strong>Date:</strong> ${new Date(item.prescribed_date).toLocaleDateString()}</p>
          <table>
            <thead><tr><th>Medication</th><th>Dosage</th><th>Qty</th><th>Instructions</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const getStatusPill = (st: string) => {
    switch (st) {
      case "filled":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00c875]">Filled</span>;
      case "cancelled":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#e2445c]">Cancelled</span>;
      case "partially_filled":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#a25ddc]">Partially Filled</span>;
      default:
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#fdab3d]">Pending Rx</span>;
    }
  };

  if (loading || institutionLoading) {
    return <div className="p-8 text-center text-xs font-bold text-slate-400">Loading prescription queue...</div>;
  }

  return (
    <div className="space-y-4 font-sans text-slate-900 dark:text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e6e9ef] pb-3">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-[#0073ea]" />
          <h2 className="text-base font-extrabold">Pharmacy Prescription &amp; Dispensing Queue</h2>
          {!isOnline && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Offline
            </span>
          )}
        </div>

        <Dialog open={showNewRxDialog} onOpenChange={setShowNewRxDialog}>
          <DialogTrigger asChild>
            <button className="px-4 py-2 rounded-xl bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 self-start">
              <Plus className="h-4 w-4" />
              <span>Prescribe &amp; Dispense (Multi-Drug)</span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="font-black text-xl flex items-center gap-2">
                <Pill className="h-6 w-6 text-[#0073ea]" />
                Pharmacy Direct Dispensing (Multi-Medication)
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Patient Selection */}
              <div>
                <label className="font-bold text-[#676879] uppercase">Patient / Customer *</label>
                <input
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] dark:border-slate-800 font-medium"
                  placeholder="Search customer by name or email..."
                  value={patientSearch}
                  onChange={(e) => searchPatients(e.target.value)}
                />
                {patientList.length > 0 && !selectedPatient && (
                  <div className="mt-1 border rounded-xl max-h-36 overflow-y-auto bg-white dark:bg-slate-900 shadow-sm">
                    {patientList.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-xs hover:bg-[#f0f2f7] dark:hover:bg-slate-800 flex items-center justify-between border-b last:border-b-0"
                        onClick={() => {
                          setSelectedPatient(p);
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
                    <span className="font-bold text-[#0073ea]">Customer: {selectedPatient.first_name} {selectedPatient.last_name}</span>
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

              {/* Medication Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#676879] uppercase">
                    Medications ({medicationItems.length} item{medicationItems.length > 1 ? 's' : ''})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="px-3 py-1 rounded-full bg-[#0073ea]/10 hover:bg-[#0073ea] hover:text-white text-[#0073ea] font-extrabold text-[11px] flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Another Medication
                  </button>
                </div>

                {medicationItems.map((item, idx) => (
                  <div key={item.id} className="p-3.5 rounded-2xl border border-[#e6e9ef] bg-[#f8fafc] dark:bg-slate-950 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-[#0073ea] text-white font-black text-[10px]">
                        Item #{idx + 1}
                      </span>
                      {medicationItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMedication(item.id)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300">Medication Name *</label>
                      <input
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-medium"
                        placeholder="e.g. Amoxicillin 500mg"
                        value={item.medication_name}
                        onChange={(e) => handleUpdateMed(item.id, "medication_name", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300">Dosage *</label>
                        <input
                          className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-medium"
                          placeholder="e.g. 1 tab 3x daily"
                          value={item.dosage}
                          onChange={(e) => handleUpdateMed(item.id, "dosage", e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Quantity</label>
                          <input
                            type="number"
                            min={1}
                            className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-medium"
                            value={item.quantity}
                            onChange={(e) => handleUpdateMed(item.id, "quantity", parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Days</label>
                          <input
                            type="number"
                            min={1}
                            className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-medium"
                            value={item.duration_days}
                            onChange={(e) => handleUpdateMed(item.id, "duration_days", parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300">Instructions</label>
                      <input
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-medium"
                        placeholder="Take after meals"
                        value={item.instructions}
                        onChange={(e) => handleUpdateMed(item.id, "instructions", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="font-bold text-[#676879] uppercase">Dispensing Notes</label>
                <textarea
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-medium"
                  placeholder="Notes, pharmacist remarks, batch IDs..."
                  value={rxNotes}
                  onChange={(e) => setRxNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="mt-3">
              <button
                type="button"
                onClick={() => setShowNewRxDialog(false)}
                className="px-4 py-2 rounded-xl font-bold text-slate-500 hover:bg-[#f0f2f7]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCreateMultiRx}
                className="px-5 py-2.5 rounded-xl bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isSubmitting ? "Dispensing..." : `Dispense (${medicationItems.length} Meds)`}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="w-full overflow-x-auto rounded-2xl border border-[#e6e9ef] bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#e6e9ef] bg-[#f5f6f8] text-[11px] font-extrabold uppercase text-[#676879]">
              <th className="py-2.5 px-4">Medication Name</th>
              <th className="py-2.5 px-3">Patient</th>
              <th className="py-2.5 px-3 text-center">Fulfillment Status</th>
              <th className="py-2.5 px-3">Dosage &amp; Instructions</th>
              <th className="py-2.5 px-3">Prescriber / Rx #</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6e9ef]">
            {prescriptions.map((p) => (
              <tr key={p.id} className="hover:bg-[#f0f2f7] transition-colors">
                <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Pill className="h-3.5 w-3.5 text-[#0073ea]" />
                    <span>{p.medication_name}</span>
                  </div>
                  {p.quantity && (
                    <span className="text-[10px] text-slate-400 font-normal">Qty: {p.quantity} units</span>
                  )}
                </td>
                <td className="py-3 px-3 font-bold text-[#0073ea]">{p.patient_name}</td>
                <td className="py-3 px-3 text-center">{getStatusPill(p.fulfillment_status || "pending")}</td>
                <td className="py-3 px-3">
                  <div className="font-semibold">{p.dosage}</div>
                  <div className="text-[10px] text-slate-400">{p.frequency}</div>
                </td>
                <td className="py-3 px-3 text-slate-600">
                  <div>{p.prescribed_by}</div>
                  {p.prescription_number && (
                    <span className="text-[10px] font-mono text-slate-400">{p.prescription_number}</span>
                  )}
                </td>
                <td className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <select
                      value={p.fulfillment_status || "pending"}
                      onChange={(e) => updateFulfillmentStatus(p.id, e.target.value)}
                      className="p-1 rounded-lg border border-[#c3c6d4] text-xs font-bold bg-white dark:bg-slate-800"
                    >
                      <option value="pending">Pending</option>
                      <option value="partially_filled">Partially Filled</option>
                      <option value="filled">Filled</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      onClick={() => handlePrintSlip(p)}
                      className="p-1.5 rounded-lg border border-[#e6e9ef] hover:bg-[#0073ea] hover:text-white transition-colors"
                      title="Print Dispensing Slip"
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PrescriptionFulfillment;

