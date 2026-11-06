-- Customisable tax: saved tax templates per facility, assignable per drug / service.
CREATE TABLE IF NOT EXISTS public.tax_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  rate_percent numeric(6,3) NOT NULL DEFAULT 0,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_templates TO authenticated;
GRANT ALL ON public.tax_templates TO service_role;
ALTER TABLE public.tax_templates ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS tax_templates_one_default ON public.tax_templates(institution_id) WHERE is_default;
CREATE INDEX IF NOT EXISTS tax_templates_inst ON public.tax_templates(institution_id);

CREATE POLICY "Facility staff read tax templates" ON public.tax_templates FOR SELECT TO authenticated
USING (public.is_institution_admin(institution_id) OR public.is_institution_staff_member(institution_id)
       OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY "Facility admins manage tax templates" ON public.tax_templates FOR ALL TO authenticated
USING (public.is_institution_admin(institution_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
WITH CHECK (public.is_institution_admin(institution_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.validate_tax_template() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.rate_percent < 0 OR NEW.rate_percent > 100 THEN
    RAISE EXCEPTION 'Tax rate must be between 0 and 100 percent.';
  END IF;
  IF btrim(COALESCE(NEW.name,'')) = '' THEN RAISE EXCEPTION 'Give the tax template a name.'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_tax_template BEFORE INSERT OR UPDATE ON public.tax_templates
FOR EACH ROW EXECUTE FUNCTION public.validate_tax_template();

ALTER TABLE public.pharmacy_inventory ADD COLUMN IF NOT EXISTS tax_template_id uuid REFERENCES public.tax_templates(id) ON DELETE SET NULL;
ALTER TABLE public.medication_inventory ADD COLUMN IF NOT EXISTS tax_template_id uuid REFERENCES public.tax_templates(id) ON DELETE SET NULL;
ALTER TABLE public.service_pricing ADD COLUMN IF NOT EXISTS tax_template_id uuid REFERENCES public.tax_templates(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.resolve_item_tax_rate(p_institution_id uuid, p_template_id uuid, p_fallback numeric DEFAULT 0)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(
    (SELECT rate_percent / 100 FROM public.tax_templates
       WHERE id = p_template_id AND institution_id = p_institution_id AND is_active),
    (SELECT rate_percent / 100 FROM public.tax_templates
       WHERE institution_id = p_institution_id AND is_default AND is_active LIMIT 1),
    CASE WHEN EXISTS (SELECT 1 FROM public.tax_templates WHERE institution_id = p_institution_id) THEN 0 ELSE p_fallback END,
    0);
$$;
REVOKE EXECUTE ON FUNCTION public.resolve_item_tax_rate(uuid, uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_item_tax_rate(uuid, uuid, numeric) TO authenticated, service_role;

DO $do$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='create_pharmacy_sale';
  IF position($q$  v_tax_rate numeric := 0.16; -- server constant: the UI's displayed Tax (16%)
$q$ in d)=0 THEN RAISE EXCEPTION 'patch miss create_pharmacy_sale'; END IF;
  d := replace(d, $q$  v_tax_rate numeric := 0.16; -- server constant: the UI's displayed Tax (16%)
$q$, $q$  v_tax_rate numeric := 0;
  v_line_tax numeric := 0;
$q$);
  IF position($q$    v_subtotal := v_subtotal + v_line_total;
$q$ in d)=0 THEN RAISE EXCEPTION 'patch miss create_pharmacy_sale'; END IF;
  d := replace(d, $q$    v_subtotal := v_subtotal + v_line_total;
$q$, $q$    v_tax_rate := public.resolve_item_tax_rate(p_pharmacy_id, v_inv.tax_template_id, 0.16);
    v_line_tax := round(v_line_total * v_tax_rate, 2);
    v_tax := v_tax + v_line_tax;
    v_subtotal := v_subtotal + v_line_total;
$q$);
  IF position($q$      'total', v_line_total
$q$ in d)=0 THEN RAISE EXCEPTION 'patch miss create_pharmacy_sale'; END IF;
  d := replace(d, $q$      'total', v_line_total
$q$, $q$      'total', v_line_total,
      'tax_rate', round(v_tax_rate * 100, 3),
      'tax', v_line_tax
$q$);
  IF position($q$  v_tax := round(v_subtotal * v_tax_rate, 2);
$q$ in d)=0 THEN RAISE EXCEPTION 'patch miss create_pharmacy_sale'; END IF;
  d := replace(d, $q$  v_tax := round(v_subtotal * v_tax_rate, 2);
$q$, $q$$q$);
  EXECUTE d;
  SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='create_pos_sale';
  IF position($q$  v_total numeric := 0;
$q$ in d)=0 THEN RAISE EXCEPTION 'patch miss create_pos_sale'; END IF;
  d := replace(d, $q$  v_total numeric := 0;
$q$, $q$  v_total numeric := 0;
  v_tax numeric := 0;
  v_tax_rate numeric := 0;
  v_line_tax numeric := 0;
$q$);
  IF position($q$    v_subtotal := v_subtotal + v_line_total;
$q$ in d)=0 THEN RAISE EXCEPTION 'patch miss create_pos_sale'; END IF;
  d := replace(d, $q$    v_subtotal := v_subtotal + v_line_total;
$q$, $q$    v_tax_rate := public.resolve_item_tax_rate(p_pharmacy_id, v_inv.tax_template_id, 0);
    v_line_tax := round(v_line_total * v_tax_rate, 2);
    v_tax := v_tax + v_line_tax;
    v_subtotal := v_subtotal + v_line_total;
$q$);
  IF position($q$      'total', v_line_total,
      'batch_number'$q$ in d)=0 THEN RAISE EXCEPTION 'patch miss create_pos_sale'; END IF;
  d := replace(d, $q$      'total', v_line_total,
      'batch_number'$q$, $q$      'total', v_line_total,
      'tax_rate', round(v_tax_rate * 100, 3),
      'tax', v_line_tax,
      'batch_number'$q$);
  IF position($q$  v_total := v_subtotal - v_discount_amount;
$q$ in d)=0 THEN RAISE EXCEPTION 'patch miss create_pos_sale'; END IF;
  d := replace(d, $q$  v_total := v_subtotal - v_discount_amount;
$q$, $q$  v_tax := round(v_tax * (1 - COALESCE(p_discount_percent, 0) / 100), 2);
  v_total := v_subtotal - v_discount_amount + v_tax;
$q$);
  IF position($q$    v_subtotal, 0, v_discount_amount, v_total,$q$ in d)=0 THEN RAISE EXCEPTION 'patch miss create_pos_sale'; END IF;
  d := replace(d, $q$    v_subtotal, 0, v_discount_amount, v_total,$q$, $q$    v_subtotal, v_tax, v_discount_amount, v_total,$q$);
  EXECUTE d;
  SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='create_hospital_bill';
  IF position($q$  v_receipt_list text;
BEGIN$q$ in d)=0 THEN RAISE EXCEPTION 'patch miss create_hospital_bill'; END IF;
  d := replace(d, $q$  v_receipt_list text;
BEGIN$q$, $q$  v_receipt_list text;
  v_tax_rate numeric := 0;
  v_line_tax numeric := 0;
  v_tax numeric := 0;
  v_merged_tax numeric := 0;
  v_gross numeric := 0;
BEGIN$q$);
  IF position($q$    v_subtotal := v_subtotal + v_line_total;
    v_item := jsonb_build_object($q$ in d)=0 THEN RAISE EXCEPTION 'patch miss create_hospital_bill'; END IF;
  d := replace(d, $q$    v_subtotal := v_subtotal + v_line_total;
    v_item := jsonb_build_object($q$, $q$    v_tax_rate := public.resolve_item_tax_rate(p_hospital_id, v_pricing.tax_template_id, 0);
    v_line_tax := round(v_line_total * v_tax_rate, 2);
    v_tax := v_tax + v_line_tax;
    v_subtotal := v_subtotal + v_line_total;
    v_item := jsonb_build_object(
      'tax_rate', round(v_tax_rate * 100, 3),
      'tax', v_line_tax,$q$);
  IF position($q$          0
        );
      END IF;
    END LOOP;$q$ in d)=0 THEN RAISE EXCEPTION 'patch miss create_hospital_bill'; END IF;
  d := replace(d, $q$          0
        );
      END IF;
    END LOOP;$q$, $q$          0
        );
        v_merged_tax := v_merged_tax + COALESCE((v_elem ->> 'tax')::numeric, 0);
      END IF;
    END LOOP;$q$);
  IF position($q$    v_merged_subtotal := v_merged_subtotal + v_subtotal;
  ELSE
    v_merged_items := v_items_out;
    v_merged_subtotal := v_subtotal;
  END IF;
$q$ in d)=0 THEN RAISE EXCEPTION 'patch miss create_hospital_bill'; END IF;
  d := replace(d, $q$    v_merged_subtotal := v_merged_subtotal + v_subtotal;
  ELSE
    v_merged_items := v_items_out;
    v_merged_subtotal := v_subtotal;
  END IF;
$q$, $q$    v_merged_subtotal := v_merged_subtotal + v_subtotal;
    v_merged_tax := v_merged_tax + v_tax;
  ELSE
    v_merged_items := v_items_out;
    v_merged_subtotal := v_subtotal;
    v_merged_tax := v_tax;
  END IF;
  v_gross := v_merged_subtotal + v_merged_tax;
$q$);
  IF position($q$    v_insurer := round(v_merged_subtotal * v_pct / 100, 2);
    v_patient_due := greatest(round(v_merged_subtotal - v_insurer, 2), 0);$q$ in d)=0 THEN RAISE EXCEPTION 'patch miss create_hospital_bill'; END IF;
  d := replace(d, $q$    v_insurer := round(v_merged_subtotal * v_pct / 100, 2);
    v_patient_due := greatest(round(v_merged_subtotal - v_insurer, 2), 0);$q$, $q$    v_insurer := round(v_gross * v_pct / 100, 2);
    v_patient_due := greatest(round(v_gross - v_insurer, 2), 0);$q$);
  IF position($q$    v_patient_due := v_merged_subtotal;
$q$ in d)=0 THEN RAISE EXCEPTION 'patch miss create_hospital_bill'; END IF;
  d := replace(d, $q$    v_patient_due := v_merged_subtotal;
$q$, $q$    v_patient_due := v_gross;
$q$);
  IF position($q$        total_amount = v_merged_subtotal,$q$ in d)=0 THEN RAISE EXCEPTION 'patch miss create_hospital_bill'; END IF;
  d := replace(d, $q$        total_amount = v_merged_subtotal,$q$, $q$        tax = v_merged_tax,
        total_amount = v_gross,$q$);
  IF position($q$      v_merged_subtotal, 0, 0, v_merged_subtotal, 0,$q$ in d)=0 THEN RAISE EXCEPTION 'patch miss create_hospital_bill'; END IF;
  d := replace(d, $q$      v_merged_subtotal, 0, 0, v_merged_subtotal, 0,$q$, $q$      v_merged_subtotal, v_merged_tax, 0, v_gross, 0,$q$);
  EXECUTE d;
END $do$;