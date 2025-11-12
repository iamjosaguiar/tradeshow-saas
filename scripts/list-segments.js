const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

/**
 * List all segments in ActiveCampaign to find the A+A Tradeshow segment ID
 */

async function listSegments() {
  console.log('📋 Fetching ActiveCampaign segments...\n');

  const AC_API_URL = process.env.ACTIVECAMPAIGN_API_URL;
  const AC_API_KEY = process.env.ACTIVECAMPAIGN_API_KEY;

  if (!AC_API_URL || !AC_API_KEY) {
    console.error('❌ Missing ActiveCampaign credentials');
    process.exit(1);
  }

  try {
    const response = await fetch(`${AC_API_URL}/api/3/segments?limit=100`, {
      method: 'GET',
      headers: {
        'Api-Token': AC_API_KEY,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to fetch segments:', error);
      process.exit(1);
    }

    const data = await response.json();

    console.log(`✅ Found ${data.segments.length} segments:\n`);
    console.log('ID   | Segment Name');
    console.log('-----|-' + '-'.repeat(50));

    data.segments
      .sort((a, b) => parseInt(a.id) - parseInt(b.id))
      .forEach(segment => {
        console.log(`${segment.id.padStart(4)} | ${segment.name}`);
      });

    console.log('\n');

    // Look for A+A segment
    const aaSegment = data.segments.find(s => s.name.toLowerCase().includes('a+a'));
    if (aaSegment) {
      console.log(`✨ Found A+A segment: "${aaSegment.name}" (ID: ${aaSegment.id})`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listSegments();
