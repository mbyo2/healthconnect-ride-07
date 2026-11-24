-- ============================================================================
-- Payments audit fixes, part 2 (2026-11-24) — subscription status vocabulary
--
-- Live-proven defect (companion to 20261124_payments_audit_fixes.sql):
-- user_subscriptions_status_check only allows
-- ('active','cancelled','expired','past_due','trialing'), but the product's
-- own subscribe flow (useSubscription) creates paid-plan subscriptions with
-- status 'pending' while payment is outstanding — so even WITH the new
-- INSERT policy from part 1, subscribing to a paid plan fails with 23514.
-- 'pending' is the vocabulary the client, the RLS policies and the
-- server-side activation in settle.ts all use; the constraint is the odd
-- one out. Widen it (existing values preserved, 'pending' added).
-- ============================================================================

ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_status_check
  CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'trialing', 'pending'));
