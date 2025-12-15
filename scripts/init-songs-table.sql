-- Create saved_songs table
CREATE TABLE IF NOT EXISTS saved_songs (
  id VARCHAR(255) NOT NULL,
  user_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  audio_url TEXT NOT NULL,
  image_url TEXT,
  duration DECIMAL(10, 2) DEFAULT 0,
  tags TEXT,
  model_name VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_songs_user_id ON saved_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_songs_created_at ON saved_songs(created_at DESC);
