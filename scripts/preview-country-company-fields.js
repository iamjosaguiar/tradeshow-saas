const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

/**
 * Preview country and company data from ActiveCampaign custom fields
 */

async function previewCountryCompanyFields() {
  console.log('🔍 Previewing country and company from custom fields...\\n');

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
        `${AC_API_URL}/api/3/contacts/${contactId}?include=fieldValues`,
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

      // Find Country (field 1) and Company (field 8) from fieldValues
      const countryField = contactData.fieldValues?.find(fv => fv.field === '1');
      const companyField = contactData.fieldValues?.find(fv => fv.field === '8');

      const country = countryField?.value?.trim() || 'N/A';
      const company = companyField?.value?.trim() || 'N/A';

      console.log(`\\n${count + 1}. ${contact.firstName} ${contact.lastName} (${contact.email})`);
      console.log(`   Country: ${country}`);
      console.log(`   Company: ${company}`);

      count++;
    }

    console.log('\\n' + '='.repeat(80));

    // Now analyze all contacts to see data distribution
    console.log('\\n📈 Analyzing all contacts...\\n');

    let withCountry = 0;
    let withCompany = 0;
    let withBoth = 0;
    let missingBoth = 0;

    const countryCounts = new Map();
    const companySamples = [];

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

      if (!contactResponse.ok) continue;

      const contactData = await contactResponse.json();

      // Find Country (field 1) and Company (field 8) from fieldValues
      const countryField = contactData.fieldValues?.find(fv => fv.field === '1');
      const companyField = contactData.fieldValues?.find(fv => fv.field === '8');

      const country = countryField?.value?.trim();
      const company = companyField?.value?.trim();

      const hasCountry = country && country.length > 0;
      const hasCompany = company && company.length > 0;

      if (hasCountry) {
        withCountry++;
        countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
      }

      if (hasCompany) {
        withCompany++;
        if (companySamples.length < 10) {
          companySamples.push(company);
        }
      }

      if (hasCountry && hasCompany) {
        withBoth++;
      }

      if (!hasCountry && !hasCompany) {
        missingBoth++;
      }
    }

    console.log('='.repeat(80));
    console.log('📊 Data Availability Summary:');
    console.log(`   Total contacts: ${contactIds.size}`);
    console.log(`   With country: ${withCountry} (${Math.round(withCountry / contactIds.size * 100)}%)`);
    console.log(`   With company: ${withCompany} (${Math.round(withCompany / contactIds.size * 100)}%)`);
    console.log(`   With both: ${withBoth} (${Math.round(withBoth / contactIds.size * 100)}%)`);
    console.log(`   Missing both: ${missingBoth} (${Math.round(missingBoth / contactIds.size * 100)}%)`);
    console.log('='.repeat(80));

    console.log('\\n📍 Country Distribution (top 15):');
    const sortedCountries = Array.from(countryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    for (const [country, count] of sortedCountries) {
      console.log(`   ${country}: ${count} contacts`);
    }

    console.log('\\n🏢 Sample Company Names:');
    companySamples.forEach((name, i) => {
      console.log(`   ${i + 1}. ${name}`);
    });

    console.log('\\n✨ Preview complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

previewCountryCompanyFields();
