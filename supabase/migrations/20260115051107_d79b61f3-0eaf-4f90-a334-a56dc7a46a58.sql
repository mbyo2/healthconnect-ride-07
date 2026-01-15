-- Add missing columns to payments table for PayPal integration
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS external_payment_id text,
ADD COLUMN IF NOT EXISTS payment_url text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS error_message text,
ADD COLUMN IF NOT EXISTS failed_at timestamp with time zone;