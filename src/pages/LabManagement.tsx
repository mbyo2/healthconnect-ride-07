import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { useCurrency } from "@/hooks/use-currency";
import {
  FlaskConical, Search, Plus, Clock, CheckCircle2, AlertCircle, FileText, Microscope, Loader2, Pencil, Trash2
} from "lucide-react";
import { LabRequest } from "@/types/lab";
import { SkeletonLine, SkeletonTableRows } from "@/components/ui/skeleton-kit";
import { toast } from "sonner";
import { InstitutionInsuranceVerification } from "@/components/institution/InstitutionInsuranceVerification";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { dispatchNotification } from "@/hooks/useNotifications";
import { queueLabResultAlert } from "@/utils/sms-reminder-service";
import { providerDisplayName } from "@/utils/providerDisplay";
import { friendlyErrorMessage } from "@/utils/friendly-error";

const LabManagement = () => {
  const { user } = useAuth();
  const { availableRoles } = useUserRoles();
  // Title fits the cadre — pathologists see the pathology board, lab techs
  // the workbench, phlebotomists the collection board.
  const labTitle = availableRoles.includes("pathologist")
    ? "Pathology & Diagnostics Laboratory Board"
    : availableRoles.includes("phlebotomist")
      ? "Sample Collection Board"
      : availableRoles.includes("radiographer")
        ? "Imaging Worklist"
        : "Laboratory Workbench";
  const labSubtitle = availableRoles.includes("pathologist")
    ? "Specimen telemetry, pathologist review queues, and automatic critical-result alerts"
    : availableRoles.includes("phlebotomist")
      ? "Collection runs, specimen handover & chain of custody"
      : "Test queue, result entry & verification";
  // Separation of duties: only a pathologist (or platform admin/super_admin)
  // may verify & sign off a result — never the person who entered it by default.
  // Roles come from user_roles via useUserRoles, never profiles.role.
  const canVerify = availableRoles.some((r) => ["pathologist", "admin", "super_admin"].includes(r));
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
      toast.error(friendlyErrorMessage(e, "Failed to save test"));
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
      toast.error(friendlyErrorMessage(e, "Failed to remove test"));
    } finally {
      setDeletingTest(false);
    }
  };

  const { data: requests, isLoading: requestsLoading } = useQuery({
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
    queryKey: ["lab-patients", patientSearchTerm],
    queryFn: async () => {
      // Search patients by name/email when a search term is provided.
      // Without a term, show patients with existing lab orders (privacy:
      // prevents lab staff from enumerating all patients).
      if (patientSearchTerm && patientSearchTerm.length >= 2) {
        const term = `%${patientSearchTerm}%`;
        const { data } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`)
          .limit(20);
        return data || [];
      }
      // Only fetch patients who have lab orders (not all patients)
      // This prevents patient enumeration by lab staff
      const { data: labOrders } = await supabase
        .from("lab_tests")
        .select("patient_id")
        .limit(200);
      const patientIds = [...new Set((labOrders || []).map((o: any) => o.patient_id).filter(Boolean))];
      if (patientIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", patientIds);
      return data || [];
    },
  });

  const { data: testCatalog = [], isLoading: catalogLoading } = useQuery({
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
              test_id: selectedRequest.id,
              patient_id: (selectedRequest as any).patient_id,
              technician_id: user?.id ?? null,
              test_name: (selectedRequest as any).test_type || "Lab Test",
              test_date: new Date().toISOString().split("T")[0],
              result_value: resultSummary,
              is_abnormal: isCritical,
              notes: isUrgent ? `CRITICAL — requires immediate review` : "Pending pathologist review",
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
        const title = "Critical Lab Result";
        const message = `${testName}: ${resultSummary}. Please review immediately.`;
        if (patientId) {
          dispatchNotification({ userId: patientId, title: "New lab result available", message: `Your ${testName} result is ready. Open the app for details.`, category: "lab", link: "/medical-records" });
        }
        if (orderingId && orderingId !== user?.id) {
          dispatchNotification({ userId: orderingId, title, message, category: "lab", channels: ["push", "sms", "email"] });
        }
      } else {
        // Routine results: the ordering doctor is still notified on entry
        // (in-app; previously ONLY critical results notified anyone). The
        // patient is notified at verification, when values become visible.
        const orderingId = (selectedRequest as any).ordered_by;
        if (orderingId && orderingId !== user?.id) {
          const testName = (selectedRequest as any).test_type || "Lab Test";
          dispatchNotification({
            userId: orderingId,
            title: "Lab result entered",
            message: `${testName} result entered for ${patientName} — awaiting pathologist verification.`,
            category: "lab",
            link: "/lab-management",
            channels: [],
          });
        }
      }

      toast.success(isUrgent ? "Critical result submitted — clinicians notified" : "Results submitted & sent for pathologist review");
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

  const verifyResult = async () => {
    if (!selectedRequest) return;
    // Separation of duties (audit 2026-10-20): verification is restricted to
    // pathologists and platform admins — the button is also disabled for
    // everyone else, this guard is the enforcement.
    if (!canVerify) {
      toast.error("Only a pathologist (or admin) can verify & sign off lab results.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("lab_tests")
        .update({
          verified_by: user?.id ?? null,
          verified_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      // Mark the lab_results row verified too — best-effort mirror. The
      // lab_tests write above is the source of truth and already
      // succeeded, so a mirror failure must never surface as a
      // verification failure (that false alarm previously caused
      // duplicate sign-off attempts).
      try {
        const { error: resultsError } = await supabase
          .from("lab_results")
          .update({ verified_at: new Date().toISOString() })
          .eq("request_id", selectedRequest.id);
        if (resultsError) console.warn("lab_results verify mirror failed", resultsError);
        // Clear the "Pending pathologist review" placeholder notes on verify —
        // leaving it would show a stale "Pending" message next to the Verified
        // badge on the patient card. Only clears the exact placeholder, never
        // real clinical notes.
        const { error: notesError } = await supabase
          .from("lab_results")
          .update({ notes: null })
          .eq("request_id", selectedRequest.id)
          .eq("notes", "Pending pathologist review");
        if (notesError) console.warn("lab_results notes clear failed", notesError);
      } catch (e) {
        console.warn("lab_results verify mirror failed", e);
      }

      // Notify the patient now that the result is verified — this is when
      // result values become visible to them (PatientLabResults hides values
      // until verified). In-app always; WhatsApp/SMS via the lab_result_ready
      // queue when we have a phone on file. Best-effort: never fail sign-off.
      try {
        const patientId = (selectedRequest as any).patient_id;
        const testName = (selectedRequest as any).test_type || "Lab Test";
        if (patientId) {
          dispatchNotification({
            userId: patientId,
            title: "Lab result verified",
            message: `Your ${testName} result has been verified by a pathologist and is ready to view.`,
            category: "lab",
            link: "/medical-records",
            channels: [],
          });
          const { data: patientProfile } = await supabase
            .from("profiles")
            .select("first_name, last_name, phone")
            .eq("id", patientId)
            .maybeSingle();
          const phone = (patientProfile as any)?.phone;
          if (phone) {
            await queueLabResultAlert({
              patientId,
              patientPhone: phone,
              patientName: `${(patientProfile as any)?.first_name ?? ""} ${(patientProfile as any)?.last_name ?? ""}`.trim() || "Patient",
              institutionId: contextInstitutionId || undefined,
            });
          }
        }
      } catch (e) {
        console.warn("patient verify notification failed", e);
      }

      toast.success("Result verified & signed off");
      setSelectedRequest({ ...selectedRequest, verified_by: user?.id } as any);
      queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
    } catch (error) {
      console.error("Error verifying result:", error);
      toast.error("Failed to verify result");
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
        entered_by: user.id,
        order_source: "electronic",
        institution_id: labInstitutionId,
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
      toast.error(friendlyErrorMessage(e, "Failed to record sample collection"));
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
      toast.error(friendlyErrorMessage(e, "Failed to start analysis"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const inProgressRequests = requests?.filter((r) => r.status === "in_progress") || [];
  const completedRequests = requests?.filter((r) => r.status === "completed") || [];

  const getStatusPill = (status: string) => {
    switch (status) {
      case "pending": return <StatusBadge tone="warning">Pending</StatusBadge>;
      case "sample_collected": return <StatusBadge tone="info">Sample Collected</StatusBadge>;
      case "in_progress": return <StatusBadge tone="info">In Progress</StatusBadge>;
      case "completed": return <StatusBadge tone="positive">Completed</StatusBadge>;
      case "cancelled": return <StatusBadge tone="negative">Cancelled</StatusBadge>;
      default: return <StatusBadge status={status} />;
    }
  };

  return (
    <div className="pb-16">
      {/* Sticky page header */}
      <div className="doc-page-header px-4 sm:px-6 py-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-500 text-white flex items-center justify-center shadow-xs">
              <Microscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                {labTitle}
                <span className="w-2 h-2 rounded-full bg-success-500" />
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                {labSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
              <DialogTrigger asChild>
                <Button className="min-h-[44px]">
                  <Plus className="h-4 w-4" />
                  <span>New Test Request</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="font-semibold text-base">Create New Lab Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Patient</label>
                    <Input
                      placeholder="Search patient name..."
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                      className="mt-1"
                    />
                    {patientSearchTerm && !selectedPatientId && (
                      <div className="max-h-32 overflow-y-auto border border-border rounded-md bg-card mt-1 shadow-xs">
                        {patients
                          ?.filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(patientSearchTerm.toLowerCase()))
                          .map((p) => (
                            <div
                              key={p.id}
                              className="p-2 text-sm font-medium hover:bg-muted cursor-pointer"
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
                    <label className="text-xs font-medium text-muted-foreground">Test Type</label>
                    <Select value={selectedTestType} onValueChange={setSelectedTestType}>
                      <SelectTrigger className="mt-1">
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
                        <div className="p-2.5 rounded-lg bg-success-500/10 border border-success-500/30 text-success-700 dark:text-success-400 font-medium text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Insurance Applied: {selectedVerification.coverage_percentage}% Covered</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setShowNewRequestDialog(false)} className="min-h-[44px]">
                    Cancel
                  </Button>
                  <Button onClick={createRequest} disabled={!selectedPatientId || !selectedTestType || isSubmitting} className="min-h-[44px]">
                    {isSubmitting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Create Request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* View Selection Bar */}
        <div className="mt-4 flex items-center gap-2" role="tablist" aria-label="Laboratory views">
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
              className={`px-4 min-h-[44px] rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card border border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Pending orders</span>
              <Clock className="h-5 w-5 text-warning-500" />
            </div>
            <div className="text-2xl font-semibold tnum text-foreground">{pendingRequests.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Awaiting sample processing</div>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">In analysis</span>
              <FlaskConical className="h-5 w-5 text-primary-500" />
            </div>
            <div className="text-2xl font-semibold tnum text-foreground">{inProgressRequests.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Currently on bench</div>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Completed today</span>
              <CheckCircle2 className="h-5 w-5 text-success-500" />
            </div>
            <div className="text-2xl font-semibold tnum text-foreground">
              {completedRequests.filter((r) => new Date(r.updated_at).toDateString() === new Date().toDateString()).length}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Signed off & released</div>
          </div>
        </div>

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary-500" /> Active Pathology Orders
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search patient or test name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            <div className="w-full overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
                    <th className="py-2.5 px-4">Test Number</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Test Requested</th>
                    <th className="py-2.5 px-3">Ordering Provider</th>
                    <th className="py-2.5 px-3 text-center">Priority</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requestsLoading && <SkeletonTableRows rows={5} cells={7} />}
                  {requests
                    ?.filter(
                      (r) =>
                        r.patient?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.test_type?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((request) => (
                      <tr key={request.id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 tnum font-medium text-foreground">{request.test_number || "LAB-SYS"}</td>
                        <td className="py-3 px-3 font-medium text-foreground">
                          {request.patient?.first_name} {request.patient?.last_name}
                        </td>
                        <td className="py-3 px-3 text-foreground">{request.test_type || request.test?.name}</td>
                        <td className="py-3 px-3 text-muted-foreground">{request.provider?.last_name ? providerDisplayName({ first_name: request.provider?.first_name, last_name: request.provider?.last_name, role: (request.provider as any)?.role }) : "Staff"}</td>
                        <td className="py-3 px-3 text-center">
                          {request.priority === "urgent" || request.priority === "stat" ? (
                            <StatusBadge tone="urgent" className="mx-auto">
                              <AlertCircle className="h-3 w-3" /> STAT
                            </StatusBadge>
                          ) : (
                            <StatusBadge tone="neutral">Routine</StatusBadge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">{getStatusPill(request.status)}</td>
                        <td className="py-3 px-3 text-center">
                          {request.status === "pending" && (
                            <Button size="sm" onClick={() => collectSample(request)} disabled={isSubmitting} className="min-h-[44px]">
                              Collect Sample
                            </Button>
                          )}
                          {request.status === "sample_collected" && (
                            <Button size="sm" onClick={() => startAnalysis(request)} disabled={isSubmitting} className="min-h-[44px]">
                              Start Analysis
                            </Button>
                          )}
                          {request.status === "in_progress" && (
                            <Button size="sm" variant="success" onClick={() => { setSelectedRequest(request); setActiveTab("results"); }} className="min-h-[44px]">
                              Enter Result
                            </Button>
                          )}
                          {request.status === "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(request);
                                setResultSummary((request as any).result_summary || "");
                                setActiveTab("results");
                              }}
                              className="min-h-[44px]"
                            >
                              View Results
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  {requests?.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <div className="space-y-3">
                          <FlaskConical className="h-10 w-10 mx-auto text-muted-foreground" />
                          <p className="text-sm font-semibold">No lab orders yet</p>
                          <p className="text-xs text-muted-foreground">New test requests from providers will appear here for sample collection.</p>
                          <Button onClick={() => setShowNewRequestDialog(true)} className="min-h-[44px]">
                            New Test Request
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results Entry Tab */}
        {activeTab === "results" && (
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary-500" />
              {selectedRequest?.status === "completed" ? "Lab Results — Review & Verification" : "Pathologist Results Verification Entry"}
            </h2>
            {selectedRequest ? (
              <div className="space-y-4 text-sm">
                <div className="p-4 rounded-lg bg-primary-500/5 border border-primary-500/20 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{(selectedRequest as any).test_type || (selectedRequest as any).test?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Patient: <strong>{selectedRequest.patient?.first_name} {selectedRequest.patient?.last_name}</strong>
                    </p>
                  </div>
                  {getStatusPill(selectedRequest.status)}
                </div>

                {selectedRequest.status === "completed" ? (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Result findings</label>
                      <div className="w-full min-h-[140px] mt-1 p-3 rounded-lg border border-border bg-muted/50 whitespace-pre-wrap">
                        {resultSummary || (selectedRequest as any).result_summary || "No findings recorded."}
                      </div>
                    </div>
                    {(selectedRequest as any).results_date && (
                      <p className="text-muted-foreground">
                        Reported: <strong>{new Date((selectedRequest as any).results_date).toLocaleString()}</strong>
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setSelectedRequest(null); setResultSummary(""); setActiveTab("requests"); }}>
                        Back to Orders
                      </Button>
                      <Button
                        variant="success"
                        onClick={verifyResult}
                        disabled={isSubmitting || (selectedRequest as any).verified_by || !canVerify}
                      >
                        {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {(selectedRequest as any).verified_by ? "Verified" : "Verify & Sign Off"}
                      </Button>
                    </div>
                    {!canVerify && !(selectedRequest as any).verified_by && (
                      <p className="text-xs text-muted-foreground">
                        Verification is restricted to pathologists (or platform admins) — results you enter are signed off by a pathologist.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Result findings summary</label>
                  <Textarea
                    className="min-h-[140px] mt-1"
                    placeholder="Enter quantitative values, microscopic findings, and clinical impressions..."
                    value={resultSummary}
                    onChange={(e) => setResultSummary(e.target.value)}
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-3 rounded-lg border border-error-500/30 bg-error-500/5">
                  <Checkbox checked={isCritical} onCheckedChange={(v) => setIsCritical(v === true)} />
                  <span>Flag as <strong className="text-error-500">CRITICAL VALUE</strong> — triggers automated push, SMS, & clinician dispatch alerts</span>
                </label>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="success"
                    onClick={submitResult}
                    disabled={!resultSummary || isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Submit & Release Results
                  </Button>
                </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-30 text-primary-500" />
                <p className="font-medium">Select an in-progress lab test from the Orders queue to enter results.</p>
              </div>
            )}
          </div>
        )}

        {/* Catalog Tab */}
        {activeTab === "catalog" && (
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Microscope className="h-4 w-4 text-primary-500" /> Diagnostic Test Catalog
              </h2>
              <Button size="sm" onClick={openNewTestDialog} className="min-h-[44px]">
                <Plus className="h-3.5 w-3.5" /> Add Test
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {catalogLoading &&
                [0, 1, 2, 3].map((i) => (
                  <div key={i} className="p-3.5 rounded-lg border border-border bg-card flex justify-between items-center gap-2" aria-hidden>
                    <div className="min-w-0 flex-1 space-y-2">
                      <SkeletonLine className="h-3.5 w-1/2" />
                      <SkeletonLine className="h-3 w-2/3" />
                    </div>
                    <SkeletonLine className="h-4 w-14 shrink-0" />
                  </div>
                ))}
              {testCatalog.map((test) => (
                <div key={test.id} className="p-3.5 rounded-lg border border-border bg-card flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-foreground">{test.name}</h4>
                    <p className="text-xs text-muted-foreground">{test.category}{test.description ? ` • ${test.description}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-semibold text-sm tnum text-foreground mr-1">{formatPrice(test.price)}</span>
                    <button
                      onClick={() => openEditTestDialog(test)}
                      title="Edit test"
                      className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setTestToDelete(test)}
                      title="Remove test"
                      className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {testCatalog.length === 0 && !catalogLoading && (
              <p className="text-center text-sm text-muted-foreground py-8">No tests in the catalog yet. Add your first test to start receiving orders.</p>
            )}
          </div>
        )}

        {/* Add / Edit Test Dialog */}
        <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle className="font-semibold text-base">{editingTest ? "Edit Test" : "Add Test to Catalog"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Test name *</label>
                <Input
                  value={testForm.name}
                  onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                  placeholder="e.g. Full Blood Count"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Category</label>
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
                <label className="text-xs font-medium text-muted-foreground">Price (ZMW) *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={testForm.price}
                  onChange={(e) => setTestForm({ ...testForm, price: e.target.value })}
                  placeholder="e.g. 150"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Textarea
                  value={testForm.description}
                  onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                  placeholder="Short description for patients and ordering clinicians"
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveTest} disabled={savingTest}>
                {savingTest && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingTest ? "Save Changes" : "Add Test"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Test confirmation */}
        <Dialog open={!!testToDelete} onOpenChange={(open) => { if (!open) setTestToDelete(null); }}>
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Remove test from catalog?</DialogTitle>
              <DialogDescription className="text-xs">
                “{testToDelete?.name}” will be removed from your lab catalog. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTestToDelete(null)} disabled={deletingTest}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteTest} disabled={deletingTest}>
                {deletingTest && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Remove Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default LabManagement;
