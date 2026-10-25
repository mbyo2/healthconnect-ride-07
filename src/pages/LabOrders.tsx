import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { LAB_ORDERING_ROLES } from "@/config/roleConfig";
import { dispatchNotification } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FlaskConical, Plus, Loader2, Receipt, ClipboardList } from "lucide-react";
import { downloadReceiptPdf } from "@/utils/receiptPdf";
import { Navigate } from "react-router-dom";
import { OrderSetPicker, type OrderSetItem } from "@/components/clinical/OrderSets";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/**
 * Clinician lab ordering. The six ordering roles (doctor, specialist,
 * medical_licentiate, clinical_officer, dentist, radiologist) place test
 * orders against verified laboratories / diagnostic centres; lab staff
 * fulfil them in LabManagement. Writes go to public.lab_tests (the order
 * table — lab_id, test_type, test_number, ordered_by, …).
 */
const LabOrders = () => {
  const { user } = useAuth();
  const { availableRoles } = useUserRoles();
  const queryClient = useQueryClient();

  const canOrder = useMemo(
    () => availableRoles.some((r) => (LAB_ORDERING_ROLES as readonly string[]).includes(r)),
    [availableRoles]
  );

  const [patientSearch, setPatientSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [labId, setLabId] = useState("");
  const [showOrderSets, setShowOrderSets] = useState(false);
  const [applyingSet, setApplyingSet] = useState(false);
  const [testType, setTestType] = useState("");
  const [testCategory, setTestCategory] = useState("");
  const [priority, setPriority] = useState("routine");
  const [sampleType, setSampleType] = useState("");
  const [notes, setNotes] = useState("");

  // Patients the clinician has an appointment relationship with.
  const { data: patients = [] } = useQuery({
    queryKey: ["lab-order-patients", user?.id],
    enabled: !!user?.id && canOrder,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("patient_id, patient:profiles!appointments_patient_id_fkey(id, first_name, last_name)")
        .eq("provider_id", user!.id);
      if (error) throw error;
      const seen = new Map<string, any>();
      for (const row of data || []) {
        const p = (row as any).patient;
        if (p && !seen.has(p.id)) seen.set(p.id, p);
      }
      return [...seen.values()].filter((p) =>
        !patientSearch ||
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(patientSearch.toLowerCase())
      );
    },
  });

  // Verified laboratories / diagnostic centres that can receive orders.
  const { data: labs = [] } = useQuery({
    queryKey: ["lab-order-facilities"],
    enabled: canOrder,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("healthcare_institutions")
        .select("id, name, type")
        .eq("is_verified", true)
        .in("type", ["laboratory", "radiology_center", "hospital", "clinic"]);
      if (error) throw error;
      return data || [];
    },
  });

  // Test catalog for type/category/price.
  const { data: catalog = [] } = useQuery({
    queryKey: ["lab-test-catalog"],
    enabled: canOrder,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_test_catalog")
        .select("id, name, category, price")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: myOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["lab-my-orders", user?.id],
    enabled: !!user?.id && canOrder,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_tests")
        .select(`
          id, test_number, test_type, test_category, priority, status,
          sample_type, notes, price, created_at, result_summary, results_date,
          patient:profiles!lab_tests_patient_id_fkey(first_name, last_name),
          lab:healthcare_institutions!lab_tests_lab_id_fkey(name)
        `)
        .eq("ordered_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!patientId) throw new Error("Select a patient");
      if (!labId) throw new Error("Select the receiving laboratory");
      if (!testType) throw new Error("Select a test");
      const catalogEntry = catalog.find((c: any) => c.name === testType);
      const price = catalogEntry?.price ?? 0;
      const { error } = await supabase.from("lab_tests").insert({
        patient_id: patientId,
        ordered_by: user.id,
        lab_id: labId,
        test_type: testType,
        test_category: testCategory || catalogEntry?.category || null,
        test_number: `LAB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        priority,
        sample_type: sampleType || null,
        notes: notes || null,
        price,
        total_amount: price,
        balance: price,
        payment_status: price === 0 ? "paid" : "pending",
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Lab order placed");
      setPatientId(""); setLabId(""); setTestType(""); setTestCategory("");
      setPriority("routine"); setSampleType(""); setNotes("");
      queryClient.invalidateQueries({ queryKey: ["lab-my-orders"] });
      try {
        await dispatchNotification({
          userId: patientId,
          title: "New lab test ordered",
          message: `Your clinician ordered a ${testType} test. You will be notified when results are ready.`,
          category: "lab",
          link: "/medical-records",
        });
      } catch { /* notification is best-effort */ }
    },
    onError: (e: any) => toast.error(e.message || "Failed to place lab order"),
  });

  // Access control is handled by RouteGuard requireRoles in App.tsx.
  // The canOrder check here is redundant and causes issues with role loading timing.

  return (
    <div className="min-h-screen bg-canvas dark:bg-slate-950 p-4 sm:p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Order Lab Tests</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Place test orders for your patients at verified laboratories</p>
          </div>
        </div>

        <Card id="new-lab-order" className="scroll-mt-6">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" /> New lab order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold uppercase">Patient *</Label>
                <Input
                  placeholder="Search your patients…"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger className="mt-2 h-9 text-xs">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold uppercase">Receiving laboratory *</Label>
                <Select value={labId} onValueChange={setLabId}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Select lab / diagnostic centre" />
                  </SelectTrigger>
                  <SelectContent>
                    {labs.map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold uppercase">Test *</Label>
                <Select
                  value={testType}
                  onValueChange={(v) => {
                    setTestType(v);
                    const entry = catalog.find((c: any) => c.name === v);
                    if (entry?.category) setTestCategory(entry.category);
                  }}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Select test" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.map((c: any) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}{c.price ? ` — K${c.price}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold uppercase">Category</Label>
                <Input
                  placeholder="e.g. Haematology"
                  value={testCategory}
                  onChange={(e) => setTestCategory(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold uppercase">Sample type</Label>
                <Input
                  placeholder="e.g. Venous blood (EDTA)"
                  value={sampleType}
                  onChange={(e) => setSampleType(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold uppercase">Clinical notes</Label>
              <Textarea
                placeholder="Indication, relevant history, instructions for the lab…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 text-xs"
                rows={3}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => createOrder.mutate()}
                disabled={createOrder.isPending || !patientId || !labId || !testType}
                className="w-full sm:w-auto"
              >
                {createOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Place order
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (!patientId) { toast.error("Select a patient first"); return; }
                  if (!labId) { toast.error("Select the receiving laboratory first"); return; }
                  setShowOrderSets(true);
                }}
                className="w-full sm:w-auto"
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Apply order set
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Order set picker: applies lab items as real orders */}
        <Dialog open={showOrderSets} onOpenChange={setShowOrderSets}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Apply an order set</DialogTitle>
            </DialogHeader>
            <OrderSetPicker
              onApply={async (items: OrderSetItem[]) => {
                if (!user) return;
                setApplyingSet(true);
                try {
                  const labItems = items.filter((i) => i.item_type === "lab");
                  const otherItems = items.filter((i) => i.item_type !== "lab");
                  let placed = 0;
                  for (const item of labItems) {
                    const { error } = await supabase.from("lab_tests").insert({
                      patient_id: patientId,
                      ordered_by: user.id,
                      lab_id: labId,
                      test_type: item.item_name,
                      test_number: `LAB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                      priority: "routine",
                      notes: "From order set",
                      price: 0,
                      total_amount: 0,
                      balance: 0,
                      payment_status: "paid",
                      status: "pending",
                    });
                    if (!error) placed++;
                  }
                  queryClient.invalidateQueries({ queryKey: ["lab-my-orders"] });
                  setShowOrderSets(false);
                  if (placed > 0) {
                    toast.success(`${placed} lab order${placed === 1 ? "" : "s"} placed from the order set`);
                  }
                  if (otherItems.length > 0) {
                    toast.info(
                      `${otherItems.length} non-lab item${otherItems.length === 1 ? "" : "s"} (${otherItems.map((i) => i.item_name).join(", ")}) — handle from the patient chart (prescribe / book / refer).`
                    );
                  }
                  if (placed === 0 && otherItems.length === 0) {
                    toast.info("No items selected");
                  }
                } finally {
                  setApplyingSet(false);
                }
              }}
            />
            {applyingSet && (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Placing orders...
              </p>
            )}
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">My orders</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <p className="text-xs text-slate-500">Loading orders…</p>
            ) : myOrders.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-xs text-slate-500">No lab orders yet.</p>
                <Button
                  onClick={() => document.getElementById("new-lab-order")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="min-h-[44px]"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> New order
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.map((o: any) => (
                  <div key={o.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {o.test_type}
                          <span className="ml-2 font-mono text-xs text-slate-400">{o.test_number}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {o.patient?.first_name} {o.patient?.last_name} · {o.lab?.name} ·
                          {" "}{new Date(o.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{o.priority}</Badge>
                        <Badge className="text-xs">{o.status?.replace(/_/g, " ")}</Badge>
                        <button
                          onClick={() =>
                            downloadReceiptPdf({
                              title: "Lab Order",
                              receiptNumber: o.test_number || o.id.slice(0, 8).toUpperCase(),
                              date: o.created_at,
                              issuerName: o.lab?.name || "Doc'O Clock Laboratory",
                              customerName: `${o.patient?.first_name || ""} ${o.patient?.last_name || ""}`.trim() || "Patient",
                              items: [
                                {
                                  description: o.test_type || "Lab test",
                                  quantity: 1,
                                  unitPrice: o.price || o.total_amount || 0,
                                  note: o.test_category ? `Category: ${o.test_category}` : undefined,
                                },
                              ],
                              amountPaid: o.payment_status === "paid" ? o.total_amount || o.price || 0 : 0,
                              paymentMethod: o.payment_method || undefined,
                              notes: o.sample_type ? `Sample: ${o.sample_type}` : undefined,
                            })
                          }
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-primary-500 hover:text-white transition-colors"
                          title="Download PDF Receipt"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {o.result_summary && (
                      <p className="mt-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                        <span className="font-bold">Result: </span>{o.result_summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LabOrders;
