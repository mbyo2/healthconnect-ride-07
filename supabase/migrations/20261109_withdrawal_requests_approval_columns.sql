-- Fix withdrawal_requests schema drift: the approval columns from the
-- original 20261010_withdrawal_requests.sql DDL were never applied live.
-- The live table has no decided_by / decided_at / paid_at (drift first
-- documented in 20261025_stagec36_withdrawal_reservation.sql), so:
--   * WithdrawalAdminQueue.decide writes decided_by / decided_at and
--     fails live with a missing-column error;
--   * lenco-process-payout refuses every payout with "Cannot pay: no
--     admin approval recorded" (it requires decided_by set), and
--   * _shared/lenco.ts settleTransferByReference writes paid_at on
--     settlement.
-- Column definitions below match the 20261010 DDL exactly (types,
-- nullability, FK target; no defaults, no ON DELETE action).
-- Table-level grants already cover these columns (grants on the table
-- are not per-column), so no GRANT statements are needed.
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS decided_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
