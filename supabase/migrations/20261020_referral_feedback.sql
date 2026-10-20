-- Referral Feedback Loop
-- The referrals table tracks sending but the loop never closed: the
-- receiving provider couldn't report the outcome back to the referrer.
-- These columns carry the feedback; submission also notifies the
-- referring doctor via the notifications table.
-- Date: 2026-10-20

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS outcome_status TEXT
    CHECK (outcome_status IN ('seen', 'treated', 'admitted', 'procedure_done', 'discharged', 'declined', 'patient_did_not_arrive'));
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS feedback_notes TEXT;
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS treatment_summary TEXT;
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS feedback_by UUID REFERENCES auth.users(id);
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;
