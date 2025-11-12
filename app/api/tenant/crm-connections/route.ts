/**
 * Tenant CRM Connections API
 * Manage CRM integrations for tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import { testCRMConnection } from '@/lib/crm';

export const dynamic = 'force-dynamic';

// GET - List tenant's CRM connections
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const connections = await sql`
      SELECT
        id,
        crm_type,
        is_active,
        is_connected,
        api_url,
        instance_url,
        field_mappings,
        sync_enabled,
        last_sync_at,
        sync_status,
        created_at,
        updated_at
      FROM tenant_crm_connections
      WHERE tenant_id = ${session.user.tenantId}
      ORDER BY crm_type
    `;

    // Don't expose sensitive credentials in response
    const safeConnections = connections.map(conn => ({
      ...conn,
      api_key: undefined,
      client_secret: undefined,
      tenant_id_crm: undefined,
    }));

    return NextResponse.json({ connections: safeConnections });
  } catch (error) {
    console.error('[Tenant] Error fetching CRM connections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add new CRM connection (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin' || !session.user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const {
      crmType,
      apiUrl,
      apiKey,
      clientId,
      clientSecret,
      tenantIdCrm,
      instanceUrl,
      fieldMappings = {},
      syncEnabled = true,
    } = body;

    if (!crmType) {
      return NextResponse.json({ error: 'CRM type is required' }, { status: 400 });
    }

    // Validate required fields based on CRM type
    if (crmType === 'activecampaign' && (!apiUrl || !apiKey)) {
      return NextResponse.json(
        { error: 'API URL and API Key are required for ActiveCampaign' },
        { status: 400 }
      );
    }

    if (crmType === 'dynamics365' && (!tenantIdCrm || !clientId || !clientSecret || !instanceUrl)) {
      return NextResponse.json(
        { error: 'Tenant ID, Client ID, Client Secret, and Instance URL are required for Dynamics 365' },
        { status: 400 }
      );
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Check if connection already exists
    const existing = await sql`
      SELECT id FROM tenant_crm_connections
      WHERE tenant_id = ${session.user.tenantId}
        AND crm_type = ${crmType}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `${crmType} connection already exists. Use PUT to update.` },
        { status: 400 }
      );
    }

    // Test connection before saving
    // TODO: Implement actual connection test
    const testResult = { success: true, message: 'Connection test skipped' };

    // Create connection
    const result = await sql`
      INSERT INTO tenant_crm_connections (
        tenant_id,
        crm_type,
        is_active,
        is_connected,
        api_url,
        api_key,
        client_id,
        client_secret,
        tenant_id_crm,
        instance_url,
        field_mappings,
        sync_enabled
      )
      VALUES (
        ${session.user.tenantId},
        ${crmType},
        TRUE,
        ${testResult.success},
        ${apiUrl || null},
        ${apiKey || null},
        ${clientId || null},
        ${clientSecret || null},
        ${tenantIdCrm || null},
        ${instanceUrl || null},
        ${JSON.stringify(fieldMappings)},
        ${syncEnabled}
      )
      RETURNING id, crm_type, is_active, is_connected, api_url, instance_url, field_mappings, sync_enabled
    `;

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
        'crm_connection.created',
        'crm_connection',
        ${result[0].id},
        ${JSON.stringify({ crmType })}
      )
    `;

    return NextResponse.json({
      connection: result[0],
      testResult,
    }, { status: 201 });
  } catch (error) {
    console.error('[Tenant] Error creating CRM connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
