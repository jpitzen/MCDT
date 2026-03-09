-- Migration: Add terraform-validate and terraform-destroy to deployment_phase enum
-- Date: 2025-11-25
-- Description: Extends the deployment_phase enum to include terraform-validate and terraform-destroy phases

-- Add terraform-validate after terraform-init
ALTER TYPE enum_deployments_deployment_phase ADD VALUE IF NOT EXISTS 'terraform-validate' AFTER 'terraform-init';

-- Add terraform-destroy after terraform-apply  
ALTER TYPE enum_deployments_deployment_phase ADD VALUE IF NOT EXISTS 'terraform-destroy' AFTER 'terraform-apply';

-- Verify the updated enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'enum_deployments_deployment_phase'::regtype 
ORDER BY enumsortorder;
