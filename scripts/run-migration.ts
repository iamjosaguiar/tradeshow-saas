/**
 * Migration Runner Script
 * Runs database migrations for multi-tenancy conversion
 */

import { neon } from '@neondatabase/serverless';
import * as bcrypt from 'bcryptjs';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

async function runMigration() {
  console.log('🚀 Starting Multi-Tenant Migration\n');

  // Load environment variables
  const DATABASE_URL = process.env.DATABASE_URL;
  const ACTIVECAMPAIGN_API_KEY = process.env.ACTIVECAMPAIGN_API_KEY || '';
  const ACTIVECAMPAIGN_API_URL = process.env.ACTIVECAMPAIGN_API_URL || '';

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);

  try {
    // Step 1: Run main migration
    console.log('📝 Step 1: Running main migration (001_add_multi_tenancy.sql)...');
    const migration1 = fs.readFileSync(
      path.join(__dirname, '../migrations/001_add_multi_tenancy.sql'),
      'utf-8'
    );
    await sql(migration1);
    console.log('✅ Main migration completed\n');

    // Step 2: Get super admin details
    console.log('📝 Step 2: Setting up Super Admin account...');
    const adminEmail = await question('Enter super admin email: ');
    const adminPassword = await question('Enter super admin password (min 8 chars): ');

    if (adminPassword.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Step 3: Create CleanSpace tenant
    console.log('\n📝 Step 3: Creating CleanSpace tenant...');

    const tenantResult = await sql`
      INSERT INTO tenants (
        name,
        slug,
        subdomain,
        logo_url,
        primary_color,
        dark_color,
        company_email,
        company_domain,
        support_email,
        industry,
        keywords,
        meta_description,
        subscription_status,
        is_complimentary,
        max_users,
        max_tradeshows,
        max_submissions_per_month,
        is_active
      ) VALUES (
        'CleanSpace Technology',
        'cleanspace',
        'cleanspace',
        'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/CleanSpace-R-TM-Logo-Green-with-Tagline-DMSOFH8BykYfZ70xuZ7yUXKGpEy6U9.png',
        '#1BD076',
        '#042D23',
        'info@cleanspacetechnology.com',
        'cleanspacetechnology.com',
        'support@cleanspacetechnology.com',
        'Respiratory Protection',
        'CleanSpace, tradeshow, lead capture, respiratory protection, industrial safety',
        'CleanSpace Technology tradeshow lead capture system for respiratory protection solutions',
        'complimentary',
        TRUE,
        999,
        999,
        999999,
        TRUE
      )
      ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;

    const cleanspaceTenantId = tenantResult[0].id;
    console.log(`✅ CleanSpace tenant created with ID: ${cleanspaceTenantId}\n`);

    // Step 4: Set up CRM connections
    console.log('📝 Step 4: Configuring CRM connections...');

    // ActiveCampaign
    if (ACTIVECAMPAIGN_API_KEY && ACTIVECAMPAIGN_API_URL) {
      await sql`
        INSERT INTO tenant_crm_connections (
          tenant_id,
          crm_type,
          is_active,
          is_connected,
          api_url,
          api_key,
          sync_enabled,
          field_mappings
        ) VALUES (
          ${cleanspaceTenantId},
          'activecampaign',
          TRUE,
          TRUE,
          ${ACTIVECAMPAIGN_API_URL},
          ${ACTIVECAMPAIGN_API_KEY},
          TRUE,
          ${JSON.stringify({
            country: "1",
            job_title: "4",
            company: "8",
            comments: "9",
            current_respirator: "11",
            work_environment: "12",
            number_of_staff: "13",
            sales_manager: "14"
          })}
        )
        ON CONFLICT (tenant_id, crm_type) DO UPDATE
        SET api_key = EXCLUDED.api_key, api_url = EXCLUDED.api_url
      `;
      console.log('✅ ActiveCampaign connection configured');
    } else {
      console.log('⚠️  ActiveCampaign credentials not found - skipping');
    }

    // Dynamics 365 (optional - prompt for setup)
    const setupDynamics = await question('\nSet up Dynamics 365 integration? (y/n): ');

    if (setupDynamics.toLowerCase() === 'y') {
      const dynamicsTenantId = await question('Dynamics Tenant ID: ');
      const dynamicsClientId = await question('Dynamics Client ID: ');
      const dynamicsClientSecret = await question('Dynamics Client Secret: ');
      const dynamicsInstanceUrl = await question('Dynamics Instance URL: ');

      await sql`
        INSERT INTO tenant_crm_connections (
          tenant_id,
          crm_type,
          is_active,
          is_connected,
          tenant_id_crm,
          client_id,
          client_secret,
          instance_url,
          sync_enabled,
          field_mappings
        ) VALUES (
          ${cleanspaceTenantId},
          'dynamics365',
          TRUE,
          TRUE,
          ${dynamicsTenantId},
          ${dynamicsClientId},
          ${dynamicsClientSecret},
          ${dynamicsInstanceUrl},
          TRUE,
          ${JSON.stringify({ lead_source_code: "7" })}
        )
        ON CONFLICT (tenant_id, crm_type) DO UPDATE
        SET client_id = EXCLUDED.client_id, client_secret = EXCLUDED.client_secret
      `;
      console.log('✅ Dynamics 365 connection configured');
    }

    // Step 5: Migrate existing data
    console.log('\n📝 Step 5: Migrating existing data to CleanSpace tenant...');

    await sql`UPDATE users SET tenant_id = ${cleanspaceTenantId} WHERE tenant_id IS NULL`;
    const usersUpdated = await sql`SELECT COUNT(*) as count FROM users WHERE tenant_id = ${cleanspaceTenantId}`;
    console.log(`✅ Migrated ${usersUpdated[0].count} users`);

    await sql`UPDATE tradeshows SET tenant_id = ${cleanspaceTenantId} WHERE tenant_id IS NULL`;
    const tradeshowsUpdated = await sql`SELECT COUNT(*) as count FROM tradeshows WHERE tenant_id = ${cleanspaceTenantId}`;
    console.log(`✅ Migrated ${tradeshowsUpdated[0].count} tradeshows`);

    await sql`UPDATE badge_photos SET tenant_id = ${cleanspaceTenantId} WHERE tenant_id IS NULL`;
    const photosUpdated = await sql`SELECT COUNT(*) as count FROM badge_photos WHERE tenant_id = ${cleanspaceTenantId}`;
    console.log(`✅ Migrated ${photosUpdated[0].count} badge photos`);

    await sql`UPDATE page_views SET tenant_id = ${cleanspaceTenantId} WHERE tenant_id IS NULL`;

    // Step 6: Make tenant_id required
    console.log('\n📝 Step 6: Enforcing tenant_id requirements...');
    await sql`ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL`;
    await sql`ALTER TABLE tradeshows ALTER COLUMN tenant_id SET NOT NULL`;
    await sql`ALTER TABLE badge_photos ALTER COLUMN tenant_id SET NOT NULL`;
    console.log('✅ tenant_id now required on core tables');

    // Step 7: Create subscription
    console.log('\n📝 Step 7: Creating complimentary subscription for CleanSpace...');
    await sql`
      INSERT INTO tenant_subscriptions (
        tenant_id,
        status,
        billing_cycle,
        current_period_start,
        current_period_end
      ) VALUES (
        ${cleanspaceTenantId},
        'active',
        'complimentary',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '100 years'
      )
      ON CONFLICT (tenant_id) DO NOTHING
    `;
    console.log('✅ Complimentary subscription created');

    // Step 8: Create super admin
    console.log('\n📝 Step 8: Creating super admin account...');
    await sql`
      INSERT INTO super_admins (
        email,
        name,
        password_hash,
        can_create_tenants,
        can_manage_billing,
        can_view_all_data,
        is_active
      ) VALUES (
        ${adminEmail},
        'Super Administrator',
        ${passwordHash},
        TRUE,
        TRUE,
        TRUE,
        TRUE
      )
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `;
    console.log(`✅ Super admin created: ${adminEmail}`);

    // Success summary
    console.log('\n🎉 Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • CleanSpace tenant ID: ${cleanspaceTenantId}`);
    console.log(`   • Users migrated: ${usersUpdated[0].count}`);
    console.log(`   • Tradeshows migrated: ${tradeshowsUpdated[0].count}`);
    console.log(`   • Badge photos migrated: ${photosUpdated[0].count}`);
    console.log(`   • Super admin: ${adminEmail}`);
    console.log('\n📝 Next Steps:');
    console.log('   1. Configure DNS wildcard for *.yourdomain.com');
    console.log('   2. Update NEXTAUTH_URL to support subdomains');
    console.log('   3. Test CleanSpace subdomain access');
    console.log('   4. Deploy updated code with tenant middleware');
    console.log('   5. Create onboarding flow for new tenants\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run migration
runMigration();
