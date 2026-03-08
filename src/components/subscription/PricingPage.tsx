import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Sparkles, Building2, User, Stethoscope, Loader2, Crown, Zap, Shield, Heart } from 'lucide-react';
import { useSubscriptionPlans, useSubscribeToPlan, useUserSubscription, SubscriptionPlan } from '@/hooks/useSubscription';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const formatKwacha = (amount: number) => {
  if (amount === 0) return 'Free';
  return `K${amount.toLocaleString()}`;
};

// Patient section — always free
const PatientFreeSection = () => (
  <div className="max-w-3xl mx-auto">
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Heart className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Always Free for Patients</CardTitle>
        <CardDescription className="text-base max-w-xl mx-auto">
          Book appointments, access your health records, use our AI symptom checker, and manage your healthcare — all at no cost.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            'Unlimited appointment booking',
            'Health records access',
            'AI symptom checker',
            'Medication reminders',
            'Emergency services directory',
            'Mobile money payments',
            'Family member management',
            'Video consultations',
            'Prescription tracking',
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="justify-center pt-2">
        <Badge variant="secondary" className="text-sm px-4 py-1.5 gap-1">
          <Shield className="h-3.5 w-3.5" /> No hidden fees. No credit card required.
        </Badge>
      </CardFooter>
    </Card>
  </div>
);

// Provider plan card
const ProviderPlanCard = ({ plan, currentPlanId, onSubscribe, isLoading }: {
  plan: SubscriptionPlan;
  currentPlanId?: string;
  onSubscribe: (planId: string, cycle: 'monthly' | 'annual') => void;
  isLoading: boolean;
}) => {
  const isCurrent = plan.id === currentPlanId;
  const isPayPerBooking = plan.plan_type === 'pay_per_booking';
  const bookingFee = plan.booking_fee;

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
        <CardDescription className="text-sm">{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="text-center">
          {isPayPerBooking ? (
            <>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">K0</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="text-sm text-primary font-semibold mt-1">
                K{bookingFee} per new patient booking
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">{formatKwacha(plan.price_monthly)}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              {bookingFee > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  + K{bookingFee} per new patient booking
                </p>
              )}
              {bookingFee === 0 && plan.price_monthly > 0 && (
                <p className="text-sm text-green-600 font-medium mt-1">
                  No booking fees!
                </p>
              )}
            </>
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
          onClick={() => onSubscribe(plan.id, 'monthly')}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> :
           isCurrent ? <><Crown className="h-4 w-4 mr-1" /> Current Plan</> :
           isPayPerBooking ? 'Get Started Free' : 'Subscribe Now'}
        </Button>
      </CardFooter>
    </Card>
  );
};

// Institution plan card
const InstitutionPlanCard = ({ plan, currentPlanId, onSubscribe, isLoading }: {
  plan: SubscriptionPlan;
  currentPlanId?: string;
  onSubscribe: (planId: string, cycle: 'monthly' | 'annual') => void;
  isLoading: boolean;
}) => {
  const isCurrent = plan.id === currentPlanId;

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
        <CardDescription className="text-sm">{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold">{formatKwacha(plan.price_annual)}</span>
            <span className="text-muted-foreground">/year</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            ~{formatKwacha(Math.round(plan.price_annual / 12))}/month
          </p>
        </div>

        {/* Capacity badges */}
        <div className="flex flex-wrap gap-2 justify-center">
          {plan.max_beds && (
            <Badge variant="outline" className="text-xs">{plan.max_beds} beds</Badge>
          )}
          {plan.max_users && (
            <Badge variant="outline" className="text-xs">{plan.max_users} staff</Badge>
          )}
          {plan.max_doctors && (
            <Badge variant="outline" className="text-xs">{plan.max_doctors} doctors</Badge>
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
          onClick={() => onSubscribe(plan.id, 'annual')}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> :
           isCurrent ? <><Crown className="h-4 w-4 mr-1" /> Current Plan</> :
           'Start Annual Plan'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export const PricingPage = () => {
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
  const institutionPlans = plans?.filter(p => p.target_audience === 'institution') || [];

  if (plansLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-10">
      {/* Hero */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Simple, Transparent Pricing</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Free for patients. Flexible plans for providers and institutions. Built for Zambia's healthcare.
        </p>
      </div>

      <Tabs defaultValue="patient" className="space-y-6">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
          <TabsTrigger value="patient" className="gap-1"><User className="h-4 w-4" /> Patients</TabsTrigger>
          <TabsTrigger value="provider" className="gap-1"><Stethoscope className="h-4 w-4" /> Providers</TabsTrigger>
          <TabsTrigger value="institution" className="gap-1"><Building2 className="h-4 w-4" /> Institutions</TabsTrigger>
        </TabsList>

        {/* Patients — Free */}
        <TabsContent value="patient">
          <PatientFreeSection />
        </TabsContent>

        {/* Providers — Pay-per-booking + listing tiers */}
        <TabsContent value="provider">
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-primary">No upfront costs · No long-term contracts · Cancel anytime</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {providerPlans.map(plan => (
                <ProviderPlanCard key={plan.id} plan={plan} currentPlanId={currentSub?.plan_id}
                  onSubscribe={handleSubscribe} isLoading={subscribeMutation.isPending} />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Institutions — Annual tiers */}
        <TabsContent value="institution">
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">All plans are billed annually. Implementation and customization available on request.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {institutionPlans.map(plan => (
                <InstitutionPlanCard key={plan.id} plan={plan} currentPlanId={currentSub?.plan_id}
                  onSubscribe={handleSubscribe} isLoading={subscribeMutation.isPending} />
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Pharmacy note */}
      <div className="max-w-2xl mx-auto text-center space-y-3 border rounded-lg p-6 bg-muted/30">
        <h3 className="font-semibold text-lg">Pharmacies</h3>
        <p className="text-sm text-muted-foreground">
          Pharmacies operate on a commission-only model — no subscription fees. 
          A small percentage is deducted from each order processed through Doc' O Clock.
        </p>
        <Button variant="link" className="text-sm">Contact us for details →</Button>
      </div>

      <div className="text-center text-sm text-muted-foreground space-y-1">
        <p>All plans include SSL encryption, HIPAA-compliant data handling, and 24/7 system monitoring.</p>
        <p>All prices in Zambian Kwacha (ZMW). Need a custom plan? <Button variant="link" className="p-0 h-auto text-sm">Contact our sales team</Button></p>
      </div>
    </div>
  );
};
