-- Allow institution staff/admins to view patient profiles for their institution's admissions
-- Uses SECURITY DEFINER function to avoid RLS recursion (per AGENTS.md lesson)

CREATE OR REPLACE FUNCTION public.user_is_institution_staff_for_patient(
  p_viewer_id uuid,
  p_patient_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.hospital_admissions ha
    WHERE ha.patient_id = p_patient_id
      AND ha.status = 'admitted'
      AND (
        ha.hospital_id IN (
          SELECT ip.institution_id
          FROM public.institution_personnel ip
          WHERE ip.user_id = p_viewer_id
        )
        OR ha.hospital_id IN (
          SELECT hi.id
          FROM public.healthcare_institutions hi
          WHERE hi.admin_id = p_viewer_id
        )
        OR ha.hospital_id IN (
          SELECT ist.institution_id
          FROM public.institution_staff ist
          WHERE ist.provider_id = p_viewer_id
        )
      )
  );
$$;

DROP POLICY IF EXISTS "Institution staff view admitted patient profiles" ON public.profiles;

CREATE POLICY "Institution staff view admitted patient profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.user_is_institution_staff_for_patient(auth.uid(), id)
);
