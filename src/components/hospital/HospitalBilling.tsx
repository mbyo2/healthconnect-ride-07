import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, DollarSign, CheckCircle, Loader2, Receipt, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/use-currency";
import { downloadReceiptPdf, downloadConsolidatedReceiptPdf } from "@/utils/receiptPdf";
import {
  buildHospitalBillLines,
  matchServiceOrdered,
  selectedChargesTotal,
  unpricedCharges,
  type AssembledCharge,
  type PricedService,
} from "@/lib/hospitalBilling";
import { InstitutionPatientPicker } from "./InstitutionPatientPicker";
import { PricedServiceQuickCreateDialog, PRICED_SERVICE_CATEGORIES } from "@/components/billing/PricedServiceQuickCreateDialog";
import { useInstitutionTeam } from "@/hooks/useInstitutionTeam";
import type { InstitutionPatient } from "@/lib/patients";

/**
 * A human label for the price-list service a charge needs, derived from
 * the charge itself — used to prefill the create-on-missing dialog so
 * the new service re-matches this charge (the matcher keys off the
 * clinical name: test type, medication, modality, procedure…).
 */
function suggestedServiceLabel(c: AssembledCharge): string {
  const d = c.description || "";
  switch (c.source_kind) {
    case "lab_test":
      return d.replace(/^Lab Test:\s*/, "");
    case "prescription":
      return d.replace(/^Rx:\s*/, "");
    case "procedure_execution":
      return d.replace(/^Procedure:\s*/, "").replace(/\s+-\s+.*$/, "");
    case "imaging_order":
      return d.replace(/^Imaging:\s*/, "");
    case "immunization":
      return d.replace(/^Immunization:\s*/, "").replace(/\s*\(Dose.*$/, "");
    case "anc_visit":
      return "ANC Visit";
    case "admission": {
      const m = d.match(/\(([^)]+)\)/);
      return `${m ? `${m[1]} ` : ""}Ward Bed (per day)`;
    }
    case "appointment":
      return "Consultation";
    default:
      return d;
  }
}

interface BillingProps {
  hospital: any;
  admissions: any[];
  invoices: any[];
  onRefresh: () => void;
}

const getPaymentPill = (status: string) => {
  switch (status) {
    case "paid": return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-success-500">Paid</span>;
    case "overdue": return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-error-500">Overdue</span>;
    default: return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-warning-500">Pending</span>;
  }
};

interface PatientPolicy {
  id: string;
  provider_name: string;
  policy_number: string;
  active_today: boolean;
  accepted_by_hospital: boolean;
}

export const HospitalBilling = ({ hospital, admissions, invoices, onRefresh }: BillingProps) => {
  const { formatPrice } = useCurrency();
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<InstitutionPatient | null>(null);
  // Create-on-missing for charges with no price-list match (W4).
  const { isAdmin: canCreatePricing } = useInstitutionTeam(hospital?.id);
  const [pricingCharge, setPricingCharge] = useState<AssembledCharge | null>(null);
  const [pendingPatientCharges, setPendingPatientCharges] = useState<AssembledCharge[]>([]);
  const [isLoadingCharges, setIsLoadingCharges] = useState(false);
  const [policies, setPolicies] = useState<PatientPolicy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");

  // E-14: charges are discovered from the encounter and matched to the
  // hospital's service_pricing catalogue. Prices shown here are a
  // preview read from those catalogue rows; the bill itself is priced
  // and split by create_hospital_bill on the server. Charges with no
  // price-list match are shown as "not on the price list" and can
  // never be billed at a typed figure.
  const handlePatientSelect = async (patientId: string) => {
    setSelectedPatientId(patientId);
    setPolicies([]);
    setSelectedPolicyId("");
    if (!patientId) return;
    setIsLoadingCharges(true);
    try {
      const [apptsRes, labsRes, rxsRes, procRes, imagingRes, admissionsRes, ancRes, immRes, catalogueRes, policiesRes] = await Promise.all([
        supabase.from("appointments").select("id, type, date, time").eq("patient_id", patientId).eq("status", "completed"),
        supabase.from("lab_tests").select("id, test_type").eq("patient_id", patientId).eq("payment_status", "pending"),
        // Prescription statuses are pending/filled/partially_filled —
        // 'active' is not a legal status value, so filtering on it
        // silently dropped every medicine charge from the bill.
        supabase.from("comprehensive_prescriptions").select("id, medication_name, quantity").eq("patient_id", patientId).in("status", ["pending", "filled", "partially_filled"]),
        supabase.from("procedure_executions").select("id, procedure_id, execution_date, procedure:clinical_procedures(procedure_name)").eq("patient_id", patientId).eq("institution_id", hospital.id).limit(100),
        supabase.from("imaging_orders" as any).select("id, modality, body_part, status, ordered_at").eq("patient_id", patientId).eq("institution_id", hospital.id).eq("status", "completed").limit(100),
        supabase.from("hospital_admissions" as any).select("id, admission_date, bed_id, bed:hospital_beds(bed_number, bed_type)").eq("patient_id", patientId).eq("hospital_id", hospital.id).eq("status", "admitted").limit(20),
        supabase.from("anc_visits" as any).select("id, visit_number, visit_date").eq("patient_id", patientId).eq("institution_id", hospital.id).limit(50),
        supabase.from("immunizations" as any).select("id, vaccine_name, dose_number, administered_date").eq("patient_id", patientId).eq("institution_id", hospital.id).not("administered_date", "is", null).limit(50),
        supabase.from("service_pricing").select("id, service_code, service_label, base_price, category, institution_id")
          .eq("is_active", true)
          .or(`institution_id.eq.${hospital.id},institution_id.is.null`),
        (supabase as any).rpc("list_patient_insurance", { p_hospital_id: hospital.id, p_patient_id: patientId }),
      ]);
      const services = ((catalogueRes.data || []) as any[]).map((s) => ({
        id: s.id,
        service_code: s.service_code,
        service_label: s.service_label,
        base_price: Number(s.base_price) || 0,
        category: s.category,
        institution_id: s.institution_id,
      })) as PricedService[];

      const patientPolicies = ((policiesRes.data || []) as PatientPolicy[]);
      setPolicies(patientPolicies);
      const defaultPolicy = patientPolicies.find((p) => p.active_today && p.accepted_by_hospital);
      setSelectedPolicyId(defaultPolicy?.id || "");

      const charges: AssembledCharge[] = [];
      (apptsRes.data || []).forEach((a: any) => {
        charges.push({
          key: `appointment-${a.id}`,
          category: "Consultations",
          description: `Consultation (${a.type?.replace(/_/g, " ") || "General"}) - ${a.date}`,
          date: a.date,
          quantity: 1,
          service: matchServiceOrdered(services, a.type || "", "consultation"),
          source_kind: "appointment",
          source_id: a.id,
          selected: true,
        });
      });
      (labsRes.data || []).forEach((l: any) => {
        charges.push({
          key: `lab-${l.id}`,
          category: "Laboratory",
          description: `Lab Test: ${l.test_type}`,
          date: (l as any).created_at || (l as any).test_date,
          quantity: 1,
          service: matchServiceOrdered(services, l.test_type || ""),
          source_kind: "lab_test",
          source_id: l.id,
          selected: true,
        });
      });
      (rxsRes.data || []).forEach((r: any) => {
        charges.push({
          key: `rx-${r.id}`,
          category: "Pharmacy",
          description: `Rx: ${r.medication_name}`,
          date: (r as any).created_at,
          quantity: Math.max(1, Number(r.quantity) || 1),
          service: matchServiceOrdered(services, r.medication_name || ""),
          source_kind: "prescription",
          source_id: r.id,
          selected: true,
        });
      });
      ((procRes.data || []) as any[]).forEach((p: any) => {
        const procName = p.procedure?.procedure_name || "Procedure";
        charges.push({
          key: `procedure-${p.id}`,
          category: "Clinical Procedures",
          description: `Procedure: ${procName} - ${p.execution_date || ""}`.trim(),
          date: p.execution_date,
          quantity: 1,
          service: matchServiceOrdered(services, procName),
          source_kind: "procedure_execution",
          source_id: p.id,
          selected: true,
        });
      });
      const modalityLabel: Record<string, string> = { xray: "X-Ray", ct: "CT Scan", mri: "MRI", ultrasound: "Ultrasound", mammography: "Mammography" };
      ((imagingRes.data || []) as any[]).forEach((o: any) => {
        const label = `${modalityLabel[o.modality] || o.modality} ${o.body_part || ""}`.trim();
        charges.push({
          key: `imaging-${o.id}`,
          category: "Radiology & Imaging",
          description: `Imaging: ${label}`,
          date: o.ordered_at,
          quantity: 1,
          service: matchServiceOrdered(services, label, modalityLabel[o.modality] || o.modality || ""),
          source_kind: "imaging_order",
          source_id: o.id,
          selected: true,
        });
      });
      // Ward & bed charges: per-day service × days admitted (the day
      // count is the quantity; the rate is the price-list row's price).
      ((admissionsRes.data || []) as any[]).forEach((a: any) => {
        if (!a.bed_id) return;
        const bedType = (a.bed?.bed_type || "general").toString();
        const admittedAt = new Date(a.admission_date).getTime();
        const days = Math.max(1, Math.ceil((Date.now() - admittedAt) / 86400000));
        const bedLabel = bedType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        charges.push({
          key: `admission-${a.id}`,
          category: "Ward & Bed Charges",
          description: `Bed ${a.bed?.bed_number || ""} (${bedLabel}) × ${days} day${days > 1 ? "s" : ""}`.trim(),
          date: a.admission_date,
          quantity: days,
          service: matchServiceOrdered(services, bedType.replace(/_/g, "-"), bedType, "ward", "bed"),
          source_kind: "admission",
          source_id: a.id,
          selected: true,
        });
      });
      ((ancRes.data || []) as any[]).forEach((v: any) => {
        charges.push({
          key: `anc-${v.id}`,
          category: "Maternal & Child Health",
          description: `ANC Visit #${v.visit_number || "?"}`,
          date: v.visit_date,
          quantity: 1,
          service: matchServiceOrdered(services, "ANC", "antenatal"),
          source_kind: "anc_visit",
          source_id: v.id,
          selected: true,
        });
      });
      ((immRes.data || []) as any[]).forEach((im: any) => {
        charges.push({
          key: `immunization-${im.id}`,
          category: "Maternal & Child Health",
          description: `Immunization: ${im.vaccine_name || "Vaccine"} (Dose ${im.dose_number ?? "?"})`,
          date: im.administered_date,
          quantity: 1,
          service: matchServiceOrdered(services, im.vaccine_name || "", "vaccination", "immunization"),
          source_kind: "immunization",
          source_id: im.id,
          selected: true,
        });
      });

      setPendingPatientCharges(charges);
      const matched = charges.filter((c) => c.service).length;
      const unmatched = charges.length - matched;
      if (charges.length > 0) {
        toast.info(
          unmatched > 0
            ? `Found ${charges.length} charges — ${unmatched} are not on the price list and cannot be billed yet`
            : `Auto-populated ${charges.length} pending charges`
        );
      }
    } catch (e) {
      console.error("Error fetching patient charges:", e);
    } finally {
      setIsLoadingCharges(false);
    }
  };

  const toggleCharge = (index: number) => {
    setPendingPatientCharges(prev => prev.map((c, i) => i === index && c.service ? { ...c, selected: !c.selected } : c));
  };

  const selectedPricedCharges = pendingPatientCharges.filter(c => c.service && c.selected !== false);
  const previewTotal = selectedChargesTotal(pendingPatientCharges);
  const notOnPriceList = unpricedCharges(pendingPatientCharges);

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
    if (!selectedPatientId || selectedPricedCharges.length === 0) return;
    setIsSubmitting(true);
    try {
      // E-14: the server prices every line from the price list and
      // computes the insurance split from the patient's policy — the
      // payload carries ids, quantities and source references only.
      const { data, error } = await (supabase as any).rpc("create_hospital_bill", {
        p_hospital_id: hospital.id,
        p_patient_id: selectedPatientId,
        p_lines: buildHospitalBillLines(pendingPatientCharges),
        p_insurance_info_id: selectedPolicyId || null,
      });
      if (error) throw error;
      const bill = (data as any)?.bill;
      const unpriced = ((data as any)?.unpriced || []) as any[];
      const alreadyBilled = ((data as any)?.already_billed || []) as any[];
      const alreadyPaidAtTill = ((data as any)?.already_paid_at_till || []) as any[];
      const appended = (data as any)?.appended === true;
      const claimId = (data as any)?.insurance_claim_id;
      if (unpriced.length > 0) {
        toast.warning(
          `${unpriced.length} charge${unpriced.length > 1 ? "s were" : " was"} not billed — no price set yet: ${unpriced.map((u: any) => u.description).join(", ")}`
        );
      }
      if (alreadyBilled.length > 0) {
        const holders = [...new Set(alreadyBilled.map((a: any) => a.invoice_number).filter(Boolean))];
        toast.warning(
          `${alreadyBilled.length} charge${alreadyBilled.length > 1 ? "s were" : " was"} already on ${holders.length === 1 ? `bill ${holders[0]}` : "an earlier bill"} and ${alreadyBilled.length > 1 ? "were" : "was"} not charged again`
        );
      }
      if (alreadyPaidAtTill.length > 0) {
        // Till/bill guard: medicines the patient already paid for at
        // the dispensary till are never charged again — fully paid
        // ones are skipped, partly paid ones billed for the remainder.
        const receipts = [...new Set(alreadyPaidAtTill.flatMap((a: any) => a.receipt_numbers || []))];
        const fullyPaid = alreadyPaidAtTill.filter((a: any) => Number(a.billed_quantity || 0) === 0);
        const partlyPaid = alreadyPaidAtTill.filter((a: any) => Number(a.billed_quantity || 0) > 0);
        if (fullyPaid.length > 0) {
          toast.warning(
            `${fullyPaid.length} medicine charge${fullyPaid.length > 1 ? "s were" : " was"} already paid at the dispensary till${receipts.length > 0 ? ` (receipt ${receipts.join(", ")})` : ""} and ${fullyPaid.length > 1 ? "were" : "was"} not charged again`
          );
        }
        if (partlyPaid.length > 0) {
          toast.warning(
            `${partlyPaid.length} medicine charge${partlyPaid.length > 1 ? "s were" : " was"} partly paid at the dispensary till — only the unpaid remainder was billed`
          );
        }
      }
      toast.success(
        claimId
          ? `Invoice ${bill?.invoice_number} generated — claim filed for ${bill?.insurance_provider}`
          : appended
            ? `Charges added to invoice ${bill?.invoice_number} — the patient's bill now totals ${formatPrice(Number(bill?.total_amount || 0))}`
            : `Invoice ${bill?.invoice_number} generated`
      );
      setShowDialog(false);
      setSelectedPatientId(""); setSelectedPatient(null); setPolicies([]); setSelectedPolicyId("");
      setPendingPatientCharges([]);
      onRefresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate invoice");
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
          className="px-4 py-1.5 rounded-md bg-primary-500 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
        >
          <Plus className="h-4 w-4" /> Generate Invoice
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        NHIMA tariffs are indicative; final coverage is subject to NHIMA approval. Confirm amounts with the facility.
      </p>

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
        <DialogContent className="bg-white dark:bg-slate-900 border border-canvas-silk max-w-md">
          <DialogHeader>
            <DialogTitle className="font-semibold text-base">Generate Invoice</DialogTitle>
            <DialogDescription className="text-xs text-graphite-500 dark:text-slate-400">Charges are priced from the hospital price list and any insurance split is calculated on the server when the bill is generated.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <InstitutionPatientPicker
              institutionId={hospital?.id}
              value={selectedPatient}
              onChange={(p) => {
                setSelectedPatient(p);
                void handlePatientSelect(p?.id ?? "");
              }}
              label="Patient"
            />

            {isLoadingCharges && (
              <div className="flex items-center gap-2 p-2 bg-primary-50 rounded-lg text-primary-500 text-xs font-bold">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching system charges...
              </div>
            )}

            {pendingPatientCharges.length > 0 && (
              <div className="p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs mb-2">Charges — untick to exclude from this bill</p>
                {pendingPatientCharges.map((c, i) => (
                  <label key={c.key} className="flex items-center gap-3 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-2 py-2 transition-colors">
                    <input
                      type="checkbox"
                      checked={!!c.service && c.selected !== false}
                      disabled={!c.service}
                      onChange={() => toggleCharge(i)}
                      className="h-5 w-5 accent-primary-500 shrink-0"
                    />
                    <span className={`flex-1 text-sm ${c.selected === false ? "line-through opacity-50" : ""}`}>
                      {c.description}
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {c.date ? `${new Date(c.date).toLocaleDateString()} · ` : ""}{c.category}
                        {c.service ? ` · ${c.service.service_label}${c.quantity > 1 ? ` × ${c.quantity}` : ""}` : ""}
                      </span>
                    </span>
                    {c.service ? (
                      <span className="font-mono font-semibold text-sm">{formatPrice(c.service.base_price * c.quantity)}</span>
                    ) : (
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-xs font-bold text-warning-600 dark:text-warning-400">Not on the price list</span>
                        {canCreatePricing && (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setPricingCharge(c); }}
                            className="text-xs font-bold text-primary-500 hover:underline"
                          >
                            Add to price list
                          </button>
                        )}
                      </span>
                    )}
                  </label>
                ))}
                <div className="pt-2 mt-1 border-t border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Bill total (from price list)</span>
                  <span className="font-mono font-bold text-sm">{formatPrice(previewTotal)}</span>
                </div>
                {notOnPriceList.length > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {notOnPriceList.length} charge{notOnPriceList.length > 1 ? "s are" : " is"} not on the price list and will not be billed.
                    {canCreatePricing
                      ? " Use “Add to price list” next to a charge to price it now, without leaving this bill."
                      : " Only an institution admin can add services to the price list — ask your admin to price them."}
                  </p>
                )}
              </div>
            )}

            {selectedPatientId && !isLoadingCharges && pendingPatientCharges.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">No pending charges were found for this patient.</p>
            )}

            {selectedPatientId && (
              <div>
                <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">Insurance</label>
                {policies.length > 0 ? (
                  <Select value={selectedPolicyId || "none"} onValueChange={(v) => setSelectedPolicyId(v === "none" ? "" : v)}>
                    <SelectTrigger className="mt-1 border border-graphite-300 dark:border-slate-700 text-xs font-bold"><SelectValue placeholder="Patient pays in full" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No insurance — patient pays in full</SelectItem>
                      {policies.map((p) => (
                        <SelectItem key={p.id} value={p.id} disabled={!p.active_today || !p.accepted_by_hospital}>
                          {p.provider_name} · Policy {p.policy_number}
                          {!p.active_today ? " (not active today)" : !p.accepted_by_hospital ? " (not billed by this hospital)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">No insurance on file — the patient pays in full.</p>
                )}
                {selectedPolicyId && (
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    The split between the insurer and the patient is calculated on the server from this policy's coverage terms when the bill is generated, and a claim is filed automatically.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setShowDialog(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
            {selectedPricedCharges.length > 0 && (
              <button
                onClick={() => {
                  // Display-only consolidated bill from the same
                  // price-list rows the server will bill from.
                  const byCat = new Map<string, any[]>();
                  selectedPricedCharges.forEach((c) => {
                    const cat = c.category || "Services";
                    if (!byCat.has(cat)) byCat.set(cat, []);
                    byCat.get(cat)!.push({
                      description: c.description,
                      quantity: c.quantity,
                      unitPrice: c.service!.base_price,
                    });
                  });
                  downloadConsolidatedReceiptPdf({
                    title: "Consolidated Bill",
                    receiptNumber: `BILL-${Date.now().toString(36).toUpperCase()}`,
                    date: new Date(),
                    issuerName: hospital?.name || "Doc'O Clock",
                    customerName: (() => {
                      if (selectedPatient?.name) return selectedPatient.name;
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
            <button onClick={generateInvoice} disabled={!selectedPatientId || selectedPricedCharges.length === 0 || isSubmitting} className="px-4 py-1.5 rounded-md bg-primary-500 text-white text-xs font-bold flex items-center gap-1">
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Generate Invoice
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create-on-missing: price an unpriced charge without leaving the bill.
          On save the charges are re-assembled so the new service re-matches. */}
      {pricingCharge && (
        <PricedServiceQuickCreateDialog
          institutionId={hospital.id}
          open={!!pricingCharge}
          onOpenChange={(o) => { if (!o) setPricingCharge(null); }}
          initialLabel={suggestedServiceLabel(pricingCharge)}
          initialCategory={
            PRICED_SERVICE_CATEGORIES.includes(pricingCharge.category) ? pricingCharge.category : "Other"
          }
          onCreated={() => {
            setPricingCharge(null);
            if (selectedPatientId) void handlePatientSelect(selectedPatientId);
          }}
        />
      )}
    </div>
  );
};
