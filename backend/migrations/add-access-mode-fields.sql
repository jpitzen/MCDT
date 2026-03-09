-- Migration: add-access-mode-fields
-- Date: 2026-03-02

-- Access mode: internal (ClusterIP only) or external (LoadBalancer + SSL + DNS)
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS access_mode VARCHAR(10) DEFAULT 'internal';

-- External access configuration (nullable, used when access_mode = 'external')
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS external_domain VARCHAR(255);
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS ssl_mode VARCHAR(10);
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS ssl_cert_arn VARCHAR(255);

-- Constraint for valid access_mode values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_access_mode'
  ) THEN
    ALTER TABLE deployments ADD CONSTRAINT chk_access_mode
      CHECK (access_mode IN ('internal', 'external'));
  END IF;
END $$;
