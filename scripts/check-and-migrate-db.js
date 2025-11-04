const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

async function checkAndMigrateDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('🔍 Checking production database...\n');

  try {
    // Check if dynamics_user_id column exists
    console.log('1. Checking for dynamics_user_id column...');
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;

    console.log('   Columns in users table:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    const hasDynamicsColumn = columns.some(col => col.column_name === 'dynamics_user_id');

    if (!hasDynamicsColumn) {
      console.log('\n⚠️  dynamics_user_id column missing. Adding it...');
      await sql`ALTER TABLE users ADD COLUMN dynamics_user_id VARCHAR(255)`;
      console.log('✅ Added dynamics_user_id column\n');
    } else {
      console.log('✅ dynamics_user_id column exists\n');
    }

    // Check existing users
    console.log('2. Checking existing users...');
    const users = await sql`
      SELECT id, name, email, role, rep_code, dynamics_user_id
      FROM users
      ORDER BY role, name
    `;

    console.log(`   Total users: ${users.length}`);
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Role: ${user.role} - Rep Code: ${user.rep_code || 'N/A'}`);
    });

    const reps = users.filter(u => u.role === 'rep');
    console.log(`\n   Reps found: ${reps.length}`);

    if (reps.length === 0) {
      console.log('\n⚠️  No reps found. Creating sample reps...');

      await sql`
        INSERT INTO users (email, name, password_hash, role, rep_code)
        VALUES
          ('john.smith@cleanspacetechnology.com', 'John Smith', '$2a$10$rK3VNnEKPgXLJLGqJWqBHO0tGLuCLPvLRvFqLvXqZKVnGQ8YZJzPq', 'rep', 'john-smith'),
          ('jane.doe@cleanspacetechnology.com', 'Jane Doe', '$2a$10$rK3VNnEKPgXLJLGqJWqBHO0tGLuCLPvLRvFqLvXqZKVnGQ8YZJzPq', 'rep', 'jane-doe')
        ON CONFLICT (email) DO NOTHING
      `;

      console.log('✅ Created sample reps:');
      console.log('   - John Smith (john.smith@cleanspacetechnology.com) - Password: admin123');
      console.log('   - Jane Doe (jane.doe@cleanspacetechnology.com) - Password: admin123\n');
    } else {
      console.log('✅ Reps already exist\n');
    }

    // Final verification
    console.log('3. Final verification - querying reps as the API does...');
    const apiReps = await sql`
      SELECT id, email, name, rep_code, dynamics_user_id, created_at, last_login
      FROM users
      WHERE role = 'rep'
      ORDER BY name ASC
    `;

    console.log(`   API would return ${apiReps.length} reps:`);
    apiReps.forEach(rep => {
      console.log(`   - ${rep.name} (${rep.email})`);
      console.log(`     Rep Code: ${rep.rep_code}`);
      console.log(`     Dynamics User ID: ${rep.dynamics_user_id || 'Not assigned'}`);
    });

    console.log('\n✨ Database check and migration complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Refresh the /dashboard/admin/reps page');
    console.log('   2. You should now see your reps in the table');
    console.log('   3. Click Edit to assign Dynamics 365 users to each rep');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkAndMigrateDatabase().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
