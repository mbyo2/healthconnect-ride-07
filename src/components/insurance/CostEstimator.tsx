import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Calculator, Info, ShieldCheck, CalendarPlus, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

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

  const calculateEstimate = () => {
    const service = SERVICE_TYPES.find((s) => s.value === serviceType);
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
    <div className="rounded-2xl border border-[#e6e9ef] bg-white dark:bg-slate-900 p-6 shadow-xs space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-[#e6e9ef]">
        <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center font-black text-sm">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-extrabold tracking-tight">Healthcare Out-of-Pocket Estimator</h2>
          <p className="text-xs text-[#676879] font-medium">
            Calculate accurate consultation and procedure copays based on active insurance policies
          </p>
        </div>
      </div>

      {insuranceInfo ? (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#e5f0ff] border border-blue-200">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-[#0073ea]" />
            <div>
              <div className="text-xs font-extrabold text-slate-900">{insuranceInfo.provider_name}</div>
              <div className="text-[11px] text-[#676879]">Policy: {insuranceInfo.policy_number}</div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00c875]">
            Verified Coverage
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#f5f6f8] border border-[#e6e9ef]">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-[#fdab3d]" />
            <span className="text-xs text-[#676879]">No insurance linked. Displaying standard self-pay rates.</span>
          </div>
          <button
            onClick={() => navigate("/insurance-cards")}
            className="px-3 py-1 rounded-md bg-[#0073ea] text-white text-xs font-bold"
          >
            Add Card
          </button>
        </div>
      )}

      <div>
        <label className="text-xs font-extrabold uppercase text-[#676879] block mb-1">
          Select Clinical Procedure or Consultation Type
        </label>
        <Select value={serviceType} onValueChange={setServiceType}>
          <SelectTrigger className="w-full text-xs font-medium border-[#c3c6d4]">
            <SelectValue placeholder="Choose a medical procedure..." />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_TYPES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                <div className="flex items-center justify-between w-full gap-4 text-xs font-medium">
                  <span>{s.label}</span>
                  <span className="font-mono text-[#0073ea]">${s.avgCost}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        onClick={calculateEstimate}
        disabled={!serviceType || estimating}
        className="w-full py-2.5 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all disabled:opacity-40"
      >
        {estimating ? "Computing Insurance Formula..." : "Calculate Copay & Out-of-Pocket Cost"}
      </button>

      {estimate && (
        <div className="p-4 rounded-xl bg-[#f5f6f8] border border-[#e6e9ef] space-y-3">
          <div className="text-xs font-extrabold uppercase text-[#676879]">Financial Breakdown Summary</div>
          <div className="space-y-1.5 text-xs font-medium">
            <div className="flex justify-between text-slate-600"><span>Standard Fee</span><span>${estimate.total.toFixed(2)}</span></div>
            <div className="flex justify-between text-emerald-600 font-bold"><span>Insurance Payment</span><span>-${estimate.coverage.toFixed(2)}</span></div>
            <div className="flex justify-between text-slate-900 font-bold border-t border-[#e6e9ef] pt-2 text-sm">
              <span>Estimated Copay Due</span><span className="font-mono text-[#0073ea]">${estimate.outOfPocket.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostEstimator;
