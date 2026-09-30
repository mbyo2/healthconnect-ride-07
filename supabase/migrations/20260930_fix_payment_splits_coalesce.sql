-- Fix process_payment_with_splits: handle NULL commissions with COALESCE
-- The institution commission row has is_active=false, causing SELECT to return NULL
-- NULL + number = NULL, making payment_splits.amount NULL (violates NOT NULL)
-- Fix: COALESCE all commission variables to 0 after SELECT

-- This migration is a placeholder; the actual fix was applied live via dashboard
-- The full function definition with COALESCE is in the live database
-- See browser task 4faa2523 for the applied SQL

SELECT 1; -- No-op, fix applied live
