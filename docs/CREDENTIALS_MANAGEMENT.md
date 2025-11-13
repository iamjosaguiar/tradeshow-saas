# Tradeshow Credentials Management

This document explains how to manage credentials for multiple tradeshows in the CleanSpace Tradeshow App.

## Overview

The app now supports multi-tenant credential storage, allowing each tradeshow to have its own:
- ActiveCampaign API credentials
- Dynamics 365 API credentials
- Custom field mappings
- Lead topic format

Credentials are stored securely in the database rather than environment variables, making it easy to manage multiple tradeshows.

## Database Schema

### Table: `tradeshow_credentials`

Stores API credentials and configuration for each tradeshow:

```sql
CREATE TABLE tradeshow_credentials (
  id SERIAL PRIMARY KEY,
  tradeshow_id INTEGER NOT NULL UNIQUE REFERENCES tradeshows(id),

  -- ActiveCampaign credentials
  ac_api_url VARCHAR(255),
  ac_api_key TEXT,
  ac_rep_field_id VARCHAR(50),
  ac_country_field_id VARCHAR(50),
  ac_company_field_id VARCHAR(50),
  ac_comments_field_id VARCHAR(50),

  -- Dynamics 365 credentials
  d365_tenant_id VARCHAR(255),
  d365_client_id VARCHAR(255),
  d365_client_secret TEXT,
  d365_instance_url VARCHAR(255),

  -- Lead configuration
  lead_topic_format VARCHAR(255) DEFAULT '{tradeshow_name}',

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);
```

## Setup

### 1. Run the Migration

First, apply the database migration to create the credentials table:

```bash
psql $DATABASE_URL -f migrations/add-tradeshow-credentials.sql
```

### 2. Migrate Existing Credentials

If you have credentials in your `.env.local` file, migrate them to the database:

```bash
node scripts/manage-credentials.js migrate-from-env aa-2024
```

This will copy credentials from these environment variables to the database:
- `ACTIVECAMPAIGN_API_URL`
- `ACTIVECAMPAIGN_API_KEY`
- `DYNAMICS_TENANT_ID`
- `DYNAMICS_CLIENT_ID`
- `DYNAMICS_CLIENT_SECRET`
- `DYNAMICS_INSTANCE_URL`

### 3. Verify Credentials

Check that credentials were stored correctly:

```bash
node scripts/manage-credentials.js view aa-2024
```

## Managing Credentials

### List All Tradeshows

See which tradeshows have credentials configured:

```bash
node scripts/manage-credentials.js list
```

Output:
```
📋 Listing all tradeshows with credential status:

ID: 1
   Name: A+A Trade Show 2024
   Slug: aa-2024
   Active: ✅
   ActiveCampaign: ✅
   Dynamics 365: ✅

ID: 2
   Name: Canadian-French Safety Show
   Slug: canadian-french-2024
   Active: ✅
   ActiveCampaign: ❌
   Dynamics 365: ❌
```

### View Tradeshow Credentials

View detailed credentials for a specific tradeshow:

```bash
node scripts/manage-credentials.js view aa-2024
# or by ID
node scripts/manage-credentials.js view 1
```

### Update Credentials

To update credentials, you can either:

1. **Migrate from environment**: Update your `.env.local` and run the migrate command again
2. **Update database directly**: Use SQL to update the `tradeshow_credentials` table

Example SQL update:

```sql
UPDATE tradeshow_credentials
SET
  ac_api_key = 'new-api-key',
  d365_client_secret = 'new-client-secret',
  updated_at = CURRENT_TIMESTAMP
WHERE tradeshow_id = (SELECT id FROM tradeshows WHERE slug = 'aa-2024');
```

## Running Sync Scripts

### New Multi-Tenant Sync Script

Use the new `sync-tradeshow-leads.js` script with a tradeshow slug or ID:

```bash
# By slug
node scripts/sync-tradeshow-leads.js aa-2024

# By ID
node scripts/sync-tradeshow-leads.js 1
```

This script:
1. Loads credentials from the database for the specified tradeshow
2. Fetches contacts from ActiveCampaign with the REP field populated
3. Updates lead details in Dynamics 365
4. Uses the configured lead topic format

### Legacy Script

The old `sync-aa-lead-details.js` script still works but uses environment variables. It's recommended to use the new multi-tenant script instead.

## Adding a New Tradeshow

To set up credentials for a new tradeshow:

1. **Create the tradeshow** (if not already created):

```sql
INSERT INTO tradeshows (name, slug, description, location, start_date, end_date, is_active, created_by)
VALUES (
  'NSC Safety Congress 2024',
  'nsc-2024',
  'National Safety Council Congress & Expo',
  'Orlando, FL',
  '2024-09-09',
  '2024-09-12',
  true,
  1
);
```

2. **Add credentials**:

```sql
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
)
SELECT
  id,
  'https://cleanspacetech.api-us1.com',
  'your-ac-api-key',
  '16', -- REP field ID
  '1',  -- Country field ID
  '8',  -- Company field ID
  '9',  -- Comments field ID
  'your-tenant-id',
  'your-client-id',
  'your-client-secret',
  'https://csx.crm6.dynamics.com',
  'NSC Safety Congress',
  1
FROM tradeshows
WHERE slug = 'nsc-2024';
```

3. **Test the sync**:

```bash
node scripts/sync-tradeshow-leads.js nsc-2024
```

## Lead Topic Format

The `lead_topic_format` field supports dynamic placeholders:

- `{tradeshow_name}` - Replaced with the tradeshow name
- Static text - Use any static text

Examples:
- `{tradeshow_name}` → "A+A Trade Show 2024"
- `{tradeshow_name} Lead` → "A+A Trade Show 2024 Lead"
- `A+A Tradeshow` → "A+A Tradeshow" (static)

## Security Best Practices

1. **Database encryption**: Ensure your database connection uses SSL
2. **Access control**: Limit database access to authorized users only
3. **Secrets rotation**: Regularly rotate API keys and secrets
4. **Environment isolation**: Use different credentials for development, staging, and production
5. **Audit logs**: Track who updates credentials using the `created_by` and `updated_at` fields

## API Usage in Code

You can use the credentials library in your own scripts:

```javascript
const { getTradeshowCredentials } = require('../lib/credentials');

async function myScript() {
  // Load credentials by slug
  const config = await getTradeshowCredentials('aa-2024');

  // Access credentials
  console.log(config.activeCampaign.apiUrl);
  console.log(config.dynamics365.instanceUrl);
  console.log(config.leadTopic);

  // Use the credentials...
}
```

## Troubleshooting

### "No credentials found for tradeshow"

The tradeshow doesn't have credentials configured. Run:
```bash
node scripts/manage-credentials.js list
```

Then either migrate from environment or add credentials manually.

### "Missing required credentials"

Some credential fields are NULL in the database. Check which fields are missing:
```bash
node scripts/manage-credentials.js view <tradeshow-slug>
```

Update the missing fields in the database.

### "Failed to load credentials"

Check your database connection:
1. Verify `DATABASE_URL` or `POSTGRES_URL` in `.env.local`
2. Ensure the database is accessible
3. Check that the migrations have been applied

## Migration Checklist

- [ ] Run database migration (`add-tradeshow-credentials.sql`)
- [ ] Migrate A+A credentials from environment
- [ ] Test new sync script with A+A tradeshow
- [ ] Add credentials for other tradeshows
- [ ] Update deployment scripts to use new sync command
- [ ] Document any custom field IDs per tradeshow
- [ ] (Optional) Remove credentials from `.env.local` after migration
