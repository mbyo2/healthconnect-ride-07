-- Patient Unity W4 (2026-10-29): create-on-missing for payers/insurers.
--
-- insurance_providers writes are service-role-only at the policy level
-- ("Admin can manage insurance providers" checks jwt role =
-- 'service_role'), so no signed-in user — not even a platform admin —
-- could ever add an insurer from the app, and the claims workflow's
-- insurer field stayed a dead-end free-text box. This SECURITY DEFINER
-- RPC is the sanctioned client path, gated on has_admin_scope
-- server-side, mirroring find_or_create_patient's pattern (W1).
-- Idempotent by name: an existing insurer is returned, not duplicated.

CREATE OR REPLACE FUNCTION public.create_insurance_provider(
  p_name text,
  p_code text DEFAULT NULL
)
RETURNS TABLE (id uuid, name text, code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_name text := btrim(COALESCE(p_name, ''));
  v_code text;
  v_row public.insurance_providers%ROWTYPE;
BEGIN
  IF NOT public.has_admin_scope(auth.uid()) THEN
    RAISE EXCEPTION 'Only a platform admin can add an insurer to the directory.'
      USING ERRCODE = '42501';
  END IF;
  IF v_name = '' THEN
    RAISE EXCEPTION 'Give the insurer a name.' USING ERRCODE = '22023';
  END IF;

  v_code := NULLIF(upper(regexp_replace(btrim(COALESCE(p_code, '')), '[^A-Za-z0-9]+', '_', 'g')), '');
  IF v_code IS NULL THEN
    v_code := upper(regexp_replace(v_name, '[^A-Za-z0-9]+', '_', 'g'));
  END IF;

  SELECT * INTO v_row
  FROM public.insurance_providers p
  WHERE lower(p.name) = lower(v_name)
  LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT v_row.id, v_row.name, v_row.code;
    RETURN;
  END IF;

  INSERT INTO public.insurance_providers (name, code, is_active)
  VALUES (v_name, left(v_code, 24), true)
  RETURNING * INTO v_row;

  RETURN QUERY SELECT v_row.id, v_row.name, v_row.code;
END;
$$;

-- Oct-30 scoped-grant rule: functions get explicit grants, never PUBLIC.
REVOKE ALL ON FUNCTION public.create_insurance_provider(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_insurance_provider(text, text) TO authenticated;
