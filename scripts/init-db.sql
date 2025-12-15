-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  username VARCHAR(100) UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  instagram_access_token TEXT,
  instagram_user_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster user queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Create drafts table
CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  original_prompt TEXT NOT NULL,
  enhanced_script TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  settings JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'generating',
  scheduled_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);
CREATE INDEX IF NOT EXISTS idx_drafts_created_at ON drafts(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drafts_updated_at ON drafts;
CREATE TRIGGER update_drafts_updated_at 
  BEFORE UPDATE ON drafts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default user for testing
INSERT INTO users (email, first_name, last_name, username, bio) 
VALUES (
  'john.doe@example.com',
  'John',
  'Doe',
  'johndoe',
  'Social media manager & content creator'
) ON CONFLICT (email) DO NOTHING;

-- Sample data for testing (optional)
-- INSERT INTO drafts (user_id, original_prompt, enhanced_script, settings, status) 
-- VALUES (
--   (SELECT id FROM users WHERE email = 'john.doe@example.com'),
--   'Product showcase for sneakers',
--   'A dynamic 30-second video showcasing premium sneakers with smooth camera rotations...',
--   '{"style": "cinematic", "duration": 30, "cameraStyle": "dynamic"}',
--   'ready'
-- );

