-- Add missing columns for story scheduling
-- Run this to update your existing stories table

-- Add instagram_media_id column to store the Instagram media ID after posting
ALTER TABLE stories ADD COLUMN IF NOT EXISTS instagram_media_id VARCHAR(255);

-- Add error_message column to store error details if publishing fails
ALTER TABLE stories ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Update status check constraint to include 'published' and 'failed'
ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_status_check;
ALTER TABLE stories ADD CONSTRAINT stories_status_check 
  CHECK (status IN ('scheduled', 'posted', 'published', 'draft', 'failed'));

-- Add similar columns to drafts table if they don't exist
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS instagram_media_id VARCHAR(255);
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE;

-- Update drafts status check constraint
ALTER TABLE drafts DROP CONSTRAINT IF EXISTS drafts_status_check;
ALTER TABLE drafts ADD CONSTRAINT drafts_status_check 
  CHECK (status IN ('draft', 'scheduled', 'published', 'failed'));

-- Create indexes for better cron job performance
CREATE INDEX IF NOT EXISTS idx_stories_scheduled_status ON stories(scheduled_time, status) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_drafts_scheduled_status ON drafts(scheduled_date, status) WHERE status = 'scheduled';

-- Create social_integrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS social_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  platform_user_id VARCHAR(255),
  platform_username VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Create index for social integrations
CREATE INDEX IF NOT EXISTS idx_social_integrations_user_platform ON social_integrations(user_id, platform);

-- Add prompt column to saved_songs table if it doesn't exist
ALTER TABLE saved_songs ADD COLUMN IF NOT EXISTS prompt TEXT;

SELECT 'Migration completed successfully!' as result;
