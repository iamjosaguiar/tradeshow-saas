const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });
const { neon } = require('@neondatabase/serverless');

/**
 * Preview the sync with updated mappings
 */

async function previewSync() {
  console.log('🔍 Previewing sync with updated rep mappings...\n');

  const AC_API_URL = process.env.ACTIVECAMPAIGN_API_URL;
  const AC_API_KEY = process.env.ACTIVECAMPAIGN_API_KEY;
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!AC_API_URL || !AC_API_KEY || !DATABASE_URL) {
    console.error('❌ Missing required credentials');
    process.exit(1);
  }

  try {
    const sql = neon(DATABASE_URL);

    // Get reps from database
    const reps = await sql`
      SELECT name, dynamics_user_id, email
      FROM users
      WHERE dynamics_user_id IS NOT NULL AND role IN ('rep', 'admin')
      ORDER BY name
    `;

    console.log('✅ Reps in database with Dynamics IDs:\n');
    reps.forEach(rep => {
      console.log(`   ${rep.name}`);
    });
    console.log('');

    /**
     * Smart name matching function (same as sync script)
     */
    function findMatchingRep(salesRepName) {
      if (!salesRepName) return null;

      const searchName = salesRepName.toLowerCase().trim();

      // Special case mappings
      const specialMappings = {
        'jb/gabrielle': 'Jean-Baptiste Bourdeau',
        'bradyn': 'Bradyn Mirabelle',
        'fabienne -german': 'Fabienne Selles',
        'fabienne - german': 'Fabienne Selles',
      };

      if (specialMappings[searchName]) {
        const mappedName = specialMappings[searchName];
        const rep = reps.find(r => r.name === mappedName);
        if (rep) return rep.name;
      }

      // Handle Malina variations
      if (searchName.startsWith('malina')) {
        const rep = reps.find(r => r.name === 'Malina Fontaine');
        if (rep) return rep.name;
      }

      // Try exact match
      for (const rep of reps) {
        if (rep.name.toLowerCase().trim() === searchName) {
          return rep.name;
        }
      }

      // Try matching by first name only
      const searchFirstName = searchName.split(' ')[0];
      for (const rep of reps) {
        const repFirstName = rep.name.split(' ')[0].toLowerCase();
        if (repFirstName === searchFirstName) {
          return rep.name;
        }
      }

      // Try matching the part before a dash/hyphen
      if (searchName.includes('-')) {
        const beforeDash = searchName.split('-')[0].trim();
        for (const rep of reps) {
          const repFirstName = rep.name.split(' ')[0].toLowerCase();
          if (repFirstName === beforeDash) {
            return rep.name;
          }
        }
      }

      return null;
    }

    // Fetch contacts with REP field
    console.log('📋 Fetching contacts with REP field...');

    let offset = 0;
    const limit = 100;
    let hasMore = true;
    const repDistribution = new Map();

    while (hasMore) {
      const response = await fetch(
        `${AC_API_URL}/api/3/fieldValues?filters[fieldid]=16&limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: {
            'Api-Token': AC_API_KEY,
          },
        }
      );

      if (!response.ok) break;

      const data = await response.json();

      for (const fieldValue of data.fieldValues) {
        const repName = fieldValue.value?.trim();
        if (!repName) continue;

        const existing = repDistribution.get(repName) || { count: 0, mappedName: null };
        existing.count++;

        if (!existing.mappedName) {
          existing.mappedName = findMatchingRep(repName);
        }

        repDistribution.set(repName, existing);
      }

      offset += limit;
      hasMore = data.fieldValues.length === limit;
    }

    console.log(`✅ Found ${offset} contacts\n`);

    console.log('='.repeat(70));
    console.log('📊 Sync Preview - What Will Happen:\n');

    const sortedReps = Array.from(repDistribution.entries()).sort((a, b) => b[1].count - a[1].count);

    let willSync = 0;
    let willSkip = 0;

    for (const [repName, data] of sortedReps) {
      const status = data.mappedName ? '✅ WILL SYNC' : '⏭️  WILL SKIP';
      const mapping = data.mappedName && data.mappedName !== repName
        ? ` → "${data.mappedName}"`
        : data.mappedName
        ? ' (exact match)'
        : '';

      console.log(`   ${status}: "${repName}": ${data.count} lead(s)${mapping}`);

      if (data.mappedName) {
        willSync += data.count;
      } else {
        willSkip += data.count;
      }
    }

    console.log('');
    console.log('='.repeat(70));
    console.log('📈 Summary:');
    console.log(`   ✅ ${willSync} leads will be synced to Dynamics`);
    console.log(`   ⏭️  ${willSkip} leads will be skipped (no mapping)`);
    console.log(`   📊 ${willSync + willSkip} total leads processed`);
    console.log('='.repeat(70));

    if (willSkip > 0) {
      console.log('\n⚠️  Some leads will be skipped. Review the mappings above.');
      console.log('   If all looks good, run: node scripts/sync-aa-lead-owners.js');
    } else {
      console.log('\n✅ All leads can be synced!');
      console.log('   Ready to run: node scripts/sync-aa-lead-owners.js');
    }

    console.log('\n✨ Preview complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

previewSync();
