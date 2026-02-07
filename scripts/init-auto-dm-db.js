const { Pool } = require('pg')
require('dotenv').config({ path: '.env' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
})

async function initAutoDMTables() {
  const client = await pool.connect()
  try {
    console.log('🚀 Creating auto-DM tables...')
    
    // Create auto_dm_rules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS auto_dm_rules (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        ig_user_id TEXT NOT NULL,
        keyword TEXT NOT NULL,
        dm_message TEXT NOT NULL,
        access_token TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    console.log('✅ auto_dm_rules table created')
    
    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auto_dm_rules_ig_user_active 
      ON auto_dm_rules(ig_user_id, is_active)
    `)
    console.log('✅ Index created on auto_dm_rules')
    
    // Create auto_dm_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS auto_dm_logs (
        id SERIAL PRIMARY KEY,
        ig_user_id TEXT NOT NULL,
        comment_id TEXT NOT NULL,
        commenter_id TEXT NOT NULL,
        commenter_username TEXT NOT NULL,
        keyword TEXT NOT NULL,
        dm_message TEXT NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    console.log('✅ auto_dm_logs table created')
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auto_dm_logs_ig_user 
      ON auto_dm_logs(ig_user_id, sent_at DESC)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auto_dm_logs_commenter
      ON auto_dm_logs(commenter_id)
    `)
    console.log('✅ Indexes created on auto_dm_logs')
    
    console.log('✨ Auto-DM tables setup complete!')
    
  } catch (error) {
    console.error('❌ Error creating auto-DM tables:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

initAutoDMTables()
