-- Fix the remaining function search path issue (handle_updated_at)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;