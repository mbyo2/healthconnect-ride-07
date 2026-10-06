-- ============================================================
-- Backfill institution_personnel for QAX28, QAX29, QAX30 test admins
-- Institution admins created via signup were not added to
-- institution_personnel, breaking queue tokens and other features.
-- ============================================================

INSERT INTO public.institution_personnel (institution_id, user_id, role, status)
SELECT hi.id, hi.admin_id, 'admin', 'active'
FROM public.healthcare_institutions hi
WHERE hi.name LIKE 'QAX%'
  AND hi.admin_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.institution_personnel ip
    WHERE ip.institution_id = hi.id AND ip.user_id = hi.admin_id
  );
