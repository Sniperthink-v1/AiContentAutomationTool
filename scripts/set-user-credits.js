// Script to set credits for a user
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setCredits() {
  try {
    const email = 'priyankakatoch623@gmail.com';
    
    // Find user
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.log('User not found:', email);
      process.exit(1);
    }
    
    const userId = userResult.rows[0].id;
    console.log('User ID:', userId);
    
    // Update credits
    const result = await pool.query(
      `UPDATE credits 
       SET total_credits = 5000, remaining_credits = 5000, used_credits = 0 
       WHERE user_id = $1 
       RETURNING *`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Create credits record if not exists
      await pool.query(
        `INSERT INTO credits (user_id, total_credits, remaining_credits, used_credits) 
         VALUES ($1, 5000, 5000, 0)`,
        [userId]
      );
      console.log('✅ Credits created: 5000');
    } else {
      console.log('✅ Credits updated:', result.rows[0]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

setCredits();
