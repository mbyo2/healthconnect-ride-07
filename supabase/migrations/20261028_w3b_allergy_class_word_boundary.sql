-- W3b (QA sweep 2026-10-28) — P3/D5: allergy class matching in
-- public.drug_classes_for anchored member drugs at the START of the
-- normalised name (v = m OR v LIKE m||' %' OR slash-at-start/end), so a
-- medication name with any prefix text before the drug — e.g. the W2
-- fixture "SW28W2 Amoxicillin" — silently evaded the prescribing safety
-- gate's class-mediated allergy checks (penicillin allergy → amoxicillin,
-- and the penicillin ↔ cephalosporin cross-reactivity rule), even though
-- public.drug_names_match already does substring matching for direct
-- name-to-name matches.
--
-- FIX: word-boundary (token-sequence) matching. Both the candidate name
-- and each member name are tokenised on whitespace and the separator
-- characters / - ( ) , ; and a member matches when its token sequence
-- appears contiguously in the candidate's token sequence. This is a
-- strict superset of the old start/slash patterns:
--   * every name that matched before still matches (exact, "drug + suffix",
--     "a/b" and "b/a" combos, multi-word members like "benzathine
--     penicillin" / "penicillin v");
--   * prefixed names now match ("SW28W2 Amoxicillin", "ZZ Amoxicillin");
--   * hyphen/slash combination forms now match anywhere
--     ("Sulfamethoxazole-Trimethoprim", "X/Amoxicillin").
--
-- FALSE-POSITIVE SAFETY (why not plain substring): a token must EQUAL the
-- member token, so look-alike names stay clean — "Penicillamine" (a
-- different drug, not a penicillin) does not match "penicillin", and
-- "Ferrous Sulfate" does not match the sulfonamide members / "sulfa".
-- A member token appearing as a genuine component of a combination
-- product DOES match — clinically correct, the allergen is in the
-- product. Known theoretical edge: a name that mentions a member only to
-- deny it (e.g. "Aspirin-Free Paracetamol") would now flag the class;
-- that fails SAFE (the gate blocks with a clinician override path on
-- comprehensive_prescriptions) and is preferable to missing a real
-- combination product at a safety gate.
--
-- CREATE OR REPLACE preserves the stagec16 ACL (EXECUTE revoked from
-- PUBLIC / anon / authenticated). The client mirror
-- src/utils/drug-interactions.ts drugClassesFor is updated identically.

CREATE OR REPLACE FUNCTION public.drug_classes_for(p_name text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $fn$
DECLARE
  v text := public.normalize_drug_name(p_name);
  v_classes text[] := ARRAY[]::text[];
  v_members text[];
  v_class text;
  m text;
  v_pad text;
  m_pad text;
BEGIN
  IF v IS NULL THEN
    RETURN v_classes;
  END IF;

  -- Allergen terms that ARE class names
  IF v IN ('penicillin', 'penicillins') THEN RETURN ARRAY['penicillins']; END IF;
  IF v IN ('cephalosporin', 'cephalosporins') THEN RETURN ARRAY['cephalosporins']; END IF;
  IF v IN ('sulfonamide', 'sulfonamides', 'sulfa', 'sulpha') THEN RETURN ARRAY['sulfonamides']; END IF;
  IF v IN ('nsaid', 'nsaids',
           'nonsteroidal anti-inflammatory', 'non-steroidal anti-inflammatory',
           'nonsteroidal anti-inflammatory drug', 'non-steroidal anti-inflammatory drug')
  THEN RETURN ARRAY['nsaids']; END IF;

  -- Token-padded candidate: separators become spaces, runs collapsed,
  -- one leading/trailing space so a member phrase only matches on word
  -- boundaries (contiguous token sequence).
  v_pad := ' ' || regexp_replace(regexp_replace(v, '[/\-(),;]', ' ', 'g'), '\s+', ' ', 'g') || ' ';

  FOREACH v_class IN ARRAY ARRAY['penicillins', 'cephalosporins', 'sulfonamides', 'nsaids'] LOOP
    v_members := CASE v_class
      WHEN 'penicillins' THEN ARRAY[
        'penicillin', 'penicillin v', 'penicillin g', 'benzathine penicillin',
        'amoxicillin', 'ampicillin', 'flucloxacillin', 'cloxacillin',
        'co-amoxiclav', 'amoxiclav', 'augmentin']
      WHEN 'cephalosporins' THEN ARRAY[
        'cephalexin', 'cefalexin', 'cefuroxime', 'ceftriaxone', 'cefixime',
        'cefotaxime', 'cefpodoxime', 'cephalothin']
      WHEN 'sulfonamides' THEN ARRAY[
        'sulfamethoxazole', 'co-trimoxazole', 'cotrimoxazole', 'septrin',
        'sulfasalazine', 'sulfadiazine', 'sulfadoxine']
      WHEN 'nsaids' THEN ARRAY[
        'ibuprofen', 'diclofenac', 'naproxen', 'aspirin', 'acetylsalicylic acid',
        'celecoxib', 'meloxicam', 'ketorolac', 'piroxicam', 'indomethacin',
        'mefenamic acid']
    END;
    FOREACH m IN ARRAY v_members LOOP
      m_pad := ' ' || regexp_replace(regexp_replace(m, '[/\-(),;]', ' ', 'g'), '\s+', ' ', 'g') || ' ';
      IF position(m_pad IN v_pad) > 0 THEN
        v_classes := array_append(v_classes, v_class);
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
  RETURN v_classes;
END
$fn$;
