-- Add password column to users table (if not exists)
-- PostgreSQL doesn't support IF NOT EXISTS in ALTER TABLE, so we use DO block
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
  END IF;
END $$;

-- Make password required for new users (optional - can be enabled later)
-- ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
