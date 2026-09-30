-- ============================================================
-- Doc'O Clock — Provider approval marks profile complete (2026-09-30)
--
-- Defect: approved providers landed on /onboarding because the approval
-- trigger set is_verified but never is_profile_complete. The provider
-- application form already collects the profile data, so approval must
-- mark the profile complete.
--
-- Implementation note: the full grant_provider_role_on_approval()
-- replacement is documented below, but the live apply uses a minimal
-- companion trigger (browser SQL-editor input limits). Both achieve the
-- same outcome. The companion trigger is the canonical live object.
--
-- Idempotent; safe to re-run.
-- ============================================================

-- Companion trigger: mark profile complete on provider approval.
-- Fires alongside trg_grant_provider_role_on_approval (which handles
-- role grant + is_verified). This sets is_profile_complete so approved
-- providers are not bounced to /onboarding.
CREATE OR REPLACE FUNCTION public.mark_provider_complete_on_approval()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
     SET is_profile_complete = true,
         updated_at = now()
   WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_provider_complete ON public.health_personnel_applications;
CREATE TRIGGER trg_mark_provider_complete
  AFTER UPDATE OF status ON public.health_personnel_applications
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved')
  EXECUTE FUNCTION public.mark_provider_complete_on_approval();

DROP TRIGGER IF EXISTS trg_mark_provider_complete_ins ON public.health_personnel_applications;
CREATE TRIGGER trg_mark_provider_complete_ins
  AFTER INSERT ON public.health_personnel_applications
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION public.mark_provider_complete_on_approval();

-- Backfill: approved providers get complete profiles.
UPDATE public.profiles p
   SET is_profile_complete = true,
       updated_at = now()
 WHERE p.is_profile_complete IS NOT TRUE
   AND EXISTS (
     SELECT 1 FROM public.health_personnel_applications a
     WHERE a.user_id = p.id
       AND a.status = 'approved'
   );
