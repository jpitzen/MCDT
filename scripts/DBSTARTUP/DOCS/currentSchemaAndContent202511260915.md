# Database Schema Documentation
**Generated:** November 26, 2025 09:15  
**Database:** eks_deployer  
**PostgreSQL Version:** 15-alpine  
**Total Tables:** 11 (excluding SequelizeMeta)

---

## Table of Contents
1. [Database Statistics](#database-statistics)
2. [Schema Overview](#schema-overview)
3. [Table Definitions](#table-definitions)
4. [Relationships & Foreign Keys](#relationships--foreign-keys)
5. [Indexes](#indexes)
6. [Constraints](#constraints)
7. [Current Data Summary](#current-data-summary)

---

## Database Statistics

| Table Name | Size | Columns | Rows (Current) |
|------------|------|---------|----------------|
| alert_channel_configs | 48 kB | 39 | 0 |
| audit_logs | 152 kB | 16 | Multiple |
| credentials | 80 kB | 25 | 1 |
| deployment_drafts | 112 kB | 22 | 1 |
| deployment_logs | 72 kB | 12 | Multiple |
| deployment_sql_scripts | 48 kB | 17 | 0 |
| deployments | 48 kB | 23 | 0 |
| shared_resources | 48 kB | 14 | 0 |
| team_members | 48 kB | 13 | 0 |
| teams | 40 kB | 11 | 0 |
| users | 48 kB | 12 | 4 |

**Total Database Size:** ~744 kB

---

## Schema Overview

### Entity Relationship Summary

```
users (1) ──< credentials (*)
users (1) ──< deployments (*)
users (1) ──< deployment_drafts (*)
users (1) ──< audit_logs (*)
users (1) ──< alert_channel_configs (*)
users (1) ──< teams (1 as owner)
users (*) ──< team_members (*)
users (1) ──< deployment_sql_scripts (* as uploader)

credentials (1) ──< deployments (*)
credentials (1) ──< deployment_drafts (*)

deployments (1) ──< deployment_logs (*)
deployments (1) ──< deployment_sql_scripts (*)
deployments (1) ──── deployment_drafts (1)

teams (1) ──< team_members (*)
teams (1) ──< shared_resources (*)
```

---

## Table Definitions

### 1. users
**Purpose:** Core user authentication and authorization table

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | Primary key |
| email | VARCHAR(255) | NOT NULL | - | Unique user email |
| first_name | VARCHAR(255) | NULL | - | User first name |
| last_name | VARCHAR(255) | NULL | - | User last name |
| password_hash | VARCHAR(255) | NOT NULL | - | Bcrypt hashed password |
| role | ENUM | NULL | 'viewer' | User role (admin, operator, viewer) |
| is_active | BOOLEAN | NULL | true | Account active status |
| last_login | TIMESTAMP TZ | NULL | - | Last login timestamp |
| mfa_enabled | BOOLEAN | NULL | false | Multi-factor auth enabled |
| mfa_secret | VARCHAR(255) | NULL | - | MFA secret key |
| created_at | TIMESTAMP TZ | NOT NULL | NOW() | Record creation timestamp |
| updated_at | TIMESTAMP TZ | NOT NULL | NOW() | Record update timestamp |

**Indexes:**
- PRIMARY KEY: users_pkey (id)
- UNIQUE: users_email_key (email)

**Referenced By:** 11 foreign keys from 8 tables

---

### 2. credentials
**Purpose:** Stores encrypted AWS credentials for deployments

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | Primary key |
| user_id | UUID | NOT NULL | - | FK to users.id |
| name | VARCHAR(255) | NOT NULL | - | Credential friendly name |
| description | TEXT | NULL | - | Credential description |
| aws_account_id | VARCHAR(255) | NOT NULL | - | AWS account ID |
| aws_region | VARCHAR(255) | NULL | 'us-east-1' | Default AWS region |
| encrypted_access_key_id | TEXT | NOT NULL | - | Encrypted AWS access key |
| encrypted_secret_access_key | TEXT | NOT NULL | - | Encrypted AWS secret key |
| encryption_iv | VARCHAR(255) | NOT NULL | - | AES-256-GCM IV |
| auth_tag | VARCHAR(255) | NULL | - | AES-256-GCM auth tag |
| is_valid | BOOLEAN | NULL | - | Validation status |
| last_validated_at | TIMESTAMP TZ | NULL | - | Last validation timestamp |
| validation_error | TEXT | NULL | - | Last validation error |
| last_rotated_at | TIMESTAMP TZ | NULL | - | Last rotation timestamp |
| rotation_scheduled_at | TIMESTAMP TZ | NULL | - | Scheduled rotation time |
| tags | JSONB | NULL | '[]' | User-defined tags |
| metadata | JSONB | NULL | '{}' | Additional metadata |
| is_active | BOOLEAN | NULL | true | Credential active status |
| cloud_provider | VARCHAR(255) | NOT NULL | 'aws' | Cloud provider type |
| secret_ref_id | VARCHAR(255) | NULL | - | External secret manager ref |
| vault_type | VARCHAR(255) | NOT NULL | 'aws-secrets' | Vault type |
| cloud_account_id | VARCHAR(255) | NULL | - | Generic cloud account ID |
| cloud_region | VARCHAR(255) | NULL | - | Generic cloud region |
| created_at | TIMESTAMP TZ | NOT NULL | NOW() | Record creation timestamp |
| updated_at | TIMESTAMP TZ | NOT NULL | NOW() | Record update timestamp |

**Indexes:**
- PRIMARY KEY: credentials_pkey (id)
- INDEX: credentials_user_id (user_id)
- INDEX: credentials_aws_account_id (aws_account_id)
- INDEX: credentials_is_active (is_active)

**Foreign Keys:**
- credentials_user_id_fkey: user_id → users(id) ON DELETE CASCADE

**Security Notes:**
- Access keys stored encrypted with AES-256-GCM
- Both encrypted_access_key_id and encrypted_secret_access_key contain same JSON-encrypted payload
- Encryption IV and auth tag required for decryption

---

### 3. deployments
**Purpose:** Tracks EKS cluster deployments and their lifecycle

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | Primary key |
| user_id | UUID | NOT NULL | - | FK to users.id |
| credential_id | UUID | NOT NULL | - | FK to credentials.id |
| cluster_name | VARCHAR(255) | NOT NULL | - | EKS cluster name |
| cloud_provider | VARCHAR(255) | NOT NULL | 'aws' | Cloud provider |
| region | VARCHAR(255) | NOT NULL | - | Deployment region |
| status | VARCHAR(50) | NOT NULL | 'pending' | Deployment status |
| configuration | JSONB | NOT NULL | '{}' | Deployment config |
| terraform_state_path | TEXT | NULL | - | Terraform state file path |
| terraform_vars | JSONB | NULL | '{}' | Terraform variables |
| outputs | JSONB | NULL | '{}' | Terraform outputs |
| estimated_monthly_cost | DECIMAL(10,2) | NULL | - | Cost estimate |
| cost_breakdown | JSONB | NULL | - | Detailed cost breakdown |
| tags | JSONB | NULL | '[]' | User-defined tags |
| metadata | JSONB | NULL | '{}' | Additional metadata |
| started_at | TIMESTAMP TZ | NULL | - | Deployment start time |
| completed_at | TIMESTAMP TZ | NULL | - | Deployment completion time |
| failed_at | TIMESTAMP TZ | NULL | - | Deployment failure time |
| error_message | TEXT | NULL | - | Error details |
| retry_count | INTEGER | NULL | 0 | Retry attempt count |
| last_health_check | TIMESTAMP TZ | NULL | - | Last health check time |
| health_status | VARCHAR(50) | NULL | - | Cluster health status |
| created_at | TIMESTAMP TZ | NOT NULL | NOW() | Record creation timestamp |
| updated_at | TIMESTAMP TZ | NOT NULL | NOW() | Record update timestamp |

**Indexes:**
- PRIMARY KEY: deployments_pkey (id)
- INDEX: deployments_user_id (user_id)
- INDEX: deployments_credential_id (credential_id)
- INDEX: deployments_status (status)
- INDEX: deployments_cluster_name (cluster_name)
- INDEX: deployments_cloud_provider (cloud_provider)

**Foreign Keys:**
- deployments_user_id_fkey: user_id → users(id) ON DELETE CASCADE
- deployments_credential_id_fkey: credential_id → credentials(id) ON DELETE CASCADE

**Status Values:** pending, provisioning, running, failed, destroying, destroyed

---

### 4. deployment_drafts
**Purpose:** Stores staged deployment configurations for approval workflow

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | Primary key |
| user_id | UUID | NOT NULL | - | FK to users.id (creator) |
| credential_id | UUID | NOT NULL | - | FK to credentials.id |
| name | VARCHAR(255) | NOT NULL | - | Draft name |
| description | TEXT | NULL | - | Draft description |
| cluster_name | VARCHAR(255) | NOT NULL | - | Cluster name |
| cloud_provider | VARCHAR(255) | NOT NULL | - | Cloud provider |
| configuration | JSONB | NOT NULL | '{}' | Draft configuration |
| estimated_monthly_cost | DECIMAL(10,2) | NULL | - | Cost estimate |
| cost_breakdown | JSONB | NULL | - | Cost breakdown |
| status | VARCHAR(50) | NOT NULL | 'draft' | Draft status |
| approved_by | UUID | NULL | - | FK to users.id (approver) |
| approved_at | TIMESTAMP TZ | NULL | - | Approval timestamp |
| approval_comment | TEXT | NULL | - | Approval notes |
| rejection_reason | TEXT | NULL | - | Rejection reason |
| test_results | JSONB | NULL | - | Pre-deployment test results |
| tested_at | TIMESTAMP TZ | NULL | - | Test timestamp |
| deployment_id | UUID | NULL | - | FK to deployments.id (if deployed) |
| tags | TEXT[] | NULL | '{}' | User-defined tags |
| metadata | JSONB | NULL | '{}' | Additional metadata |
| created_at | TIMESTAMP TZ | NOT NULL | NOW() | Record creation timestamp |
| updated_at | TIMESTAMP TZ | NOT NULL | NOW() | Record update timestamp |

**Indexes:**
- PRIMARY KEY: deployment_drafts_pkey (id)
- INDEX: idx_deployment_drafts_user_id (user_id)
- INDEX: idx_deployment_drafts_status (status)
- INDEX: idx_deployment_drafts_cloud_provider (cloud_provider)
- INDEX: idx_deployment_drafts_approved_by (approved_by)
- INDEX: idx_deployment_drafts_created_at (created_at)

**Foreign Keys:**
- deployment_drafts_user_id_fkey: user_id → users(id) ON DELETE CASCADE
- deployment_drafts_credential_id_fkey: credential_id → credentials(id) ON DELETE CASCADE
- deployment_drafts_approved_by_fkey: approved_by → users(id) ON DELETE SET NULL
- deployment_drafts_deployment_id_fkey: deployment_id → deployments(id) ON DELETE SET NULL

**Status Values:** draft, pending_approval, approved, rejected, deployed

**Check Constraints:**
- status IN ('draft', 'pending_approval', 'approved', 'rejected', 'deployed')

---

### 5. deployment_logs
**Purpose:** Stores deployment execution logs and events

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | Primary key |
| deployment_id | UUID | NOT NULL | - | FK to deployments.id |
| log_level | VARCHAR(50) | NOT NULL | 'info' | Log level |
| phase | VARCHAR(100) | NOT NULL | - | Deployment phase |
| message | TEXT | NOT NULL | - | Log message |
| details | JSONB | NULL | '{}' | Additional details |
| error_code | VARCHAR(50) | NULL | - | Error code if applicable |
| source | VARCHAR(100) | NULL | - | Log source |
| terraform_output | TEXT | NULL | - | Raw Terraform output |
| timestamp | TIMESTAMP TZ | NOT NULL | NOW() | Log timestamp |
| duration_ms | INTEGER | NULL | - | Operation duration |
| created_at | TIMESTAMP TZ | NOT NULL | NOW() | Record creation timestamp |
| updated_at | TIMESTAMP TZ | NOT NULL | NOW() | Record update timestamp |

**Indexes:**
- PRIMARY KEY: deployment_logs_pkey (id)
- INDEX: deployment_logs_deployment_id (deployment_id)
- INDEX: deployment_logs_log_level (log_level)
- INDEX: deployment_logs_phase (phase)
- INDEX: deployment_logs_timestamp (timestamp)

**Foreign Keys:**
- deployment_logs_deployment_id_fkey: deployment_id → deployments(id) ON DELETE CASCADE

**Log Levels:** debug, info, warn, error, critical

---

### 6. deployment_sql_scripts
**Purpose:** SQL scripts for post-deployment database initialization

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | Primary key |
| deployment_id | UUID | NOT NULL | - | FK to deployments.id |
| script_name | VARCHAR(255) | NOT NULL | - | Script filename |
| script_content | TEXT | NOT NULL | - | SQL script content |
| execution_order | INTEGER | NOT NULL | 0 | Script execution order |
| status | VARCHAR(50) | NOT NULL | 'pending' | Execution status |
| executed_at | TIMESTAMP TZ | NULL | - | Execution timestamp |
| execution_duration_ms | INTEGER | NULL | - | Execution time |
| execution_output | TEXT | NULL | - | Script output |
| error_message | TEXT | NULL | - | Error details |
| uploaded_by | UUID | NULL | - | FK to users.id |
| description | TEXT | NULL | - | Script description |
| is_rollback_script | BOOLEAN | NULL | false | Rollback script flag |
| rollback_for_script_id | UUID | NULL | - | Related script ID |
| metadata | JSONB | NULL | '{}' | Additional metadata |
| created_at | TIMESTAMP TZ | NOT NULL | NOW() | Record creation timestamp |
| updated_at | TIMESTAMP TZ | NOT NULL | NOW() | Record update timestamp |

**Indexes:**
- PRIMARY KEY: deployment_sql_scripts_pkey (id)
- INDEX: deployment_sql_scripts_deployment_id (deployment_id)
- INDEX: deployment_sql_scripts_status (status)
- INDEX: deployment_sql_scripts_execution_order (execution_order)

**Foreign Keys:**
- deployment_sql_scripts_deployment_id_fkey: deployment_id → deployments(id) ON UPDATE CASCADE ON DELETE CASCADE
- deployment_sql_scripts_uploaded_by_fkey: uploaded_by → users(id) ON UPDATE CASCADE ON DELETE SET NULL

**Status Values:** pending, running, completed, failed, skipped

---

### 7. audit_logs
**Purpose:** Comprehensive audit trail for all system actions

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | Primary key |
| user_id | UUID | NULL | - | FK to users.id |
| action | VARCHAR(255) | NOT NULL | - | Action performed |
| resource_type | VARCHAR(100) | NULL | - | Resource type affected |
| resource_id | VARCHAR(255) | NULL | - | Resource ID |
| changes | JSONB | NULL | - | Change details |
| ip_address | VARCHAR(45) | NULL | - | Client IP address |
| user_agent | TEXT | NULL | - | Client user agent |
| status | VARCHAR(50) | NOT NULL | 'success' | Action status |
| error_message | TEXT | NULL | - | Error details |
| metadata | JSONB | NULL | '{}' | Additional context |
| session_id | VARCHAR(255) | NULL | - | Session identifier |
| request_id | VARCHAR(255) | NULL | - | Request identifier |
| severity | VARCHAR(50) | NULL | 'info' | Log severity |
| timestamp | TIMESTAMP TZ | NOT NULL | NOW() | Action timestamp |
| created_at | TIMESTAMP TZ | NOT NULL | NOW() | Record creation timestamp |

**Indexes:**
- PRIMARY KEY: audit_logs_pkey (id)
- INDEX: audit_logs_user_id (user_id)
- INDEX: audit_logs_action (action)
- INDEX: audit_logs_resource_type (resource_type)
- INDEX: audit_logs_timestamp (timestamp)
- INDEX: audit_logs_status (status)

**Foreign Keys:**
- audit_logs_user_id_fkey: user_id → users(id) ON DELETE SET NULL

---

### 8. alert_channel_configs
**Purpose:** Encrypted notification channel configurations

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | Primary key |
| user_id | UUID | NOT NULL | - | FK to users.id |
| name | VARCHAR(255) | NOT NULL | - | Channel name |
| description | TEXT | NULL | - | Channel description |
| channel_type | VARCHAR(50) | NOT NULL | - | Channel type |
| enabled | BOOLEAN | NULL | true | Channel enabled |
| smtp_host | VARCHAR(255) | NULL | - | SMTP host (email) |
| smtp_port | INTEGER | NULL | - | SMTP port (email) |
| smtp_secure | BOOLEAN | NULL | true | SMTP TLS/SSL (email) |
| smtp_user | VARCHAR(255) | NULL | - | SMTP username (email) |
| encrypted_smtp_password | TEXT | NULL | - | Encrypted SMTP password |
| smtp_password_iv | VARCHAR(255) | NULL | - | SMTP password IV |
| smtp_password_auth_tag | VARCHAR(255) | NULL | - | SMTP password auth tag |
| email_recipients | TEXT | NULL | - | Email recipients (comma-separated) |
| email_from | VARCHAR(255) | NULL | - | Sender email address |
| encrypted_slack_webhook_url | TEXT | NULL | - | Encrypted Slack webhook |
| slack_webhook_iv | VARCHAR(255) | NULL | - | Slack webhook IV |
| slack_webhook_auth_tag | VARCHAR(255) | NULL | - | Slack webhook auth tag |
| slack_webhook_hash | VARCHAR(255) | NULL | - | Slack webhook hash |
| slack_channel | VARCHAR(255) | NULL | - | Slack channel name |
| encrypted_webhook_url | TEXT | NULL | - | Encrypted custom webhook URL |
| webhook_url_iv | VARCHAR(255) | NULL | - | Webhook URL IV |
| webhook_url_auth_tag | VARCHAR(255) | NULL | - | Webhook URL auth tag |
| webhook_url_hash | VARCHAR(255) | NULL | - | Webhook URL hash |
| webhook_auth_type | VARCHAR(50) | NULL | 'none' | Webhook auth type |
| encrypted_webhook_auth | TEXT | NULL | - | Encrypted webhook auth |
| webhook_auth_iv | VARCHAR(255) | NULL | - | Webhook auth IV |
| webhook_auth_auth_tag | VARCHAR(255) | NULL | - | Webhook auth auth tag |
| webhook_method | VARCHAR(10) | NULL | 'POST' | Webhook HTTP method |
| last_tested_at | TIMESTAMP TZ | NULL | - | Last test timestamp |
| last_test_result | TEXT | NULL | - | Last test result |
| failure_count | INTEGER | NULL | 0 | Consecutive failures |
| last_failure_at | TIMESTAMP TZ | NULL | - | Last failure timestamp |
| tags | JSONB | NULL | '[]' | User-defined tags |
| metadata | JSONB | NULL | '{}' | Additional metadata |
| is_test | BOOLEAN | NULL | false | Test config flag |
| created_at | TIMESTAMP TZ | NOT NULL | NOW() | Record creation timestamp |
| updated_at | TIMESTAMP TZ | NOT NULL | NOW() | Record update timestamp |
| deleted_at | TIMESTAMP TZ | NULL | - | Soft delete timestamp |

**Indexes:**
- PRIMARY KEY: alert_channel_configs_pkey (id)
- INDEX: idx_alert_channel_configs_user_id (user_id)
- INDEX: idx_alert_channel_configs_channel_type (channel_type)
- INDEX: idx_alert_channel_configs_enabled (enabled)
- INDEX: idx_alert_channel_configs_deleted_at (deleted_at)

**Foreign Keys:**
- alert_channel_configs_user_id_fkey: user_id → users(id) ON DELETE CASCADE

**Check Constraints:**
- channel_type IN ('email', 'slack', 'webhook')
- smtp_port BETWEEN 1 AND 65535
- webhook_auth_type IN ('none', 'bearer', 'api-key', 'basic')
- webhook_method IN ('GET', 'POST', 'PUT', 'PATCH')

**Security Notes:**
- All sensitive fields encrypted with AES-256-GCM
- Separate IV and auth tag for each encrypted field
- Webhook URLs hashed for validation without plaintext storage
- Soft delete support (paranoid mode)

---

### 9. teams
**Purpose:** Team/organization management for resource sharing

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | Primary key |
| name | VARCHAR(255) | NOT NULL | - | Team name |
| description | TEXT | NULL | - | Team description |
| owner_id | UUID | NOT NULL | - | FK to users.id (team owner) |
| is_active | BOOLEAN | NULL | true | Team active status |
| settings | JSONB | NULL | '{}' | Team settings |
| tags | JSONB | NULL | '[]' | User-defined tags |
| metadata | JSONB | NULL | '{}' | Additional metadata |
| max_members | INTEGER | NULL | - | Maximum members allowed |
| created_at | TIMESTAMP TZ | NOT NULL | NOW() | Record creation timestamp |
| updated_at | TIMESTAMP TZ | NOT NULL | NOW() | Record update timestamp |

**Indexes:**
- PRIMARY KEY: teams_pkey (id)
- UNIQUE: teams_name_key (name)
- INDEX: teams_owner_id (owner_id)
- INDEX: teams_is_active (is_active)

**Foreign Keys:**
- teams_owner_id_fkey: owner_id → users(id) ON DELETE CASCADE

---

### 10. team_members
**Purpose:** Team membership and role assignments

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | Primary key |
| team_id | UUID | NOT NULL | - | FK to teams.id |
| user_id | UUID | NOT NULL | - | FK to users.id |
| role | VARCHAR(50) | NOT NULL | 'viewer' | Member role in team |
| status | VARCHAR(50) | NOT NULL | 'active' | Membership status |
| invited_by | UUID | NULL | - | FK to users.id (inviter) |
| invited_at | TIMESTAMP TZ | NULL | - | Invitation timestamp |
| joined_at | TIMESTAMP TZ | NULL | - | Join timestamp |
| permissions | JSONB | NULL | '[]' | Custom permissions |
| metadata | JSONB | NULL | '{}' | Additional metadata |
| last_activity | TIMESTAMP TZ | NULL | - | Last activity timestamp |
| created_at | TIMESTAMP TZ | NOT NULL | NOW() | Record creation timestamp |
| updated_at | TIMESTAMP TZ | NOT NULL | NOW() | Record update timestamp |

**Indexes:**
- PRIMARY KEY: team_members_pkey (id)
- UNIQUE: team_members_team_id_user_id_key (team_id, user_id)
- INDEX: team_members_team_id (team_id)
- INDEX: team_members_user_id (user_id)
- INDEX: team_members_status (status)

**Foreign Keys:**
- team_members_team_id_fkey: team_id → teams(id) ON DELETE CASCADE
- team_members_user_id_fkey: user_id → users(id) ON DELETE CASCADE
- team_members_invited_by_fkey: invited_by → users(id)

**Role Values:** admin, operator, viewer

---

### 11. shared_resources
**Purpose:** Tracks shared deployments and credentials between teams

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | Primary key |
| team_id | UUID | NOT NULL | - | FK to teams.id |
| resource_type | VARCHAR(100) | NOT NULL | - | Resource type |
| resource_id | UUID | NOT NULL | - | Resource ID |
| shared_by | UUID | NULL | - | FK to users.id (sharer) |
| shared_at | TIMESTAMP TZ | NULL | NOW() | Share timestamp |
| permissions | JSONB | NULL | '["read"]' | Granted permissions |
| expires_at | TIMESTAMP TZ | NULL | - | Share expiration |
| is_active | BOOLEAN | NULL | true | Share active status |
| access_count | INTEGER | NULL | 0 | Access counter |
| last_accessed_at | TIMESTAMP TZ | NULL | - | Last access timestamp |
| metadata | JSONB | NULL | '{}' | Additional metadata |
| created_at | TIMESTAMP TZ | NOT NULL | NOW() | Record creation timestamp |
| updated_at | TIMESTAMP TZ | NOT NULL | NOW() | Record update timestamp |

**Indexes:**
- PRIMARY KEY: shared_resources_pkey (id)
- INDEX: shared_resources_team_id (team_id)
- INDEX: shared_resources_resource_type (resource_type)
- INDEX: shared_resources_resource_id (resource_id)
- INDEX: shared_resources_is_active (is_active)

**Foreign Keys:**
- shared_resources_team_id_fkey: team_id → teams(id) ON DELETE CASCADE
- shared_resources_shared_by_fkey: shared_by → users(id)

**Resource Types:** deployment, credential, template

---

## Relationships & Foreign Keys

### Complete Foreign Key Map

| Table | Column | References | On Delete | On Update |
|-------|--------|------------|-----------|-----------|
| alert_channel_configs | user_id | users(id) | CASCADE | - |
| audit_logs | user_id | users(id) | SET NULL | - |
| credentials | user_id | users(id) | CASCADE | - |
| deployment_drafts | user_id | users(id) | CASCADE | - |
| deployment_drafts | credential_id | credentials(id) | CASCADE | - |
| deployment_drafts | approved_by | users(id) | SET NULL | - |
| deployment_drafts | deployment_id | deployments(id) | SET NULL | - |
| deployment_logs | deployment_id | deployments(id) | CASCADE | - |
| deployment_sql_scripts | deployment_id | deployments(id) | CASCADE | CASCADE |
| deployment_sql_scripts | uploaded_by | users(id) | SET NULL | CASCADE |
| deployments | user_id | users(id) | CASCADE | - |
| deployments | credential_id | credentials(id) | CASCADE | - |
| shared_resources | team_id | teams(id) | CASCADE | - |
| shared_resources | shared_by | users(id) | - | - |
| team_members | team_id | teams(id) | CASCADE | - |
| team_members | user_id | users(id) | CASCADE | - |
| team_members | invited_by | users(id) | - | - |
| teams | owner_id | users(id) | CASCADE | - |

**Total Foreign Keys:** 18

---

## Indexes

### Summary by Table

**alert_channel_configs (5 indexes):**
- PRIMARY KEY: id
- INDEX: user_id, channel_type, enabled, deleted_at

**audit_logs (6 indexes):**
- PRIMARY KEY: id
- INDEX: user_id, action, resource_type, timestamp, status

**credentials (4 indexes):**
- PRIMARY KEY: id
- UNIQUE: (none)
- INDEX: user_id, aws_account_id, is_active

**deployment_drafts (6 indexes):**
- PRIMARY KEY: id
- INDEX: user_id, status, cloud_provider, approved_by, created_at

**deployment_logs (5 indexes):**
- PRIMARY KEY: id
- INDEX: deployment_id, log_level, phase, timestamp

**deployment_sql_scripts (4 indexes):**
- PRIMARY KEY: id
- INDEX: deployment_id, status, execution_order

**deployments (6 indexes):**
- PRIMARY KEY: id
- INDEX: user_id, credential_id, status, cluster_name, cloud_provider

**shared_resources (5 indexes):**
- PRIMARY KEY: id
- INDEX: team_id, resource_type, resource_id, is_active

**team_members (5 indexes):**
- PRIMARY KEY: id
- UNIQUE: (team_id, user_id)
- INDEX: team_id, user_id, status

**teams (4 indexes):**
- PRIMARY KEY: id
- UNIQUE: name
- INDEX: owner_id, is_active

**users (2 indexes):**
- PRIMARY KEY: id
- UNIQUE: email

**Total Indexes:** 52

---

## Constraints

### Check Constraints

**deployment_drafts:**
- status IN ('draft', 'pending_approval', 'approved', 'rejected', 'deployed')

**alert_channel_configs:**
- channel_type IN ('email', 'slack', 'webhook')
- smtp_port >= 1 AND smtp_port <= 65535
- webhook_auth_type IN ('none', 'bearer', 'api-key', 'basic')
- webhook_method IN ('GET', 'POST', 'PUT', 'PATCH')

### Unique Constraints

- users.email (UNIQUE)
- teams.name (UNIQUE)
- team_members (team_id, user_id) (UNIQUE COMPOSITE)

### NOT NULL Constraints

**Critical NOT NULL fields by table:**
- users: id, email, password_hash, created_at, updated_at
- credentials: id, user_id, name, aws_account_id, encrypted_access_key_id, encrypted_secret_access_key, encryption_iv, created_at, updated_at
- deployments: id, user_id, credential_id, cluster_name, region, status, configuration, created_at, updated_at
- deployment_drafts: id, user_id, credential_id, name, cluster_name, cloud_provider, configuration, status, created_at, updated_at
- deployment_logs: id, deployment_id, log_level, phase, message, timestamp, created_at, updated_at

---

## Current Data Summary

### Users Table (4 records)
- 4 active user accounts
- Roles distribution: (to be queried)
- MFA enabled: (to be queried)

### Credentials Table (1 record)
- 1 AWS credential configured
- Cloud provider: AWS
- Region: us-west-1
- Validation status: Active

### Deployments Table (0 records)
- No active deployments
- Historical data may exist in logs

### Deployment Drafts Table (1 record)
- 1 draft configuration
- Status: (to be queried)
- Awaiting approval/deployment

### Audit Logs Table
- Multiple entries tracking system actions
- Comprehensive audit trail maintained

### Deployment Logs Table
- Multiple log entries
- Deployment history preserved

### Other Tables (0 records each)
- alert_channel_configs: No alert channels configured
- deployment_sql_scripts: No SQL scripts uploaded
- shared_resources: No shared resources
- team_members: No team memberships
- teams: No teams created

---

## Database Maintenance

### Backup Strategy
- Automated daily backups recommended
- Point-in-time recovery capability
- Retain backups for 30 days minimum

### Monitoring Metrics
- Connection pool utilization
- Query performance
- Table bloat (especially audit_logs, deployment_logs)
- Index usage statistics

### Optimization Opportunities
1. **Partitioning candidates:**
   - audit_logs (by timestamp)
   - deployment_logs (by timestamp)

2. **Archival candidates:**
   - Old audit_logs (>90 days)
   - Completed deployment_logs (>60 days)

3. **Index review:**
   - Monitor unused indexes
   - Consider composite indexes for common query patterns

---

## Security Considerations

### Encrypted Fields
**credentials table:**
- encrypted_access_key_id (AES-256-GCM)
- encrypted_secret_access_key (AES-256-GCM)
- encryption_iv (unique per credential)
- auth_tag (for authentication)

**alert_channel_configs table:**
- encrypted_smtp_password
- encrypted_slack_webhook_url
- encrypted_webhook_url
- encrypted_webhook_auth
- Each with separate IV and auth tag

### Sensitive Data
- User password_hash (bcrypt)
- MFA secrets
- API keys and tokens
- IP addresses (GDPR consideration)
- User agents

### Access Control
- Role-based access control (RBAC) via users.role
- Team-based permissions via team_members.role
- Resource sharing via shared_resources

### Audit Trail
- All actions logged in audit_logs
- User attribution via user_id
- IP address and user agent tracking
- Request/session correlation

---

## Migration History

### Manual Migrations Applied
1. **2025-11-26 08:12** - Created deployment_drafts table
2. **2025-11-26 09:00** - Created alert_channel_configs table
3. **Ongoing** - Manual schema management (auto-sync disabled)

### Sequelize Meta Table
Table exists to track migrations (currently empty or minimal)

---

## Application Integration

### Models (Sequelize ORM)
All tables have corresponding Sequelize models in:
`backend/src/models/`

**Model Files:**
- User.js
- Credential.js
- Deployment.js
- deploymentDraft.js
- DeploymentLog.js (factory function)
- DeploymentSqlScript.js (factory function)
- AuditLog.js
- AlertChannelConfig.js
- Team.js (factory function)
- TeamMember.js (factory function)
- SharedResource.js (factory function)

### API Endpoints
Database accessed through 15 route modules:
- /api/auth
- /api/users
- /api/credentials
- /api/deployments
- /api/deployment-drafts
- /api/clusters
- /api/status
- /api/analytics
- /api/alerts
- /api/logs
- /api/templates
- /api/teams
- /api/cost
- /api/admin
- /api/deployments/:deploymentId/sql-scripts

---

## Database Connection

### Connection Details
- **Host:** eks-deployer-postgres (Docker container)
- **Port:** 5432
- **Database:** eks_deployer
- **User:** eks_user
- **SSL:** Not required (internal Docker network)
- **Pool Size:** Configured in application
- **Idle Timeout:** Configured in application

### Connection String Format
```
postgresql://eks_user:<password>@eks-deployer-postgres:5432/eks_deployer
```

---

## Notes

### Recent Changes
- 2025-11-26: Added alert_channel_configs table for notification system
- 2025-11-26: Created deployment_drafts table for approval workflow
- 2025-11-26: Fixed credential encryption schema (consolidated to single IV/authTag)

### Known Issues
- None currently identified

### Future Enhancements
1. Implement table partitioning for logs
2. Add database-level encryption at rest
3. Implement automated archival procedures
4. Add read replicas for analytics queries
5. Implement connection pooling optimization

---

**Document Version:** 1.0  
**Last Updated:** November 26, 2025 09:15  
**Maintained By:** Development Team  
**Review Frequency:** Monthly or after schema changes
