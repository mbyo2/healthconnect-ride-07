-- Patient Unity W1 (2026-10-29) — one patient master, institution roster,
-- unified find-or-create + roster search.
--
-- Design: hidden_files/patient-unity-audit-2026-10-29.md §9.
-- Rules honoured:
--  * Cross-table relationship checks go through SECURITY DEFINER helpers —
--    never inline cross-table subqueries inside profiles policies.
--  * Scoped GRANTs written in-file per the CEO-approved Oct-30 rule
--    (authenticated by default, service_role for server paths, NEVER public).
--  * Function EXECUTE mirrors the existing relationship helpers:
--    postgres + authenticated + service_role only (PUBLIC/anon revoked).
--  * Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1) Shadow-account marker on the master record.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_shadow_account boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 2) Institution–patient roster (the tenant list).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institution_patients (
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source         text NOT NULL DEFAULT 'registration'
                 CHECK (source IN ('registration','booking','walk_in','admission','referral','claim','queue','triage')),
  status         text NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','inactive')),
  first_seen_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  added_by       uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (institution_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_institution_patients_patient
  ON public.institution_patients (patient_id);

ALTER TABLE public.institution_patients ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_patients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_patients TO service_role;

DROP POLICY IF EXISTS "Roster readable by institution team and the patient" ON public.institution_patients;
CREATE POLICY "Roster readable by institution team and the patient"
  ON public.institution_patients FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR public.is_institution_admin(institution_id)
    OR public.is_institution_staff_member(institution_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Roster managed by institution team" ON public.institution_patients;
CREATE POLICY "Roster managed by institution team"
  ON public.institution_patients FOR INSERT TO authenticated
  WITH CHECK (
    public.is_institution_admin(institution_id)
    OR public.is_institution_staff_member(institution_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Roster updated by institution team" ON public.institution_patients;
CREATE POLICY "Roster updated by institution team"
  ON public.institution_patients FOR UPDATE TO authenticated
  USING (
    public.is_institution_admin(institution_id)
    OR public.is_institution_staff_member(institution_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    public.is_institution_admin(institution_id)
    OR public.is_institution_staff_member(institution_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Roster removable by institution team" ON public.institution_patients;
CREATE POLICY "Roster removable by institution team"
  ON public.institution_patients FOR DELETE TO authenticated
  USING (
    public.is_institution_admin(institution_id)
    OR public.is_institution_staff_member(institution_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 3) SECURITY DEFINER helpers (opaque to the RLS planner — no recursion).
-- ---------------------------------------------------------------------------

-- Caller belongs to an institution's team (owner, institution_staff,
-- institution_personnel) or is a platform admin.
CREATE OR REPLACE FUNCTION public.is_institution_member(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.is_institution_admin(p_institution_id)
      OR public.is_institution_staff_member(p_institution_id)
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'admin')
      );
$function$;

-- Caller is on the team of an institution whose roster contains the patient.
CREATE OR REPLACE FUNCTION public.is_institution_staff_for_patient(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_patients ip
    JOIN public.healthcare_institutions hi ON hi.id = ip.institution_id
    WHERE ip.patient_id = p_patient_id
      AND ip.status = 'active'
      AND (
        hi.admin_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.institution_staff s
          WHERE s.institution_id = ip.institution_id
            AND s.provider_id = auth.uid() AND s.is_active = true
        )
        OR EXISTS (
          SELECT 1 FROM public.institution_personnel pe
          WHERE pe.institution_id = ip.institution_id
            AND pe.user_id = auth.uid() AND pe.status = 'active'
        )
      )
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.is_institution_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_institution_staff_for_patient(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_institution_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_institution_staff_for_patient(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Roster branch in profile visibility — via the definer helper ONLY.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Institution staff view roster patient profiles" ON public.profiles;
CREATE POLICY "Institution staff view roster patient profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_institution_staff_for_patient(id));

-- ---------------------------------------------------------------------------
-- 5) has_patient_relationship: add the roster branch (CREATE OR REPLACE
--    preserves the existing ACL).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_patient_relationship(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
      SELECT 1 WHERE auth.uid() = p_patient_id
        ) OR EXISTS (
            SELECT 1 FROM public.user_roles ur
                WHERE ur.user_id = auth.uid()
                    AND ur.role IN ('super_admin', 'admin', 'support')
                      ) OR EXISTS (
                          SELECT 1 FROM public.appointments a
                              WHERE a.patient_id = p_patient_id
                                  AND a.provider_id = auth.uid()
                                    ) OR EXISTS (
                                        SELECT 1 FROM public.comprehensive_prescriptions pr
                                            WHERE pr.patient_id = p_patient_id
                                                AND pr.provider_id = auth.uid()
                                                  ) OR EXISTS (
                                                      SELECT 1 FROM public.lab_tests lt
                                                          WHERE lt.patient_id = p_patient_id
                                                              AND lt.ordered_by = auth.uid()
                                                                ) OR EXISTS (
                                                                    SELECT 1 FROM public.referrals r
                                                                        WHERE r.patient_id = p_patient_id
                                                                            AND r.referring_doctor_id = auth.uid()
                                                                              ) OR EXISTS (
                                                                                  SELECT 1 FROM public.queue_tokens qt
                                                                                      JOIN public.institution_staff ist ON ist.institution_id = qt.institution_id
                                                                                          WHERE qt.patient_id = p_patient_id
                                                                                              AND ist.provider_id = auth.uid()
                                                                                                ) OR EXISTS (
                                                                                                    SELECT 1 FROM public.queue_tokens qt
                                                                                                        JOIN public.healthcare_institutions hi ON hi.id = qt.institution_id
                                                                                                            WHERE qt.patient_id = p_patient_id
                                                                                                                AND hi.admin_id = auth.uid()
                                                                                                                  ) OR public.is_institution_staff_for_patient(p_patient_id);
$function$;

-- ---------------------------------------------------------------------------
-- 6) find_or_create_patient — the ONE write path for desk patient creation.
--    Dedupe: phone -> email -> name+DOB (patients only). On match, ensures
--    the roster link + a linked registry intake row. On no match, creates a
--    shadow auth account (fleet-proven direct-insert pattern; the signup
--    triggers build the profile + patient role), marks it as a shadow, and
--    writes registry intake + roster rows — all atomically.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_or_create_patient(
  p_institution_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_emergency_contact_name text DEFAULT NULL,
  p_emergency_contact_phone text DEFAULT NULL,
  p_blood_type text DEFAULT NULL,
  p_allergies text DEFAULT NULL,
  p_chronic_conditions text DEFAULT NULL,
  p_source text DEFAULT 'registration'
)
RETURNS TABLE(patient_id uuid, created boolean, matched_by text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_caller uuid := auth.uid();
  v_first text := nullif(trim(coalesce(p_first_name, '')), '');
  v_last text := nullif(trim(coalesce(p_last_name, '')), '');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_patient_id uuid;
  v_created boolean := false;
  v_matched_by text;
  v_new_id uuid;
  v_auth_email text;
BEGIN
  IF p_institution_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.healthcare_institutions hi WHERE hi.id = p_institution_id
  ) THEN
    RAISE EXCEPTION 'Unknown institution';
  END IF;

  IF NOT (coalesce(auth.role(), '') = 'service_role' OR public.is_institution_member(p_institution_id)) THEN
    RAISE EXCEPTION 'Only institution team members can register patients';
  END IF;

  IF v_first IS NULL THEN
    RAISE EXCEPTION 'A first name is required to register a patient';
  END IF;
  -- Mononyms are common at walk-in desks: mirror the single name.
  v_last := coalesce(v_last, v_first);

  -- Dedupe 1: phone (exact digits, or last-9 when both sides are long enough)
  IF v_phone_digits <> '' THEN
    SELECT pr.id INTO v_patient_id
    FROM public.profiles pr
    WHERE pr.role = 'patient' AND pr.phone IS NOT NULL
      AND (
        regexp_replace(pr.phone, '[^0-9]', '', 'g') = v_phone_digits
        OR (
          length(v_phone_digits) >= 9
          AND length(regexp_replace(pr.phone, '[^0-9]', '', 'g')) >= 9
          AND right(regexp_replace(pr.phone, '[^0-9]', '', 'g'), 9) = right(v_phone_digits, 9)
        )
      )
    ORDER BY pr.created_at ASC
    LIMIT 1;
    IF v_patient_id IS NOT NULL THEN v_matched_by := 'phone'; END IF;
  END IF;

  -- Dedupe 2: email
  IF v_patient_id IS NULL AND v_email IS NOT NULL THEN
    SELECT pr.id INTO v_patient_id
    FROM public.profiles pr
    WHERE pr.role = 'patient' AND lower(pr.email) = v_email
    ORDER BY pr.created_at ASC
    LIMIT 1;
    IF v_patient_id IS NOT NULL THEN v_matched_by := 'email'; END IF;
  END IF;

  -- Dedupe 3: name + date of birth
  IF v_patient_id IS NULL AND p_date_of_birth IS NOT NULL THEN
    SELECT pr.id INTO v_patient_id
    FROM public.profiles pr
    WHERE pr.role = 'patient'
      AND lower(pr.first_name) = lower(v_first)
      AND lower(pr.last_name) = lower(v_last)
      AND pr.date_of_birth = p_date_of_birth
    ORDER BY pr.created_at ASC
    LIMIT 1;
    IF v_patient_id IS NOT NULL THEN v_matched_by := 'name_dob'; END IF;
  END IF;

  -- No match: create the shadow master account.
  IF v_patient_id IS NULL THEN
    v_new_id := gen_random_uuid();
    v_auth_email := coalesce(v_email, 'walkin-' || v_new_id::text || '@patients.doc0clock.online');
    BEGIN
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        raw_app_meta_data, raw_user_meta_data, is_super_admin
      ) VALUES (
        v_new_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        v_auth_email,
        extensions.crypt(gen_random_uuid()::text || gen_random_uuid()::text, extensions.gen_salt('bf', 10)),
        now(), now(), now(),
        '', '', '', '',
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object(
          'full_name', v_first || ' ' || v_last,
          'first_name', v_first,
          'last_name', v_last,
          'phone', nullif(p_phone, ''),
          'role', 'patient',
          'shadow_account', true
        ),
        false
      );
      v_patient_id := v_new_id;
      v_created := true;
      v_matched_by := 'created';
    EXCEPTION WHEN unique_violation THEN
      -- The email already belongs to an auth account the profile-email
      -- dedupe missed (e.g. profile email differs). Adopt it only when it
      -- is genuinely a patient account.
      SELECT u.id INTO v_patient_id FROM auth.users u WHERE lower(u.email) = v_auth_email;
      IF v_patient_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.profiles pr WHERE pr.id = v_patient_id AND pr.role = 'patient'
      ) THEN
        RAISE EXCEPTION 'That email belongs to an existing account that is not a patient record';
      END IF;
      v_created := false;
      v_matched_by := 'email';
    END;

    IF v_created THEN
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
      SELECT gen_random_uuid(), v_patient_id,
             jsonb_build_object('sub', v_patient_id::text, 'email', v_auth_email),
             'email', v_patient_id::text, now(), now()
      WHERE NOT EXISTS (
        SELECT 1 FROM auth.identities i WHERE i.user_id = v_patient_id AND i.provider = 'email'
      );

      UPDATE public.profiles
      SET is_shadow_account = true,
          date_of_birth = COALESCE(date_of_birth, p_date_of_birth),
          gender = COALESCE(gender, nullif(p_gender, '')),
          address = COALESCE(address, nullif(p_address, '')),
          updated_at = now()
      WHERE id = v_patient_id;
    END IF;
  END IF;

  -- Matched an existing master: fill only the blanks, never overwrite.
  IF NOT v_created THEN
    UPDATE public.profiles
    SET phone = COALESCE(NULLIF(phone, ''), nullif(p_phone, '')),
        date_of_birth = COALESCE(date_of_birth, p_date_of_birth),
        gender = COALESCE(NULLIF(gender, ''), nullif(p_gender, '')),
        updated_at = now()
    WHERE id = v_patient_id;
  END IF;

  -- Roster link (the tenant membership) — always.
  INSERT INTO public.institution_patients (institution_id, patient_id, source, status, added_by)
  VALUES (p_institution_id, v_patient_id, coalesce(nullif(p_source, ''), 'registration'), 'active', v_caller)
  ON CONFLICT (institution_id, patient_id)
  DO UPDATE SET last_seen_at = now(), status = 'active', updated_at = now();

  -- Registry intake row — always present and always linked.
  IF NOT EXISTS (
    SELECT 1 FROM public.institution_patient_registry r
    WHERE r.institution_id = p_institution_id AND r.linked_patient_id = v_patient_id
  ) THEN
    -- Link a matching unlinked intake row (phone/email match ONLY — legacy
    -- name-only rows are never auto-claimed by this service).
    UPDATE public.institution_patient_registry r
    SET linked_patient_id = v_patient_id, updated_at = now()
    WHERE r.id = (
      SELECT r2.id FROM public.institution_patient_registry r2
      WHERE r2.institution_id = p_institution_id AND r2.linked_patient_id IS NULL
        AND (
          (v_email IS NOT NULL AND lower(r2.email) = v_email)
          OR (v_phone_digits <> '' AND regexp_replace(coalesce(r2.phone, ''), '[^0-9]', '', 'g') = v_phone_digits)
        )
      ORDER BY r2.created_at ASC
      LIMIT 1
    );

    IF NOT FOUND THEN
      INSERT INTO public.institution_patient_registry (
        institution_id, first_name, last_name, phone, email, date_of_birth, gender,
        address, emergency_contact_name, emergency_contact_phone, blood_type,
        allergies, chronic_conditions, registered_by, linked_patient_id
      ) VALUES (
        p_institution_id, v_first, v_last, nullif(p_phone, ''), v_email, p_date_of_birth,
        nullif(p_gender, ''), nullif(p_address, ''), nullif(p_emergency_contact_name, ''),
        nullif(p_emergency_contact_phone, ''), nullif(p_blood_type, ''),
        nullif(p_allergies, ''), nullif(p_chronic_conditions, ''), v_caller, v_patient_id
      );
    END IF;
  END IF;

  RETURN QUERY SELECT v_patient_id, v_created, v_matched_by;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.find_or_create_patient(uuid, text, text, text, text, date, text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_or_create_patient(uuid, text, text, text, text, date, text, text, text, text, text, text, text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) search_institution_patients — the ONE picker source: roster union
--    established clinical relationships at this institution. Audited like
--    search_patients_for_provider. Patients only ever see themselves.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_institution_patients(
  p_institution_id uuid,
  p_query text DEFAULT ''
)
RETURNS TABLE(
  patient_id uuid, first_name text, last_name text, email text,
  phone text, date_of_birth date, on_roster boolean, source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_caller uuid := auth.uid();
  v_q text := coalesce(trim(p_query), '');
  v_ids uuid[];
BEGIN
  IF v_caller IS NULL AND coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Patient callers: only their own record, only when on this roster.
  IF NOT (coalesce(auth.role(), '') = 'service_role' OR public.is_institution_member(p_institution_id)) THEN
    RETURN QUERY
      SELECT ip.patient_id, p.first_name, p.last_name, p.email, p.phone,
             p.date_of_birth, true, ip.source
      FROM public.institution_patients ip
      JOIN public.profiles p ON p.id = ip.patient_id
      WHERE ip.institution_id = p_institution_id
        AND ip.patient_id = v_caller
        AND ip.status = 'active';
    RETURN;
  END IF;

  WITH candidates AS (
    SELECT ip.patient_id AS pid, true AS on_roster, ip.source AS src, ip.last_seen_at AS seen
    FROM public.institution_patients ip
    WHERE ip.institution_id = p_institution_id AND ip.status = 'active'
    UNION
    SELECT a.patient_id, false, 'booking', a.created_at
    FROM public.appointments a
    WHERE a.institution_id = p_institution_id AND a.patient_id IS NOT NULL
    UNION
    SELECT ha.patient_id, false, 'admission', ha.created_at
    FROM public.hospital_admissions ha
    WHERE ha.hospital_id = p_institution_id AND ha.patient_id IS NOT NULL
    UNION
    SELECT qt.patient_id, false, 'queue', qt.created_at
    FROM public.queue_tokens qt
    WHERE qt.institution_id = p_institution_id AND qt.patient_id IS NOT NULL
  ),
  dedup AS (
    SELECT DISTINCT ON (c.pid) c.pid, c.on_roster, c.src
    FROM candidates c
    ORDER BY c.pid, c.on_roster DESC, c.seen DESC
  )
  SELECT array_agg(d.pid)
  INTO v_ids
  FROM dedup d
  JOIN public.profiles p ON p.id = d.pid
  WHERE p.role = 'patient'
    AND (
      v_q = ''
      OR p.first_name ILIKE '%' || v_q || '%'
      OR p.last_name ILIKE '%' || v_q || '%'
      OR (p.first_name || ' ' || p.last_name) ILIKE '%' || v_q || '%'
      OR p.email ILIKE '%' || v_q || '%'
      OR p.phone ILIKE '%' || v_q || '%'
    );

  -- Audit the identity search (best effort, mirrors search_patients_for_provider).
  IF v_caller IS NOT NULL AND v_q <> '' AND v_ids IS NOT NULL THEN
    BEGIN
      INSERT INTO public.patient_access_audit (accessor_id, patient_id, access_type, search_term)
      SELECT v_caller, x.pid, 'search', v_q
      FROM (SELECT unnest(v_ids) AS pid LIMIT 8) x;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN QUERY
    WITH candidates AS (
      SELECT ip.patient_id AS pid, true AS on_roster, ip.source AS src, ip.last_seen_at AS seen
      FROM public.institution_patients ip
      WHERE ip.institution_id = p_institution_id AND ip.status = 'active'
      UNION
      SELECT a.patient_id, false, 'booking', a.created_at
      FROM public.appointments a
      WHERE a.institution_id = p_institution_id AND a.patient_id IS NOT NULL
      UNION
      SELECT ha.patient_id, false, 'admission', ha.created_at
      FROM public.hospital_admissions ha
      WHERE ha.hospital_id = p_institution_id AND ha.patient_id IS NOT NULL
      UNION
      SELECT qt.patient_id, false, 'queue', qt.created_at
      FROM public.queue_tokens qt
      WHERE qt.institution_id = p_institution_id AND qt.patient_id IS NOT NULL
    ),
    dedup AS (
      SELECT DISTINCT ON (c.pid) c.pid, c.on_roster, c.src
      FROM candidates c
      ORDER BY c.pid, c.on_roster DESC, c.seen DESC
    )
    SELECT d.pid, p.first_name, p.last_name, p.email, p.phone,
           p.date_of_birth, d.on_roster, d.src
    FROM dedup d
    JOIN public.profiles p ON p.id = d.pid
    WHERE d.pid = ANY (coalesce(v_ids, ARRAY[]::uuid[]))
    ORDER BY p.first_name, p.last_name
    LIMIT 25;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.search_institution_patients(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_institution_patients(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8) Claim-on-signup support: when a shadow account's password is set via
--    the recovery flow, the account stops being a shadow.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_shadow_claimed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
    UPDATE public.profiles
    SET is_shadow_account = false, updated_at = now()
    WHERE id = NEW.id AND is_shadow_account = true;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.mark_shadow_claimed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_mark_shadow_claimed ON auth.users;
CREATE TRIGGER trg_mark_shadow_claimed
  AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.mark_shadow_claimed();

-- ---------------------------------------------------------------------------
-- 9) Roster auto-join triggers: any clinical row written WITH a patient id
--    (booking, queue check-in, admission) joins the patient to that
--    institution's roster — the data-layer guarantee behind the unity rule,
--    independent of which client or edge function wrote the row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_institution_patient_roster()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_institution uuid;
  v_source text;
BEGIN
  IF TG_TABLE_NAME = 'appointments' THEN
    v_institution := NEW.institution_id;
    v_source := 'booking';
  ELSIF TG_TABLE_NAME = 'queue_tokens' THEN
    v_institution := NEW.institution_id;
    v_source := 'queue';
  ELSIF TG_TABLE_NAME = 'hospital_admissions' THEN
    v_institution := NEW.hospital_id;
    v_source := 'admission';
  ELSE
    RETURN NEW;
  END IF;

  IF v_institution IS NOT NULL AND NEW.patient_id IS NOT NULL THEN
    INSERT INTO public.institution_patients AS ip
      (institution_id, patient_id, source, added_by)
    VALUES (v_institution, NEW.patient_id, v_source, auth.uid())
    ON CONFLICT (institution_id, patient_id)
    DO UPDATE SET last_seen_at = now(), status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_institution_patient_roster()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_institution_patient_roster()
  TO service_role;

DROP TRIGGER IF EXISTS trg_roster_from_appointment ON public.appointments;
CREATE TRIGGER trg_roster_from_appointment
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.sync_institution_patient_roster();

DROP TRIGGER IF EXISTS trg_roster_from_queue_token ON public.queue_tokens;
CREATE TRIGGER trg_roster_from_queue_token
  AFTER INSERT ON public.queue_tokens
  FOR EACH ROW EXECUTE FUNCTION public.sync_institution_patient_roster();

DROP TRIGGER IF EXISTS trg_roster_from_admission ON public.hospital_admissions;
CREATE TRIGGER trg_roster_from_admission
  AFTER INSERT ON public.hospital_admissions
  FOR EACH ROW EXECUTE FUNCTION public.sync_institution_patient_roster();

-- ---------------------------------------------------------------------------
-- 10) Backfill the roster from established clinical relationships that carry
--    a real patient id today. Rows WITHOUT a patient id (name-only tokens,
--    unlinked registry rows) are deliberately untouched — they can only be
--    linked by an explicit desk action through find_or_create_patient.
-- ---------------------------------------------------------------------------
INSERT INTO public.institution_patients (institution_id, patient_id, source)
SELECT a.institution_id, a.patient_id, 'booking'
FROM public.appointments a
WHERE a.patient_id IS NOT NULL AND a.institution_id IS NOT NULL
ON CONFLICT (institution_id, patient_id) DO NOTHING;

INSERT INTO public.institution_patients (institution_id, patient_id, source)
SELECT ha.hospital_id, ha.patient_id, 'admission'
FROM public.hospital_admissions ha
WHERE ha.patient_id IS NOT NULL AND ha.hospital_id IS NOT NULL
ON CONFLICT (institution_id, patient_id) DO NOTHING;

INSERT INTO public.institution_patients (institution_id, patient_id, source)
SELECT qt.institution_id, qt.patient_id, 'queue'
FROM public.queue_tokens qt
WHERE qt.patient_id IS NOT NULL AND qt.institution_id IS NOT NULL
ON CONFLICT (institution_id, patient_id) DO NOTHING;
