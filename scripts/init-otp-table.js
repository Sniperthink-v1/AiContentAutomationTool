const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function createOTPTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_otps (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        purpose VARCHAR(20) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        attempts INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_otps_expires ON email_otps(expires_at)`)
    
    console.log('✅ OTP table created successfully!')
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

createOTPTable()
