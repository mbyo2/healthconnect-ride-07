import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Calculator, Info, ShieldCheck, CalendarPlus, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

// Keywords mapping estimator services to platform price-book entries.
// When service_pricing has live rows, their average replaces the static
// fallback below (marked "live" in the UI).
const PRICE_KEYWORDS: Record<string, string[]> = {
  consultation: ['consultation', 'opd', 'general'],
  specialist: ['specialist'],
  video_consultation: ['video_consultation', 'telemedicine', 'telehealth'],
  annual_physical: ['physical', 'wellness', 'checkup'],
  pediatric_visit: ['pediatric', 'paediatric', 'child'],
  lab_work: ['lab', 'blood', 'panel'],
  imaging_xray: ['x-ray', 'xray', 'radiolog'],
  imaging_mri: ['mri', 'ct'],
  dental_cleaning: ['dental', 'cleaning'],
  dental_filling: ['filling', 'dental'],
  eye_exam: ['eye', 'optometr', 'vision'],
  physical_therapy: ['physio', 'therapy', 'rehab'],
  minor_procedure: ['procedure', 'surgery', 'minor'],
  urgent_care: ['urgent', 'emergency', 'casualty'],
};

const SERVICE_TYPES = [
  { value: "consultation", label: "General Practice Consultation", avgCost: 150, category: "doctor" },
  { value: "specialist", label: "Specialist Visit (Cardiology, Dermatology, Ortho)", avgCost: 300, category: "doctor" },
  { value: "video_consultation", label: "Telehealth / Video Consultation", avgCost: 100, category: "doctor" },
  { value: "annual_physical", label: "Annual Physical Exam & Wellness Check", avgCost: 250, category: "doctor" },
  { value: "pediatric_visit", label: "Pediatric Well-Child Visit", avgCost: 180, category: "pediatrics" },
  { value: "lab_work", label: "Full Blood Panel & Lab Diagnostics", avgCost: 200, category: "diagnostic_center" },
  { value: "imaging_xray", label: "X-Ray Imaging & Scan", avgCost: 350, category: "imaging_center" },
  { value: "imaging_mri", label: "MRI / CT Scan Examination", avgCost: 850, category: "imaging_center" },
  { value: "dental_cleaning", label: "Dental Routine Checkup & Cleaning", avgCost: 180, category: "dental" },
  { value: "dental_filling", label: "Dental Filling / Minor Procedure", avgCost: 280, category: "dental" },
  { value: "eye_exam", label: "Comprehensive Eye & Vision Exam", avgCost: 160, category: "optical" },
  { value: "physical_therapy", label: "Physical Therapy Session", avgCost: 140, category: "therapy" },
  { value: "minor_procedure", label: "Minor Outpatient Surgical Procedure", avgCost: 950, category: "hospital" },
  { value: "urgent_care", label: "Urgent Care Visit", avgCost: 220, category: "clinic" },
];

export const CostEstimator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [serviceType, setServiceType] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<{
    serviceLabel: string;
    category: string;
    total: number;
    coverage: number;
    copay: number;
    deductible: number;
    outOfPocket: number;
  } | null>(null);

  const { data: insuranceInfo } = useQuery({
    queryKey: ["insurance-info", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("insurance_information")
        .select("*")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: verification } = useQuery({
    queryKey: ["insurance-verification", insuranceInfo?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_verifications")
        .select("*")
        .eq("insurance_info_id", insuranceInfo!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!insuranceInfo?.id,
  });

  // Live platform price book (service_pricing) layered over static
  // fallbacks — estimator stays useful with zero rows, exact with data.
  const { data: livePrices } = useQuery({
    queryKey: ["estimator-live-prices"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("service_pricing")
        .select("service_code, base_price, category")
        .eq("is_active", true)
        .limit(500);
      const byService = new Map<string, number[]>();
      ((data || []) as any[]).forEach((r: any) => {
        const key = `${r.service_code || ''} ${r.category || ''}`.toLowerCase();
        const price = Number(r.base_price) || 0;
        if (price <= 0) return;
        const entry = SERVICE_TYPES.find(
          (s) => s.value === r.service_code || (PRICE_KEYWORDS[s.value] || []).some((k) => key.includes(k))
        );
        if (!entry) return;
        if (!byService.has(entry.value)) byService.set(entry.value, []);
        byService.get(entry.value)!.push(price);
      });
      const avg = new Map<string, number>();
      byService.forEach((prices, value) => {
        avg.set(value, Math.round(prices.reduce((s, p) => s + p, 0) / prices.length));
      });
      return avg;
    },
    staleTime: 1000 * 60 * 10,
  });

  const servicesWithPrices = SERVICE_TYPES.map((s) => ({
    ...s,
    avgCost: livePrices?.get(s.value) ?? s.avgCost,
    live: livePrices?.has(s.value) || false,
  }));

  const calculateEstimate = () => {
    const service = servicesWithPrices.find((s) => s.value === serviceType);
    if (!service) return;

    setEstimating(true);

    setTimeout(() => {
      const total = service.avgCost;
      const coveragePercent = verification?.coverage_percentage || (insuranceInfo ? 80 : 0);
      const copay = verification?.copay_amount || (insuranceInfo ? 30 : 0);
      const deductibleRemaining = verification?.deductible_remaining || (insuranceInfo ? 500 : 0);

      const coverageAmount = total * (coveragePercent / 100);
      const deductibleApplied = insuranceInfo ? Math.min(deductibleRemaining, Math.max(0, total - copay)) : 0;
      const outOfPocket = insuranceInfo
        ? Math.max(copay, total - coverageAmount + deductibleApplied)
        : total;

      setEstimate({
        serviceLabel: service.label,
        category: service.category,
        total,
        coverage: coverageAmount,
        copay,
        deductible: deductibleApplied,
        outOfPocket: Math.round(outOfPocket * 100) / 100,
      });
      setEstimating(false);
    }, 400);
  };

  return (
    <div className="rounded-2xl border border-canvas-silk bg-white dark:bg-slate-900 p-6 shadow-xs space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-canvas-silk dark:border-slate-800">
        <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center font-black text-sm">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-extrabold tracking-tight">Healthcare Out-of-Pocket Estimator</h2>
          <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">
            Calculate accurate consultation and procedure copays based on active insurance policies
          </p>
        </div>
      </div>

      {insuranceInfo ? (
        <div className="flex items-center justify-between p-3 rounded-xl bg-primary-50 border border-blue-200">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-primary-500" />
            <div>
              <div className="text-xs font-extrabold text-slate-900">{insuranceInfo.provider_name}</div>
              <div className="text-[11px] text-graphite-500 dark:text-slate-400">Policy: {insuranceInfo.policy_number}</div>
            </div>
          </div>
          {verification && (verification.verification_status === 'verified' || verification.status === 'verified') ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-success-500">
              Verified Coverage
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-warning-500">
              Unverified — estimates use plan defaults
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-canvas-silk dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-warning-500" />
            <span className="text-xs text-graphite-500 dark:text-slate-400">No insurance linked. Displaying standard self-pay rates.</span>
          </div>
          <button
            onClick={() => navigate("/insurance-cards")}
            className="px-3 py-2 min-h-[44px] rounded-md bg-primary-500 text-white text-xs font-bold"
          >
            Add Card
          </button>
        </div>
      )}

      <div>
        <label htmlFor="cost-estimator-service" className="text-xs font-extrabold uppercase text-graphite-500 dark:text-slate-400 block mb-1">
          Select Clinical Procedure or Consultation Type
        </label>
        <Select value={serviceType} onValueChange={setServiceType}>
          <SelectTrigger id="cost-estimator-service" className="w-full text-xs font-medium border-graphite-300 dark:border-slate-700">
            <SelectValue placeholder="Choose a medical procedure..." />
          </SelectTrigger>
          <SelectContent>
            {servicesWithPrices.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                <div className="flex items-center justify-between w-full gap-4 text-xs font-medium">
                  <span>{s.label}{s.live ? ' · live rate' : ''}</span>
                  <span className="font-mono text-primary-500">K{s.avgCost}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        onClick={calculateEstimate}
        disabled={!serviceType || estimating}
        className="w-full py-2.5 min-h-[44px] rounded-md bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs shadow-xs transition-all disabled:opacity-40"
      >
        {estimating ? "Working out your cost..." : "Calculate What You'll Pay"}
      </button>

      {estimate && (
        <div className="p-4 rounded-xl bg-canvas border border-canvas-silk space-y-3">
          <div className="text-xs font-extrabold uppercase text-graphite-500 dark:text-slate-400">Financial Breakdown Summary</div>
          <div className="space-y-1.5 text-xs font-medium">
            <div className="flex justify-between text-slate-600"><span>Standard Fee</span><span>K{estimate.total.toFixed(2)}</span></div>
            <div className="flex justify-between text-emerald-600 font-bold"><span>Insurance Payment</span><span>-K{estimate.coverage.toFixed(2)}</span></div>
            <div className="flex justify-between text-slate-900 font-bold border-t border-canvas-silk pt-2 text-sm">
              <span>Estimated Copay Due</span><span className="font-mono text-primary-500">K{estimate.outOfPocket.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-[11px] text-graphite-500 dark:text-slate-400">
            Estimate only — the actual amount can change depending on the provider&apos;s confirmed fee and your plan&apos;s final decision.
          </p>
        </div>
      )}
    </div>
  );
};

export default CostEstimator;
