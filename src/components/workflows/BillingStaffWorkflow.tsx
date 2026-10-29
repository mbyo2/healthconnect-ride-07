import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, FileText, CreditCard, BarChart3, Receipt, Shield, Loader2, Plus, Trash2, Printer, Globe } from "lucide-react";
import { useBillingModule, BillingInvoice } from "@/hooks/useBillingModule";
import { format } from "date-fns";
import { InsuranceClaimWorkflow } from "@/components/billing/InsuranceClaimWorkflow";
import { DenialWorkqueue } from "@/components/billing/DenialWorkqueue";
import { MultiCountryAccounting } from "@/components/accounting/MultiCountryAccounting";
import { exportInvoicePDF } from "@/utils/pdfExport";
import { useCurrency } from "@/hooks/use-currency";
import { supabase } from "@/integrations/supabase/client";
import { useInstitutionAffiliation } from "@/hooks/useInstitutionAffiliation";
import { ServiceLineEditor, useInstitutionServices } from "@/components/billing/InvoiceServiceLines";
import { searchInstitutionPatients } from "@/lib/patients";
import { useInstitutionTeam } from "@/hooks/useInstitutionTeam";
import {
  type InvoiceServiceLine,
  emptyServiceLine,
  buildInvoiceLinesPayload,
  serviceLinesSubtotal,
  matchService,
} from "@/lib/invoicePricing";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; pillColor: string }> = {
  draft: { label: "Draft", pillColor: "bg-graphite-500 dark:bg-slate-600 text-white" },
  sent: { label: "Sent", pillColor: "bg-primary-400 text-white" },
  paid: { label: "Paid", pillColor: "bg-success-500 text-white" },
  partial: { label: "Partial", pillColor: "bg-warning-500 text-white" },
  overdue: { label: "Overdue", pillColor: "bg-error-500 text-white" },
  cancelled: { label: "Cancelled", pillColor: "bg-graphite-500 dark:bg-slate-600 text-white" },
  refunded: { label: "Refunded", pillColor: "bg-purple-500 text-white" },
};

export const BillingStaffWorkflow = () => {
  const {
    invoices, claims, loading,
    todayCollections, pendingInvoices, pendingClaims,
    createInvoice, recordPayment,
  } = useBillingModule();
  const { currency } = useCurrency();
  const { institutionId } = useInstitutionAffiliation();
  // P1-26: invoice lines are priced services from service_pricing.
  const { services, refresh: refreshServices } = useInstitutionServices(institutionId);
  const { isAdmin: canCreateService } = useInstitutionTeam(institutionId);

  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null);
  const [creating, setCreating] = useState(false);

  const [invoiceForm, setInvoiceForm] = useState({
    patient_name: "",
    items: [emptyServiceLine()] as InvoiceServiceLine[],
    tax: 0,
    discount: 0,
    due_date: "",
    notes: "",
    insurance_provider: "",
  });

  const [loadingCharges, setLoadingCharges] = useState(false);

  const autoFillPatientSystemCharges = async (patientName: string) => {
    if (!patientName.trim()) return;
    setLoadingCharges(true);
    try {
      // Patient Unity W3: resolve the patient from the institution roster
      // first (one list everywhere); the relationship-gated provider
      // search remains the fallback for non-institution contexts.
      let patientId: string | null = null;
      if (institutionId) {
        const rosterMatches = await searchInstitutionPatients(institutionId, patientName.trim()).catch(() => []);
        if (rosterMatches.length > 0) patientId = rosterMatches[0].id;
      }
      if (!patientId) {
        const { data: profiles } = await supabase
          .rpc("search_patients_for_provider", { p_search: patientName.trim() });
        if (profiles && profiles.length > 0) patientId = profiles[0].id;
      }

      if (patientId) {
        const [apptsRes, labsRes, rxsRes, insRes] = await Promise.all([
          supabase.from("appointments").select("id, type, date").eq("patient_id", patientId).eq("status", "completed"),
          supabase.from("lab_tests").select("id, test_type, price, total_amount").eq("patient_id", patientId).eq("payment_status", "pending"),
          // Prescription statuses are pending/filled/partially_filled —
          // 'active' is not a legal status value; filtering on it
          // silently dropped every medicine charge from the invoice.
          supabase.from("comprehensive_prescriptions").select("id, medication_name, quantity").eq("patient_id", patientId).in("status", ["pending", "filled", "partially_filled"]),
          // Auto-fill insurance from the patient's latest verification — never re-typed.
          supabase.from("insurance_verifications" as any).select("provider_name, verified_at").eq("patient_id", patientId).order("verified_at", { ascending: false }).limit(1),
        ]);

        // P1-26: charges become invoice lines ONLY when they match a
        // priced service on the institution's service_pricing list.
        // Anything unmatched is reported as "not on the price list" —
        // a price is never invented or typed in here, and the server
        // re-derives every price again at creation.
        const needsRate: string[] = [];
        const fetchedItems: InvoiceServiceLine[] = [];
        const pushCharge = (label: string, qty: number, ...keywords: string[]) => {
          const svc = matchService(services, ...keywords);
          if (!svc) {
            needsRate.push(label);
            return;
          }
          const existing = fetchedItems.find((i) => i.service_pricing_id === svc.id);
          if (existing) existing.quantity += qty;
          else fetchedItems.push({ service_pricing_id: svc.id, quantity: qty });
        };

        (apptsRes.data || []).forEach((a: any) => {
          const label = `Consultation (${a.type?.replace("_", " ") || "General"})`;
          pushCharge(label, 1, a.type || "", "consultation");
        });
        (labsRes.data || []).forEach((l: any) => {
          const label = `Lab Test: ${l.test_type}`;
          pushCharge(label, 1, l.test_type || "", "lab");
        });
        (rxsRes.data || []).forEach((r: any) => {
          const qty = r.quantity || 1;
          const label = `Rx: ${r.medication_name}`;
          pushCharge(label, qty, r.medication_name || "");
        });

        if (fetchedItems.length > 0) {
          setInvoiceForm((prev) => {
            const update: any = { ...prev, items: fetchedItems };
            // Auto-fill insurance provider from verification — staff never re-types it.
            const ins = (insRes.data as any[])?.[0];
            if (ins?.provider_name && !prev.insurance_provider) {
              update.insurance_provider = ins.provider_name;
            }
            return update;
          });
          if (needsRate.length > 0) {
            toast.warning(
              `Auto-filled ${fetchedItems.length} priced services — ${needsRate.length} charge${needsRate.length === 1 ? " is" : "s are"} not on the price list and were left off: ${needsRate.slice(0, 3).join(", ")}${needsRate.length > 3 ? "…" : ""}`
            );
          } else {
            toast.success(`Auto-filled ${fetchedItems.length} line items from patient system charges`);
          }
        } else if (needsRate.length > 0) {
          toast.warning(
            `Found ${needsRate.length} charge${needsRate.length === 1 ? "" : "s"}, but none are on this institution's price list yet — add the services and their prices first: ${needsRate.slice(0, 3).join(", ")}${needsRate.length > 3 ? "…" : ""}`
          );
        } else {
          toast.info("No pending system charges found for this patient");
        }
      }
    } catch (e) {
      console.error("Error auto-filling patient charges:", e);
    } finally {
      setLoadingCharges(false);
    }
  };

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_mode: "cash" as "cash" | "card" | "mobile_money" | "insurance" | "bank_transfer" | "cheque",
    reference_number: "",
  });

  const subtotal = serviceLinesSubtotal(invoiceForm.items, services);
  const totalAmount = subtotal + invoiceForm.tax - invoiceForm.discount;

  const handleCreateInvoice = async () => {
    if (!invoiceForm.patient_name.trim() || invoiceForm.items.length === 0) return;
    if (invoiceForm.items.some((i) => !i.service_pricing_id)) {
      toast.error("Every line needs a priced service — pick one from the price list, or create it right in the line");
      return;
    }
    setCreating(true);
    const result = await createInvoice({
      patient_name: invoiceForm.patient_name,
      lines: buildInvoiceLinesPayload(invoiceForm.items),
      tax: invoiceForm.tax,
      discount: invoiceForm.discount,
      due_date: invoiceForm.due_date || undefined,
      notes: invoiceForm.notes || undefined,
      insurance_provider: invoiceForm.insurance_provider || undefined,
    });
    if (result) {
      setInvoiceForm({
        patient_name: "",
        items: [emptyServiceLine()],
        tax: 0,
        discount: 0,
        due_date: "",
        notes: "",
        insurance_provider: "",
      });
      setIsInvoiceDialogOpen(false);
    }
    setCreating(false);
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || paymentForm.amount <= 0) return;
    setCreating(true);
    await recordPayment({
      invoice_id: selectedInvoice.id,
      amount: paymentForm.amount,
      payment_mode: paymentForm.payment_mode,
      reference_number: paymentForm.reference_number || undefined,
    });
    setPaymentForm({ amount: 0, payment_mode: "cash", reference_number: "" });
    setIsPaymentDialogOpen(false);
    setSelectedInvoice(null);
    setCreating(false);
  };

  const openPaymentDialog = (invoice: BillingInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({ amount: invoice.balance || 0, payment_mode: "cash", reference_number: "" });
    setIsPaymentDialogOpen(true);
  };

  const InvoiceCard = ({ invoice }: { invoice: BillingInvoice }) => {
    const status = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
    return (
      <div className="p-4 rounded-xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 font-sans space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">{invoice.invoice_number}</span>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${status.pillColor}`}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                exportInvoicePDF(
                  {
                    invoiceNumber: invoice.invoice_number,
                    date: format(new Date(invoice.created_at || Date.now()), "yyyy-MM-dd"),
                    patientName: invoice.patient_name,
                    items: Array.isArray(invoice.items)
                      ? invoice.items.map((i: any) => ({
                          description: i.description || "Medical Service",
                          quantity: i.quantity || 1,
                          unitPrice: i.unit_price || 0,
                          total: i.total || (i.quantity || 1) * (i.unit_price || 0),
                        }))
                      : [{ description: "Hospital Services", quantity: 1, unitPrice: invoice.total_amount || 0, total: invoice.total_amount || 0 }],
                    subtotal: invoice.subtotal || invoice.total_amount || 0,
                    tax: invoice.tax || 0,
                    discount: invoice.discount || 0,
                    total: invoice.total_amount || 0,
                    paidAmount: invoice.paid_amount || 0,
                    balance: invoice.balance || 0,
                    notes: invoice.notes,
                  },
                  {
                    title: "Official Invoice",
                    institutionName: "Doc-O-Clock Healthcare",
                    currency: currency,
                  }
                )
              }
              className="px-2.5 py-1 rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1 hover:bg-canvas-mist dark:hover:bg-slate-800"
            >
              <Printer className="h-3 w-3" /> PDF
            </button>
            {invoice.balance > 0 && (
              <button onClick={() => openPaymentDialog(invoice)} className="px-2.5 py-1 rounded-md bg-primary-500 text-white text-xs font-semibold flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Pay
              </button>
            )}
          </div>
        </div>
        <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">{invoice.patient_name}</p>
        <div className="flex items-center gap-4 text-xs font-bold text-graphite-500 dark:text-slate-400">
          <span>Total: K{invoice.total_amount?.toLocaleString()}</span>
          <span>Paid: K{invoice.paid_amount?.toLocaleString()}</span>
          {invoice.balance > 0 && <span className="text-error-500">Balance: K{invoice.balance?.toLocaleString()}</span>}
        </div>
        {invoice.insurance_provider && (
          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-primary-50 dark:bg-primary-500/20 text-primary-500 dark:text-primary-300">
            {invoice.insurance_provider}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Billing & Accounts Dashboard</h1>
          <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">Invoicing, payments, insurance claims & financial reconciliation</p>
        </div>
        <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
          <DialogTrigger asChild>
            <button className="px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-600 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> New Invoice
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800">
            <DialogHeader><DialogTitle className="font-semibold text-base">Create Hospital Invoice</DialogTitle></DialogHeader>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">Patient Name *</label>
                    {invoiceForm.patient_name.trim().length >= 2 && (
                      <button
                        type="button"
                        onClick={() => autoFillPatientSystemCharges(invoiceForm.patient_name)}
                        disabled={loadingCharges}
                        className="text-xs font-bold text-primary-500 hover:underline flex items-center"
                      >
                        {loadingCharges ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Auto-fill charges
                      </button>
                    )}
                  </div>
                  <input
                    value={invoiceForm.patient_name}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, patient_name: e.target.value }))}
                    placeholder="Enter or search patient name..."
                    className="w-full p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">Insurance Provider</label>
                  <input
                    value={invoiceForm.insurance_provider}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, insurance_provider: e.target.value }))}
                    placeholder="Optional insurance scheme"
                    className="w-full p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">Invoice Line Items (priced services)</label>
                </div>
                <ServiceLineEditor
                  lines={invoiceForm.items}
                  services={services}
                  onChange={(items) => setInvoiceForm((prev) => ({ ...prev, items }))}
                  formatPrice={(n) => `K${n.toLocaleString()}`}
                  institutionId={institutionId}
                  canCreateService={canCreateService}
                  onServiceCreated={() => void refreshServices()}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">Tax Amount</label>
                  <input
                    type="number"
                    value={invoiceForm.tax}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">Discount</label>
                  <input
                    type="number"
                    value={invoiceForm.discount}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">Due Date</label>
                  <input
                    type="date"
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, due_date: e.target.value }))}
                    className="w-full p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-canvas dark:bg-slate-950 border border-canvas-silk dark:border-slate-800 space-y-1">
                <div className="flex justify-between font-bold text-graphite-500 dark:text-slate-400"><span>Subtotal</span><span>K{subtotal.toLocaleString()}</span></div>
                {invoiceForm.tax > 0 && <div className="flex justify-between font-bold text-graphite-500 dark:text-slate-400"><span>Tax</span><span>K{invoiceForm.tax.toLocaleString()}</span></div>}
                {invoiceForm.discount > 0 && <div className="flex justify-between font-bold text-graphite-500 dark:text-slate-400"><span>Discount</span><span>-K{invoiceForm.discount.toLocaleString()}</span></div>}
                <div className="flex justify-between font-bold text-sm text-primary-500 pt-1 border-t border-canvas-silk dark:border-slate-800"><span>Grand Total</span><span>K{totalAmount.toLocaleString()}</span></div>
              </div>

              <button
                onClick={handleCreateInvoice}
                disabled={creating || !invoiceForm.patient_name.trim()}
                className="w-full py-2.5 rounded-xl bg-primary-500 text-white font-semibold text-xs shadow-xs"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Create Official Invoice"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800">
          <DialogHeader><DialogTitle className="font-semibold text-base">Record Payment — {selectedInvoice?.invoice_number}</DialogTitle></DialogHeader>
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">Payment Amount (Balance: K{selectedInvoice?.balance?.toLocaleString()})</label>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">Payment Mode</label>
              <Select value={paymentForm.payment_mode} onValueChange={(v) => setPaymentForm((prev) => ({ ...prev, payment_mode: v as any }))}>
                <SelectTrigger className="mt-1 border-graphite-300 dark:border-slate-700 font-bold text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Credit / Debit Card</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money (Airtel/MTN/Zamtel)</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="insurance">Insurance Claim Settlement</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">Reference Number</label>
              <input
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference_number: e.target.value }))}
                placeholder="Transaction or receipt reference"
                className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold"
              />
            </div>
            <button
              onClick={handleRecordPayment}
              disabled={creating || paymentForm.amount <= 0}
              className="w-full py-2.5 rounded-xl bg-success-500 text-white font-semibold text-xs shadow-xs"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Record & Post Payment"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs text-center">
          <DollarSign className="h-5 w-5 text-success-500 mx-auto mb-1" />
          <p className="text-2xl font-bold font-mono text-success-500">K{todayCollections.toLocaleString()}</p>
          <p className="text-xs font-bold text-graphite-500 dark:text-slate-400">Today's Total Collections</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs text-center">
          <CreditCard className="h-5 w-5 text-primary-500 mx-auto mb-1" />
          <p className="text-2xl font-bold font-mono text-primary-500">{pendingInvoices.length}</p>
          <p className="text-xs font-bold text-graphite-500 dark:text-slate-400">Pending Invoices</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs text-center">
          <Shield className="h-5 w-5 text-error-500 mx-auto mb-1" />
          <p className="text-2xl font-bold font-mono text-error-500">{pendingClaims.length}</p>
          <p className="text-xs font-bold text-graphite-500 dark:text-slate-400">Pending Insurance Claims</p>
        </div>
      </div>

      {/* Module Tabs */}
      <Tabs defaultValue="invoices">
        <TabsList className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 rounded-xl">
          <TabsTrigger value="invoices" className="text-xs font-semibold px-4 py-1.5 rounded-md data-[state=active]:bg-primary-500 data-[state=active]:text-white">
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="accounting" className="text-xs font-semibold px-4 py-1.5 rounded-md data-[state=active]:bg-primary-500 data-[state=active]:text-white">
            Multi-Country Accounting
          </TabsTrigger>
          <TabsTrigger value="claims" className="text-xs font-semibold px-4 py-1.5 rounded-md data-[state=active]:bg-primary-500 data-[state=active]:text-white">
            Insurance Claims ({claims.length})
          </TabsTrigger>
          <TabsTrigger value="tpa" className="text-xs font-semibold px-4 py-1.5 rounded-md data-[state=active]:bg-primary-500 data-[state=active]:text-white">
            TPA Workflow
          </TabsTrigger>
          <TabsTrigger value="denials" className="text-xs font-semibold px-4 py-1.5 rounded-md data-[state=active]:bg-primary-500 data-[state=active]:text-white">
            Denials
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-3 mt-4">
          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-graphite-500 dark:text-slate-400">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-graphite-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-canvas-silk dark:border-slate-800">
              No invoices yet. Click "New Invoice" to create one.
            </div>
          ) : (
            invoices.map((inv) => <InvoiceCard key={inv.id} invoice={inv} />)
          )}
        </TabsContent>

        <TabsContent value="accounting" className="mt-4">
          <MultiCountryAccounting institutionId={institutionId} />
        </TabsContent>

        <TabsContent value="claims" className="space-y-3 mt-4">
          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-graphite-500 dark:text-slate-400">Loading claims...</div>
          ) : claims.length === 0 ? (
            <div className="p-8 text-center text-xs text-graphite-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-canvas-silk dark:border-slate-800">
              No insurance claims submitted yet.
            </div>
          ) : (
            claims.map((claim) => (
              <div key={claim.id} className="p-4 rounded-xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{claim.patient_name}</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${
                    claim.status === "approved" ? "bg-success-500" : claim.status === "rejected" ? "bg-error-500" : "bg-warning-500"
                  }`}>
                    {claim.status}
                  </span>
                </div>
                <p className="text-graphite-500 dark:text-slate-400">
                  {claim.insurance_provider} • Policy: {claim.policy_number} • K{claim.claim_amount.toLocaleString()}
                </p>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="tpa" className="mt-4">
          <InsuranceClaimWorkflow />
        </TabsContent>

        <TabsContent value="denials" className="mt-4">
          <DenialWorkqueue />
        </TabsContent>
      </Tabs>
    </div>
  );
};
