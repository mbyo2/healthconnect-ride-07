import React, { useState, useMemo } from "react";
import {
  Pill, Calendar, User, Clock, Download, Plus, FileText, Search,
  ExternalLink, Filter, CheckCircle2, AlertTriangle, Trash2, ShieldAlert,
  Printer, ArrowRight, Sparkles
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { checkInteractions } from "@/utils/drug-interactions";

interface MedicationItem {
  id: string;
  medication_name: string;
  dosage: string;
  instructions: string;
  quantity: number;
  duration_days: number;
  refills_remaining: number;
}

const COMMON_DOSAGES = [
  "1 tablet once daily",
  "1 tablet twice daily (12hr)",
  "1 tablet 3x daily with meals",
  "2 tablets once daily",
  "5ml (1 tsp) 3x daily",
  "10ml 2x daily after food",
  "1 capsule at bedtime",
  "Apply thin layer 2x daily",
];

const COMMON_DRUGS = [
  "Amoxicillin 500mg",
  "Paracetamol 500mg",
  "Ibuprofen 400mg",
  "Azithromycin 250mg",
  "Metformin 500mg",
  "Amlodipine 5mg",
  "Omeprazole 20mg",
  "Ciprofloxacin 500mg",
  "Cetirizine 10mg",
  "Salbutamol Inhaler 100mcg",
  "Artemether/Lumefantrine (Coartem)",
  "Metronidazole 400mg",
  "Multivitamin Syrup",
];

export const Prescriptions = () => {
  const { user } = useAuth();
  const { availableRoles } = useUserRoles();
  const { institutionId } = useInstitutionContext();
  const queryClient = useQueryClient();
  const [showNewPrescription, setShowNewPrescription] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPatient, setSearchPatient] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string; email: string } | null>(null);
  const [rxNotes, setRxNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interactionAlerts, setInteractionAlerts] = useState<string[]>([]);

  // Multi-medication item list
  const [medicationItems, setMedicationItems] = useState<MedicationItem[]>([
    {
      id: "med-1",
      medication_name: "",
      dosage: "1 tablet twice daily (12hr)",
      instructions: "Take after meals with water",
      quantity: 10,
      duration_days: 5,
      refills_remaining: 0,
    }
  ]);

  const isProvider = availableRoles.some((r) =>
    ["health_personnel", "doctor", "pharmacist", "pharmacy", "institution_admin"].includes(r)
  );

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ["prescriptions", user?.id, isProvider],
    queryFn: async () => {
      if (!user) return [];
      const query = (supabase as any)
        .from("comprehensive_prescriptions")
        .select(`
          id, medication_name, dosage, duration_days, prescribed_date, status,
          refills_remaining, instructions, quantity, generic_name, strength, prescription_number, notes,
          patient:profiles!comprehensive_prescriptions_patient_id_fkey(first_name, last_name, email, phone),
          provider:profiles!comprehensive_prescriptions_provider_id_fkey(first_name, last_name)
        `)
        .order("prescribed_date", { ascending: false });

      if (isProvider) {
        query.or(`provider_id.eq.${user.id}${institutionId ? `,pharmacy_id.eq.${institutionId}` : ''}`);
      } else {
        query.eq("patient_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["prescription-patients", searchPatient],
    queryFn: async () => {
      if (!searchPatient || searchPatient.length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .or(`first_name.ilike.%${searchPatient}%,last_name.ilike.%${searchPatient}%,email.ilike.%${searchPatient}%`)
        .limit(10);
      return data || [];
    },
    enabled: isProvider && searchPatient.length >= 2,
  });

  // Multi-medication management handlers
  const handleAddMedication = () => {
    setMedicationItems((prev) => [
      ...prev,
      {
        id: `med-${Date.now()}`,
        medication_name: "",
        dosage: "1 tablet once daily",
        instructions: "Take as directed",
        quantity: 10,
        duration_days: 7,
        refills_remaining: 0,
      }
    ]);
  };

  const handleRemoveMedication = (id: string) => {
    if (medicationItems.length <= 1) {
      toast.info("Prescription must contain at least one medication.");
      return;
    }
    setMedicationItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateMedication = (id: string, field: keyof MedicationItem, value: any) => {
    setMedicationItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Check drug interactions across all medications in list
  const runSafetyChecks = async () => {
    const names = medicationItems.map((m) => m.medication_name.trim()).filter(Boolean);
    if (names.length < 2) {
      setInteractionAlerts([]);
      return;
    }
    const alerts: string[] = [];
    for (let i = 0; i < names.length; i++) {
      const candidate = names[i];
      const others = names.filter((_, idx) => idx !== i);
      const interactions = await checkInteractions(candidate, others);
      interactions.forEach((inter) => {
        const text = `${inter.drug_a} + ${inter.drug_b} (${inter.severity.toUpperCase()}): ${inter.description || 'Potential interaction detected'}`;
        if (!alerts.includes(text)) alerts.push(text);
      });
    }
    setInteractionAlerts(alerts);
  };

  const handleCreatePrescription = async () => {
    if (!user || !selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    const invalidItems = medicationItems.filter((m) => !m.medication_name.trim() || !m.dosage.trim());
    if (invalidItems.length > 0) {
      toast.error("Please fill in the medication name and dosage for all items");
      return;
    }

    setIsSubmitting(true);
    try {
      const rxNumber = `RX-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
      const prescribedDate = new Date().toISOString();

      const inserts = medicationItems.map((item) => ({
        provider_id: user.id,
        patient_id: selectedPatient.id,
        pharmacy_id: institutionId || null,
        prescription_number: rxNumber,
        medication_name: item.medication_name.trim(),
        dosage: item.dosage.trim(),
        instructions: item.instructions.trim(),
        quantity: item.quantity || 1,
        duration_days: item.duration_days || 7,
        refills_remaining: item.refills_remaining || 0,
        status: "active",
        prescribed_date: prescribedDate,
        notes: rxNotes || null,
      }));

      const { error } = await (supabase as any)
        .from("comprehensive_prescriptions")
        .insert(inserts);

      if (error) throw error;

      toast.success(`E-Prescription issued with ${medicationItems.length} medication(s) (Rx #${rxNumber})`);
      setShowNewPrescription(false);
      setSelectedPatient(null);
      setSearchPatient("");
      setRxNotes("");
      setInteractionAlerts([]);
      setMedicationItems([
        {
          id: "med-1",
          medication_name: "",
          dosage: "1 tablet twice daily (12hr)",
          instructions: "Take after meals with water",
          quantity: 10,
          duration_days: 5,
          refills_remaining: 0,
        }
      ]);
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
    } catch (error: any) {
      console.error("Error creating multi-medication prescription:", error);
      toast.error(error?.message || "Failed to create prescription");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((p: any) => {
      const matchSearch =
        p.medication_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.instructions || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.prescription_number || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "all" || (p.status || "active") === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [prescriptions, searchQuery, statusFilter]);

  const getStatusPill = (status: string) => {
    switch (status) {
      case "active":
      case "filled":
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">✓ Active / Filled</span>;
      case "expired":
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">✕ Expired</span>;
      case "pending":
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">● Pending Rx</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-[#e5f0ff] dark:bg-blue-950/50 text-[#0073ea] dark:text-blue-400 border border-[#0073ea]/20">{status || "Dispatched"}</span>;
    }
  };

  // Group prescriptions by prescription_number or order ID for multi-item view
  const groupedOrders = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredPrescriptions.forEach((p: any) => {
      const key = p.prescription_number || p.id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return Object.entries(groups);
  }, [filteredPrescriptions]);

  const handlePrintSlip = (items: any[]) => {
    const first = items[0];
    const printWin = window.open("", "_blank");
    if (!printWin) return;

    const patientName = `${first.patient?.first_name || ""} ${first.patient?.last_name || ""}`.trim() || "Patient";
    const providerName = `Dr. ${first.provider?.first_name || ""} ${first.provider?.last_name || ""}`.trim() || "Attending Clinician / Pharmacist";
    const dateStr = new Date(first.prescribed_date).toLocaleDateString();
    const rxNo = first.prescription_number || `RX-${first.id.substring(0, 8).toUpperCase()}`;

    const itemsHtml = items.map((item, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 8px; font-weight: bold;">${idx + 1}. ${item.medication_name}</td>
        <td style="padding: 10px 8px;">${item.dosage}</td>
        <td style="padding: 10px 8px;">${item.quantity || 1} units (${item.duration_days || 7} days)</td>
        <td style="padding: 10px 8px; color: #475569;">${item.instructions || 'As directed'}</td>
      </tr>
    `).join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prescription Slip - ${rxNo}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #0f172a; max-width: 800px; margin: auto; }
            .header { border-bottom: 3px solid #0073ea; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 22px; font-weight: 900; color: #0073ea; }
            .rx-title { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; margin-bottom: 25px; padding: 15px; background: #f8fafc; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; margin-bottom: 30px; }
            th { background: #0f172a; color: white; padding: 10px 8px; font-size: 11px; text-transform: uppercase; }
            .footer { border-top: 1px solid #cbd5e1; padding-top: 15px; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; align-items: flex-end; }
            .sig-box { border-top: 1px solid #0f172a; width: 200px; text-align: center; padding-top: 5px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">DOC' O CLOCK</div>
              <div style="font-size: 12px; color: #64748b; font-weight: bold;">Digital Healthcare &amp; Pharmacy Network</div>
            </div>
            <div style="text-align: right;">
              <div class="rx-title">Official E-Prescription</div>
              <div style="font-family: monospace; font-weight: bold; color: #0073ea;">${rxNo}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div><strong>Patient Name:</strong> ${patientName}</div>
            <div><strong>Date Prescribed:</strong> ${dateStr}</div>
            <div><strong>Prescriber:</strong> ${providerName}</div>
            <div><strong>Total Medications:</strong> ${items.length} item(s)</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Medication</th>
                <th>Dosage &amp; Frequency</th>
                <th>Quantity / Duration</th>
                <th>Instructions</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          ${first.notes ? `<div style="margin-bottom: 25px; font-size: 12px; padding: 10px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px;"><strong>Clinical Remarks:</strong> ${first.notes}</div>` : ""}

          <div class="footer">
            <div>
              <p>Generated securely via Doc' O Clock E-Prescribing System</p>
              <p>Verify validity at app.dococlock.com/prescriptions</p>
            </div>
            <div class="sig-box">
              ${providerName}<br />
              <span style="font-size: 9px; font-weight: normal; color: #64748b;">Authorized Practitioner Signature</span>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Top Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[#0073ea] text-white flex items-center justify-center font-black shadow-sm shadow-[#0073ea]/30">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight flex items-center gap-2.5 text-slate-900 dark:text-slate-100">
                {isProvider ? "Prescription & Dispensing Board" : "My Medication Prescriptions"}
                <span className="w-2 h-2 rounded-full bg-[#00a86b]" />
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                {isProvider ? "Write single or multi-medication digital prescriptions & dispense orders" : "Track dosage instructions, active refills & digital prescriptions"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isProvider && (
              <Dialog open={showNewPrescription} onOpenChange={setShowNewPrescription}>
                <DialogTrigger asChild>
                  <button className="px-5 py-2.5 rounded-full bg-[#0073ea] hover:bg-[#0060c7] text-white font-extrabold text-xs shadow-sm shadow-[#0073ea]/30 transition-all flex items-center gap-2 active:scale-95">
                    <Plus className="h-4 w-4" />
                    <span>Write E-Prescription (Multi-Drug)</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 rounded-3xl p-6">
                  <DialogHeader>
                    <DialogTitle className="font-black text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Pill className="h-6 w-6 text-[#0073ea]" />
                      Write Multi-Medication E-Prescription
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 py-2 text-xs">
                    {/* Patient Selector */}
                    <div>
                      <label className="font-bold text-[#676879] uppercase">1. Select Patient *</label>
                      <input
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-950 font-medium"
                        placeholder="Search patient by name or email..."
                        value={searchPatient}
                        onChange={(e) => setSearchPatient(e.target.value)}
                      />
                      {patients.length > 0 && !selectedPatient && (
                        <div className="mt-1 border rounded-xl max-h-36 overflow-y-auto bg-white dark:bg-slate-900 shadow-md">
                          {patients.map((p: any) => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full text-left px-3 py-2.5 text-xs hover:bg-[#f0f2f7] dark:hover:bg-slate-800 flex items-center justify-between border-b last:border-b-0"
                              onClick={() => {
                                setSelectedPatient({ id: p.id, name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email, email: p.email });
                                setSearchPatient(`${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email);
                              }}
                            >
                              <div>
                                <p className="font-bold text-slate-900 dark:text-slate-100">{p.first_name} {p.last_name}</p>
                                <p className="text-[10px] text-slate-400">{p.email}</p>
                              </div>
                              <span className="text-[10px] font-bold text-[#0073ea]">Select →</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedPatient && (
                        <div className="mt-2 p-2.5 rounded-xl bg-[#0073ea]/10 border border-[#0073ea]/30 flex items-center justify-between">
                          <span className="font-bold text-[#0073ea]">Patient: {selectedPatient.name}</span>
                          <button
                            type="button"
                            onClick={() => { setSelectedPatient(null); setSearchPatient(""); }}
                            className="text-[10px] font-bold text-rose-500 hover:underline"
                          >
                            Change
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Prescribed Medication Items */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#676879] uppercase">
                          2. Medications to Prescribe ({medicationItems.length} item{medicationItems.length > 1 ? 's' : ''})
                        </label>
                        <button
                          type="button"
                          onClick={handleAddMedication}
                          className="px-3 py-1 rounded-full bg-[#0073ea]/10 hover:bg-[#0073ea] hover:text-white text-[#0073ea] font-extrabold text-[11px] transition-all flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Add Another Medication
                        </button>
                      </div>

                      {medicationItems.map((item, idx) => (
                        <div key={item.id} className="p-4 rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-950/60 space-y-3 relative">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-md bg-[#0073ea] text-white font-black text-[10px]">
                              Medication #{idx + 1}
                            </span>
                            {medicationItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMedication(item.id)}
                                className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                title="Remove medication"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 dark:text-slate-300">Medication Name *</label>
                            <input
                              className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
                              placeholder="e.g. Amoxicillin 500mg"
                              value={item.medication_name}
                              onChange={(e) => {
                                handleUpdateMedication(item.id, "medication_name", e.target.value);
                              }}
                              onBlur={runSafetyChecks}
                              list={`drug-list-${item.id}`}
                            />
                            <datalist id={`drug-list-${item.id}`}>
                              {COMMON_DRUGS.map((d) => (
                                <option key={d} value={d} />
                              ))}
                            </datalist>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="font-bold text-slate-700 dark:text-slate-300">Dosage / Frequency *</label>
                              <input
                                className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
                                placeholder="1 tablet 2x daily"
                                value={item.dosage}
                                onChange={(e) => handleUpdateMedication(item.id, "dosage", e.target.value)}
                                list={`dosage-list-${item.id}`}
                              />
                              <datalist id={`dosage-list-${item.id}`}>
                                {COMMON_DOSAGES.map((d) => (
                                  <option key={d} value={d} />
                                ))}
                              </datalist>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="font-bold text-slate-700 dark:text-slate-300">Quantity</label>
                                <input
                                  type="number"
                                  min={1}
                                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateMedication(item.id, "quantity", parseInt(e.target.value) || 1)}
                                />
                              </div>
                              <div>
                                <label className="font-bold text-slate-700 dark:text-slate-300">Days</label>
                                <input
                                  type="number"
                                  min={1}
                                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
                                  value={item.duration_days}
                                  onChange={(e) => handleUpdateMedication(item.id, "duration_days", parseInt(e.target.value) || 1)}
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 dark:text-slate-300">Instructions *</label>
                            <input
                              className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
                              placeholder="e.g. Take with a glass of water after food"
                              value={item.instructions}
                              onChange={(e) => handleUpdateMedication(item.id, "instructions", e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Drug Interaction Alerts */}
                    {interactionAlerts.length > 0 && (
                      <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 space-y-1">
                        <div className="flex items-center gap-2 font-bold">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <span>Multi-Drug Interaction Warning</span>
                        </div>
                        {interactionAlerts.map((alert, i) => (
                          <p key={i} className="text-[11px] pl-6">• {alert}</p>
                        ))}
                      </div>
                    )}

                    {/* Overall Notes */}
                    <div>
                      <label className="font-bold text-[#676879] uppercase">3. Clinical Notes / Remarks</label>
                      <textarea
                        rows={2}
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-950 font-medium"
                        placeholder="Additional notes, diagnosis or patient instructions..."
                        value={rxNotes}
                        onChange={(e) => setRxNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <DialogFooter className="mt-4">
                    <button
                      type="button"
                      onClick={() => setShowNewPrescription(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-[#f0f2f7]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleCreatePrescription}
                      className="px-5 py-2.5 rounded-xl bg-[#0073ea] hover:bg-[#0060c7] text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {isSubmitting ? "Processing..." : `Issue E-Prescription (${medicationItems.length} Meds)`}
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Filter controls */}
        <div className="max-w-[1500px] mx-auto mt-4 flex items-center justify-between gap-3 px-1">
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search medication, Rx number, or instructions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full border-2 border-[#e6e9ef] dark:border-slate-800 bg-[#f5f7fa] dark:bg-slate-900 text-xs font-medium focus:outline-none focus:border-[#0073ea] transition-all placeholder:text-slate-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-full border-2 border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-black text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#0073ea]"
          >
            <option value="all">All Prescriptions</option>
            <option value="active">Active / Filled</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Main Board Area */}
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6">
        {isLoading ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-[#e6e9ef] dark:border-slate-800 font-bold text-xs text-slate-400">
            Loading prescription board...
          </div>
        ) : (
          <div className="rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-[#0f172a] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00a86b] animate-pulse" />
                  <h2 className="font-extrabold text-sm text-white">Active E-Prescriptions &amp; Refills</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#0073ea] text-white">
                  {filteredPrescriptions.length} Records ({groupedOrders.length} Orders)
                </span>
              </div>
            </div>

            {filteredPrescriptions.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#676879] dark:text-slate-400">
                No prescription records found matching filter.
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="text-[11px] font-extrabold uppercase text-[#676879] dark:text-slate-400 border-b border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950">
                      <th className="py-2.5 px-4 w-[240px]">Medication Profile</th>
                      <th className="py-2.5 px-3 w-[140px] text-center">Status</th>
                      <th className="py-2.5 px-3 w-[180px]">Dosage &amp; Frequency</th>
                      <th className="py-2.5 px-3 w-[170px]">Prescriber / Patient</th>
                      <th className="py-2.5 px-3 w-[110px]">Refills Left</th>
                      <th className="py-2.5 px-3 w-[130px]">Prescribed Date</th>
                      <th className="py-2.5 px-3 w-[140px] text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800 text-xs">
                    {filteredPrescriptions.map((p: any) => (
                      <tr key={p.id} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60 transition-colors">
                        {/* Medication */}
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <Pill className="h-4 w-4 text-[#0073ea] flex-shrink-0" />
                            <span>{p.medication_name}</span>
                          </div>
                          {p.prescription_number && (
                            <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-500 mt-0.5">
                              {p.prescription_number}
                            </span>
                          )}
                          {p.instructions && (
                            <div className="text-[10px] text-[#676879] dark:text-slate-400 truncate max-w-[220px] mt-0.5">
                              {p.instructions}
                            </div>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3 text-center">
                          {getStatusPill(p.status || "active")}
                        </td>

                        {/* Dosage */}
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          <div>{p.dosage}</div>
                          <div className="text-[10px] text-slate-400">Qty: {p.quantity || 1} • {p.duration_days ? `${p.duration_days} days` : "As directed"}</div>
                        </td>

                        {/* Prescriber/Patient */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {isProvider
                              ? `${p.patient?.first_name || ""} ${p.patient?.last_name || ""}`.trim() || "Patient"
                              : `Dr. ${p.provider?.first_name || ""} ${p.provider?.last_name || ""}`.trim() || "Attending Provider"
                            }
                          </div>
                        </td>

                        {/* Refills */}
                        <td className="py-3 px-3 font-mono font-bold text-center">
                          <span className="px-2 py-0.5 rounded bg-[#f0f2f7] dark:bg-slate-800">
                            {p.refills_remaining || 0} left
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {new Date(p.prescribed_date).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                // Find all medications in this prescription batch if part of a group
                                const batchItems = p.prescription_number
                                  ? prescriptions.filter((item: any) => item.prescription_number === p.prescription_number)
                                  : [p];
                                handlePrintSlip(batchItems);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#f0f4ff] dark:bg-slate-800 hover:bg-[#0073ea] hover:text-white text-[#0073ea] dark:text-blue-400 text-[11px] font-black transition-all active:scale-95 flex items-center gap-1"
                              title="Print full official multi-drug prescription"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>Print Slip</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Prescriptions;

