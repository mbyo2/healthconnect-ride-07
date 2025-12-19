-- Add insurance and billing columns to pharmacy_sales
ALTER TABLE pharmacy_sales 
ADD COLUMN IF NOT EXISTS insurance_claim_id UUID REFERENCES insurance_verifications(id),
ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2);

-- Add billing columns to lab_tests
ALTER TABLE lab_tests
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS insurance_claim_id UUID REFERENCES insurance_verifications(id),
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
