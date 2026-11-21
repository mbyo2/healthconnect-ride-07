-- ZRA Smart Invoice — completion of the Oct-2025 fiscal scaffolding
-- (2026-11-21, CEO order: every institution must be able to connect to
-- ZRA Smart Invoice VSDC/OSDC and have its invoices declared).
--
-- What already existed (audited, kept): institution_smart_invoice_settings
-- (per-institution connection), fiscal_submissions (outbox-shaped),
-- institution_zra_item_mappings, vsdc_operation_logs, zra_tax_rates, and
-- the hardened RLS of 20261025_stagec2a_* (is_zra_institution_member /
-- is_zra_institution_admin helpers; settings full row = institution
-- owner / platform super_admin only).
--
-- What was missing and is added here (all additive):
--   1. Connection: controller_type (vsdc|osdc) + the device identity
--      ZRA returns at initialization (sdc_id, mrc_no, device_info) +
--      connection-test bookkeeping on institution_smart_invoice_settings.
--   2. Outbox: fiscal_submissions learns billing_invoices (its legacy
--      invoice_id pointed at marketplace `payments` and was NOT NULL,
--      so no billing invoice could ever be queued), a declaration kind
--      (sale | credit_note), the ZRA proof fields, and a link to the
--      original submission for credit notes. One live submission per
--      (billing invoice, kind) is enforced by a partial unique index.
--   3. Fiscal fields on billing_invoices itself, so invoice lists and
--      receipts read the ZRA state directly.
--   4. institution_zra_tax_mappings: per-institution mapping from
--      Doc'O Clock tax rates (tax_templates.rate_percent) to ZRA tax
--      labels. Resolution happens server-side only (the zra-declare
--      edge function), never in the client.
--   5. The declaration trigger: when a billing invoice becomes `paid`
--      the sale declaration is queued; when a paid/partial invoice is
--      refunded or cancelled after a sale was declared, a credit-note
--      declaration is queued. No client path can skip it, and local
--      billing never blocks on ZRA.
--   6. refund_billing_invoice RPC — the missing product flow that sets
--      an invoice `refunded` (gate mirrors the invoice UPDATE policy).
--   7. The retry sweep: a pg_cron job every 2 minutes asks the
--      zra-declare edge function (via net.http_post) to process due
--      submissions. The shared secret lives ONLY in zra_internal_config
--      (server-only table, no client grants) and in the function's
--      environment — never in this file.

-- ------------------------------------------------------------------
-- 1. Connection columns
-- ------------------------------------------------------------------
ALTER TABLE public.institution_smart_invoice_settings
  ADD COLUMN IF NOT EXISTS controller_type text NOT NULL DEFAULT 'vsdc',
  ADD COLUMN IF NOT EXISTS sdc_id text,
  ADD COLUMN IF NOT EXISTS mrc_no text,
  ADD COLUMN IF NOT EXISTS device_info jsonb,
  ADD COLUMN IF NOT EXISTS last_test_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_test_ok boolean;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'smart_invoice_settings_controller_type_chk'
      AND conrelid = 'public.institution_smart_invoice_settings'::regclass
  ) THEN
    ALTER TABLE public.institution_smart_invoice_settings
      ADD CONSTRAINT smart_invoice_settings_controller_type_chk
      CHECK (controller_type IN ('vsdc', 'osdc'));
  END IF;
END $$;

-- ------------------------------------------------------------------
-- 2. Outbox: fiscal_submissions learns billing invoices + proof
-- ------------------------------------------------------------------
ALTER TABLE public.fiscal_submissions
  ALTER COLUMN invoice_id DROP NOT NULL;

ALTER TABLE public.fiscal_submissions
  ADD COLUMN IF NOT EXISTS billing_invoice_id uuid
    REFERENCES public.billing_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'sale',
  ADD COLUMN IF NOT EXISTS sdc_id text,
  ADD COLUMN IF NOT EXISTS rcpt_sign text,
  ADD COLUMN IF NOT EXISTS intrl_data text,
  ADD COLUMN IF NOT EXISTS mrc_no text,
  ADD COLUMN IF NOT EXISTS qr_code_url text,
  ADD COLUMN IF NOT EXISTS original_submission_id uuid
    REFERENCES public.fiscal_submissions(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fiscal_submissions_kind_chk'
      AND conrelid = 'public.fiscal_submissions'::regclass
  ) THEN
    ALTER TABLE public.fiscal_submissions
      ADD CONSTRAINT fiscal_submissions_kind_chk
      CHECK (kind IN ('sale', 'credit_note'));
  END IF;
END $$;

-- One live (queued / being sent / sent) submission per billing invoice
-- and kind — the idempotency guard the queue trigger relies on.
CREATE UNIQUE INDEX IF NOT EXISTS fiscal_submissions_billing_kind_live_uniq
  ON public.fiscal_submissions (billing_invoice_id, kind)
  WHERE billing_invoice_id IS NOT NULL AND status IN ('queued', 'sending', 'sent');

CREATE INDEX IF NOT EXISTS idx_fiscal_submissions_billing_invoice
  ON public.fiscal_submissions (billing_invoice_id);

-- ------------------------------------------------------------------
-- 3. Fiscal fields on the invoice of record
-- ------------------------------------------------------------------
ALTER TABLE public.billing_invoices
  ADD COLUMN IF NOT EXISTS zra_declaration_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS zra_sdc_id text,
  ADD COLUMN IF NOT EXISTS zra_rcpt_no text,
  ADD COLUMN IF NOT EXISTS zra_rcpt_sign text,
  ADD COLUMN IF NOT EXISTS zra_qr_code_url text,
  ADD COLUMN IF NOT EXISTS zra_declared_at timestamptz,
  ADD COLUMN IF NOT EXISTS zra_credit_note_rcpt_no text,
  ADD COLUMN IF NOT EXISTS zra_credit_note_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'billing_invoices_zra_status_chk'
      AND conrelid = 'public.billing_invoices'::regclass
  ) THEN
    ALTER TABLE public.billing_invoices
      ADD CONSTRAINT billing_invoices_zra_status_chk
      CHECK (zra_declaration_status IN ('not_required', 'awaiting', 'declared', 'failed'));
  END IF;
END $$;

-- ------------------------------------------------------------------
-- 4. Per-institution tax mapping (Doc rate -> ZRA tax label)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institution_zra_tax_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  doc_rate_percent numeric NOT NULL,
  zra_tax_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT institution_zra_tax_mappings_uniq UNIQUE (institution_id, doc_rate_percent)
);

ALTER TABLE public.institution_zra_tax_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view own institution ZRA tax mappings"
  ON public.institution_zra_tax_mappings;
CREATE POLICY "Members can view own institution ZRA tax mappings"
  ON public.institution_zra_tax_mappings FOR SELECT TO public
  USING (public.is_zra_institution_member(institution_id));

DROP POLICY IF EXISTS "Admins can insert own institution ZRA tax mappings"
  ON public.institution_zra_tax_mappings;
CREATE POLICY "Admins can insert own institution ZRA tax mappings"
  ON public.institution_zra_tax_mappings FOR INSERT TO public
  WITH CHECK (public.is_zra_institution_admin(institution_id));

DROP POLICY IF EXISTS "Admins can update own institution ZRA tax mappings"
  ON public.institution_zra_tax_mappings;
CREATE POLICY "Admins can update own institution ZRA tax mappings"
  ON public.institution_zra_tax_mappings FOR UPDATE TO public
  USING (public.is_zra_institution_admin(institution_id))
  WITH CHECK (public.is_zra_institution_admin(institution_id));

DROP POLICY IF EXISTS "Admins can delete own institution ZRA tax mappings"
  ON public.institution_zra_tax_mappings;
CREATE POLICY "Admins can delete own institution ZRA tax mappings"
  ON public.institution_zra_tax_mappings FOR DELETE TO public
  USING (public.is_zra_institution_admin(institution_id));

-- CEO grant rule (2026-10-28): explicit scoped grants in the same file.
-- (This project's default privileges also grant anon at CREATE TABLE
-- time; this table is not public, so anon is revoked explicitly.)
REVOKE ALL ON public.institution_zra_tax_mappings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.institution_zra_tax_mappings TO authenticated;

-- ------------------------------------------------------------------
-- 5. The declaration trigger
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.queue_zra_declaration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.institution_smart_invoice_settings;
  v_sale public.fiscal_submissions;
BEGIN
  -- Only institutions whose ZRA device is initialized declare.
  SELECT * INTO v_settings
  FROM public.institution_smart_invoice_settings
  WHERE institution_id = NEW.institution_id;
  IF v_settings.id IS NULL OR v_settings.initialized_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Sale: the invoice just became fully paid.
  IF NEW.status = 'paid'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid')
     AND COALESCE(NEW.total_amount, 0) > 0 THEN
    INSERT INTO public.fiscal_submissions
      (institution_id, billing_invoice_id, kind, status, idempotency_key)
    VALUES
      (NEW.institution_id, NEW.id, 'sale', 'queued', gen_random_uuid())
    ON CONFLICT (billing_invoice_id, kind)
      WHERE billing_invoice_id IS NOT NULL AND status IN ('queued', 'sending', 'sent')
      DO NOTHING;
    IF FOUND THEN
      UPDATE public.billing_invoices
      SET zra_declaration_status = 'awaiting'
      WHERE id = NEW.id AND zra_declaration_status <> 'declared';
    END IF;
    RETURN NEW;
  END IF;

  -- Credit note: a previously paid invoice was refunded / cancelled
  -- after its sale was declared to ZRA.
  IF TG_OP = 'UPDATE'
     AND OLD.status IN ('paid', 'partial')
     AND NEW.status IN ('refunded', 'cancelled') THEN
    SELECT * INTO v_sale
    FROM public.fiscal_submissions
    WHERE billing_invoice_id = NEW.id AND kind = 'sale' AND status = 'sent'
    ORDER BY created_at DESC
    LIMIT 1;
    IF v_sale.id IS NOT NULL THEN
      INSERT INTO public.fiscal_submissions
        (institution_id, billing_invoice_id, kind, status, idempotency_key,
         original_submission_id)
      VALUES
        (NEW.institution_id, NEW.id, 'credit_note', 'queued', gen_random_uuid(),
         v_sale.id)
      ON CONFLICT (billing_invoice_id, kind)
        WHERE billing_invoice_id IS NOT NULL AND status IN ('queued', 'sending', 'sent')
        DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_zra_declaration() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_zra_declaration() TO service_role;

DROP TRIGGER IF EXISTS trg_queue_zra_declaration ON public.billing_invoices;
CREATE TRIGGER trg_queue_zra_declaration
  AFTER INSERT OR UPDATE OF status ON public.billing_invoices
  FOR EACH ROW EXECUTE FUNCTION public.queue_zra_declaration();

-- Backfill used right after a device is initialized: queue declarations
-- for invoices paid within ZRA's 72-hour sales window that were never
-- queued (they were paid before the institution connected).
CREATE OR REPLACE FUNCTION public.zra_backfill_declarations(p_institution_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_inv public.billing_invoices;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.institution_smart_invoice_settings
    WHERE institution_id = p_institution_id AND initialized_at IS NOT NULL
  ) THEN
    RETURN 0;
  END IF;

  FOR v_inv IN
    SELECT * FROM public.billing_invoices
    WHERE institution_id = p_institution_id
      AND status = 'paid'
      AND COALESCE(total_amount, 0) > 0
      AND updated_at >= now() - interval '72 hours'
      AND zra_declaration_status = 'not_required'
  LOOP
    INSERT INTO public.fiscal_submissions
      (institution_id, billing_invoice_id, kind, status, idempotency_key)
    VALUES
      (p_institution_id, v_inv.id, 'sale', 'queued', gen_random_uuid())
    ON CONFLICT (billing_invoice_id, kind)
      WHERE billing_invoice_id IS NOT NULL AND status IN ('queued', 'sending', 'sent')
      DO NOTHING;
    IF FOUND THEN
      v_count := v_count + 1;
      UPDATE public.billing_invoices
      SET zra_declaration_status = 'awaiting'
      WHERE id = v_inv.id;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.zra_backfill_declarations(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.zra_backfill_declarations(uuid) TO service_role;

-- ------------------------------------------------------------------
-- 6. Refund flow for billing invoices (was missing entirely)
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refund_billing_invoice(
  p_invoice_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_invoice public.billing_invoices;
BEGIN
  IF v_caller IS NULL AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Please sign in to refund an invoice.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_invoice FROM public.billing_invoices
  WHERE id = p_invoice_id FOR UPDATE;
  IF v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'That invoice could not be found.';
  END IF;

  IF NOT public.is_service_role()
     AND NOT public.is_institution_admin(v_invoice.institution_id)
     AND NOT public.has_admin_scope(v_caller)
     AND NOT public.is_institution_finance_staff(v_invoice.institution_id) THEN
    RAISE EXCEPTION 'Only this institution''s billing team can refund an invoice.'
      USING ERRCODE = '42501';
  END IF;

  IF v_invoice.status = 'refunded' THEN
    RAISE EXCEPTION 'This invoice has already been refunded.';
  END IF;
  IF v_invoice.status NOT IN ('paid', 'partial') THEN
    RAISE EXCEPTION 'Only an invoice that has been paid can be refunded.';
  END IF;

  UPDATE public.billing_invoices
  SET status = 'refunded',
      notes = CASE
        WHEN p_reason IS NULL OR btrim(p_reason) = '' THEN notes
        ELSE COALESCE(notes || E'\n', '') || 'Refund: ' || btrim(p_reason)
      END,
      updated_at = now()
  WHERE id = p_invoice_id
  RETURNING * INTO v_invoice;

  RETURN to_jsonb(v_invoice);
END;
$$;

REVOKE ALL ON FUNCTION public.refund_billing_invoice(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refund_billing_invoice(uuid, text) TO authenticated, service_role;

-- ------------------------------------------------------------------
-- 7. Sweep plumbing (server-only secret + pg_cron -> edge function)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.zra_internal_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zra_internal_config ENABLE ROW LEVEL SECURITY;
-- No policies: no client role can read or write this table. The
-- SECURITY DEFINER wrapper below and the service role are the only
-- readers. (Server-only table per the CEO grant rule.)
REVOKE ALL ON public.zra_internal_config FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zra_internal_config TO service_role;

CREATE OR REPLACE FUNCTION public.zra_request_declaration_sweep()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT value INTO v_secret FROM public.zra_internal_config
  WHERE key = 'sweep_secret';
  IF v_secret IS NULL THEN
    RETURN; -- not configured yet: stay silent, declarations wait for setup
  END IF;

  PERFORM net.http_post(
    url := 'https://tthzcijscedgxjfnfnky.supabase.co/functions/v1/zra-declare',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-zra-internal-secret', v_secret
    ),
    body := '{"sweep": true}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.zra_request_declaration_sweep() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.zra_request_declaration_sweep() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'zra-declaration-sweep') THEN
    PERFORM cron.schedule(
      'zra-declaration-sweep',
      '*/2 * * * *',
      $job$SELECT public.zra_request_declaration_sweep()$job$
    );
  END IF;
END $$;
