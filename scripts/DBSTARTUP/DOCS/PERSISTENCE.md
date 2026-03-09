# Database Persistence Configuration

## Overview

The PostgreSQL database supports two persistence modes:
1. **Kubernetes (Minikube)** - PersistentVolumeClaim with hostPath storage
2. **Docker Compose** - Named Docker volumes

---

## Kubernetes Persistence (Recommended for Development)

### Configuration

The Kubernetes Postgres deployment uses a StatefulSet with PersistentVolumeClaim:

**Manifest:** `kubernetes/postgres.yaml`

```yaml
# PersistentVolume - 5Gi storage on Minikube host
apiVersion: v1
kind: PersistentVolume
metadata:
  name: postgres-pv
spec:
  capacity:
    storage: 5Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: /data/postgres

---
# PersistentVolumeClaim
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: zlaws
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi

---
# StatefulSet mounts the PVC
spec:
  template:
    spec:
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
      containers:
      - name: postgres
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
          subPath: postgres
```

### Connection Details (Kubernetes)

| Property | Value |
|----------|-------|
| **Host** | localhost (via port-forward) |
| **Port** | 5432 |
| **Database** | zlaws_db |
| **Username** | zlaws_user |
| **Password** | ZLAWSSecurePass123! |
| **Pod** | postgres-0 |
| **Namespace** | zlaws |

### How Kubernetes Persistence Works

```
Pod Created (postgres-0)
      ↓
PVC Bound to PV (postgres-pvc → postgres-pv)
      ↓
hostPath Volume Mounted (/data/postgres)
      ↓
Data Written to Minikube VM
      ↓
Pod Deleted/Recreated
      ↓
PVC Still Bound ✓
      ↓
New Pod Mounts Same PVC
      ↓
Data Restored ✓
```

### Persistence Behavior (Kubernetes)

| Event | Data Persists? |
|-------|----------------|
| Pod restart | ✅ Yes |
| Pod deletion | ✅ Yes (PVC remains) |
| StatefulSet scaling | ✅ Yes |
| Minikube stop/start | ✅ Yes |
| Minikube delete | ❌ No (PV deleted) |
| Host reboot | ✅ Yes |

### Verify Kubernetes Persistence

```powershell
# Check PVC status
kubectl get pvc -n zlaws

# Check PV status
kubectl get pv

# Check pod volume mounts
kubectl describe pod -n zlaws postgres-0 | Select-String -Pattern "Volumes" -Context 0,10

# Test data persistence
kubectl exec -n zlaws postgres-0 -- psql -U zlaws_user -d zlaws_db -c "CREATE TABLE IF NOT EXISTS persist_test (id SERIAL, data TEXT);"
kubectl exec -n zlaws postgres-0 -- psql -U zlaws_user -d zlaws_db -c "INSERT INTO persist_test (data) VALUES ('test-$(Get-Date -Format s)');"
kubectl delete pod -n zlaws postgres-0
# Wait for pod to restart
kubectl exec -n zlaws postgres-0 -- psql -U zlaws_user -d zlaws_db -c "SELECT * FROM persist_test;"
```

### Backup (Kubernetes)

```powershell
# SQL dump via kubectl
kubectl exec -n zlaws postgres-0 -- pg_dump -U zlaws_user zlaws_db > backup.sql

# Compressed backup
kubectl exec -n zlaws postgres-0 -- pg_dump -U zlaws_user zlaws_db | gzip > backup_$(Get-Date -Format yyyyMMdd).sql.gz

# Restore
Get-Content backup.sql | kubectl exec -i -n zlaws postgres-0 -- psql -U zlaws_user -d zlaws_db
```

### Minikube Data Location

The PV hostPath data is stored inside the Minikube VM:

```powershell
# Access Minikube VM
minikube ssh

# View Postgres data
ls -la /data/postgres/
```

---

## Docker Compose Persistence

### Configuration

### Docker Compose Settings

```yaml
postgres:
  image: postgres:15-alpine
  container_name: eks-deployer-postgres
  restart: unless-stopped  # ← Auto-restart on reboot
  volumes:
    - postgres_data:/var/lib/postgresql/data  # ← Persistent volume

volumes:
  postgres_data:  # ← Named volume (persists on host)
```

### Restart Policy: `unless-stopped`

| Event | Behavior |
|-------|----------|
| Container crashes | ✅ Auto-restart |
| Docker daemon restarts | ✅ Auto-restart |
| Host system reboots | ✅ Auto-restart |
| Manual stop (`docker stop`) | ❌ Stays stopped |
| Manual removal (`docker rm`) | ❌ Volume persists, but container gone |

---

## How Persistence Works

### 1. Named Volume

Docker creates a named volume `automated-eks-deployer_postgres_data` that stores all database files:

```bash
# List volumes
docker volume ls | grep postgres_data

# Inspect volume
docker volume inspect automated-eks-deployer_postgres_data

# Output shows mount point:
{
  "Name": "automated-eks-deployer_postgres_data",
  "Mountpoint": "/var/lib/docker/volumes/automated-eks-deployer_postgres_data/_data"
}
```

**What's stored:**
- Database files (tables, indexes, data)
- Write-Ahead Log (WAL) files
- Configuration files
- Transaction logs

### 2. Volume Lifecycle

```
Container Created
      ↓
Volume Created (if not exists)
      ↓
Data Written to Volume
      ↓
Container Stopped/Removed
      ↓
Volume Persists ✓
      ↓
New Container Started
      ↓
Volume Mounted (data restored)
```

### 3. Restart Policy

```
Host Reboots
      ↓
Docker Daemon Starts
      ↓
Checks restart policy: "unless-stopped"
      ↓
Container Starts Automatically ✓
      ↓
Volume Mounted (data intact)
```

---

## Verification

### Check Restart Policy

```bash
docker inspect --format='{{.HostConfig.RestartPolicy.Name}}' eks-deployer-postgres
# Expected: unless-stopped
```

### Check Volume Mount

```bash
docker inspect --format='{{range .Mounts}}{{.Type}}: {{.Source}} → {{.Destination}}{{end}}' eks-deployer-postgres
# Expected: volume: automated-eks-deployer_postgres_data → /var/lib/postgresql/data
```

### Test Persistence

```bash
# 1. Insert test data
docker exec eks-deployer-postgres psql -U eks_user -d eks_deployer -c "CREATE TABLE test (id SERIAL, data TEXT);"
docker exec eks-deployer-postgres psql -U eks_user -d eks_deployer -c "INSERT INTO test (data) VALUES ('persistent data');"

# 2. Stop and remove container
docker-compose down postgres

# 3. Recreate container
docker-compose up -d postgres

# 4. Verify data persists
docker exec eks-deployer-postgres psql -U eks_user -d eks_deployer -c "SELECT * FROM test;"
# Expected: Row with 'persistent data' still exists
```

---

## Data Locations

### Windows (Docker Desktop)

```
\\wsl$\docker-desktop-data\data\docker\volumes\automated-eks-deployer_postgres_data\_data
```

**Access via WSL:**
```bash
wsl -d docker-desktop
cd /var/lib/docker/volumes/automated-eks-deployer_postgres_data/_data
ls -lah
```

### Linux

```
/var/lib/docker/volumes/automated-eks-deployer_postgres_data/_data
```

**Permissions:**
- Owner: 999:999 (postgres user inside container)
- Requires root access to view

### macOS

```
~/Library/Containers/com.docker.docker/Data/vms/0/data/docker/volumes/automated-eks-deployer_postgres_data/_data
```

**Note:** macOS Docker runs in a VM, so files are in VM filesystem

---

## Backup Strategies

### 1. SQL Dump (Logical Backup)

```bash
# Full database backup
docker exec eks-deployer-postgres pg_dump -U eks_user eks_deployer > backup.sql

# Compressed backup
docker exec eks-deployer-postgres pg_dump -U eks_user eks_deployer | gzip > backup.sql.gz

# Restore
docker exec -i eks-deployer-postgres psql -U eks_user -d eks_deployer < backup.sql
```

**Pros:**
- ✅ Human-readable SQL
- ✅ Version independent
- ✅ Can restore to different PostgreSQL versions

**Cons:**
- ❌ Slower for large databases
- ❌ Requires database to be running

### 2. Volume Backup (Physical Backup)

```bash
# Backup volume to tar.gz
docker run --rm \
  -v automated-eks-deployer_postgres_data:/data:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_volume_backup.tar.gz -C /data .

# Restore volume from tar.gz
docker run --rm \
  -v automated-eks-deployer_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres_volume_backup.tar.gz -C /data
```

**Pros:**
- ✅ Faster for large databases
- ✅ Includes all PostgreSQL files

**Cons:**
- ❌ Version dependent
- ❌ Requires database to be stopped (for consistency)

### 3. Automated Backups

Add to crontab (Linux/Mac):

```bash
# Daily backup at 2 AM
0 2 * * * docker exec eks-deployer-postgres pg_dump -U eks_user eks_deployer | gzip > /backups/postgres_$(date +\%Y\%m\%d).sql.gz
```

Windows Task Scheduler:

```powershell
$action = New-ScheduledTaskAction -Execute 'docker' -Argument 'exec eks-deployer-postgres pg_dump -U eks_user eks_deployer'
$trigger = New-ScheduledTaskTrigger -Daily -At 2AM
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "PostgreSQL Backup"
```

---

## Disaster Recovery

### Scenario 1: Container Deleted

```bash
# Volume still exists
docker volume ls | grep postgres_data

# Recreate container
docker-compose up -d postgres

# Data automatically restored ✓
```

### Scenario 2: Volume Corrupted

```bash
# Stop container
docker-compose stop postgres

# Remove corrupted volume
docker volume rm automated-eks-deployer_postgres_data

# Restore from backup
docker run --rm \
  -v automated-eks-deployer_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres_volume_backup.tar.gz -C /data

# Start container
docker-compose up -d postgres
```

### Scenario 3: Host Failure

```bash
# On new host:
# 1. Install Docker
# 2. Copy docker-compose.yml
# 3. Restore volume from backup
docker run --rm \
  -v automated-eks-deployer_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres_volume_backup.tar.gz -C /data

# 4. Start container
docker-compose up -d postgres
```

---

## Monitoring Persistence

### Volume Size

```bash
# Check volume size
docker system df -v | grep postgres_data
```

### Volume Usage Over Time

```bash
# Create monitoring script
cat > monitor_volume.sh << 'EOF'
#!/bin/bash
while true; do
  SIZE=$(docker system df -v | grep postgres_data | awk '{print $3}')
  echo "$(date): Volume size: $SIZE" >> /var/log/postgres_volume_monitor.log
  sleep 3600  # Check every hour
done
EOF

chmod +x monitor_volume.sh
nohup ./monitor_volume.sh &
```

### Data Integrity Checks

```bash
# Check database consistency
docker exec eks-deployer-postgres psql -U eks_user -d eks_deployer -c "SELECT pg_database.datname, pg_database_size(pg_database.datname) FROM pg_database;"

# Run VACUUM ANALYZE
docker exec eks-deployer-postgres psql -U eks_user -d eks_deployer -c "VACUUM ANALYZE;"
```

---

## Cleanup

### Remove Old Backups

```bash
# Keep last 7 days of backups
find /backups -name "postgres_*.sql.gz" -mtime +7 -delete
```

### Prune Unused Volumes

```bash
# List unused volumes
docker volume ls -f dangling=true

# Remove unused volumes (CAREFUL!)
docker volume prune
```

---

## Best Practices

1. **Regular Backups**
   - Daily SQL dumps
   - Weekly volume backups
   - Store backups off-host

2. **Test Restores**
   - Monthly restore tests
   - Document restore procedures
   - Time restore process

3. **Monitor Volume Size**
   - Set up alerts for disk usage
   - Plan for growth
   - Archive old data

4. **Version Control**
   - Track database schema changes
   - Use migrations (Sequelize)
   - Document manual changes

5. **Security**
   - Encrypt backups
   - Secure backup storage
   - Rotate backup credentials

---

## Troubleshooting

### Issue: Volume not persisting after reboot

**Check restart policy:**
```bash
docker inspect --format='{{.HostConfig.RestartPolicy.Name}}' eks-deployer-postgres
```

**Fix:**
```bash
docker update --restart unless-stopped eks-deployer-postgres
```

### Issue: Volume permission denied

**Check volume permissions:**
```bash
docker exec eks-deployer-postgres ls -la /var/lib/postgresql/data
```

**Fix:**
```bash
docker run --rm -v automated-eks-deployer_postgres_data:/data alpine chown -R 999:999 /data
```

### Issue: Container won't start after reboot

**Check logs:**
```bash
docker logs eks-deployer-postgres
```

**Common causes:**
- Port conflict (5432 already in use)
- Volume mount failure
- Corrupted data files

**Fix:**
```bash
# Check port usage
netstat -ano | findstr :5432  # Windows
lsof -i :5432                  # Linux/Mac

# Restart Docker daemon
sudo systemctl restart docker  # Linux
# Restart Docker Desktop on Windows/Mac
```

---

**Last Updated:** November 26, 2025
