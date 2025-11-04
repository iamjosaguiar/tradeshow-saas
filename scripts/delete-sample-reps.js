const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

async function deleteSampleReps() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  // Sample reps to delete
  const sampleReps = [
    'john.smith@cleanspacetechnology.com',
    'jane.doe@cleanspacetechnology.com'
  ];

  console.log('🗑️  Deleting sample rep accounts...\n');
  console.log('─'.repeat(80));

  let deleted = 0;
  let notFound = 0;

  for (const email of sampleReps) {
    try {
      // Check if they have any submissions
      const user = await sql`
        SELECT id, name FROM users WHERE email = ${email} AND role = 'rep'
      `;

      if (user.length === 0) {
        console.log(`⚠️  ${email} - Not found`);
        notFound++;
        continue;
      }

      const userId = user[0].id;
      const userName = user[0].name;

      // Check for submissions
      const submissions = await sql`
        SELECT COUNT(*) as count FROM badge_photos WHERE submitted_by_rep = ${userId}
      `;

      const submissionCount = parseInt(submissions[0].count);

      if (submissionCount > 0) {
        console.log(`⚠️  ${userName} - Has ${submissionCount} submissions, skipping deletion`);
        continue;
      }

      // Delete the user
      await sql`
        DELETE FROM users WHERE id = ${userId} AND role = 'rep'
      `;

      console.log(`✅ ${userName} (${email}) - Deleted successfully`);
      deleted++;

    } catch (error) {
      console.error(`❌ Error deleting ${email}:`, error.message);
    }
  }

  console.log('─'.repeat(80));
  console.log('\n📊 Summary:');
  console.log(`   ✅ Deleted: ${deleted}`);
  console.log(`   ⚠️  Skipped/Not Found: ${notFound}`);
  console.log(`   Total: ${sampleReps.length}\n`);

  if (deleted > 0) {
    console.log('✨ Sample rep accounts removed from database.');
  }
}

deleteSampleReps().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
