/**
 * Test Migration Runner Script
 * Non-interactive version for testing
 */

import { neon } from '@neondatabase/serverless';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function runTestMigration() {
  console.log('🚀 Starting Multi-Tenant Migration (Test Mode)\n');

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
    // Check if migration already ran
    console.log('📝 Checking if migration already exists...');
    try {
      const existing = await sql`SELECT id FROM tenants LIMIT 1`;
      if (existing.length > 0) {
        console.log('⚠️  Migration appears to have already run (tenants table exists with data)');
        console.log('✅ Skipping migration to avoid duplicates\n');

        // Show existing tenants
        const tenants = await sql`SELECT id, name, subdomain, created_at FROM tenants`;
        console.log('📊 Existing tenants:');
        tenants.forEach(t => {
          console.log(`   • ${t.name} (${t.subdomain}) - Created: ${t.created_at}`);
        });
        return;
      }
    } catch (e) {
      console.log('✅ Migration not yet run, proceeding...\n');
    }

    // Step 1: Create tables
    console.log('📝 Step 1: Creating multi-tenant tables...');

    // Create tenants table
    await sql`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        subdomain VARCHAR(100) NOT NULL UNIQUE,
        logo_url TEXT,
        primary_color VARCHAR(7) DEFAULT '#1BD076',
        dark_color VARCHAR(7) DEFAULT '#042D23',
        accent_color VARCHAR(7),
        company_email VARCHAR(255),
        company_domain VARCHAR(255),
        support_email VARCHAR(255),
        industry VARCHAR(100),
        keywords TEXT,
        meta_description TEXT,
        subscription_status VARCHAR(50) DEFAULT 'trial',
        is_complimentary BOOLEAN DEFAULT FALSE,
        trial_ends_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        max_users INTEGER DEFAULT 10,
        max_tradeshows INTEGER DEFAULT 50,
        max_submissions_per_month INTEGER DEFAULT 1000,
        settings JSONB DEFAULT '{}'::jsonb,
        is_active BOOLEAN DEFAULT TRUE
      )
    `;
    console.log('✅ Created tenants table');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug)`;

    // Create CRM connections table
    await sql`
      CREATE TABLE IF NOT EXISTS tenant_crm_connections (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        crm_type VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        is_connected BOOLEAN DEFAULT FALSE,
        api_url TEXT,
        api_key TEXT,
        client_id TEXT,
        client_secret TEXT,
        tenant_id_crm VARCHAR(255),
        instance_url TEXT,
        field_mappings JSONB DEFAULT '{}'::jsonb,
        sync_enabled BOOLEAN DEFAULT TRUE,
        last_sync_at TIMESTAMP,
        sync_status VARCHAR(50),
        sync_error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, crm_type)
      )
    `;
    console.log('✅ Created tenant_crm_connections table');

    // Create subscription plans table
    await sql`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        price_monthly DECIMAL(10, 2),
        price_yearly DECIMAL(10, 2),
        stripe_price_id_monthly VARCHAR(255),
        stripe_price_id_yearly VARCHAR(255),
        max_users INTEGER NOT NULL DEFAULT 10,
        max_tradeshows INTEGER NOT NULL DEFAULT 50,
        max_submissions_per_month INTEGER NOT NULL DEFAULT 1000,
        features JSONB DEFAULT '[]'::jsonb,
        description TEXT,
        is_popular BOOLEAN DEFAULT FALSE,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Created subscription_plans table');

    // Insert default plans
    await sql`
      INSERT INTO subscription_plans (name, slug, price_monthly, price_yearly, max_users, max_tradeshows, max_submissions_per_month, description, is_active)
      VALUES
        ('Starter', 'starter', 49.00, 490.00, 5, 10, 500, 'Perfect for small teams', TRUE),
        ('Professional', 'professional', 149.00, 1490.00, 20, 50, 2500, 'Ideal for growing businesses', TRUE),
        ('Enterprise', 'enterprise', 449.00, 4490.00, 100, 200, 10000, 'For large organizations', TRUE)
      ON CONFLICT (slug) DO NOTHING
    `;
    console.log('✅ Created subscription plans');

    // Create tenant subscriptions table
    await sql`
      CREATE TABLE IF NOT EXISTS tenant_subscriptions (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        plan_id INTEGER REFERENCES subscription_plans(id),
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        stripe_payment_method_id VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'trialing',
        billing_cycle VARCHAR(20) DEFAULT 'monthly',
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        trial_start TIMESTAMP,
        trial_end TIMESTAMP,
        canceled_at TIMESTAMP,
        ended_at TIMESTAMP,
        current_month_submissions INTEGER DEFAULT 0,
        usage_reset_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id)
      )
    `;
    console.log('✅ Created tenant_subscriptions table');

    // Create super admins table
    await sql`
      CREATE TABLE IF NOT EXISTS super_admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        can_create_tenants BOOLEAN DEFAULT TRUE,
        can_manage_billing BOOLEAN DEFAULT TRUE,
        can_view_all_data BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        two_factor_secret VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      )
    `;
    console.log('✅ Created super_admins table');

    // Create audit logs table
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        super_admin_id INTEGER REFERENCES super_admins(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        changes JSONB,
        metadata JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Created audit_logs table');

    // Create webhook events table
    await sql`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id SERIAL PRIMARY KEY,
        source VARCHAR(50) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        event_id VARCHAR(255) UNIQUE,
        payload JSONB NOT NULL,
        processed BOOLEAN DEFAULT FALSE,
        processed_at TIMESTAMP,
        error TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Created webhook_events table');

    // Step 2: Add tenant_id to existing tables
    console.log('\n📝 Step 2: Adding tenant_id to existing tables...');

    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id)`;
    console.log('✅ Added tenant_id to users table');

    await sql`ALTER TABLE tradeshows ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tradeshows_tenant ON tradeshows(tenant_id)`;
    console.log('✅ Added tenant_id to tradeshows table');

    await sql`ALTER TABLE badge_photos ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE`;
    await sql`CREATE INDEX IF NOT EXISTS idx_badge_photos_tenant ON badge_photos(tenant_id)`;
    console.log('✅ Added tenant_id to badge_photos table');

    await sql`ALTER TABLE page_views ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE`;
    await sql`CREATE INDEX IF NOT EXISTS idx_page_views_tenant ON page_views(tenant_id)`;
    console.log('✅ Added tenant_id to page_views table');

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
        'CleanSpace Technology tradeshow lead capture system',
        'complimentary',
        TRUE,
        999,
        999,
        999999,
        TRUE
      )
      RETURNING id
    `;

    const cleanspaceTenantId = tenantResult[0].id;
    console.log(`✅ CleanSpace tenant created with ID: ${cleanspaceTenantId}`);

    // Step 4: Set up CRM connections
    console.log('\n📝 Step 4: Configuring CRM connections...');

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
      `;
      console.log('✅ ActiveCampaign connection configured');
    }

    // Step 5: Migrate existing data
    console.log('\n📝 Step 5: Migrating existing data...');

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
    console.log('\n📝 Step 7: Creating subscription...');
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
    `;
    console.log('✅ Complimentary subscription created');

    // Step 8: Create test super admin
    console.log('\n📝 Step 8: Creating super admin...');
    const testPassword = 'TestAdmin123!';
    const passwordHash = await bcrypt.hash(testPassword, 10);

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
        'admin@test.com',
        'Test Administrator',
        ${passwordHash},
        TRUE,
        TRUE,
        TRUE,
        TRUE
      )
      ON CONFLICT (email) DO NOTHING
    `;
    console.log(`✅ Super admin created: admin@test.com / ${testPassword}`);

    // Success summary
    console.log('\n🎉 Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • CleanSpace tenant ID: ${cleanspaceTenantId}`);
    console.log(`   • Users migrated: ${usersUpdated[0].count}`);
    console.log(`   • Tradeshows migrated: ${tradeshowsUpdated[0].count}`);
    console.log(`   • Badge photos migrated: ${photosUpdated[0].count}`);
    console.log('   • Super admin: admin@test.com');
    console.log('\n📝 Next Steps:');
    console.log('   1. Add to /etc/hosts: 127.0.0.1 cleanspace.localhost');
    console.log('   2. Run: npm run dev');
    console.log('   3. Visit: http://cleanspace.localhost:3000\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
runTestMigration();
