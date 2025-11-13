const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { getTradeshowCredentials, closePool } = require('../lib/credentials');

/**
 * Script to sync tradeshow lead details from ActiveCampaign to Dynamics 365
 *
 * Usage:
 *   node scripts/sync-tradeshow-leads.js <tradeshow-slug-or-id>
 *
 * Examples:
 *   node scripts/sync-tradeshow-leads.js aa-2024
 *   node scripts/sync-tradeshow-leads.js 1
 *
 * This script updates:
 * 1. Country (AC field) → address1_country
 * 2. Company (AC field) → companyname
 * 3. Comments (AC field) → description
 * 4. Topic/Subject → Configured lead topic format
 */

async function syncTradeshowLeads(tradeshowIdentifier) {
  console.log(`🔄 Starting tradeshow lead sync for: ${tradeshowIdentifier}\n`);

  try {
    // Step 1: Load credentials from database
    console.log('1. Loading tradeshow credentials from database...');
    const config = await getTradeshowCredentials(tradeshowIdentifier);

    console.log(`✅ Loaded credentials for: ${config.tradeshowName}`);
    console.log(`   Tradeshow: ${config.tradeshowName} (${config.tradeshowSlug})`);
    console.log(`   Lead Topic: "${config.leadTopic}"`);
    console.log(`   ActiveCampaign: ${config.activeCampaign.apiUrl}`);
    console.log(`   Dynamics 365: ${config.dynamics365.instanceUrl}\n`);

    // Step 2: Get OAuth token for Dynamics 365
    console.log('2. Getting OAuth token from Azure AD...');
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${config.dynamics365.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.dynamics365.clientId,
          client_secret: config.dynamics365.clientSecret,
          scope: `${config.dynamics365.instanceUrl}/.default`,
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

    // Step 3: Fetch contacts from ActiveCampaign with REP field populated
    console.log('3. Fetching contacts with REP field populated from ActiveCampaign...');

    let offset = 0;
    const limit = 100;
    let hasMore = true;
    const contactIds = new Set();

    while (hasMore) {
      const fieldValuesResponse = await fetch(
        `${config.activeCampaign.apiUrl}/api/3/fieldValues?filters[fieldid]=${config.activeCampaign.fieldIds.rep}&limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: {
            'Api-Token': config.activeCampaign.apiKey,
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
      await closePool();
      return;
    }

    // Step 4: Process each contact
    console.log('4. Processing contacts and updating lead details...\n');
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const contactId of contactIds) {
      try {
        // Fetch full contact details including field values
        const contactResponse = await fetch(
          `${config.activeCampaign.apiUrl}/api/3/contacts/${contactId}?include=fieldValues`,
          {
            method: 'GET',
            headers: {
              'Api-Token': config.activeCampaign.apiKey,
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

        // Extract custom field values using configured field IDs
        const countryField = contactData.fieldValues?.find(
          fv => fv.field === config.activeCampaign.fieldIds.country
        );
        const companyField = contactData.fieldValues?.find(
          fv => fv.field === config.activeCampaign.fieldIds.company
        );
        const commentsField = contactData.fieldValues?.find(
          fv => fv.field === config.activeCampaign.fieldIds.comments
        );

        const country = countryField?.value?.trim();
        const company = companyField?.value?.trim();
        const comments = commentsField?.value?.trim();

        // Search for lead in Dynamics by email
        const leadSearchResponse = await fetch(
          `${config.dynamics365.instanceUrl}/api/data/v9.2/leads?$filter=emailaddress1 eq '${email}'&$select=leadid,fullname,companyname,address1_country,description,subject`,
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

        // Build update payload
        const updatePayload = {};
        const changes = [];

        // Update country if available
        if (country && lead.address1_country !== country) {
          updatePayload.address1_country = country;
          changes.push(`Country: "${country}"`);
        }

        // Update company if available
        if (company && lead.companyname !== company) {
          updatePayload.companyname = company;
          changes.push(`Company: "${company}"`);
        }

        // Update description (comments) if available
        if (comments && lead.description !== comments) {
          updatePayload.description = comments;
          changes.push(`Description: "${comments.substring(0, 50)}${comments.length > 50 ? '...' : ''}"`);
        }

        // Update subject/topic using configured format
        if (lead.subject !== config.leadTopic) {
          updatePayload.subject = config.leadTopic;
          changes.push(`Topic: "${config.leadTopic}"`);
        }

        // If no changes needed, skip
        if (changes.length === 0) {
          console.log(`   ✓  ${email} (${contact.firstName} ${contact.lastName}): All fields already up to date`);
          processed++;
          continue;
        }

        // Update lead in Dynamics
        const updateResponse = await fetch(
          `${config.dynamics365.instanceUrl}/api/data/v9.2/leads(${leadId})`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'OData-MaxVersion': '4.0',
              'OData-Version': '4.0',
            },
            body: JSON.stringify(updatePayload),
          }
        );

        if (updateResponse.ok) {
          console.log(`   ✅ ${email} (${contact.firstName} ${contact.lastName}): Updated ${changes.join(', ')}`);
          updated++;
        } else {
          const errorText = await updateResponse.text();
          console.error(`   ❌ ${email}: Failed to update - ${errorText}`);
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
    console.log(`   Tradeshow: ${config.tradeshowName}`);
    console.log(`   Total contacts processed: ${processed + skipped + errors}`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ✓  Already up to date: ${processed - updated}`);
    console.log(`   ⏭️  Skipped (not in Dynamics): ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('='.repeat(60));
    console.log('\n✨ Sync completed!');

  } catch (error) {
    console.error('❌ Fatal error during sync:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Close database connection
    await closePool();
  }
}

// Get tradeshow identifier from command line arguments
const tradeshowIdentifier = process.argv[2];

if (!tradeshowIdentifier) {
  console.error('❌ Usage: node scripts/sync-tradeshow-leads.js <tradeshow-slug-or-id>');
  console.error('   Example: node scripts/sync-tradeshow-leads.js aa-2024');
  process.exit(1);
}

// Run the sync
syncTradeshowLeads(tradeshowIdentifier);
