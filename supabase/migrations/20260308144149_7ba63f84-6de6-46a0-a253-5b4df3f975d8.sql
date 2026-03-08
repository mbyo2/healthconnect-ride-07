-- Subscription Plans for Providers and Patients
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  target_audience TEXT NOT NULL CHECK (target_audience IN ('provider', 'patient', 'institution')),
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_annual DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  limits JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  highlight BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Subscriptions
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'trialing')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  payment_method TEXT,
  external_subscription_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Revenue Events for analytics
CREATE TABLE public.revenue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('subscription_started', 'subscription_renewed', 'subscription_cancelled', 'subscription_upgraded', 'subscription_downgraded', 'one_time_payment', 'refund', 'commission_earned', 'ad_revenue')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  source TEXT NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_events ENABLE ROW LEVEL SECURITY;

-- Anyone can read plans
CREATE POLICY "Anyone can read active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

-- Admins can manage plans
CREATE POLICY "Admins can manage plans" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can read their own subscriptions
CREATE POLICY "Users can read own subscriptions" ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own subscriptions
CREATE POLICY "Users can create own subscriptions" ON public.user_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions" ON public.user_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all subscriptions
CREATE POLICY "Admins can read all subscriptions" ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Revenue events - admin only
CREATE POLICY "Admins can read revenue events" ON public.revenue_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert revenue events
CREATE POLICY "Service role can manage revenue events" ON public.revenue_events
  FOR ALL USING (public.is_service_role());

-- Users can insert own revenue events (for subscription creation)
CREATE POLICY "Users can log own revenue events" ON public.revenue_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Seed default subscription plans
INSERT INTO public.subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, features, limits, sort_order, highlight) VALUES
-- Provider Plans
('Provider Free', 'provider-free', 'Basic listing and patient management', 'provider', 0, 0, 
  '["Basic provider profile", "Up to 10 appointments/month", "Standard search listing", "Basic chat messaging", "Wallet payments"]'::jsonb,
  '{"max_appointments_monthly": 10, "max_patients": 50, "promoted_listings": false}'::jsonb, 1, false),

('Provider Pro', 'provider-pro', 'Growth tools and priority visibility', 'provider', 49.99, 479.88,
  '["Priority search ranking", "Unlimited appointments", "Advanced analytics dashboard", "Promoted listings access", "Booking widget for website", "Video consultations", "AI-powered scheduling", "Insurance verification"]'::jsonb,
  '{"max_appointments_monthly": -1, "max_patients": -1, "promoted_listings": true, "analytics": true}'::jsonb, 2, true),

('Provider Enterprise', 'provider-enterprise', 'Full suite for large practices', 'provider', 199.99, 1919.88,
  '["Everything in Pro", "Multi-provider practice management", "Custom branding", "API access", "Dedicated support", "EHR/FHIR integration", "Custom reporting", "White-label booking page"]'::jsonb,
  '{"max_appointments_monthly": -1, "max_patients": -1, "promoted_listings": true, "analytics": true, "api_access": true, "custom_branding": true}'::jsonb, 3, false),

-- Patient Plans
('Patient Free', 'patient-free', 'Access to basic healthcare features', 'patient', 0, 0,
  '["Search and book providers", "Basic health records", "Prescription tracking", "Emergency contacts", "1 AI chat/day"]'::jsonb,
  '{"ai_chats_daily": 1, "family_members": 0, "video_consultations": false}'::jsonb, 1, false),

('Patient Premium', 'patient-premium', 'Enhanced healthcare experience', 'patient', 9.99, 95.88,
  '["Unlimited AI health assistant", "Priority booking", "Video consultations", "Advanced health analytics", "Medication reminders", "IoT device integration", "Cost estimator", "Insurance card storage"]'::jsonb,
  '{"ai_chats_daily": -1, "family_members": 0, "video_consultations": true, "priority_booking": true}'::jsonb, 2, true),

('Patient Family', 'patient-family', 'Healthcare for the whole family', 'patient', 24.99, 239.88,
  '["Everything in Premium", "Up to 5 family members", "Family health dashboard", "Shared medical records", "Pediatric features", "Family appointment scheduling", "Group insurance management"]'::jsonb,
  '{"ai_chats_daily": -1, "family_members": 5, "video_consultations": true, "priority_booking": true, "family_dashboard": true}'::jsonb, 3, false),

-- Institution Plans
('Institution Starter', 'institution-starter', 'Basic HMS for small clinics', 'institution', 99.99, 959.88,
  '["Basic HMS modules", "Up to 5 staff", "Patient management", "Appointment scheduling", "Basic reporting"]'::jsonb,
  '{"max_staff": 5, "max_departments": 3, "advanced_modules": false}'::jsonb, 1, false),

('Institution Professional', 'institution-professional', 'Full HMS for hospitals', 'institution', 499.99, 4799.88,
  '["All HMS modules", "Unlimited staff", "Lab & Radiology management", "Pharmacy management", "IoT device integration", "Advanced analytics", "FHIR export"]'::jsonb,
  '{"max_staff": -1, "max_departments": -1, "advanced_modules": true}'::jsonb, 2, true),

('Institution Enterprise', 'institution-enterprise', 'Enterprise healthcare network', 'institution', 1499.99, 14399.88,
  '["Everything in Professional", "Multi-facility management", "Custom integrations", "Dedicated account manager", "SLA guarantee", "On-site training", "Custom development"]'::jsonb,
  '{"max_staff": -1, "max_departments": -1, "advanced_modules": true, "multi_facility": true, "custom_integrations": true}'::jsonb, 3, false);

-- Updated_at trigger
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();