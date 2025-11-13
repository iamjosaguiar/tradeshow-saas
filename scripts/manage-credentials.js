const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const {
  getTradeshowCredentials,
  getAllTradeshowsWithCredentials,
  updateTradeshowCredentials,
  closePool,
} = require('../lib/credentials');

/**
 * Script to manage tradeshow credentials
 *
 * Usage:
 *   node scripts/manage-credentials.js list
 *   node scripts/manage-credentials.js view <tradeshow-slug-or-id>
 *   node scripts/manage-credentials.js update <tradeshow-id>
 *   node scripts/manage-credentials.js migrate-from-env <tradeshow-slug>
 */

async function listTradeshows() {
  console.log('📋 Listing all tradeshows with credential status:\n');

  const tradeshows = await getAllTradeshowsWithCredentials();

  if (tradeshows.length === 0) {
    console.log('No tradeshows found.');
    return;
  }

  tradeshows.forEach((tradeshow) => {
    const acStatus = tradeshow.has_ac_credentials ? '✅' : '❌';
    const d365Status = tradeshow.has_d365_credentials ? '✅' : '❌';

    console.log(`ID: ${tradeshow.id}`);
    console.log(`   Name: ${tradeshow.name}`);
    console.log(`   Slug: ${tradeshow.slug}`);
    console.log(`   Active: ${tradeshow.is_active ? '✅' : '❌'}`);
    console.log(`   ActiveCampaign: ${acStatus}`);
    console.log(`   Dynamics 365: ${d365Status}`);
    console.log('');
  });
}

async function viewCredentials(tradeshowIdentifier) {
  console.log(`🔍 Viewing credentials for: ${tradeshowIdentifier}\n`);

  try {
    const config = await getTradeshowCredentials(tradeshowIdentifier);

    console.log('Tradeshow Information:');
    console.log(`   ID: ${config.tradeshowId}`);
    console.log(`   Name: ${config.tradeshowName}`);
    console.log(`   Slug: ${config.tradeshowSlug}`);
    console.log(`   Default Country: ${config.defaultCountry || 'Not set'}`);
    console.log(`   Lead Topic: "${config.leadTopic}"\n`);

    console.log('ActiveCampaign Credentials:');
    console.log(`   API URL: ${config.activeCampaign.apiUrl}`);
    console.log(`   API Key: ${config.activeCampaign.apiKey ? '***' + config.activeCampaign.apiKey.slice(-4) : 'Not set'}`);
    console.log(`   Field IDs:`);
    console.log(`      REP: ${config.activeCampaign.fieldIds.rep}`);
    console.log(`      Country: ${config.activeCampaign.fieldIds.country}`);
    console.log(`      Company: ${config.activeCampaign.fieldIds.company}`);
    console.log(`      Comments: ${config.activeCampaign.fieldIds.comments}\n`);

    console.log('Dynamics 365 Credentials:');
    console.log(`   Instance URL: ${config.dynamics365.instanceUrl}`);
    console.log(`   Tenant ID: ${config.dynamics365.tenantId}`);
    console.log(`   Client ID: ${config.dynamics365.clientId}`);
    console.log(`   Client Secret: ${config.dynamics365.clientSecret ? '***' + config.dynamics365.clientSecret.slice(-4) : 'Not set'}`);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

async function migrateFromEnv(tradeshowSlug) {
  console.log(`🔄 Migrating credentials from environment variables to database for: ${tradeshowSlug}\n`);

  // Get credentials from environment
  const envCredentials = {
    acApiUrl: process.env.ACTIVECAMPAIGN_API_URL,
    acApiKey: process.env.ACTIVECAMPAIGN_API_KEY,
    acRepFieldId: '16',
    acCountryFieldId: '1',
    acCompanyFieldId: '8',
    acCommentsFieldId: '9',
    d365TenantId: process.env.DYNAMICS_TENANT_ID,
    d365ClientId: process.env.DYNAMICS_CLIENT_ID,
    d365ClientSecret: process.env.DYNAMICS_CLIENT_SECRET,
    d365InstanceUrl: process.env.DYNAMICS_INSTANCE_URL,
    leadTopicFormat: '{tradeshow_name}',
  };

  // Validate environment variables
  const missingVars = [];
  if (!envCredentials.acApiUrl) missingVars.push('ACTIVECAMPAIGN_API_URL');
  if (!envCredentials.acApiKey) missingVars.push('ACTIVECAMPAIGN_API_KEY');
  if (!envCredentials.d365TenantId) missingVars.push('DYNAMICS_TENANT_ID');
  if (!envCredentials.d365ClientId) missingVars.push('DYNAMICS_CLIENT_ID');
  if (!envCredentials.d365ClientSecret) missingVars.push('DYNAMICS_CLIENT_SECRET');
  if (!envCredentials.d365InstanceUrl) missingVars.push('DYNAMICS_INSTANCE_URL');

  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  try {
    // Get tradeshow by slug to find ID
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    const result = await pool.query('SELECT id, name FROM tradeshows WHERE slug = $1', [tradeshowSlug]);

    if (result.rows.length === 0) {
      console.error(`❌ Tradeshow not found with slug: ${tradeshowSlug}`);
      await pool.end();
      process.exit(1);
    }

    const tradeshow = result.rows[0];
    console.log(`Found tradeshow: ${tradeshow.name} (ID: ${tradeshow.id})`);

    // Update credentials
    await updateTradeshowCredentials(tradeshow.id, envCredentials, 1); // userId = 1 (admin)

    console.log('\n✅ Successfully migrated credentials from environment to database!');
    console.log(`\nYou can now run syncs using:`);
    console.log(`   node scripts/sync-tradeshow-leads.js ${tradeshowSlug}`);

    await pool.end();

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

async function updateCredentialsInteractive(tradeshowId) {
  console.log('⚠️  Interactive credential update not yet implemented.');
  console.log('Use the migrate-from-env command or update directly in the database.');
  process.exit(1);
}

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  try {
    switch (command) {
      case 'list':
        await listTradeshows();
        break;

      case 'view':
        if (!arg) {
          console.error('❌ Usage: node scripts/manage-credentials.js view <tradeshow-slug-or-id>');
          process.exit(1);
        }
        await viewCredentials(arg);
        break;

      case 'migrate-from-env':
        if (!arg) {
          console.error('❌ Usage: node scripts/manage-credentials.js migrate-from-env <tradeshow-slug>');
          console.error('   Example: node scripts/manage-credentials.js migrate-from-env aa-2024');
          process.exit(1);
        }
        await migrateFromEnv(arg);
        break;

      case 'update':
        if (!arg) {
          console.error('❌ Usage: node scripts/manage-credentials.js update <tradeshow-id>');
          process.exit(1);
        }
        await updateCredentialsInteractive(parseInt(arg));
        break;

      default:
        console.log('📘 Tradeshow Credentials Management\n');
        console.log('Usage:');
        console.log('   node scripts/manage-credentials.js list');
        console.log('   node scripts/manage-credentials.js view <tradeshow-slug-or-id>');
        console.log('   node scripts/manage-credentials.js migrate-from-env <tradeshow-slug>');
        console.log('   node scripts/manage-credentials.js update <tradeshow-id>');
        console.log('\nExamples:');
        console.log('   node scripts/manage-credentials.js list');
        console.log('   node scripts/manage-credentials.js view aa-2024');
        console.log('   node scripts/manage-credentials.js migrate-from-env aa-2024');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
