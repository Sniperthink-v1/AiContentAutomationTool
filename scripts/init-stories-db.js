const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function initStoriesTable() {
  try {
    console.log('🔄 Creating stories table...')

    const sql = fs.readFileSync(
      path.join(__dirname, 'init-stories-table.sql'),
      'utf8'
    )

    await pool.query(sql)

    console.log('✅ Stories table created successfully!')
    
    // Verify table exists
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'stories'
      ORDER BY ordinal_position
    `)

    console.log('\n📋 Stories table columns:')
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`)
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

initStoriesTable()
