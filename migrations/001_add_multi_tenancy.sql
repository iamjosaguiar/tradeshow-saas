-- Migration: Add Multi-Tenancy Support
-- Description: Converts single-tenant CleanSpace app to multi-tenant SaaS
-- Date: 2025-01-12

-- =====================================================
-- 1. CREATE TENANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    subdomain VARCHAR(100) NOT NULL UNIQUE,

    -- Branding
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#1BD076', -- rgb(27,208,118)
    dark_color VARCHAR(7) DEFAULT '#042D23',    -- rgb(4,45,35)
    accent_color VARCHAR(7),

    -- Company Info
    company_email VARCHAR(255),
    company_domain VARCHAR(255),
    support_email VARCHAR(255),

    -- Metadata
    industry VARCHAR(100),
    keywords TEXT,
    meta_description TEXT,

    -- Subscription Status
    subscription_status VARCHAR(50) DEFAULT 'trial', -- trial, active, past_due, canceled, complimentary
    is_complimentary BOOLEAN DEFAULT FALSE,
    trial_ends_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    -- Limits (for different plan tiers)
    max_users INTEGER DEFAULT 10,
    max_tradeshows INTEGER DEFAULT 50,
    max_submissions_per_month INTEGER DEFAULT 1000,

    -- Settings
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for performance
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_active ON tenants(is_active) WHERE deleted_at IS NULL;

-- =====================================================
-- 2. CREATE CRM CONNECTIONS TABLE (Flexible Integration System)
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_crm_connections (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- CRM Type (extensible for future integrations)
    crm_type VARCHAR(50) NOT NULL, -- 'activecampaign', 'dynamics365', 'hubspot', 'salesforce', etc.

    -- Connection Status
    is_active BOOLEAN DEFAULT TRUE,
    is_connected BOOLEAN DEFAULT FALSE,

    -- Credentials (encrypted in production)
    api_url TEXT,
    api_key TEXT,
    client_id TEXT,
    client_secret TEXT,
    tenant_id_crm VARCHAR(255), -- For Azure/OAuth
    instance_url TEXT,

    -- Field Mappings (flexible JSON for different CRMs)
    field_mappings JSONB DEFAULT '{}'::jsonb,

    -- Sync Settings
    sync_enabled BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP,
    sync_status VARCHAR(50),
    sync_error TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tenant_id, crm_type)
);

CREATE INDEX idx_crm_connections_tenant ON tenant_crm_connections(tenant_id);
CREATE INDEX idx_crm_connections_type ON tenant_crm_connections(crm_type);

-- =====================================================
-- 3. CREATE SUBSCRIPTION PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,

    -- Pricing
    price_monthly DECIMAL(10, 2),
    price_yearly DECIMAL(10, 2),
    stripe_price_id_monthly VARCHAR(255),
    stripe_price_id_yearly VARCHAR(255),

    -- Limits
    max_users INTEGER NOT NULL DEFAULT 10,
    max_tradeshows INTEGER NOT NULL DEFAULT 50,
    max_submissions_per_month INTEGER NOT NULL DEFAULT 1000,

    -- Features (flexible JSON for feature flags)
    features JSONB DEFAULT '[]'::jsonb,

    -- Display
    description TEXT,
    is_popular BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create default plans
INSERT INTO subscription_plans (name, slug, price_monthly, price_yearly, max_users, max_tradeshows, max_submissions_per_month, features, description, is_active) VALUES
('Starter', 'starter', 49.00, 490.00, 5, 10, 500,
 '["Basic CRM Integration", "Email Support", "5 Users", "10 Tradeshows", "500 Submissions/month"]'::jsonb,
 'Perfect for small teams just getting started with tradeshow lead capture', TRUE),

('Professional', 'professional', 149.00, 1490.00, 20, 50, 2500,
 '["Advanced CRM Integration", "Priority Support", "20 Users", "50 Tradeshows", "2,500 Submissions/month", "Custom Branding", "Analytics Dashboard"]'::jsonb,
 'Ideal for growing businesses with regular tradeshow presence', TRUE),

('Enterprise', 'enterprise', 449.00, 4490.00, 100, 200, 10000,
 '["Full CRM Integration", "24/7 Priority Support", "100 Users", "200 Tradeshows", "10,000 Submissions/month", "Custom Branding", "Advanced Analytics", "API Access", "Dedicated Account Manager"]'::jsonb,
 'For large organizations with extensive tradeshow operations', TRUE);

-- =====================================================
-- 4. CREATE TENANT SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES subscription_plans(id),

    -- Stripe
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    stripe_payment_method_id VARCHAR(255),

    -- Subscription Details
    status VARCHAR(50) NOT NULL DEFAULT 'trialing', -- trialing, active, past_due, canceled, paused
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly

    -- Dates
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    canceled_at TIMESTAMP,
    ended_at TIMESTAMP,

    -- Usage Tracking
    current_month_submissions INTEGER DEFAULT 0,
    usage_reset_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tenant_id)
);

CREATE INDEX idx_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_stripe ON tenant_subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON tenant_subscriptions(status);

-- =====================================================
-- 5. ADD TENANT_ID TO EXISTING TABLES
-- =====================================================

-- Add tenant_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

-- Add tenant_id to tradeshows table
ALTER TABLE tradeshows ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tradeshows_tenant ON tradeshows(tenant_id);

-- Add tenant_id to badge_photos table
ALTER TABLE badge_photos ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_badge_photos_tenant ON badge_photos(tenant_id);

-- Add tenant_id to page_views table (analytics)
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_page_views_tenant ON page_views(tenant_id);

-- Add tenant_id to sessions table (NextAuth)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON sessions(tenant_id);

-- =====================================================
-- 6. CREATE SUPER ADMIN TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS super_admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    -- Permissions
    can_create_tenants BOOLEAN DEFAULT TRUE,
    can_manage_billing BOOLEAN DEFAULT TRUE,
    can_view_all_data BOOLEAN DEFAULT TRUE,

    -- Security
    last_login TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_super_admins_email ON super_admins(email);

-- =====================================================
-- 7. CREATE AUDIT LOG TABLE (Track important actions)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    super_admin_id INTEGER REFERENCES super_admins(id) ON DELETE SET NULL,

    -- Action Details
    action VARCHAR(100) NOT NULL, -- 'tenant.created', 'user.invited', 'subscription.changed', etc.
    entity_type VARCHAR(50), -- 'tenant', 'user', 'tradeshow', etc.
    entity_id INTEGER,

    -- Changes
    changes JSONB,
    metadata JSONB,

    -- Request Info
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- =====================================================
-- 8. CREATE WEBHOOK EVENTS TABLE (For Stripe webhooks)
-- =====================================================
CREATE TABLE IF NOT EXISTS webhook_events (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL, -- 'stripe', 'activecampaign', etc.
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255) UNIQUE,

    -- Data
    payload JSONB NOT NULL,

    -- Processing
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    error TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_source ON webhook_events(source);
CREATE INDEX idx_webhook_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_event_id ON webhook_events(event_id);

-- =====================================================
-- 9. UPDATE FUNCTIONS FOR AUTO-UPDATED TIMESTAMPS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_connections_updated_at BEFORE UPDATE ON tenant_crm_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_subscriptions_updated_at BEFORE UPDATE ON tenant_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_super_admins_updated_at BEFORE UPDATE ON super_admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next step: Run the seed script to migrate CleanSpace as the first tenant
