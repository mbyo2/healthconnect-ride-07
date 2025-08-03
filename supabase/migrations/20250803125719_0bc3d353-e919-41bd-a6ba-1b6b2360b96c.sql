-- Fix remaining security warnings by setting search paths for functions

-- Update handle_new_user function to have a secure search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient'::user_role)
  );
  RETURN NEW;
END;
$$;

-- Update update_inventory_quantity function to have a secure search path
CREATE OR REPLACE FUNCTION public.update_inventory_quantity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
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