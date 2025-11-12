import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function debug() {
  try {
    console.log('=== Checking Jos Aguiar User ===');
    const users = await sql`SELECT id, name, email, role FROM users WHERE name LIKE '%Aguiar%' OR email LIKE '%aguiar%'`;
    console.log('Users:', JSON.stringify(users, null, 2));

    console.log('\n=== Checking All Tradeshows ===');
    const tradeshows = await sql`SELECT id, name, slug, is_active FROM tradeshows ORDER BY created_at DESC LIMIT 5`;
    console.log('Tradeshows:', JSON.stringify(tradeshows, null, 2));

    console.log('\n=== Checking tradeshow_rep_assignments table ===');
    try {
      const assignments = await sql`SELECT * FROM tradeshow_rep_assignments LIMIT 5`;
      console.log('Assignments:', JSON.stringify(assignments, null, 2));
    } catch (e) {
      console.log('Error accessing assignments table:', e.message);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debug();
