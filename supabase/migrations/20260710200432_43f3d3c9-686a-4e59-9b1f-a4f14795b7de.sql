
DROP POLICY IF EXISTS "Pharmacies can view and update assigned prescriptions" ON public.comprehensive_prescriptions;
DROP POLICY IF EXISTS "Pharmacies can update prescription status" ON public.comprehensive_prescriptions;

CREATE POLICY "Pharmacies can view assigned prescriptions for dispensing"
ON public.comprehensive_prescriptions
FOR SELECT
TO authenticated
USING (
  pharmacy_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.healthcare_institutions hi
    WHERE hi.id = comprehensive_prescriptions.pharmacy_id
      AND hi.admin_id = auth.uid()
  )
  AND status IN ('pending','assigned','processing','ready','dispensed','partially_dispensed','completed')
);

CREATE POLICY "Pharmacies can update assigned prescription status"
ON public.comprehensive_prescriptions
FOR UPDATE
TO authenticated
USING (
  pharmacy_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.healthcare_institutions hi
    WHERE hi.id = comprehensive_prescriptions.pharmacy_id
      AND hi.admin_id = auth.uid()
  )
  AND status IN ('pending','assigned','processing','ready')
)
WITH CHECK (
  pharmacy_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.healthcare_institutions hi
    WHERE hi.id = comprehensive_prescriptions.pharmacy_id
      AND hi.admin_id = auth.uid()
  )
);

-- Insurance cards storage: re-scope to authenticated role
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname IN (
        'Users view own insurance card images',
        'Users upload own insurance card images',
        'Users delete own insurance card images',
        'Users update own insurance card images'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users view own insurance card images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'insurance_cards' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own insurance card images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'insurance_cards' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own insurance card images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'insurance_cards' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'insurance_cards' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own insurance card images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'insurance_cards' AND auth.uid()::text = (storage.foldername(name))[1]);
