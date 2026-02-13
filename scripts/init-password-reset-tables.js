require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initPasswordResetTables() {
  try {
    console.log('🔧 Setting up Password Reset tables...\n');

    // Check database connection
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL is not set in .env.local');
      console.log('\nPlease add your database connection string to .env.local:');
      console.log('DATABASE_URL=postgresql://user:password@host:5432/database');
      process.exit(1);
    }

    // Enable UUID extension
    console.log('1. Enabling UUID extension...');
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('   ✅ UUID extension enabled');

    // Create email_otps table
    console.log('\n2. Creating email_otps table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_otps (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        purpose VARCHAR(20) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        attempts INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_email_otps_expires ON email_otps(expires_at)');
    console.log('   ✅ email_otps table created');

    // Create password_resets table
    console.log('\n3. Creating password_resets table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id)');
    console.log('   ✅ password_resets table created');

    // Verify tables
    console.log('\n4. Verifying tables...');
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('email_otps', 'password_resets', 'users', 'sessions')
      ORDER BY table_name
    `);
    
    console.log('   Tables found:');
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });

    const requiredTables = ['email_otps', 'password_resets', 'users', 'sessions'];
    const foundTables = result.rows.map(r => r.table_name);
    const missingTables = requiredTables.filter(t => !foundTables.includes(t));
    
    if (missingTables.length > 0) {
      console.log('\n   ⚠️  Missing tables:', missingTables.join(', '));
      console.log('   Run the full schema setup or create these tables manually.');
    }

    console.log('\n✅ Password reset tables setup complete!');
    console.log('\nReset password flow requires:');
    console.log('  • ZEPTO_MAIL_API_KEY - for sending OTP emails');
    console.log('  • NEXT_PUBLIC_APP_URL - for reset link URLs');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('password must be a string')) {
      console.log('\n💡 Fix: Check your DATABASE_URL in .env.local');
      console.log('   Format: postgresql://user:password@host:5432/database');
    }
    if (error.message.includes('relation "users" does not exist')) {
      console.log('\n💡 Fix: Create the users table first');
      console.log('   Run: node scripts/init-database.js');
    }
  } finally {
    await pool.end();
  }
}

initPasswordResetTables();
