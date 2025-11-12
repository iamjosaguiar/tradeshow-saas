const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { neon } = require('@neondatabase/serverless');

/**
 * Script to sync A+A Tradeshow lead owners from ActiveCampaign to Dynamics 365
 *
 * This script:
 * 1. Fetches all contacts from ActiveCampaign with the A+A tag
 * 2. Gets the Sales Rep field value from each contact
 * 3. Maps the sales rep name to a Dynamics user ID from the database
 * 4. Finds the corresponding lead in Dynamics by email
 * 5. Updates the lead owner in Dynamics
 */

async function syncAALeadOwners() {
  console.log('🔄 Starting A+A Tradeshow lead owner sync...\n');

  // Check environment variables
  const AC_API_URL = process.env.ACTIVECAMPAIGN_API_URL;
  const AC_API_KEY = process.env.ACTIVECAMPAIGN_API_KEY;
  const D365_TENANT_ID = process.env.DYNAMICS_TENANT_ID;
  const D365_CLIENT_ID = process.env.DYNAMICS_CLIENT_ID;
  const D365_CLIENT_SECRET = process.env.DYNAMICS_CLIENT_SECRET;
  const D365_INSTANCE_URL = process.env.DYNAMICS_INSTANCE_URL;
  const DATABASE_URL = process.env.DATABASE_URL;

  console.log('Checking environment variables:');
  console.log(`   ACTIVECAMPAIGN_API_URL: ${AC_API_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`   ACTIVECAMPAIGN_API_KEY: ${AC_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   DYNAMICS_TENANT_ID: ${D365_TENANT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`   DYNAMICS_CLIENT_ID: ${D365_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`   DYNAMICS_CLIENT_SECRET: ${D365_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`   DYNAMICS_INSTANCE_URL: ${D365_INSTANCE_URL || '❌ Missing'}`);
  console.log(`   DATABASE_URL: ${DATABASE_URL ? '✅ Set' : '❌ Missing'}\n`);

  if (!AC_API_URL || !AC_API_KEY || !D365_TENANT_ID || !D365_CLIENT_ID ||
      !D365_CLIENT_SECRET || !D365_INSTANCE_URL || !DATABASE_URL) {
    console.error('❌ One or more required credentials are missing');
    process.exit(1);
  }

  try {
    // Initialize database connection
    const sql = neon(DATABASE_URL);

    // Step 1: Get OAuth token for Dynamics 365
    console.log('1. Getting OAuth token from Azure AD...');
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${D365_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: D365_CLIENT_ID,
          client_secret: D365_CLIENT_SECRET,
          scope: `${D365_INSTANCE_URL}/.default`,
          grant_type: 'client_credentials',
        }),
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('❌ Failed to get OAuth token:', error);
      process.exit(1);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('✅ Successfully obtained OAuth token\n');

    // Step 2: Fetch contacts from ActiveCampaign with REP field populated (field ID 16)
    console.log('2. Fetching contacts with REP field populated from ActiveCampaign...');

    let offset = 0;
    const limit = 100;
    let hasMore = true;
    const contactIds = new Set();

    while (hasMore) {
      const fieldValuesResponse = await fetch(
        `${AC_API_URL}/api/3/fieldValues?filters[fieldid]=16&limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: {
            'Api-Token': AC_API_KEY,
          },
        }
      );

      if (!fieldValuesResponse.ok) {
        const error = await fieldValuesResponse.text();
        console.error('❌ Failed to fetch field values:', error);
        process.exit(1);
      }

      const fieldValuesData = await fieldValuesResponse.json();

      for (const fieldValue of fieldValuesData.fieldValues) {
        if (fieldValue.value && fieldValue.value.trim()) {
          contactIds.add(fieldValue.contact);
        }
      }

      offset += limit;
      hasMore = fieldValuesData.fieldValues.length === limit;

      if (hasMore) {
        console.log(`   Fetched ${offset} field values, continuing...`);
      }
    }

    console.log(`✅ Found ${contactIds.size} contacts with REP field populated\n`);

    if (contactIds.size === 0) {
      console.log('✨ No contacts to process. Exiting.');
      return;
    }

    // Step 3: Build rep name to Dynamics user ID mapping from database
    console.log('3. Building sales rep to Dynamics user ID mapping...');
    const reps = await sql`
      SELECT name, dynamics_user_id
      FROM users
      WHERE dynamics_user_id IS NOT NULL AND role IN ('rep', 'admin')
    `;

    console.log(`✅ Found ${reps.length} reps with Dynamics user IDs mapped:`);
    reps.forEach(rep => {
      console.log(`   - ${rep.name} → ${rep.dynamics_user_id}`);
    });
    console.log('');

    /**
     * Smart name matching function
     * Handles variations like "Malina - English" matching to "Malina Fontaine"
     * and special cases like "JB/Gabrielle" → "Jean-Baptiste Bourdeau"
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

      // Check for special mappings first
      if (specialMappings[searchName]) {
        const mappedName = specialMappings[searchName];
        const rep = reps.find(r => r.name === mappedName);
        if (rep) {
          return { name: rep.name, id: rep.dynamics_user_id };
        }
      }

      // Handle Malina variations (Malina - English, Malina - Spanish, Malina -ENGLISH, etc.)
      if (searchName.startsWith('malina')) {
        const rep = reps.find(r => r.name === 'Malina Fontaine');
        if (rep) {
          return { name: rep.name, id: rep.dynamics_user_id };
        }
      }

      // Try exact match
      for (const rep of reps) {
        if (rep.name.toLowerCase().trim() === searchName) {
          return { name: rep.name, id: rep.dynamics_user_id };
        }
      }

      // Try matching by first name only
      // "Patrick" → "Patrick Poetsch", "Greg" → "Greg Sesny"
      const searchFirstName = searchName.split(' ')[0];
      for (const rep of reps) {
        const repFirstName = rep.name.split(' ')[0].toLowerCase();
        if (repFirstName === searchFirstName) {
          return { name: rep.name, id: rep.dynamics_user_id };
        }
      }

      // Try matching the part before a dash/hyphen
      // "Malina - English" → "Malina"
      if (searchName.includes('-')) {
        const beforeDash = searchName.split('-')[0].trim();
        for (const rep of reps) {
          const repFirstName = rep.name.split(' ')[0].toLowerCase();
          if (repFirstName === beforeDash) {
            return { name: rep.name, id: rep.dynamics_user_id };
          }
        }
      }

      // Try partial matching - if database name is contained in AC name
      for (const rep of reps) {
        const repNameLower = rep.name.toLowerCase().trim();
        if (searchName.includes(repNameLower)) {
          return { name: rep.name, id: rep.dynamics_user_id };
        }
      }

      // Try reverse - if AC name is contained in database name
      for (const rep of reps) {
        const repNameLower = rep.name.toLowerCase().trim();
        if (repNameLower.includes(searchName)) {
          return { name: rep.name, id: rep.dynamics_user_id };
        }
      }

      return null;
    }

    // Step 4: Process each contact
    console.log('4. Processing contacts and updating lead owners...\n');
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const contactId of contactIds) {
      try {
        // Fetch full contact details including field values
        const contactResponse = await fetch(
          `${AC_API_URL}/api/3/contacts/${contactId}?include=fieldValues`,
          {
            method: 'GET',
            headers: {
              'Api-Token': AC_API_KEY,
            },
          }
        );

        if (!contactResponse.ok) {
          console.error(`   ❌ Failed to fetch contact ${contactId}`);
          errors++;
          continue;
        }

        const contactData = await contactResponse.json();
        const contact = contactData.contact;
        const email = contact.email;

        // Find the REP field (field ID 16, not 14 which is "Sales Rep")
        const salesRepField = contactData.fieldValues?.find(fv => fv.field === '16');
        const salesRepName = salesRepField?.value?.trim();

        if (!salesRepName) {
          console.log(`   ⏭️  ${email}: No sales rep assigned in ActiveCampaign`);
          skipped++;
          continue;
        }

        // Find matching Dynamics user ID using smart matching
        const matchedRep = findMatchingRep(salesRepName);

        if (!matchedRep) {
          console.log(`   ⚠️  ${email}: Sales rep "${salesRepName}" not found in database or no Dynamics user ID`);
          skipped++;
          continue;
        }

        const dynamicsUserId = matchedRep.id;
        const mappedRepName = matchedRep.name;

        // Search for lead in Dynamics by email
        const leadSearchResponse = await fetch(
          `${D365_INSTANCE_URL}/api/data/v9.2/leads?$filter=emailaddress1 eq '${email}'&$select=leadid,fullname,_ownerid_value`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
              'OData-MaxVersion': '4.0',
              'OData-Version': '4.0',
            },
          }
        );

        if (!leadSearchResponse.ok) {
          console.error(`   ❌ ${email}: Failed to search for lead in Dynamics`);
          errors++;
          continue;
        }

        const leadSearchData = await leadSearchResponse.json();

        if (leadSearchData.value.length === 0) {
          console.log(`   ⏭️  ${email}: Lead not found in Dynamics`);
          skipped++;
          continue;
        }

        const lead = leadSearchData.value[0];
        const leadId = lead.leadid;
        const currentOwnerId = lead._ownerid_value;

        // Check if owner is already correct
        if (currentOwnerId === dynamicsUserId) {
          const displayName = salesRepName === mappedRepName
            ? mappedRepName
            : `${mappedRepName} (from "${salesRepName}")`;
          console.log(`   ✓  ${email} (${contact.firstName} ${contact.lastName}): Owner already correct (${displayName})`);
          processed++;
          continue;
        }

        // Update lead owner in Dynamics
        const updateResponse = await fetch(
          `${D365_INSTANCE_URL}/api/data/v9.2/leads(${leadId})`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'OData-MaxVersion': '4.0',
              'OData-Version': '4.0',
            },
            body: JSON.stringify({
              'ownerid@odata.bind': `/systemusers(${dynamicsUserId})`
            }),
          }
        );

        if (updateResponse.ok) {
          const displayName = salesRepName === mappedRepName
            ? mappedRepName
            : `${mappedRepName} (AC: "${salesRepName}")`;
          console.log(`   ✅ ${email} (${contact.firstName} ${contact.lastName}): Updated owner to ${displayName}`);
          updated++;
        } else {
          const errorText = await updateResponse.text();
          console.error(`   ❌ ${email}: Failed to update owner - ${errorText}`);
          errors++;
        }

        processed++;

      } catch (error) {
        console.error(`   ❌ Error processing contact ${contactId}:`, error.message);
        errors++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Sync Summary:');
    console.log(`   Total contacts processed: ${processed + skipped + errors}`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ✓  Already correct: ${processed - updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('='.repeat(60));
    console.log('\n✨ Sync completed!');

  } catch (error) {
    console.error('❌ Fatal error during sync:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the sync
syncAALeadOwners();
