const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function listAllUsers() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('📋 Listing all users in the database...\n');

  try {
    // Get all users
    const users = await sql`
      SELECT id, email, name, role, rep_code, dynamics_user_id, created_at, last_login
      FROM users
      ORDER BY role DESC, name ASC
    `;

    if (users.length === 0) {
      console.log('⚠️  No users found in the database');
      return;
    }

    console.log(`Found ${users.length} users:\n`);
    console.log('='.repeat(100));

    // Group by role
    const admins = users.filter(u => u.role === 'admin');
    const reps = users.filter(u => u.role === 'rep');

    if (admins.length > 0) {
      console.log('\n👑 ADMINS:\n');
      admins.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Rep Code: ${user.rep_code || 'N/A'}`);
        console.log(`   Dynamics ID: ${user.dynamics_user_id || 'N/A'}`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
        console.log(`   Last Login: ${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}`);
        console.log('');
      });
    }

    if (reps.length > 0) {
      console.log('\n👥 SALES REPS:\n');
      reps.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Rep Code: ${user.rep_code || 'N/A'}`);
        console.log(`   Dynamics ID: ${user.dynamics_user_id || 'N/A'}`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
        console.log(`   Last Login: ${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}`);
        console.log('');
      });
    }

    console.log('='.repeat(100));
    console.log(`\nTotal: ${admins.length} admins, ${reps.length} reps\n`);

    console.log('📝 PASSWORD NOTES:');
    console.log('   Passwords are hashed with bcrypt and cannot be retrieved.');
    console.log('   Based on user creation scripts, the following temporary passwords were used:\n');
    console.log('   - Most recent password (2025): CleanSpace2025!');
    console.log('   - Previous password (2024): CleanSpace2024!');
    console.log('\n   If a user cannot log in, you may need to reset their password.');

  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    process.exit(1);
  }
}

listAllUsers().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
