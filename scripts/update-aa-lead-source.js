const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { neon } = require('@neondatabase/serverless');

/**
 * Script to update lead source to "Trade Show" for A+A contacts
 *
 * This script:
 * 1. Fetches all contacts from ActiveCampaign with REP field populated
 * 2. Finds corresponding leads in Dynamics by email
 * 3. Updates the lead source to "Trade Show" (leadsourcecode = 11)
 */

async function updateLeadSource() {
  console.log('🔄 Starting lead source update to "Trade Show"...\n');

  // Check environment variables
  const AC_API_URL = process.env.ACTIVECAMPAIGN_API_URL;
  const AC_API_KEY = process.env.ACTIVECAMPAIGN_API_KEY;
  const D365_TENANT_ID = process.env.DYNAMICS_TENANT_ID;
  const D365_CLIENT_ID = process.env.DYNAMICS_CLIENT_ID;
  const D365_CLIENT_SECRET = process.env.DYNAMICS_CLIENT_SECRET;
  const D365_INSTANCE_URL = process.env.DYNAMICS_INSTANCE_URL;

  console.log('Checking environment variables:');
  console.log(`   ACTIVECAMPAIGN_API_URL: ${AC_API_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`   ACTIVECAMPAIGN_API_KEY: ${AC_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   DYNAMICS_TENANT_ID: ${D365_TENANT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`   DYNAMICS_CLIENT_ID: ${D365_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`   DYNAMICS_CLIENT_SECRET: ${D365_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`   DYNAMICS_INSTANCE_URL: ${D365_INSTANCE_URL || '❌ Missing'}\n`);

  if (!AC_API_URL || !AC_API_KEY || !D365_TENANT_ID || !D365_CLIENT_ID ||
      !D365_CLIENT_SECRET || !D365_INSTANCE_URL) {
    console.error('❌ One or more required credentials are missing');
    process.exit(1);
  }

  try {
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

    // Step 3: Process each contact and update lead source
    console.log('3. Processing contacts and updating lead source to "Trade Show"...\n');
    let processed = 0;
    let updated = 0;
    let alreadyCorrect = 0;
    let notFound = 0;
    let errors = 0;

    for (const contactId of contactIds) {
      try {
        // Fetch contact email
        const contactResponse = await fetch(
          `${AC_API_URL}/api/3/contacts/${contactId}`,
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

        // Search for lead in Dynamics by email
        const leadSearchResponse = await fetch(
          `${D365_INSTANCE_URL}/api/data/v9.2/leads?$filter=emailaddress1 eq '${email}'&$select=leadid,fullname,leadsourcecode`,
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
          notFound++;
          continue;
        }

        const lead = leadSearchData.value[0];
        const leadId = lead.leadid;
        const currentLeadSource = lead.leadsourcecode;

        // Check if lead source is already "Trade Show" (code 7)
        if (currentLeadSource === 7) {
          console.log(`   ✓  ${email} (${contact.firstName} ${contact.lastName}): Lead source already "Trade Show"`);
          alreadyCorrect++;
          processed++;
          continue;
        }

        // Update lead source to "Trade Show" (leadsourcecode = 7)
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
              leadsourcecode: 7  // Trade Show
            }),
          }
        );

        if (updateResponse.ok) {
          console.log(`   ✅ ${email} (${contact.firstName} ${contact.lastName}): Updated lead source to "Trade Show"`);
          updated++;
        } else {
          const errorText = await updateResponse.text();
          console.error(`   ❌ ${email}: Failed to update lead source - ${errorText}`);
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
    console.log('📊 Update Summary:');
    console.log(`   Total contacts checked: ${processed + notFound + errors}`);
    console.log(`   ✅ Updated to "Trade Show": ${updated}`);
    console.log(`   ✓  Already "Trade Show": ${alreadyCorrect}`);
    console.log(`   ⏭️  Not found in Dynamics: ${notFound}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('='.repeat(60));
    console.log('\n✨ Lead source update completed!');

  } catch (error) {
    console.error('❌ Fatal error during update:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the update
updateLeadSource();
