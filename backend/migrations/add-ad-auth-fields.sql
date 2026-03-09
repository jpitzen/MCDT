-- Migration: add-ad-auth-fields
-- Date: 2026-03-03
-- Description: Extend users table with AD/LDAP authentication fields

-- Auth provider tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'local'
  CHECK (auth_provider IN ('local', 'ldap', 'ad'));

-- AD-specific fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS distinguished_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ad_groups JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_ad_sync TIMESTAMP WITH TIME ZONE;

-- Allow null password for AD users (currently NOT NULL)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Index for AD lookups
CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

COMMENT ON COLUMN users.auth_provider IS 'Authentication source: local (bcrypt), ldap, or ad';
COMMENT ON COLUMN users.external_id IS 'AD objectGUID or LDAP uid for external identity linking';
COMMENT ON COLUMN users.distinguished_name IS 'Full AD/LDAP DN, e.g. CN=John,OU=Users,DC=corp,DC=example,DC=com';
COMMENT ON COLUMN users.ad_groups IS 'JSON array of AD group DNs the user belongs to';
COMMENT ON COLUMN users.last_ad_sync IS 'Timestamp of last successful AD/LDAP sync for this user';
