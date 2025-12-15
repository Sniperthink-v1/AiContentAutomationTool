// Test notifications API functionality
const { Client } = require('pg')
require('dotenv').config({ path: '.env.local' })

async function testNotifications() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    console.log('🔗 Connecting to database...')
    await client.connect()
    console.log('✅ Connected!')

    // Get a test user ID
    const users = await client.query('SELECT id, email FROM users LIMIT 1')
    if (users.rows.length === 0) {
      console.log('❌ No users found')
      return
    }
    
    const testUserId = users.rows[0].id
    console.log('\n📋 Testing with user:', users.rows[0].email)
    console.log('   User ID:', testUserId)

    // Test query similar to what API does
    console.log('\n📋 Running notifications query...')
    const query = `
      SELECT id, title, message, type, read, link, metadata, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC LIMIT $2
    `
    
    const result = await client.query(query, [testUserId, 20])
    console.log('✅ Query successful!')
    console.log('   Found', result.rows.length, 'notifications')
    
    if (result.rows.length > 0) {
      console.log('\n📋 Sample notification:')
      console.log('   ID:', result.rows[0].id)
      console.log('   Title:', result.rows[0].title)
      console.log('   Type:', result.rows[0].type)
      console.log('   Read:', result.rows[0].read)
    }

    // Test unread count query
    console.log('\n📋 Running unread count query...')
    const unreadResult = await client.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = FALSE',
      [testUserId]
    )
    console.log('✅ Unread count query successful!')
    console.log('   Unread count:', unreadResult.rows[0].count)

    // Create a test notification
    console.log('\n📋 Creating test notification...')
    const createResult = await client.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [testUserId, 'Test Notification', 'This is a test notification', 'info', '/dashboard']
    )
    console.log('✅ Test notification created with ID:', createResult.rows[0].id)

    console.log('\n✅ All notifications tests passed!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('   Stack:', error.stack)
  } finally {
    await client.end()
  }
}

testNotifications()
