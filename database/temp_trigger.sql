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
