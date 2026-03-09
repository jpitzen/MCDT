-- Migration: Add deployment_pending status to deployment_drafts
-- Date: 2025-12-03
-- Description: Adds 'deployment_pending' to the deployment_drafts status check constraint
--              This status indicates a deployment has been created but not yet started

-- Drop the existing constraint
ALTER TABLE deployment_drafts DROP CONSTRAINT IF EXISTS deployment_drafts_status_check;

-- Add the new constraint with deployment_pending included
ALTER TABLE deployment_drafts ADD CONSTRAINT deployment_drafts_status_check 
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'deployed', 'deployment_pending'));

-- Update the column comment
COMMENT ON COLUMN deployment_drafts.status IS 'Workflow status: draft, pending_approval, approved, rejected, deployment_pending, deployed';
