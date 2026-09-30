-- Fix is_institution_staff_member to also check legacy institution_personnel table
-- The pharmacist's affiliation is in institution_personnel (status='active'), not institution_staff
-- Without this, pharmacists cannot see their institution in the pharmacy portal

CREATE OR REPLACE FUNCTION public.is_institution_staff_member(institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
SELECT EXISTS (
  SELECT 1
  FROM institution_staff
  WHERE institution_staff.institution_id = $1
  AND institution_staff.provider_id = auth.uid()
  AND institution_staff.is_active = true
) OR EXISTS (
  SELECT 1
  FROM institution_personnel
  WHERE institution_personnel.institution_id = $1
  AND institution_personnel.user_id = auth.uid()
  AND institution_personnel.status = 'active'
);
$function$;
