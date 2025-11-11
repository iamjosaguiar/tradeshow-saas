const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function addPasswordResetFields() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('🔧 Adding password reset fields to users table...\n');

  try {
    // Add password reset fields
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255)
    `;

    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP
    `;

    console.log('✅ Successfully added password reset fields to users table\n');

    // Verify the columns were added
    const columns = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;

    console.log('📋 Current users table structure:');
    columns.forEach((col) => {
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`   - ${col.column_name}: ${col.data_type}${length}`);
    });

  } catch (error) {
    console.error('❌ Error adding columns:', error.message);
    process.exit(1);
  }
}

addPasswordResetFields().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
