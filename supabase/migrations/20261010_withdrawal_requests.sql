-- Provider withdrawal/payout requests: self-service flow
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'ZMW',
  payout_method TEXT NOT NULL CHECK (payout_method IN ('mobile_money', 'bank_transfer')),
  payout_details JSONB NOT NULL, -- {phone_number} or {bank_name, account_number, account_name}
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'cancelled')),
  admin_note TEXT,
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_provider ON public.withdrawal_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawal_requests(status);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Providers: view own, create, cancel pending
CREATE POLICY "Providers view own withdrawals"
  ON public.withdrawal_requests FOR SELECT
  USING (auth.uid() = provider_id);

CREATE POLICY "Providers request withdrawals"
  ON public.withdrawal_requests FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers cancel own pending withdrawals"
  ON public.withdrawal_requests FOR UPDATE
  USING (auth.uid() = provider_id AND status = 'pending')
  WITH CHECK (auth.uid() = provider_id);

-- Admins: view all, decide (via is_platform_admin function if exists, else via user_roles)
-- Using a permissive policy for service_role; app-level admin check in UI + edge function
CREATE POLICY "Admins view all withdrawals"
  ON public.withdrawal_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'finance_manager')
    )
  );

CREATE POLICY "Admins decide withdrawals"
  ON public.withdrawal_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'finance_manager')
    )
  );
