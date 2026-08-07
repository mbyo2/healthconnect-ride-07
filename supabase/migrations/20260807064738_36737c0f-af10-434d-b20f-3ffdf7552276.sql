CREATE POLICY "Receiving hospital staff can view incoming referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (
  referred_to_hospital_id IS NOT NULL
  AND public.is_institution_staff_member(referred_to_hospital_id)
);

CREATE POLICY "Receiving hospital staff can respond to incoming referrals"
ON public.referrals
FOR UPDATE
TO authenticated
USING (
  referred_to_hospital_id IS NOT NULL
  AND public.is_institution_staff_member(referred_to_hospital_id)
)
WITH CHECK (
  referred_to_hospital_id IS NOT NULL
  AND public.is_institution_staff_member(referred_to_hospital_id)
);