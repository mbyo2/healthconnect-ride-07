// @ts-nocheck -- pre-existing loose Supabase typings; tracked for cleanup
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Receipt, CheckCircle, Clock, AlertCircle, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonLine, SkeletonTableRows } from "@/components/ui/skeleton-kit";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { useCurrency } from "@/hooks/use-currency";
import { downloadReceiptPdf } from "@/utils/receiptPdf";
import { useLencoPayment, LENCO_OPERATORS, type LencoOperator } from "@/hooks/useLencoPayment";
import { ServiceLineEditor, useInstitutionServices } from "@/components/billing/InvoiceServiceLines";
import { InstitutionPatientPicker } from "@/components/hospital/InstitutionPatientPicker";
import { useInstitutionTeam } from "@/hooks/useInstitutionTeam";
import type { InstitutionPatient } from "@/lib/patients";
import {
  type InvoiceServiceLine,
  emptyServiceLine,
  buildInvoiceLinesPayload,
  serviceLinesSubtotal,
} from "@/lib/invoicePricing";
import { friendlyErrorMessage } from "@/utils/friendly-error";

interface Invoice {
  id: string;
  invoice_number: string;
  patient_id: string;
  patient_name: string;
  items: any[];
  subtotal: number;
  tax: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: string;
  due_date: string;
  notes: string;
  created_at: string;
}

export const Billing = () => {
  const { user } = useAuth();
  const { institutionId, institution } = useInstitutionContext();
  const { formatPrice } = useCurrency();
  const { createCollection, verifyPayment, verifying } = useLencoPayment();
  const [lencoPayInvoice, setLencoPayInvoice] = useState<Invoice | null>(null);
  const [lencoPhone, setLencoPhone] = useState("");
  const [lencoOperator, setLencoOperator] = useState<LencoOperator>("mtn");
  const [lencoReference, setLencoReference] = useState<string | null>(null);
  const [lencoMessage, setLencoMessage] = useState("");
  const [lencoSending, setLencoSending] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showReceipt, setShowReceipt] = useState<Invoice | null>(null);
  const [markPaidInvoice, setMarkPaidInvoice] = useState<Invoice | null>(null);

  // Form state — P1-26: invoice lines are priced services chosen from
  // the institution's service_pricing list, never free-typed prices.
  // Patient Unity W3: the patient comes from the ONE roster picker
  // (search_institution_patients + create-on-missing) — the old
  // appointments-∪-registry derivation (which produced null ids for
  // registry patients) is gone.
  const { services, refresh: refreshServices } = useInstitutionServices(institutionId);
  const { isAdmin: canCreateService } = useInstitutionTeam(institutionId);
  const [selectedPatient, setSelectedPatient] = useState<InstitutionPatient | null>(null);
  const patientId = selectedPatient?.id ?? "";
  const [items, setItems] = useState<InvoiceServiceLine[]>([emptyServiceLine()]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [institutionId]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let query = supabase.from("billing_invoices").select("*").order("created_at", { ascending: false });
      if (institutionId) {
        query = query.eq("institution_id", institutionId);
      }
      const { data, error } = await query;
      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    // Display preview from the same catalogue the server prices from;
    // create_manual_invoice re-derives every figure at write time.
    const subtotal = serviceLinesSubtotal(items, services);
    const total = subtotal + tax - discount;
    return { subtotal, total };
  };

  const handleCreateInvoice = async () => {
    if (!patientId) {
      toast.error("Select a patient");
      return;
    }
    if (items.some(i => !i.service_pricing_id)) {
      toast.error("Every line needs a priced service — pick one from the price list, or create it right in the line");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any).rpc("create_manual_invoice", {
        p_institution_id: institutionId,
        p_patient_id: patientId,
        p_patient_name: selectedPatient?.name || "Unknown",
        p_lines: buildInvoiceLinesPayload(items),
        p_tax: tax,
        p_discount: discount,
        p_due_date: dueDate || null,
        p_notes: notes || null,
        p_insurance_provider: null,
      });

      if (error) throw error;

      toast.success(`Invoice ${(data as any)?.invoice_number} created`);
      setShowCreate(false);
      resetForm();
      fetchInvoices();
    } catch (err: any) {
      console.error("Failed to create invoice:", err);
      toast.error(friendlyErrorMessage(err, "Failed to create invoice"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (invoice: Invoice, paymentMode: string = "cash", referenceNumber?: string) => {
    // LEDGER BYPASS FIX (2026-10-10): Never update billing_invoices directly.
    // All payments go through billing_payments — the DB trigger recalculates
    // paid_amount/balance/status from the sum of payments. Direct invoice
    // updates bypass the payment ledger and allow marking invoices paid
    // without any money record.
    try {
      const { error } = await supabase.from("billing_payments").insert({
        institution_id: invoice.institution_id,
        invoice_id: invoice.id,
        amount: invoice.balance > 0 ? invoice.balance : invoice.total_amount,
        payment_mode: paymentMode,
        reference_number: referenceNumber || null,
        received_by: user?.id,
        notes: `Marked paid via ${paymentMode}`,
      });

      if (error) throw error;
      toast.success("Payment recorded — invoice updated from ledger");
      fetchInvoices();
    } catch (err: any) {
      toast.error(friendlyErrorMessage(err, "Failed to record payment"));
    }
  };

  // Collect an invoice payment via Lenco mobile money: a prompt goes to the
  // payer's phone; on "paid" the invoice is marked paid locally.
  const handlePayOnline = (invoice: Invoice) => {
    setLencoPhone("");
    setLencoReference(null);
    setLencoMessage("");
    setLencoPayInvoice(invoice);
  };

  const sendLencoPrompt = async () => {
    if (!lencoPayInvoice) return;
    if (lencoPhone.replace(/\D/g, "").length < 9) {
      toast.error("Enter the mobile-money phone number that will approve this payment");
      return;
    }
    setLencoSending(true);
    try {
      const res = await createCollection({
        amount: Math.round(Number(lencoPayInvoice.balance || lencoPayInvoice.total_amount) * 100) / 100,
        currency: "ZMW",
        reference_type: "invoice",
        reference_id: lencoPayInvoice.id,
        description: `Invoice ${lencoPayInvoice.invoice_number || lencoPayInvoice.id} — ${institution?.name || "Healthcare"}`,
        phone: lencoPhone,
        operator: lencoOperator,
        country: "zm",
      });
      if (res?.reference) {
        setLencoReference(res.reference);
        setLencoMessage(res.message || "Approve the payment on your phone, then tap \"I've approved\".");
        if (res.status === "paid") {
          await handleMarkPaid(lencoPayInvoice);
          setLencoPayInvoice(null);
          setLencoReference(null);
        }
      }
    } catch (err: any) {
      toast.error(friendlyErrorMessage(err, "Failed to start online payment"));
    } finally {
      setLencoSending(false);
    }
  };

  const checkLencoStatus = async () => {
    if (!lencoReference || !lencoPayInvoice) return;
    const r = await verifyPayment(lencoReference);
    if (!r) return;
    if (r.status === "paid") {
      await handleMarkPaid(lencoPayInvoice);
      toast.success("Invoice payment confirmed");
      setLencoPayInvoice(null);
      setLencoReference(null);
    } else if (r.status === "failed" || r.status === "cancelled") {
      toast.error("This payment did not complete. You can try again.");
      setLencoReference(null);
    } else {
      toast.info(r.message || "Still waiting — approve the prompt on your phone, then check again.");
    }
  };

  const handleDownloadReceipt = async (invoice: Invoice) => {
    try {
      await downloadReceiptPdf({
        title: "INVOICE RECEIPT",
        receiptNumber: invoice.invoice_number,
        date: new Date(invoice.created_at),
        issuerName: institution?.name || "Doc'O Clock",
        issuerAddress: institution?.address,
        issuerPhone: institution?.phone,
        customerName: invoice.patient_name,
        items: invoice.items.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          total: item.quantity * item.unit_price,
        })),
        discount: invoice.discount,
        tax: invoice.tax,
        amountPaid: invoice.paid_amount,
        currency: "ZMW",
      });
      toast.success("Receipt downloaded");
    } catch (err) {
      toast.error("Failed to generate receipt");
    }
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setItems([emptyServiceLine()]);
    setTax(0);
    setDiscount(0);
    setDueDate("");
    setNotes("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="h-3 w-3" /> Paid</span>;
      case "overdue":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle className="h-3 w-3" /> Overdue</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3" /> Pending</span>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl" role="status" aria-label="Loading billing and invoices">
        <div className="flex justify-between items-center mb-6" aria-hidden>
          <div className="space-y-2">
            <SkeletonLine className="h-8 w-56" />
            <SkeletonLine className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
        <div className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden" aria-hidden>
          <table className="w-full">
            <tbody className="divide-y divide-canvas-silk dark:divide-slate-800">
              <SkeletonTableRows rows={6} cells={4} />
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Billing & Invoices</h1>
          <p className="text-muted-foreground">Create invoices, track payments, generate receipts</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Invoice
        </Button>
      </div>

      <div className="grid gap-4">
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices yet. Create your first invoice to get started.</p>
            </CardContent>
          </Card>
        ) : (
          invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{invoice.invoice_number}</h3>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {invoice.patient_name} • {new Date(invoice.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-lg font-bold mt-2">{formatPrice(invoice.total_amount)}</p>
                    {invoice.balance > 0 && (
                      <p className="text-sm text-muted-foreground">Balance: {formatPrice(invoice.balance)}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => setShowReceipt(invoice)}>
                      <Receipt className="h-4 w-4 mr-1" /> Receipt
                    </Button>
                    <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => handleDownloadReceipt(invoice)}>
                      <Download className="h-4 w-4 mr-1" /> PDF
                    </Button>
                    {invoice.status !== "paid" && (
                      <>
                        {institution?.payment_mode === "own" ? (
                          <p className="text-xs text-muted-foreground italic">
                            This facility handles its own payments — please pay them directly.
                          </p>
                        ) : (
                          <Button size="sm" className="min-h-[44px] bg-blue-600 hover:bg-blue-700" onClick={() => handlePayOnline(invoice)}>
                            <CheckCircle className="h-4 w-4 mr-1" /> Pay Online
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => setMarkPaidInvoice(invoice)}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Mark Paid
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <InstitutionPatientPicker
              institutionId={institutionId}
              value={selectedPatient}
              onChange={setSelectedPatient}
              label="Patient"
            />

            <div>
              <Label>Services (priced from the price list)</Label>
              <ServiceLineEditor
                lines={items}
                services={services}
                onChange={setItems}
                formatPrice={formatPrice}
                institutionId={institutionId}
                canCreateService={canCreateService}
                onServiceCreated={() => void refreshServices()}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Tax</Label>
                <Input type="number" value={tax} onChange={(e) => setTax(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Discount</Label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between"><span>Subtotal:</span><span>{formatPrice(calculateTotals().subtotal)}</span></div>
              <div className="flex justify-between"><span>Tax:</span><span>{formatPrice(tax)}</span></div>
              <div className="flex justify-between"><span>Discount:</span><span>-{formatPrice(discount)}</span></div>
              <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                <span>Total:</span><span>{formatPrice(calculateTotals().total)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateInvoice} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog - Doc'O Clock branded */}
      <Dialog open={!!showReceipt} onOpenChange={() => setShowReceipt(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {showReceipt && (
            <div className="bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
              {/* Header with Doc'O Clock branding */}
              <div className="bg-primary-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <span className="bg-white text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold">D</span>
                      Doc'O Clock
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">Healthcare Services • doc0clock.online</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-200">RECEIPT</p>
                    <p className="font-bold">{showReceipt.invoice_number}</p>
                  </div>
                </div>
              </div>

              {/* Institution info */}
              {institution && (
                <div className="bg-blue-50 dark:bg-blue-950/40 px-6 py-4 border-b dark:border-slate-700">
                  <p className="font-semibold text-gray-900 dark:text-slate-100">{institution.name}</p>
                  {institution.address && <p className="text-sm text-gray-600 dark:text-slate-400">{institution.address}</p>}
                  {(institution.city || institution.phone) && (
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      {[institution.city, institution.phone].filter(Boolean).join(" • ")}
                    </p>
                  )}
                </div>
              )}

              <div className="p-6 space-y-4">
                {/* Patient and invoice info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wide">Billed To</p>
                    <p className="font-semibold">{showReceipt.patient_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wide">Date</p>
                    <p className="font-semibold">{new Date(showReceipt.created_at).toLocaleDateString()}</p>
                    {showReceipt.due_date && (
                      <>
                        <p className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wide mt-2">Due Date</p>
                        <p className="font-semibold">{new Date(showReceipt.due_date).toLocaleDateString()}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <div className="flex justify-center">
                  {getStatusBadge(showReceipt.status)}
                </div>

                {/* Items table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-800">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-slate-400">Description</th>
                        <th className="text-center px-4 py-2 font-medium text-gray-600 dark:text-slate-400">Qty</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-600 dark:text-slate-400">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {showReceipt.items.map((item: any, idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="px-4 py-2">{item.description}</td>
                          <td className="text-center px-4 py-2">{item.quantity}</td>
                          <td className="text-right px-4 py-2">{formatPrice(item.quantity * item.unit_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600 dark:text-slate-400">Subtotal:</span><span>{formatPrice(showReceipt.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600 dark:text-slate-400">Tax:</span><span>{formatPrice(showReceipt.tax)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600 dark:text-slate-400">Discount:</span><span>-{formatPrice(showReceipt.discount)}</span></div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>Total:</span><span>{formatPrice(showReceipt.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-medium"><span>Paid:</span><span>{formatPrice(showReceipt.paid_amount)}</span></div>
                  <div className="flex justify-between font-medium"><span>Balance Due:</span><span className={showReceipt.balance > 0 ? "text-red-600" : "text-green-600"}>{formatPrice(showReceipt.balance)}</span></div>
                </div>

                {showReceipt.notes && (
                  <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded text-sm text-gray-600 dark:text-slate-400 italic">
                    {showReceipt.notes}
                  </div>
                )}

                {/* Footer */}
                <div className="text-center text-xs text-gray-500 dark:text-slate-400 pt-4 border-t">
                  <p>Thank you for choosing Doc'O Clock</p>
                  <p className="mt-1">Powered by Doc'O Clock • doc0clock.online</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceipt(null)}>Close</Button>
            {showReceipt && (
              <Button onClick={() => handleDownloadReceipt(showReceipt)}>
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Paid — manual/offline payment confirmation (trust gate: never record unverified) */}
      <Dialog open={!!markPaidInvoice} onOpenChange={(o) => { if (!o) setMarkPaidInvoice(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record manual payment?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This marks invoice <span className="font-bold text-foreground">{markPaidInvoice?.invoice_number}</span> as
            paid based on an offline/cash payment. Only continue if you have received the funds.
          </p>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="min-h-[44px]" onClick={() => setMarkPaidInvoice(null)}>
              Cancel
            </Button>
            <Button
              className="min-h-[44px]"
              onClick={async () => {
                if (markPaidInvoice) await handleMarkPaid(markPaidInvoice);
                setMarkPaidInvoice(null);
              }}
            >
              Yes, mark paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Online — Lenco Mobile Money collection */}
      <Dialog open={!!lencoPayInvoice} onOpenChange={(o) => { if (!o) { setLencoPayInvoice(null); setLencoReference(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay with Mobile Money</DialogTitle>
          </DialogHeader>
          {lencoPayInvoice && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Invoice {lencoPayInvoice.invoice_number} — {formatPrice(Number(lencoPayInvoice.balance || lencoPayInvoice.total_amount))}
                {' '}via MTN, Airtel or Zamtel.
              </p>
              {!lencoReference ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Operator</Label>
                      <select
                        aria-label="Mobile money operator"
                        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={lencoOperator}
                        onChange={(e) => setLencoOperator(e.target.value as LencoOperator)}
                      >
                        {LENCO_OPERATORS.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label} ({op.hint})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>MoMo phone number</Label>
                      <Input
                        type="tel"
                        placeholder="0971234567"
                        className="h-11"
                        value={lencoPhone}
                        onChange={(e) => setLencoPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button className="w-full" disabled={lencoSending} onClick={sendLencoPrompt}>
                      {lencoSending ? "Sending prompt…" : "Send payment prompt"}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                    <p className="text-sm font-semibold">Check your phone</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{lencoMessage}</p>
                  </div>
                  <DialogFooter className="flex gap-2">
                    <Button className="flex-1" disabled={verifying} onClick={checkLencoStatus}>
                      {verifying ? "Checking…" : "I've approved — check status"}
                    </Button>
                    <Button variant="outline" onClick={() => setLencoReference(null)}>Cancel</Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;
