import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, FileText, CreditCard, BarChart3, Receipt, Shield, Loader2, Plus, Trash2 } from 'lucide-react';
import { useBillingModule, BillingInvoice } from '@/hooks/useBillingModule';
import { format } from 'date-fns';
import { InsuranceClaimWorkflow } from '@/components/billing/InsuranceClaimWorkflow';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'outline' },
  sent: { label: 'Sent', variant: 'secondary' },
  paid: { label: 'Paid', variant: 'default' },
  partial: { label: 'Partial', variant: 'secondary' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
  refunded: { label: 'Refunded', variant: 'outline' },
};

export const BillingStaffWorkflow = () => {
  const {
    invoices, claims, loading,
    todayCollections, pendingInvoices, pendingClaims,
    createInvoice, recordPayment, submitInsuranceClaim,
  } = useBillingModule();

  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null);
  const [creating, setCreating] = useState(false);

  const [invoiceForm, setInvoiceForm] = useState({
    patient_name: '',
    items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }] as Array<{ description: string; quantity: number; unit_price: number; total: number }>,
    tax: 0,
    discount: 0,
    due_date: '',
    notes: '',
    insurance_provider: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_mode: 'cash' as 'cash' | 'card' | 'mobile_money' | 'insurance' | 'bank_transfer' | 'cheque',
    reference_number: '',
  });

  const addItem = () => {
    setInvoiceForm(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unit_price: 0, total: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    setInvoiceForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setInvoiceForm(prev => {
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
        patient_name: '', items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
        tax: 0, discount: 0, due_date: '', notes: '', insurance_provider: '',
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
    setPaymentForm({ amount: 0, payment_mode: 'cash', reference_number: '' });
    setIsPaymentDialogOpen(false);
    setSelectedInvoice(null);
    setCreating(false);
  };

  const openPaymentDialog = (invoice: BillingInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({ amount: invoice.balance || 0, payment_mode: 'cash', reference_number: '' });
    setIsPaymentDialogOpen(true);
  };

  const InvoiceCard = ({ invoice }: { invoice: BillingInvoice }) => {
    const status = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-foreground">{invoice.invoice_number}</span>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {invoice.balance > 0 && (
                <Button size="sm" onClick={() => openPaymentDialog(invoice)}>
                  <CreditCard className="h-3 w-3 mr-1" /> Pay
                </Button>
              )}
            </div>
          </div>
          <p className="font-medium text-foreground">{invoice.patient_name}</p>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span>Total: K{invoice.total_amount?.toLocaleString()}</span>
            <span>Paid: K{invoice.paid_amount?.toLocaleString()}</span>
            {invoice.balance > 0 && <span className="text-destructive font-medium">Balance: K{invoice.balance?.toLocaleString()}</span>}
          </div>
          {invoice.insurance_provider && <Badge variant="outline" className="mt-2">{invoice.insurance_provider}</Badge>}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing & Accounts Dashboard</h1>
          <p className="text-muted-foreground">Invoicing, payments, insurance claims & financial reconciliation</p>
        </div>
        <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Patient Name *</Label>
                  <Input value={invoiceForm.patient_name} onChange={e => setInvoiceForm(prev => ({ ...prev, patient_name: e.target.value }))} />
                </div>
                <div>
                  <Label>Insurance Provider</Label>
                  <Input value={invoiceForm.insurance_provider} onChange={e => setInvoiceForm(prev => ({ ...prev, insurance_provider: e.target.value }))} placeholder="Optional" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-semibold">Line Items</Label>
                  <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add</Button>
                </div>
                {invoiceForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-5">
                      <Input placeholder="Description" value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="Price" value={item.unit_price} onChange={e => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-2 flex items-center text-sm font-medium text-foreground">
                      K{item.total.toLocaleString()}
                    </div>
                    <div className="col-span-1 flex items-center">
                      {invoiceForm.items.length > 1 && (
                        <Button size="icon" variant="ghost" onClick={() => removeItem(index)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Tax</Label>
                  <Input type="number" value={invoiceForm.tax} onChange={e => setInvoiceForm(prev => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Discount</Label>
                  <Input type="number" value={invoiceForm.discount} onChange={e => setInvoiceForm(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={invoiceForm.due_date} onChange={e => setInvoiceForm(prev => ({ ...prev, due_date: e.target.value }))} />
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>K{subtotal.toLocaleString()}</span></div>
                {invoiceForm.tax > 0 && <div className="flex justify-between text-sm"><span>Tax</span><span>K{invoiceForm.tax.toLocaleString()}</span></div>}
                {invoiceForm.discount > 0 && <div className="flex justify-between text-sm"><span>Discount</span><span>-K{invoiceForm.discount.toLocaleString()}</span></div>}
                <div className="flex justify-between font-bold mt-1 pt-1 border-t"><span>Total</span><span>K{totalAmount.toLocaleString()}</span></div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={invoiceForm.notes} onChange={e => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
              </div>

              <Button onClick={handleCreateInvoice} disabled={creating || !invoiceForm.patient_name.trim()} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Receipt className="h-4 w-4 mr-2" />}
                Create Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment — {selectedInvoice?.invoice_number}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount (Balance: K{selectedInvoice?.balance?.toLocaleString()})</Label>
              <Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentForm.payment_mode} onValueChange={v => setPaymentForm(prev => ({ ...prev, payment_mode: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference Number</Label>
              <Input value={paymentForm.reference_number} onChange={e => setPaymentForm(prev => ({ ...prev, reference_number: e.target.value }))} placeholder="Transaction/receipt ref" />
            </div>
            <Button onClick={handleRecordPayment} disabled={creating || paymentForm.amount <= 0} className="w-full">
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-3xl font-bold text-primary">K{todayCollections.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Today's Collections</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CreditCard className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-3xl font-bold text-foreground">{pendingInvoices.length}</p>
            <p className="text-sm text-muted-foreground">Pending Invoices</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 text-center">
            <Shield className="h-5 w-5 text-destructive mx-auto mb-1" />
            <p className="text-3xl font-bold text-destructive">{pendingClaims.length}</p>
            <p className="text-sm text-muted-foreground">Pending Claims</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices"><Receipt className="h-4 w-4 mr-1" /> Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="claims"><Shield className="h-4 w-4 mr-1" /> Insurance Claims ({claims.length})</TabsTrigger>
          <TabsTrigger value="tpa"><Shield className="h-4 w-4 mr-1" /> TPA Workflow</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-3 mt-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : invoices.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No invoices yet. Click "New Invoice" to create one.</CardContent></Card>
          ) : (
            invoices.map(inv => <InvoiceCard key={inv.id} invoice={inv} />)
          )}
        </TabsContent>

        <TabsContent value="claims" className="space-y-3 mt-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : claims.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No insurance claims yet.</CardContent></Card>
          ) : (
            claims.map(claim => (
              <Card key={claim.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">{claim.patient_name}</span>
                    <Badge variant={claim.status === 'approved' ? 'default' : claim.status === 'rejected' ? 'destructive' : 'secondary'}>
                      {claim.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {claim.insurance_provider} • Policy: {claim.policy_number} • K{claim.claim_amount.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
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
