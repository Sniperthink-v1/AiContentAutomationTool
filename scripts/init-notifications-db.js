// Initialize notifications table in the database
const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function initNotificationsTable() {
  const client = await pool.connect()
  
  try {
    console.log('Creating notifications table...')
    
    // Create table without foreign key first (in case users table structure differs)
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'info',
        read BOOLEAN DEFAULT FALSE,
        link VARCHAR(500),
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    
    console.log('✅ Notifications table created')
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(user_id, created_at DESC)
    `)
    
    console.log('✅ Indexes created')
    
    // Create trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_notifications_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)
    
    // Create trigger
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_notifications_updated_at ON notifications
    `)
    await client.query(`
      CREATE TRIGGER trigger_notifications_updated_at
        BEFORE UPDATE ON notifications
        FOR EACH ROW
        EXECUTE FUNCTION update_notifications_updated_at()
    `)
    
    console.log('✅ Trigger created')
    console.log('')
    console.log('🎉 Notifications system is ready!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    client.release()
    await pool.end()
  }
}

initNotificationsTable()
