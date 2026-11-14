-- 20261114_refill_requests_prescription_fk.sql
-- Bug-free gate 2026-11-14 (F2): prescription_refill_requests.prescription_id
-- had NO foreign key, so the client embed
--   prescription:prescription_id(id, medication_name, dosage, quantity, refills_remaining)
-- in src/components/provider/RefillRequestsQueue.tsx 400d live with
-- PGRST200 "Could not find a relationship" and the refill queue never
-- loaded. Live pre-check 2026-11-14: 0 rows, 0 orphans, prescription_id
-- NOT NULL, target comprehensive_prescriptions(id) exists.
-- ON DELETE CASCADE: a refill request is subordinate to its prescription
-- (same as order_items -> marketplace_products). Idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prescription_refill_requests_prescription_id_fkey'
  ) THEN
    ALTER TABLE public.prescription_refill_requests
      ADD CONSTRAINT prescription_refill_requests_prescription_id_fkey
      FOREIGN KEY (prescription_id)
      REFERENCES public.comprehensive_prescriptions(id)
      ON DELETE CASCADE;
  END IF;
END $$;
