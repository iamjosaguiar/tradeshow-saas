const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

async function addAdminRepCodes() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  // Admins to add rep codes for
  const admins = [
    {
      email: 'gabrielle.ocarroll@cleanspacetechnology.com',
      rep_code: 'gabrielle-ocarroll'
    },
    {
      email: 'judith.waugh@cleanspacetechnology.com',
      rep_code: 'judith-waugh'
    }
  ];

  console.log('🔧 Adding rep codes to admin accounts...\n');
  console.log('─'.repeat(80));

  let updated = 0;
  let skipped = 0;

  for (const admin of admins) {
    try {
      // Check if rep code is already taken
      const existingCode = await sql`
        SELECT id, name FROM users WHERE rep_code = ${admin.rep_code}
      `;

      if (existingCode.length > 0) {
        console.log(`⚠️  Rep code "${admin.rep_code}" already in use, skipping...`);
        skipped++;
        continue;
      }

      // Update the admin with rep code
      const result = await sql`
        UPDATE users
        SET rep_code = ${admin.rep_code},
            updated_at = CURRENT_TIMESTAMP
        WHERE email = ${admin.email} AND role = 'admin'
        RETURNING id, name, email, rep_code
      `;

      if (result.length > 0) {
        console.log(`✅ ${result[0].name} - Rep code added: ${result[0].rep_code}`);
        updated++;
      } else {
        console.log(`⚠️  ${admin.email} - Admin not found`);
        skipped++;
      }

    } catch (error) {
      console.error(`❌ Error updating ${admin.email}:`, error.message);
    }
  }

  console.log('─'.repeat(80));
  console.log('\n📊 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log(`   Total: ${admins.length}\n`);

  if (updated > 0) {
    console.log('📋 Personalized URLs:');
    console.log('\nGabrielle O\'Carroll:');
    console.log('   https://tradeshow.cleanspacetechnology.com/trade-show-lead/[slug]/gabrielle-ocarroll');
    console.log('\nJudith Waugh:');
    console.log('   https://tradeshow.cleanspacetechnology.com/trade-show-lead/[slug]/judith-waugh');
    console.log('\n✨ Admins can now capture leads with their personalized URLs!');
  }
}

addAdminRepCodes().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
