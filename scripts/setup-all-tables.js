require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupAllTables() {
  try {
    console.log('🔧 Setting up all database tables...\n');

    // 1. Enable UUID extension
    console.log('1. Enabling UUID extension...');
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('   ✅ UUID extension enabled');

    // 2. Create/update drafts table with all columns
    console.log('\n2. Setting up drafts table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drafts (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        original_prompt TEXT NOT NULL,
        enhanced_script TEXT NOT NULL,
        video_url TEXT,
        thumbnail_url TEXT,
        settings JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'generating',
        scheduled_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    // Add columns if they don't exist
    await pool.query('ALTER TABLE drafts ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP WITH TIME ZONE');
    await pool.query('ALTER TABLE drafts ADD COLUMN IF NOT EXISTS thumbnail_url TEXT');
    await pool.query('ALTER TABLE drafts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
    console.log('   ✅ Drafts table ready');

    // 3. Create posts table
    console.log('\n3. Setting up posts table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        caption TEXT,
        media_urls TEXT[],
        thumbnail_url TEXT,
        scheduled_time TIMESTAMP WITH TIME ZONE,
        published_at TIMESTAMP WITH TIME ZONE,
        platform VARCHAR(50),
        platform_post_id VARCHAR(255),
        ai_generated BOOLEAN DEFAULT FALSE,
        ai_prompt TEXT,
        ai_model VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Posts table ready');

    // 4. Create stories table
    console.log('\n4. Setting up stories table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        url TEXT NOT NULL,
        thumbnail TEXT,
        scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(20) DEFAULT 'scheduled',
        duration INTEGER DEFAULT 5,
        caption TEXT,
        stickers JSONB,
        posted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Stories table ready');

    // 5. Create ai_images table
    console.log('\n5. Setting up ai_images table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_images (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prompt TEXT NOT NULL,
        enhanced_prompt TEXT,
        image_url TEXT NOT NULL,
        model VARCHAR(100),
        mode VARCHAR(50),
        source_image_url TEXT,
        settings JSONB,
        credits_used INTEGER DEFAULT 2,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ AI Images table ready');

    // 6. Create ai_videos table
    console.log('\n6. Setting up ai_videos table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_videos (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prompt TEXT NOT NULL,
        enhanced_prompt TEXT,
        video_url TEXT NOT NULL,
        thumbnail_url TEXT,
        model VARCHAR(100),
        mode VARCHAR(50),
        duration INTEGER NOT NULL,
        source_media_url TEXT,
        settings JSONB,
        credits_used INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ AI Videos table ready');

    // 7. Create post_analytics table
    console.log('\n7. Setting up post_analytics table...');
    await pool.query(`
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
      )
    `);
    console.log('   ✅ Post Analytics table ready');

    // 8. Create social_integrations table
    console.log('\n8. Setting up social_integrations table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_integrations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at TIMESTAMP WITH TIME ZONE,
        platform_user_id VARCHAR(255),
        platform_username VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, platform)
      )
    `);
    console.log('   ✅ Social Integrations table ready');

    // 9. Create indexes
    console.log('\n9. Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status)',
      'CREATE INDEX IF NOT EXISTS idx_drafts_scheduled ON drafts(scheduled_date)',
      'CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status)',
      'CREATE INDEX IF NOT EXISTS idx_posts_scheduled_time ON posts(scheduled_time)',
      'CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status)',
      'CREATE INDEX IF NOT EXISTS idx_stories_scheduled_time ON stories(scheduled_time)',
      'CREATE INDEX IF NOT EXISTS idx_ai_images_user_id ON ai_images(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_ai_videos_user_id ON ai_videos(user_id)',
    ];
    
    for (const idx of indexes) {
      await pool.query(idx);
    }
    console.log('   ✅ All indexes created');

    console.log('\n✅ All tables set up successfully!');
    console.log('\nTables available:');
    console.log('   - users');
    console.log('   - sessions');
    console.log('   - credits');
    console.log('   - credit_transactions');
    console.log('   - drafts');
    console.log('   - posts');
    console.log('   - stories');
    console.log('   - ai_images');
    console.log('   - ai_videos');
    console.log('   - post_analytics');
    console.log('   - social_integrations');

  } catch (error) {
    console.error('❌ Error setting up tables:', error.message);
  } finally {
    await pool.end();
  }
}

setupAllTables();
