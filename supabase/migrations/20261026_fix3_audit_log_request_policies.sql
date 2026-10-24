-- Fix 3: audit-log approval-request RLS policies
-- Root cause: the payment-mode approval pattern (InstitutionSettings ->
-- security_audit_log event_type 'marketplace_approval_requested' -> admin
-- decides 'marketplace_approval_decided') has NEVER landed a row live:
-- zero marketplace_approval_* rows exist in security_audit_log. The table's
-- RLS had exactly one INSERT policy, requiring is_service_role(), so an
-- authenticated institution admin filing a request was RLS-blocked; and its
-- SELECT policies hid admin-written decision rows from the requesting
-- institution. This migration makes the request pattern actually work, for
-- the existing payment-mode flow AND the new marketplace-listing flow
-- ('marketplace_listing_requested' / 'marketplace_listing_decided').
-- These policies are additive: RLS policies are permissive-OR, so they add
-- narrowly-scoped access alongside the existing policies without changing
-- or removing any of them. Each new policy is scoped by event_type and by
-- institution-admin / platform-admin checks.

CREATE OR REPLACE FUNCTION public.audit_log_institution_id(p_event_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (p_event_data->>'institution_id')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_institution_admin_of(p_institution_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p_institution_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.healthcare_institutions hi
      WHERE hi.id = p_institution_id AND hi.admin_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.institution_personnel ip
      WHERE ip.institution_id = p_institution_id
        AND ip.user_id = auth.uid()
        AND COALESCE(ip.status, 'active') NOT IN ('inactive', 'suspended', 'terminated')
        AND ip.role ILIKE '%admin%'
    )
  )
$function$;

DROP POLICY IF EXISTS "Institution admins can file approval requests" ON public.security_audit_log;

CREATE POLICY "Institution admins can file approval requests"
  ON public.security_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND event_type IN ('marketplace_approval_requested', 'marketplace_listing_requested')
    AND public.is_institution_admin_of(public.audit_log_institution_id(event_data))
  );

DROP POLICY IF EXISTS "Platform admins can log approval decisions" ON public.security_audit_log;

CREATE POLICY "Platform admins can log approval decisions"
  ON public.security_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    event_type IN ('marketplace_approval_decided', 'marketplace_listing_decided')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Institution admins can view their approval logs" ON public.security_audit_log;

CREATE POLICY "Institution admins can view their approval logs"
  ON public.security_audit_log
  FOR SELECT TO authenticated
  USING (
    event_type IN (
      'marketplace_approval_requested',
      'marketplace_approval_decided',
      'marketplace_listing_requested',
      'marketplace_listing_decided'
    )
    AND public.is_institution_admin_of(public.audit_log_institution_id(event_data))
  );
