-- Create credits table
CREATE TABLE IF NOT EXISTS credits (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  total_credits INTEGER NOT NULL DEFAULT 1000,
  used_credits INTEGER NOT NULL DEFAULT 0,
  remaining_credits INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create credit transactions table for tracking usage
CREATE TABLE IF NOT EXISTS credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- 'image_generation', 'image_to_image', 'text_to_video', 'image_to_video', 'video_upscale'
  credits_used INTEGER NOT NULL,
  model_used VARCHAR(100),
  duration INTEGER, -- for video generation in seconds
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_credits_user_id ON credits(user_id);
CREATE INDEX idx_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_transactions_created_at ON credit_transactions(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_credits_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_credits_timestamp
BEFORE UPDATE ON credits
FOR EACH ROW
EXECUTE FUNCTION update_credits_timestamp();
