-- Migration: Seed CleanSpace as First Tenant
-- Description: Migrates existing CleanSpace data to multi-tenant structure
-- Date: 2025-01-12

-- =====================================================
-- 1. CREATE CLEANSPACE TENANT
-- =====================================================
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
    '#1BD076', -- rgb(27,208,118)
    '#042D23', -- rgb(4,45,35)
    'info@cleanspacetechnology.com',
    'cleanspacetechnology.com',
    'support@cleanspacetechnology.com',
    'Respiratory Protection',
    'CleanSpace, tradeshow, lead capture, respiratory protection, industrial safety',
    'CleanSpace Technology tradeshow lead capture system for respiratory protection solutions',
    'complimentary', -- Free access as original client
    TRUE, -- is_complimentary
    999, -- Unlimited users
    999, -- Unlimited tradeshows
    999999, -- Unlimited submissions
    TRUE
)
ON CONFLICT (subdomain) DO NOTHING
RETURNING id;

-- Store the CleanSpace tenant_id for reference
DO $$
DECLARE
    cleanspace_tenant_id INTEGER;
BEGIN
    -- Get CleanSpace tenant ID
    SELECT id INTO cleanspace_tenant_id FROM tenants WHERE subdomain = 'cleanspace';

    -- =====================================================
    -- 2. CREATE CRM CONNECTIONS FOR CLEANSPACE
    -- =====================================================

    -- NOTE: Replace these with actual values from .env.production
    -- ActiveCampaign Connection
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
        cleanspace_tenant_id,
        'activecampaign',
        TRUE,
        TRUE,
        'https://cleanspacetech.api-us1.com',
        '-- REPLACE WITH ACTUAL API KEY --', -- TODO: Get from .env.production
        TRUE,
        '{
            "country": "1",
            "job_title": "4",
            "company": "8",
            "comments": "9",
            "current_respirator": "11",
            "work_environment": "12",
            "number_of_staff": "13",
            "sales_manager": "14"
        }'::jsonb
    )
    ON CONFLICT (tenant_id, crm_type) DO NOTHING;

    -- Dynamics 365 Connection
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
        cleanspace_tenant_id,
        'dynamics365',
        TRUE,
        TRUE,
        '-- REPLACE WITH ACTUAL TENANT ID --', -- TODO: Get from .env.production
        '-- REPLACE WITH ACTUAL CLIENT ID --', -- TODO: Get from .env.production
        '-- REPLACE WITH ACTUAL CLIENT SECRET --', -- TODO: Get from .env.production
        '-- REPLACE WITH ACTUAL INSTANCE URL --', -- TODO: Get from .env.production
        TRUE,
        '{
            "lead_source_code": "7"
        }'::jsonb
    )
    ON CONFLICT (tenant_id, crm_type) DO NOTHING;

    -- =====================================================
    -- 3. UPDATE ALL EXISTING RECORDS WITH TENANT_ID
    -- =====================================================

    -- Update all users to belong to CleanSpace tenant
    UPDATE users
    SET tenant_id = cleanspace_tenant_id
    WHERE tenant_id IS NULL;

    -- Update all tradeshows to belong to CleanSpace tenant
    UPDATE tradeshows
    SET tenant_id = cleanspace_tenant_id
    WHERE tenant_id IS NULL;

    -- Update all badge photos to belong to CleanSpace tenant
    UPDATE badge_photos
    SET tenant_id = cleanspace_tenant_id
    WHERE tenant_id IS NULL;

    -- Update all page views to belong to CleanSpace tenant
    UPDATE page_views
    SET tenant_id = cleanspace_tenant_id
    WHERE tenant_id IS NULL;

    -- =====================================================
    -- 4. CREATE SUBSCRIPTION FOR CLEANSPACE (Complimentary)
    -- =====================================================

    INSERT INTO tenant_subscriptions (
        tenant_id,
        plan_id,
        status,
        billing_cycle,
        current_period_start,
        current_period_end,
        trial_start,
        trial_end
    ) VALUES (
        cleanspace_tenant_id,
        NULL, -- No plan for complimentary accounts
        'active',
        'complimentary',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '100 years', -- Effectively unlimited
        NULL,
        NULL
    )
    ON CONFLICT (tenant_id) DO NOTHING;

    -- =====================================================
    -- 5. MAKE TENANT_ID REQUIRED (After migration)
    -- =====================================================

    -- Now that all existing records have tenant_id, make it required
    -- This prevents future inserts without tenant_id

    ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE tradeshows ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE badge_photos ALTER COLUMN tenant_id SET NOT NULL;

    -- page_views and sessions can remain nullable for backwards compatibility

    RAISE NOTICE 'CleanSpace tenant created successfully with ID: %', cleanspace_tenant_id;
    RAISE NOTICE 'All existing data migrated to CleanSpace tenant';
    RAISE NOTICE 'CRM connections configured (UPDATE API KEYS BEFORE USING)';

END $$;

-- =====================================================
-- 6. CREATE DEFAULT SUPER ADMIN ACCOUNT
-- =====================================================

-- NOTE: Update this with your actual admin email and password
-- Default password is 'SuperAdmin123!' (hash shown below)
-- IMPORTANT: Change this immediately after first login!

INSERT INTO super_admins (
    email,
    name,
    password_hash,
    can_create_tenants,
    can_manage_billing,
    can_view_all_data,
    is_active
) VALUES (
    'admin@yoursaas.com', -- TODO: Replace with your email
    'Super Administrator',
    '$2a$10$rQYZ9pCvRVJ5YXz4YXz4Ye5vN5vN5vN5vN5vN5vN5vN5vN5vN5vN5', -- TODO: Generate real hash
    TRUE,
    TRUE,
    TRUE,
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- SEED COMPLETE
-- =====================================================

-- Summary:
-- ✓ CleanSpace tenant created with complimentary access
-- ✓ All existing users, tradeshows, and leads migrated
-- ✓ CRM connections configured (NEEDS API KEYS)
-- ✓ Super admin account created (NEEDS PASSWORD HASH)
-- ✓ tenant_id now required on core tables

-- Next Steps:
-- 1. Update CRM API keys in tenant_crm_connections table
-- 2. Update super admin email and password hash
-- 3. Test CleanSpace subdomain access
-- 4. Configure DNS for wildcard subdomains (*.yourdomain.com)
