/**
 * Tenant Branding API
 * Manage tenant branding settings (logo, colors, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

// GET - Get tenant branding
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const result = await sql`
      SELECT
        id,
        name,
        logo_url,
        primary_color,
        dark_color,
        accent_color,
        company_email,
        company_domain,
        support_email,
        industry,
        keywords,
        meta_description
      FROM tenants
      WHERE id = ${session.user.tenantId}
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({ branding: result[0] });
  } catch (error) {
    console.error('[Tenant] Error fetching branding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update tenant branding (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin' || !session.user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      logoUrl,
      primaryColor,
      darkColor,
      accentColor,
      companyEmail,
      companyDomain,
      supportEmail,
      industry,
      keywords,
      metaDescription,
    } = body;

    const sql = neon(process.env.DATABASE_URL!);

    // Build update object dynamically
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (logoUrl !== undefined) updates.logo_url = logoUrl;
    if (primaryColor !== undefined) updates.primary_color = primaryColor;
    if (darkColor !== undefined) updates.dark_color = darkColor;
    if (accentColor !== undefined) updates.accent_color = accentColor;
    if (companyEmail !== undefined) updates.company_email = companyEmail;
    if (companyDomain !== undefined) updates.company_domain = companyDomain;
    if (supportEmail !== undefined) updates.support_email = supportEmail;
    if (industry !== undefined) updates.industry = industry;
    if (keywords !== undefined) updates.keywords = keywords;
    if (metaDescription !== undefined) updates.meta_description = metaDescription;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Update tenant
    const result = await sql`
      UPDATE tenants
      SET
        name = COALESCE(${updates.name || null}, name),
        logo_url = COALESCE(${updates.logo_url || null}, logo_url),
        primary_color = COALESCE(${updates.primary_color || null}, primary_color),
        dark_color = COALESCE(${updates.dark_color || null}, dark_color),
        accent_color = COALESCE(${updates.accent_color || null}, accent_color),
        company_email = COALESCE(${updates.company_email || null}, company_email),
        company_domain = COALESCE(${updates.company_domain || null}, company_domain),
        support_email = COALESCE(${updates.support_email || null}, support_email),
        industry = COALESCE(${updates.industry || null}, industry),
        keywords = COALESCE(${updates.keywords || null}, keywords),
        meta_description = COALESCE(${updates.meta_description || null}, meta_description),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${session.user.tenantId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Log audit event
    await sql`
      INSERT INTO audit_logs (
        tenant_id,
        user_id,
        action,
        entity_type,
        entity_id,
        changes
      )
      VALUES (
        ${session.user.tenantId},
        ${session.user.id},
        'tenant.branding_updated',
        'tenant',
        ${session.user.tenantId},
        ${JSON.stringify(updates)}
      )
    `;

    return NextResponse.json({ branding: result[0] });
  } catch (error) {
    console.error('[Tenant] Error updating branding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
