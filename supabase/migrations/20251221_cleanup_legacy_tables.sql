-- Migration script to cleanup legacy tables and update dependencies
-- Created: 2025-12-21

-- NOTE: Ensure all data is migrated or backed up before running this script.
-- The application code has been updated to use the 'comprehensive_*' tables.

-- 1. Handle dependencies for 'prescriptions' table
-- We need to update foreign keys in 'orders' and 'inventory_transactions' to point to 'comprehensive_prescriptions'

-- Update 'orders' table
ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_prescription_id_fkey;

-- Add new constraint to comprehensive_prescriptions
-- Note: This assumes that the IDs in comprehensive_prescriptions match those in prescriptions if data was migrated.
-- If comprehensive_prescriptions uses new IDs, you might need to update the prescription_id in orders table first.
ALTER TABLE orders
ADD CONSTRAINT orders_prescription_id_fkey
FOREIGN KEY (prescription_id)
REFERENCES comprehensive_prescriptions(id)
ON DELETE SET NULL; -- Or CASCADE, depending on requirement. SET NULL is safer.

-- Update 'inventory_transactions' table
ALTER TABLE inventory_transactions
DROP CONSTRAINT IF EXISTS inventory_transactions_prescription_id_fkey;

ALTER TABLE inventory_transactions
ADD CONSTRAINT inventory_transactions_prescription_id_fkey
FOREIGN KEY (prescription_id)
REFERENCES comprehensive_prescriptions(id)
ON DELETE SET NULL;

-- 2. Drop legacy tables
DROP TABLE IF EXISTS medical_records;
DROP TABLE IF EXISTS prescriptions; -- Now safe to drop
DROP TABLE IF EXISTS health_metrics;
DROP TABLE IF EXISTS daily_health_metrics;

-- Optional: Rename comprehensive tables to simpler names if desired in the future
-- ALTER TABLE comprehensive_medical_records RENAME TO medical_records;
-- ALTER TABLE comprehensive_prescriptions RENAME TO prescriptions;
-- ALTER TABLE comprehensive_health_metrics RENAME TO health_metrics;
