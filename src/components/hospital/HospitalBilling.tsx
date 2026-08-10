import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, DollarSign, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/use-currency';
import { InstitutionInsuranceVerification } from '@/components/institution/InstitutionInsuranceVerification';

interface BillingProps {
  hospital: any;
  admissions: any[];
  invoices: any[];
  onRefresh: () => void;
}

export const HospitalBilling = ({ hospital, admissions, invoices, onRefresh }: BillingProps) => {
  const { formatPrice, currency } = useCurrency();
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [pendingPatientCharges, setPendingPatientCharges] = useState<any[]>([]);
  const [isLoadingCharges, setIsLoadingCharges] = useState(false);

  // Auto-fetch unbilled patient charges when a patient is selected
  const handlePatientSelect = async (patientId: string) => {
    setSelectedPatientId(patientId);
    if (!patientId) return;

    setIsLoadingCharges(true);
    try {
      // Query unbilled appointments, lab tests, prescriptions
      const [apptsRes, labsRes, rxsRes] = await Promise.all([
        supabase.from('appointments').select('id, type, date, time').eq('patient_id', patientId).eq('status', 'completed'),
        supabase.from('lab_tests').select('id, test_type, price, total_amount').eq('patient_id', patientId).eq('payment_status', 'pending'),
        supabase.from('comprehensive_prescriptions').select('id, medication_name, quantity').eq('patient_id', patientId).eq('status', 'active'),
      ]);

      const charges: any[] = [];
      let calculatedTotal = 0;

      // Add completed appointments (default K150 fee)
      (apptsRes.data || []).forEach((a: any) => {
        const fee = 150;
        calculatedTotal += fee;
        charges.push({ description: `Consultation (${a.type?.replace('_', ' ') || 'General'}) - ${a.date}`, amount: fee });
      });

      // Add pending lab tests
      (labsRes.data || []).forEach((l: any) => {
        const fee = l.price || l.total_amount || 200;
        calculatedTotal += fee;
        charges.push({ description: `Lab Test: ${l.test_type}`, amount: fee });
      });

      // Add prescriptions (default K50 fee per item)
      (rxsRes.data || []).forEach((r: any) => {
        const fee = 50 * (r.quantity || 1);
        calculatedTotal += fee;
        charges.push({ description: `Rx: ${r.medication_name}`, amount: fee });
      });

      if (charges.length > 0) {
        setPendingPatientCharges(charges);
        setAmount(calculatedTotal.toString());
        setDescription(charges.map(c => c.description).join(', '));
        toast.info(`Auto-populated ${charges.length} pending charges from system`);
      } else {
        setPendingPatientCharges([]);
        setAmount('150');
        setDescription('General Hospital Services');
      }
    } catch (e) {
      console.error('Error fetching patient charges:', e);
    } finally {
      setIsLoadingCharges(false);
    }
  };

  const totalRevenue = invoices?.reduce((s: number, i: any) => s + (i.total_amount || 0), 0) || 0;
  const paidAmount = invoices?.filter((i: any) => i.payment_status === 'paid')
    .reduce((s: number, i: any) => s + (i.total_amount || 0), 0) || 0;
  const pendingAmount = invoices?.filter((i: any) => i.payment_status === 'pending')
    .reduce((s: number, i: any) => s + (i.balance || 0), 0) || 0;

  const generateInvoice = async () => {
    if (!selectedPatientId || !amount) return;
    setIsSubmitting(true);
    try {
      const total = Number(amount);
      let balance = total;
      let insuranceClaimId = null;

      if (selectedVerification) {
        const coverage = selectedVerification.coverage_percentage || 0;
        balance = total - (total * coverage / 100);
        insuranceClaimId = selectedVerification.id;
      }

      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from('hospital_billing' as any).insert({
        hospital_id: hospital.id,
        patient_id: selectedPatientId,
        invoice_number: invoiceNumber,
        total_amount: total,
        subtotal: total,
        balance,
        insurance_claim_id: insuranceClaimId,
        items: [{ description: description || 'Hospital services', amount: total }],
        payment_status: balance === 0 ? 'paid' : 'pending',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString()
      });

      if (error) throw error;
      toast.success(`Invoice ${invoiceNumber} generated`);
      setShowDialog(false);
      setSelectedPatientId('');
      setAmount('');
      setDescription('');
      setSelectedVerification(null);
      onRefresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Billed</p>
            <p className="text-2xl font-bold">{formatPrice(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Collected</p>
            <p className="text-2xl font-bold text-green-600">{formatPrice(paidAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold text-destructive">{formatPrice(pendingAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Invoices</CardTitle>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Generate Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
            <div className="space-y-3">
              {invoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm font-mono">{inv.invoice_number}</h4>
                      <Badge variant={
                        inv.payment_status === 'paid' ? 'default' :
                        inv.payment_status === 'overdue' ? 'destructive' : 'outline'
                      }>{inv.payment_status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {inv.patient?.first_name} {inv.patient?.last_name} • {new Date(inv.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatPrice(inv.total_amount)}</p>
                    {inv.balance > 0 && <p className="text-xs text-destructive">Due: {formatPrice(inv.balance)}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No invoices yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
            <DialogDescription>Create a billing record for a patient</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select value={selectedPatientId} onValueChange={handlePatientSelect}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {admissions?.map((a: any) => (
                    <SelectItem key={a.patient_id} value={a.patient_id}>
                      {a.patient?.first_name} {a.patient?.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isLoadingCharges && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching patient system charges...
              </div>
            )}
            {pendingPatientCharges.length > 0 && (
              <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-primary">System Charges Auto-Populated:</p>
                {pendingPatientCharges.map((c, i) => (
                  <div key={i} className="flex justify-between text-muted-foreground">
                    <span>• {c.description}</span>
                    <span className="font-mono">{formatPrice(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Label>Amount ({currency === 'USD' ? '$' : 'K'})</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Consultation, Lab tests, etc." />
            </div>
            {selectedPatientId && (
              <div className="space-y-4">
                <InstitutionInsuranceVerification patientId={selectedPatientId} onVerified={v => setSelectedVerification(v)} />
                {selectedVerification && (
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800 dark:text-green-300">Insurance: {selectedVerification.coverage_percentage}%</p>
                      <p className="text-green-700 dark:text-green-400">Patient pays: {formatPrice((Number(amount) * (100 - selectedVerification.coverage_percentage)) / 100)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={generateInvoice} disabled={!selectedPatientId || !amount || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
