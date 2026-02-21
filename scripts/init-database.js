const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

async function initDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    console.log('🔗 Connecting to database...')
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'init-db.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('📝 Executing SQL script...')
    await pool.query(sql)
    
    console.log('✅ Database initialized successfully!')
    console.log('📊 Tables created: drafts')
    
    // Verify table exists
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'drafts'
    `)
    
    if (result.rows.length > 0) {
      console.log('✓ Verified: drafts table exists')
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

initDatabase()
