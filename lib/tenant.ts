/**
 * Tenant Utilities
 * Functions for tenant detection and management
 */

import { neon } from '@neondatabase/serverless';
import { headers, cookies } from 'next/headers';
import { cache } from 'react';

// Types
export interface Tenant {
  id: number;
  name: string;
  slug: string;
  subdomain: string;
  logo_url: string | null;
  primary_color: string;
  dark_color: string;
  accent_color: string | null;
  company_email: string | null;
  company_domain: string | null;
  support_email: string | null;
  industry: string | null;
  keywords: string | null;
  meta_description: string | null;
  subscription_status: string;
  is_complimentary: boolean;
  max_users: number;
  max_tradeshows: number;
  max_submissions_per_month: number;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: Date;
}

export interface TenantCRMConnection {
  id: number;
  tenant_id: number;
  crm_type: string;
  is_active: boolean;
  is_connected: boolean;
  api_url: string | null;
  api_key: string | null;
  client_id: string | null;
  client_secret: string | null;
  tenant_id_crm: string | null;
  instance_url: string | null;
  field_mappings: Record<string, any>;
  sync_enabled: boolean;
  last_sync_at: Date | null;
}

/**
 * Get current subdomain from request headers or cookies
 */
export function getCurrentSubdomain(): string | null {
  try {
    // Try to get from headers (set by middleware)
    const headersList = headers();
    const subdomain = headersList.get('x-tenant-subdomain');

    if (subdomain) {
      return subdomain;
    }

    // Fallback to cookie
    const cookieStore = cookies();
    const subdomainCookie = cookieStore.get('tenant_subdomain');

    return subdomainCookie?.value || null;
  } catch (error) {
    console.error('[Tenant] Error getting subdomain:', error);
    return null;
  }
}

/**
 * Get tenant by subdomain
 * Cached per request to avoid duplicate DB queries
 */
export const getTenantBySubdomain = cache(async (subdomain: string): Promise<Tenant | null> => {
  if (!subdomain) {
    return null;
  }

  const sql = neon(process.env.DATABASE_URL!);

  try {
    const result = await sql`
      SELECT * FROM tenants
      WHERE subdomain = ${subdomain}
        AND is_active = TRUE
        AND deleted_at IS NULL
      LIMIT 1
    `;

    if (result.length === 0) {
      console.warn(`[Tenant] No tenant found for subdomain: ${subdomain}`);
      return null;
    }

    return result[0] as Tenant;
  } catch (error) {
    console.error('[Tenant] Error fetching tenant:', error);
    throw error;
  }
});

/**
 * Get tenant by ID
 */
export const getTenantById = cache(async (tenantId: number): Promise<Tenant | null> => {
  const sql = neon(process.env.DATABASE_URL!);

  try {
    const result = await sql`
      SELECT * FROM tenants
      WHERE id = ${tenantId}
        AND is_active = TRUE
        AND deleted_at IS NULL
      LIMIT 1
    `;

    return result.length > 0 ? (result[0] as Tenant) : null;
  } catch (error) {
    console.error('[Tenant] Error fetching tenant by ID:', error);
    throw error;
  }
});

/**
 * Get current tenant from request context
 */
export const getCurrentTenant = cache(async (): Promise<Tenant | null> => {
  const subdomain = getCurrentSubdomain();

  if (!subdomain) {
    console.log('[Tenant] No subdomain detected');
    return null;
  }

  return getTenantBySubdomain(subdomain);
});

/**
 * Get tenant CRM connections
 */
export async function getTenantCRMConnections(tenantId: number): Promise<TenantCRMConnection[]> {
  const sql = neon(process.env.DATABASE_URL!);

  try {
    const result = await sql`
      SELECT * FROM tenant_crm_connections
      WHERE tenant_id = ${tenantId}
        AND is_active = TRUE
      ORDER BY crm_type
    `;

    return result as TenantCRMConnection[];
  } catch (error) {
    console.error('[Tenant] Error fetching CRM connections:', error);
    throw error;
  }
}

/**
 * Get specific CRM connection for tenant
 */
export async function getTenantCRMConnection(
  tenantId: number,
  crmType: string
): Promise<TenantCRMConnection | null> {
  const sql = neon(process.env.DATABASE_URL!);

  try {
    const result = await sql`
      SELECT * FROM tenant_crm_connections
      WHERE tenant_id = ${tenantId}
        AND crm_type = ${crmType}
        AND is_active = TRUE
      LIMIT 1
    `;

    return result.length > 0 ? (result[0] as TenantCRMConnection) : null;
  } catch (error) {
    console.error('[Tenant] Error fetching CRM connection:', error);
    throw error;
  }
}

/**
 * Check if tenant has an active subscription
 */
export async function checkTenantSubscription(tenantId: number): Promise<boolean> {
  const sql = neon(process.env.DATABASE_URL!);

  try {
    const result = await sql`
      SELECT status, is_complimentary FROM tenants
      WHERE id = ${tenantId}
      LIMIT 1
    `;

    if (result.length === 0) {
      return false;
    }

    const tenant = result[0];

    // Complimentary accounts always have access
    if (tenant.is_complimentary) {
      return true;
    }

    // Check if subscription is active
    const validStatuses = ['active', 'trialing', 'trial'];
    return validStatuses.includes(tenant.subscription_status);
  } catch (error) {
    console.error('[Tenant] Error checking subscription:', error);
    return false;
  }
}

/**
 * Validate tenant has not exceeded their plan limits
 */
export async function validateTenantLimits(tenantId: number): Promise<{
  users: { current: number; max: number; exceeded: boolean };
  tradeshows: { current: number; max: number; exceeded: boolean };
  submissions: { current: number; max: number; exceeded: boolean };
}> {
  const sql = neon(process.env.DATABASE_URL!);

  try {
    // Get tenant limits
    const tenantResult = await sql`
      SELECT max_users, max_tradeshows, max_submissions_per_month
      FROM tenants
      WHERE id = ${tenantId}
    `;

    if (tenantResult.length === 0) {
      throw new Error('Tenant not found');
    }

    const limits = tenantResult[0];

    // Get current usage
    const userCount = await sql`
      SELECT COUNT(*) as count FROM users WHERE tenant_id = ${tenantId}
    `;

    const tradeshowCount = await sql`
      SELECT COUNT(*) as count FROM tradeshows WHERE tenant_id = ${tenantId} AND is_active = TRUE
    `;

    const submissionCount = await sql`
      SELECT COUNT(*) as count FROM badge_photos
      WHERE tenant_id = ${tenantId}
        AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
    `;

    return {
      users: {
        current: parseInt(userCount[0].count),
        max: limits.max_users,
        exceeded: parseInt(userCount[0].count) >= limits.max_users,
      },
      tradeshows: {
        current: parseInt(tradeshowCount[0].count),
        max: limits.max_tradeshows,
        exceeded: parseInt(tradeshowCount[0].count) >= limits.max_tradeshows,
      },
      submissions: {
        current: parseInt(submissionCount[0].count),
        max: limits.max_submissions_per_month,
        exceeded: parseInt(submissionCount[0].count) >= limits.max_submissions_per_month,
      },
    };
  } catch (error) {
    console.error('[Tenant] Error validating limits:', error);
    throw error;
  }
}

/**
 * Get tenant branding configuration for client-side use
 */
export async function getTenantBranding(tenantId: number) {
  const tenant = await getTenantById(tenantId);

  if (!tenant) {
    return null;
  }

  return {
    name: tenant.name,
    logoUrl: tenant.logo_url,
    primaryColor: tenant.primary_color,
    darkColor: tenant.dark_color,
    accentColor: tenant.accent_color,
  };
}

/**
 * Require tenant in API route or server component
 * Throws error if no tenant found
 */
export async function requireTenant(): Promise<Tenant> {
  const tenant = await getCurrentTenant();

  if (!tenant) {
    throw new Error('Tenant not found. Please access via valid subdomain.');
  }

  // Check subscription
  const hasActiveSubscription = await checkTenantSubscription(tenant.id);

  if (!hasActiveSubscription) {
    throw new Error('Tenant subscription is not active');
  }

  return tenant;
}
