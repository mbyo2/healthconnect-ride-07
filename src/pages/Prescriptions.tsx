import React, { useState, useMemo } from "react";
import { Pill, Calendar, User, Clock, Download, Plus, FileText, Search, ExternalLink, Filter, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const Prescriptions = () => {
  const { user } = useAuth();
  const { availableRoles } = useUserRoles();
  const queryClient = useQueryClient();
  const [showNewPrescription, setShowNewPrescription] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPatient, setSearchPatient] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [newRx, setNewRx] = useState({
    patient_id: "",
    medication_name: "",
    dosage: "",
    instructions: "",
    quantity: 1,
    duration_days: 7,
    refills_remaining: 0,
  });

  const isProvider = availableRoles.some((r) =>
    ["health_personnel", "doctor", "pharmacist", "pharmacy"].includes(r)
  );

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ["prescriptions", user?.id, isProvider],
    queryFn: async () => {
      if (!user) return [];
      const query = (supabase as any)
        .from("comprehensive_prescriptions")
        .select(`
          id, medication_name, dosage, duration_days, prescribed_date, status,
          refills_remaining, instructions, quantity, generic_name, strength,
          patient:profiles!comprehensive_prescriptions_patient_id_fkey(first_name, last_name),
          provider:profiles!comprehensive_prescriptions_provider_id_fkey(first_name, last_name)
        `)
        .order("prescribed_date", { ascending: false });

      if (isProvider) {
        query.eq("provider_id", user.id);
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

  const handleCreatePrescription = async () => {
    if (!user || !newRx.patient_id || !newRx.medication_name || !newRx.dosage || !newRx.instructions) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const { error } = await (supabase as any)
        .from("comprehensive_prescriptions")
        .insert({
          provider_id: user.id,
          patient_id: newRx.patient_id,
          medication_name: newRx.medication_name,
          dosage: newRx.dosage,
          instructions: newRx.instructions,
          quantity: newRx.quantity,
          duration_days: newRx.duration_days,
          refills_remaining: newRx.refills_remaining,
          status: "active",
        });

      if (error) throw error;
      toast.success("Prescription logged successfully");
      setShowNewPrescription(false);
      setNewRx({ patient_id: "", medication_name: "", dosage: "", instructions: "", quantity: 1, duration_days: 7, refills_remaining: 0 });
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
    } catch (error) {
      console.error("Error creating prescription:", error);
      toast.error("Failed to create prescription");
    }
  };

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((p: any) => {
      const matchSearch =
        p.medication_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.instructions || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "all" || (p.status || "active") === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [prescriptions, searchQuery, statusFilter]);

  const getStatusPill = (status: string) => {
    switch (status) {
      case "active":
      case "filled":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00c875]">Active / Filled</span>;
      case "expired":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#e2445c]">Expired</span>;
      case "pending":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#fdab3d]">Pending Rx</span>;
      default:
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#579bfc]">{status || "Dispatched"}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Monday Sticky Top Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center font-black text-sm shadow-xs">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                {isProvider ? "Prescription Operations Board" : "My Medication Prescriptions"}
                <span className="w-2 h-2 rounded-full bg-[#00c875] animate-ping" />
              </h1>
              <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
                {isProvider ? "Write digital prescriptions and route orders to pharmacy networks" : "Track dosage instructions, active refills, and digital prescriptions"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isProvider && (
              <Dialog open={showNewPrescription} onOpenChange={setShowNewPrescription}>
                <DialogTrigger asChild>
                  <button className="px-4 py-2 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95">
                    <Plus className="h-4 w-4" />
                    <span>Write Prescription</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800">
                  <DialogHeader>
                    <DialogTitle className="font-extrabold text-lg">Write E-Prescription</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-2 text-xs">
                    <div>
                      <label className="font-bold text-[#676879] uppercase">Search Patient *</label>
                      <input
                        className="w-full mt-1 px-3 py-2 rounded-md border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-950 font-medium"
                        placeholder="Search by name or email..."
                        value={searchPatient}
                        onChange={(e) => setSearchPatient(e.target.value)}
                      />
                      {patients.length > 0 && (
                        <div className="mt-1 border rounded-md max-h-32 overflow-y-auto bg-white dark:bg-slate-900">
                          {patients.map((p: any) => (
                            <button
                              key={p.id}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-[#f0f2f7] dark:hover:bg-slate-800 ${newRx.patient_id === p.id ? "bg-[#0073ea]/10 font-bold" : ""}`}
                              onClick={() => {
                                setNewRx((prev) => ({ ...prev, patient_id: p.id }));
                                setSearchPatient(`${p.first_name} ${p.last_name}`);
                              }}
                            >
                              {p.first_name} {p.last_name} ({p.email})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="font-bold text-[#676879] uppercase">Medication Name *</label>
                      <input
                        className="w-full mt-1 px-3 py-2 rounded-md border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-950 font-medium"
                        placeholder="e.g. Amoxicillin 500mg"
                        value={newRx.medication_name}
                        onChange={(e) => setNewRx((p) => ({ ...p, medication_name: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-bold text-[#676879] uppercase">Dosage *</label>
                        <input
                          className="w-full mt-1 px-3 py-2 rounded-md border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-950 font-medium"
                          placeholder="1 tab 3x daily"
                          value={newRx.dosage}
                          onChange={(e) => setNewRx((p) => ({ ...p, dosage: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="font-bold text-[#676879] uppercase">Quantity</label>
                        <input
                          type="number"
                          className="w-full mt-1 px-3 py-2 rounded-md border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-950 font-medium"
                          value={newRx.quantity}
                          onChange={(e) => setNewRx((p) => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-[#676879] uppercase">Instructions *</label>
                      <textarea
                        rows={2}
                        className="w-full mt-1 px-3 py-2 rounded-md border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-950 font-medium"
                        placeholder="Take with food after meals..."
                        value={newRx.instructions}
                        onChange={(e) => setNewRx((p) => ({ ...p, instructions: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <button
                      onClick={() => setShowNewPrescription(false)}
                      className="px-4 py-2 rounded-md text-xs font-bold text-slate-500 hover:bg-[#f0f2f7]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreatePrescription}
                      className="px-5 py-2 rounded-md bg-[#0073ea] text-white text-xs font-bold shadow-xs"
                    >
                      Issue E-Prescription
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Filter controls */}
        <div className="max-w-[1500px] mx-auto mt-3 flex items-center justify-between gap-3 px-1">
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search medication, dosage, or instructions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300"
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
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-[#e6e9ef] font-bold text-xs text-slate-400">
            Loading prescription board...
          </div>
        ) : (
          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-[#e5f0ff] dark:bg-blue-950/40 border-b border-[#e6e9ef] dark:border-slate-800 flex items-center justify-between border-l-4 border-l-[#0073ea]">
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm text-[#0073ea]">Active E-Prescriptions & Refills</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#0073ea] text-white">
                  {filteredPrescriptions.length} Records
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
                      <th className="py-2.5 px-4 w-[220px]">Medication Profile</th>
                      <th className="py-2.5 px-3 w-[140px] text-center">Status</th>
                      <th className="py-2.5 px-3 w-[180px]">Dosage & Frequency</th>
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
                          {p.instructions && (
                            <div className="text-[10px] text-[#676879] dark:text-slate-400 truncate max-w-[200px] mt-0.5">
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
                          <div className="text-[10px] text-slate-400">Duration: {p.duration_days ? `${p.duration_days} days` : "As directed"}</div>
                        </td>

                        {/* Prescriber/Patient */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {isProvider
                              ? `${p.patient?.first_name || ""} ${p.patient?.last_name || ""}`
                              : `Dr. ${p.provider?.first_name || ""} ${p.provider?.last_name || ""}`
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
                                const printWin = window.open("", "_blank");
                                if (printWin) {
                                  printWin.document.write(`
                                    <html>
                                      <head><title>Prescription - ${p.medication_name}</title></head>
                                      <body style="font-family: Arial, sans-serif; padding: 20px;">
                                        <h2>Doc' O Clock Official Prescription</h2>
                                        <hr />
                                        <p><strong>Medication:</strong> ${p.medication_name}</p>
                                        <p><strong>Dosage:</strong> ${p.dosage}</p>
                                        <p><strong>Instructions:</strong> ${p.instructions || 'As directed'}</p>
                                        <script>window.print();</script>
                                      </body>
                                    </html>
                                  `);
                                  printWin.document.close();
                                }
                              }}
                              className="px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-[#0073ea] hover:text-white text-slate-700 text-[11px] font-bold transition-colors"
                            >
                              <Download className="h-3 w-3 inline mr-1" />
                              PDF
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
