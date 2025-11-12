const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

/**
 * Script to sync A+A Tradeshow lead details from ActiveCampaign to Dynamics 365
 *
 * This script updates:
 * 1. Country (AC field 1) → address1_country
 * 2. Company (AC field 8) → companyname
 * 3. Comments (AC field 9) → description
 * 4. Topic/Subject → "A+A Tradeshow Lead - [Person's Name]"
 */

async function syncAALeadDetails() {
  console.log('🔄 Starting A+A Tradeshow lead details sync...\\n');

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
  console.log(`   DYNAMICS_INSTANCE_URL: ${D365_INSTANCE_URL || '❌ Missing'}\\n`);

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
    console.log('✅ Successfully obtained OAuth token\\n');

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

    console.log(`✅ Found ${contactIds.size} contacts with REP field populated\\n`);

    if (contactIds.size === 0) {
      console.log('✨ No contacts to process. Exiting.');
      return;
    }

    // Step 3: Process each contact
    console.log('3. Processing contacts and updating lead details...\\n');
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

        // Extract custom field values
        // Field 1 = Country, Field 8 = Company, Field 9 = Comments
        const countryField = contactData.fieldValues?.find(fv => fv.field === '1');
        const companyField = contactData.fieldValues?.find(fv => fv.field === '8');
        const commentsField = contactData.fieldValues?.find(fv => fv.field === '9');

        const country = countryField?.value?.trim();
        const company = companyField?.value?.trim();
        const comments = commentsField?.value?.trim();

        // Search for lead in Dynamics by email
        const leadSearchResponse = await fetch(
          `${D365_INSTANCE_URL}/api/data/v9.2/leads?$filter=emailaddress1 eq '${email}'&$select=leadid,fullname,companyname,address1_country,description,subject`,
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
        const fullName = lead.fullname;

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

        // Update subject/topic to "A+A Tradeshow Lead - [Person's Name]"
        const expectedSubject = `A+A Tradeshow Lead - ${fullName}`;
        if (lead.subject !== expectedSubject) {
          updatePayload.subject = expectedSubject;
          changes.push(`Topic: "${expectedSubject}"`);
        }

        // If no changes needed, skip
        if (changes.length === 0) {
          console.log(`   ✓  ${email} (${contact.firstName} ${contact.lastName}): All fields already up to date`);
          processed++;
          continue;
        }

        // Update lead in Dynamics
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
    console.log('\\n' + '='.repeat(60));
    console.log('📊 Sync Summary:');
    console.log(`   Total contacts processed: ${processed + skipped + errors}`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ✓  Already up to date: ${processed - updated}`);
    console.log(`   ⏭️  Skipped (not in Dynamics): ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('='.repeat(60));
    console.log('\\n✨ Sync completed!');

  } catch (error) {
    console.error('❌ Fatal error during sync:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the sync
syncAALeadDetails();
