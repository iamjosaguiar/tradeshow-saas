/**
 * Tradeshow Credentials Management
 * Handles loading and managing credentials for multi-tenant tradeshow integrations
 */

const { Pool } = require('pg');

// Create database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Get credentials for a specific tradeshow
 * @param {number|string} tradeshowIdentifier - Either tradeshow ID or slug
 * @returns {Promise<Object>} Tradeshow credentials and configuration
 */
async function getTradeshowCredentials(tradeshowIdentifier) {
  let query;
  let params;

  // Check if identifier is a number (ID) or string (slug)
  if (typeof tradeshowIdentifier === 'number' || !isNaN(tradeshowIdentifier)) {
    query = `
      SELECT
        tc.*,
        t.name as tradeshow_name,
        t.slug as tradeshow_slug,
        t.default_country
      FROM tradeshow_credentials tc
      JOIN tradeshows t ON tc.tradeshow_id = t.id
      WHERE tc.tradeshow_id = $1 AND t.is_active = true
    `;
    params = [parseInt(tradeshowIdentifier)];
  } else {
    query = `
      SELECT
        tc.*,
        t.name as tradeshow_name,
        t.slug as tradeshow_slug,
        t.default_country
      FROM tradeshow_credentials tc
      JOIN tradeshows t ON tc.tradeshow_id = t.id
      WHERE t.slug = $1 AND t.is_active = true
    `;
    params = [tradeshowIdentifier];
  }

  try {
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      throw new Error(`No credentials found for tradeshow: ${tradeshowIdentifier}`);
    }

    const creds = result.rows[0];

    // Validate required credentials
    const missingFields = [];
    if (!creds.ac_api_url) missingFields.push('ActiveCampaign API URL');
    if (!creds.ac_api_key) missingFields.push('ActiveCampaign API Key');
    if (!creds.d365_tenant_id) missingFields.push('Dynamics 365 Tenant ID');
    if (!creds.d365_client_id) missingFields.push('Dynamics 365 Client ID');
    if (!creds.d365_client_secret) missingFields.push('Dynamics 365 Client Secret');
    if (!creds.d365_instance_url) missingFields.push('Dynamics 365 Instance URL');

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required credentials for tradeshow "${creds.tradeshow_name}": ${missingFields.join(', ')}`
      );
    }

    // Format the lead topic by replacing placeholder
    const leadTopic = (creds.lead_topic_format || '{tradeshow_name}')
      .replace('{tradeshow_name}', creds.tradeshow_name);

    return {
      tradeshowId: creds.tradeshow_id,
      tradeshowName: creds.tradeshow_name,
      tradeshowSlug: creds.tradeshow_slug,
      defaultCountry: creds.default_country,

      // ActiveCampaign
      activeCampaign: {
        apiUrl: creds.ac_api_url,
        apiKey: creds.ac_api_key,
        fieldIds: {
          rep: creds.ac_rep_field_id || '16',
          country: creds.ac_country_field_id || '1',
          company: creds.ac_company_field_id || '8',
          comments: creds.ac_comments_field_id || '9',
        },
      },

      // Dynamics 365
      dynamics365: {
        tenantId: creds.d365_tenant_id,
        clientId: creds.d365_client_id,
        clientSecret: creds.d365_client_secret,
        instanceUrl: creds.d365_instance_url,
      },

      // Lead configuration
      leadTopic,
    };
  } catch (error) {
    throw new Error(`Failed to load credentials for tradeshow: ${error.message}`);
  }
}

/**
 * Get all tradeshows with credentials
 * @returns {Promise<Array>} List of tradeshows with credentials
 */
async function getAllTradeshowsWithCredentials() {
  const query = `
    SELECT
      t.id,
      t.name,
      t.slug,
      t.is_active,
      tc.id IS NOT NULL as has_credentials,
      tc.ac_api_url IS NOT NULL as has_ac_credentials,
      tc.d365_tenant_id IS NOT NULL as has_d365_credentials
    FROM tradeshows t
    LEFT JOIN tradeshow_credentials tc ON t.id = tc.tradeshow_id
    WHERE t.is_active = true
    ORDER BY t.start_date DESC, t.name
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw new Error(`Failed to load tradeshows: ${error.message}`);
  }
}

/**
 * Update credentials for a specific tradeshow
 * @param {number} tradeshowId - Tradeshow ID
 * @param {Object} credentials - Credentials object
 * @param {number} userId - User ID making the update
 */
async function updateTradeshowCredentials(tradeshowId, credentials, userId) {
  const {
    acApiUrl,
    acApiKey,
    acRepFieldId,
    acCountryFieldId,
    acCompanyFieldId,
    acCommentsFieldId,
    d365TenantId,
    d365ClientId,
    d365ClientSecret,
    d365InstanceUrl,
    leadTopicFormat,
  } = credentials;

  const query = `
    INSERT INTO tradeshow_credentials (
      tradeshow_id,
      ac_api_url,
      ac_api_key,
      ac_rep_field_id,
      ac_country_field_id,
      ac_company_field_id,
      ac_comments_field_id,
      d365_tenant_id,
      d365_client_id,
      d365_client_secret,
      d365_instance_url,
      lead_topic_format,
      created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (tradeshow_id)
    DO UPDATE SET
      ac_api_url = COALESCE($2, tradeshow_credentials.ac_api_url),
      ac_api_key = COALESCE($3, tradeshow_credentials.ac_api_key),
      ac_rep_field_id = COALESCE($4, tradeshow_credentials.ac_rep_field_id),
      ac_country_field_id = COALESCE($5, tradeshow_credentials.ac_country_field_id),
      ac_company_field_id = COALESCE($6, tradeshow_credentials.ac_company_field_id),
      ac_comments_field_id = COALESCE($7, tradeshow_credentials.ac_comments_field_id),
      d365_tenant_id = COALESCE($8, tradeshow_credentials.d365_tenant_id),
      d365_client_id = COALESCE($9, tradeshow_credentials.d365_client_id),
      d365_client_secret = COALESCE($10, tradeshow_credentials.d365_client_secret),
      d365_instance_url = COALESCE($11, tradeshow_credentials.d365_instance_url),
      lead_topic_format = COALESCE($12, tradeshow_credentials.lead_topic_format),
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  const values = [
    tradeshowId,
    acApiUrl,
    acApiKey,
    acRepFieldId,
    acCountryFieldId,
    acCompanyFieldId,
    acCommentsFieldId,
    d365TenantId,
    d365ClientId,
    d365ClientSecret,
    d365InstanceUrl,
    leadTopicFormat,
    userId,
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw new Error(`Failed to update credentials: ${error.message}`);
  }
}

/**
 * Close database connection pool
 */
async function closePool() {
  await pool.end();
}

module.exports = {
  getTradeshowCredentials,
  getAllTradeshowsWithCredentials,
  updateTradeshowCredentials,
  closePool,
};
