-- Create commission settings table
CREATE TABLE public.commission_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'app_owner', 'institution', 'health_personnel'
  commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment splits table to track how payments are divided
CREATE TABLE public.payment_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL,
  recipient_id UUID NOT NULL, -- user_id of recipient
  recipient_type TEXT NOT NULL, -- 'patient', 'health_personnel', 'institution', 'app_owner'
  amount DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create institution wallets table
CREATE TABLE public.institution_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(institution_id)
);

-- Create app owner wallet table
CREATE TABLE public.app_owner_wallet (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default commission settings
INSERT INTO public.commission_settings (entity_type, commission_percentage) VALUES
('app_owner', 10.00), -- 10% to app owner
('institution', 15.00), -- 15% to institution
('health_personnel', 75.00); -- 75% to health personnel

-- Insert app owner wallet record
INSERT INTO public.app_owner_wallet (balance) VALUES (0.00);

-- Enable RLS on all new tables
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_owner_wallet ENABLE ROW LEVEL SECURITY;

-- RLS Policies for commission_settings
CREATE POLICY "Super admins can manage commission settings" 
ON public.commission_settings 
FOR ALL 
USING (is_super_admin());

CREATE POLICY "Users can view commission settings" 
ON public.commission_settings 
FOR SELECT 
USING (true);

-- RLS Policies for payment_splits
CREATE POLICY "Users can view their payment splits" 
ON public.payment_splits 
FOR SELECT 
USING (
  auth.uid() = recipient_id OR 
  EXISTS (
    SELECT 1 FROM payments p 
    WHERE p.id = payment_splits.payment_id 
    AND (p.patient_id = auth.uid() OR p.provider_id = auth.uid())
  )
);

-- RLS Policies for institution_wallets
CREATE POLICY "Institution admins can manage their wallet" 
ON public.institution_wallets 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM healthcare_institutions hi 
    WHERE hi.id = institution_wallets.institution_id 
    AND hi.admin_id = auth.uid()
  )
);

CREATE POLICY "Institution staff can view wallet" 
ON public.institution_wallets 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM institution_staff is_table
    WHERE is_table.institution_id = institution_wallets.institution_id 
    AND is_table.provider_id = auth.uid() 
    AND is_table.is_active = true
  )
);

-- RLS Policies for app_owner_wallet
CREATE POLICY "Super admins can manage app owner wallet" 
ON public.app_owner_wallet 
FOR ALL 
USING (is_super_admin());

-- Create function to process payment with commission splits
CREATE OR REPLACE FUNCTION public.process_payment_with_splits(
  p_payment_id UUID,
  p_total_amount DECIMAL(10,2),
  p_provider_id UUID,
  p_institution_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app_commission DECIMAL(5,2);
  v_institution_commission DECIMAL(5,2);
  v_personnel_commission DECIMAL(5,2);
  v_app_amount DECIMAL(10,2);
  v_institution_amount DECIMAL(10,2);
  v_personnel_amount DECIMAL(10,2);
  v_result JSONB;
BEGIN
  -- Get commission percentages
  SELECT commission_percentage INTO v_app_commission
  FROM commission_settings 
  WHERE entity_type = 'app_owner' AND is_active = true;
  
  SELECT commission_percentage INTO v_institution_commission
  FROM commission_settings 
  WHERE entity_type = 'institution' AND is_active = true;
  
  SELECT commission_percentage INTO v_personnel_commission
  FROM commission_settings 
  WHERE entity_type = 'health_personnel' AND is_active = true;
  
  -- Calculate amounts
  v_app_amount := p_total_amount * (v_app_commission / 100);
  v_institution_amount := p_total_amount * (v_institution_commission / 100);
  v_personnel_amount := p_total_amount * (v_personnel_commission / 100);
  
  -- Create payment splits
  INSERT INTO payment_splits (payment_id, recipient_id, recipient_type, amount, percentage)
  VALUES 
    (p_payment_id, (SELECT id FROM app_owner_wallet LIMIT 1), 'app_owner', v_app_amount, v_app_commission),
    (p_payment_id, p_provider_id, 'health_personnel', v_personnel_amount, v_personnel_commission);
  
  -- Add institution split if institution_id provided
  IF p_institution_id IS NOT NULL THEN
    INSERT INTO payment_splits (payment_id, recipient_id, recipient_type, amount, percentage)
    VALUES (p_payment_id, p_institution_id, 'institution', v_institution_amount, v_institution_commission);
  END IF;
  
  -- Update wallets
  UPDATE app_owner_wallet SET 
    balance = balance + v_app_amount,
    updated_at = now();
  
  UPDATE user_wallets SET 
    balance = balance + v_personnel_amount,
    updated_at = now()
  WHERE user_id = p_provider_id;
  
  IF p_institution_id IS NOT NULL THEN
    INSERT INTO institution_wallets (institution_id, balance)
    VALUES (p_institution_id, v_institution_amount)
    ON CONFLICT (institution_id) 
    DO UPDATE SET 
      balance = institution_wallets.balance + v_institution_amount,
      updated_at = now();
  END IF;
  
  -- Mark splits as completed
  UPDATE payment_splits 
  SET status = 'completed', processed_at = now()
  WHERE payment_id = p_payment_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'app_amount', v_app_amount,
    'institution_amount', v_institution_amount,
    'personnel_amount', v_personnel_amount
  );
END;
$$;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_commission_settings_updated_at
  BEFORE UPDATE ON commission_settings
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_institution_wallets_updated_at
  BEFORE UPDATE ON institution_wallets
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_app_owner_wallet_updated_at
  BEFORE UPDATE ON app_owner_wallet
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();