import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Sparkles, Building2, User, Stethoscope, Loader2, Crown } from 'lucide-react';
import { useSubscriptionPlans, useSubscribeToPlan, useUserSubscription, SubscriptionPlan } from '@/hooks/useSubscription';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/hooks/use-currency';

const PlanCard = ({ plan, isAnnual, currentPlanId, onSubscribe, isLoading }: {
  plan: SubscriptionPlan;
  isAnnual: boolean;
  currentPlanId?: string;
  onSubscribe: (planId: string, cycle: 'monthly' | 'annual') => void;
  isLoading: boolean;
}) => {
  const { formatPrice } = useCurrency();
  const price = isAnnual ? plan.price_annual : plan.price_monthly;
  const monthlyEquivalent = isAnnual ? (plan.price_annual / 12) : plan.price_monthly;
  const savings = isAnnual ? ((plan.price_monthly * 12) - plan.price_annual) : 0;
  const isCurrent = plan.id === currentPlanId;
  const isFree = plan.price_monthly === 0;

  return (
    <Card className={`relative flex flex-col ${plan.highlight ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]' : 'border-border'}`}>
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground gap-1">
            <Sparkles className="h-3 w-3" /> Most Popular
          </Badge>
        </div>
      )}
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold">{isFree ? 'Free' : formatPrice(monthlyEquivalent)}</span>
            {!isFree && <span className="text-muted-foreground">/mo</span>}
          </div>
          {isAnnual && savings > 0 && (
            <p className="text-sm text-green-600 font-medium mt-1">
              Save {formatPrice(savings)}/year
            </p>
          )}
          {isAnnual && !isFree && (
            <p className="text-xs text-muted-foreground mt-1">
              Billed {formatPrice(price)}/year
            </p>
          )}
        </div>
        <ul className="space-y-2">
          {(plan.features as string[]).map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={plan.highlight ? 'default' : 'outline'}
          disabled={isCurrent || isLoading}
          onClick={() => onSubscribe(plan.id, isAnnual ? 'annual' : 'monthly')}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
           isCurrent ? <><Crown className="h-4 w-4 mr-1" /> Current Plan</> :
           isFree ? 'Get Started Free' : 'Subscribe Now'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: currentSub } = useUserSubscription();
  const subscribeMutation = useSubscribeToPlan();

  const handleSubscribe = (planId: string, cycle: 'monthly' | 'annual') => {
    if (!user) {
      navigate('/auth');
      return;
    }
    subscribeMutation.mutate({ planId, billingCycle: cycle });
  };

  const providerPlans = plans?.filter(p => p.target_audience === 'provider') || [];
  const patientPlans = plans?.filter(p => p.target_audience === 'patient') || [];
  const institutionPlans = plans?.filter(p => p.target_audience === 'institution') || [];

  if (plansLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Simple, Transparent Pricing</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that fits your healthcare needs. All plans include our core features.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Label className={!isAnnual ? 'font-semibold' : 'text-muted-foreground'}>Monthly</Label>
          <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
          <Label className={isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
            Annual <Badge variant="secondary" className="ml-1">Save 20%</Badge>
          </Label>
        </div>
      </div>

      <Tabs defaultValue="patient" className="space-y-6">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
          <TabsTrigger value="patient" className="gap-1"><User className="h-4 w-4" /> Patients</TabsTrigger>
          <TabsTrigger value="provider" className="gap-1"><Stethoscope className="h-4 w-4" /> Providers</TabsTrigger>
          <TabsTrigger value="institution" className="gap-1"><Building2 className="h-4 w-4" /> Institutions</TabsTrigger>
        </TabsList>

        <TabsContent value="patient">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {patientPlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} isAnnual={isAnnual} currentPlanId={currentSub?.plan_id}
                onSubscribe={handleSubscribe} isLoading={subscribeMutation.isPending} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="provider">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {providerPlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} isAnnual={isAnnual} currentPlanId={currentSub?.plan_id}
                onSubscribe={handleSubscribe} isLoading={subscribeMutation.isPending} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="institution">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {institutionPlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} isAnnual={isAnnual} currentPlanId={currentSub?.plan_id}
                onSubscribe={handleSubscribe} isLoading={subscribeMutation.isPending} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="text-center text-sm text-muted-foreground space-y-1">
        <p>All plans include SSL encryption, HIPAA-compliant data handling, and 24/7 system monitoring.</p>
        <p>Need a custom plan? <Button variant="link" className="p-0 h-auto text-sm">Contact our sales team</Button></p>
      </div>
    </div>
  );
};
