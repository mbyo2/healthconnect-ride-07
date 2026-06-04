
-- Backfill pending applications for existing institutions
INSERT INTO public.institution_applications (applicant_id, institution_name, institution_type, status, submitted_at)
SELECT hi.admin_id, hi.name, hi.type::text, 'pending', hi.created_at
FROM public.healthcare_institutions hi
WHERE hi.admin_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.institution_applications ia 
    WHERE ia.applicant_id = hi.admin_id AND ia.institution_name = hi.name
  );

-- Trigger function
CREATE OR REPLACE FUNCTION public.auto_create_institution_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.admin_id IS NOT NULL THEN
    INSERT INTO public.institution_applications (applicant_id, institution_name, institution_type, status, submitted_at)
    VALUES (NEW.admin_id, NEW.name, NEW.type::text, 'pending', now())
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_institution_created_application ON public.healthcare_institutions;
CREATE TRIGGER on_institution_created_application
  AFTER INSERT ON public.healthcare_institutions
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_institution_application();
