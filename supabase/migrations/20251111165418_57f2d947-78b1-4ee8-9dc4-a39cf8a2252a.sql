-- Phase 1a: Add missing enum values to app_role

DO $$ 
BEGIN
    -- Add 'pharmacy' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pharmacy' AND enumtypid = 'app_role'::regtype) THEN
        ALTER TYPE app_role ADD VALUE 'pharmacy';
    END IF;
END $$;

DO $$ 
BEGIN
    -- Add 'institution_staff' if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'institution_staff' AND enumtypid = 'app_role'::regtype) THEN
        ALTER TYPE app_role ADD VALUE 'institution_staff';
    END IF;
END $$;