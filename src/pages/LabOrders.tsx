import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { LAB_ORDERING_ROLES } from "@/config/roleConfig";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { FlaskConical, Plus, ClipboardList, AlertTriangle } from "lucide-react";
import { EmptyState, LoadingSkeleton } from "@/components/shared";
import { createNotification } from "@/services/notifications";

const PRIORITIES = ["routine", "normal", "urgent", "emergency"] as const;
const SAMPLE_TYPES = ["blood", "urine", "stool", "sputum", "swab", "tissue", "other"] as const;

const statusStyle = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-success-50 text-success-600 border-success-200";
    case "cancelled":
      return "bg-error-50 text-error-500 border-error-200";
    case "sample_collected":
    case "in_progress":
      return "bg-warning-50 text-warning-600 border-warning-200";
    default:
      return "bg-primary-50 text-primary-600 border-primary-200";
  }
};

export const LabOrdersPage = () => {
  const { user } = useAuth();
  const { availableRoles } = useUserRoles();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"new" | "mine">("new");

  const [patientId, setPatientId] = useState("");
  const [labId, setLabId] = useState("");
  const [testName, setTestName] = useState("");
  const [priority, setPriority] = useState<string>("routine");
  const [sampleType, setSampleType] = useState<string>("blood");
  const [notes, setNotes] = useState("");

  const canOrder = availableRoles.some((r) => (LAB_ORDERING_ROLES as readonly string[]).includes(r));

  // Patients this clinician has appointments with (care-team readable).
  const { data: myPatients = [] } = useQuery({
    queryKey: ["lab-order-patients", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: appts } = await supabase
        .from("appointments")
        .select("patient_id")
        .eq("provider_id", user.id)
        .neq("status", "cancelled")
        .limit(500);
      const ids = [...new Set((appts || []).map((a: any) => a.patient_id).filter(Boolean))];
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", ids);
      return (profiles || []).sort((a: any, b: any) =>
        `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
      );
    },
    enabled: !!user && canOrder,
  });

  // Verified institutions that can receive lab orders.
  const { data: labs = [] } = useQuery({
    queryKey: ["lab-order-labs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("healthcare_institutions")
        .select("id, name, type")
        .eq("is_verified", true)
        .order("name")
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: canOrder,
  });

  // Test catalog.
  const { data: catalog = [] } = useQuery({
    queryKey: ["lab-order-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_test_catalog" as any)
        .select("id, name, category, price")
        .order("name");
      if (error) {
        console.error("Catalog load failed:", error);
        return [];
      }
      return (data || []) as any[];
    },
    enabled: canOrder,
  });

  // My orders with patient names + results.
  const { data: myOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["lab-my-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("lab_tests")
        .select("id, test_number, test_type, test_category, priority, status, sample_type, notes, result_summary, results_date, created_at, patient_id")
        .eq("ordered_by", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = data || [];
      const ids = [...new Set(rows.map((r: any) => r.patient_id).filter(Boolean))];
      let patientMap: Record<string, any> = {};
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", ids);
        patientMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
      }
      return rows.map((r: any) => ({ ...r, patient: patientMap[r.patient_id] || null }));
    },
    enabled: !!user && canOrder && tab === "mine",
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!patientId) throw new Error("Select the patient");
      if (!labId) throw new Error("Select the receiving lab");
      if (!testName) throw new Error("Select the test");
      const test = catalog.find((t: any) => t.name === testName);
      const { error } = await supabase.from("lab_tests").insert({
        lab_id: labId,
        patient_id: patientId,
        test_number: `LAB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        test_type: testName,
        test_category: test?.category || null,
        ordered_by: user.id,
        priority,
        status: "pending",
        sample_type: sampleType,
        notes: notes.trim() || null,
      });
      if (error) throw error;
      // Notify the patient that a lab test was ordered for them.
      await createNotification(
        patientId,
        "Lab test ordered",
        `Your clinician ordered a ${testName} test. Please visit the lab for sample collection.`,
        "appointment"
      ).catch(() => null);
    },
    onSuccess: () => {
      toast.success("Lab order sent");
      setPatientId("");
      setLabId("");
      setTestName("");
      setNotes("");
      setPriority("routine");
      setSampleType("blood");
      queryClient.invalidateQueries({ queryKey: ["lab-my-orders"] });
      setTab("mine");
    },
    onError: (e: any) => toast.error(e?.message || "Could not create the lab order"),
  });

  if (!canOrder) {
    return (
      <div className="min-h-screen bg-canvas p-6 flex items-center justify-center">
        <EmptyState
          icon={<AlertTriangle className="h-8 w-8" />}
          title="Lab ordering is not available for your role"
          description="Only doctors, specialists, medical licentiates, clinical officers, dentists and radiologists can order lab tests."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-midnight pb-16">
      <div className="bg-white dark:bg-slate-900 border-b border-canvas-silk px-4 sm:px-6 py-5 sticky top-0 z-30">
        <div className="max-w-content mx-auto flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary-500 text-white flex items-center justify-center">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight">Lab Orders</h1>
            <p className="text-sm text-graphite-500 font-medium">Order tests and track results</p>
          </div>
        </div>
        <div className="max-w-content mx-auto mt-4 flex gap-2">
          <button
            onClick={() => setTab("new")}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${tab === "new" ? "bg-primary-500 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            <Plus className="h-4 w-4" /> New order
          </button>
          <button
            onClick={() => setTab("mine")}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${tab === "mine" ? "bg-primary-500 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            <ClipboardList className="h-4 w-4" /> My orders
          </button>
        </div>
      </div>

      <div className="max-w-content mx-auto px-4 sm:px-6 py-6">
        {tab === "new" ? (
          <div className="rounded-3xl border border-canvas-silk bg-white p-6 shadow-sm space-y-4 max-w-2xl">
            <div>
              <label className="text-sm font-semibold block mb-1.5">Patient</label>
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full rounded-xl border border-canvas-silk px-3 py-2.5 text-sm bg-white">
                <option value="">Select a patient…</option>
                {myPatients.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                ))}
              </select>
              {myPatients.length === 0 && (
                <p className="text-xs text-graphite-500 mt-1">Patients appear here once you have appointments with them.</p>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1.5">Receiving lab</label>
              <select value={labId} onChange={(e) => setLabId(e.target.value)} className="w-full rounded-xl border border-canvas-silk px-3 py-2.5 text-sm bg-white">
                <option value="">Select a lab…</option>
                {labs.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}{l.type ? ` (${l.type})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1.5">Test</label>
              <select value={testName} onChange={(e) => setTestName(e.target.value)} className="w-full rounded-xl border border-canvas-silk px-3 py-2.5 text-sm bg-white">
                <option value="">Select a test…</option>
                {catalog.map((t: any) => (
                  <option key={t.id} value={t.name}>{t.name}{t.category ? ` — ${t.category}` : ""}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold block mb-1.5">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-xl border border-canvas-silk px-3 py-2.5 text-sm bg-white">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5">Sample type</label>
                <select value={sampleType} onChange={(e) => setSampleType(e.target.value)} className="w-full rounded-xl border border-canvas-silk px-3 py-2.5 text-sm bg-white">
                  {SAMPLE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1.5">Clinical notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Indication, relevant history…" className="w-full rounded-xl border border-canvas-silk px-3 py-2.5 text-sm" />
            </div>
            <button
              onClick={() => createOrder.mutate()}
              disabled={createOrder.isPending}
              className="vf-btn-primary gap-2 text-sm disabled:opacity-50"
            >
              {createOrder.isPending ? "Sending…" : "Send lab order"}
            </button>
          </div>
        ) : ordersLoading ? (
          <LoadingSkeleton />
        ) : myOrders.length === 0 ? (
          <EmptyState
            icon={<FlaskConical className="h-8 w-8" />}
            title="No lab orders yet"
            description="Orders you place will appear here with their results."
          />
        ) : (
          <div className="space-y-3">
            {myOrders.map((o: any) => (
              <div key={o.id} className="rounded-2xl border border-canvas-silk bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono font-bold text-sm">{o.test_number}</div>
                    <div className="font-semibold">{o.test_type}</div>
                    <div className="text-sm text-graphite-500">
                      {o.patient ? `${o.patient.first_name} ${o.patient.last_name}` : "Patient"} · {o.created_at ? format(parseISO(o.created_at), "MMM d, yyyy") : ""}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusStyle(o.status)}`}>
                    {(o.status || "pending").replace(/_/g, " ")}
                  </span>
                </div>
                {o.priority && o.priority !== "routine" && (
                  <div className="text-xs font-bold text-warning-600 mt-1 uppercase">Priority: {o.priority}</div>
                )}
                {o.result_summary && (
                  <div className="mt-3 rounded-xl bg-slate-50 border border-canvas-silk p-3">
                    <div className="text-xs font-black uppercase tracking-wider text-graphite-500 mb-1">
                      Result{o.results_date ? ` · ${format(parseISO(o.results_date), "MMM d, yyyy")}` : ""}
                    </div>
                    <div className="text-sm">{o.result_summary}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LabOrdersPage;
