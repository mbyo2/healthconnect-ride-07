import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { useCurrency } from "@/hooks/use-currency";
import {
  FlaskConical, Search, Plus, Clock, CheckCircle2, AlertCircle, FileText, Microscope, Loader2, Pencil, Trash2
} from "lucide-react";
import { LabRequest } from "@/types/lab";
import { toast } from "sonner";
import { InstitutionInsuranceVerification } from "@/components/institution/InstitutionInsuranceVerification";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { dispatchNotification } from "@/hooks/useNotifications";
import { providerDisplayName } from "@/utils/providerDisplay";

const LabManagement = () => {
  const { user } = useAuth();
  const { institutionId: contextInstitutionId } = useInstitutionContext();
  const { formatPrice } = useCurrency();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);
  const [resultSummary, setResultSummary] = useState("");
  const [isCritical, setIsCritical] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [selectedTestType, setSelectedTestType] = useState("");
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"requests" | "results" | "catalog">("requests");
  const queryClient = useQueryClient();

  // ── Diagnostic catalog management (lab manager workflow) ──
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [editingTest, setEditingTest] = useState<any | null>(null);
  const [testForm, setTestForm] = useState({ name: "", category: "Hematology", description: "", price: "" });
  const [savingTest, setSavingTest] = useState(false);
  const [testToDelete, setTestToDelete] = useState<any | null>(null);
  const [deletingTest, setDeletingTest] = useState(false);

  const openNewTestDialog = () => {
    setEditingTest(null);
    setTestForm({ name: "", category: "Hematology", description: "", price: "" });
    setShowTestDialog(true);
  };

  const openEditTestDialog = (test: any) => {
    setEditingTest(test);
    setTestForm({
      name: test.name || "",
      category: test.category || "Hematology",
      description: test.description || "",
      price: test.price != null ? String(test.price) : "",
    });
    setShowTestDialog(true);
  };

  const saveTest = async () => {
    if (!testForm.name.trim()) {
      toast.error("Enter the test name");
      return;
    }
    const price = parseFloat(testForm.price);
    if (isNaN(price) || price < 0) {
      toast.error("Enter a valid price in ZMW");
      return;
    }
    setSavingTest(true);
    try {
      const payload = {
        name: testForm.name.trim(),
        category: testForm.category,
        description: testForm.description.trim() || null,
        price,
      };
      let error;
      if (editingTest?.id) {
        ({ error } = await (supabase as any).from("lab_test_catalog").update(payload).eq("id", editingTest.id));
      } else {
        ({ error } = await (supabase as any).from("lab_test_catalog").insert(payload));
      }
      if (error) throw error;
      toast.success(editingTest ? "Test updated" : "Test added to catalog");
      setShowTestDialog(false);
      queryClient.invalidateQueries({ queryKey: ["lab-test-catalog"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to save test");
    } finally {
      setSavingTest(false);
    }
  };

  const deleteTest = async () => {
    if (!testToDelete) return;
    setDeletingTest(true);
    try {
      const { error } = await (supabase as any).from("lab_test_catalog").delete().eq("id", testToDelete.id);
      if (error) throw error;
      toast.success("Test removed from catalog");
      queryClient.invalidateQueries({ queryKey: ["lab-test-catalog"] });
      setTestToDelete(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to remove test");
    } finally {
      setDeletingTest(false);
    }
  };

  const { data: requests } = useQuery({
    queryKey: ["lab-requests"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("lab_tests")
          .select("*, patient:profiles!patient_id(first_name, last_name), provider:profiles!ordered_by(first_name, last_name, role)")
          .order("created_at", { ascending: false })
          .limit(500);

        if (error) throw error;
        return data as any[];
      } catch (e) {
        console.error("Error fetching lab requests:", e);
        return [];
      }
    },
  });

  const { data: patients } = useQuery({
    queryKey: ["lab-patients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("role", "patient")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const { data: testCatalog = [] } = useQuery({
    queryKey: ["lab-test-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_test_catalog" as any).select("*").order("name");
      if (error) {
        console.error("Error fetching lab test catalog:", error);
        return [];
      }
      return data as any[];
    },
  });

  const submitResult = async () => {
    if (!selectedRequest || !resultSummary.trim()) {
      toast.error("Enter the result summary before submitting");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("lab_tests")
        .update({
          result_summary: resultSummary,
          status: "completed",
          results_date: new Date().toISOString(),
          performed_by: user?.id ?? null,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      const isUrgent = isCritical || ["stat", "critical", "urgent"].includes(((selectedRequest as any).priority || "").toLowerCase());
      const patientName = (selectedRequest as any).patient
        ? `${(selectedRequest as any).patient.first_name ?? ""} ${(selectedRequest as any).patient.last_name ?? ""}`.trim()
        : "Unknown Patient";

      // The lab_results push and the institution resolution are independent — run together.
      await Promise.all([
        (async () => {
          try {
            await supabase.from("lab_results").insert({
              request_id: selectedRequest.id,
              patient_id: (selectedRequest as any).patient_id,
              technician_id: user?.id ?? null,
              test_name: (selectedRequest as any).test_type || "Lab Test",
              test_date: new Date().toISOString().split("T")[0],
              result_value: resultSummary,
              is_abnormal: isCritical,
              comments: isUrgent ? `CRITICAL — requires immediate review` : "Pending pathologist review",
            });
          } catch (e) { console.error("lab_results push failed", e); }
        })(),
        (async () => {
          try {
            let institutionId: string | undefined = contextInstitutionId || undefined;
            if (!institutionId) {
              const { data: staffRow } = await supabase
                .from("institution_staff")
                .select("institution_id")
                .eq("provider_id", user?.id ?? "")
                .eq("is_active", true)
                .limit(1)
                .maybeSingle();
              institutionId = staffRow?.institution_id;
            }
            if (institutionId) {
              await (supabase.from("pathologist_reviews" as any) as any).insert({
                institution_id: institutionId,
                patient_name: patientName,
                test_name: (selectedRequest as any).test_type || "Lab Test",
                result_value: resultSummary,
                lab_tech_id: user?.id ?? null,
                lab_tech_name: user?.email ?? null,
                status: isUrgent ? "urgent_review" : "pending_review",
              });
            }
          } catch (e) { console.error("pathologist queue push failed", e); }
        })(),
      ]);

      if (isUrgent) {
        const patientId = (selectedRequest as any).patient_id;
        const orderingId = (selectedRequest as any).ordered_by;
        const testName = (selectedRequest as any).test_type || "Lab Test";
        const title = "⚠️ Critical Lab Result";
        const message = `${testName}: ${resultSummary}. Please review immediately.`;
        if (patientId) {
          dispatchNotification({ userId: patientId, title: "New lab result available", message: `Your ${testName} result is ready. Open the app for details.`, category: "lab", link: "/medical-records" });
        }
        if (orderingId && orderingId !== user?.id) {
          dispatchNotification({ userId: orderingId, title, message, category: "lab", channels: ["push", "sms", "email"] });
        }
      }

      toast.success(isUrgent ? "⚠️ Critical result submitted — clinicians notified" : "Results submitted & sent for pathologist review");
      setSelectedRequest(null);
      setResultSummary("");
      setIsCritical(false);
      queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
    } catch (error) {
      console.error("Error submitting results:", error);
      toast.error("Failed to submit results");
    } finally {
      setIsSubmitting(false);
    }
  };

  const createRequest = async () => {
    if (!selectedPatientId || !selectedTestType || !user) return;
    setIsSubmitting(true);
    try {
      // lab_tests.lab_id is NOT NULL REFERENCES healthcare_institutions(id) —
      // resolve the lab/facility the signed-in user belongs to, never the user id.
      let labInstitutionId: string | null = contextInstitutionId || null;
      if (!labInstitutionId) {
        const { data: staffRow } = await supabase
          .from("institution_staff")
          .select("institution_id")
          .eq("provider_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        labInstitutionId = staffRow?.institution_id ?? null;
      }
      if (!labInstitutionId) {
        toast.error("Your account isn't linked to a lab yet — ask your facility admin to add you as staff first.");
        return;
      }

      const test = testCatalog.find((t) => t.name === selectedTestType);
      const total = test?.price || 0;
      let balance = total;
      let insuranceClaimId = null;

      if (selectedVerification) {
        const coverage = selectedVerification.coverage_percentage || 0;
        const coveredAmount = (total * coverage) / 100;
        balance = total - coveredAmount;
        insuranceClaimId = selectedVerification.id;
      }

      const { error } = await supabase.from("lab_tests").insert({
        patient_id: selectedPatientId,
        ordered_by: user.id,
        lab_id: labInstitutionId,
        test_type: selectedTestType,
        test_number: `LAB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: "pending",
        price: total,
        total_amount: total,
        balance: balance,
        insurance_claim_id: insuranceClaimId,
        payment_status: balance === 0 ? "paid" : "pending",
      });

      if (error) throw error;
      toast.success("Lab request created successfully");
      setShowNewRequestDialog(false);
      setSelectedPatientId("");
      setPatientSearchTerm("");
      setSelectedTestType("");
      setSelectedVerification(null);
      queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
    } catch (error) {
      console.error("Error creating lab request:", error);
      toast.error("Failed to create lab request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const collectSample = async (request: any) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("lab_tests")
        .update({ status: "sample_collected", sample_collected_at: new Date().toISOString() })
        .eq("id", request.id);
      if (error) throw error;
      toast.success("Sample collected");
      queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to record sample collection");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startAnalysis = async (request: any) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("lab_tests")
        .update({ status: "in_progress" })
        .eq("id", request.id);
      if (error) throw error;
      toast.success("Sample moved to analysis");
      queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to start analysis");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const inProgressRequests = requests?.filter((r) => r.status === "in_progress") || [];
  const completedRequests = requests?.filter((r) => r.status === "completed") || [];

  const getStatusPill = (status: string) => {
    switch (status) {
      case "pending": return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-warning-500">Pending</span>;
      case "sample_collected": return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-teal-500">Sample Collected</span>;
      case "in_progress": return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-primary-500">In Progress</span>;
      case "completed": return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-success-500">Completed</span>;
      case "cancelled": return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-error-500">Cancelled</span>;
      default: return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-graphite-500 dark:bg-slate-600">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-canvas dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Sticky Monday Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-canvas-silk dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center font-black text-sm shadow-xs">
              <Microscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                Pathology & Diagnostics Laboratory Board
                <span className="w-2 h-2 rounded-full bg-success-500 animate-ping" />
              </h1>
              <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">
                Specimen telemetry, pathologist review queues, and automatic critical-result alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
              <DialogTrigger asChild>
                <button className="px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span>New Test Request</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-white border border-canvas-silk dark:border-slate-800">
                <DialogHeader>
                  <DialogTitle className="font-extrabold text-base">Create New Lab Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 text-xs">
                  <div>
                    <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Patient</label>
                    <input
                      placeholder="Search patient name..."
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                      className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-medium"
                    />
                    {patientSearchTerm && !selectedPatientId && (
                      <div className="max-h-32 overflow-y-auto border border-canvas-silk rounded-md bg-white mt-1 shadow-xs">
                        {patients
                          ?.filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(patientSearchTerm.toLowerCase()))
                          .map((p) => (
                            <div
                              key={p.id}
                              className="p-2 text-xs font-bold hover:bg-canvas-mist dark:hover:bg-slate-800 cursor-pointer"
                              onClick={() => {
                                setSelectedPatientId(p.id);
                                setPatientSearchTerm(`${p.first_name} ${p.last_name}`);
                              }}
                            >
                              {p.first_name} {p.last_name}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Test Type</label>
                    <Select value={selectedTestType} onValueChange={setSelectedTestType}>
                      <SelectTrigger className="mt-1 border border-graphite-300 dark:border-slate-700 font-bold text-xs">
                        <SelectValue placeholder="Select test type" />
                      </SelectTrigger>
                      <SelectContent>
                        {testCatalog.map((test) => (
                          <SelectItem key={test.id} value={test.name}>
                            {test.name} ({formatPrice(test.price)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedPatientId && (
                    <div className="space-y-2">
                      <InstitutionInsuranceVerification patientId={selectedPatientId} onVerified={(v) => setSelectedVerification(v)} />
                      {selectedVerification && (
                        <div className="p-2.5 rounded-lg bg-success-500/10 border border-success-500/30 text-success-500 font-bold text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Insurance Applied: {selectedVerification.coverage_percentage}% Covered</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <button onClick={() => setShowNewRequestDialog(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">
                    Cancel
                  </button>
                  <button onClick={createRequest} disabled={!selectedPatientId || !selectedTestType || isSubmitting} className="px-4 py-1.5 rounded-md bg-primary-500 text-white text-xs font-bold">
                    {isSubmitting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Create Request
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* View Selection Bar */}
        <div className="max-w-[1500px] mx-auto mt-4 px-4 sm:px-6 flex items-center gap-2" role="tablist" aria-label="Laboratory views">
          {[
            { id: "requests", label: "Lab Orders Queue" },
            { id: "results", label: "Results Entry" },
            { id: "catalog", label: "Diagnostic Catalog" },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === tab.id
                  ? "bg-primary-500 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 text-graphite-500 dark:text-slate-400 hover:bg-canvas-mist dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Pending Orders</span>
              <Clock className="h-5 w-5 text-warning-500" />
            </div>
            <div className="text-2xl font-black font-mono text-warning-500">{pendingRequests.length}</div>
            <div className="text-[10px] text-graphite-500 dark:text-slate-400 font-bold mt-0.5">Awaiting sample processing</div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-graphite-500 dark:text-slate-400 uppercase">In Analysis</span>
              <FlaskConical className="h-5 w-5 text-primary-500" />
            </div>
            <div className="text-2xl font-black font-mono text-primary-500">{inProgressRequests.length}</div>
            <div className="text-[10px] text-graphite-500 dark:text-slate-400 font-bold mt-0.5">Currently on bench</div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Completed Today</span>
              <CheckCircle2 className="h-5 w-5 text-success-500" />
            </div>
            <div className="text-2xl font-black font-mono text-success-500">
              {completedRequests.filter((r) => new Date(r.updated_at).toDateString() === new Date().toDateString()).length}
            </div>
            <div className="text-[10px] text-graphite-500 dark:text-slate-400 font-bold mt-0.5">Signed off & released</div>
          </div>
        </div>

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-canvas-silk dark:border-slate-800 pb-3">
              <h2 className="font-extrabold text-sm flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary-500" /> Active Pathology Orders
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient or test name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="w-full overflow-x-auto rounded-xl border border-canvas-silk dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-canvas-silk bg-canvas text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                    <th className="py-2.5 px-4">Test Number</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Test Requested</th>
                    <th className="py-2.5 px-3">Ordering Provider</th>
                    <th className="py-2.5 px-3 text-center">Priority</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-silk">
                  {requests
                    ?.filter(
                      (r) =>
                        r.patient?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.test_type?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((request) => (
                      <tr key={request.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{request.test_number || "LAB-SYS"}</td>
                        <td className="py-3 px-3 font-bold text-primary-500">
                          {request.patient?.first_name} {request.patient?.last_name}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">{request.test_type || request.test?.name}</td>
                        <td className="py-3 px-3 text-graphite-500 dark:text-slate-400">{request.provider?.last_name ? providerDisplayName({ first_name: request.provider?.first_name, last_name: request.provider?.last_name, role: (request.provider as any)?.role }) : "Staff"}</td>
                        <td className="py-3 px-3 text-center">
                          {request.priority === "urgent" || request.priority === "stat" ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-error-500 flex items-center gap-1 mx-auto w-fit">
                              <AlertCircle className="h-3 w-3" /> STAT
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-primary-400">Routine</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">{getStatusPill(request.status)}</td>
                        <td className="py-3 px-3 text-center">
                          {request.status === "pending" && (
                            <button
                              onClick={() => collectSample(request)}
                              disabled={isSubmitting}
                              className="px-3 py-1 rounded-md bg-primary-500 text-white text-[10px] font-extrabold disabled:opacity-50"
                            >
                              Collect Sample
                            </button>
                          )}
                          {request.status === "sample_collected" && (
                            <button
                              onClick={() => startAnalysis(request)}
                              disabled={isSubmitting}
                              className="px-3 py-1 rounded-md bg-teal-500 text-white text-[10px] font-extrabold disabled:opacity-50"
                            >
                              Start Analysis
                            </button>
                          )}
                          {request.status === "in_progress" && (
                            <button
                              onClick={() => { setSelectedRequest(request); setActiveTab("results"); }}
                              className="px-3 py-1 rounded-md bg-success-500 text-white text-[10px] font-extrabold"
                            >
                              Enter Result
                            </button>
                          )}
                          {request.status === "completed" && (
                            <button onClick={() => setSelectedRequest(request)} className="px-3 py-1 rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-bold">
                              View Results
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results Entry Tab */}
        {activeTab === "results" && (
          <div className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <h2 className="font-extrabold text-sm mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary-500" /> Pathologist Results Verification Entry
            </h2>
            {selectedRequest ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-primary-50 border border-primary-500/20 flex justify-between items-center">
                  <div>
                    <p className="font-extrabold text-sm text-primary-500">{(selectedRequest as any).test_type || (selectedRequest as any).test?.name}</p>
                    <p className="text-xs text-graphite-500 dark:text-slate-400">
                      Patient: <strong>{selectedRequest.patient?.first_name} {selectedRequest.patient?.last_name}</strong>
                    </p>
                  </div>
                  {getStatusPill(selectedRequest.status)}
                </div>

                <div>
                  <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Result Findings Summary</label>
                  <textarea
                    className="w-full min-h-[140px] mt-1 p-3 rounded-xl border border-graphite-300 dark:border-slate-700 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter quantitative values, microscopic findings, and clinical impressions..."
                    value={resultSummary}
                    onChange={(e) => setResultSummary(e.target.value)}
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer p-3 rounded-xl border border-error-500/30 bg-error-50">
                  <Checkbox checked={isCritical} onCheckedChange={(v) => setIsCritical(v === true)} />
                  <span>Flag as <strong className="text-error-500">CRITICAL VALUE</strong> — triggers automated push, SMS, & clinician dispatch alerts</span>
                </label>

                <div className="flex gap-2">
                  <button onClick={() => setSelectedRequest(null)} className="px-4 py-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold text-xs">
                    Cancel
                  </button>
                  <button
                    onClick={submitResult}
                    disabled={!resultSummary || isSubmitting}
                    className="px-5 py-2 rounded-md bg-success-500 text-white font-extrabold text-xs flex items-center gap-1 shadow-xs"
                  >
                    {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Submit & Release Results
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-graphite-500 dark:text-slate-400">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-30 text-primary-500" />
                <p className="font-bold">Select an in-progress lab test from the Orders queue to enter results.</p>
              </div>
            )}
          </div>
        )}

        {/* Catalog Tab */}
        {activeTab === "catalog" && (
          <div className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-sm flex items-center gap-2">
                <Microscope className="h-4 w-4 text-purple-500" /> Diagnostic Test Catalog
              </h2>
              <button
                onClick={openNewTestDialog}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Test
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {testCatalog.map((test) => (
                <div key={test.id} className="p-3.5 rounded-xl border border-canvas-silk bg-canvas flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-xs text-slate-900">{test.name}</h4>
                    <p className="text-[10px] text-graphite-500 dark:text-slate-400">{test.category}{test.description ? ` • ${test.description}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-black text-sm font-mono text-primary-500 mr-1">{formatPrice(test.price)}</span>
                    <button
                      onClick={() => openEditTestDialog(test)}
                      title="Edit test"
                      className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-primary-600 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setTestToDelete(test)}
                      title="Remove test"
                      className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {testCatalog.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-8">No tests in the catalog yet. Add your first test to start receiving orders.</p>
            )}
          </div>
        )}

        {/* Add / Edit Test Dialog */}
        <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
          <DialogContent className="sm:max-w-[440px] bg-white border border-canvas-silk dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="font-extrabold text-base">{editingTest ? "Edit Test" : "Add Test to Catalog"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-bold text-slate-600">Test name *</label>
                <input
                  value={testForm.name}
                  onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                  placeholder="e.g. Full Blood Count"
                  className="mt-1 w-full rounded-lg border border-canvas-silk px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Category</label>
                <Select value={testForm.category} onValueChange={(v) => setTestForm({ ...testForm, category: v })}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Hematology", "Biochemistry", "Microbiology", "Immunology", "Pathology", "Radiology", "Cardiology", "Other"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Price (ZMW) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={testForm.price}
                  onChange={(e) => setTestForm({ ...testForm, price: e.target.value })}
                  placeholder="e.g. 150"
                  className="mt-1 w-full rounded-lg border border-canvas-silk px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Description</label>
                <textarea
                  value={testForm.description}
                  onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                  placeholder="Short description for patients and ordering clinicians"
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-canvas-silk px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => setShowTestDialog(false)}
                className="px-4 py-2 rounded-lg border border-canvas-silk text-xs font-bold text-slate-600 hover:bg-canvas"
              >
                Cancel
              </button>
              <button
                onClick={saveTest}
                disabled={savingTest}
                className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {savingTest && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingTest ? "Save Changes" : "Add Test"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Test confirmation */}
        <Dialog open={!!testToDelete} onOpenChange={(open) => { if (!open) setTestToDelete(null); }}>
          <DialogContent className="sm:max-w-[380px] bg-white border border-canvas-silk dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-sm font-black">Remove test from catalog?</DialogTitle>
              <DialogDescription className="text-xs">
                “{testToDelete?.name}” will be removed from your lab catalog. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button
                onClick={() => setTestToDelete(null)}
                disabled={deletingTest}
                className="px-4 py-2 rounded-lg border border-canvas-silk text-xs font-bold text-slate-600 hover:bg-canvas disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteTest}
                disabled={deletingTest}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {deletingTest && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Remove Test
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default LabManagement;
