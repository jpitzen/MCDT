-- Migration: create-ad-role-mappings
-- Date: 2026-03-03
-- Description: Map AD/LDAP groups to application roles

CREATE TABLE IF NOT EXISTS ad_role_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_config_id UUID NOT NULL REFERENCES ad_configurations(id) ON DELETE CASCADE,
  ad_group_dn TEXT NOT NULL,
  ad_group_name VARCHAR(255) NOT NULL,
  mapped_role VARCHAR(20) NOT NULL CHECK (mapped_role IN ('admin', 'approver', 'operator', 'viewer')),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(ad_config_id, ad_group_dn)
);

COMMENT ON TABLE ad_role_mappings IS 'Maps AD group DNs to ZL-MCDT roles; highest priority wins when user is in multiple groups';
COMMENT ON COLUMN ad_role_mappings.priority IS 'Higher priority wins when user is in multiple groups. Admin=highest.';
