-- Migration: Add destruction workflow fields to deployments table
-- Date: 2025-01-28
-- Description: Adds new status values and fields for the deployment destruction workflow

-- Step 1: Add new values to the deployment status ENUM
-- Note: PostgreSQL doesn't allow dropping values from ENUMs easily, so we add new ones

-- Add new destruction status values
ALTER TYPE enum_deployments_status ADD VALUE IF NOT EXISTS 'pending_destruction';
ALTER TYPE enum_deployments_status ADD VALUE IF NOT EXISTS 'destroying';
ALTER TYPE enum_deployments_status ADD VALUE IF NOT EXISTS 'destroyed';
ALTER TYPE enum_deployments_status ADD VALUE IF NOT EXISTS 'destroy_failed';

-- Step 2: Add new values to the deployment_phase ENUM
ALTER TYPE "enum_deployments_deployment_phase" ADD VALUE IF NOT EXISTS 'terraform-plan-preview';
ALTER TYPE "enum_deployments_deployment_phase" ADD VALUE IF NOT EXISTS 'database-init';
ALTER TYPE "enum_deployments_deployment_phase" ADD VALUE IF NOT EXISTS 'database-ready';
ALTER TYPE "enum_deployments_deployment_phase" ADD VALUE IF NOT EXISTS 'destruction-pending';
ALTER TYPE "enum_deployments_deployment_phase" ADD VALUE IF NOT EXISTS 'destruction-started';
ALTER TYPE "enum_deployments_deployment_phase" ADD VALUE IF NOT EXISTS 'destruction-complete';

-- Step 3: Add destruction tracking columns
ALTER TABLE deployments 
ADD COLUMN IF NOT EXISTS destruction_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS destruction_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS destroyed_at TIMESTAMP WITH TIME ZONE;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN deployments.destruction_requested_at IS 'When destruction was requested';
COMMENT ON COLUMN deployments.destruction_confirmed_at IS 'When destruction was confirmed by user';
COMMENT ON COLUMN deployments.destroyed_at IS 'When destruction completed';

-- Verification query (run after migration):
-- SELECT enumlabel FROM pg_enum 
-- WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_deployments_status');
