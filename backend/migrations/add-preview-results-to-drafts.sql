-- Migration: Add preview_results and previewed_at columns to deployment_drafts
-- Description: Allows storing terraform plan preview results for later review

-- Add preview_results column (JSONB to store full preview output)
ALTER TABLE deployment_drafts 
ADD COLUMN IF NOT EXISTS preview_results JSONB DEFAULT NULL;

-- Add previewed_at timestamp column
ALTER TABLE deployment_drafts 
ADD COLUMN IF NOT EXISTS previewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN deployment_drafts.preview_results IS 'Stores terraform plan preview results including summary, changes, and raw output';
COMMENT ON COLUMN deployment_drafts.previewed_at IS 'Timestamp when the preview was last run';
