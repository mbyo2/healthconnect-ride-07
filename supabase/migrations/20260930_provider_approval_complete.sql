-- ============================================================
-- Doc'O Clock — Provider approval marks profile complete (2026-09-30)
--
-- Defect: approved providers landed on /onboarding because the approval
-- trigger set is_verified but never is_profile_complete. The provider
-- application form already collects the profile data, so approval must
-- mark the profile complete.
--
-- Idempotent; safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.grant_provider_role_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profession text;
  v_role user_role;
  v_role_app app_role;
BEGIN
  -- The profession the provider chose at signup, allowlisted to real,
  -- active provider professions.
  SELECT au.raw_user_meta_data ->> 'role'
    INTO v_profession
    FROM auth.users au
   WHERE au.id = NEW.user_id;

  IF v_profession IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.provider_types pt
        WHERE pt.code = v_profession AND pt.is_active
     ) THEN
    BEGIN
      v_role     := v_profession::user_role;
      v_role_app := v_profession::app_role;
    EXCEPTION WHEN invalid_text_representation THEN
      -- Code drifted out of the enums: fall back to the generic cadre.
      v_role     := 'health_personnel'::user_role;
      v_role_app := 'health_personnel'::app_role;
    END;

    INSERT INTO public.user_roles (user_id, role, granted_by)
    VALUES (NEW.user_id, v_role_app, NEW.reviewed_by)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Keep the profile in sync, mark verified AND complete (approval must
    -- not bounce the user to /onboarding). Passes through the
    -- anti-escalation BEFORE UPDATE guards, which allow admins acting
    -- on another user and neuter self-approvals.
    UPDATE public.profiles
       SET role               = v_role,
           is_verified        = true,
           is_profile_complete = true,
           updated_at         = now()
     WHERE id = NEW.user_id;
  ELSE
    -- No valid profession on file: verify and complete, never invent a role.
    UPDATE public.profiles
       SET is_verified        = true,
           is_profile_complete = true,
           updated_at         = now()
     WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

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
