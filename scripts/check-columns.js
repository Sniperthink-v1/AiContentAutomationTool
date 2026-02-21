const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function checkTable() {
  try {
    const result = await pool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'credits'
    `)
    console.log('Credits columns:', result.rows.map(r => r.column_name))
  } catch (e) {
    console.error('Error:', e.message)
  } finally {
    await pool.end()
  }
}

checkTable()
