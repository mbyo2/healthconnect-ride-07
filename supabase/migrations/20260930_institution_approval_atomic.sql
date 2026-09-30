-- ============================================================
-- Doc'O Clock — Institution approval: atomic verification (2026-09-30)
--
-- Defect: approved institutions showed "Pending" because is_verified on
-- healthcare_institutions was set by a non-transactional 3-step client
-- sequence. If the client update failed or matched zero rows, the badge
-- stayed Pending forever.
--
-- Fix: move verification into the approval trigger so it is atomic —
-- approving the application ALWAYS verifies the institution in the same
-- transaction. Includes a backfill for already-approved-but-unverified
-- institutions.
--
-- Idempotent; safe to re-run.
-- ============================================================

-- ─── 1. Extend the approval trigger to verify the institution ───
CREATE OR REPLACE FUNCTION public.grant_institution_admin_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Canonical role store (audited by the user_roles audit trigger).
  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (NEW.applicant_id, 'institution_admin'::public.app_role, NULL::uuid)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Keep the profile in sync and mark verified.
  -- Also mark the profile complete: the application form already collected
  -- the profile data, so approval must not bounce the user to /onboarding.
  UPDATE public.profiles
     SET role = 'institution_admin'::public.user_role,
         is_verified = true,
         is_profile_complete = true,
         updated_at = now()
   WHERE id = NEW.applicant_id;

  -- ATOMIC: verify the applicant's institution(s) in the same transaction.
  -- This is what drives the Verified/Pending badge in the dashboard.
  UPDATE public.healthcare_institutions
     SET is_verified = true,
         updated_at = now()
   WHERE admin_id = NEW.applicant_id
     AND is_verified IS NOT TRUE;

  RETURN NEW;
END;
$$;

-- ─── 2. Backfill: approved applications with unverified institutions ───
UPDATE public.healthcare_institutions hi
   SET is_verified = true,
       updated_at = now()
 WHERE hi.is_verified IS NOT TRUE
   AND EXISTS (
     SELECT 1 FROM public.institution_applications a
     WHERE a.applicant_id = hi.admin_id
       AND a.status = 'approved'
   );

-- ─── 3. Backfill: approved applicants get complete profiles ───
-- (prevents approved users landing on /onboarding)
UPDATE public.profiles p
   SET is_profile_complete = true,
       updated_at = now()
 WHERE p.is_profile_complete IS NOT TRUE
   AND EXISTS (
     SELECT 1 FROM public.institution_applications a
     WHERE a.applicant_id = p.id
       AND a.status = 'approved'
   );
