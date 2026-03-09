-- Create deployment_drafts table
-- This table stores saved/staged deployments for review and approval workflow

CREATE TABLE IF NOT EXISTS deployment_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id UUID NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cluster_name VARCHAR(255) NOT NULL,
    cloud_provider VARCHAR(50) NOT NULL CHECK (cloud_provider IN ('aws', 'azure', 'gcp', 'digitalocean', 'linode')),
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    estimated_monthly_cost DECIMAL(10, 2),
    cost_breakdown JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'deployed')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_comment TEXT,
    rejection_reason TEXT,
    test_results JSONB,
    tested_at TIMESTAMP WITH TIME ZONE,
    deployment_id UUID REFERENCES deployments(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deployment_drafts_user_id ON deployment_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_deployment_drafts_status ON deployment_drafts(status);
CREATE INDEX IF NOT EXISTS idx_deployment_drafts_cloud_provider ON deployment_drafts(cloud_provider);
CREATE INDEX IF NOT EXISTS idx_deployment_drafts_approved_by ON deployment_drafts(approved_by);
CREATE INDEX IF NOT EXISTS idx_deployment_drafts_created_at ON deployment_drafts(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_deployment_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deployment_drafts_updated_at
    BEFORE UPDATE ON deployment_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_deployment_drafts_updated_at();

-- Add comments for documentation
COMMENT ON TABLE deployment_drafts IS 'Stores saved/staged deployments for review and approval workflow';
COMMENT ON COLUMN deployment_drafts.status IS 'Workflow status: draft, pending_approval, approved, rejected, deployed';
COMMENT ON COLUMN deployment_drafts.estimated_monthly_cost IS 'Estimated monthly cost in USD';
COMMENT ON COLUMN deployment_drafts.cost_breakdown IS 'Detailed cost breakdown by resource type (compute, storage, database, networking)';
COMMENT ON COLUMN deployment_drafts.test_results IS 'Results from deployment validation/dry-run testing';
