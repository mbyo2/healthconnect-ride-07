-- Per-institution commercial-terms overrides (CEO order 2026-11-24).
--
-- Governing rule: every commercial term for an institution (pilot free
-- days, pilot per-doctor / per-facility rates, year-one discount, tier
-- monthly rate, founding-cohort membership) must be variable PER
-- INSTITUTION by the platform super_admin, so a specific arrangement
-- with a hospital can always be honoured in the system. Platform values
-- (30 free days, K350/doctor, K2,500/facility, up to 50% off year one,
-- founding cohort cap 5, tier list prices in subscription_plans) are
-- DEFAULTS ONLY — an override row wins wherever it sets a value.
--
-- Storage: one row per institution in institution_commercial_terms;
-- every term column is nullable, NULL means "use the platform default".
-- Resolution: get_institution_effective_terms() applies
-- override-where-set, else default. Writes are super_admin-only (RLS);
-- platform admins and the institution's own admin/staff can read.
-- Every change is audit-logged to security_audit_log by trigger,
-- mirroring audit_module_entitlement_change.

CREATE TABLE IF NOT EXISTS public.institution_commercial_terms (
  institution_id uuid PRIMARY KEY
    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  tier_monthly_rate_override numeric(12,2) NULL
    CHECK (tier_monthly_rate_override IS NULL OR tier_monthly_rate_override >= 0),
  pilot_free_days integer NULL
    CHECK (pilot_free_days IS NULL OR (pilot_free_days >= 0 AND pilot_free_days <= 3650)),
  pilot_per_doctor_rate numeric(12,2) NULL
    CHECK (pilot_per_doctor_rate IS NULL OR pilot_per_doctor_rate >= 0),
  pilot_facility_rate numeric(12,2) NULL
    CHECK (pilot_facility_rate IS NULL OR pilot_facility_rate >= 0),
  year_one_discount_pct numeric(5,2) NULL
    CHECK (year_one_discount_pct IS NULL OR (year_one_discount_pct >= 0 AND year_one_discount_pct <= 100)),
  is_founding_cohort boolean NULL,
  pilot_started_at timestamptz NULL,
  notes text NULL,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.institution_commercial_terms IS
  'Per-institution commercial-terms overrides set by the platform super_admin. NULL term = platform default applies. See get_institution_effective_terms().';

-- CEO Supabase grant rule (2026-10-28): explicit scoped GRANTs in the
-- same migration; RLS is the row-level gate. Never GRANT TO public.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_commercial_terms TO authenticated;
GRANT ALL ON public.institution_commercial_terms TO service_role;

ALTER TABLE public.institution_commercial_terms ENABLE ROW LEVEL SECURITY;

-- Read: platform admins, plus the institution's own admin / active staff
-- (same membership shape as the institution_module_entitlements policy).
DROP POLICY IF EXISTS "Commercial terms readable by admins and institution members" ON public.institution_commercial_terms;
CREATE POLICY "Commercial terms readable by admins and institution members"
  ON public.institution_commercial_terms
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.healthcare_institutions hi
      WHERE hi.id = institution_commercial_terms.institution_id
        AND hi.admin_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.institution_staff ist
      WHERE ist.institution_id = institution_commercial_terms.institution_id
        AND ist.provider_id = auth.uid()
        AND ist.is_active = true
    )
  );

-- Write: platform super_admin ONLY.
DROP POLICY IF EXISTS "Super admins insert commercial terms" ON public.institution_commercial_terms;
CREATE POLICY "Super admins insert commercial terms"
  ON public.institution_commercial_terms
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admins update commercial terms" ON public.institution_commercial_terms;
CREATE POLICY "Super admins update commercial terms"
  ON public.institution_commercial_terms
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admins delete commercial terms" ON public.institution_commercial_terms;
CREATE POLICY "Super admins delete commercial terms"
  ON public.institution_commercial_terms
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Stamp updated_by / updated_at server-side so the audit trail cannot
-- be spoofed by the client.
CREATE OR REPLACE FUNCTION public.set_commercial_terms_stamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_set_commercial_terms_stamp ON public.institution_commercial_terms;
CREATE TRIGGER trg_set_commercial_terms_stamp
  BEFORE INSERT OR UPDATE ON public.institution_commercial_terms
  FOR EACH ROW EXECUTE FUNCTION public.set_commercial_terms_stamp();

-- Audit every change into security_audit_log (same shape and
-- never-propagate fallback as audit_module_entitlement_change).
CREATE OR REPLACE FUNCTION public.audit_commercial_terms_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_state text;
  v_msg text;
BEGIN
  BEGIN
    INSERT INTO public.security_audit_log (user_id, event_type, event_data)
    VALUES (
      COALESCE(auth.uid(), CASE WHEN TG_OP = 'DELETE' THEN OLD.updated_by ELSE NEW.updated_by END),
      'institution_commercial_terms_changed',
      jsonb_build_object(
        'op', TG_OP,
        'institution_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.institution_id ELSE NEW.institution_id END,
        'old', CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        'new', CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_state := SQLSTATE;
    v_msg := SQLERRM;
    RAISE WARNING 'audit writer audit_commercial_terms_change failed: [%] %', v_state, v_msg;
    BEGIN
      INSERT INTO public.security_audit_log (user_id, event_type, event_data)
      VALUES (auth.uid(), 'audit_writer_failure',
              jsonb_build_object('writer', 'audit_commercial_terms_change', 'sqlstate', v_state, 'error', v_msg));
    EXCEPTION WHEN OTHERS THEN
      NULL; -- fallback must never propagate; the WARNING above is the visibility guarantee
    END;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_audit_commercial_terms_change ON public.institution_commercial_terms;
CREATE TRIGGER trg_audit_commercial_terms_change
  AFTER INSERT OR UPDATE OR DELETE ON public.institution_commercial_terms
  FOR EACH ROW EXECUTE FUNCTION public.audit_commercial_terms_change();

-- ── Effective-terms resolution ─────────────────────────────────────
-- Single source of truth: override where set, else platform default.
-- Tier: the institution's current institution-audience subscription
-- plan (the user_subscriptions row owned by the institution's admin
-- user — the same linkage subscriptionStatus.ts documents), at list
-- price unless tier_monthly_rate_override is set.
-- Access mirrors the table's SELECT policy; anyone else gets 42501.
CREATE OR REPLACE FUNCTION public.get_institution_effective_terms(p_institution_id uuid)
RETURNS TABLE (
  institution_id uuid,
  tier_plan_id uuid,
  tier_name text,
  tier_list_monthly numeric,
  eff_tier_monthly_rate numeric,
  eff_year_one_discount_pct numeric,
  eff_year_one_monthly_rate numeric,
  eff_pilot_free_days integer,
  eff_pilot_per_doctor_rate numeric,
  eff_pilot_facility_rate numeric,
  eff_is_founding_cohort boolean,
  founding_cohort_cap integer,
  pilot_started_at timestamptz,
  has_override boolean,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_plan_id uuid;
  v_plan_name text;
  v_list numeric;
  v_ovr public.institution_commercial_terms%ROWTYPE;
  v_has_ovr boolean := false;
  v_allowed boolean := false;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    v_allowed :=
      public.has_role(auth.uid(), 'super_admin'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.healthcare_institutions hi
        WHERE hi.id = p_institution_id AND hi.admin_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.institution_staff ist
        WHERE ist.institution_id = p_institution_id
          AND ist.provider_id = auth.uid()
          AND ist.is_active = true
      );
  END IF;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'You do not have access to this institution''s commercial terms'
      USING ERRCODE = '42501';
  END IF;

  SELECT sp.id, sp.name, sp.price_monthly
    INTO v_plan_id, v_plan_name, v_list
  FROM public.healthcare_institutions hi
  JOIN public.user_subscriptions us ON us.user_id = hi.admin_id
  JOIN public.subscription_plans sp ON sp.id = us.plan_id
  WHERE hi.id = p_institution_id
    AND sp.target_audience = 'institution'
  ORDER BY (us.status IN ('active', 'trialing')) DESC, us.created_at DESC
  LIMIT 1;

  SELECT * INTO v_ovr
  FROM public.institution_commercial_terms ct
  WHERE ct.institution_id = p_institution_id;
  v_has_ovr := FOUND;

  institution_id := p_institution_id;
  tier_plan_id := v_plan_id;
  tier_name := v_plan_name;
  tier_list_monthly := v_list;
  eff_tier_monthly_rate := COALESCE(v_ovr.tier_monthly_rate_override, v_list);
  eff_year_one_discount_pct := COALESCE(v_ovr.year_one_discount_pct, 50);
  eff_year_one_monthly_rate := CASE
    WHEN eff_tier_monthly_rate IS NULL THEN NULL
    ELSE round(eff_tier_monthly_rate * (1 - eff_year_one_discount_pct / 100), 2)
  END;
  eff_pilot_free_days := COALESCE(v_ovr.pilot_free_days, 30);
  eff_pilot_per_doctor_rate := COALESCE(v_ovr.pilot_per_doctor_rate, 350);
  eff_pilot_facility_rate := COALESCE(v_ovr.pilot_facility_rate, 2500);
  eff_is_founding_cohort := COALESCE(v_ovr.is_founding_cohort, false);
  founding_cohort_cap := 5;
  pilot_started_at := v_ovr.pilot_started_at;
  has_override := v_has_ovr;
  currency := 'ZMW';
  RETURN NEXT;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_institution_effective_terms(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_institution_effective_terms(uuid) TO authenticated, service_role;

-- The project's default-privilege blanket also lands broad grants
-- (incl. TRUNCATE, which bypasses RLS) on new tables. Trim this table
-- back to exactly the scoped grants above.
REVOKE ALL ON public.institution_commercial_terms FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.institution_commercial_terms FROM authenticated;
