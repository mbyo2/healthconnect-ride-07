import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/hooks/use-currency";
import {
  FlaskConical, Search, Plus, Clock, CheckCircle2, AlertCircle, FileText, Microscope, Loader2
} from "lucide-react";
import { LabRequest, LabTestStatus } from "@/types/lab";
import { toast } from "sonner";
import { InstitutionInsuranceVerification } from "@/components/institution/InstitutionInsuranceVerification";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { dispatchNotification } from "@/hooks/useNotifications";

const LabManagement = () => {
  const { user } = useAuth();
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

  const { data: requests } = useQuery({
    queryKey: ["lab-requests"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("lab_tests")
          .select("*, patient:profiles!patient_id(first_name, last_name), provider:profiles!ordered_by(first_name, last_name)")
          .order("created_at", { ascending: false });

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
      const { data } = await supabase.from("profiles").select("id, first_name, last_name, email").limit(50);
      return data || [];
    },
  });

  const { data: testCatalog = [] } = useQuery({
    queryKey: ["lab-test-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_test_catalog" as any).select("*").order("name");
      if (error) {
        return [
          { name: "Complete Blood Count (CBC)", code: "HEM-001", category: "Hematology", price: 150 },
          { name: "Lipid Profile", code: "BIO-001", category: "Biochemistry", price: 200 },
        ];
      }
      return data as any[];
    },
  });

  const submitResult = async () => {
    if (!selectedRequest || !resultSummary) return;
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
      try {
        await supabase.from("lab_results").insert({
          patient_id: (selectedRequest as any).patient_id,
          test_name: (selectedRequest as any).test_type || "Lab Test",
          test_date: new Date().toISOString().split("T")[0],
          result_value: resultSummary,
          notes: isUrgent ? `CRITICAL — ${selectedRequest ? "requires immediate review" : ""}` : "Pending pathologist review",
        });
      } catch (e) { console.error("lab_results push failed", e); }

      let institutionId: string | undefined;
      try {
        const patientName = (selectedRequest as any).patient
          ? `${(selectedRequest as any).patient.first_name ?? ""} ${(selectedRequest as any).patient.last_name ?? ""}`.trim()
          : "Unknown Patient";
        const { data: staffRow } = await supabase
          .from("institution_staff")
          .select("institution_id")
          .eq("provider_id", user?.id ?? "")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        institutionId = staffRow?.institution_id;
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
        lab_id: user.id,
        test_type: selectedTestType,
        test_number: `LAB-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
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
    } fontally: {
      setIsSubmitting(false);
    }
  };

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const inProgressRequests = requests?.filter((r) => r.status === "in_progress") || [];
  const completedRequests = requests?.filter((r) => r.status === "completed") || [];

  const getStatusPill = (status: LabTestStatus) => {
    switch (status) {
      case "pending": return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-[#fdab3d]">Pending</span>;
      case "in_progress": return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-[#0073ea]">In Progress</span>;
      case "completed": return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-[#00c875]">Completed</span>;
      case "cancelled": return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-[#e2445c]">Cancelled</span>;
      default: return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-[#676879]">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Sticky Monday Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center font-black text-sm shadow-xs">
              <Microscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                Pathology & Diagnostics Laboratory Board
                <span className="w-2 h-2 rounded-full bg-[#00c875] animate-ping" />
              </h1>
              <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
                Specimen telemetry, pathologist review queues, and automatic critical-result alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
              <DialogTrigger asChild>
                <button className="px-4 py-2 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span>New Test Request</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-white border border-[#e6e9ef]">
                <DialogHeader>
                  <DialogTitle className="font-extrabold text-base">Create New Lab Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 text-xs">
                  <div>
                    <label className="font-extrabold text-[#676879] uppercase">Patient</label>
                    <input
                      placeholder="Search patient name..."
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                      className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-medium"
                    />
                    {patientSearchTerm && !selectedPatientId && (
                      <div className="max-h-32 overflow-y-auto border border-[#e6e9ef] rounded-md bg-white mt-1 shadow-xs">
                        {patients
                          ?.filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(patientSearchTerm.toLowerCase()))
                          .map((p) => (
                            <div
                              key={p.id}
                              className="p-2 text-xs font-bold hover:bg-[#f0f2f7] cursor-pointer"
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
                    <label className="font-extrabold text-[#676879] uppercase">Test Type</label>
                    <Select value={selectedTestType} onValueChange={setSelectedTestType}>
                      <SelectTrigger className="mt-1 border border-[#c3c6d4] font-bold text-xs">
                        <SelectValue placeholder="Select test type" />
                      </SelectTrigger>
                      <SelectContent>
                        {testCatalog.map((test) => (
                          <SelectItem key={test.code} value={test.name}>
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
                        <div className="p-2.5 rounded-lg bg-[#00c875]/10 border border-[#00c875]/30 text-[#00c875] font-bold text-xs flex items-center gap-1.5">
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
                  <button onClick={createRequest} disabled={!selectedPatientId || !selectedTestType || isSubmitting} className="px-4 py-1.5 rounded-md bg-[#0073ea] text-white text-xs font-bold">
                    {isSubmitting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Create Request
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* View Selection Bar */}
        <div className="max-w-[1500px] mx-auto mt-4 px-4 sm:px-6 flex items-center gap-2">
          {[
            { id: "requests", label: "Lab Orders Queue" },
            { id: "results", label: "Results Entry" },
            { id: "catalog", label: "Diagnostic Catalog" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === tab.id
                  ? "bg-[#0073ea] text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 text-[#676879] hover:bg-[#f0f2f7]"
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
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-[#676879] uppercase">Pending Orders</span>
              <Clock className="h-5 w-5 text-[#fdab3d]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#fdab3d]">{pendingRequests.length}</div>
            <div className="text-[10px] text-[#676879] font-bold mt-0.5">Awaiting sample processing</div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-[#676879] uppercase">In Analysis</span>
              <FlaskConical className="h-5 w-5 text-[#0073ea]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#0073ea]">{inProgressRequests.length}</div>
            <div className="text-[10px] text-[#676879] font-bold mt-0.5">Currently on bench</div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-[#676879] uppercase">Completed Today</span>
              <CheckCircle2 className="h-5 w-5 text-[#00c875]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#00c875]">
              {completedRequests.filter((r) => new Date(r.updated_at).toDateString() === new Date().toDateString()).length}
            </div>
            <div className="text-[10px] text-[#676879] font-bold mt-0.5">Signed off & released</div>
          </div>
        </div>

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e6e9ef] dark:border-slate-800 pb-3">
              <h2 className="font-extrabold text-sm flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-[#0073ea]" /> Active Pathology Orders
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient or test name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[#c3c6d4] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
                />
              </div>
            </div>

            <div className="w-full overflow-x-auto rounded-xl border border-[#e6e9ef]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#e6e9ef] bg-[#f5f6f8] text-[11px] font-extrabold uppercase text-[#676879]">
                    <th className="py-2.5 px-4">Test Number</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Test Requested</th>
                    <th className="py-2.5 px-3">Ordering Provider</th>
                    <th className="py-2.5 px-3 text-center">Priority</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e9ef]">
                  {requests
                    ?.filter(
                      (r) =>
                        r.patient?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.test_type?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((request) => (
                      <tr key={request.id} className="hover:bg-[#f0f2f7] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{request.test_number || "LAB-SYS"}</td>
                        <td className="py-3 px-3 font-bold text-[#0073ea]">
                          {request.patient?.first_name} {request.patient?.last_name}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">{request.test_type || request.test?.name}</td>
                        <td className="py-3 px-3 text-[#676879]">Dr. {request.provider?.last_name || "Staff"}</td>
                        <td className="py-3 px-3 text-center">
                          {request.priority === "urgent" || request.priority === "stat" ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#e2445c] flex items-center gap-1 mx-auto w-fit">
                              <AlertCircle className="h-3 w-3" /> STAT
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#579bfc]">Routine</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">{getStatusPill(request.status)}</td>
                        <td className="py-3 px-3 text-center">
                          {request.status === "pending" && (
                            <button onClick={() => toast.success("Sample collected")} className="px-3 py-1 rounded-md bg-[#0073ea] text-white text-[10px] font-extrabold">
                              Collect Sample
                            </button>
                          )}
                          {request.status === "in_progress" && (
                            <button
                              onClick={() => { setSelectedRequest(request); setActiveTab("results"); }}
                              className="px-3 py-1 rounded-md bg-[#00c875] text-white text-[10px] font-extrabold"
                            >
                              Enter Result
                            </button>
                          )}
                          {request.status === "completed" && (
                            <button onClick={() => setSelectedRequest(request)} className="px-3 py-1 rounded-md border border-[#c3c6d4] text-xs font-bold">
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
          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <h2 className="font-extrabold text-sm mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#0073ea]" /> Pathologist Results Verification Entry
            </h2>
            {selectedRequest ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-[#e5f0ff] border border-[#0073ea]/20 flex justify-between items-center">
                  <div>
                    <p className="font-extrabold text-sm text-[#0073ea]">{(selectedRequest as any).test_type || (selectedRequest as any).test?.name}</p>
                    <p className="text-xs text-[#676879]">
                      Patient: <strong>{selectedRequest.patient?.first_name} {selectedRequest.patient?.last_name}</strong>
                    </p>
                  </div>
                  {getStatusPill(selectedRequest.status)}
                </div>

                <div>
                  <label className="font-extrabold text-[#676879] uppercase">Result Findings Summary</label>
                  <textarea
                    className="w-full min-h-[140px] mt-1 p-3 rounded-xl border border-[#c3c6d4] font-medium text-xs focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
                    placeholder="Enter quantitative values, microscopic findings, and clinical impressions..."
                    value={resultSummary}
                    onChange={(e) => setResultSummary(e.target.value)}
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer p-3 rounded-xl border border-[#e2445c]/30 bg-[#ffeef0]">
                  <Checkbox checked={isCritical} onCheckedChange={(v) => setIsCritical(v === true)} />
                  <span>Flag as <strong className="text-[#e2445c]">CRITICAL VALUE</strong> — triggers automated push, SMS, & clinician dispatch alerts</span>
                </label>

                <div className="flex gap-2">
                  <button onClick={() => setSelectedRequest(null)} className="px-4 py-2 rounded-md border border-[#c3c6d4] font-bold text-xs">
                    Cancel
                  </button>
                  <button
                    onClick={submitResult}
                    disabled={!resultSummary || isSubmitting}
                    className="px-5 py-2 rounded-md bg-[#00c875] text-white font-extrabold text-xs flex items-center gap-1 shadow-xs"
                  >
                    {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Submit & Release Results
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-[#676879]">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-30 text-[#0073ea]" />
                <p className="font-bold">Select an in-progress lab test from the Orders queue to enter results.</p>
              </div>
            )}
          </div>
        )}

        {/* Catalog Tab */}
        {activeTab === "catalog" && (
          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <h2 className="font-extrabold text-sm mb-4 flex items-center gap-2">
              <Microscope className="h-4 w-4 text-[#a25ddc]" /> Diagnostic Test Catalog
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {testCatalog.map((test) => (
                <div key={test.code} className="p-3.5 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8] flex justify-between items-center">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">{test.name}</h4>
                    <p className="text-[10px] text-[#676879]">{test.code} • {test.category}</p>
                  </div>
                  <span className="font-black text-sm font-mono text-[#0073ea]">{formatPrice(test.price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabManagement;
