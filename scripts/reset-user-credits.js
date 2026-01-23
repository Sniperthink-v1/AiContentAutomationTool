// Reset credits for user with negative balance
const { Client } = require('pg')
require('dotenv').config({ path: '.env.local' })

async function resetCredits() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    await client.connect()
    console.log('Connected to database')

    // Reset credits for user with negative balance
    const userId = '057dec4f-3c40-45ed-a7ff-d6c88b29b64a'
    
    const result = await client.query(
      `UPDATE credits 
       SET used_credits = 0, remaining_credits = 1000 
       WHERE user_id = $1`,
      [userId]
    )
    
    console.log('Credits reset, rows affected:', result.rowCount)

    // Verify
    const check = await client.query('SELECT * FROM credits WHERE user_id = $1', [userId])
    console.log('Updated credits:', check.rows[0])

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await client.end()
  }
}

resetCredits()
