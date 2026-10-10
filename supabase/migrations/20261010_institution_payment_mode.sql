-- HMS-only mode: institutions that want to handle their own money
-- When handles_own_payments = true, the platform does NOT process payments
-- for this institution. They use their own payment systems; Doc'O Clock
-- only provides the HMS software.

ALTER TABLE public.healthcare_institutions
ADD COLUMN IF NOT EXISTS handles_own_payments BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.healthcare_institutions
ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'platform'
CHECK (payment_mode IN ('platform', 'own'));

-- payment_mode = 'platform': Doc'O Clock handles money via wallet + Lenco
-- payment_mode = 'own': Institution handles own money, platform not involved

COMMENT ON COLUMN public.healthcare_institutions.handles_own_payments IS
  'Deprecated: use payment_mode. Kept for backward compatibility.';
COMMENT ON COLUMN public.healthcare_institutions.payment_mode IS
  'platform = DocOClock processes payments via wallet/Lenco; own = institution handles own money';
