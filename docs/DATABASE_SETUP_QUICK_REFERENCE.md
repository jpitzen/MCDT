# Database Deployment & Build - Quick Reference

## ✓ Status: COMPLETE & OPERATIONAL

**Deployment Date:** November 19, 2025  
**Deployment Time:** ~2 minutes  
**Database:** PostgreSQL 14 Alpine (Docker)  
**Status:** ✓ Running and verified  

---

## 📊 Database Overview

| Component | Details |
|-----------|---------|
| **Engine** | PostgreSQL 14 Alpine |
| **Container** | zlaws-postgres |
| **Database** | eks_deployer_dev |
| **Host** | localhost:5432 |
| **Connection** | ✓ Active & Verified |
| **Tables** | 5 application + 1 metadata |
| **Columns** | 72 total |
| **Indexes** | 13 (performance optimized) |
| **Seeded Data** | 3 test users |

---

## 🗄️ Table Structure

### 1. `users` (12 columns, 3 records)
Stores user accounts and authentication data
- **Primary Fields:** id, email, password_hash, role
- **Seeded:** admin, operator, viewer test accounts
- **Indexes:** 1 (primary key)

### 2. `credentials` (19 columns, 0 records)
Stores encrypted AWS credential pairs per user
- **Primary Fields:** id, user_id, aws_account_id, encrypted_access_key_id, encrypted_secret_access_key
- **Encryption:** AES-256-GCM
- **Indexes:** 3 (user_id, aws_account_id, is_active)

### 3. `deployments` (22 columns, 0 records)
Tracks EKS deployment operations and status
- **Primary Fields:** id, credential_id, user_id, cluster_name, status, progress
- **Status Values:** pending, running, paused, completed, failed, rolled_back
- **Indexes:** 4 (credential_id, user_id, status, created_at)

### 4. `audit_logs` (16 columns, 0 records)
Logs all user actions for compliance and debugging
- **Primary Fields:** id, user_id, action, resource_type, action_status
- **Tracked:** IP address, user-agent, request path, changes
- **Indexes:** 5 (user_id, action, resource_type, action_status, created_at)

### 5. `SequelizeMeta` (1 column, 1 record)
Migration tracking metadata (Sequelize ORM)
- **Records:** 20250101000000-init

---

## 👥 Test Users

| Email | Password | Role | Status |
|-------|----------|------|--------|
| admin@eks-deployer.local | admin123 | admin | ✓ Active |
| operator@eks-deployer.local | operator123 | operator | ✓ Active |
| viewer@eks-deployer.local | viewer123 | viewer | ✓ Active |

---

## 🔧 Files Created

### Configuration
- `.env` - Database connection settings

### Scripts
- `scripts/setup-database.ps1` - Windows PowerShell setup script
- `scripts/setup-database.sh` - Mac/Linux Bash setup script
- `backend/verify-db.js` - Database verification tool

### Documentation
- `DATABASE_DEPLOYMENT_COMPLETE.txt` - Full deployment details
- `DATABASE_SETUP_QUICK_REFERENCE.md` - This file

---

## 🚀 Quick Start Commands

### Start Backend Server
```bash
cd backend
npm run dev
```
Expected: Server running on `http://localhost:5000`

### Test Database Connection
```bash
curl http://localhost:5000/health
```
Expected: 200 OK with database status

### Test User Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@eks-deployer.local",
    "password": "admin123"
  }'
```
Expected: JWT token returned

### Verify Database
```bash
cd backend && node verify-db.js
```
Expected: All tables confirmed with seeded data

---

## 🔐 Security Features

- ✓ **Password Hashing:** Bcrypt (10 rounds)
- ✓ **Credential Encryption:** AES-256-GCM
- ✓ **Database Constraints:** Foreign keys, unique fields
- ✓ **Audit Logging:** All user actions tracked
- ✓ **Role-Based Access:** admin, operator, viewer roles
- ✓ **Data Integrity:** Cascading deletes, NOT NULL constraints

---

## 📊 Performance Optimizations

### Indexes (13 total)
- **credentials:** 3 indexes (user_id, aws_account_id, is_active)
- **deployments:** 4 indexes (credential_id, user_id, status, created_at)
- **audit_logs:** 5 indexes (user_id, action, resource_type, action_status, created_at)
- **users:** 1 primary key index

### Expected Query Times
- User lookup by email: <1ms
- Deployments by status: <5ms
- Audit logs for user: <5ms
- Full table scans: <50ms

---

## 🔄 Database Management Commands

### View Migration Status
```bash
npm run db:migrate:status
```

### Undo Last Migration
```bash
npm run db:migrate:undo
```

### Undo All Migrations
```bash
npm run db:migrate:undo:all
```

### Re-apply Migrations
```bash
npm run db:migrate
```

### Re-seed Database
```bash
npm run db:seed
```

---

## 📝 Setup Scripts

### Windows PowerShell
```powershell
# Full setup (all steps)
./scripts/setup-database.ps1 -Action all

# Individual steps
./scripts/setup-database.ps1 -Action setup     # Prerequisites only
./scripts/setup-database.ps1 -Action migrate   # Run migrations
./scripts/setup-database.ps1 -Action seed      # Run seeders
./scripts/setup-database.ps1 -Action reset     # Reset database
./scripts/setup-database.ps1 -Action status    # Check status
```

### Mac/Linux Bash
```bash
# Full setup (all steps)
bash scripts/setup-database.sh all

# Individual steps
bash scripts/setup-database.sh setup      # Prerequisites only
bash scripts/setup-database.sh migrate    # Run migrations
bash scripts/setup-database.sh seed       # Run seeders
bash scripts/setup-database.sh reset      # Reset database
bash scripts/setup-database.sh status     # Check status
```

---

## 🐳 Docker Commands

### Check Container Status
```bash
docker ps | grep zlaws-postgres
```

### View Container Logs
```bash
docker logs zlaws-postgres
```

### Connect to PostgreSQL
```bash
docker exec -it zlaws-postgres psql -U postgres -d eks_deployer_dev
```

### Stop Container
```bash
docker stop zlaws-postgres
```

### Start Container
```bash
docker start zlaws-postgres
```

### Remove Container (WARNING: data loss)
```bash
docker rm -v zlaws-postgres
```

---

## ✓ Deployment Checklist

- [x] Environment configuration (.env) created
- [x] PostgreSQL 14 Alpine Docker container running
- [x] npm dependencies installed (595 packages)
- [x] Database migrations executed (5 tables created)
- [x] Performance indexes created (13 total)
- [x] Database seeders executed (3 users inserted)
- [x] Foreign key relationships established
- [x] Encryption configured for credentials
- [x] Audit logging system ready
- [x] Database connection verified
- [x] Setup scripts created (Windows + Unix)
- [x] Verification script created
- [x] Documentation completed

---

## 🎯 Next Steps

1. **Start Backend Server**
   ```bash
   cd backend && npm run dev
   ```

2. **Test Connection**
   ```bash
   curl http://localhost:5000/health
   ```

3. **Authenticate**
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@eks-deployer.local","password":"admin123"}'
   ```

4. **Create Credentials**
   - Add AWS credentials for EKS deployments
   - Credentials are encrypted before storage

5. **Start Deployments**
   - Launch EKS deployments using stored credentials
   - Monitor deployment progress and logs

---

## 📞 Troubleshooting

### Database Connection Failed
```bash
# Check if PostgreSQL container is running
docker ps | grep zlaws-postgres

# Start container if stopped
docker start zlaws-postgres

# Wait 5 seconds for startup, then verify
docker logs zlaws-postgres
```

### Migration Failed
```bash
# Check current migration status
npm run db:migrate:status

# Undo and retry
npm run db:migrate:undo
npm run db:migrate
```

### Tables Not Found
```bash
# Verify database connection
cd backend && node verify-db.js

# Re-run migrations if needed
npm run db:migrate
```

---

## 📚 Additional Resources

- **Full Documentation:** `DATABASE_DEPLOYMENT_COMPLETE.txt`
- **Verification Tool:** `backend/verify-db.js`
- **Setup Scripts:** `scripts/setup-database.ps1` and `scripts/setup-database.sh`
- **Configuration:** `.env` file in project root

---

**Status:** ✓ Database deployment complete and operational  
**Ready for:** Backend API server startup  
**Deployment Date:** November 19, 2025  

