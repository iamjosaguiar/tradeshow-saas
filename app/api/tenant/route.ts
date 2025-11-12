import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

/**
 * GET /api/tenant?subdomain=cleanspace
 * Look up tenant by subdomain
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const subdomain = searchParams.get('subdomain');

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain parameter is required' },
        { status: 400 }
      );
    }

    // Look up tenant by subdomain
    const tenants = await sql`
      SELECT
        id,
        name,
        slug,
        subdomain,
        logo_url,
        primary_color,
        dark_color,
        accent_color,
        is_active
      FROM tenants
      WHERE subdomain = ${subdomain.toLowerCase()}
        AND is_active = TRUE
        AND deleted_at IS NULL
      LIMIT 1
    `;

    if (tenants.length === 0) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(tenants[0]);
  } catch (error) {
    console.error('Error looking up tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
