const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function addDefaultCountryColumn() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('🔧 Adding default_country column to tradeshows table...\n');

  try {
    // Add the default_country column if it doesn't exist
    await sql`
      ALTER TABLE tradeshows ADD COLUMN IF NOT EXISTS default_country VARCHAR(255)
    `;

    console.log('✅ Successfully added default_country column to tradeshows table\n');

    // Verify the column was added
    const columns = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'tradeshows'
      ORDER BY ordinal_position
    `;

    console.log('📋 Current tradeshows table structure:');
    columns.forEach((col) => {
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`   - ${col.column_name}: ${col.data_type}${length}`);
    });

  } catch (error) {
    console.error('❌ Error adding column:', error.message);
    process.exit(1);
  }
}

addDefaultCountryColumn().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
