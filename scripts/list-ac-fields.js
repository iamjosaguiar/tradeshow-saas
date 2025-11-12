const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

/**
 * List all custom fields in ActiveCampaign
 */

async function listFields() {
  console.log('📋 Fetching ActiveCampaign custom fields...\n');

  const AC_API_URL = process.env.ACTIVECAMPAIGN_API_URL;
  const AC_API_KEY = process.env.ACTIVECAMPAIGN_API_KEY;

  if (!AC_API_URL || !AC_API_KEY) {
    console.error('❌ Missing ActiveCampaign credentials');
    process.exit(1);
  }

  try {
    const response = await fetch(`${AC_API_URL}/api/3/fields?limit=100`, {
      method: 'GET',
      headers: {
        'Api-Token': AC_API_KEY,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to fetch fields:', error);
      process.exit(1);
    }

    const data = await response.json();

    console.log(`✅ Found ${data.fields.length} custom fields:\n`);
    console.log('ID  | Field Name');
    console.log('----|-' + '-'.repeat(50));

    data.fields
      .sort((a, b) => parseInt(a.id) - parseInt(b.id))
      .forEach(field => {
        console.log(`${field.id.padStart(3)} | ${field.title}`);
      });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listFields();
