require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

async function addAICreditsColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Adding ai_credits column to credits table...');
    
    // Add ai_credits column if it doesn't exist
    await pool.query(`
      ALTER TABLE credits 
      ADD COLUMN IF NOT EXISTS ai_credits INTEGER DEFAULT 500
    `);
    
    console.log('✅ AI credits column added successfully');
    
    // Update existing users to have 500 AI credits
    const result = await pool.query(`
      UPDATE credits 
      SET ai_credits = 500 
      WHERE ai_credits IS NULL
    `);
    
    console.log(`✅ Updated ${result.rowCount} existing users with 500 AI credits`);
    
    // Show current state
    const users = await pool.query('SELECT user_id, remaining_credits, ai_credits FROM credits');
    console.log('\n📊 Current credits state:');
    users.rows.forEach(user => {
      console.log(`  User ${user.user_id}: ${user.remaining_credits} credits, ${user.ai_credits} AI credits`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addAICreditsColumn();
