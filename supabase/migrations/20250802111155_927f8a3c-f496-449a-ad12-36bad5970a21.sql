-- Phase 2: Fix remaining function search paths and complete security setup

-- Fix search path for remaining functions
CREATE OR REPLACE FUNCTION public.update_inventory_quantity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.create_video_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.create_automatic_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.can_perform_service(provider_id uuid, service_category_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.create_chat_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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
$$;

-- Replace existing profile update policies with secure role protection
DROP POLICY IF EXISTS "Users can update basic profile info" ON public.profiles;

-- Create new secure profile update policy
CREATE POLICY "Users can update basic profile info"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Prevent unauthorized role changes
  (
    -- Keep same role unless user is admin+ changing someone else's role
    role = (SELECT role FROM public.profiles WHERE id = auth.uid()) OR 
    public.get_current_user_admin_level() IN ('admin', 'superadmin')
  ) AND
  -- Prevent unauthorized admin_level changes
  (
    -- Keep same admin_level unless user is superadmin
    admin_level = (SELECT admin_level FROM public.profiles WHERE id = auth.uid()) OR 
    public.get_current_user_admin_level() = 'superadmin'
  )
);

-- Create trigger for role change auditing
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS audit_profile_role_changes ON public.profiles;
CREATE TRIGGER audit_profile_role_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_changes();