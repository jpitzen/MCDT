-- Migration: create-ad-configurations
-- Date: 2026-03-03
-- Description: AD/LDAP configuration table for server connection settings

CREATE TABLE IF NOT EXISTS ad_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT false,

  -- Connection settings
  server_url VARCHAR(500) NOT NULL,
  base_dn VARCHAR(500) NOT NULL,
  use_ssl BOOLEAN DEFAULT true,
  port INTEGER DEFAULT 636,
  connection_timeout INTEGER DEFAULT 10,

  -- Bind credentials (encrypted — reuses credentialService AES-256-GCM)
  bind_dn TEXT NOT NULL,
  bind_password_encrypted TEXT NOT NULL,
  bind_password_iv VARCHAR(64) NOT NULL,
  bind_password_auth_tag VARCHAR(64) NOT NULL,

  -- Search settings
  user_search_filter VARCHAR(500) DEFAULT '(sAMAccountName={username})',
  user_search_base VARCHAR(500),
  group_search_filter VARCHAR(500) DEFAULT '(objectClass=group)',
  group_search_base VARCHAR(500),

  -- Attribute mapping
  email_attribute VARCHAR(100) DEFAULT 'mail',
  display_name_attribute VARCHAR(100) DEFAULT 'displayName',
  first_name_attribute VARCHAR(100) DEFAULT 'givenName',
  last_name_attribute VARCHAR(100) DEFAULT 'sn',
  group_attribute VARCHAR(100) DEFAULT 'memberOf',
  unique_id_attribute VARCHAR(100) DEFAULT 'objectGUID',

  -- Behavior
  auto_create_users BOOLEAN DEFAULT true,
  default_role VARCHAR(20) DEFAULT 'viewer',
  sync_interval_minutes INTEGER DEFAULT 60,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only one active config at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_config_active
  ON ad_configurations(is_active) WHERE is_active = true;

COMMENT ON TABLE ad_configurations IS 'AD/LDAP server connection and search configurations';
COMMENT ON COLUMN ad_configurations.is_active IS 'Only one row can have is_active=true (enforced by partial unique index)';
COMMENT ON COLUMN ad_configurations.user_search_filter IS 'LDAP filter template — {username} is replaced at runtime';
