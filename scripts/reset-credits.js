const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function resetCredits() {
  try {
    const result = await pool.query(`
      UPDATE credits 
      SET remaining_credits = 1000, total_credits = 1000, used_credits = 0 
      WHERE user_id = '057dec4f-3c40-45ed-a7ff-d6c88b29b64a'
    `)
    console.log('✅ Credits reset to 1000!', result.rowCount, 'row updated')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

resetCredits()
