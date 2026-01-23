require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function initSongsTable() {
  const client = await pool.connect()
  
  try {
    console.log('🎵 Creating saved_songs table...')
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_songs (
        id VARCHAR(255) NOT NULL,
        user_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        audio_url TEXT NOT NULL,
        image_url TEXT,
        duration DECIMAL(10, 2) DEFAULT 0,
        tags TEXT,
        model_name VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id, user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    
    console.log('✅ saved_songs table created')
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_songs_user_id ON saved_songs(user_id)
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_songs_created_at ON saved_songs(created_at DESC)
    `)
    
    console.log('✅ Indexes created')
    console.log('🎉 Songs table initialization complete!')
    
  } catch (error) {
    console.error('❌ Error creating saved_songs table:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

initSongsTable()
