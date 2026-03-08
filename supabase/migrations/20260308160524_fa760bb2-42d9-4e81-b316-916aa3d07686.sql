
-- ============================================================
-- 1. PROMO CODES SYSTEM
-- ============================================================

CREATE TYPE public.promo_code_type AS ENUM (
  'one_time',           -- can be used once total
  'new_users_only',     -- only for accounts created after code was created
  'referral',           -- activated when referred user spends X amount
  'multi_use'           -- can be used N times
);

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  promo_type promo_code_type NOT NULL DEFAULT 'one_time',
  
  -- Who can use it
  target_audience text NOT NULL DEFAULT 'all',  -- 'all', 'patient', 'provider', 'institution'
  
  -- Value
  discount_type text NOT NULL DEFAULT 'percentage',  -- 'percentage', 'fixed', 'free_trial_days', 'subscription_credit'
  discount_value numeric(10,2) NOT NULL DEFAULT 0,   -- e.g. 20 for 20%, or 500 for K500 off, or 30 for 30 days trial
  
  -- Limits
  max_uses integer,                    -- NULL = unlimited
  times_used integer DEFAULT 0,
  min_spend_amount numeric(10,2),      -- for referral: referred user must spend this much
  
  -- Validity
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  
  -- Referral specific
  referrer_reward_amount numeric(10,2),  -- reward for the person who referred
  referrer_reward_type text,              -- 'wallet_credit', 'subscription_days'
  
  -- Audit
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at timestamptz DEFAULT now(),
  discount_applied numeric(10,2),
  context text,                       -- 'subscription', 'booking', 'marketplace'
  
  -- Referral tracking
  referred_by uuid REFERENCES auth.users(id),
  referral_spend_met boolean DEFAULT false,
  referral_reward_paid boolean DEFAULT false,
  
  UNIQUE(promo_code_id, user_id)      -- one redemption per user per code
);

-- ============================================================
-- 2. FREE TRIAL SUPPORT (30 days for providers)
-- ============================================================

ALTER TABLE public.user_subscriptions 
  ADD COLUMN IF NOT EXISTS trial_start timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end timestamptz,
  ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES public.promo_codes(id);

-- ============================================================
-- 3. PROVIDER TEAMS (solo providers with small staff)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.provider_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id uuid REFERENCES auth.users(id),
  member_email text NOT NULL,
  role_title text NOT NULL,                -- 'Dental Assistant', 'Receptionist', etc.
  specialty_role_id uuid REFERENCES public.specialty_staff_roles(id),
  status text NOT NULL DEFAULT 'invited',  -- 'invited', 'active', 'removed'
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(owner_id, member_email)
);

-- ============================================================
-- 4. SUBSCRIPTION FEATURE GATING
-- ============================================================

CREATE TABLE IF NOT EXISTS public.feature_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,        -- e.g. 'marketplace_listing', 'team_members', 'analytics'
  description text,
  free_limit integer DEFAULT 0,            -- what free tier gets (0 = blocked)
  requires_plan_type text[],               -- which plan_types unlock it
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.feature_gates (feature_key, description, free_limit, requires_plan_type) VALUES
  ('marketplace_listing', 'List on provider marketplace', 0, ARRAY['pay_per_booking', 'subscription']),
  ('team_members', 'Add team members', 0, ARRAY['subscription']),
  ('team_members_max_free', 'Max team members on free', 0, NULL),
  ('analytics_dashboard', 'Advanced analytics', 0, ARRAY['subscription']),
  ('priority_listing', 'Priority in search results', 0, ARRAY['subscription']),
  ('video_consultations', 'Video consultation feature', 1, ARRAY['free', 'pay_per_booking', 'subscription']),
  ('ai_diagnostics', 'AI diagnostic support', 3, ARRAY['free', 'pay_per_booking', 'subscription']),
  ('appointment_booking', 'Receive appointments', 5, ARRAY['free', 'pay_per_booking', 'subscription']),
  ('chat_messaging', 'Patient messaging', 10, ARRAY['free', 'pay_per_booking', 'subscription']),
  ('medical_records', 'Access medical records', 1, ARRAY['free', 'pay_per_booking', 'subscription']),
  ('pharmacy_chat', 'Chat with customers', 1, ARRAY['free', 'pay_per_booking', 'subscription']),
  ('delivery_tracking', 'Track deliveries', 0, ARRAY['pay_per_booking', 'subscription'])
ON CONFLICT (feature_key) DO NOTHING;

-- ============================================================
-- 5. REFERRAL TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS public.referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code_id uuid REFERENCES public.promo_codes(id),
  referral_code text NOT NULL UNIQUE,      -- short shareable code
  total_referrals integer DEFAULT 0,
  total_conversions integer DEFAULT 0,     -- referrals that met spend threshold
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;

-- Promo codes: admins manage, everyone can read active ones
CREATE POLICY "Anyone can read active promo codes" ON public.promo_codes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage promo codes" ON public.promo_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin());

-- Redemptions: users see own, admins see all
CREATE POLICY "Users see own redemptions" ON public.promo_code_redemptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can redeem codes" ON public.promo_code_redemptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins see all redemptions" ON public.promo_code_redemptions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin());

-- Provider teams: owner and members can see
CREATE POLICY "Owner manages team" ON public.provider_team_members
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Members see own membership" ON public.provider_team_members
  FOR SELECT TO authenticated USING (member_id = auth.uid());

-- Feature gates: readable by all
CREATE POLICY "Anyone can read feature gates" ON public.feature_gates
  FOR SELECT USING (true);

CREATE POLICY "Admins manage feature gates" ON public.feature_gates
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Referral links
CREATE POLICY "Users manage own referral links" ON public.referral_links
  FOR ALL TO authenticated
  USING (referrer_id = auth.uid())
  WITH CHECK (referrer_id = auth.uid());

-- ============================================================
-- 7. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_user ON public.promo_code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_code ON public.promo_code_redemptions(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_provider_team_owner ON public.provider_team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_referrer ON public.referral_links(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_code ON public.referral_links(referral_code);

-- ============================================================
-- 8. FUNCTION: Validate & redeem promo code
-- ============================================================

CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_code text,
  p_context text DEFAULT 'subscription'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_promo promo_codes%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_user_created_at timestamptz;
  v_already_redeemed boolean;
  v_discount jsonb;
BEGIN
  -- Find the promo code
  SELECT * INTO v_promo FROM promo_codes WHERE code = UPPER(TRIM(p_code)) AND is_active = true;
  
  IF v_promo IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired promo code');
  END IF;
  
  -- Check validity dates
  IF v_promo.valid_from > now() OR (v_promo.valid_until IS NOT NULL AND v_promo.valid_until < now()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This promo code is not currently valid');
  END IF;
  
  -- Check max uses
  IF v_promo.max_uses IS NOT NULL AND v_promo.times_used >= v_promo.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'This promo code has reached its usage limit');
  END IF;
  
  -- Check if already redeemed by this user
  SELECT EXISTS(SELECT 1 FROM promo_code_redemptions WHERE promo_code_id = v_promo.id AND user_id = v_user_id)
    INTO v_already_redeemed;
  
  IF v_already_redeemed THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already used this promo code');
  END IF;
  
  -- Check new_users_only
  IF v_promo.promo_type = 'new_users_only' THEN
    SELECT created_at INTO v_user_created_at FROM auth.users WHERE id = v_user_id;
    IF v_user_created_at < v_promo.created_at THEN
      RETURN jsonb_build_object('success', false, 'error', 'This promo code is only for new users');
    END IF;
  END IF;
  
  -- Check target audience
  IF v_promo.target_audience != 'all' THEN
    IF v_promo.target_audience = 'provider' AND NOT EXISTS(
      SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role IN ('health_personnel')
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'This promo code is for healthcare providers only');
    END IF;
    IF v_promo.target_audience = 'patient' AND NOT EXISTS(
      SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role = 'patient'
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'This promo code is for patients only');
    END IF;
  END IF;
  
  -- Redeem
  INSERT INTO promo_code_redemptions (promo_code_id, user_id, discount_applied, context)
  VALUES (v_promo.id, v_user_id, v_promo.discount_value, p_context);
  
  UPDATE promo_codes SET times_used = times_used + 1, updated_at = now() WHERE id = v_promo.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'discount_type', v_promo.discount_type,
    'discount_value', v_promo.discount_value,
    'promo_type', v_promo.promo_type,
    'promo_code_id', v_promo.id
  );
END;
$$;
