-- Database Schema for CleanSpace Tradeshow App
-- This schema supports authentication, role-based access, and dynamic tradeshow management

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'rep')),
  rep_code VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Tradeshows table for dynamic tradeshow creation
CREATE TABLE IF NOT EXISTS tradeshows (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  location VARCHAR(255),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tradeshow tags/custom fields
CREATE TABLE IF NOT EXISTS tradeshow_tags (
  id SERIAL PRIMARY KEY,
  tradeshow_id INTEGER NOT NULL REFERENCES tradeshows(id) ON DELETE CASCADE,
  tag_name VARCHAR(100) NOT NULL,
  tag_value VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update badge_photos table to include tradeshow reference
-- If badge_photos already exists, add the new column
ALTER TABLE badge_photos ADD COLUMN IF NOT EXISTS tradeshow_id INTEGER REFERENCES tradeshows(id) ON DELETE SET NULL;
ALTER TABLE badge_photos ADD COLUMN IF NOT EXISTS submitted_by_rep INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_badge_photos_tradeshow ON badge_photos(tradeshow_id);
CREATE INDEX IF NOT EXISTS idx_badge_photos_form_source ON badge_photos(form_source);
CREATE INDEX IF NOT EXISTS idx_badge_photos_rep ON badge_photos(submitted_by_rep);
CREATE INDEX IF NOT EXISTS idx_tradeshows_slug ON tradeshows(slug);
CREATE INDEX IF NOT EXISTS idx_tradeshows_active ON tradeshows(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_rep_code ON users(rep_code);

-- Sessions table for NextAuth.js
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Page views tracking (already exists in track-view API)
CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  form_source VARCHAR(100),
  tradeshow_id INTEGER REFERENCES tradeshows(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_page_views_tradeshow ON page_views(tradeshow_id);

-- Seed data: Create default admin user
-- Password: 'admin123' (hashed with bcrypt, cost 10)
-- IMPORTANT: Change this password after first login!
INSERT INTO users (email, name, password_hash, role, rep_code)
VALUES (
  'admin@cleanspace.com',
  'Admin User',
  '$2a$10$rK3VNnEKPgXLJLGqJWqBHO0tGLuCLPvLRvFqLvXqZKVnGQ8YZJzPq',
  'admin',
  NULL
)
ON CONFLICT (email) DO NOTHING;

-- Seed data: Create sample rep users
INSERT INTO users (email, name, password_hash, role, rep_code)
VALUES
  ('john.smith@cleanspace.com', 'John Smith', '$2a$10$rK3VNnEKPgXLJLGqJWqBHO0tGLuCLPvLRvFqLvXqZKVnGQ8YZJzPq', 'rep', 'john-smith'),
  ('jane.doe@cleanspace.com', 'Jane Doe', '$2a$10$rK3VNnEKPgXLJLGqJWqBHO0tGLuCLPvLRvFqLvXqZKVnGQ8YZJzPq', 'rep', 'jane-doe')
ON CONFLICT (email) DO NOTHING;

-- Seed data: Create sample tradeshows
INSERT INTO tradeshows (name, slug, description, location, start_date, end_date, is_active, created_by)
VALUES
  ('A+A Trade Show 2024', 'aa-2024', 'Leading international trade fair for safety, security and health at work', 'Düsseldorf, Germany', '2024-11-05', '2024-11-08', true, 1),
  ('Canadian-French Safety Show', 'canadian-french-2024', 'Safety equipment and services exhibition', 'Montreal, Canada', '2024-10-15', '2024-10-17', true, 1)
ON CONFLICT (slug) DO NOTHING;

-- Add tags to tradeshows
INSERT INTO tradeshow_tags (tradeshow_id, tag_name, tag_value)
SELECT id, 'activecampaign_tag_id', '7'
FROM tradeshows
WHERE slug = 'aa-2024'
ON CONFLICT DO NOTHING;

INSERT INTO tradeshow_tags (tradeshow_id, tag_name, tag_value)
SELECT id, 'activecampaign_tag_id', '6'
FROM tradeshows
WHERE slug = 'canadian-french-2024'
ON CONFLICT DO NOTHING;
