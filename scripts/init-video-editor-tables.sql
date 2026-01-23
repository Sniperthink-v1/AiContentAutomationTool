-- Videos table for storing user's video assets
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration DECIMAL(10, 2), -- Duration in seconds
    file_size BIGINT, -- Size in bytes
    width INTEGER,
    height INTEGER,
    format VARCHAR(50), -- mp4, webm, etc.
    source VARCHAR(50) DEFAULT 'upload', -- 'upload', 'ai_generated', 'editor_export'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video export jobs table for tracking render progress
CREATE TABLE IF NOT EXISTS video_export_jobs (
    id VARCHAR(100) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_name VARCHAR(255),
    config JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'complete', 'failed'
    progress INTEGER DEFAULT 0, -- 0-100
    output_url TEXT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Video editor projects table for saving project state
CREATE TABLE IF NOT EXISTS video_editor_projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    settings JSONB NOT NULL, -- aspectRatio, resolution, frameRate, etc.
    video_clips JSONB DEFAULT '[]',
    audio_clips JSONB DEFAULT '[]',
    text_overlays JSONB DEFAULT '[]',
    thumbnail_url TEXT,
    duration DECIMAL(10, 2),
    is_auto_save BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_source ON videos(source);

CREATE INDEX IF NOT EXISTS idx_video_export_jobs_user_id ON video_export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_video_export_jobs_status ON video_export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_export_jobs_created_at ON video_export_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_editor_projects_user_id ON video_editor_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_video_editor_projects_updated_at ON video_editor_projects(updated_at DESC);

-- Update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_video_editor_projects_updated_at ON video_editor_projects;
CREATE TRIGGER update_video_editor_projects_updated_at
    BEFORE UPDATE ON video_editor_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
