const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_8Je6lBcmwvAM@ep-dawn-cake-a1grp2xl-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
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
