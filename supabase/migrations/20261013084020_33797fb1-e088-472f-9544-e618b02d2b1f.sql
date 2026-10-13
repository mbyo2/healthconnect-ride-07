DROP POLICY IF EXISTS "Institution staff read packages" ON public.surgery_packages;
CREATE POLICY "Institution staff read packages" ON public.surgery_packages FOR SELECT TO authenticated USING (
  institution_id IN (SELECT institution_id FROM public.institution_staff WHERE provider_id = auth.uid() AND is_active = true)
  OR institution_id IN (SELECT id FROM public.healthcare_institutions WHERE admin_id = auth.uid()));
DROP POLICY IF EXISTS "Institution staff read visit packages" ON public.visit_packages;
CREATE POLICY "Institution staff read visit packages" ON public.visit_packages FOR SELECT TO authenticated USING (
  institution_id IN (SELECT institution_id FROM public.institution_staff WHERE provider_id = auth.uid() AND is_active = true)
  OR institution_id IN (SELECT id FROM public.healthcare_institutions WHERE admin_id = auth.uid()));

-- Returns the provider that owns a healthcare_services row (null for platform service codes)
CREATE OR REPLACE FUNCTION public.resolve_service_provider(_service_id text)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid; p uuid;
BEGIN
  BEGIN v := _service_id::uuid; EXCEPTION WHEN others THEN RETURN NULL; END;
  SELECT provider_id INTO p FROM public.healthcare_services WHERE id = v;
  RETURN p;
END $$;
REVOKE ALL ON FUNCTION public.resolve_service_provider(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_service_provider(text) TO service_role;