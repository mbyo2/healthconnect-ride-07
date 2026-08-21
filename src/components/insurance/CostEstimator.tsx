import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calculator, Info, ShieldCheck, CalendarPlus, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

const SERVICE_TYPES = [
  { value: 'consultation', label: 'General Practice Consultation', avgCost: 150, category: 'doctor' },
  { value: 'specialist', label: 'Specialist Visit (Cardiology, Dermatology, Ortho)', avgCost: 300, category: 'doctor' },
  { value: 'video_consultation', label: 'Telehealth / Video Consultation', avgCost: 100, category: 'doctor' },
  { value: 'annual_physical', label: 'Annual Physical Exam & Wellness Check', avgCost: 250, category: 'doctor' },
  { value: 'pediatric_visit', label: 'Pediatric Well-Child Visit', avgCost: 180, category: 'pediatrics' },
  { value: 'lab_work', label: 'Full Blood Panel & Lab Diagnostics', avgCost: 200, category: 'diagnostic_center' },
  { value: 'imaging_xray', label: 'X-Ray Imaging & Scan', avgCost: 350, category: 'imaging_center' },
  { value: 'imaging_mri', label: 'MRI / CT Scan Examination', avgCost: 850, category: 'imaging_center' },
  { value: 'dental_cleaning', label: 'Dental Routine Checkup & Cleaning', avgCost: 180, category: 'dental' },
  { value: 'dental_filling', label: 'Dental Filling / Minor Procedure', avgCost: 280, category: 'dental' },
  { value: 'eye_exam', label: 'Comprehensive Eye & Vision Exam', avgCost: 160, category: 'optical' },
  { value: 'physical_therapy', label: 'Physical Therapy Session', avgCost: 140, category: 'therapy' },
  { value: 'minor_procedure', label: 'Minor Outpatient Surgical Procedure', avgCost: 950, category: 'hospital' },
  { value: 'urgent_care', label: 'Urgent Care Visit', avgCost: 220, category: 'clinic' },
];

export const CostEstimator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [serviceType, setServiceType] = useState('');
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
    queryKey: ['insurance-info', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('insurance_information')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: verification } = useQuery({
    queryKey: ['insurance-verification', insuranceInfo?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('insurance_verifications')
        .select('*')
        .eq('insurance_info_id', insuranceInfo!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!insuranceInfo?.id,
  });

  const calculateEstimate = () => {
    const service = SERVICE_TYPES.find(s => s.value === serviceType);
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
    }, 600);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Procedure & Visit Cost Estimator
        </CardTitle>
        <CardDescription>
          Estimate your out-of-pocket costs before booking, customized to your active insurance coverage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {insuranceInfo ? (
          <div className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-foreground">{insuranceInfo.provider_name}</p>
                <p className="text-xs text-muted-foreground">Policy: {insuranceInfo.policy_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Active Card</Badge>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/insurance-cards')}>
                Manage
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-amber-500/5 rounded-lg border border-amber-500/20 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-muted-foreground">No active insurance card found. Showing estimated self-pay rates.</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => navigate('/insurance-cards')}>
              <CreditCard className="h-3.5 w-3.5" />
              Add Insurance
            </Button>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Select Procedure or Visit Type</label>
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a service or medical procedure..." />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TYPES.map(s => (
                <SelectItem key={s.value} value={s.value}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>{s.label}</span>
                    <span className="text-xs text-muted-foreground">${s.avgCost} avg</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={calculateEstimate} disabled={!serviceType || estimating} className="w-full" size="lg">
          {estimating ? 'Calculating Estimate...' : 'Calculate Out-of-Pocket Cost'}
        </Button>

        {estimate && (
          <div className="space-y-4 p-5 bg-muted/50 rounded-xl border border-border">
            <h4 className="font-semibold text-foreground flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5 text-primary" />
              Estimated Out-of-Pocket Breakdown
            </h4>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium text-foreground">{estimate.serviceLabel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Full Provider Rate</span>
                <span className="font-medium">${estimate.total.toFixed(2)}</span>
              </div>
              {insuranceInfo ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Insurance Portion</span>
                    <span className="font-medium text-emerald-600">-${estimate.coverage.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Copay</span>
                    <span className="font-medium">${estimate.copay.toFixed(2)}</span>
                  </div>
                  {estimate.deductible > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Deductible Applied</span>
                      <span className="font-medium">${estimate.deductible.toFixed(2)}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Self-Pay Savings / Cash Discount</span>
                  <span className="font-medium text-emerald-600">Eligible on booking</span>
                </div>
              )}
              <div className="border-t border-border pt-3 mt-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-foreground">Estimated Out-of-Pocket</p>
                    <p className="text-xs text-muted-foreground">Amount you pay at visit</p>
                  </div>
                  <span className="font-bold text-2xl text-primary">${estimate.outOfPocket.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full gap-2 mt-2" 
              onClick={() => navigate('/search')}
            >
              <CalendarPlus className="h-4 w-4" />
              Find Providers Offering This Care
            </Button>
            
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3.5 w-3.5" />
              Estimates are based on average provider rates and active policy terms. Final charges are subject to in-person clinical evaluation.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
