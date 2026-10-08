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
  const { institutionId } = useInstitutionContext();
  const { formatPrice } = useCurrency();
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
      const { data } = await supabase
        .from("institution_patient_registry")
        .select("linked_patient_id, first_name, last_name")
        .eq("institution_id", institutionId || "");
      setPatients((data || []).map((p: any) => ({
        id: p.linked_patient_id,
        name: `${p.first_name} ${p.last_name}`.trim()
      })));
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
        status: "pending",
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

  const handleDownloadReceipt = async (invoice: Invoice) => {
    try {
      await downloadReceiptPdf({
        invoiceNumber: invoice.invoice_number,
        patientName: invoice.patient_name,
        items: invoice.items,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        discount: invoice.discount,
        total: invoice.total_amount,
        paid: invoice.paid_amount,
        balance: invoice.balance,
        status: invoice.status,
        date: new Date(invoice.created_at).toLocaleDateString(),
        notes: invoice.notes,
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
                      <Button size="sm" onClick={() => handleMarkPaid(invoice)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Mark Paid
                      </Button>
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

      {/* Receipt Dialog */}
      <Dialog open={!!showReceipt} onOpenChange={() => setShowReceipt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {showReceipt && (
            <div className="space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">Doc'O Clock</h2>
                <p className="text-sm text-muted-foreground">Healthcare Services</p>
                <p className="text-sm font-mono mt-2">{showReceipt.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm"><strong>Patient:</strong> {showReceipt.patient_name}</p>
                <p className="text-sm"><strong>Date:</strong> {new Date(showReceipt.created_at).toLocaleDateString()}</p>
                <p className="text-sm"><strong>Status:</strong> {showReceipt.status.toUpperCase()}</p>
              </div>
              <div className="border-t pt-4">
                {showReceipt.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm py-1">
                    <span>{item.description} × {item.quantity}</span>
                    <span>{formatPrice(item.quantity * item.unit_price)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-1">
                <div className="flex justify-between text-sm"><span>Subtotal:</span><span>{formatPrice(showReceipt.subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span>Tax:</span><span>{formatPrice(showReceipt.tax)}</span></div>
                <div className="flex justify-between text-sm"><span>Discount:</span><span>-{formatPrice(showReceipt.discount)}</span></div>
                <div className="flex justify-between font-bold"><span>Total:</span><span>{formatPrice(showReceipt.total_amount)}</span></div>
                <div className="flex justify-between text-sm text-green-600"><span>Paid:</span><span>{formatPrice(showReceipt.paid_amount)}</span></div>
                <div className="flex justify-between text-sm"><span>Balance:</span><span>{formatPrice(showReceipt.balance)}</span></div>
              </div>
              {showReceipt.notes && (
                <p className="text-sm text-muted-foreground italic">{showReceipt.notes}</p>
              )}
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
    </div>
  );
};

export default Billing;
