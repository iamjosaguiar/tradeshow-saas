import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  try {
    console.log('🔄 Creating tradeshow_rep_assignments table...');

    // Create the table
    await sql`
      CREATE TABLE IF NOT EXISTS tradeshow_rep_assignments (
        id SERIAL PRIMARY KEY,
        tradeshow_id INTEGER NOT NULL REFERENCES tradeshows(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tradeshow_id, user_id)
      )
    `;

    console.log('✅ Table created successfully');

    console.log('🔄 Creating indexes...');

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_tradeshow_rep_assignments_tradeshow
      ON tradeshow_rep_assignments(tradeshow_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_tradeshow_rep_assignments_user
      ON tradeshow_rep_assignments(user_id)
    `;

    console.log('✅ Indexes created successfully');

    // Verify the table exists
    const verification = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'tradeshow_rep_assignments'
    `;

    if (verification.length > 0) {
      console.log('✅ Migration completed successfully!');
      console.log('\n📊 The tradeshow_rep_assignments table is now ready.');
      console.log('You can now assign sales managers to tradeshows in the admin interface.');
    } else {
      console.log('❌ Migration verification failed');
    }

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
}

migrate();
