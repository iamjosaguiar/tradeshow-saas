/**
 * CRM Integration Utilities
 * Tenant-aware CRM operations for ActiveCampaign, Dynamics 365, and future integrations
 */

import { neon } from '@neondatabase/serverless';

export interface CRMConnection {
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
}

/**
 * Get tenant's CRM connection by type
 */
export async function getTenantCRMConnection(
  tenantId: number,
  crmType: string
): Promise<CRMConnection | null> {
  const sql = neon(process.env.DATABASE_URL!);

  try {
    const result = await sql`
      SELECT *
      FROM tenant_crm_connections
      WHERE tenant_id = ${tenantId}
        AND crm_type = ${crmType}
        AND is_active = TRUE
      LIMIT 1
    `;

    return result.length > 0 ? (result[0] as CRMConnection) : null;
  } catch (error) {
    console.error(`[CRM] Error fetching ${crmType} connection:`, error);
    return null;
  }
}

/**
 * Get all active CRM connections for a tenant
 */
export async function getTenantCRMConnections(tenantId: number): Promise<CRMConnection[]> {
  const sql = neon(process.env.DATABASE_URL!);

  try {
    const result = await sql`
      SELECT *
      FROM tenant_crm_connections
      WHERE tenant_id = ${tenantId}
        AND is_active = TRUE
      ORDER BY crm_type
    `;

    return result as CRMConnection[];
  } catch (error) {
    console.error('[CRM] Error fetching CRM connections:', error);
    return [];
  }
}

// ============================================================
// ACTIVECAMPAIGN INTEGRATION
// ============================================================

export interface ActiveCampaignContact {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  fieldValues?: Array<{
    field: string;
    value: string;
  }>;
  tags?: string[];
}

/**
 * Create or update contact in ActiveCampaign
 */
export async function syncContactToActiveCampaign(
  tenantId: number,
  contact: ActiveCampaignContact,
  tagIds?: string[]
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  const connection = await getTenantCRMConnection(tenantId, 'activecampaign');

  if (!connection || !connection.is_connected) {
    console.log('[ActiveCampaign] No active connection for tenant', tenantId);
    return { success: false, error: 'ActiveCampaign not configured' };
  }

  const { api_url, api_key, field_mappings } = connection;

  if (!api_url || !api_key) {
    return { success: false, error: 'Missing ActiveCampaign credentials' };
  }

  try {
    // Create/update contact
    const contactPayload: any = {
      contact: {
        email: contact.email,
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        phone: contact.phone || '',
      },
    };

    const contactResponse = await fetch(`${api_url}/api/3/contact/sync`, {
      method: 'POST',
      headers: {
        'Api-Token': api_key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactPayload),
    });

    if (!contactResponse.ok) {
      const errorText = await contactResponse.text();
      console.error('[ActiveCampaign] Contact sync failed:', errorText);
      return { success: false, error: 'Failed to sync contact' };
    }

    const contactData = await contactResponse.json();
    const contactId = contactData.contact.id;

    // Update custom fields if provided
    if (contact.fieldValues && contact.fieldValues.length > 0) {
      for (const fieldValue of contact.fieldValues) {
        const fieldId = field_mappings[fieldValue.field];
        if (fieldId) {
          await fetch(`${api_url}/api/3/fieldValues`, {
            method: 'POST',
            headers: {
              'Api-Token': api_key,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fieldValue: {
                contact: contactId,
                field: fieldId,
                value: fieldValue.value,
              },
            }),
          });
        }
      }
    }

    // Add tags if provided
    if (tagIds && tagIds.length > 0) {
      for (const tagId of tagIds) {
        await fetch(`${api_url}/api/3/contactTags`, {
          method: 'POST',
          headers: {
            'Api-Token': api_key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contactTag: {
              contact: contactId,
              tag: tagId,
            },
          }),
        });
      }
    }

    return { success: true, contactId };
  } catch (error) {
    console.error('[ActiveCampaign] Error syncing contact:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Create a tag in ActiveCampaign
 */
export async function createActiveCampaignTag(
  tenantId: number,
  tagName: string,
  description?: string
): Promise<{ success: boolean; tagId?: string; error?: string }> {
  const connection = await getTenantCRMConnection(tenantId, 'activecampaign');

  if (!connection || !connection.is_connected) {
    return { success: false, error: 'ActiveCampaign not configured' };
  }

  const { api_url, api_key } = connection;

  if (!api_url || !api_key) {
    return { success: false, error: 'Missing ActiveCampaign credentials' };
  }

  try {
    const response = await fetch(`${api_url}/api/3/tags`, {
      method: 'POST',
      headers: {
        'Api-Token': api_key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tag: {
          tag: tagName,
          tagType: 'contact',
          description: description || '',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ActiveCampaign] Tag creation failed:', errorText);
      return { success: false, error: 'Failed to create tag' };
    }

    const data = await response.json();
    return { success: true, tagId: data.tag.id };
  } catch (error) {
    console.error('[ActiveCampaign] Error creating tag:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================
// DYNAMICS 365 INTEGRATION
// ============================================================

export interface Dynamics365Lead {
  emailaddress1: string;
  firstname?: string;
  lastname?: string;
  companyname?: string;
  jobtitle?: string;
  telephone1?: string;
  description?: string;
  leadsourcecode?: number;
  [key: string]: any;
}

/**
 * Get Dynamics 365 access token
 */
async function getDynamics365Token(connection: CRMConnection): Promise<string | null> {
  const { tenant_id_crm, client_id, client_secret } = connection;

  if (!tenant_id_crm || !client_id || !client_secret) {
    return null;
  }

  try {
    const tokenUrl = `https://login.microsoftonline.com/${tenant_id_crm}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: client_id,
      client_secret: client_secret,
      scope: `${connection.instance_url}/.default`,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      console.error('[Dynamics365] Token request failed:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('[Dynamics365] Error getting token:', error);
    return null;
  }
}

/**
 * Create lead in Dynamics 365
 */
export async function createDynamics365Lead(
  tenantId: number,
  lead: Dynamics365Lead,
  ownerId?: string
): Promise<{ success: boolean; leadId?: string; error?: string }> {
  const connection = await getTenantCRMConnection(tenantId, 'dynamics365');

  if (!connection || !connection.is_connected) {
    console.log('[Dynamics365] No active connection for tenant', tenantId);
    return { success: false, error: 'Dynamics 365 not configured' };
  }

  const token = await getDynamics365Token(connection);

  if (!token) {
    return { success: false, error: 'Failed to get Dynamics 365 access token' };
  }

  try {
    // Apply field mappings from connection settings
    const leadData = { ...lead };
    if (connection.field_mappings?.lead_source_code) {
      leadData.leadsourcecode = connection.field_mappings.lead_source_code;
    }

    // Set owner if provided
    if (ownerId) {
      leadData['ownerid@odata.bind'] = `/systemusers(${ownerId})`;
    }

    const response = await fetch(`${connection.instance_url}/api/data/v9.2/leads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        Accept: 'application/json',
      },
      body: JSON.stringify(leadData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Dynamics365] Lead creation failed:', errorText);
      return { success: false, error: 'Failed to create lead' };
    }

    const leadId = response.headers.get('OData-EntityId')?.match(/\(([^)]+)\)/)?.[1];

    return { success: true, leadId };
  } catch (error) {
    console.error('[Dynamics365] Error creating lead:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get Dynamics 365 users
 */
export async function getDynamics365Users(
  tenantId: number
): Promise<Array<{ id: string; name: string; email: string }>> {
  const connection = await getTenantCRMConnection(tenantId, 'dynamics365');

  if (!connection || !connection.is_connected) {
    return [];
  }

  const token = await getDynamics365Token(connection);

  if (!token) {
    return [];
  }

  try {
    const response = await fetch(
      `${connection.instance_url}/api/data/v9.2/systemusers?$select=systemuserid,fullname,internalemailaddress&$filter=isdisabled eq false`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.value.map((user: any) => ({
      id: user.systemuserid,
      name: user.fullname,
      email: user.internalemailaddress,
    }));
  } catch (error) {
    console.error('[Dynamics365] Error fetching users:', error);
    return [];
  }
}

// ============================================================
// GENERIC CRM HELPERS
// ============================================================

/**
 * Check if tenant has any CRM integrations configured
 */
export async function tenantHasCRMIntegrations(tenantId: number): Promise<boolean> {
  const connections = await getTenantCRMConnections(tenantId);
  return connections.some((conn) => conn.is_connected);
}

/**
 * Test CRM connection
 */
export async function testCRMConnection(
  tenantId: number,
  crmType: string
): Promise<{ success: boolean; message: string }> {
  const connection = await getTenantCRMConnection(tenantId, crmType);

  if (!connection) {
    return { success: false, message: 'Connection not found' };
  }

  try {
    if (crmType === 'activecampaign') {
      const { api_url, api_key } = connection;
      if (!api_url || !api_key) {
        return { success: false, message: 'Missing credentials' };
      }

      const response = await fetch(`${api_url}/api/3/contacts?limit=1`, {
        headers: { 'Api-Token': api_key },
      });

      if (response.ok) {
        return { success: true, message: 'Connection successful' };
      } else {
        return { success: false, message: 'Authentication failed' };
      }
    } else if (crmType === 'dynamics365') {
      const token = await getDynamics365Token(connection);
      if (token) {
        return { success: true, message: 'Connection successful' };
      } else {
        return { success: false, message: 'Authentication failed' };
      }
    }

    return { success: false, message: 'Unsupported CRM type' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed',
    };
  }
}
