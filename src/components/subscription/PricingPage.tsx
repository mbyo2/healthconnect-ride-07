import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, Sparkles, Building2, User, Stethoscope, Loader2, Crown, Shield, Heart, DollarSign, UserPlus, Clock, Pill } from 'lucide-react';
import { useSubscriptionPlans, useSubscribeToPlan, useUserSubscription, SubscriptionPlan } from '@/hooks/useSubscription';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const formatKwacha = (amount: number) => {
  if (amount === 0) return 'Free';
  return `K${amount.toLocaleString()}`;
};

/* ─── Patient Section ─── */
const PatientFreeSection = () => (
  <div className="max-w-3xl mx-auto space-y-6">
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Heart className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Free to Use — Pay Only for Care</CardTitle>
        <CardDescription className="text-base max-w-xl mx-auto">
          Browsing, searching, and managing your health on Doc' O Clock is <strong>always free</strong>. 
          You only pay when you book a consultation or appointment — and that's the doctor's fee, not ours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-sm mb-2 text-primary">Always Free</h4>
            <ul className="space-y-1.5">
              {[
                'Search & browse doctors',
                'AI symptom checker',
                'Health records access',
                'Medication reminders',
                'Emergency services directory',
                'Family member management',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2 text-foreground">When You Book</h4>
            <ul className="space-y-1.5">
              {[
                'Consultation fees (set by provider)',
                'Video consultation fees',
                'Prescription medication costs',
                'Lab test fees (if ordered)',
                'Delivery fees for pharmacy orders',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-center pt-2">
        <Badge variant="secondary" className="text-sm px-4 py-1.5 gap-1">
          <Shield className="h-3.5 w-3.5" /> Zero platform fees for patients. Ever.
        </Badge>
      </CardFooter>
    </Card>
  </div>
);

/* ─── Provider Pay-Per-Booking Section ─── */
const ProviderPayPerBookingSection = () => {
  const { data: specialtyFees } = useQuery({
    queryKey: ['specialty-booking-fees'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('specialty_booking_fees')
        .select('*')
        .eq('is_active', true)
        .eq('location_tier', 'standard')
        .order('specialty');
      if (error) throw error;
      return data as { specialty: string; booking_fee: number }[];
    },
  });

  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-primary/10">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Pay Only for New Patients</CardTitle>
          <CardDescription className="text-base max-w-xl mx-auto">
            List your practice for free. You're only charged when a <strong>new patient</strong> books through Doc' O Clock.
            Returning patients are always free. No monthly fees. No contracts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-background border">
              <DollarSign className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-semibold text-sm">K0 to List</p>
              <p className="text-xs text-muted-foreground">Free profile & visibility</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background border">
              <UserPlus className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-semibold text-sm">K30–K120 per Booking</p>
              <p className="text-xs text-muted-foreground">Only new patients, varies by specialty</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background border">
              <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-semibold text-sm">Cancel Anytime</p>
              <p className="text-xs text-muted-foreground">No lock-in, no contracts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">What's Included — Free</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {['Professional profile & listing', 'Appointment management', 'Patient messaging & chat',
                'Automated reminders (SMS/Email)', 'Video consultations', 'Prescription management',
                'Analytics dashboard', 'No-show tracking & alerts'].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" /><span>{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">How It Works</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { step: '1', title: 'Create your free profile', desc: 'List your practice, specialties, and availability' },
              { step: '2', title: 'New patients find you', desc: 'Patients search and book appointments through Doc\' O Clock' },
              { step: '3', title: 'You get charged per new booking', desc: 'A one-time fee based on your specialty — only for first-time patients' },
              { step: '4', title: 'Returning patients = free', desc: 'Once a patient is yours, all future bookings cost you nothing' },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{item.step}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {specialtyFees && specialtyFees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Booking Fees by Specialty</CardTitle>
            <CardDescription>One-time fee per new patient booking. Varies by specialty and demand.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Specialty</TableHead>
                  <TableHead className="text-right">Fee per New Patient</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {specialtyFees.map((fee) => (
                  <TableRow key={fee.specialty}>
                    <TableCell className="font-medium">{fee.specialty}</TableCell>
                    <TableCell className="text-right">K{fee.booking_fee}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-3">
              * Fees may vary by location. Premium areas may have higher rates.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Button size="lg" onClick={() => !user ? navigate('/auth') : navigate('/provider-dashboard')}>
          {user ? 'Go to Dashboard' : 'Get Started Free'}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">No credit card required · Start getting patients today</p>
      </div>
    </div>
  );
};

/* ─── Pharmacy Section ─── */
const PharmacySection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Pill className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Marketplace Listing + Commission</CardTitle>
          <CardDescription className="text-base max-w-xl mx-auto">
            Get listed on Doc' O Clock, receive prescription orders, and manage deliveries. 
            Small listing fee + 2.5% commission on each sale.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-background border">
              <DollarSign className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-semibold text-sm">K200/mo</p>
              <p className="text-xs text-muted-foreground">Marketplace listing fee</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background border">
              <Pill className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-semibold text-sm">2.5% Commission</p>
              <p className="text-xs text-muted-foreground">Per order processed</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background border">
              <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-semibold text-sm">K2,000/yr</p>
              <p className="text-xs text-muted-foreground">Save with annual billing</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">What's Included</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'Marketplace visibility & search',
                'Online order receiving',
                'Prescription fulfillment workflow',
                'Delivery zone management',
                'Inventory sync & alerts',
                '2.5% commission on sales',
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" /><span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={() => !user ? navigate('/auth') : navigate('/pharmacy')}>
            {user ? 'Go to Pharmacy Dashboard' : 'Get Started'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

/* ─── Static Institution Plans ─── */
const staticInstitutionPlans = [
  {
    name: 'Clinic Basic',
    price: 20000,
    description: 'Perfect for small clinics and practices',
    highlight: false,
    features: ['Up to 20 beds', 'Up to 10 staff', 'Basic HMS modules', 'Patient management', 'Appointment scheduling', 'Basic reporting'],
    badges: [{ label: '20 beds' }, { label: '10 staff' }],
  },
  {
    name: 'Hospital Standard',
    price: 45000,
    description: 'For mid-size hospitals needing full HMS',
    highlight: true,
    features: ['Up to 100 beds', 'Up to 50 staff', 'Full HMS suite', 'Lab & radiology integration', 'Billing & invoicing', 'Advanced analytics', 'Telemedicine support'],
    badges: [{ label: '100 beds' }, { label: '50 staff' }],
  },
  {
    name: 'Hospital Enterprise',
    price: 80000,
    description: 'For large hospitals with advanced needs',
    highlight: false,
    features: ['Up to 500 beds', 'Up to 200 staff', 'Full HMS + CXO dashboards', 'Multi-department management', 'IoT device integration', 'Custom reporting', 'Priority support', 'API access'],
    badges: [{ label: '500 beds' }, { label: '200 staff' }],
  },
  {
    name: 'Custom / Unlimited',
    price: -1,
    description: 'Tailored for large networks & government',
    highlight: false,
    features: ['Unlimited beds & staff', 'Multi-facility management', 'Dedicated account manager', 'Custom integrations', 'On-premise deployment option', 'SLA guarantees', 'Training & onboarding'],
    badges: [{ label: 'Unlimited capacity' }],
  },
];

const StaticInstitutionCard = ({ plan }: { plan: typeof staticInstitutionPlans[0] }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isContactUs = plan.price === -1;

  return (
    <Card className={`relative flex flex-col ${plan.highlight ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]' : 'border-border'}`}>
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground gap-1"><Sparkles className="h-3 w-3" /> Most Popular</Badge>
        </div>
      )}
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription className="text-sm">{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="text-center">
          {isContactUs ? (
            <span className="text-3xl font-bold">Contact Us</span>
          ) : (
            <>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">{formatKwacha(plan.price)}</span>
                <span className="text-muted-foreground">/year</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">~{formatKwacha(Math.round(plan.price / 12))}/month</p>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {plan.badges.map((b, i) => (
            <Badge key={i} variant="outline" className="text-xs">{b.label}</Badge>
          ))}
        </div>
        <ul className="space-y-2">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {isContactUs ? (
          <Button className="w-full" variant="outline" onClick={() => navigate('/contact')}>
            Contact Sales
          </Button>
        ) : (
          <Button className="w-full" variant={plan.highlight ? 'default' : 'outline'}
            onClick={() => !user ? navigate('/auth') : navigate('/institution-dashboard')}>
            {user ? 'Go to Dashboard' : 'Get Started'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

/* ─── Main Pricing Page ─── */
export const PricingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: currentSub } = useUserSubscription();
  const subscribeMutation = useSubscribeToPlan();

  const handleSubscribe = (planId: string, cycle: 'monthly' | 'annual') => {
    if (!user) { navigate('/auth'); return; }
    subscribeMutation.mutate({ planId, billingCycle: cycle });
  };

  const institutionPlans = plans?.filter(p => p.target_audience === 'institution') || [];

  if (plansLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <Helmet>
        <title>Pricing — Doc' O Clock Healthcare Platform</title>
        <meta name="description" content="Free for patients. Pay-per-booking for providers. Transparent pricing for pharmacies and hospitals." />
        <meta property="og:title" content="Pricing | Doc' O Clock" />
        <meta property="og:description" content="Simple, transparent healthcare pricing." />
        <link rel="canonical" href="https://dococlockapp.com/pricing" />
      </Helmet>
    <div className="container mx-auto py-8 space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Simple, Transparent Pricing</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Free to browse for patients. Pay-per-new-patient for providers. Listing + commission for pharmacies. Annual HMS for hospitals.
        </p>
      </div>

      <Tabs defaultValue="patient" className="space-y-6">
        <TabsList className="grid w-full max-w-lg mx-auto grid-cols-4 bg-muted/80 p-1 rounded-xl">
          <TabsTrigger value="patient" className="gap-1 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg transition-all"><User className="h-4 w-4" /> Patients</TabsTrigger>
          <TabsTrigger value="provider" className="gap-1 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg transition-all"><Stethoscope className="h-4 w-4" /> Providers</TabsTrigger>
          <TabsTrigger value="pharmacy" className="gap-1 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg transition-all"><Pill className="h-4 w-4" /> Pharmacies</TabsTrigger>
          <TabsTrigger value="institution" className="gap-1 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg transition-all"><Building2 className="h-4 w-4" /> Hospitals</TabsTrigger>
        </TabsList>

        <TabsContent value="patient"><PatientFreeSection /></TabsContent>
        <TabsContent value="provider"><ProviderPayPerBookingSection /></TabsContent>
        <TabsContent value="pharmacy"><PharmacySection /></TabsContent>

        <TabsContent value="institution">
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                HMS subscription only — you manage your own billing & pricing. Marketplace listing is optional.
              </p>
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

      <div className="text-center text-sm text-muted-foreground space-y-1">
        <p>All plans include SSL encryption, HIPAA-compliant data handling, and 24/7 system monitoring.</p>
        <p>All prices in Zambian Kwacha (ZMW). Need a custom plan? <Button variant="link" className="p-0 h-auto text-sm">Contact our sales team</Button></p>
      </div>
    </div>
    </>
  );
};
