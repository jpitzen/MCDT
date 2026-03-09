# 🚀 ZLAWS Minikube Deployment - Master Checklist

## ✅ Pre-Deployment Verification

### Prerequisites Check
- [ ] **Minikube**: Installed (`minikube --version`)
- [ ] **kubectl**: Installed (`kubectl version`)
- [ ] **Docker**: Installed and running (`docker --version`)
- [ ] **RAM**: 4GB+ available for Minikube
- [ ] **Disk**: 20GB+ free space
- [ ] **Network**: Internet connectivity for image pulls

### Verify Installation
```bash
# Run this command to verify all prerequisites
minikube --version && kubectl version && docker --version
```

---

## 🎬 Deployment Phase

### Pre-Deployment (T-5 minutes)
- [ ] Start Minikube: `minikube start --cpus=4 --memory=4096 --disk-size=20G`
- [ ] Verify Minikube is running: `minikube status`
- [ ] Navigate to ZLAWS project root directory
- [ ] Verify deployment files exist:
  - [ ] `kubernetes/namespace.yaml`
  - [ ] `kubernetes/postgres.yaml`
  - [ ] `kubernetes/backend-config.yaml`
  - [ ] `kubernetes/backend.yaml`
  - [ ] `Dockerfile`

### Deployment (T=0)
**Choose ONE of the following:**

#### Option A: Automated Deployment (Windows)
```powershell
# Make script executable if needed
# Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser

./deploy-to-minikube.ps1
```

**Expected duration**: 5-10 minutes

#### Option B: Automated Deployment (Mac/Linux)
```bash
bash deploy-to-minikube.sh
```

**Expected duration**: 5-10 minutes

#### Option C: Manual Deployment
```bash
# 1. Configure Docker
eval $(minikube docker-env)

# 2. Build image
docker build -t zlaws:latest .

# 3. Apply manifests in order
kubectl apply -f kubernetes/namespace.yaml
sleep 2
kubectl apply -f kubernetes/postgres.yaml
sleep 2
kubectl apply -f kubernetes/backend-config.yaml
sleep 2
kubectl apply -f kubernetes/backend.yaml

# 4. Wait for readiness
kubectl wait --for=condition=ready pod -l app=postgres -n zlaws --timeout=300s
sleep 5
kubectl wait --for=condition=ready pod -l app=zlaws-backend -n zlaws --timeout=300s
```

**Expected duration**: 5-10 minutes

---

## ✅ Post-Deployment Verification

### Immediate Verification (T+2 minutes)

#### Check Pod Status
```bash
kubectl get pods -n zlaws
```

**Expected Output:**
```
NAME                             READY   STATUS    RESTARTS   AGE
postgres-0                       1/1     Running   0          2m
zlaws-backend-xxxxx              1/1     Running   0          2m
zlaws-backend-xxxxx              1/1     Running   0          2m
```

- [ ] All pods have status "Running"
- [ ] All pods show 1/1 in READY column
- [ ] No restarts or errors

#### Check Services
```bash
kubectl get svc -n zlaws
```

**Expected Output:**
```
NAME               TYPE           CLUSTER-IP    EXTERNAL-IP   PORT(S)
postgres           ClusterIP      None          <none>        5432/TCP
zlaws-backend      LoadBalancer   10.x.x.x      <pending>     80:xxxxx/TCP
```

- [ ] Both services created
- [ ] Services have correct types
- [ ] Ports are properly configured

#### Check PersistentVolume
```bash
kubectl get pvc -n zlaws
```

**Expected Output:**
```
NAME                STATUS   VOLUME   CAPACITY   ACCESS MODES
postgres-pvc        Bound    postgres-pv   5Gi    RWO
```

- [ ] PVC is Bound
- [ ] Capacity is 5Gi

### Health Verification (T+3 minutes)

#### Port Forward
```bash
kubectl port-forward svc/zlaws-backend 8080:80 -n zlaws
```

**Leave this terminal open and test in a new terminal:**

#### Health Endpoint
```bash
curl -v http://localhost:8080/health
```

**Expected Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 120
}
```

- [ ] HTTP status 200
- [ ] Response contains "healthy"
- [ ] Timestamp is current

### Database Verification (T+4 minutes)

#### PostgreSQL Status
```bash
kubectl get pod -n zlaws -l app=postgres -o jsonpath='{.items[0].status.phase}'
```

**Expected**: `Running`

- [ ] PostgreSQL pod is Running

#### Database Access
```bash
kubectl exec -it statefulset/postgres -n zlaws -- \
  psql -U zlaws_user -d zlaws_db -c "SELECT 'Connection successful' as status;"
```

**Expected Output:**
```
        status
Connection successful
```

- [ ] Can connect to database
- [ ] Query executes successfully

#### Table Verification
```bash
kubectl exec -it statefulset/postgres -n zlaws -- \
  psql -U zlaws_user -d zlaws_db -c "\dt"
```

**Expected Output**: List of tables including:
- [ ] users
- [ ] teams
- [ ] deployments
- [ ] Other tables

---

## 🧪 API Testing Phase

### Basic API Tests (T+5 to T+10 minutes)

#### Test 1: Create User
```bash
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

- [ ] Status code: 201 Created
- [ ] Response includes user ID
- [ ] User data is returned

#### Test 2: List Users
```bash
curl http://localhost:8080/api/users
```

- [ ] Status code: 200 OK
- [ ] Response is array of users
- [ ] Created user appears in list

#### Test 3: Authentication
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "SecurePass123!"
  }'
```

- [ ] Status code: 200 OK
- [ ] Response includes JWT token
- [ ] Token is valid

#### Test 4: Protected Endpoint
```bash
# Save token from previous test
TOKEN="your_jwt_token_here"

curl http://localhost:8080/api/deployments \
  -H "Authorization: Bearer $TOKEN"
```

- [ ] Status code: 200 OK
- [ ] Authorization header accepted

### Comprehensive Testing (T+10 to T+30 minutes)

Follow `API_TESTING_GUIDE.md` for:
- [ ] All 70+ endpoint tests
- [ ] Error handling verification
- [ ] Load testing
- [ ] Performance benchmarks

---

## 📊 Monitoring & Logs

### View Logs
```bash
# Backend logs
kubectl logs -f deployment/zlaws-backend -n zlaws

# PostgreSQL logs
kubectl logs -f statefulset/postgres -n zlaws

# Specific pod
kubectl logs -f pod/POD_NAME -n zlaws
```

- [ ] No error messages in logs
- [ ] Application started successfully
- [ ] Database connections established

### Resource Monitoring
```bash
kubectl top pods -n zlaws
```

**Expected**:
- [ ] Memory usage: 100-300MB per backend pod
- [ ] Memory usage: 100-200MB for PostgreSQL
- [ ] CPU usage: 1-50m per pod

### Watch Pod Status
```bash
kubectl get pods -n zlaws -w
```

- [ ] All pods remain in Running state
- [ ] No restarts occurring
- [ ] No pod failures

---

## ✨ Success Criteria

### Deployment Success
- ✅ All pods running
- ✅ All services created
- ✅ PersistentVolume bound
- ✅ No error events

### Application Success
- ✅ Health endpoint responds
- ✅ Database accessible
- ✅ API endpoints operational
- ✅ Authentication working

### Full Success
- ✅ All 70+ endpoints tested
- ✅ No error logs
- ✅ Performance metrics acceptable
- ✅ Load test passed

---

## 🛑 Troubleshooting During Deployment

### Issue: Pods Stuck in Pending
**Action:**
```bash
kubectl describe pod POD_NAME -n zlaws
kubectl get events -n zlaws --sort-by='.lastTimestamp'
```
**Solution**: Check resource limits and ensure Minikube has sufficient resources

### Issue: ImagePullBackOff
**Action:**
```bash
eval $(minikube docker-env)
docker build -t zlaws:latest .
kubectl rollout restart deployment/zlaws-backend -n zlaws
```
**Solution**: Rebuild image in Minikube's Docker context

### Issue: CrashLoopBackOff
**Action:**
```bash
kubectl logs deployment/zlaws-backend -n zlaws --tail=50
kubectl describe pod POD_NAME -n zlaws
```
**Solution**: Check logs for application errors and fix

### Issue: Health Check Failing
**Action:**
```bash
kubectl exec -it deployment/zlaws-backend -n zlaws -- /bin/sh
curl localhost:5000/health
```
**Solution**: Verify application is responding internally

### Issue: Database Connection Error
**Action:**
```bash
kubectl get configmap backend-config -n zlaws -o yaml
kubectl exec -it statefulset/postgres -n zlaws -- psql -U zlaws_user
```
**Solution**: Verify connection parameters and database availability

---

## 📋 Documentation Reference

| Document | Use When |
|----------|----------|
| `MINIKUBE_DEPLOYMENT_GUIDE.md` | Detailed step-by-step guidance |
| `API_TESTING_GUIDE.md` | Testing all 70+ endpoints |
| `QUICK_REFERENCE.md` | Quick command lookup |
| `PROJECT_SUMMARY_COMPLETE.md` | Architecture questions |
| `DEPLOYMENT_READY_SUMMARY.md` | Overview and summary |

---

## 🎯 Scaling After Deployment

### Scale Backend to 5 Replicas
```bash
kubectl scale deployment zlaws-backend --replicas=5 -n zlaws
kubectl get pods -n zlaws -w
```

- [ ] All replicas reach Running state
- [ ] Load balancer distributes traffic
- [ ] No increase in error rates

### Monitor Scaled Deployment
```bash
kubectl get pods -n zlaws
kubectl top pods -n zlaws
```

---

## 🔄 Common Operations

### Restart Deployment
```bash
kubectl rollout restart deployment/zlaws-backend -n zlaws
kubectl rollout status deployment/zlaws-backend -n zlaws
```

### View Specific Pod Logs
```bash
kubectl logs -f pod/POD_NAME -n zlaws
```

### Execute Command in Pod
```bash
kubectl exec -it pod/POD_NAME -n zlaws -- /bin/sh
```

### Delete Single Pod (will auto-restart)
```bash
kubectl delete pod POD_NAME -n zlaws
```

### Update Resources
```bash
# Edit deployment
kubectl edit deployment zlaws-backend -n zlaws

# Or apply updated YAML
kubectl apply -f kubernetes/backend.yaml
```

---

## ✅ Final Checklist

### Pre-Deployment
- [ ] Prerequisites installed and verified
- [ ] Minikube running with correct resources
- [ ] All files present in repository
- [ ] Network connectivity confirmed

### Deployment
- [ ] Deployment script executed successfully
- [ ] No errors during deployment
- [ ] All manifests applied

### Verification
- [ ] All pods Running
- [ ] All services created
- [ ] Health endpoint responds
- [ ] Database accessible
- [ ] Can create users
- [ ] Authentication working
- [ ] API endpoints responding

### Testing
- [ ] Basic API tests passed
- [ ] All 70+ endpoints accessible
- [ ] Error handling working
- [ ] Performance acceptable
- [ ] Load test passed

### Documentation
- [ ] Read deployment guide
- [ ] Saved API testing guide reference
- [ ] Understood scaling procedures
- [ ] Know troubleshooting steps

---

## 📊 Deployment Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Deployment Time | < 10 min | — |
| Pod Startup Time | < 2 min | — |
| Health Check Response | < 100ms | — |
| API Response Time | < 200ms | — |
| Database Query Time | < 100ms | — |
| Memory Usage | < 500MB/pod | — |

---

## 🎊 Deployment Complete!

Once you check all boxes above, your ZLAWS deployment is complete and verified.

### Next Steps:
1. Run load tests (if not done)
2. Monitor logs (see `kubectl logs -f`)
3. Scale to desired replica count
4. Plan backup strategy
5. Prepare for production deployment to AWS EKS

---

## 📞 Getting Help

| Problem | Solution |
|---------|----------|
| Deployment failed | See Troubleshooting section above |
| API test failing | See `API_TESTING_GUIDE.md` Troubleshooting |
| Performance issue | See `MINIKUBE_DEPLOYMENT_GUIDE.md` Performance Tuning |
| Lost access | Restart port-forward: `kubectl port-forward svc/zlaws-backend 8080:80 -n zlaws` |
| Database issue | Check PostgreSQL pod and logs |

---

## ✨ Status

**Deployment Package**: ✅ Complete  
**Documentation**: ✅ Complete  
**Ready for Deployment**: ✅ YES  
**Estimated Time to Production**: 30 minutes

---

**Start Deployment Now** ➜ Choose deployment method above and begin!

---

**Last Updated**: 2024-01-15  
**Version**: 1.0  
**Status**: Ready
