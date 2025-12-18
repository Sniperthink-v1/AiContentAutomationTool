require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addScheduledDateColumn() {
  try {
    await pool.query('ALTER TABLE drafts ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP WITH TIME ZONE');
    console.log('✅ scheduled_date column added to drafts table!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addScheduledDateColumn();
