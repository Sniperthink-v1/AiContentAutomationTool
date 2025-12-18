require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createDraftsTable() {
  try {
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Drafts table created successfully!');
  } catch (error) {
    console.error('❌ Error creating drafts table:', error.message);
  } finally {
    await pool.end();
  }
}

createDraftsTable();
