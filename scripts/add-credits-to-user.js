// Script to add credits to a specific user
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addCredits() {
  try {
    const email = 'priyankakatoch623@gmail.com';
    const creditsToAdd = 5000;
    
    // Find user
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found:', email);
      process.exit(1);
    }
    
    const userId = userResult.rows[0].id;
    console.log('✅ User found - ID:', userId);
    
    // Check current credits
    const currentCredits = await pool.query(
      'SELECT * FROM credits WHERE user_id = $1',
      [userId]
    );
    
    if (currentCredits.rows.length === 0) {
      // Create credits record if not exists
      await pool.query(
        `INSERT INTO credits (user_id, total_credits, remaining_credits, used_credits) 
         VALUES ($1, $2, $2, 0)`,
        [userId, creditsToAdd]
      );
      console.log(`✅ Credits created: ${creditsToAdd} credits`);
    } else {
      // Add to existing credits
      const current = currentCredits.rows[0];
      const newTotal = current.total_credits + creditsToAdd;
      const newRemaining = current.remaining_credits + creditsToAdd;
      
      console.log('📊 Current state:');
      console.log(`   Total: ${current.total_credits}`);
      console.log(`   Remaining: ${current.remaining_credits}`);
      console.log(`   Used: ${current.used_credits}`);
      
      await pool.query(
        `UPDATE credits 
         SET total_credits = $1, remaining_credits = $2 
         WHERE user_id = $3`,
        [newTotal, newRemaining, userId]
      );
      
      console.log(`\n✅ Added ${creditsToAdd} credits!`);
      console.log('📊 New state:');
      console.log(`   Total: ${newTotal}`);
      console.log(`   Remaining: ${newRemaining}`);
      console.log(`   Used: ${current.used_credits}`);
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

addCredits();
