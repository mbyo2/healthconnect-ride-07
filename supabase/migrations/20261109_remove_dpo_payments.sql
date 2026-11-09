-- Remove DPO (CEO decision 2026-11-09): Lenco is Doc'O Clock's only payment gateway.
-- The dpo_payments table was created 2026-07-07 but never used (0 rows live,
-- no code, edge function, or client reference). Dropping it removes the last
-- DPO artefact alongside the DPO_* edge-function secrets (unset separately).
DROP TABLE IF EXISTS public.dpo_payments;
