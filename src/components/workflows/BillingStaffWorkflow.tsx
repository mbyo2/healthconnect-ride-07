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
import { MultiCountryAccounting } from "@/components/accounting/MultiCountryAccounting";
import { exportInvoicePDF } from "@/utils/pdfExport";
import { useCurrency } from "@/hooks/use-currency";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; pillColor: string }> = {
  draft: { label: "Draft", pillColor: "bg-[#676879] text-white" },
  sent: { label: "Sent", pillColor: "bg-[#579bfc] text-white" },
  paid: { label: "Paid", pillColor: "bg-[#00c875] text-white" },
  partial: { label: "Partial", pillColor: "bg-[#fdab3d] text-white" },
  overdue: { label: "Overdue", pillColor: "bg-[#e2445c] text-white" },
  cancelled: { label: "Cancelled", pillColor: "bg-[#676879] text-white" },
  refunded: { label: "Refunded", pillColor: "bg-[#a25ddc] text-white" },
};

export const BillingStaffWorkflow = () => {
  const {
    invoices, claims, loading,
    todayCollections, pendingInvoices, pendingClaims,
    createInvoice, recordPayment,
  } = useBillingModule();
  const { currency } = useCurrency();

  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null);
  const [creating, setCreating] = useState(false);

  const [invoiceForm, setInvoiceForm] = useState({
    patient_name: "",
    items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }] as Array<{ description: string; quantity: number; unit_price: number; total: number }>,
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
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .or(`first_name.ilike.%${patientName}%,last_name.ilike.%${patientName}%`)
        .limit(1);

      if (profiles && profiles.length > 0) {
        const patientId = profiles[0].id;
        const [apptsRes, labsRes, rxsRes] = await Promise.all([
          supabase.from("appointments").select("id, type, date").eq("patient_id", patientId).eq("status", "completed"),
          supabase.from("lab_tests").select("id, test_type, price, total_amount").eq("patient_id", patientId).eq("payment_status", "pending"),
          supabase.from("comprehensive_prescriptions").select("id, medication_name, quantity").eq("patient_id", patientId).eq("status", "active"),
        ]);

        const fetchedItems: Array<{ description: string; quantity: number; unit_price: number; total: number }> = [];

        (apptsRes.data || []).forEach((a: any) => {
          fetchedItems.push({ description: `Consultation (${a.type?.replace("_", " ") || "General"})`, quantity: 1, unit_price: 150, total: 150 });
        });
        (labsRes.data || []).forEach((l: any) => {
          const price = l.price || l.total_amount || 200;
          fetchedItems.push({ description: `Lab Test: ${l.test_type}`, quantity: 1, unit_price: price, total: price });
        });
        (rxsRes.data || []).forEach((r: any) => {
          const qty = r.quantity || 1;
          fetchedItems.push({ description: `Rx: ${r.medication_name}`, quantity: qty, unit_price: 50, total: 50 * qty });
        });

        if (fetchedItems.length > 0) {
          setInvoiceForm((prev) => ({ ...prev, items: fetchedItems }));
          toast.success(`Auto-filled ${fetchedItems.length} line items from patient system charges`);
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

  const addItem = () => {
    setInvoiceForm((prev) => ({
      ...prev,
      items: [...prev.items, { description: "", quantity: 1, unit_price: 0, total: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    setInvoiceForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setInvoiceForm((prev) => {
      const items = [...prev.items];
      (items[index] as any)[field] = value;
      items[index].total = items[index].quantity * items[index].unit_price;
      return { ...prev, items };
    });
  };

  const subtotal = invoiceForm.items.reduce((sum, item) => sum + item.total, 0);
  const totalAmount = subtotal + invoiceForm.tax - invoiceForm.discount;

  const handleCreateInvoice = async () => {
    if (!invoiceForm.patient_name.trim() || invoiceForm.items.length === 0) return;
    setCreating(true);
    const result = await createInvoice({
      patient_name: invoiceForm.patient_name,
      items: invoiceForm.items,
      subtotal,
      tax: invoiceForm.tax,
      discount: invoiceForm.discount,
      total_amount: totalAmount,
      due_date: invoiceForm.due_date || undefined,
      notes: invoiceForm.notes || undefined,
      insurance_provider: invoiceForm.insurance_provider || undefined,
    });
    if (result) {
      setInvoiceForm({
        patient_name: "",
        items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
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
      <div className="p-4 rounded-xl border border-[#e6e9ef] bg-white font-sans space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-900 text-xs">{invoice.invoice_number}</span>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${status.pillColor}`}>
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
              className="px-2.5 py-1 rounded-md border border-[#c3c6d4] text-[11px] font-bold flex items-center gap-1 hover:bg-[#f0f2f7]"
            >
              <Printer className="h-3 w-3" /> PDF
            </button>
            {invoice.balance > 0 && (
              <button onClick={() => openPaymentDialog(invoice)} className="px-2.5 py-1 rounded-md bg-[#0073ea] text-white text-[11px] font-extrabold flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Pay
              </button>
            )}
          </div>
        </div>
        <p className="font-extrabold text-xs text-slate-900">{invoice.patient_name}</p>
        <div className="flex items-center gap-4 text-xs font-bold text-[#676879]">
          <span>Total: K{invoice.total_amount?.toLocaleString()}</span>
          <span>Paid: K{invoice.paid_amount?.toLocaleString()}</span>
          {invoice.balance > 0 && <span className="text-[#e2445c]">Balance: K{invoice.balance?.toLocaleString()}</span>}
        </div>
        {invoice.insurance_provider && (
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#e5f0ff] text-[#0073ea]">
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
          <h1 className="text-xl font-extrabold tracking-tight">Billing & Accounts WorkOS Dashboard</h1>
          <p className="text-xs text-[#676879] font-medium">Invoicing, payments, insurance claims & financial reconciliation</p>
        </div>
        <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
          <DialogTrigger asChild>
            <button className="px-4 py-2 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> New Invoice
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-[#e6e9ef]">
            <DialogHeader><DialogTitle className="font-extrabold text-base">Create Hospital Invoice</DialogTitle></DialogHeader>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-extrabold text-[#676879] uppercase">Patient Name *</label>
                    {invoiceForm.patient_name.trim().length >= 2 && (
                      <button
                        type="button"
                        onClick={() => autoFillPatientSystemCharges(invoiceForm.patient_name)}
                        disabled={loadingCharges}
                        className="text-[10px] font-bold text-[#0073ea] hover:underline flex items-center"
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
                    className="w-full p-2 rounded-md border border-[#c3c6d4] font-bold"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#676879] uppercase">Insurance Provider</label>
                  <input
                    value={invoiceForm.insurance_provider}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, insurance_provider: e.target.value }))}
                    placeholder="Optional insurance scheme"
                    className="w-full p-2 rounded-md border border-[#c3c6d4] font-bold"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-extrabold text-[#676879] uppercase">Invoice Line Items</label>
                  <button onClick={addItem} className="px-2.5 py-1 rounded-md border border-[#c3c6d4] text-[10px] font-bold flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                </div>
                {invoiceForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
                    <div className="col-span-5">
                      <input
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        className="w-full p-2 rounded-md border border-[#c3c6d4] font-bold"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                        className="w-full p-2 rounded-md border border-[#c3c6d4] font-bold text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                        className="w-full p-2 rounded-md border border-[#c3c6d4] font-bold"
                      />
                    </div>
                    <div className="col-span-2 font-mono font-bold text-slate-900 text-right pr-2">
                      K{item.total.toLocaleString()}
                    </div>
                    <div className="col-span-1 text-center">
                      {invoiceForm.items.length > 1 && (
                        <button onClick={() => removeItem(index)} className="p-1 text-[#e2445c]">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-extrabold text-[#676879] uppercase">Tax Amount</label>
                  <input
                    type="number"
                    value={invoiceForm.tax}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 rounded-md border border-[#c3c6d4] font-bold"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#676879] uppercase">Discount</label>
                  <input
                    type="number"
                    value={invoiceForm.discount}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 rounded-md border border-[#c3c6d4] font-bold"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#676879] uppercase">Due Date</label>
                  <input
                    type="date"
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, due_date: e.target.value }))}
                    className="w-full p-2 rounded-md border border-[#c3c6d4] font-bold"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#f5f6f8] border border-[#e6e9ef] space-y-1">
                <div className="flex justify-between font-bold text-[#676879]"><span>Subtotal</span><span>K{subtotal.toLocaleString()}</span></div>
                {invoiceForm.tax > 0 && <div className="flex justify-between font-bold text-[#676879]"><span>Tax</span><span>K{invoiceForm.tax.toLocaleString()}</span></div>}
                {invoiceForm.discount > 0 && <div className="flex justify-between font-bold text-[#676879]"><span>Discount</span><span>-K{invoiceForm.discount.toLocaleString()}</span></div>}
                <div className="flex justify-between font-black text-sm text-[#0073ea] pt-1 border-t border-[#e6e9ef]"><span>Grand Total</span><span>K{totalAmount.toLocaleString()}</span></div>
              </div>

              <button
                onClick={handleCreateInvoice}
                disabled={creating || !invoiceForm.patient_name.trim()}
                className="w-full py-2.5 rounded-xl bg-[#0073ea] text-white font-extrabold text-xs shadow-xs"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Create Official Invoice"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="bg-white border border-[#e6e9ef]">
          <DialogHeader><DialogTitle className="font-extrabold text-base">Record Payment — {selectedInvoice?.invoice_number}</DialogTitle></DialogHeader>
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-extrabold text-[#676879] uppercase">Payment Amount (Balance: K{selectedInvoice?.balance?.toLocaleString()})</label>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold"
              />
            </div>
            <div>
              <label className="font-extrabold text-[#676879] uppercase">Payment Mode</label>
              <Select value={paymentForm.payment_mode} onValueChange={(v) => setPaymentForm((prev) => ({ ...prev, payment_mode: v as any }))}>
                <SelectTrigger className="mt-1 border-[#c3c6d4] font-bold text-xs"><SelectValue /></SelectTrigger>
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
              <label className="font-extrabold text-[#676879] uppercase">Reference Number</label>
              <input
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference_number: e.target.value }))}
                placeholder="Transaction or receipt reference"
                className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold"
              />
            </div>
            <button
              onClick={handleRecordPayment}
              disabled={creating || paymentForm.amount <= 0}
              className="w-full py-2.5 rounded-xl bg-[#00c875] text-white font-extrabold text-xs shadow-xs"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Record & Post Payment"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#e6e9ef] shadow-xs text-center">
          <DollarSign className="h-5 w-5 text-[#00c875] mx-auto mb-1" />
          <p className="text-2xl font-black font-mono text-[#00c875]">K{todayCollections.toLocaleString()}</p>
          <p className="text-[11px] font-bold text-[#676879]">Today's Total Collections</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#e6e9ef] shadow-xs text-center">
          <CreditCard className="h-5 w-5 text-[#0073ea] mx-auto mb-1" />
          <p className="text-2xl font-black font-mono text-[#0073ea]">{pendingInvoices.length}</p>
          <p className="text-[11px] font-bold text-[#676879]">Pending Invoices</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#e6e9ef] shadow-xs text-center">
          <Shield className="h-5 w-5 text-[#e2445c] mx-auto mb-1" />
          <p className="text-2xl font-black font-mono text-[#e2445c]">{pendingClaims.length}</p>
          <p className="text-[11px] font-bold text-[#676879]">Pending Insurance Claims</p>
        </div>
      </div>

      {/* WorkOS Module Tabs */}
      <Tabs defaultValue="invoices">
        <TabsList className="flex items-center gap-1 p-1 bg-white border border-[#e6e9ef] rounded-xl">
          <TabsTrigger value="invoices" className="text-xs font-extrabold px-4 py-1.5 rounded-md data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="accounting" className="text-xs font-extrabold px-4 py-1.5 rounded-md data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
            Multi-Country Accounting
          </TabsTrigger>
          <TabsTrigger value="claims" className="text-xs font-extrabold px-4 py-1.5 rounded-md data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
            Insurance Claims ({claims.length})
          </TabsTrigger>
          <TabsTrigger value="tpa" className="text-xs font-extrabold px-4 py-1.5 rounded-md data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
            TPA Workflow
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-3 mt-4">
          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-[#676879]">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#676879] bg-white rounded-2xl border border-[#e6e9ef]">
              No invoices yet. Click "New Invoice" to create one.
            </div>
          ) : (
            invoices.map((inv) => <InvoiceCard key={inv.id} invoice={inv} />)
          )}
        </TabsContent>

        <TabsContent value="accounting" className="mt-4">
          <MultiCountryAccounting />
        </TabsContent>

        <TabsContent value="claims" className="space-y-3 mt-4">
          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-[#676879]">Loading claims...</div>
          ) : claims.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#676879] bg-white rounded-2xl border border-[#e6e9ef]">
              No insurance claims submitted yet.
            </div>
          ) : (
            claims.map((claim) => (
              <div key={claim.id} className="p-4 rounded-xl border border-[#e6e9ef] bg-white space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900">{claim.patient_name}</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white ${
                    claim.status === "approved" ? "bg-[#00c875]" : claim.status === "rejected" ? "bg-[#e2445c]" : "bg-[#fdab3d]"
                  }`}>
                    {claim.status}
                  </span>
                </div>
                <p className="text-[#676879]">
                  {claim.insurance_provider} • Policy: {claim.policy_number} • K{claim.claim_amount.toLocaleString()}
                </p>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="tpa" className="mt-4">
          <InsuranceClaimWorkflow />
        </TabsContent>
      </Tabs>
    </div>
  );
};
