-- Migration: Add status tracking columns for workflow management
-- Created: 2025-12-27

-- Add status history and tracking to payments table
ALTER TABLE IF EXISTS payments 
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- Add status tracking to marketplace_orders table
ALTER TABLE IF EXISTS marketplace_orders
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status_updated_by UUID REFERENCES auth.users(id);

-- Add status tracking to connections table  
ALTER TABLE IF EXISTS connections
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status ON marketplace_orders(status);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

-- Add comments for documentation
COMMENT ON COLUMN payments.status_history IS 'JSON array tracking all status changes with timestamps and reasons';
COMMENT ON COLUMN marketplace_orders.status_history IS 'JSON array tracking order status progression';
COMMENT ON COLUMN connections.status_history IS 'JSON array tracking connection request status changes';
