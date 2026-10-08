-- Fix grant_provider_role_on_approval() to actually sync profiles.role.
-- The function tried to UPDATE profiles.role, but the anti-escalation
-- BEFORE UPDATE guards (prevent_role_escalation_trigger,
-- trg_prevent_profile_privilege_change, trg_prevent_profile_self_elevation)
-- reverted the change because auth.uid() was not an admin in trigger context.
-- Result: user_roles got the 'doctor' role but profiles.role stayed 'patient',
-- so approved providers were invisible in search (which filters by profiles.role).
-- Fix: disable the guards within the privileged function, update, re-enable.
-- Found live 2026-10-08 during QAX51 telehealth QA.

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

    -- Canonical role store (audited by the user_roles audit trigger).
    INSERT INTO public.user_roles (user_id, role, granted_by)
    VALUES (NEW.user_id, v_role_app, NEW.reviewed_by)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Keep the profile in sync and mark verified. This is a privileged
    -- system function acting on admin approval — bypass the anti-escalation
    -- guards which would revert the change in trigger context.
    ALTER TABLE public.profiles DISABLE TRIGGER prevent_role_escalation_trigger;
    ALTER TABLE public.profiles DISABLE TRIGGER trg_prevent_profile_privilege_change;
    ALTER TABLE public.profiles DISABLE TRIGGER trg_prevent_profile_self_elevation;
    UPDATE public.profiles
       SET role        = v_role,
           is_verified = true,
           updated_at  = now()
     WHERE id = NEW.user_id;
    ALTER TABLE public.profiles ENABLE TRIGGER prevent_role_escalation_trigger;
    ALTER TABLE public.profiles ENABLE TRIGGER trg_prevent_profile_privilege_change;
    ALTER TABLE public.profiles ENABLE TRIGGER trg_prevent_profile_self_elevation;
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
