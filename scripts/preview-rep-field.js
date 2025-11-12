const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });
const { neon } = require('@neondatabase/serverless');

/**
 * Preview all contacts with REP field populated
 */

async function previewRepField() {
  console.log('🔍 Searching for contacts with REP field populated...\n');

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
     * Smart name matching function
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

      // Try partial matching
      for (const rep of reps) {
        const repNameLower = rep.name.toLowerCase().trim();
        if (searchName.includes(repNameLower)) {
          return rep.name;
        }
      }

      // Try reverse
      for (const rep of reps) {
        const repNameLower = rep.name.toLowerCase().trim();
        if (repNameLower.includes(searchName)) {
          return rep.name;
        }
      }

      return null;
    }

    // Search for field values in field 16 (REP)
    console.log('📋 Fetching contacts with REP field (field 16) populated...');

    let offset = 0;
    const limit = 100;
    let hasMore = true;
    const repDistribution = new Map(); // rep name -> {count, mappedName, contacts: []}

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

      if (!response.ok) {
        console.error('❌ Failed to fetch field values');
        break;
      }

      const data = await response.json();

      for (const fieldValue of data.fieldValues) {
        const repName = fieldValue.value?.trim();
        if (!repName) continue;

        const contactId = fieldValue.contact;

        // Get contact details
        const contactResponse = await fetch(
          `${AC_API_URL}/api/3/contacts/${contactId}`,
          {
            method: 'GET',
            headers: {
              'Api-Token': AC_API_KEY,
            },
          }
        );

        if (contactResponse.ok) {
          const contactData = await contactResponse.json();
          const contact = contactData.contact;

          const existing = repDistribution.get(repName) || {
            count: 0,
            mappedName: null,
            contacts: []
          };

          existing.count++;
          existing.contacts.push({
            name: `${contact.firstName} ${contact.lastName}`,
            email: contact.email
          });

          if (!existing.mappedName) {
            existing.mappedName = findMatchingRep(repName);
          }

          repDistribution.set(repName, existing);
        }
      }

      offset += limit;
      hasMore = data.fieldValues.length === limit;

      if (hasMore) {
        console.log(`   Fetched ${offset} field values, continuing...`);
      }
    }

    console.log(`✅ Found ${offset} contacts with REP field populated\n`);

    console.log('='.repeat(70));
    console.log('📊 REP Field Distribution:');
    console.log('');

    const sortedReps = Array.from(repDistribution.entries()).sort((a, b) => b[1].count - a[1].count);

    for (const [repName, data] of sortedReps) {
      const matched = data.mappedName ? '✅' : '⚠️ ';
      const mapping = data.mappedName && data.mappedName !== repName
        ? ` → maps to "${data.mappedName}"`
        : '';
      console.log(`   ${matched} "${repName}": ${data.count} contact(s)${mapping}`);

      // Show first 3 contacts as examples
      const examples = data.contacts.slice(0, 3);
      examples.forEach(contact => {
        console.log(`      - ${contact.name} <${contact.email}>`);
      });
      if (data.contacts.length > 3) {
        console.log(`      ... and ${data.contacts.length - 3} more`);
      }
      console.log('');
    }

    console.log('='.repeat(70));

    const unmatchedReps = sortedReps.filter(([_, data]) => !data.mappedName);

    if (unmatchedReps.length > 0) {
      console.log('\n⚠️  REP values NOT found in database:');
      unmatchedReps.forEach(([repName, data]) => {
        console.log(`   - "${repName}" (${data.count} contacts)`);
      });
      console.log('\nThese contacts will be skipped during sync.');
    } else {
      console.log('\n✅ All REP values can be matched to database records!');
      console.log('   If this looks correct, you can proceed with the sync.');
    }

    console.log('\n✨ Preview complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

previewRepField();
