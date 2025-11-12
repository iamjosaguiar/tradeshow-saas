const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

/**
 * Inspect a few A+A contacts to see what fields are populated
 */

async function inspectContacts() {
  console.log('🔍 Inspecting A+A Tradeshow contacts...\n');

  const AC_API_URL = process.env.ACTIVECAMPAIGN_API_URL;
  const AC_API_KEY = process.env.ACTIVECAMPAIGN_API_KEY;

  if (!AC_API_URL || !AC_API_KEY) {
    console.error('❌ Missing ActiveCampaign credentials');
    process.exit(1);
  }

  try {
    // Get contacts with A+A tag (tag ID 7)
    const contactTagsResponse = await fetch(
      `${AC_API_URL}/api/3/contactTags?filters[tagid]=7&limit=5`,
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
    console.log(`📋 Inspecting first ${contactIds.length} A+A contacts:\n`);

    // Field name mapping
    const fieldNames = {
      '1': 'Country',
      '2': 'State',
      '3': 'City',
      '4': 'Job Title',
      '5': 'Zip Code',
      '6': 'ms / mr',
      '7': 'Business Phone',
      '8': 'Company',
      '9': 'Comments',
      '10': 'Language Preference',
      '11': 'Current Respirator',
      '12': 'Work Environment',
      '13': 'Number of Staff',
      '14': 'Sales Rep',
      '15': 'Region',
      '16': 'REP',
      '17': 'Name Title',
      '18': 'Website',
      '19': 'Street Address',
      '20': 'Industry',
      '21': 'Language',
      '22': 'Area of responsibility',
      '23': 'account owner'
    };

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
        const contact = contactData.contact;

        console.log('='.repeat(70));
        console.log(`Contact: ${contact.firstName} ${contact.lastName} <${contact.email}>`);
        console.log('');
        console.log('Populated Custom Fields:');

        if (contactData.fieldValues && contactData.fieldValues.length > 0) {
          contactData.fieldValues.forEach(fv => {
            const fieldName = fieldNames[fv.field] || `Field ${fv.field}`;
            const value = fv.value || '(empty)';
            console.log(`   [${fv.field}] ${fieldName}: ${value}`);
          });
        } else {
          console.log('   (No custom fields populated)');
        }
        console.log('');
      }
    }

    console.log('='.repeat(70));
    console.log('\n✨ Inspection complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

inspectContacts();
