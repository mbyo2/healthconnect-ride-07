-- ============================================================
-- Doc'O Clock — provider approval actually grants the role
--
-- Approving a health_personnel_applications row (status -> 'approved')
-- now elevates the applicant: the profession they chose at provider
-- signup is granted in user_roles, mirrored to profiles.role, and
-- the profile is marked verified.
--
-- Security design (works WITH the anti-escalation guards, not around them):
-- * The profession comes from the signup metadata but is allowlisted
--   against active provider_types codes, so a tampered metadata value
--   can never grant an admin or arbitrary role. Unknown/missing
--   profession -> verification only, never an invented role.
-- * The profiles.role write passes through the existing BEFORE UPDATE
--   guards: they permit an admin/super_admin acting on another user,
--   and silently neuter self-approvals. A self-approval therefore can
--   never escalate privileges, while verification still lands.
-- * The grant is audited by the existing user_roles audit trigger.
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
      v_role := v_profession::user_role;
    EXCEPTION WHEN invalid_text_representation THEN
      -- Code drifted out of the enum: fall back to the generic cadre.
      v_role := 'health_personnel'::user_role;
    END;

    -- Canonical role store (audited by the user_roles audit trigger).
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, v_role::text)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Keep the profile in sync and mark verified. Passes through the
    -- anti-escalation BEFORE UPDATE guards, which allow admins acting
    -- on another user and neuter self-approvals.
    UPDATE public.profiles
       SET role        = v_role,
           is_verified = true,
           updated_at  = now()
     WHERE id = NEW.user_id;
  ELSE
    -- No valid profession on file: verify, never invent a role.
    UPDATE public.profiles
       SET is_verified = true,
           updated_at  = now()
     WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Fire on the approval transition (the real app + QA path)...
DROP TRIGGER IF EXISTS trg_grant_provider_role_on_approval ON public.health_personnel_applications;
CREATE TRIGGER trg_grant_provider_role_on_approval
  AFTER UPDATE OF status ON public.health_personnel_applications
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved')
  EXECUTE FUNCTION public.grant_provider_role_on_approval();

-- ...and if a row is ever inserted already approved.
DROP TRIGGER IF EXISTS trg_grant_provider_role_on_approval_ins ON public.health_personnel_applications;
CREATE TRIGGER trg_grant_provider_role_on_approval_ins
  AFTER INSERT ON public.health_personnel_applications
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION public.grant_provider_role_on_approval();
