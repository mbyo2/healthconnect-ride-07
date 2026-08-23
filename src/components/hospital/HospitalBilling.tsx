import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, DollarSign, CheckCircle, Loader2, Receipt, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/use-currency";
import { InstitutionInsuranceVerification } from "@/components/institution/InstitutionInsuranceVerification";

interface BillingProps {
  hospital: any;
  admissions: any[];
  invoices: any[];
  onRefresh: () => void;
}

const getPaymentPill = (status: string) => {
  switch (status) {
    case "paid": return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-[#00c875]">Paid</span>;
    case "overdue": return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-[#e2445c]">Overdue</span>;
    default: return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-[#fdab3d]">Pending</span>;
  }
};

export const HospitalBilling = ({ hospital, admissions, invoices, onRefresh }: BillingProps) => {
  const { formatPrice, currency } = useCurrency();
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [pendingPatientCharges, setPendingPatientCharges] = useState<any[]>([]);
  const [isLoadingCharges, setIsLoadingCharges] = useState(false);

  const handlePatientSelect = async (patientId: string) => {
    setSelectedPatientId(patientId);
    if (!patientId) return;
    setIsLoadingCharges(true);
    try {
      const [apptsRes, labsRes, rxsRes] = await Promise.all([
        supabase.from("appointments").select("id, type, date, time").eq("patient_id", patientId).eq("status", "completed"),
        supabase.from("lab_tests").select("id, test_type, price, total_amount").eq("patient_id", patientId).eq("payment_status", "pending"),
        supabase.from("comprehensive_prescriptions").select("id, medication_name, quantity").eq("patient_id", patientId).eq("status", "active"),
      ]);
      const charges: any[] = [];
      let calculatedTotal = 0;
      (apptsRes.data || []).forEach((a: any) => { const fee = 150; calculatedTotal += fee; charges.push({ description: `Consultation (${a.type?.replace("_", " ") || "General"}) - ${a.date}`, amount: fee }); });
      (labsRes.data || []).forEach((l: any) => { const fee = l.price || l.total_amount || 200; calculatedTotal += fee; charges.push({ description: `Lab Test: ${l.test_type}`, amount: fee }); });
      (rxsRes.data || []).forEach((r: any) => { const fee = 50 * (r.quantity || 1); calculatedTotal += fee; charges.push({ description: `Rx: ${r.medication_name}`, amount: fee }); });
      if (charges.length > 0) {
        setPendingPatientCharges(charges);
        setAmount(calculatedTotal.toString());
        setDescription(charges.map((c) => c.description).join(", "));
        toast.info(`Auto-populated ${charges.length} pending charges`);
      } else {
        setPendingPatientCharges([]);
        setAmount("150");
        setDescription("General Hospital Services");
      }
    } catch (e) {
      console.error("Error fetching patient charges:", e);
    } finally {
      setIsLoadingCharges(false);
    }
  };

  const totalRevenue = invoices?.reduce((s: number, i: any) => s + (i.total_amount || 0), 0) || 0;
  const paidAmount = invoices?.filter((i: any) => i.payment_status === "paid").reduce((s: number, i: any) => s + (i.total_amount || 0), 0) || 0;
  const pendingAmount = invoices?.filter((i: any) => i.payment_status === "pending").reduce((s: number, i: any) => s + (i.balance || 0), 0) || 0;

  const generateInvoice = async () => {
    if (!selectedPatientId || !amount) return;
    setIsSubmitting(true);
    try {
      const total = Number(amount);
      let balance = total;
      let insuranceClaimId = null;
      if (selectedVerification) {
        const coverage = selectedVerification.coverage_percentage || 0;
        balance = total - (total * coverage) / 100;
        insuranceClaimId = selectedVerification.id;
      }
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("hospital_billing" as any).insert({
        hospital_id: hospital.id, patient_id: selectedPatientId, invoice_number: invoiceNumber,
        total_amount: total, subtotal: total, balance, insurance_claim_id: insuranceClaimId,
        items: [{ description: description || "Hospital services", amount: total }],
        payment_status: balance === 0 ? "paid" : "pending",
        due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
      if (error) throw error;
      toast.success(`Invoice ${invoiceNumber} generated`);
      setShowDialog(false);
      setSelectedPatientId(""); setAmount(""); setDescription(""); setSelectedVerification(null);
      onRefresh();
    } catch (error) {
      toast.error("Failed to generate invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e6e9ef] pb-3">
        <h3 className="text-base font-extrabold flex items-center gap-2">
          <Receipt className="h-5 w-5 text-[#0073ea]" />
          Hospital Billing & Invoice Management
        </h3>
        <button
          onClick={() => setShowDialog(true)}
          className="px-4 py-1.5 rounded-md bg-[#0073ea] text-white text-xs font-extrabold flex items-center gap-1 shadow-xs"
        >
          <Plus className="h-4 w-4" /> Generate Invoice
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Billed", value: formatPrice(totalRevenue), color: "#0073ea", icon: <DollarSign className="h-5 w-5" /> },
          { label: "Collected", value: formatPrice(paidAmount), color: "#00c875", icon: <CheckCircle className="h-5 w-5" /> },
          { label: "Outstanding", value: formatPrice(pendingAmount), color: "#e2445c", icon: <AlertCircle className="h-5 w-5" /> },
        ].map((c) => (
          <div key={c.label} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs text-center">
            <div style={{ color: c.color }} className="flex justify-center mb-1">{c.icon}</div>
            <div className="text-xl font-black font-mono" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[10px] text-[#676879] font-bold uppercase">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Invoices Table */}
      {invoices && invoices.length > 0 ? (
        <div className="w-full overflow-x-auto rounded-xl border border-[#e6e9ef] bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#e6e9ef] bg-[#f5f6f8] text-[11px] font-extrabold uppercase text-[#676879]">
                <th className="py-2.5 px-4">Invoice #</th>
                <th className="py-2.5 px-3">Patient</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3 text-right">Balance Due</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e9ef]">
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-[#f0f2f7] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                  <td className="py-3 px-3 font-bold text-[#0073ea]">{inv.patient?.first_name} {inv.patient?.last_name}</td>
                  <td className="py-3 px-3 text-[#676879]">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-3 text-right font-extrabold text-slate-900">{formatPrice(inv.total_amount)}</td>
                  <td className="py-3 px-3 text-right">
                    {inv.balance > 0 ? <span className="font-bold text-[#e2445c]">{formatPrice(inv.balance)}</span> : <span className="text-[#00c875] font-bold">—</span>}
                  </td>
                  <td className="py-3 px-3 text-center">{getPaymentPill(inv.payment_status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-xs text-[#676879]">
          <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="font-bold">No invoices yet. Generate your first invoice above.</p>
        </div>
      )}

      {/* Generate Invoice Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white border border-[#e6e9ef] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-base">Generate Invoice</DialogTitle>
            <DialogDescription className="text-xs text-[#676879]">Create a billing record and auto-populate pending charges for a patient.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-extrabold text-[#676879] uppercase">Patient</label>
              <Select value={selectedPatientId} onValueChange={handlePatientSelect}>
                <SelectTrigger className="mt-1 border border-[#c3c6d4] text-xs font-bold"><SelectValue placeholder="Select admitted patient" /></SelectTrigger>
                <SelectContent>
                  {admissions?.map((a: any) => (
                    <SelectItem key={a.patient_id} value={a.patient_id}>{a.patient?.first_name} {a.patient?.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoadingCharges && (
              <div className="flex items-center gap-2 p-2 bg-[#e5f0ff] rounded-lg text-[#0073ea] text-[10px] font-bold">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching system charges...
              </div>
            )}

            {pendingPatientCharges.length > 0 && (
              <div className="p-3 rounded-xl border border-[#0073ea]/20 bg-[#e5f0ff] space-y-1">
                <p className="font-extrabold text-[#0073ea] text-[10px] uppercase">Auto-Populated Charges:</p>
                {pendingPatientCharges.map((c, i) => (
                  <div key={i} className="flex justify-between text-[#676879]">
                    <span>• {c.description}</span>
                    <span className="font-mono font-bold">{formatPrice(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="font-extrabold text-[#676879] uppercase">Amount ({currency === "USD" ? "$" : "K"})</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold" />
            </div>
            <div>
              <label className="font-extrabold text-[#676879] uppercase">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Consultation, Lab tests, etc." className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4]" />
            </div>

            {selectedPatientId && (
              <div className="space-y-3">
                <InstitutionInsuranceVerification patientId={selectedPatientId} onVerified={(v) => setSelectedVerification(v)} />
                {selectedVerification && (
                  <div className="p-3 rounded-xl border border-[#00c875]/30 bg-[#00c875]/10 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#00c875]" />
                    <div>
                      <p className="font-extrabold text-[#00c875] text-xs">Insurance: {selectedVerification.coverage_percentage}% covered</p>
                      <p className="text-xs text-slate-600">Patient pays: {formatPrice((Number(amount) * (100 - selectedVerification.coverage_percentage)) / 100)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setShowDialog(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
            <button onClick={generateInvoice} disabled={!selectedPatientId || !amount || isSubmitting} className="px-4 py-1.5 rounded-md bg-[#0073ea] text-white text-xs font-bold flex items-center gap-1">
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Generate Invoice
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
