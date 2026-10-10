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
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { useCurrency } from "@/hooks/use-currency";
import { downloadReceiptPdf } from "@/utils/receiptPdf";
import { useLencoPayment, LENCO_OPERATORS, type LencoOperator } from "@/hooks/useLencoPayment";

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
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);

  // Form state
  const [patientId, setPatientId] = useState("");
  const [items, setItems] = useState([{ description: "", quantity: 1, unit_price: 0 }]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchPatients();
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

  const fetchPatients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get patients from appointments (provider has relationship via appointment)
      const { data: appointments } = await supabase
        .from("appointments")
        .select("patient_id")
        .eq("provider_id", user.id);

      const patientIds = [...new Set((appointments || []).map((a: any) => a.patient_id).filter(Boolean))];

      // Get patients from registry
      const { data: registry } = await supabase
        .from("institution_patient_registry")
        .select("linked_patient_id, first_name, last_name")
        .eq("institution_id", institutionId || "");

      const registryPatients = (registry || []).map((p: any) => ({
        id: p.linked_patient_id,
        name: `${p.first_name} ${p.last_name}`.trim()
      }));

      // Get patient profiles for appointment patients not in registry
      const registryIds = new Set(registryPatients.map(p => p.id));
      const missingIds = patientIds.filter(id => !registryIds.has(id));

      let appointmentPatients: any[] = [];
      if (missingIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", missingIds);
        appointmentPatients = (profiles || []).map((p: any) => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`.trim()
        }));
      }

      setPatients([...registryPatients, ...appointmentPatients]);
    } catch (err) {
      console.error("Failed to fetch patients:", err);
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const total = subtotal + tax - discount;
    return { subtotal, total };
  };

  const handleCreateInvoice = async () => {
    if (!patientId) {
      toast.error("Select a patient");
      return;
    }
    if (items.some(i => !i.description || i.unit_price <= 0)) {
      toast.error("All items need a description and price");
      return;
    }

    setSubmitting(true);
    try {
      const { subtotal, total } = calculateTotals();
      const patient = patients.find(p => p.id === patientId);
      const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

      const { data, error } = await supabase.from("billing_invoices").insert({
        institution_id: institutionId,
        patient_id: patientId,
        invoice_number: invoiceNumber,
        patient_name: patient?.name || "Unknown",
        items: items,
        subtotal,
        tax,
        discount,
        total_amount: total,
        paid_amount: 0,
        balance: total,
        status: "draft",
        due_date: dueDate || null,
        notes,
        created_by: user?.id,
      }).select().single();

      if (error) throw error;

      toast.success(`Invoice ${invoiceNumber} created`);
      setShowCreate(false);
      resetForm();
      fetchInvoices();
    } catch (err: any) {
      console.error("Failed to create invoice:", err);
      toast.error(err.message || "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    try {
      const { error } = await supabase
        .from("billing_invoices")
        .update({
          paid_amount: invoice.total_amount,
          balance: 0,
          status: "paid"
        })
        .eq("id", invoice.id);

      if (error) throw error;
      toast.success("Invoice marked as paid");
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.message || "Failed to update invoice");
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
      toast.error(err.message || "Failed to start online payment");
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
    setPatientId("");
    setItems([{ description: "", quantity: 1, unit_price: 0 }]);
    setTax(0);
    setDiscount(0);
    setDueDate("");
    setNotes("");
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
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
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
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
                    <Button variant="outline" size="sm" onClick={() => setShowReceipt(invoice)}>
                      <Receipt className="h-4 w-4 mr-1" /> Receipt
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadReceipt(invoice)}>
                      <Download className="h-4 w-4 mr-1" /> PDF
                    </Button>
                    {invoice.status !== "paid" && (
                      <>
                        <Button size="sm" onClick={() => handlePayOnline(invoice)} className="bg-blue-600 hover:bg-blue-700">
                          <CheckCircle className="h-4 w-4 mr-1" /> Pay Online
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleMarkPaid(invoice)}>
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
            <div>
              <Label>Patient</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Items</Label>
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                  <Input
                    type="number"
                    placeholder="Price"
                    value={item.unit_price}
                    onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                    className="w-28"
                  />
                  {items.length > 1 && (
                    <Button variant="outline" size="sm" onClick={() => removeItem(idx)}>×</Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
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
            <div className="bg-white rounded-lg overflow-hidden">
              {/* Header with Doc'O Clock branding */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
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
                    <p className="font-mono font-bold">{showReceipt.invoice_number}</p>
                  </div>
                </div>
              </div>

              {/* Institution info */}
              {institution && (
                <div className="bg-blue-50 px-6 py-4 border-b">
                  <p className="font-semibold text-gray-900">{institution.name}</p>
                  {institution.address && <p className="text-sm text-gray-600">{institution.address}</p>}
                  {(institution.city || institution.phone) && (
                    <p className="text-sm text-gray-600">
                      {[institution.city, institution.phone].filter(Boolean).join(" • ")}
                    </p>
                  )}
                </div>
              )}

              <div className="p-6 space-y-4">
                {/* Patient and invoice info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">Billed To</p>
                    <p className="font-semibold">{showReceipt.patient_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs uppercase tracking-wide">Date</p>
                    <p className="font-semibold">{new Date(showReceipt.created_at).toLocaleDateString()}</p>
                    {showReceipt.due_date && (
                      <>
                        <p className="text-gray-500 text-xs uppercase tracking-wide mt-2">Due Date</p>
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
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Description</th>
                        <th className="text-center px-4 py-2 font-medium text-gray-600">Qty</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-600">Amount</th>
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
                  <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span><span>{formatPrice(showReceipt.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Tax:</span><span>{formatPrice(showReceipt.tax)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Discount:</span><span>-{formatPrice(showReceipt.discount)}</span></div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>Total:</span><span>{formatPrice(showReceipt.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-medium"><span>Paid:</span><span>{formatPrice(showReceipt.paid_amount)}</span></div>
                  <div className="flex justify-between font-medium"><span>Balance Due:</span><span className={showReceipt.balance > 0 ? "text-red-600" : "text-green-600"}>{formatPrice(showReceipt.balance)}</span></div>
                </div>

                {showReceipt.notes && (
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-600 italic">
                    {showReceipt.notes}
                  </div>
                )}

                {/* Footer */}
                <div className="text-center text-xs text-gray-500 pt-4 border-t">
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
