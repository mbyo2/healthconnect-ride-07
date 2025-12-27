-- Migration: Add status tracking columns for workflow management
-- Created: 2025-12-27

-- Add status history and tracking to payments table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
    ALTER TABLE payments 
    ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS refund_reason TEXT;
    
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    
    COMMENT ON COLUMN payments.status_history IS 'JSON array tracking all status changes with timestamps and reasons';
  END IF;
END $$;

-- Add status tracking to marketplace_orders table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'marketplace_orders') THEN
    ALTER TABLE marketplace_orders
    ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS status_updated_by UUID REFERENCES auth.users(id);
    
    CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status ON marketplace_orders(status);
    
    COMMENT ON COLUMN marketplace_orders.status_history IS 'JSON array tracking order status progression';
  END IF;
END $$;

-- Add status tracking to connections table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'connections') THEN
    ALTER TABLE connections
    ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    
    CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
    
    COMMENT ON COLUMN connections.status_history IS 'JSON array tracking connection request status changes';
  END IF;
END $$;
