-- Add blockchain-related columns to existing medical_records table
-- This migration extends the existing table rather than creating a new one

-- Add new columns to medical_records table if they don't exist
DO $$ 
BEGIN
    -- Add hash column for blockchain verification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'medical_records' AND column_name = 'hash') THEN
        ALTER TABLE public.medical_records ADD COLUMN hash TEXT;
    END IF;

    -- Add verified column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'medical_records' AND column_name = 'verified') THEN
        ALTER TABLE public.medical_records ADD COLUMN verified BOOLEAN DEFAULT true;
    END IF;

    -- Add shared_with column for sharing records
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'medical_records' AND column_name = 'shared_with') THEN
        ALTER TABLE public.medical_records ADD COLUMN shared_with TEXT[] DEFAULT '{}';
    END IF;

    -- Add title column if it doesn't exist (for BlockchainRecords UI)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'medical_records' AND column_name = 'title') THEN
        ALTER TABLE public.medical_records ADD COLUMN title TEXT;
    END IF;

    -- Add provider column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'medical_records' AND column_name = 'provider') THEN
        ALTER TABLE public.medical_records ADD COLUMN provider TEXT;
    END IF;

    -- Add category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'medical_records' AND column_name = 'category') THEN
        ALTER TABLE public.medical_records ADD COLUMN category TEXT;
    END IF;
END $$;

-- Update existing RLS policies are already in place from the base schema
-- The existing policies on medical_records should work with the new columns

COMMENT ON COLUMN public.medical_records.hash IS 'Simulated blockchain hash for record verification';
COMMENT ON COLUMN public.medical_records.verified IS 'Whether the record has been verified on the blockchain';
COMMENT ON COLUMN public.medical_records.shared_with IS 'Array of provider names this record has been shared with';
