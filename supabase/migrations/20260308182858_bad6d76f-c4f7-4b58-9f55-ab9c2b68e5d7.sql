
-- Fix get_user_roles to handle all 13 app_role enum values with proper priority
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
 RETURNS app_role[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ARRAY_AGG(role ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'support' THEN 2
      WHEN 'institution_admin' THEN 3
      WHEN 'institution_staff' THEN 4
      WHEN 'doctor' THEN 5
      WHEN 'nurse' THEN 6
      WHEN 'radiologist' THEN 7
      WHEN 'health_personnel' THEN 8
      WHEN 'pharmacist' THEN 9
      WHEN 'pharmacy' THEN 10
      WHEN 'lab_technician' THEN 11
      WHEN 'lab' THEN 12
      WHEN 'patient' THEN 13
      ELSE 99
    END
  )
  FROM public.user_roles
  WHERE user_id = _user_id
$function$;

-- Fix get_user_role to handle all 13 app_role enum values
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'support' THEN 2
      WHEN 'institution_admin' THEN 3
      WHEN 'institution_staff' THEN 4
      WHEN 'doctor' THEN 5
      WHEN 'nurse' THEN 6
      WHEN 'radiologist' THEN 7
      WHEN 'health_personnel' THEN 8
      WHEN 'pharmacist' THEN 9
      WHEN 'pharmacy' THEN 10
      WHEN 'lab_technician' THEN 11
      WHEN 'lab' THEN 12
      WHEN 'patient' THEN 13
      ELSE 99
    END
  LIMIT 1
$function$;
