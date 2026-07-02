
DROP POLICY IF EXISTS "Users can view lab tests" ON public.lab_tests;
DROP POLICY IF EXISTS "Pharmacy staff can read customers" ON public.pharmacy_customers;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile safely" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.staff_invitations;
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.user_wallets;

CREATE OR REPLACE FUNCTION public.get_staff_invitation_by_token(p_token text)
RETURNS SETOF public.staff_invitations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.staff_invitations
  WHERE token = p_token
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_staff_invitation_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_staff_invitation_by_token(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Users can delete own medical documents" ON storage.objects;
CREATE POLICY "Users can delete own medical documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'medical_documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update own medical documents" ON storage.objects;
CREATE POLICY "Users can update own medical documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'medical_documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'medical_documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
