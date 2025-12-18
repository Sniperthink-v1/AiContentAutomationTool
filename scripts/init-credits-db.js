const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Read .env.local file manually
const envContent = fs.readFileSync('.env.local', 'utf8')
const dbUrlMatch = envContent.match(/DATABASE_URL="(.+)"/)
const dbUrl = dbUrlMatch ? dbUrlMatch[1] : null

if (!dbUrl) {
  console.error('❌ DATABASE_URL not found in .env.local')
  process.exit(1)
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  }
})

async function initCreditsTable() {
  const client = await pool.connect()
  
  try {
    console.log('🔄 Connecting to database...')
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'init-credits-table.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('🔄 Creating credits tables...')
    await client.query(sql)
    
    console.log('✅ Credits tables created successfully!')
    
    // Create a test user with 1000 credits
    console.log('🔄 Creating test user with 1000 credits...')
    await client.query(`
      INSERT INTO credits (user_id, total_credits, used_credits, remaining_credits)
      VALUES ('test-user-123', 1000, 0, 1000)
      ON CONFLICT (user_id) DO NOTHING
    `)
    
    console.log('✅ Test user created!')
    
    // Check the result
    const result = await client.query('SELECT * FROM credits WHERE user_id = $1', ['test-user-123'])
    console.log('📊 Test user credits:', result.rows[0])
    
  } catch (error) {
    console.error('❌ Error creating credits tables:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

initCreditsTable()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Failed:', error)
    process.exit(1)
  })
