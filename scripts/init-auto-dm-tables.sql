-- Table to store auto-DM keyword rules
CREATE TABLE IF NOT EXISTS auto_dm_rules (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ig_user_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  dm_message TEXT NOT NULL,
  access_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast keyword lookup
CREATE INDEX IF NOT EXISTS idx_auto_dm_rules_ig_user_active 
ON auto_dm_rules(ig_user_id, is_active);

-- Table to log all auto-DM activities
CREATE TABLE IF NOT EXISTS auto_dm_logs (
  id SERIAL PRIMARY KEY,
  ig_user_id TEXT NOT NULL,
  comment_id TEXT NOT NULL,
  commenter_id TEXT NOT NULL,
  commenter_username TEXT NOT NULL,
  keyword TEXT NOT NULL,
  dm_message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for logs
CREATE INDEX IF NOT EXISTS idx_auto_dm_logs_ig_user 
ON auto_dm_logs(ig_user_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_auto_dm_logs_commenter
ON auto_dm_logs(commenter_id);

-- Sample data (optional)
-- INSERT INTO auto_dm_rules (user_id, ig_user_id, keyword, dm_message, access_token, is_active)
-- VALUES (
--   'your-user-id', 
--   'your-ig-business-account-id',
--   'link',
--   'Hi! Thanks for your interest! Check out our website: https://example.com',
--   'your-access-token',
--   true
-- );
