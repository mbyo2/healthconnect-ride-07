-- Fix 1 (F-1/F-2 root fix completion): enforce_appointment_fee fee coalesce
-- The server already owns the fee: this trigger overwrites NEW.consultation_fee
-- from the provider's profile on INSERT (and freezes it on UPDATE), so no client
-- value can persist a different price. Min is the agreed booking price within
-- the provider's set range. Previously the SELECT read consultation_fee_min
-- ONLY, so a provider who set only a MAX fee got NULL persisted. Now
-- COALESCE(min, max) persists that set price for max-only providers.
-- Both NULL -> NULL (honest fee-to-confirm), never a derived price.
-- Minimal diff of the live definition: only the single SELECT changes.
CREATE OR REPLACE FUNCTION public.enforce_appointment_fee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ BEGIN
  IF public.is_service_role() THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN NEW.consultation_fee := OLD.consultation_fee; RETURN NEW; END IF;
  SELECT COALESCE(p.consultation_fee_min, p.consultation_fee_max) INTO NEW.consultation_fee FROM public.profiles p WHERE p.id = NEW.provider_id;
  RETURN NEW; END; $function$;
