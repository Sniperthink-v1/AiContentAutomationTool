// Test database connection directly
const { Client } = require('pg')
require('dotenv').config({ path: '.env.local' })

async function testDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    console.log('🔗 Connecting to database...')
    await client.connect()
    console.log('✅ Connected!')

    // Check if users table exists
    console.log('\n📋 Checking users table...')
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `)
    console.log('Users table exists:', tableCheck.rows[0].exists)

    if (tableCheck.rows[0].exists) {
      // Get all users
      console.log('\n👥 Fetching users...')
      const users = await client.query('SELECT * FROM users ORDER BY created_at ASC')
      console.log(`Found ${users.rows.length} user(s)`)
      
      users.rows.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`)
        console.log('  ID:', user.id)
        console.log('  Email:', user.email)
        console.log('  Name:', user.first_name, user.last_name)
        console.log('  Username:', user.username)
        console.log('  Bio:', user.bio)
        console.log('  Avatar URL:', user.avatar_url ? 'Set' : 'Not set')
      })

      // Check drafts table
      console.log('\n📋 Checking drafts table...')
      const draftsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'drafts'
        );
      `)
      console.log('Drafts table exists:', draftsCheck.rows[0].exists)

      if (draftsCheck.rows[0].exists) {
        const drafts = await client.query('SELECT COUNT(*) FROM drafts')
        console.log('Total drafts:', drafts.rows[0].count)
      }
    }

    console.log('\n✅ Database check completed')
  } catch (error) {
    console.error('❌ Database error:', error.message)
  } finally {
    await client.end()
  }
}

testDatabase()
