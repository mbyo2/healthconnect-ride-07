import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  FileText,
  AlertTriangle,
  Search,
  HeartPulse,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HubPatient {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  admissionStatus?: string;
  lastVisit?: string | null;
  condition?: string;
  allergies: string[];
}

interface HubAllergy {
  allergen_name: string;
  severity?: string | null;
}

/**
 * Central patient directory for a facility — everyone listed comes from
 * real admissions and appointments. Allergies load per selected patient
 * from patient_allergies. Registration happens on the Patient Registration
 * page, never as local-only rows.
 */
export const UnifiedPatientHub: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<HubPatient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [allergies, setAllergies] = useState<HubAllergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!institutionId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [admRes, personnelRes] = await Promise.all([
          supabase
            .from("hospital_admissions")
            .select("patient_id, status, admission_date, diagnosis")
            .eq("hospital_id", institutionId),
          supabase
            .from("institution_personnel")
            .select("user_id")
            .eq("institution_id", institutionId),
        ]);
        if (admRes.error) throw admRes.error;

        const providerIds = (personnelRes.data || []).map((p: any) => p.user_id).filter(Boolean);
        let appointments: any[] = [];
        if (providerIds.length > 0) {
          const { data, error } = await supabase
            .from("appointments")
            .select("patient_id, date, status, type")
            .in("provider_id", providerIds);
          if (error) throw error;
          appointments = data || [];
        }

        const patientIds = new Set<string>([
          ...((admRes.data as any[]) || []).map((a) => a.patient_id).filter(Boolean),
          ...appointments.map((a) => a.patient_id).filter(Boolean),
        ]);
        if (patientIds.size === 0) {
          setPatients([]);
          return;
        }

        const { data: profiles, error: profErr } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, phone")
          .in("id", Array.from(patientIds));
        if (profErr) throw profErr;

        const admissions = ((admRes.data as any[]) || []);
        setPatients(
          ((profiles as any[]) || []).map((profile: any) => {
            const admission = admissions.find((a) => a.patient_id === profile.id);
            const patientAppts = appointments.filter((a) => a.patient_id === profile.id);
            const lastAppt = [...patientAppts].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )[0];
            return {
              id: profile.id,
              name:
                `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
                profile.email ||
                "Patient",
              email: profile.email,
              phone: profile.phone,
              status: admission?.status === "admitted" ? "Admitted" : "Outpatient",
              admissionStatus: admission?.status,
              lastVisit: admission ? admission.admission_date : lastAppt?.date,
              condition: admission?.diagnosis || lastAppt?.type || "—",
              allergies: [],
            };
          })
        );
      } catch (error) {
        console.error("Error fetching facility patients:", error);
        toast.error("Failed to load patients");
      } finally {
        setLoading(false);
      }
    })();
  }, [institutionId]);

  // Load documented allergies for the selected patient only.
  useEffect(() => {
    if (!selectedId) {
      setAllergies([]);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from("patient_allergies")
          .select("allergen_name, severity")
          .eq("patient_id", selectedId)
          .eq("is_active", true);
        if (error) throw error;
        setAllergies((data as any[]) || []);
      } catch (error) {
        console.error("Error fetching allergies:", error);
        setAllergies([]);
      }
    })();
  }, [selectedId]);

  if (!institutionId) {
    return (
      <div className="p-8 rounded-3xl border border-dashed text-center text-sm text-muted-foreground">
        Patient directory needs an institution context — open this from a facility dashboard.
      </div>
    );
  }

  const filteredPatients = patients.filter((p) =>
    `${p.name} ${p.email || ""} ${p.phone || ""}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selected = patients.find((p) => p.id === selectedId) || null;

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-primary-500 via-slate-900 to-slate-800 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">Central Patient Management &amp; Demographics Hub</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950">
                Live Registry
              </span>
            </div>
            <p className="text-xs text-blue-100 font-medium">
              {patients.length} patient{patients.length === 1 ? "" : "s"} from admissions &amp; appointments
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/patient-registration")}
          className="px-4 py-2 rounded-xl bg-white text-slate-900 font-extrabold text-xs flex items-center gap-1.5 shadow-sm hover:bg-slate-100 transition-all"
        >
          <UserPlus className="h-4 w-4" /> Register New Patient
        </button>
      </div>

      {/* Main Grid: Directory + Patient Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Directory */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
            <input
              type="search"
              aria-label="Search patients by name, email, or phone"
              placeholder="Search by name, email, phone…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
            {loading ? (
              <div className="space-y-2" role="status" aria-label="Loading patients">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" aria-hidden />
                ))}
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed text-center">
                <p className="font-bold text-sm">
                  {patients.length === 0 ? "No patients yet" : "No matches found"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {patients.length === 0
                    ? "Admit or book patients to build this directory."
                    : "Try a different search term."}
                </p>
              </div>
            ) : (
              filteredPatients.map((p) => {
                const isSelected = p.id === selectedId;
                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`View ${p.name}`}
                    onClick={() => setSelectedId(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(p.id);
                      }
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary-500/10 border-primary-500 shadow-xs"
                        : "bg-white dark:bg-slate-900 border-canvas-silk dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[10px] text-primary-500">{p.status}</span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Last visit: {p.lastVisit ? new Date(p.lastVisit).toLocaleDateString() : "—"}
                      </span>
                    </div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 mt-1">{p.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="truncate">{p.condition}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 7 Cols: Detailed Dossier */}
        <div className="lg:col-span-7 p-6 rounded-3xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-6 text-xs">
          {!selected ? (
            <div className="py-12 text-center">
              <Users className="h-8 w-8 mx-auto text-slate-400 mb-2" aria-hidden />
              <p className="font-bold text-sm">Select a patient</p>
              <p className="text-xs text-muted-foreground mt-1">Choose a patient from the directory to see their dossier.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-canvas-silk dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{selected.name}</h3>
                  <p className="text-slate-400">
                    {selected.status}
                    {selected.email ? ` · ${selected.email}` : ""}
                    {selected.phone ? ` · ${selected.phone}` : ""}
                  </p>
                </div>
              </div>

              {/* Clinical Alerts / Allergies — documented records only */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                  <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Documented Allergies
                  </span>
                  <div className="mt-1 font-bold text-rose-900 dark:text-rose-200">
                    {allergies.length === 0
                      ? "None documented"
                      : allergies.map((a) => a.allergen_name).join(", ")}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
                  <span className="text-[10px] font-black uppercase text-primary-500 flex items-center gap-1">
                    <HeartPulse className="h-3.5 w-3.5" aria-hidden /> Current Context
                  </span>
                  <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">
                    {selected.condition || "—"}
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 uppercase text-[11px]">
                    Clinical Documents
                  </span>
                  <button
                    onClick={() => navigate("/medical-records")}
                    className="px-3 py-1 rounded-lg border border-graphite-300 dark:border-slate-700 text-[11px] font-bold hover:bg-canvas-mist dark:hover:bg-slate-800 flex items-center gap-1"
                  >
                    <FileText className="h-3 w-3" aria-hidden /> Open Medical Records
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Documents live in Medical Records — lab results, prescriptions and imaging filed under this
                  patient appear there.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedPatientHub;
