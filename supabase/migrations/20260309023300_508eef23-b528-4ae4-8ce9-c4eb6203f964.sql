-- First add the missing enum values
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'cxo';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'receptionist';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'hr_manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ot_staff';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'phlebotomist';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'billing_staff';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'inventory_manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'triage_staff';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'maintenance_manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'specialist';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ambulance_staff';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'pathologist';