/**
 * Super Admin - Tenant Management API
 * List and create tenants (super admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Middleware to check super admin auth
async function checkSuperAdmin(request: NextRequest) {
  // TODO: Implement super admin session check
  // For now, check for special header or session
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  // TODO: Validate super admin JWT token
  // For MVP, we'll implement basic auth check
  return { email: 'admin@example.com', id: 1 };
}

// GET - List all tenants
export async function GET(request: NextRequest) {
  try {
    const superAdmin = await checkSuperAdmin(request);

    if (!superAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Super Admin only' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Get all tenants with subscription info and usage stats
    const tenants = await sql`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.subdomain,
        t.logo_url,
        t.company_email,
        t.subscription_status,
        t.is_complimentary,
        t.is_active,
        t.created_at,
        t.max_users,
        t.max_tradeshows,
        t.max_submissions_per_month,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT ts.id) as tradeshow_count,
        COUNT(DISTINCT bp.id) FILTER (
          WHERE bp.created_at >= date_trunc('month', CURRENT_TIMESTAMP)
        ) as current_month_submissions
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id
      LEFT JOIN tradeshows ts ON t.id = ts.tenant_id
      LEFT JOIN badge_photos bp ON t.id = bp.tenant_id
      WHERE t.deleted_at IS NULL
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;

    return NextResponse.json({ tenants });
  } catch (error) {
    console.error('[SuperAdmin] Error fetching tenants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new tenant
export async function POST(request: NextRequest) {
  try {
    const superAdmin = await checkSuperAdmin(request);

    if (!superAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Super Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      subdomain,
      companyEmail,
      isComplimentary = false,
      planId = null,
    } = body;

    if (!name || !slug || !subdomain) {
      return NextResponse.json(
        { error: 'Name, slug, and subdomain are required' },
        { status: 400 }
      );
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Check if subdomain or slug already exists
    const existing = await sql`
      SELECT id FROM tenants
      WHERE subdomain = ${subdomain} OR slug = ${slug}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Subdomain or slug already exists' },
        { status: 400 }
      );
    }

    // Get plan limits
    let maxUsers = 10;
    let maxTradeshows = 50;
    let maxSubmissions = 1000;

    if (planId) {
      const plan = await sql`
        SELECT max_users, max_tradeshows, max_submissions_per_month
        FROM subscription_plans
        WHERE id = ${planId}
      `;

      if (plan.length > 0) {
        maxUsers = plan[0].max_users;
        maxTradeshows = plan[0].max_tradeshows;
        maxSubmissions = plan[0].max_submissions_per_month;
      }
    }

    // Create tenant
    const result = await sql`
      INSERT INTO tenants (
        name,
        slug,
        subdomain,
        company_email,
        subscription_status,
        is_complimentary,
        max_users,
        max_tradeshows,
        max_submissions_per_month,
        is_active
      )
      VALUES (
        ${name},
        ${slug},
        ${subdomain},
        ${companyEmail || null},
        ${isComplimentary ? 'complimentary' : 'trial'},
        ${isComplimentary},
        ${maxUsers},
        ${maxTradeshows},
        ${maxSubmissions},
        TRUE
      )
      RETURNING *
    `;

    const tenant = result[0];

    // Create subscription record
    await sql`
      INSERT INTO tenant_subscriptions (
        tenant_id,
        plan_id,
        status,
        billing_cycle,
        current_period_start,
        current_period_end
      )
      VALUES (
        ${tenant.id},
        ${planId},
        ${isComplimentary ? 'active' : 'trialing'},
        ${isComplimentary ? 'complimentary' : 'monthly'},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '30 days'
      )
    `;

    // Log audit event
    await sql`
      INSERT INTO audit_logs (
        tenant_id,
        super_admin_id,
        action,
        entity_type,
        entity_id,
        changes
      )
      VALUES (
        ${tenant.id},
        ${superAdmin.id},
        'tenant.created',
        'tenant',
        ${tenant.id},
        ${JSON.stringify({ name, subdomain, isComplimentary })}
      )
    `;

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    console.error('[SuperAdmin] Error creating tenant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
