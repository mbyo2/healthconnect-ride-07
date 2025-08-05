-- Fix remaining function search path issues
CREATE OR REPLACE FUNCTION generate_prescription_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  NEW.prescription_number = 'RX' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0');
  RETURN NEW;
END;
$$;

-- Update all existing functions to have proper search_path
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  -- Log role changes
  IF OLD.role IS DISTINCT FROM NEW.role OR OLD.admin_level IS DISTINCT FROM NEW.admin_level THEN
    INSERT INTO public.security_audit_log (
      user_id,
      event_type,
      event_data
    ) VALUES (
      NEW.id,
      'role_change',
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'old_admin_level', OLD.admin_level,
        'new_admin_level', NEW.admin_level,
        'changed_by', auth.uid()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_video_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  INSERT INTO public.user_connections (
    patient_id, 
    provider_id, 
    connection_type, 
    status, 
    requested_by
  )
  VALUES (
    NEW.patient_id, 
    NEW.provider_id, 
    'automatic', 
    'approved', 
    NEW.patient_id
  )
  ON CONFLICT (patient_id, provider_id) 
  DO NOTHING;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_inventory_quantity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.transaction_type = 'purchase' THEN
    UPDATE public.medication_inventory 
    SET quantity_available = quantity_available + NEW.quantity
    WHERE id = NEW.medication_inventory_id;
  ELSIF NEW.transaction_type IN ('sale', 'expired', 'damaged') THEN
    UPDATE public.medication_inventory 
    SET quantity_available = quantity_available - NEW.quantity
    WHERE id = NEW.medication_inventory_id;
  ELSIF NEW.transaction_type = 'adjustment' THEN
    UPDATE public.medication_inventory 
    SET quantity_available = quantity_available + NEW.quantity
    WHERE id = NEW.medication_inventory_id;
  ELSIF NEW.transaction_type = 'return' THEN
    UPDATE public.medication_inventory 
    SET quantity_available = quantity_available + NEW.quantity
    WHERE id = NEW.medication_inventory_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_automatic_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  -- Create automatic connection when appointment is created
  INSERT INTO public.user_connections (
    patient_id, 
    provider_id, 
    connection_type, 
    status, 
    requested_by
  )
  VALUES (
    NEW.patient_id, 
    NEW.provider_id, 
    'automatic', 
    'approved', 
    NEW.patient_id
  )
  ON CONFLICT (patient_id, provider_id) 
  DO NOTHING;
  
  RETURN NEW;
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.can_perform_service(provider_id uuid, service_category_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    provider_exp experience_level;
    required_exp experience_level;
BEGIN
    -- Get provider's experience level
    SELECT hpa.experience_level INTO provider_exp
    FROM health_personnel_applications hpa
    WHERE hpa.user_id = provider_id AND hpa.status = 'approved';

    -- Get required experience level for service
    SELECT min_experience_level INTO required_exp
    FROM service_categories
    WHERE id = service_category_id;

    -- Compare levels (entry < intermediate < expert)
    RETURN 
        CASE provider_exp
            WHEN 'expert' THEN true
            WHEN 'intermediate' THEN required_exp != 'expert'
            WHEN 'entry' THEN required_exp = 'entry'
            ELSE false
        END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_chat_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  patient_user_id UUID;
  provider_user_id UUID;
BEGIN
  -- Determine which user is patient and which is provider
  SELECT 
    CASE WHEN p1.role = 'patient' THEN p1.id ELSE p2.id END,
    CASE WHEN p1.role = 'health_personnel' THEN p1.id ELSE p2.id END
  INTO patient_user_id, provider_user_id
  FROM profiles p1, profiles p2
  WHERE p1.id = NEW.sender_id AND p2.id = NEW.receiver_id;
  
  -- Only create connection if we have both patient and provider
  IF patient_user_id IS NOT NULL AND provider_user_id IS NOT NULL THEN
    INSERT INTO public.user_connections (
      patient_id, 
      provider_id, 
      connection_type, 
      status, 
      requested_by
    )
    VALUES (
      patient_user_id, 
      provider_user_id, 
      'chat_based', 
      'approved', 
      NEW.sender_id
    )
    ON CONFLICT (patient_id, provider_id) 
    DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.insert_applications_for_doctors()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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