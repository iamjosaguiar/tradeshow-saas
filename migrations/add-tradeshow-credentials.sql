-- Migration: Add tradeshow credentials table
-- Created: 2025-01-13
-- Description: Store ActiveCampaign and Dynamics 365 credentials per tradeshow

-- Create tradeshow_credentials table
CREATE TABLE IF NOT EXISTS tradeshow_credentials (
  id SERIAL PRIMARY KEY,
  tradeshow_id INTEGER NOT NULL UNIQUE REFERENCES tradeshows(id) ON DELETE CASCADE,

  -- ActiveCampaign credentials
  ac_api_url VARCHAR(255),
  ac_api_key TEXT,
  ac_rep_field_id VARCHAR(50), -- Field ID for REP field in ActiveCampaign
  ac_country_field_id VARCHAR(50), -- Field ID for Country field
  ac_company_field_id VARCHAR(50), -- Field ID for Company field
  ac_comments_field_id VARCHAR(50), -- Field ID for Comments field

  -- Dynamics 365 credentials
  d365_tenant_id VARCHAR(255),
  d365_client_id VARCHAR(255),
  d365_client_secret TEXT,
  d365_instance_url VARCHAR(255),

  -- Lead topic/subject format
  lead_topic_format VARCHAR(255) DEFAULT '{tradeshow_name}', -- e.g., "A+A Tradeshow" or "{tradeshow_name} Lead"

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Ensure tradeshow_id is unique
  CONSTRAINT unique_tradeshow_credentials UNIQUE (tradeshow_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tradeshow_credentials_tradeshow ON tradeshow_credentials(tradeshow_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tradeshow_credentials_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tradeshow_credentials_timestamp
BEFORE UPDATE ON tradeshow_credentials
FOR EACH ROW
EXECUTE FUNCTION update_tradeshow_credentials_timestamp();

-- Seed credentials for A+A Tradeshow (using existing env values as template)
-- You'll need to populate these with actual values
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
  NULL, -- ac_api_url - to be populated
  NULL, -- ac_api_key - to be populated
  '16', -- ac_rep_field_id
  '1',  -- ac_country_field_id
  '8',  -- ac_company_field_id
  '9',  -- ac_comments_field_id
  NULL, -- d365_tenant_id - to be populated
  NULL, -- d365_client_id - to be populated
  NULL, -- d365_client_secret - to be populated
  NULL, -- d365_instance_url - to be populated
  'A+A Tradeshow',
  1     -- created by admin user
FROM tradeshows
WHERE slug = 'aa-2024'
ON CONFLICT (tradeshow_id) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE tradeshow_credentials IS 'Stores API credentials and configuration for each tradeshow integration with ActiveCampaign and Dynamics 365';
COMMENT ON COLUMN tradeshow_credentials.lead_topic_format IS 'Format for lead topic/subject. Use {tradeshow_name} as placeholder for tradeshow name';
