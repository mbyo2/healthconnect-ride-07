-- Fix RLS policies blocking prescription and lab order creation
-- Issue: prescription_history trigger insert and lab_tests insert violate RLS

-- 1. Allow prescription_history inserts from the trigger
-- The trigger runs as the invoking user, so we need a policy allowing providers to log history
CREATE POLICY "Providers can insert prescription history"
ON public.prescription_history FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text IN ('doctor', 'specialist', 'medical_licentiate', 'clinical_officer', 'dentist', 'pharmacist', 'pharmacy_technologist')
  )
);

-- 2. Allow providers to create lab test orders
-- Check existing policies first, then add if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'lab_tests' 
    AND policyname = 'Providers can create lab orders'
  ) THEN
    CREATE POLICY "Providers can create lab orders"
    ON public.lab_tests FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('doctor', 'specialist', 'medical_licentiate', 'clinical_officer', 'dentist', 'radiologist', 'pathologist', 'lab_technician', 'phlebotomist')
      )
    );
  END IF;
END $$;
