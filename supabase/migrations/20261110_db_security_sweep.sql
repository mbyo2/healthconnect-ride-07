-- 20261110_db_security_sweep.sql — Doc'O Clock database posture sweep (2026-11-10).
--
-- LIVE BASELINE (introspected 2026-11-10, before this migration):
--   * 418 public tables, all RLS enabled; 14 with RLS enabled but ZERO policies
--     (deny-all for anon/authenticated; service_role only).
--   * 405 tables granted anon FULL privileges incl. TRUNCATE; 411 tables granted
--     authenticated TRUNCATE. TRUNCATE ignores RLS, so anyone holding the
--     publishable anon key could wipe 405 tables, any signed-in user 411.
--     Proven live: has_table_privilege('anon','public.appointments','TRUNCATE') = true.
--   * 1,030 policies; 74 USING(true) (reference/config data, reviewed — no
--     sensitive table is open-write; only 2 WRITE-TRUE policies, both
--     service_role-scoped). No ALL policy with qual true. No inline
--     cross-table subquery in any profiles policy (2026-09-30 recursion fix held).
--   * 258 functions, 235 SECURITY DEFINER, ALL pin search_path. No bare
--     digest()/crypt(), no text[] || 'literal', no bad RAISE % (all live-proven
--     clean). 11 functions grant anon EXECUTE — reviewed: invite-token,
--     public counts, booked slots, kiosk info, ZRA booleans (all read-only /
--     token-gated) + 2 trigger-only enforce_* fns (direct calls fail).
--   * 12 views: 8 security_invoker=true; 4 owner-rights but def-scoped
--     (lab views filter patient_id = auth.uid(); provider_directory exposes
--     public fields of verified providers only; shareable_equipment filters
--     is_shareable + operational + verified institution). The one updatable
--     owner-rights view with write grants (user_two_factor_status) was
--     BEHAVIOURALLY PROVEN SAFE with QA users 2026-11-10: cross-user UPDATE /
--     DELETE via the view are no-ops and INSERT is refused by base-table RLS.
--     Owner-rights is load-bearing here (lab views hide unverified values;
--     user_two_factor has no authenticated SELECT grant by design), so the
--     views keep their invoker setting — only the unneeded write grants go.
--   * Grantors are postgres (relacl), so REVOKEs below take effect; verified
--     by re-reading the catalogues after apply (0 mismatches vs target).
--   * Functional bug fixed here too: anon had NO SELECT on
--     healthcare_institutions, so the public /healthcare-institutions guest
--     page 401'd (proven live 2026-11-10) despite the public_view_institutions
--     policy. Anon SELECT is restored, scoped by that policy — and the policy
--     itself is aligned (section 6): its verified = true AND
--     status = 'approved' clauses were dead (no flow ever sets them; all 16
--     live institutions are status = 'pending', verified = false), so guests
--     could never see a listed institution even with the grant fixed.
--   * Functional bug fixed here too: authenticated had NO SELECT on
--     user_two_factor, so getTwoFactorStatus() always 403'd and the Settings
--     UI always reported 2FA disabled. SELECT granted; the existing RLS
--     policy still scopes reads to the caller's own row.
--
-- TARGET STATE (verified after apply):
--   * anon: SELECT on the 37 genuinely-public tables + INSERT on
--     analytics_events only; SELECT on provider_directory + shareable_equipment
--     views only. No TRUNCATE/TRIGGER/REFERENCES anywhere, no DML anywhere
--     else. (Behaviour preserved: anon could previously only READ those 37
--     tables — every other anon-readable policy path requires auth.uid() — and
--     only INSERT analytics_events.)
--   * authenticated: keeps SELECT/INSERT/UPDATE/DELETE (RLS-gated); NO
--     TRUNCATE/TRIGGER/REFERENCES on any table or view; NO write grants on
--     any view.
--   * service_role / postgres: untouched.
--   * anon EXECUTE on the 3 helpers used by public-role healthcare_institutions
--     SELECT policies (all return false for anon: auth.uid() IS NULL).

-- ============ 1. Revoke RLS-bypassing / dangerous privileges ============
-- TRUNCATE ignores RLS entirely; TRIGGER lets a caller attach trigger code;
-- REFERENCES is never needed by app clients.
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- ============ 2. Anon minimisation (revoke all, then re-grant public set) ============
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;

-- Genuinely-public read tables: SELECT policy qual is auth-independent
-- (true / is_active / is_verified / is_published / is_visible / is_system /
-- is_available) with a public role, proven readable as anon before this change.
GRANT SELECT ON public.allergy_severity TO anon;
GRANT SELECT ON public.appointment_types TO anon;
GRANT SELECT ON public.badges TO anon;
GRANT SELECT ON public.blood_types TO anon;
GRANT SELECT ON public.clinic_specialty_catalog TO anon;
GRANT SELECT ON public.countries TO anon;
GRANT SELECT ON public.courier_ratings TO anon;
GRANT SELECT ON public.delivery_zones TO anon;
GRANT SELECT ON public.feature_gates TO anon;
GRANT SELECT ON public.gender_options TO anon;
GRANT SELECT ON public.health_articles TO anon;
GRANT SELECT ON public.institution_locations TO anon;
GRANT SELECT ON public.institution_services TO anon;
GRANT SELECT ON public.institution_specialties TO anon;
GRANT SELECT ON public.institution_types TO anon;
GRANT SELECT ON public.insurance_plans TO anon;
GRANT SELECT ON public.insurance_providers TO anon;
GRANT SELECT ON public.kb_articles TO anon;
GRANT SELECT ON public.marketplace_products TO anon;
GRANT SELECT ON public.medical_specialties TO anon;
GRANT SELECT ON public.medication_dose_ranges TO anon;
GRANT SELECT ON public.medication_frequency TO anon;
GRANT SELECT ON public.notification_templates TO anon;
GRANT SELECT ON public.order_set_items TO anon;
GRANT SELECT ON public.order_sets TO anon;
GRANT SELECT ON public.pharmacy_hours TO anon;
GRANT SELECT ON public.provider_types TO anon;
GRANT SELECT ON public.regions TO anon;
GRANT SELECT ON public.relationship_types TO anon;
GRANT SELECT ON public.service_categories TO anon;
GRANT SELECT ON public.specialty_staff_roles TO anon;
GRANT SELECT ON public.subscription_plans TO anon;
GRANT SELECT ON public.ui_config TO anon;
GRANT SELECT ON public.vaccination_schedule TO anon;
GRANT SELECT ON public.zambia_health_regulations TO anon;
GRANT SELECT ON public.zra_tax_rates TO anon;
-- Public guest directory: scoped by the public_view_institutions policy
-- (marketplace-listed + verified + approved, or own / admin).
GRANT SELECT ON public.healthcare_institutions TO anon;

-- Anonymous analytics events: the only anon write path, by design
-- (policy: anon can insert anonymous analytics events, user_id IS NULL).
GRANT INSERT ON public.analytics_events TO anon;

-- Public views (SELECT only; def-scoped, see header).
GRANT SELECT ON public.provider_directory TO anon;
GRANT SELECT ON public.shareable_equipment TO anon;

-- ============ 3. Fix the missing 2FA read grant (authenticated) ============
-- getTwoFactorStatus() selects from user_two_factor; without this grant it
-- 403'd and the UI always reported 2FA disabled. RLS still scopes to own row.
GRANT SELECT ON public.user_two_factor TO authenticated;

-- ============ 4. Helpers needed by public-role healthcare_institutions policies ============
-- anon must be able to EXECUTE these for its SELECT to evaluate; each returns
-- false for anon (auth.uid() IS NULL). All SECURITY DEFINER, search_path pinned.
GRANT EXECUTE ON FUNCTION public.is_institution_staff_member(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.has_admin_scope(uuid) TO anon;

-- ============ 5. No client writes through views ============
-- Views are read paths (only provider_directory + lab_tests_patient_view are
-- used by the app, both read-only). Revoke every write privilege on every
-- view for anon + authenticated; service_role is untouched.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
  LOOP
    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM anon, authenticated',
      r.relname
    );
  END LOOP;
END
$$;

-- ============ 6. Align public_view_institutions with the app (dead clauses) ============
-- The old predicate required verified = true AND status = 'approved', but no
-- app flow ever sets either: institution approval sets is_verified = true,
-- marketplace-listing approval sets list_in_marketplace only, and all 16 live
-- institutions have status = 'pending' and verified = false. The policy could
-- never return a row to a guest, so the public directory was empty even with
-- the SELECT grant restored. Aligned to the columns the app actually uses
-- (is_verified; list_in_marketplace; payment_mode = 'platform' per the
-- HMS-only-never-listed rule). The admin/own branches are unchanged.
DROP POLICY IF EXISTS public_view_institutions ON public.healthcare_institutions;
CREATE POLICY public_view_institutions ON public.healthcare_institutions
  FOR SELECT TO public
  USING (
    (list_in_marketplace = true AND is_verified = true AND payment_mode = 'platform')
    OR (auth.uid() = admin_id)
    OR has_admin_scope(auth.uid())
  );
