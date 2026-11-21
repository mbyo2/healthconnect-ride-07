-- ZRA Smart Invoice is ZAMBIA-ONLY (CEO rule, 2026-11-21).
--
-- Gate field: healthcare_institutions.country_code (ISO 2-letter,
-- NOT NULL, CHECK ^[A-Z]{2}$). Eligibility is exactly country_code =
-- 'ZM'; any other value — and any institution row that cannot be found
-- — is NOT eligible (fail closed for a tax feature). Because the
-- column is NOT NULL with a 'ZM' default there is no NULL state; the
-- comparison itself is the fail-closed check.
--
-- This migration re-issues the two queueing functions from
-- 20261121_zra_smart_invoice_completion.sql with the eligibility
-- check first. The edge functions (zra-connection, zra-declare)
-- enforce the same rule again server-side (defense in depth), and the
-- client hides every ZRA surface for non-Zambian institutions.

CREATE OR REPLACE FUNCTION public.zra_country_eligible(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.healthcare_institutions
    WHERE id = p_institution_id AND country_code = 'ZM'
  );
$$;

REVOKE ALL ON FUNCTION public.zra_country_eligible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.zra_country_eligible(uuid) TO authenticated, service_role;

-- Queue trigger: identical to the completion migration, plus the
-- Zambia gate as the very first check.
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
  -- ZAMBIA-ONLY: ZRA Smart Invoice never applies elsewhere.
  IF NOT public.zra_country_eligible(NEW.institution_id) THEN
    RETURN NEW;
  END IF;

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

-- Backfill: identical to the completion migration, plus the gate.
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
  IF NOT public.zra_country_eligible(p_institution_id) THEN
    RETURN 0;
  END IF;

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
