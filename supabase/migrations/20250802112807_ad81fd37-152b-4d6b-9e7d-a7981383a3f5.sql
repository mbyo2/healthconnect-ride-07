-- Fix RLS policies and security warnings

-- Add missing RLS policies for tables that have RLS enabled but no policies
-- Based on the linter warning, we need to identify and add policies for tables with RLS enabled

-- Add policies for location_updates table (appears to have RLS enabled but no policies)
CREATE POLICY "Users can view delivery location updates for their orders"
ON public.location_updates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_tracking dt
    JOIN public.orders o ON dt.order_id = o.id
    WHERE dt.id = location_updates.delivery_id 
    AND o.patient_id = auth.uid()
  )
);

CREATE POLICY "Delivery drivers can insert location updates"
ON public.location_updates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.delivery_tracking dt
    WHERE dt.id = location_updates.delivery_id 
    AND dt.driver_id = auth.uid()
  )
);

-- Fix remaining function search paths that weren't covered in previous migration
-- Update any functions that still have mutable search paths

-- Fix the delete_user function search path
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  user_id uuid;
BEGIN
  -- Get the ID of the authenticated user
  user_id := auth.uid();
  
  -- Delete user's avatar from storage
  DELETE FROM storage.objects
  WHERE bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = user_id::text;
  
  -- Delete user's profile
  DELETE FROM public.profiles
  WHERE id = user_id;
  
  -- Delete the user's auth account
  DELETE FROM auth.users
  WHERE id = user_id;
END;
$function$;

-- Update insert_applications_for_doctors function search path  
CREATE OR REPLACE FUNCTION public.insert_applications_for_doctors()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  INSERT INTO health_personnel_applications (
    user_id,
    license_number,
    specialty,
    years_of_experience,
    status,
    documents_url
  )
  SELECT 
    profiles.id,
    CASE 
      WHEN profiles.last_name = 'Smith' THEN 'MD123456'
      ELSE 'MD789012'
    END,
    CASE 
      WHEN profiles.last_name = 'Smith' THEN 'Cardiology'
      ELSE 'Pediatrics'
    END,
    CASE 
      WHEN profiles.last_name = 'Smith' THEN 10
      ELSE 8
    END,
    'pending',
    CASE 
      WHEN profiles.last_name = 'Smith' THEN ARRAY['medical_documents/dr_smith_license.pdf']
      ELSE ARRAY['medical_documents/dr_jones_license.pdf']
    END
  FROM profiles
  WHERE profiles.last_name IN ('Smith', 'Jones');
END;
$function$;