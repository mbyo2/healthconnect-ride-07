import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calculator, Info, ShieldCheck, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';

const SERVICE_TYPES = [
  { value: 'consultation', label: 'General Consultation', avgCost: 150 },
  { value: 'specialist', label: 'Specialist Visit', avgCost: 300 },
  { value: 'video_consultation', label: 'Video Consultation', avgCost: 100 },
  { value: 'lab_work', label: 'Lab Work / Blood Test', avgCost: 200 },
  { value: 'imaging', label: 'Imaging (X-Ray/MRI)', avgCost: 500 },
  { value: 'procedure', label: 'Minor Procedure', avgCost: 800 },
  { value: 'physical_exam', label: 'Annual Physical Exam', avgCost: 250 },
  { value: 'urgent_care', label: 'Urgent Care Visit', avgCost: 200 },
];

export const CostEstimator = () => {
  const { user } = useAuth();
  const [serviceType, setServiceType] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<{
    total: number;
    coverage: number;
    copay: number;
    deductible: number;
    outOfPocket: number;
  } | null>(null);

  const { data: insuranceInfo } = useQuery({
    queryKey: ['insurance-info', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('insurance_information')
        .select('*')
        .eq('patient_id', user!.id)
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

    // Simulate cost calculation based on insurance
    setTimeout(() => {
      const total = service.avgCost;
      const coveragePercent = verification?.coverage_percentage || 80;
      const copay = verification?.copay_amount || 30;
      const deductibleRemaining = verification?.deductible_remaining || 500;

      const coverageAmount = total * (coveragePercent / 100);
      const deductibleApplied = Math.min(deductibleRemaining, total - copay);
      const outOfPocket = Math.max(copay, total - coverageAmount + deductibleApplied);

      setEstimate({
        total,
        coverage: coverageAmount,
        copay,
        deductible: deductibleApplied,
        outOfPocket: Math.round(outOfPocket * 100) / 100,
      });
      setEstimating(false);
    }, 800);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Cost Estimator
        </CardTitle>
        <CardDescription>
          Get an estimate of your out-of-pocket costs before your visit
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {insuranceInfo ? (
          <div className="flex items-center gap-3 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-foreground">{insuranceInfo.provider_name}</p>
              <p className="text-xs text-muted-foreground">Policy: {insuranceInfo.policy_number}</p>
            </div>
            <Badge className="ml-auto bg-emerald-500/10 text-emerald-700">Active</Badge>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
            <Info className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-muted-foreground">No insurance on file. Estimates shown as self-pay rates.</p>
          </div>
        )}

        <div>
          <Label>Select Service Type</Label>
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Choose a service..." />
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

        <Button onClick={calculateEstimate} disabled={!serviceType || estimating} className="w-full">
          {estimating ? 'Calculating...' : 'Get Estimate'}
        </Button>

        {estimate && (
          <div className="space-y-3 p-4 bg-muted/50 rounded-xl">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Cost Breakdown
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimated Total</span>
                <span className="font-medium">${estimate.total.toFixed(2)}</span>
              </div>
              {insuranceInfo && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Insurance Coverage</span>
                    <span className="font-medium text-emerald-600">-${estimate.coverage.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Copay</span>
                    <span className="font-medium">${estimate.copay.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deductible Applied</span>
                    <span className="font-medium">${estimate.deductible.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">Your Estimated Cost</span>
                  <span className="font-bold text-lg text-primary">${estimate.outOfPocket.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <Info className="h-3 w-3" />
              This is an estimate only. Actual costs may vary based on services rendered.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
