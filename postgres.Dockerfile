# ZLAWS PostgreSQL Custom Image
# Based on PostgreSQL 14 Alpine with ZLAWS schema initialization

FROM postgres:14-alpine

# Install additional tools
RUN apk add --no-cache postgresql-contrib

# Set environment variables
ENV POSTGRES_DB=zlaws_db \
    POSTGRES_USER=zlaws_user \
    POSTGRES_PASSWORD=ZLAWSSecurePass123!

# Create initialization directory
WORKDIR /docker-entrypoint-initdb.d

# Copy initialization scripts
COPY --chmod=755 <<EOF /docker-entrypoint-initdb.d/01-schema.sql
-- ZLAWS Database Schema Initialization

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create team members table
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    role VARCHAR(50) DEFAULT 'member',
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

-- Create shared resources table
CREATE TABLE IF NOT EXISTS shared_resources (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id),
    resource_type VARCHAR(50) NOT NULL,
    resource_id INTEGER NOT NULL,
    permissions TEXT NOT NULL,
    expires_at TIMESTAMP,
    shared_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create credentials table
CREATE TABLE IF NOT EXISTS credentials (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    credential_type VARCHAR(50) NOT NULL,
    encrypted_data TEXT NOT NULL,
    provider VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_rotated TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create deployments table
CREATE TABLE IF NOT EXISTS deployments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    environment VARCHAR(50),
    cluster_type VARCHAR(50),
    config JSONB,
    status VARCHAR(50) DEFAULT 'created',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create deployment logs table
CREATE TABLE IF NOT EXISTS deployment_logs (
    id SERIAL PRIMARY KEY,
    deployment_id INTEGER NOT NULL REFERENCES deployments(id),
    log_level VARCHAR(20),
    message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(100),
    resource_type VARCHAR(50),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create alert channel configs table
CREATE TABLE IF NOT EXISTS alert_channel_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    channel_type VARCHAR(50),
    config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployment_logs_deployment_id ON deployment_logs(deployment_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Create default user for testing (optional)
INSERT INTO users (username, email, password_hash, role) 
VALUES ('admin', 'admin@zlaws.local', '$2a$10$YourHashedPasswordHere', 'admin')
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO zlaws_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO zlaws_user;

EOF

# Expose PostgreSQL port
EXPOSE 5432

# Use default PostgreSQL entry point
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["postgres"]
