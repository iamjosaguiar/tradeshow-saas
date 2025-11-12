const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });
const { neon } = require('@neondatabase/serverless');

/**
 * Preview script to check sales rep field values from ActiveCampaign
 * and compare with database rep names
 */

async function previewSalesReps() {
  console.log('🔍 Previewing A+A Tradeshow sales rep assignments...\n');

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
    console.log('📋 Sales reps in database with Dynamics user IDs:');
    const reps = await sql`
      SELECT name, dynamics_user_id, email
      FROM users
      WHERE dynamics_user_id IS NOT NULL AND role IN ('rep', 'admin')
      ORDER BY name
    `;

    reps.forEach(rep => {
      console.log(`   ✓ ${rep.name} (${rep.email})`);
    });
    console.log('');

    /**
     * Smart name matching function (same as sync script)
     * Handles variations like "Malina - English" matching to "Malina"
     */
    function findMatchingRep(salesRepName) {
      if (!salesRepName) return null;

      const searchName = salesRepName.toLowerCase().trim();

      // Try exact match first
      for (const rep of reps) {
        if (rep.name.toLowerCase().trim() === searchName) {
          return rep.name;
        }
      }

      // Try matching the part before a dash/hyphen
      if (searchName.includes('-')) {
        const beforeDash = searchName.split('-')[0].trim();
        for (const rep of reps) {
          if (rep.name.toLowerCase().trim() === beforeDash) {
            return rep.name;
          }
        }
      }

      // Try partial matching - if database name is contained in AC name
      for (const rep of reps) {
        const repNameLower = rep.name.toLowerCase().trim();
        if (searchName.includes(repNameLower)) {
          return rep.name;
        }
      }

      // Try reverse - if AC name is contained in database name
      for (const rep of reps) {
        const repNameLower = rep.name.toLowerCase().trim();
        if (repNameLower.includes(searchName)) {
          return rep.name;
        }
      }

      return null;
    }

    // Get contacts from ActiveCampaign with A+A tag
    console.log('📋 Fetching A+A contacts from ActiveCampaign...');
    const contactTagsResponse = await fetch(
      `${AC_API_URL}/api/3/contactTags?filters[tagid]=7&limit=100`,
      {
        method: 'GET',
        headers: {
          'Api-Token': AC_API_KEY,
        },
      }
    );

    if (!contactTagsResponse.ok) {
      console.error('❌ Failed to fetch contacts');
      process.exit(1);
    }

    const contactTagsData = await contactTagsResponse.json();
    const contactIds = contactTagsData.contactTags.map(ct => ct.contact);
    console.log(`✅ Found ${contactIds.length} A+A contacts\n`);

    // Collect unique sales rep values
    const salesRepValues = new Map();  // rep name -> {count, mappedName}
    const unmatchedReps = new Set();
    let noRepCount = 0;

    console.log('📋 Analyzing sales rep assignments...');
    for (const contactId of contactIds) {
      const contactResponse = await fetch(
        `${AC_API_URL}/api/3/contacts/${contactId}?include=fieldValues`,
        {
          method: 'GET',
          headers: {
            'Api-Token': AC_API_KEY,
          },
        }
      );

      if (contactResponse.ok) {
        const contactData = await contactResponse.json();
        // Field 16 is "REP" (not field 14 which is "Sales Rep")
        const salesRepField = contactData.fieldValues?.find(fv => fv.field === '16');
        const salesRepName = salesRepField?.value?.trim();

        if (salesRepName) {
          const existing = salesRepValues.get(salesRepName) || { count: 0, mappedName: null };
          existing.count++;

          // Check if rep matches database using smart matching
          const matchedName = findMatchingRep(salesRepName);
          existing.mappedName = matchedName;

          salesRepValues.set(salesRepName, existing);

          if (!matchedName) {
            unmatchedReps.add(salesRepName);
          }
        } else {
          noRepCount++;
        }
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('📊 Sales Rep Distribution:');
    console.log('');

    // Sort by count descending
    const sortedReps = Array.from(salesRepValues.entries()).sort((a, b) => b[1].count - a[1].count);

    for (const [repName, data] of sortedReps) {
      const matched = data.mappedName ? '✅' : '⚠️ ';
      const mapping = data.mappedName && data.mappedName !== repName
        ? ` → maps to "${data.mappedName}"`
        : '';
      console.log(`   ${matched} "${repName}": ${data.count} lead(s)${mapping}`);
    }

    if (noRepCount > 0) {
      console.log(`   ⚠️  No sales rep assigned: ${noRepCount} lead(s)`);
    }

    console.log('');
    console.log('='.repeat(60));

    if (unmatchedReps.size > 0) {
      console.log('\n⚠️  Sales reps in ActiveCampaign NOT found in database:');
      unmatchedReps.forEach(rep => {
        console.log(`   - "${rep}"`);
      });
      console.log('\nThese leads will be skipped during sync.');
      console.log('You may need to:');
      console.log('   1. Create these reps in the database with Dynamics user IDs, OR');
      console.log('   2. Update the sales rep names in ActiveCampaign to match existing reps');
    } else {
      console.log('\n✅ All sales rep names in ActiveCampaign can be matched to database records!');
      console.log('   Review the mappings above to ensure they look correct.');
      console.log('   If everything looks good, you can proceed with running sync-aa-lead-owners.js');
    }

    console.log('\n✨ Preview complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

previewSalesReps();
