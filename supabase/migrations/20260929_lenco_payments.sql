-- Lenco mobile-money collections ledger.
-- Mirrors public.dpo_payments so every gateway has an auditable,
-- idempotent record before any wallet is credited.
-- Lenco API v2 docs: https://lenco-api.readme.io/v2.0/reference/initiate-collection-from-mobile-money
-- Secrets (Supabase Edge Function secrets, NOT in this repo):
--   LENCO_API_URL       default https://api.lenco.co/access/v2
--   LENCO_SECRET_KEY    from the Lenco merchant dashboard (sandbox key for testing)
--   LENCO_WEBHOOK_SECRET from the Lenco dashboard (webhook signature verification)

CREATE TABLE IF NOT EXISTS public.lenco_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id UUID,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  status TEXT NOT NULL DEFAULT 'pending', -- pending | pay_offline | paid | failed | cancelled | expired
  lenco_reference TEXT UNIQUE NOT NULL,   -- our unique reference sent to Lenco
  lenco_collection_id TEXT,               -- Lenco's collection id (data.id)
  lenco_lenco_reference TEXT,             -- Lenco's own reference (data.lencoReference)
  operator TEXT,                          -- mtn | airtel | zamtel (zm) ; airtel | tnm (mw)
  phone TEXT,
  country TEXT NOT NULL DEFAULT 'zm',
  result_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lenco_payments TO authenticated;
GRANT ALL ON public.lenco_payments TO service_role;

ALTER TABLE public.lenco_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own lenco payments" ON public.lenco_payments;
CREATE POLICY "Users view own lenco payments"
ON public.lenco_payments FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_lenco_payments_updated_at ON public.lenco_payments;
CREATE TRIGGER trg_lenco_payments_updated_at
BEFORE UPDATE ON public.lenco_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_lenco_payments_user ON public.lenco_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_lenco_payments_status ON public.lenco_payments(status);
CREATE INDEX IF NOT EXISTS idx_lenco_payments_ref ON public.lenco_payments(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_lenco_payments_lenco_ref ON public.lenco_payments(lenco_reference);
