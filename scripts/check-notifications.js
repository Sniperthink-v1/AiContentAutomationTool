// Check notifications table and diagnose issues
const { Client } = require('pg')
require('dotenv').config({ path: '.env.local' })

async function checkNotifications() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    console.log('🔗 Connecting to database...')
    await client.connect()
    console.log('✅ Connected!')

    // Check if notifications table exists
    console.log('\n📋 Checking notifications table...')
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notifications'
      );
    `)
    console.log('Notifications table exists:', tableCheck.rows[0].exists)

    if (!tableCheck.rows[0].exists) {
      console.log('\n❌ Notifications table does not exist!')
      console.log('Run: node scripts/init-notifications-db.js to create it')
      await client.end()
      return
    }

    // Check table structure
    console.log('\n📋 Table structure:')
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'notifications'
      ORDER BY ordinal_position;
    `)
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })

    // Check user_id type vs users.id type
    console.log('\n📋 Checking user ID types...')
    const userIdType = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id';
    `)
    console.log('Users.id type:', userIdType.rows[0]?.data_type || 'NOT FOUND')

    const notifUserIdType = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'notifications' AND column_name = 'user_id';
    `)
    console.log('Notifications.user_id type:', notifUserIdType.rows[0]?.data_type || 'NOT FOUND')

    // Check for notifications
    console.log('\n📋 Checking notifications count...')
    const count = await client.query('SELECT COUNT(*) FROM notifications')
    console.log('Total notifications:', count.rows[0].count)

    // Sample notifications
    if (parseInt(count.rows[0].count) > 0) {
      console.log('\n📋 Sample notifications:')
      const sample = await client.query('SELECT * FROM notifications LIMIT 5')
      sample.rows.forEach((n, i) => {
        console.log(`\nNotification ${i + 1}:`)
        console.log('  ID:', n.id)
        console.log('  User ID:', n.user_id)
        console.log('  Title:', n.title)
        console.log('  Type:', n.type)
        console.log('  Read:', n.read)
      })
    }

    console.log('\n✅ Check completed')
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.end()
  }
}

checkNotifications()
