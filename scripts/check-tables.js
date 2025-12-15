const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function checkTables() {
  try {
    // Check ai_images table
    const imagesResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ai_images'
    `)
    console.log('ai_images columns:', JSON.stringify(imagesResult.rows, null, 2))
    
    // Check ai_videos table
    const videosResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ai_videos'
    `)
    console.log('\nai_videos columns:', JSON.stringify(videosResult.rows, null, 2))
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

checkTables()
