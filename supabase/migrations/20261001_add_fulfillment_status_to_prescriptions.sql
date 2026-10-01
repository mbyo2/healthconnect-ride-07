-- Add fulfillment_status to comprehensive_prescriptions for pharmacist dispensing workflow
-- The frontend PrescriptionFulfillment component expects this column but it was missing,
-- causing dispensing status changes to silently fail.

ALTER TABLE public.comprehensive_prescriptions
ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'pending'
CHECK (fulfillment_status IN ('pending', 'filled', 'partially_filled', 'cancelled'));

-- Index for pharmacy queue queries
CREATE INDEX IF NOT EXISTS idx_comprehensive_prescriptions_fulfillment
ON public.comprehensive_prescriptions(pharmacy_id, fulfillment_status);

-- Backfill: map existing status values to fulfillment_status
UPDATE public.comprehensive_prescriptions
SET fulfillment_status = CASE
  WHEN status = 'dispensed' THEN 'filled'
  WHEN status = 'cancelled' THEN 'cancelled'
  ELSE 'pending'
END
WHERE fulfillment_status IS NULL OR fulfillment_status = 'pending';
