-- Referral doctor picker support
-- referrals.referred_to_doctor historically held FREE TEXT (a typed name, or
-- the destination facility's name by default), while ReferralFeedback looks
-- referrals up by the receiving doctor's auth UUID — so the feedback loop
-- could never match. The create form now stores the doctor's UUID in
-- referred_to_doctor (the column is TEXT, a UUID string fits) and the human
-- display name in this new column.
-- Date: 2026-10-20

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS referred_to_name TEXT;

COMMENT ON COLUMN public.referrals.referred_to_name IS
  'Display name of the doctor in referrals.referred_to_doctor (which stores the doctor''s auth user UUID). NULL for legacy free-text referrals and facility-only referrals.';
