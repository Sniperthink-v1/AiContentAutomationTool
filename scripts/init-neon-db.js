const { Client } = require('pg')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function initNeonDatabase() {
  console.log('🚀 Initializing Neon Database...\n')

  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_yw6OlNI1ZCWc@ep-hidden-cake-a45o1y5v-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  })

  try {
    await client.connect()
    console.log('✅ Connected to Neon Database\n')

    // Read schema file
    const schemaPath = path.join(__dirname, '..', 'lib', 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    console.log('📋 Executing schema...')
    await client.query(schema)
    console.log('✅ Schema created successfully!\n')

    // Verify tables
    console.log('🔍 Verifying tables...')
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)

    console.log('📊 Created tables:')
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`)
    })

    console.log('\n✨ Database initialization complete!')
    console.log('\n📝 Next steps:')
    console.log('  1. Run: npm run dev')
    console.log('  2. Navigate to: http://localhost:3003/signup')
    console.log('  3. Create your first account!')

  } catch (error) {
    console.error('❌ Error initializing database:', error.message)
    throw error
  } finally {
    await client.end()
  }
}

initNeonDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error)
    process.exit(1)
  })
