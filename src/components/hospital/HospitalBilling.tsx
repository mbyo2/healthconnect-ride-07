import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, DollarSign, CheckCircle, Loader2, Receipt, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/use-currency";
import { fetchInstitutionTariffs, resolveTariffPrice } from "@/components/pricing/TariffAndPriceManager";
import { InstitutionInsuranceVerification } from "@/components/institution/InstitutionInsuranceVerification";
import { downloadReceiptPdf, downloadConsolidatedReceiptPdf } from "@/utils/receiptPdf";

interface BillingProps {
  hospital: any;
  admissions: any[];
  invoices: any[];
  onRefresh: () => void;
}

const getPaymentPill = (status: string) => {
  switch (status) {
    case "paid": return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-success-500">Paid</span>;
    case "overdue": return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-error-500">Overdue</span>;
    default: return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-warning-500">Pending</span>;
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
      const [apptsRes, labsRes, rxsRes, tariffs, procRes, imagingRes, admissionsRes, ancRes, immRes] = await Promise.all([
        supabase.from("appointments").select("id, type, date, time").eq("patient_id", patientId).eq("status", "completed"),
        supabase.from("lab_tests").select("id, test_type, price, total_amount").eq("patient_id", patientId).eq("payment_status", "pending"),
        supabase.from("comprehensive_prescriptions").select("id, medication_name, quantity").eq("patient_id", patientId).eq("status", "active"),
        // Institution's own charge book first — hardcoded fallbacks only
        // apply when a category has no tariff at all.
        fetchInstitutionTariffs(hospital.id),
        // Procedures / treatments executed for this patient at this facility.
        supabase.from("procedure_executions").select("id, procedure_id, execution_date, procedure:clinical_procedures(procedure_name)").eq("patient_id", patientId).eq("institution_id", hospital.id).limit(100),
        // Completed imaging orders (radiology) awaiting billing.
        supabase.from("imaging_orders" as any).select("id, modality, body_part, status, ordered_at").eq("patient_id", patientId).eq("institution_id", hospital.id).eq("status", "completed").limit(100),
        // Active admissions with bed occupancy for per-day ward charges.
        supabase.from("hospital_admissions" as any).select("id, admission_date, bed_id, bed:hospital_beds(bed_number, bed_type)").eq("patient_id", patientId).eq("hospital_id", hospital.id).eq("status", "admitted").limit(20),
        // ANC visits (maternal & child health).
        supabase.from("anc_visits" as any).select("id, visit_number, visit_date").eq("patient_id", patientId).eq("institution_id", hospital.id).limit(50),
        // Administered immunizations.
        supabase.from("immunizations" as any).select("id, vaccine_name, dose_number, administered_date").eq("patient_id", patientId).eq("institution_id", hospital.id).not("administered_date", "is", null).limit(50),
      ]);
      // Institution procedure prices for the executions above.
      const procIds = [...new Set(((procRes.data || []) as any[]).map((p: any) => p.procedure_id).filter(Boolean))];
      let procPrices = new Map<string, number>();
      if (procIds.length > 0) {
        const { data: pricing } = await supabase.from("institution_procedure_pricing").select("procedure_id, price").eq("institution_id", hospital.id).in("procedure_id", procIds);
        ((pricing || []) as any[]).forEach((p: any) => procPrices.set(p.procedure_id, Number(p.price) || 0));
      }
      const charges: any[] = [];
      let calculatedTotal = 0;
      (apptsRes.data || []).forEach((a: any) => {
        const fee = resolveTariffPrice(tariffs, 'opd', a.type, 150);
        calculatedTotal += fee;
        charges.push({ category: "Consultations", description: `Consultation (${a.type?.replace("_", " ") || "General"}) - ${a.date}`, amount: fee, date: a.date, selected: true });
      });
      (labsRes.data || []).forEach((l: any) => {
        const fee = l.price || l.total_amount || resolveTariffPrice(tariffs, 'lab', l.test_type, 200);
        calculatedTotal += fee;
        charges.push({ category: "Laboratory", description: `Lab Test: ${l.test_type}`, amount: fee, date: (l as any).created_at || (l as any).test_date, selected: true });
      });
      (rxsRes.data || []).forEach((r: any) => {
        const unit = resolveTariffPrice(tariffs, 'pharmacy', r.medication_name, 50);
        const fee = unit * (r.quantity || 1);
        calculatedTotal += fee;
        charges.push({ category: "Pharmacy", description: `Rx: ${r.medication_name}`, amount: fee, date: (r as any).created_at, selected: true });
      });
      ((procRes.data || []) as any[]).forEach((p: any) => {
        const procName = p.procedure?.procedure_name || 'Procedure';
        const fee = procPrices.get(p.procedure_id) || resolveTariffPrice(tariffs, 'surgery', procName, 0);
        if (fee > 0) {
          calculatedTotal += fee;
          charges.push({ category: "Clinical Procedures", description: `Procedure: ${procName} - ${p.execution_date || ''}`.trim(), amount: fee, date: p.execution_date, selected: true });
        }
      });
      // Radiology: completed imaging orders priced from the tariff book by
      // modality + body part (e.g. "CT Head", "X-Ray Chest").
      const modalityLabel: Record<string, string> = { xray: 'X-Ray', ct: 'CT Scan', mri: 'MRI', ultrasound: 'Ultrasound', mammography: 'Mammography' };
      ((imagingRes.data || []) as any[]).forEach((o: any) => {
        const label = `${modalityLabel[o.modality] || o.modality} ${o.body_part || ''}`.trim();
        const fee = resolveTariffPrice(tariffs, 'radiology', label, resolveTariffPrice(tariffs, 'radiology', modalityLabel[o.modality] || o.modality, 0));
        if (fee > 0) {
          calculatedTotal += fee;
          charges.push({ category: "Radiology & Imaging", description: `Imaging: ${label}`, amount: fee, date: o.ordered_at, selected: true });
        }
      });
      // Ward & bed charges: per-day rate × days admitted for active admissions.
      ((admissionsRes.data || []) as any[]).forEach((a: any) => {
        if (!a.bed_id) return;
        const bedType = (a.bed?.bed_type || 'general').toString();
        const admittedAt = new Date(a.admission_date).getTime();
        const days = Math.max(1, Math.ceil((Date.now() - admittedAt) / 86400000));
        // Hint variants: "semi_private" -> "semi-private" to match tariff names like "Semi-Private Room".
        const hint = bedType.replace(/_/g, '-');
        const perDay = resolveTariffPrice(tariffs, 'ward', hint, resolveTariffPrice(tariffs, 'ward', bedType.replace(/_/g, ' '), 0));
        if (perDay > 0 && days > 0) {
          const fee = perDay * days;
          calculatedTotal += fee;
          const bedLabel = bedType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          charges.push({ category: "Ward & Bed Charges", description: `Bed ${a.bed?.bed_number || ''} (${bedLabel}) × ${days} day${days > 1 ? 's' : ''}`.trim(), amount: fee, date: a.admission_date, selected: true });
        }
      });
      // ANC visits: each antenatal contact bills as a consultation.
      ((ancRes.data || []) as any[]).forEach((v: any) => {
        const fee = resolveTariffPrice(tariffs, 'other', 'ANC', resolveTariffPrice(tariffs, 'opd', 'ANC', 200));
        if (fee > 0) {
          calculatedTotal += fee;
          charges.push({ category: "Maternal & Child Health", description: `ANC Visit #${v.visit_number || '?'}`, amount: fee, date: v.visit_date, selected: true });
        }
      });
      // Administered immunizations: specific vaccine price if set, else the
      // standard vaccination administration fee.
      ((immRes.data || []) as any[]).forEach((im: any) => {
        const label = `${im.vaccine_name || 'Vaccine'} (Dose ${im.dose_number ?? '?'})`;
        const fee = resolveTariffPrice(tariffs, 'other', im.vaccine_name, resolveTariffPrice(tariffs, 'other', 'vaccination', 0));
        if (fee > 0) {
          calculatedTotal += fee;
          charges.push({ category: "Maternal & Child Health", description: `Immunization: ${label}`, amount: fee, date: im.administered_date, selected: true });
        }
      });
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

  const toggleCharge = (index: number) => {
    setPendingPatientCharges(prev => {
      const next = prev.map((c, i) => i === index ? { ...c, selected: !c.selected } : c);
      const total = next.filter(c => c.selected !== false).reduce((s, c) => s + (Number(c.amount) || 0), 0);
      setAmount(total.toString());
      setDescription(next.filter(c => c.selected !== false).map((c) => c.description).join(", "));
      return next;
    });
  };

  const selectedCharges = pendingPatientCharges.filter(c => c.selected !== false);

  const totalRevenue = invoices?.reduce((s: number, i: any) => s + (i.total_amount || 0), 0) || 0;
  const paidAmount = invoices?.filter((i: any) => i.payment_status === "paid").reduce((s: number, i: any) => s + (i.total_amount || 0), 0) || 0;
  const pendingAmount = invoices?.filter((i: any) => i.payment_status === "pending").reduce((s: number, i: any) => s + (i.balance || 0), 0) || 0;

  // Frappe-style quick filters for the invoice list.
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const invoiceStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: invoices?.length || 0 };
    for (const inv of invoices || []) counts[inv.payment_status] = (counts[inv.payment_status] || 0) + 1;
    return counts;
  }, [invoices]);
  const filteredInvoices = (invoices || []).filter((inv: any) => {
    const matchesStatus = invoiceStatusFilter === 'all' || inv.payment_status === invoiceStatusFilter;
    const q = invoiceSearch.toLowerCase();
    const matchesSearch = !q ||
      inv.invoice_number?.toLowerCase().includes(q) ||
      `${inv.patient?.first_name || ''} ${inv.patient?.last_name || ''}`.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const generateInvoice = async () => {
    if (!selectedPatientId || !amount) return;
    setIsSubmitting(true);
    try {
      const total = Number(amount);
      // Split payer allocation: insurer covers coverage%, patient covers the
      // rest (copay / shortfall). Cash bills: patient owes 100%.
      let paymentStatus: string = "pending";
      let patientPortion = total;
      let insurerPortion = 0;
      let insuranceProvider: string | null = null;
      let insurancePolicyNumber: string | null = null;
      if (selectedVerification) {
        const coverage = selectedVerification.coverage_percentage || 0;
        insurerPortion = Math.round((total * coverage) / 100 * 100) / 100;
        patientPortion = Math.round((total - insurerPortion) * 100) / 100;
        insuranceProvider = selectedVerification.coverage_details?.provider || null;
        if (coverage >= 100) paymentStatus = "paid";
      }
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      // NOTE: balance is a GENERATED column — do not insert it explicitly (error 428C9)
      const { data: invData, error } = await supabase.from("hospital_billing" as any).insert({
        hospital_id: hospital.id, patient_id: selectedPatientId, invoice_number: invoiceNumber,
        total_amount: total, subtotal: total,
        patient_portion: patientPortion, insurer_portion: insurerPortion,
        insurance_provider: insuranceProvider, insurance_policy_number: insurancePolicyNumber,
        items: selectedCharges.length > 0
          ? selectedCharges.map((c: any) => ({ description: c.description, amount: c.amount, category: c.category }))
          : [{ description: description || "Hospital services", amount: total }],
        payment_status: paymentStatus,
        due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
      }).select("id").single();
      if (error) throw error;

      // Auto-create the insurance claim so billing flows straight into the
      // claims workbench — no manual re-entry. Best-effort: a claim failure
      // must never block the invoice.
      let insuranceClaimId: string | null = null;
      if (selectedVerification && insurerPortion > 0 && invData) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const adm = (admissions || []).find((a: any) => a.patient_id === selectedPatientId);
          const patientName = adm?.patient ? `${adm.patient.first_name || ""} ${adm.patient.last_name || ""}`.trim() : "Patient";
          const { data: claimData, error: claimError } = await supabase.from("insurance_claims").insert({
            institution_id: hospital.id,
            hospital_billing_id: (invData as any).id,
            patient_id: selectedPatientId,
            patient_name: patientName,
            insurance_provider: insuranceProvider || "Unknown",
            policy_number: insurancePolicyNumber || "",
            claim_amount: insurerPortion,
            status: "submitted",
            created_by: user?.id || selectedPatientId,
          } as any).select("id").single();
          if (!claimError && claimData) {
            insuranceClaimId = (claimData as any).id;
            await supabase.from("hospital_billing" as any).update({ insurance_claim_id: insuranceClaimId }).eq("id", (invData as any).id);
          }
        } catch (claimErr) {
          console.error("Auto-claim creation failed (invoice kept):", claimErr);
        }
      }

      toast.success(
        insuranceClaimId
          ? `Invoice ${invoiceNumber} generated — claim filed for ${insuranceProvider}`
          : `Invoice ${invoiceNumber} generated`
      );
      setShowDialog(false);
      setSelectedPatientId(""); setAmount(""); setDescription(""); setSelectedVerification(null);
      setPendingPatientCharges([]);
      onRefresh();
    } catch (error) {
      toast.error("Failed to generate invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header — single clear title, deference to content */}
      <div className="flex items-center justify-between pb-1">
        <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary-500" />
          Billing & Invoices
        </h3>
        <button
          onClick={() => setShowDialog(true)}
          className="px-4 py-1.5 rounded-md bg-primary-500 text-white text-xs font-extrabold flex items-center gap-1 shadow-xs"
        >
          <Plus className="h-4 w-4" /> Generate Invoice
        </button>
      </div>

      {/* KPI Strip — restrained, semantic colors only */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Billed", value: formatPrice(totalRevenue), color: "#0073ea", icon: <DollarSign className="h-5 w-5" /> },
          { label: "Collected", value: formatPrice(paidAmount), color: "#00c875", icon: <CheckCircle className="h-5 w-5" /> },
          { label: "Outstanding", value: formatPrice(pendingAmount), color: "#e2445c", icon: <AlertCircle className="h-5 w-5" /> },
        ].map((c) => (
          <div key={c.label} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm text-center">
            <div style={{ color: c.color }} className="flex justify-center mb-1.5">{c.icon}</div>
            <div className="text-2xl font-bold tracking-tight font-mono" style={{ color: c.color }}>{c.value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Invoices Table — grouped list style, hairline dividers */}
      {/* Quick filters — Frappe list-view style */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(['all', 'pending', 'partial', 'paid'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setInvoiceStatusFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              invoiceStatusFilter === s
                ? 'bg-primary-500 text-white border-primary-500'
                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-1.5 opacity-70">{invoiceStatusCounts[s] || 0}</span>
          </button>
        ))}
        <div className="relative ml-auto">
          <input
            type="search"
            value={invoiceSearch}
            onChange={(e) => setInvoiceSearch(e.target.value)}
            placeholder="Search invoice or patient…"
            className="text-xs pl-3 pr-3 py-1.5 rounded-full border border-border bg-muted/50 outline-none focus:bg-background w-48"
          />
        </div>
      </div>
      {filteredInvoices.length > 0 ? (
        <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200/60 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-medium">Invoice #</th>
                <th className="py-3 px-3 font-medium">Patient</th>
                <th className="py-3 px-3 font-medium">Date</th>
                <th className="py-3 px-3 text-right font-medium">Total</th>
                <th className="py-3 px-3 text-right font-medium">Balance Due</th>
                <th className="py-3 px-3 text-center font-medium">Status</th>
                <th className="py-3 px-3 text-center font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">{inv.invoice_number}</td>
                  <td className="py-3 px-3 font-medium text-primary-600 dark:text-primary-400">{inv.patient?.first_name} {inv.patient?.last_name}</td>
                  <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">{formatPrice(inv.total_amount)}</td>
                  <td className="py-3 px-3 text-right">
                    {inv.balance > 0 ? <span className="font-semibold text-red-500">{formatPrice(inv.balance)}</span> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="py-3 px-3 text-center">{getPaymentPill(inv.payment_status)}</td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() =>
                        downloadReceiptPdf({
                          title: "Invoice Receipt",
                          receiptNumber: inv.invoice_number,
                          date: inv.created_at,
                          issuerName: hospital?.name || "Doc'O Clock",
                          customerName: `${inv.patient?.first_name || ""} ${inv.patient?.last_name || ""}`.trim() || "Patient",
                          items: (inv.items || []).map((it: any) => ({
                            description: it.description || it.service_name || "Service",
                            quantity: it.quantity || 1,
                            unitPrice: it.unit_price || it.amount || 0,
                          })),
                          tax: inv.tax_amount || 0,
                          discount: inv.discount_amount || 0,
                          amountPaid: (inv.total_amount || 0) - (inv.balance || 0),
                          paymentMethod: inv.payment_method || undefined,
                          paymentReference: inv.payment_reference || undefined,
                          notes: inv.notes || undefined,
                        })
                      }
                      className="p-1.5 rounded-lg border border-canvas-silk hover:bg-primary-500 hover:text-white transition-colors"
                      title="Download PDF Receipt"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-xs text-graphite-500 dark:text-slate-400">
          <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="font-bold">No invoices yet. Generate your first invoice above.</p>
        </div>
      )}

      {/* Generate Invoice Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white border border-canvas-silk max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-base">Generate Invoice</DialogTitle>
            <DialogDescription className="text-xs text-graphite-500 dark:text-slate-400">Create a billing record and auto-populate pending charges for a patient.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Patient</label>
              <Select value={selectedPatientId} onValueChange={handlePatientSelect}>
                <SelectTrigger className="mt-1 border border-graphite-300 dark:border-slate-700 text-xs font-bold"><SelectValue placeholder="Select admitted patient" /></SelectTrigger>
                <SelectContent>
                  {admissions?.map((a: any) => (
                    <SelectItem key={a.patient_id} value={a.patient_id}>{a.patient?.first_name} {a.patient?.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoadingCharges && (
              <div className="flex items-center gap-2 p-2 bg-primary-50 rounded-lg text-primary-500 text-[10px] font-bold">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching system charges...
              </div>
            )}

            {pendingPatientCharges.length > 0 && (
              <div className="p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs mb-2">Charges — untick to exclude from this bill</p>
                {pendingPatientCharges.map((c, i) => (
                  <label key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-white dark:hover:bg-slate-800 rounded-xl px-2 py-2 transition-colors">
                    <input
                      type="checkbox"
                      checked={c.selected !== false}
                      onChange={() => toggleCharge(i)}
                      className="h-5 w-5 accent-primary-500 shrink-0"
                    />
                    <span className={`flex-1 text-sm ${c.selected === false ? "line-through opacity-50" : ""}`}>
                      {c.description}
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {c.date ? `${new Date(c.date).toLocaleDateString()} · ` : ""}{c.category}
                      </span>
                    </span>
                    <span className="font-mono font-semibold text-sm">{formatPrice(c.amount)}</span>
                  </label>
                ))}
              </div>
            )}

            <div>
              <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Amount ({currency === "USD" ? "$" : "K"})</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" />
            </div>
            <div>
              <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Consultation, Lab tests, etc." className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700" />
            </div>

            {selectedPatientId && (
              <div className="space-y-3">
                <InstitutionInsuranceVerification patientId={selectedPatientId} onVerified={(v) => setSelectedVerification(v)} />
                {selectedVerification && (
                  <div className="p-3 rounded-xl border border-success-500/30 bg-success-500/10 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success-500" />
                    <div>
                      <p className="font-extrabold text-success-500 text-xs">Insurance: {selectedVerification.coverage_percentage}% covered</p>
                      <p className="text-xs text-slate-600">Patient pays: {formatPrice((Number(amount) * (100 - selectedVerification.coverage_percentage)) / 100)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setShowDialog(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
            {selectedCharges.length > 0 && (
              <button
                onClick={() => {
                  // Group charges by category for the consolidated bill
                  const byCat = new Map<string, any[]>();
                  selectedCharges.forEach((c: any) => {
                    const cat = c.category || "Services";
                    if (!byCat.has(cat)) byCat.set(cat, []);
                    byCat.get(cat)!.push({
                      description: c.description,
                      quantity: 1,
                      unitPrice: c.amount,
                    });
                  });
                  downloadConsolidatedReceiptPdf({
                    title: "Consolidated Bill",
                    receiptNumber: `BILL-${Date.now().toString(36).toUpperCase()}`,
                    date: new Date(),
                    issuerName: hospital?.name || "Doc'O Clock",
                    customerName: (() => {
                      const adm = (admissions || []).find((a: any) => a.patient_id === selectedPatientId);
                      return adm?.patient ? `${adm.patient.first_name || ""} ${adm.patient.last_name || ""}`.trim() : "Patient";
                    })(),
                    sections: Array.from(byCat.entries()).map(([title, items]) => ({ title, items })),
                    notes: "This consolidated bill covers all services rendered. Present at payment.",
                  });
                }}
                className="px-4 py-1.5 rounded-md border border-primary-500 text-primary-500 text-xs font-bold flex items-center gap-1"
              >
                <Receipt className="h-3.5 w-3.5" /> Consolidated Bill PDF
              </button>
            )}
            <button onClick={generateInvoice} disabled={!selectedPatientId || !amount || isSubmitting} className="px-4 py-1.5 rounded-md bg-primary-500 text-white text-xs font-bold flex items-center gap-1">
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Generate Invoice
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
