ALTER TABLE public.healthcare_institutions ALTER COLUMN list_in_marketplace SET DEFAULT false;
UPDATE public.healthcare_institutions SET list_in_marketplace = false WHERE is_verified IS NOT TRUE;