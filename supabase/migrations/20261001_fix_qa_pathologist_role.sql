-- Fix: QA pathologist account missing the 'pathologist' professional role
-- Context: qa9-prov-pathologist@doc0clock.online had only 'institution_admin' in
-- user_roles, so the lab_tests RLS policy "Lab clinical staff can view lab tests"
-- (which requires has_role(uid, 'pathologist')) returned 0 rows, blocking the
-- pathologist sign-off workflow. The QA doctor correctly has both
-- 'institution_admin' and 'doctor'.
-- Idempotent: safe to re-run.

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'pathologist'::app_role
FROM auth.users u
WHERE u.email = 'qa9-prov-pathologist@doc0clock.online'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = u.id
      AND ur.role = 'pathologist'::app_role
  );
