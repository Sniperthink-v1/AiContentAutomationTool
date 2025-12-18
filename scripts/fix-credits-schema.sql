-- Fix credits table schema inconsistency
-- Run this in Neon SQL Editor AFTER creating sessions table

-- Add remaining_credits column if missing
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credits' AND column_name = 'remaining_credits'
  ) THEN
    ALTER TABLE credits ADD COLUMN remaining_credits INTEGER DEFAULT 1000;
    
    -- Update existing records to calculate remaining_credits
    UPDATE credits 
    SET remaining_credits = total_credits - used_credits
    WHERE remaining_credits IS NULL;
    
    RAISE NOTICE 'Added remaining_credits column and updated existing records';
  END IF;
END $$;

-- Verify the schema
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'credits'
ORDER BY ordinal_position;

-- Show sample data
SELECT 
  user_id,
  total_credits,
  used_credits,
  remaining_credits,
  ai_credits
FROM credits
LIMIT 5;
