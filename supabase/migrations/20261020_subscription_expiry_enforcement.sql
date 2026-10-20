-- ============================================================
-- Doc'O Clock — subscription expiry enforcement (Workstream A)
--
-- Until now nothing ever set a subscription to expired/past_due and
-- nothing gated on subscription status: a paid period that simply
-- ran out kept reading "active" forever.
--
-- This migration adds the STORED-status flipper. The client already
-- computes the EFFECTIVE status from the period dates (see
-- src/services/subscriptionStatus.ts) and gates paid add-on modules
-- on it, so this function is bookkeeping, not the enforcement path:
-- it keeps stored rows honest for admin lists, analytics and any
-- future server-side checks.
--
-- Model notes (verified against the live schema 2026-10-20):
--   * There is NO institution_subscriptions table and no
--     subscription column on healthcare_institutions.
--   * Subscriptions live in public.user_subscriptions
--     (user_id -> subscription_plans). An institution's subscription
--     is the row owned by its admin user
--     (healthcare_institutions.admin_id).
--   * subscription_plans.price_monthly / price_annual /
--     plan_type describe whether a plan is paid at all.
--
-- Flip rules (paid plans only — free / pay-per-booking plans are
-- NEVER flipped, so free and trial-era institutions cannot be
-- locked out by this job):
--   * status 'active'   and current_period_end < now()  -> 'expired'
--   * status 'trialing' and COALESCE(trial_end,
--                        current_period_end) < now()    -> 'expired'
--     (the trial ended without converting to a paid period)
--   * status 'cancelled' and current_period_end < now() -> 'expired'
--     (cancelled rows stay readable as cancelled until the paid
--     period actually ends, matching the client-side rule)
--   * Already 'past_due' rows are left as-is (payment failed; a
--     later successful payment / renewal moves them on — flipping
--     them to 'expired' here would erase the dunning signal).
--   * 'pending' rows are never touched (payment not completed).
--
-- Date: 2026-10-20
-- ============================================================

CREATE OR REPLACE FUNCTION public.expire_lapsed_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  flipped integer;
BEGIN
  UPDATE public.user_subscriptions us
  SET status = 'expired',
      updated_at = now()
  FROM public.subscription_plans sp
  WHERE sp.id = us.plan_id
    -- Paid plans only: a positive price for either cycle. Free
    -- (price 0) and pay-per-booking plans can never lapse.
    AND sp.plan_type = 'subscription'
    AND (COALESCE(sp.price_monthly, 0) > 0 OR COALESCE(sp.price_annual, 0) > 0)
    AND (
      (us.status = 'active' AND us.current_period_end < now())
      OR (us.status = 'trialing'
          AND COALESCE(us.trial_end, us.current_period_end) < now())
      OR (us.status = 'cancelled' AND us.current_period_end < now())
    );

  GET DIAGNOSTICS flipped = ROW_COUNT;
  RETURN flipped;
END;
$$;

COMMENT ON FUNCTION public.expire_lapsed_subscriptions() IS
  'Flips lapsed PAID user_subscriptions rows to expired (active/trialing/cancelled past their period end). Free and pay-per-booking plans are never touched. Returns the number of rows flipped. Client-side effective status (src/services/subscriptionStatus.ts) does not depend on this having run.';

-- Manual run (safe, idempotent — a second run flips 0 rows):
--   SELECT public.expire_lapsed_subscriptions();

-- Optional scheduling — pg_cron is NOT assumed to be enabled.
-- After enabling the pg_cron extension (Dashboard -> Database ->
-- Extensions), a superadmin may schedule the flipper, e.g. hourly:
--   SELECT cron.schedule(
--     'expire-lapsed-subscriptions',
--     '15 * * * *',
--     $$ SELECT public.expire_lapsed_subscriptions(); $$
--   );
