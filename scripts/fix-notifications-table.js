const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function fixNotificationsTable() {
  try {
    // Drop and recreate with UUID
    await pool.query(`
      DROP TABLE IF EXISTS notifications;
      
      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type VARCHAR(50) DEFAULT 'info',
        read BOOLEAN DEFAULT FALSE,
        link VARCHAR(500),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX idx_notifications_read ON notifications(user_id, read);
    `)
    
    console.log('✅ Notifications table recreated with UUID user_id!')
    
    // Add a welcome notification for testing
    await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, link)
      SELECT id, 'Welcome! 🎉', 'Your account is ready. Start creating amazing content!', 'success', '/dashboard'
      FROM users
      LIMIT 5
    `)
    
    console.log('✅ Added welcome notifications for existing users!')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

fixNotificationsTable()
