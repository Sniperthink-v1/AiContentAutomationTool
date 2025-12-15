-- =============================================
-- Complete Database Schema for SniperThinkAI
-- PostgreSQL (Neon Database)
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USERS & AUTHENTICATION
-- =============================================

-- Users table with authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  username VARCHAR(50) UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 2. CREDITS SYSTEM
-- =============================================

-- User credits
CREATE TABLE IF NOT EXISTS credits (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_credits INTEGER DEFAULT 1000,
  used_credits INTEGER DEFAULT 0,
  remaining_credits INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Credit transactions history
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'image_generation', 'video_generation', 'image_to_image', etc.
  credits_used INTEGER NOT NULL,
  model_used VARCHAR(100),
  duration INTEGER, -- for video generations
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 3. SOCIAL MEDIA CONTENT
-- =============================================

-- Posts/Drafts
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'image', 'video', 'carousel'
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'published', 'failed'
  caption TEXT,
  media_urls TEXT[], -- Array of URLs
  thumbnail_url TEXT,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  platform VARCHAR(50), -- 'instagram', 'linkedin', 'facebook', etc.
  platform_post_id VARCHAR(255),
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_prompt TEXT,
  ai_model VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stories
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'image', 'video'
  url TEXT NOT NULL,
  thumbnail TEXT,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'posted', 'failed'
  duration INTEGER DEFAULT 5, -- in seconds
  caption TEXT,
  stickers JSONB, -- JSON data for stickers
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 4. AI GENERATION HISTORY
-- =============================================

-- AI generated images
CREATE TABLE IF NOT EXISTS ai_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  enhanced_prompt TEXT,
  image_url TEXT NOT NULL,
  model VARCHAR(100), -- 'flux-schnell', 'flux-dev', etc.
  mode VARCHAR(50), -- 'text-to-image', 'image-to-image'
  source_image_url TEXT,
  settings JSONB,
  credits_used INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI generated videos
CREATE TABLE IF NOT EXISTS ai_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  enhanced_prompt TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  model VARCHAR(100), -- 'gen4_turbo', 'veo3.1_fast', 'upscale_v1'
  mode VARCHAR(50), -- 'text-to-video', 'image-to-video', 'video-to-video'
  duration INTEGER NOT NULL,
  source_media_url TEXT,
  settings JSONB,
  credits_used INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 5. ANALYTICS
-- =============================================

-- Post analytics
CREATE TABLE IF NOT EXISTS post_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 6. INTEGRATIONS
-- =============================================

-- Social media integrations
CREATE TABLE IF NOT EXISTS social_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'instagram', 'linkedin', 'facebook'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  platform_user_id VARCHAR(255),
  platform_username VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, platform)
);

-- =============================================
-- INDEXES for Performance
-- =============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Credits indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_time ON posts(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- Stories indexes
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
CREATE INDEX IF NOT EXISTS idx_stories_scheduled_time ON stories(scheduled_time);

-- AI generation indexes
CREATE INDEX IF NOT EXISTS idx_ai_images_user_id ON ai_images(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_images_created_at ON ai_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_videos_user_id ON ai_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_videos_created_at ON ai_videos(created_at DESC);

-- =============================================
-- TRIGGERS for auto-updating timestamps
-- =============================================

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credits_updated_at BEFORE UPDATE ON credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_integrations_updated_at BEFORE UPDATE ON social_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INITIAL DATA (Optional)
-- =============================================

-- Note: Initial user will be created through signup page
-- Credits will be auto-created through trigger or API

COMMENT ON TABLE users IS 'User accounts with authentication';
COMMENT ON TABLE sessions IS 'Active user sessions for authentication';
COMMENT ON TABLE credits IS 'User credit balance for AI generations';
COMMENT ON TABLE credit_transactions IS 'History of credit usage';
COMMENT ON TABLE posts IS 'Social media posts and drafts';
COMMENT ON TABLE stories IS 'Instagram/social stories scheduling';
COMMENT ON TABLE ai_images IS 'AI generated images history';
COMMENT ON TABLE ai_videos IS 'AI generated videos history';
COMMENT ON TABLE post_analytics IS 'Analytics data for published posts';
COMMENT ON TABLE social_integrations IS 'Connected social media accounts';
