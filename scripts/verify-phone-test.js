const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const testEmail = 'test-phone-field@example.com';
const expectedPhone = '+49 211 123-4567';

console.log('🔍 Verifying Phone Field Test Lead...\n');

(async () => {
  const sql = neon(process.env.DATABASE_URL);

  // 1. CHECK DATABASE
  console.log('1️⃣ CHECKING DATABASE...');
  console.log('─'.repeat(80));

  try {
    const dbLead = await sql`
      SELECT
        bp.id,
        bp.contact_email,
        bp.contact_name,
        bp.uploaded_at,
        u.name as rep_name,
        u.dynamics_user_id
      FROM badge_photos bp
      LEFT JOIN users u ON bp.submitted_by_rep = u.id
      WHERE bp.contact_email = ${testEmail}
      ORDER BY bp.uploaded_at DESC
      LIMIT 1
    `;

    if (dbLead.length > 0) {
      const lead = dbLead[0];
      console.log('✅ FOUND IN DATABASE');
      console.log(`   Name: ${lead.contact_name}`);
      console.log(`   Email: ${lead.contact_email}`);
      console.log(`   Rep: ${lead.rep_name}`);
      console.log(`   Submitted: ${new Date(lead.uploaded_at).toLocaleString()}`);
      console.log(`   Dynamics User ID: ${lead.dynamics_user_id || 'Not assigned'}\n`);
    } else {
      console.log('❌ NOT FOUND IN DATABASE');
      return;
    }
  } catch (error) {
    console.error('❌ Database Error:', error.message);
    return;
  }

  // 2. CHECK ACTIVECAMPAIGN
  console.log('2️⃣ CHECKING ACTIVECAMPAIGN...');
  console.log('─'.repeat(80));

  const AC_API_URL = process.env.ACTIVECAMPAIGN_API_URL;
  const AC_API_KEY = process.env.ACTIVECAMPAIGN_API_KEY;

  if (!AC_API_URL || !AC_API_KEY) {
    console.log('⚠️  ActiveCampaign credentials not configured');
  } else {
    try {
      const acResponse = await fetch(
        `${AC_API_URL}/api/3/contacts?email=${encodeURIComponent(testEmail)}`,
        {
          headers: {
            'Api-Token': AC_API_KEY,
          },
        }
      );

      if (acResponse.ok) {
        const acData = await acResponse.json();
        if (acData.contacts && acData.contacts.length > 0) {
          const contact = acData.contacts[0];
          console.log('✅ FOUND IN ACTIVECAMPAIGN');
          console.log(`   Contact ID: ${contact.id}`);
          console.log(`   Name: ${contact.firstName} ${contact.lastName}`);
          console.log(`   Email: ${contact.email}`);
          console.log(`   Phone: ${contact.phone || 'Not set'}`);

          if (contact.phone === expectedPhone) {
            console.log('   ✅ PHONE NUMBER MATCHES!\n');
          } else {
            console.log(`   ⚠️  Phone mismatch!`);
            console.log(`   Expected: ${expectedPhone}`);
            console.log(`   Got: ${contact.phone}\n`);
          }
        } else {
          console.log('❌ NOT FOUND IN ACTIVECAMPAIGN\n');
        }
      } else {
        console.log(`❌ ActiveCampaign API Error: ${acResponse.status}\n`);
      }
    } catch (error) {
      console.error('❌ ActiveCampaign Error:', error.message);
    }
  }

  // 3. CHECK DYNAMICS 365
  console.log('3️⃣ CHECKING DYNAMICS 365...');
  console.log('─'.repeat(80));

  const D365_TENANT_ID = process.env.DYNAMICS_TENANT_ID;
  const D365_CLIENT_ID = process.env.DYNAMICS_CLIENT_ID;
  const D365_CLIENT_SECRET = process.env.DYNAMICS_CLIENT_SECRET;
  const D365_INSTANCE_URL = process.env.DYNAMICS_INSTANCE_URL;

  if (!D365_TENANT_ID || !D365_CLIENT_ID || !D365_CLIENT_SECRET || !D365_INSTANCE_URL) {
    console.log('⚠️  Dynamics 365 credentials not configured');
  } else {
    try {
      // Get OAuth token
      const tokenResponse = await fetch(
        `https://login.microsoftonline.com/${D365_TENANT_ID}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: D365_CLIENT_ID,
            client_secret: D365_CLIENT_SECRET,
            scope: `${D365_INSTANCE_URL}/.default`,
            grant_type: 'client_credentials',
          }),
        }
      );

      if (!tokenResponse.ok) {
        console.log('❌ Failed to get Dynamics token');
        return;
      }

      const tokenData = await tokenResponse.json();

      // Search for lead by email
      const leadsResponse = await fetch(
        `${D365_INSTANCE_URL}/api/data/v9.2/leads?$select=leadid,fullname,emailaddress1,telephone1,companyname,leadsourcecode,createdon,_ownerid_value&$filter=emailaddress1 eq '${testEmail}'&$orderby=createdon desc&$top=1`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
          },
        }
      );

      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json();
        if (leadsData.value && leadsData.value.length > 0) {
          const lead = leadsData.value[0];
          console.log('✅ FOUND IN DYNAMICS 365');
          console.log(`   Lead ID: ${lead.leadid}`);
          console.log(`   Name: ${lead.fullname}`);
          console.log(`   Email: ${lead.emailaddress1}`);
          console.log(`   Company: ${lead.companyname}`);
          console.log(`   Business Phone (telephone1): ${lead.telephone1 || 'Not set'}`);
          console.log(`   Lead Source Code: ${lead.leadsourcecode} (${lead.leadsourcecode === 7 ? 'Trade Show ✅' : 'Other'})`);
          console.log(`   Owner ID: ${lead._ownerid_value}`);
          console.log(`   Created: ${new Date(lead.createdon).toLocaleString()}`);

          if (lead.telephone1 === expectedPhone) {
            console.log('\n   ✅ PHONE NUMBER IN TELEPHONE1 FIELD MATCHES!');
          } else {
            console.log(`\n   ⚠️  Phone mismatch!`);
            console.log(`   Expected: ${expectedPhone}`);
            console.log(`   Got: ${lead.telephone1}`);
          }
        } else {
          console.log('❌ NOT FOUND IN DYNAMICS 365');
        }
      } else {
        console.log(`❌ Dynamics API Error: ${leadsResponse.status}`);
      }
    } catch (error) {
      console.error('❌ Dynamics 365 Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✨ Verification Complete!\n');
})();
