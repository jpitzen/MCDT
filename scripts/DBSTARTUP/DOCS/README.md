# EKS Deployer - Database Documentation

## Overview

The EKS Deployer application uses PostgreSQL 15 (Alpine) as its primary database, running in a Docker container with persistent storage.

## 📚 Documentation Structure

- **[README.md](README.md)** - This file (Quick start & operations)
- **[PERSISTENCE.md](PERSISTENCE.md)** - Data persistence & backup strategies
- **[DATABASE-ARCHITECTURE.md](DATABASE-ARCHITECTURE.md)** - Code architecture & cohesion analysis

---

## Quick Start

### Windows (PowerShell)
```powershell
.\scripts\DBSTARTUP\start-database.ps1
```

### Linux/Mac (Bash)
```bash
chmod +x ./scripts/DBSTARTUP/start-database.sh
./scripts/DBSTARTUP/start-database.sh
```

---

## Database Configuration

### Connection Details

| Property | Value |
|----------|-------|
| **Host** | localhost |
| **Port** | 5432 |
| **Database** | eks_deployer |
| **Username** | eks_user |
| **Password** | eks_password_123 |
| **Image** | postgres:15-alpine |
| **Container** | eks-deployer-postgres |

### Environment Variables (backend/.env)

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eks_deployer
DB_USER=eks_user
DB_PASSWORD=eks_password_123
```

---

## Data Persistence

### Volume Configuration

The database uses Docker named volumes for data persistence:

```yaml
volumes:
  postgres_data:/var/lib/postgresql/data
```

**Benefits:**
- ✅ Data survives container removal (`docker-compose down`)
- ✅ Data survives container recreation (`docker-compose up --force-recreate`)
- ✅ Data persists across Docker restarts
- ✅ Data persists across host reboots (with `restart: unless-stopped`)

### Restart Policy

```yaml
restart: unless-stopped
```

The database container will automatically restart:
- ✅ After host system reboot
- ✅ After Docker daemon restart
- ✅ If the container crashes
- ❌ NOT if manually stopped (`docker stop`)

### Volume Location

**Windows:**
```
\\wsl$\docker-desktop-data\data\docker\volumes\automated-eks-deployer_postgres_data\_data
```

**Linux:**
```
/var/lib/docker/volumes/automated-eks-deployer_postgres_data/_data
```

**Mac:**
```
~/Library/Containers/com.docker.docker/Data/vms/0/data/docker/volumes/automated-eks-deployer_postgres_data/_data
```

---

## Database Schema

### Tables

1. **users** - User accounts and authentication
   - 12 columns
   - Roles: admin, approver, operator, viewer
   - Password hashing: bcrypt (10 rounds)

2. **credentials** - Cloud provider credentials (encrypted)
   - 19 columns
   - Encryption: AES-256-GCM
   - Foreign key: user_id → users(id)

3. **deployments** - Kubernetes deployment tracking
   - 22 columns
   - Status: pending, running, paused, completed, failed, rolled_back
   - Foreign keys: credential_id, user_id

4. **deployment_logs** - Real-time deployment logs
   - 11 columns
   - Log levels: debug, info, warn, error, fatal
   - Foreign key: deployment_id → deployments(id)

5. **deployment_sql_scripts** - Custom SQL script execution
   - 17 columns
   - Status: pending, running, completed, failed, skipped
   - Foreign key: deployment_id → deployments(id)

6. **audit_logs** - Audit trail for all user actions
   - 16 columns
   - Tracks: IP address, user-agent, request path, changes
   - Foreign key: user_id → users(id)

7. **teams** - Team management
   - 10 columns
   - Foreign key: owner_id → users(id)

8. **team_members** - Team membership
   - 12 columns
   - Roles: admin, operator, viewer, custom
   - Foreign keys: team_id → teams(id), user_id → users(id)

9. **shared_resources** - Resource sharing between teams
   - 13 columns
   - Resource types: deployment, credential, template, alert, log
   - Foreign keys: team_id → teams(id), shared_by → users(id)

10. **SequelizeMeta** - Migration tracking (Sequelize ORM)
    - 1 column
    - Tracks applied migrations

### Test Users

| Email | Password | Role | UUID |
|-------|----------|------|------|
| admin@eks-deployer.local | Admin@123456 | admin | 550e8400-e29b-41d4-a716-446655440000 |
| operator@eks-deployer.local | Operator@123456 | operator | 550e8400-e29b-41d4-a716-446655440001 |
| viewer@eks-deployer.local | Viewer@123456 | viewer | 550e8400-e29b-41d4-a716-446655440002 |

---

## Database Operations

### Start Database

```powershell
# Windows
.\scripts\DBSTARTUP\start-database.ps1

# Linux/Mac
./scripts/DBSTARTUP/start-database.sh
```

### Stop Database

```bash
docker-compose stop postgres
```

### Restart Database

```bash
docker-compose restart postgres
```

### View Logs

```bash
# Follow logs in real-time
docker-compose logs -f postgres

# View last 100 lines
docker-compose logs --tail=100 postgres
```

### Connect to Database

```bash
# PostgreSQL CLI
docker exec -it eks-deployer-postgres psql -U eks_user -d eks_deployer

# Once connected:
\dt              # List tables
\d users         # Describe users table
SELECT * FROM users;
\q               # Quit
```

### Check Database Status

```bash
# Check if container is running
docker ps --filter "name=eks-deployer-postgres"

# Check health status
docker inspect --format='{{.State.Health.Status}}' eks-deployer-postgres

# Check PostgreSQL version
docker exec eks-deployer-postgres psql -U eks_user -d eks_deployer -c "SELECT version();"
```

---

## Migrations

### Run Migrations

```bash
cd backend
npm run db:migrate
```

### Check Migration Status

```bash
cd backend
npm run db:migrate:status
```

### Undo Last Migration

```bash
cd backend
npm run db:migrate:undo
```

### Undo All Migrations

```bash
cd backend
npm run db:migrate:undo:all
```

---

## Seeders

### Run Seeders (Test Users)

```bash
cd backend
npm run db:seed
```

This creates 3 test users:
- admin@eks-deployer.local (role: admin)
- operator@eks-deployer.local (role: operator)
- viewer@eks-deployer.local (role: viewer)

### Undo Seeders

```bash
cd backend
npm run db:seed:undo
```

---

## Backup & Restore

### Backup Database

```bash
# Backup to SQL file
docker exec eks-deployer-postgres pg_dump -U eks_user eks_deployer > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup to compressed file
docker exec eks-deployer-postgres pg_dump -U eks_user eks_deployer | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore Database

```bash
# From SQL file
docker exec -i eks-deployer-postgres psql -U eks_user -d eks_deployer < backup.sql

# From compressed file
gunzip -c backup.sql.gz | docker exec -i eks-deployer-postgres psql -U eks_user -d eks_deployer
```

### Backup Volume

```bash
# Create backup of Docker volume
docker run --rm \
  -v automated-eks-deployer_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_volume_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

### Restore Volume

```bash
# Restore Docker volume from backup
docker run --rm \
  -v automated-eks-deployer_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres_volume_backup.tar.gz -C /data
```

---

## Troubleshooting

### Issue: Container won't start

**Check logs:**
```bash
docker-compose logs postgres
```

**Common causes:**
- Port 5432 already in use
- Volume permission issues
- Docker daemon not running

**Solution:**
```bash
# Check what's using port 5432
netstat -ano | findstr :5432  # Windows
lsof -i :5432                  # Linux/Mac

# Remove container and recreate
docker-compose down postgres
docker-compose up -d postgres
```

### Issue: Connection refused

**Check if container is running:**
```bash
docker ps --filter "name=eks-deployer-postgres"
```

**Check health status:**
```bash
docker inspect --format='{{.State.Health.Status}}' eks-deployer-postgres
```

**Solution:**
```bash
# Wait for health check to pass (up to 30 seconds)
# Or restart container
docker-compose restart postgres
```

### Issue: Data loss after reboot

**Check restart policy:**
```bash
docker inspect --format='{{.HostConfig.RestartPolicy.Name}}' eks-deployer-postgres
```

**Should return:** `unless-stopped`

**Fix restart policy:**
```bash
docker update --restart unless-stopped eks-deployer-postgres
```

### Issue: Volume not found

**List volumes:**
```bash
docker volume ls | grep postgres
```

**Expected:** `automated-eks-deployer_postgres_data`

**Recreate volume:**
```bash
docker-compose down
docker-compose up -d postgres
cd backend && npm run db:migrate && npm run db:seed
```

### Issue: Out of disk space

**Check volume size:**
```bash
docker system df -v | grep postgres_data
```

**Clean up:**
```bash
# Remove old logs
docker exec eks-deployer-postgres sh -c "find /var/lib/postgresql/data/log -name '*.log' -mtime +7 -delete"

# Vacuum database
docker exec eks-deployer-postgres psql -U eks_user -d eks_deployer -c "VACUUM FULL;"
```

---

## Performance Tuning

### PostgreSQL Configuration

Edit `docker-compose.yml` to add PostgreSQL parameters:

```yaml
postgres:
  command: 
    - "postgres"
    - "-c"
    - "max_connections=200"
    - "-c"
    - "shared_buffers=256MB"
    - "-c"
    - "effective_cache_size=1GB"
    - "-c"
    - "maintenance_work_mem=64MB"
```

### Indexes

The database includes 13 performance indexes:
- credentials: user_id, aws_account_id, is_active
- deployments: credential_id, user_id, status, created_at
- audit_logs: user_id, action, resource_type, action_status, created_at
- deployment_logs: deployment_id, log_level, log_type, created_at, expires_at

### Query Performance

```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze table
ANALYZE users;

-- Reindex table
REINDEX TABLE users;
```

---

## Security

### Password Security

**Production recommendations:**
1. Change default password in `docker-compose.yml`
2. Use strong passwords (min 16 characters)
3. Store credentials in `.env` file (gitignored)
4. Use Docker secrets for production

### Network Security

```yaml
# Restrict to localhost only
ports:
  - "127.0.0.1:5432:5432"
```

### Credential Encryption

All cloud credentials are encrypted before storage:
- Algorithm: AES-256-GCM
- Key: SECURE_ENCRYPTION_KEY environment variable
- IV: Unique per credential

---

## Monitoring

### Health Checks

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' eks-deployer-postgres

# View health check logs
docker inspect --format='{{json .State.Health}}' eks-deployer-postgres | jq
```

### Resource Usage

```bash
# Container stats
docker stats eks-deployer-postgres

# Disk usage
docker system df -v | grep postgres
```

### Connection Monitoring

```sql
-- Active connections
SELECT * FROM pg_stat_activity WHERE datname = 'eks_deployer';

-- Connection count
SELECT count(*) FROM pg_stat_activity WHERE datname = 'eks_deployer';

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'eks_deployer' 
  AND state = 'idle' 
  AND state_change < NOW() - INTERVAL '1 hour';
```

---

## Production Checklist

- [ ] Change default password
- [ ] Enable SSL/TLS connections
- [ ] Configure automated backups
- [ ] Set up monitoring/alerting
- [ ] Restrict network access
- [ ] Configure log rotation
- [ ] Enable query logging
- [ ] Set up replication (if HA required)
- [ ] Test restore procedures
- [ ] Document runbook

---

## Additional Resources

- **PostgreSQL Docs:** https://www.postgresql.org/docs/15/
- **Docker Volumes:** https://docs.docker.com/storage/volumes/
- **Sequelize ORM:** https://sequelize.org/docs/v6/
- **pgAdmin:** http://localhost:5050 (admin@example.com / admin)

---

**Last Updated:** November 26, 2025
