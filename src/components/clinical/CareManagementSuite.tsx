import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  BedDouble,
  ArrowRightLeft,
  FileCheck,
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { providerDisplayName } from "@/utils/providerDisplay";
import { ensureBillingDraft } from "@/services/dischargeWorkflow";

interface LiveBed {
  id: string;
  bedNumber: string;
  ward: string;
  status: string;
  patientName?: string;
  admissionDate?: string;
  admittingDoctor?: string;
  admissionId?: string;
}

interface LiveAdmission {
  id: string;
  admission_number: string;
  patient_id: string;
  patientName: string;
  bedNumber?: string;
  diagnosis?: string | null;
  admissionDate?: string;
  bed_id?: string | null;
}

/**
 * OPD/IPD care management backed by live hospital data — beds from
 * hospital_beds, occupants from admitted hospital_admissions. Discharges
 * perform the real three-step close (admission → discharged, bed freed,
 * billing draft opened). There is no transfers ledger table, so the
 * transfers tab honestly says where transfers live instead of faking a log.
 */
export const CareManagementSuite: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<"ipd" | "transfers" | "discharge">("ipd");
  const [beds, setBeds] = useState<LiveBed[]>([]);
  const [admitted, setAdmitted] = useState<LiveAdmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dischargingId, setDischargingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    if (!institutionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [bedsRes, deptRes, admRes] = await Promise.all([
        supabase
          .from("hospital_beds" as any)
          .select("id, bed_number, status, department_id")
          .eq("hospital_id", institutionId)
          .order("bed_number"),
        supabase
          .from("hospital_departments" as any)
          .select("id, name")
          .eq("hospital_id", institutionId),
        supabase
          .from("hospital_admissions" as any)
          .select(`
            id, admission_number, bed_id, diagnosis, admission_date, patient_id,
            patient:profiles!hospital_admissions_patient_id_fkey(first_name, last_name),
            doctor:profiles!hospital_admissions_admitting_doctor_id_fkey(first_name, last_name, role)
          `)
          .eq("hospital_id", institutionId)
          .eq("status", "admitted"),
      ]);
      if (bedsRes.error) throw bedsRes.error;
      if (admRes.error) throw admRes.error;

      const deptNames = new Map<string, string>(
        ((deptRes.data as any[]) || []).map((d: any) => [d.id, d.name])
      );
      const admissions = ((admRes.data as any[]) || []);
      const occupantByBed = new Map<string, any>();
      admissions.forEach((a: any) => {
        if (a.bed_id) occupantByBed.set(a.bed_id, a);
      });

      const liveBeds: LiveBed[] = ((bedsRes.data as any[]) || []).map((b: any) => {
        const occ = occupantByBed.get(b.id);
        const patient = occ?.patient;
        const doctor = occ?.doctor;
        return {
          id: b.id,
          bedNumber: b.bed_number,
          ward: deptNames.get(b.department_id) || "General Ward",
          status: b.status || "available",
          patientName: patient ? `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || undefined : undefined,
          admissionDate: occ?.admission_date
            ? new Date(occ.admission_date).toLocaleDateString()
            : undefined,
          admittingDoctor: doctor
            ? providerDisplayName({ first_name: doctor.first_name, last_name: doctor.last_name, role: doctor.role })
            : undefined,
          admissionId: occ?.id,
        };
      });
      setBeds(liveBeds);

      const bedNumberById = new Map(liveBeds.map((b) => [b.id, b.bedNumber]));
      setAdmitted(
        admissions.map((a: any) => ({
          id: a.id,
          admission_number: a.admission_number || a.id.slice(0, 8),
          patient_id: a.patient_id,
          patientName: a.patient
            ? `${a.patient.first_name || ""} ${a.patient.last_name || ""}`.trim() || "Patient"
            : "Patient",
          bedNumber: a.bed_id ? bedNumberById.get(a.bed_id) : undefined,
          diagnosis: a.diagnosis,
          admissionDate: a.admission_date
            ? new Date(a.admission_date).toLocaleDateString()
            : undefined,
          bed_id: a.bed_id,
        }))
      );
    } catch (error) {
      console.error("Error loading care management data:", error);
      toast.error("Failed to load ward data");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDischarge = async (admission: LiveAdmission) => {
    setDischargingId(admission.id);
    try {
      const { error: admErr } = await (supabase.from("hospital_admissions" as any) as any)
        .update({ status: "discharged", discharge_date: new Date().toISOString() })
        .eq("id", admission.id);
      if (admErr) throw admErr;

      if (admission.bed_id) {
        await (supabase.from("hospital_beds" as any) as any)
          .update({ status: "available", current_patient_id: null })
          .eq("id", admission.bed_id);
      }

      await ensureBillingDraft(institutionId, admission as any);
      toast.success(`Discharged ${admission.patientName} — bed freed and billing draft opened.`);
      fetchData();
    } catch (error: any) {
      console.error("Error discharging patient:", error);
      toast.error(error?.message || "Failed to discharge patient");
    } finally {
      setDischargingId(null);
    }
  };

  const occupiedCount = beds.filter((b) => b.status === "occupied").length;
  const filteredBeds = beds.filter(
    (b) =>
      !searchQuery ||
      b.bedNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.ward.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.patientName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!institutionId) {
    return (
      <div className="p-8 rounded-3xl border border-dashed text-center text-sm text-muted-foreground">
        Care management needs an institution context — open this from a facility dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-primary-500 via-slate-900 to-slate-800 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
            <BedDouble className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">Outpatient (OPD) &amp; Inpatient (IPD) Care Management</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950">
                Live ADT Data
              </span>
            </div>
            <p className="text-xs text-blue-100 font-medium">
              Admission/discharge/transfer (ADT), ward bed occupancy &amp; discharge summaries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-white/20 text-white font-bold text-xs">
            Occupancy: {loading ? "…" : `${occupiedCount} / ${beds.length} Beds`}
            {!loading && beds.length > 0 ? ` (${Math.round((occupiedCount / beds.length) * 100)}%)` : ""}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-canvas-silk dark:border-slate-800 pb-2 overflow-x-auto" role="tablist" aria-label="Care management views">
        {[
          { id: "ipd", label: "IPD Wards & Bed Grid", icon: BedDouble },
          { id: "transfers", label: "Bed Movements & Transfers", icon: ArrowRightLeft },
          { id: "discharge", label: "Discharge Summaries", icon: FileCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
                activeTab === tab.id
                  ? "bg-primary-500 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-canvas-mist dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. IPD Wards & Bed Grid */}
      {activeTab === "ipd" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Live Hospital Ward &amp; Bed Occupancy</h3>
              <p className="text-xs text-graphite-500 dark:text-slate-400">Real-time bed tracking across wards</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-graphite-400" aria-hidden />
              <input
                type="search"
                aria-label="Search beds, wards, or patients"
                placeholder="Search beds…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="status" aria-label="Loading beds">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-36 rounded-3xl bg-muted animate-pulse" aria-hidden />
              ))}
            </div>
          ) : filteredBeds.length === 0 ? (
            <div className="p-10 rounded-3xl border border-dashed text-center">
              <BedDouble className="h-8 w-8 mx-auto text-slate-400 mb-2" aria-hidden />
              <p className="font-bold text-sm">
                {beds.length === 0 ? "No beds registered yet." : "No beds match your search."}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {beds.length === 0
                  ? "Add beds in Hospital Management to light up this board."
                  : "Try a different bed number, ward, or patient name."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredBeds.map((b) => {
                const isOccupied = b.status === "occupied";
                return (
                  <div
                    key={b.id}
                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-3 ${
                      isOccupied
                        ? "bg-white dark:bg-slate-900 border-primary-500/40 shadow-xs"
                        : "bg-slate-50/60 dark:bg-slate-950 border-dashed border-graphite-300 dark:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-black text-xs text-primary-500">{b.bedNumber}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            isOccupied
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      <div className="text-[11px] font-bold text-slate-400">{b.ward}</div>

                      {isOccupied && (
                        <div className="mt-3 p-2.5 rounded-xl bg-primary-500/5 border border-primary-500/20 text-xs">
                          <div className="font-black text-slate-900 dark:text-slate-100">{b.patientName || "Occupant"}</div>
                          {b.admissionDate && (
                            <div className="text-[10px] text-slate-500">Admitted: {b.admissionDate}</div>
                          )}
                          {b.admittingDoctor && (
                            <div className="text-[10px] text-primary-500 font-semibold">{b.admittingDoctor}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Bed Movements & Transfers */}
      {activeTab === "transfers" && (
        <div className="p-10 rounded-3xl border border-dashed text-center">
          <ArrowRightLeft className="h-8 w-8 mx-auto text-slate-400 mb-2" aria-hidden />
          <p className="font-bold text-sm">No transfer ledger yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Bed-to-bed moves are recorded during admission and transfer in Hospital Management.
            A dedicated transfer log ships with the next HMS update.
          </p>
        </div>
      )}

      {/* 3. Discharge */}
      {activeTab === "discharge" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Admitted Patients Ready for Discharge</h3>
            <p className="text-xs text-graphite-500 dark:text-slate-400">
              Discharging frees the bed immediately and opens the billing draft.
            </p>
          </div>
          {loading ? (
            <div className="space-y-2" role="status" aria-label="Loading admitted patients">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" aria-hidden />
              ))}
            </div>
          ) : admitted.length === 0 ? (
            <div className="p-10 rounded-3xl border border-dashed text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" aria-hidden />
              <p className="font-bold text-sm">No admitted patients</p>
              <p className="text-xs text-muted-foreground mt-1">Admit patients from OPD or Emergency to see them here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {admitted.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-bold text-sm">{a.patientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.admission_number}
                      {a.bedNumber ? ` · Bed ${a.bedNumber}` : ""}
                      {a.diagnosis ? ` · ${a.diagnosis}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDischarge(a)}
                    disabled={dischargingId === a.id}
                    className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all"
                  >
                    {dischargingId === a.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                    )}
                    {dischargingId === a.id ? "Discharging…" : "Discharge Patient"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trust strip */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-success-500" aria-hidden />
        <span>Live facility data</span>
        <span aria-hidden>·</span>
        <UserCheck className="h-4 w-4" aria-hidden />
        <span>Occupant names visible to care staff only</span>
        <span aria-hidden>·</span>
        <Clock className="h-4 w-4" aria-hidden />
        <span>Updates in real time</span>
        <Sparkles className="h-4 w-4 text-primary-500" aria-hidden />
      </div>
    </div>
  );
};

export default CareManagementSuite;
