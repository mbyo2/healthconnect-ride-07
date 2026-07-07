CREATE TABLE public.dpo_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id UUID,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  status TEXT NOT NULL DEFAULT 'pending',
  trans_token TEXT UNIQUE,
  trans_ref TEXT UNIQUE,
  redirect_url TEXT,
  result_code TEXT,
  result_explanation TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dpo_payments TO authenticated;
GRANT ALL ON public.dpo_payments TO service_role;

ALTER TABLE public.dpo_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own dpo payments"
ON public.dpo_payments FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_dpo_payments_updated_at
BEFORE UPDATE ON public.dpo_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dpo_payments_user ON public.dpo_payments(user_id);
CREATE INDEX idx_dpo_payments_status ON public.dpo_payments(status);
CREATE INDEX idx_dpo_payments_ref ON public.dpo_payments(reference_type, reference_id);