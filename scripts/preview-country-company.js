const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

/**
 * Preview country and company data from ActiveCampaign contacts
 */

async function previewCountryCompany() {
  console.log('🔍 Previewing country and company data from ActiveCampaign...\\n');

  const AC_API_URL = process.env.ACTIVECAMPAIGN_API_URL;
  const AC_API_KEY = process.env.ACTIVECAMPAIGN_API_KEY;

  if (!AC_API_URL || !AC_API_KEY) {
    console.error('❌ Missing ActiveCampaign credentials');
    process.exit(1);
  }

  try {
    // Fetch contacts with REP field populated (field ID 16)
    console.log('📋 Fetching contacts with REP field...');

    let offset = 0;
    const limit = 100;
    let hasMore = true;
    const contactIds = new Set();

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
        if (fieldValue.value && fieldValue.value.trim()) {
          contactIds.add(fieldValue.contact);
        }
      }

      offset += limit;
      hasMore = data.fieldValues.length === limit;
    }

    console.log(`✅ Found ${contactIds.size} contacts\\n`);

    // Sample first 10 contacts to see available data
    console.log('📊 Sampling first 10 contacts to see available data:\\n');
    console.log('='.repeat(80));

    let count = 0;
    for (const contactId of contactIds) {
      if (count >= 10) break;

      const contactResponse = await fetch(
        `${AC_API_URL}/api/3/contacts/${contactId}`,
        {
          method: 'GET',
          headers: {
            'Api-Token': AC_API_KEY,
          },
        }
      );

      if (!contactResponse.ok) continue;

      const contactData = await contactResponse.json();
      const contact = contactData.contact;

      console.log(`\\n${count + 1}. ${contact.firstName} ${contact.lastName} (${contact.email})`);
      console.log(`   Organization: ${contact.orgname || 'N/A'}`);
      console.log(`   Country: ${contact.country || 'N/A'}`);
      console.log(`   Account ID: ${contact.account || 'N/A'}`);

      // If account ID exists, fetch organization details
      if (contact.account && contact.account !== '0') {
        const accountResponse = await fetch(
          `${AC_API_URL}/api/3/accounts/${contact.account}`,
          {
            method: 'GET',
            headers: {
              'Api-Token': AC_API_KEY,
            },
          }
        );

        if (accountResponse.ok) {
          const accountData = await accountResponse.json();
          const account = accountData.account;
          console.log(`   Account Name: ${account.name || 'N/A'}`);
        }
      }

      count++;
    }

    console.log('\\n' + '='.repeat(80));

    // Now analyze all contacts to see data distribution
    console.log('\\n📈 Analyzing all contacts...\\n');

    let withCountry = 0;
    let withOrgname = 0;
    let withAccount = 0;
    let missingBoth = 0;

    const countryCounts = new Map();
    const orgnameSamples = [];

    for (const contactId of contactIds) {
      const contactResponse = await fetch(
        `${AC_API_URL}/api/3/contacts/${contactId}`,
        {
          method: 'GET',
          headers: {
            'Api-Token': AC_API_KEY,
          },
        }
      );

      if (!contactResponse.ok) continue;

      const contactData = await contactResponse.json();
      const contact = contactData.contact;

      const hasCountry = contact.country && contact.country.trim();
      const hasOrgname = contact.orgname && contact.orgname.trim();
      const hasAccount = contact.account && contact.account !== '0';

      if (hasCountry) {
        withCountry++;
        const country = contact.country.trim();
        countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
      }

      if (hasOrgname) {
        withOrgname++;
        if (orgnameSamples.length < 5) {
          orgnameSamples.push(contact.orgname);
        }
      }

      if (hasAccount) {
        withAccount++;
      }

      if (!hasCountry && !hasOrgname && !hasAccount) {
        missingBoth++;
      }
    }

    console.log('='.repeat(80));
    console.log('📊 Data Availability Summary:');
    console.log(`   Total contacts: ${contactIds.size}`);
    console.log(`   With country: ${withCountry} (${Math.round(withCountry / contactIds.size * 100)}%)`);
    console.log(`   With orgname: ${withOrgname} (${Math.round(withOrgname / contactIds.size * 100)}%)`);
    console.log(`   With account: ${withAccount} (${Math.round(withAccount / contactIds.size * 100)}%)`);
    console.log(`   Missing all: ${missingBoth}`);
    console.log('='.repeat(80));

    console.log('\\n📍 Country Distribution (top 10):');
    const sortedCountries = Array.from(countryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [country, count] of sortedCountries) {
      console.log(`   ${country}: ${count} contacts`);
    }

    console.log('\\n🏢 Sample Organization Names:');
    orgnameSamples.forEach((name, i) => {
      console.log(`   ${i + 1}. ${name}`);
    });

    console.log('\\n✨ Preview complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

previewCountryCompany();
