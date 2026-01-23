-- Stories table for Instagram Stories scheduler
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('image', 'video')),
  url TEXT NOT NULL,
  thumbnail TEXT,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'posted', 'draft')),
  duration INTEGER NOT NULL DEFAULT 5,
  caption TEXT,
  stickers JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  posted_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
CREATE INDEX IF NOT EXISTS idx_stories_scheduled_time ON stories(scheduled_time);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_stories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stories_timestamp
  BEFORE UPDATE ON stories
  FOR EACH ROW
  EXECUTE FUNCTION update_stories_updated_at();
