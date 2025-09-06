-- Add unique constraint to commission_settings entity_type
ALTER TABLE commission_settings ADD CONSTRAINT unique_entity_type UNIQUE (entity_type);

-- Add pharmacy commission to commission settings
INSERT INTO commission_settings (entity_type, commission_percentage, is_active)
VALUES ('pharmacy', 5.00, true);

-- Create marketplace_sales table to track medicine sales
CREATE TABLE IF NOT EXISTS marketplace_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  pharmacy_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  pharmacy_commission DECIMAL(10,2) NOT NULL,
  app_owner_commission DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on marketplace_sales
ALTER TABLE marketplace_sales ENABLE ROW LEVEL SECURITY;

-- RLS policies for marketplace_sales
CREATE POLICY "Pharmacies can view their sales" ON marketplace_sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM healthcare_institutions hi 
      WHERE hi.id = pharmacy_id AND hi.admin_id = auth.uid()
    )
  );

CREATE POLICY "Patients can view their purchases" ON marketplace_sales
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Super admins can view all sales" ON marketplace_sales
  FOR SELECT USING (is_super_admin());

-- Update process_payment_with_splits function to handle pharmacy commissions
CREATE OR REPLACE FUNCTION public.process_payment_with_splits(
  p_payment_id uuid, 
  p_total_amount numeric, 
  p_provider_id uuid, 
  p_institution_id uuid DEFAULT NULL,
  p_payment_type text DEFAULT 'consultation'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_app_commission DECIMAL(5,2);
  v_institution_commission DECIMAL(5,2);
  v_personnel_commission DECIMAL(5,2);
  v_pharmacy_commission DECIMAL(5,2);
  v_app_amount DECIMAL(10,2);
  v_institution_amount DECIMAL(10,2);
  v_personnel_amount DECIMAL(10,2);
  v_pharmacy_amount DECIMAL(10,2);
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

  -- For pharmacy sales, get pharmacy commission
  IF p_payment_type = 'pharmacy' THEN
    SELECT commission_percentage INTO v_pharmacy_commission
    FROM commission_settings 
    WHERE entity_type = 'pharmacy' AND is_active = true;
    
    v_app_amount := p_total_amount * (v_app_commission / 100);
    v_pharmacy_amount := p_total_amount * (v_pharmacy_commission / 100);
    
    -- For pharmacy sales, the rest goes to the pharmacy (not personnel)
    v_personnel_amount := p_total_amount - v_pharmacy_amount - v_app_amount;
    v_institution_amount := 0;
  ELSE
    -- Regular consultation payment splits
    v_app_amount := p_total_amount * (v_app_commission / 100);
    
    -- Check if provider is affiliated with institution
    IF p_institution_id IS NOT NULL THEN
      v_institution_amount := p_total_amount * (v_institution_commission / 100);
      v_personnel_amount := p_total_amount * (v_personnel_commission / 100);
    ELSE
      -- Independent provider gets institution share too
      v_institution_amount := 0;
      v_personnel_amount := p_total_amount * ((v_personnel_commission + v_institution_commission) / 100);
    END IF;
    
    v_pharmacy_amount := 0;
  END IF;
  
  -- Create payment splits
  INSERT INTO payment_splits (payment_id, recipient_id, recipient_type, amount, percentage)
  VALUES 
    (p_payment_id, (SELECT id FROM app_owner_wallet LIMIT 1), 'app_owner', v_app_amount, v_app_commission);

  -- Add personnel split
  INSERT INTO payment_splits (payment_id, recipient_id, recipient_type, amount, percentage)
  VALUES (p_payment_id, p_provider_id, 'health_personnel', v_personnel_amount, 
          CASE WHEN p_institution_id IS NULL THEN v_personnel_commission + v_institution_commission ELSE v_personnel_commission END);

  -- Add institution split if institution_id provided and not pharmacy sale
  IF p_institution_id IS NOT NULL AND p_payment_type != 'pharmacy' THEN
    INSERT INTO payment_splits (payment_id, recipient_id, recipient_type, amount, percentage)
    VALUES (p_payment_id, p_institution_id, 'institution', v_institution_amount, v_institution_commission);
  END IF;

  -- Add pharmacy split if pharmacy sale
  IF p_payment_type = 'pharmacy' AND p_institution_id IS NOT NULL THEN
    INSERT INTO payment_splits (payment_id, recipient_id, recipient_type, amount, percentage)
    VALUES (p_payment_id, p_institution_id, 'pharmacy', v_pharmacy_amount, v_pharmacy_commission);
  END IF;
  
  -- Update wallets
  UPDATE app_owner_wallet SET 
    balance = balance + v_app_amount,
    updated_at = now();
  
  UPDATE user_wallets SET 
    balance = balance + v_personnel_amount,
    updated_at = now()
  WHERE user_id = p_provider_id;
  
  -- Update institution wallet if applicable
  IF p_institution_id IS NOT NULL AND (v_institution_amount > 0 OR v_pharmacy_amount > 0) THEN
    INSERT INTO institution_wallets (institution_id, balance)
    VALUES (p_institution_id, COALESCE(v_institution_amount, 0) + COALESCE(v_pharmacy_amount, 0))
    ON CONFLICT (institution_id) 
    DO UPDATE SET 
      balance = institution_wallets.balance + COALESCE(v_institution_amount, 0) + COALESCE(v_pharmacy_amount, 0),
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
    'personnel_amount', v_personnel_amount,
    'pharmacy_amount', v_pharmacy_amount,
    'payment_type', p_payment_type
  );
END;
$function$;