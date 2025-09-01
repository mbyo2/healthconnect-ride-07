-- Phase 1: Fix Critical Profile Security Issues (Corrected)
-- Drop the overly permissive public profile policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create secure profile policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Healthcare providers can view connected patients" 
ON public.profiles 
FOR SELECT 
USING (
  id IN (
    SELECT patient_id FROM user_connections 
    WHERE provider_id = auth.uid() AND status = 'approved'
  ) OR 
  id IN (
    SELECT provider_id FROM user_connections 
    WHERE patient_id = auth.uid() AND status = 'approved'
  )
);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND admin_level IN ('admin', 'superadmin')
  )
);

-- Phase 2: Create Proper Wallet System
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT positive_balance CHECK (balance >= 0)
);

-- Enable RLS on wallets
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- Wallet RLS policies
CREATE POLICY "Users can view their own wallet" 
ON public.user_wallets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" 
ON public.user_wallets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert wallets" 
ON public.user_wallets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create wallet transactions table for audit trail
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'refund')),
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  description TEXT,
  payment_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid()
);

-- Enable RLS on wallet transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Wallet transaction policies
CREATE POLICY "Users can view their own wallet transactions" 
ON public.wallet_transactions 
FOR SELECT 
USING (
  wallet_id IN (
    SELECT id FROM user_wallets WHERE user_id = auth.uid()
  )
);

-- Phase 3: Fix Institution Staff RLS Recursion
-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Staff can view institution details" ON public.institution_staff;

-- Create security definer function to check staff membership
CREATE OR REPLACE FUNCTION public.is_institution_staff(institution_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM institution_staff 
    WHERE institution_staff.institution_id = $1 
    AND institution_staff.provider_id = $2 
    AND is_active = true
  );
$$;

-- Create non-recursive policy for institution staff
CREATE POLICY "Staff can view their own staff records" 
ON public.institution_staff 
FOR SELECT 
USING (provider_id = auth.uid());

CREATE POLICY "Institution admins can view their staff" 
ON public.institution_staff 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM healthcare_institutions hi
    WHERE hi.id = institution_staff.institution_id 
    AND hi.admin_id = auth.uid()
  )
);

-- Phase 4: Secure Audit Log Access (Skip existing policies)
-- Add RLS policies to security_audit_log only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE policyname = 'Users can view their own audit logs' 
    AND tablename = 'security_audit_log'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own audit logs" 
    ON public.security_audit_log 
    FOR SELECT 
    USING (auth.uid() = user_id)';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE policyname = 'Admins can view all audit logs' 
    AND tablename = 'security_audit_log'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view all audit logs" 
    ON public.security_audit_log 
    FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND admin_level IN (''admin'', ''superadmin'')
      )
    )';
  END IF;
END $$;

-- Phase 5: Create function to initialize user wallet
CREATE OR REPLACE FUNCTION public.create_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id, balance)
  VALUES (NEW.id, 100.00) -- Give users $100 starting balance
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create wallet for new users
DROP TRIGGER IF EXISTS create_wallet_for_new_user ON public.profiles;
CREATE TRIGGER create_wallet_for_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_wallet();

-- Phase 6: Create wallet transaction function
CREATE OR REPLACE FUNCTION public.process_wallet_transaction(
  p_user_id UUID,
  p_transaction_type TEXT,
  p_amount DECIMAL(10,2),
  p_description TEXT DEFAULT NULL,
  p_payment_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance DECIMAL(10,2);
  v_new_balance DECIMAL(10,2);
  v_transaction_id UUID;
BEGIN
  -- Get wallet info
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM user_wallets 
  WHERE user_id = p_user_id;
  
  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user';
  END IF;
  
  -- Calculate new balance
  IF p_transaction_type = 'debit' THEN
    v_new_balance := v_current_balance - p_amount;
    IF v_new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient funds. Current balance: %, Required: %', v_current_balance, p_amount;
    END IF;
  ELSE
    v_new_balance := v_current_balance + p_amount;
  END IF;
  
  -- Update wallet balance
  UPDATE user_wallets 
  SET balance = v_new_balance, updated_at = now()
  WHERE id = v_wallet_id;
  
  -- Insert transaction record
  INSERT INTO wallet_transactions (
    wallet_id, transaction_type, amount, balance_after, 
    description, payment_id, created_by
  )
  VALUES (
    v_wallet_id, p_transaction_type, p_amount, v_new_balance,
    p_description, p_payment_id, p_user_id
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance,
    'previous_balance', v_current_balance
  );
END;
$$;