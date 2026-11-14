-- Workstream A (auth & session audit, 2026-11-15): close the has_role role oracle.
--
-- FINDING (proven live before this fix): public.has_role(_user_id, _role) is
-- SECURITY DEFINER with EXECUTE for authenticated, and public.has_admin_scope
-- (which delegates to has_role) additionally for anon -- and both answered
-- about ANY user id. With only the publishable anon key, an attacker could
-- confirm whether an arbitrary uuid holds admin / super_admin:
--   POST /rest/v1/rpc/has_admin_scope {"p_uid": "<super_admin id>"} -> true
--   POST /rest/v1/rpc/has_role {"_user_id": "<super_admin id>", "_role": "super_admin"} -> true
-- (same oracle existed on BMaGlass Pay via has_role; fixed there in
-- 20261269_has_role_oracle_guard.sql).
--
-- The anon/authenticated EXECUTE grants are KEPT on purpose: RLS policies
-- evaluated for anon callers (e.g. public_view_institutions, which calls
-- has_admin_scope(auth.uid())) need EXECUTE on these helpers, and the
-- security-db-sweep test pins those grants. The oracle closes inside the
-- function instead: a caller may only ask about themselves, unless they are
-- a platform admin/super_admin, or the call comes from a trusted server
-- context (service_role JWT, or no JWT at all: pg_cron / triggers / direct
-- SQL). Everyone else gets the answer about the CALLER (which they could
-- already learn by asking about themselves), never about the requested user
-- -- so an unauthenticated probe always returns false. has_admin_scope
-- inherits the protection: it delegates to has_role.
--
-- Callers audited before this change (all preserved):
--   * RLS policies and in-DB helpers call has_role(auth.uid(), ...) -- self.
--   * Client code calls has_role / has_admin_scope with the signed-in
--     user's own id only (UserRolesContext, useInstitutionTeam).
--   * Edge functions (create-admin-user) check the caller's own roles.
--   * Lab/billing helpers check has_role(p_user_id/v_cashier/viewer_id, ...)
--     where the id is auth.uid() (self) or the caller was already proven an
--     admin by the enclosing function (admin carve-out below).
--   * No client or edge function asks about another non-admin user's role.
--
-- CREATE OR REPLACE preserves the existing EXECUTE grants.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = (
      CASE
        -- Trusted server context: service_role JWT, or no JWT at all
        -- (pg_cron / trigger / direct SQL). Honour the requested id.
        WHEN public.is_service_role() OR auth.jwt() IS NULL THEN _user_id
        -- The caller asking about themselves.
        WHEN auth.uid() = _user_id THEN _user_id
        -- A platform admin / super_admin asking about someone else.
        WHEN EXISTS (
          SELECT 1 FROM public.user_roles a
          WHERE a.user_id = auth.uid()
            AND a.role IN ('admin'::app_role, 'super_admin'::app_role)
        ) THEN _user_id
        -- Everyone else: answer about the caller, never about the
        -- requested user. An unauthenticated probe therefore always
        -- returns false.
        ELSE auth.uid()
      END)
    AND ur.role = _role
  );
$function$;

COMMENT ON FUNCTION public.has_role(uuid, app_role) IS
  'Role check, oracle-hardened 2026-11-15 (workstream A): answers about the requested user only for the user themselves, a platform admin/super_admin, or trusted server context (service_role / no JWT). All other callers get the answer about themselves.';
