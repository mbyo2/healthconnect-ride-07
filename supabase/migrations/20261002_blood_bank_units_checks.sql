-- Add server-side positive-units validation for Blood Bank tables.
--
-- The Blood Bank UI previously relied solely on client-side validation for
-- units. A zero-unit transfusion request (BBR-15KK) was persisted to the
-- database, proving the gap. These CHECK constraints enforce at the database
-- level that:
-- - Transfusion requests must ask for a positive number of units (> 0)
-- - Donations must collect a positive number of units (> 0)
-- - Inventory availability can be zero but never negative (>= 0)
--
-- NOTE: Apply only after removing the known zero-unit defect artifact
-- (BBR-15KK, QA test data). The constraint will reject existing violations.

-- Transfusion requests: units_required must be positive
ALTER TABLE public.blood_bank_requests
  ADD CONSTRAINT chk_blood_requests_units_positive
  CHECK (units_required IS NULL OR units_required > 0);

-- Donations: units_collected must be positive
ALTER TABLE public.blood_donations
  ADD CONSTRAINT chk_blood_donations_units_positive
  CHECK (units_collected IS NULL OR units_collected > 0);

-- Inventory: units_available must not be negative (zero is valid = out of stock)
ALTER TABLE public.blood_bank_inventory
  ADD CONSTRAINT chk_blood_inventory_units_nonnegative
  CHECK (units_available IS NULL OR units_available >= 0);
