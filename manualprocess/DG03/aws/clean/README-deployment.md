# ZL Kubernetes Deployment Guide - us-east-1
# Last Updated: December 22, 2025
#
# EKS Cluster: use1-zlps-eks-01
# ECR Repository: 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01
# RDS Endpoint: use1-zlps-msexpsql-01-eks.cqhaqqqiwngv.us-east-1.rds.amazonaws.com:1433
# EFS File System: fs-0a2b69e49fe46c1f6

# ============================================================================
# DEPLOYMENT ORDER
# ============================================================================
#
# 1. Prerequisites (before kubectl apply)
#    - EKS cluster created and configured
#    - kubectl context set to cluster
#    - ECR images pushed
#    - EFS CSI Driver installed
#    - EBS CSI Driver installed
#    - RDS database created with ZLDB schema
#
# 2. Apply in Order:
#    a. storage.yaml          - Storage classes and PVCs
#    b. secrets.yaml          - Database credentials
#    c. configmaps.yaml       - All ConfigMaps
#    d. services.yaml         - All Services (create before deployments)
#    e. zlzookeeper-statefulset.yaml - ZooKeeper (must be running first)
#    f. zltika-deployment.yaml       - Tika (zlserver depends on this)
#    g. zlserver-deployment.yaml     - ZLServer (main processing)
#    h. zlui-deployment.yaml         - ZL UI (web interface)
#    i. zlsearch-deployment.yaml     - ZL Search (optional)

# ============================================================================
# QUICK DEPLOY COMMANDS
# ============================================================================

# Set context
aws eks update-kubeconfig --name use1-zlps-eks-01 --region us-east-1

# Apply all manifests in order
kubectl apply -f storage.yaml
kubectl apply -f secrets.yaml
kubectl apply -f configmaps.yaml
kubectl apply -f services.yaml

# Wait for storage classes
kubectl get sc

# Deploy ZooKeeper first
kubectl apply -f zlzookeeper-statefulset.yaml
# Wait for all 3 ZooKeeper pods
kubectl wait --for=condition=ready pod -l app=zk --timeout=300s

# Deploy Tika
kubectl apply -f zltika-deployment.yaml
kubectl wait --for=condition=ready pod -l app=zltika --timeout=120s

# Deploy ZLServer
kubectl apply -f zlserver-deployment.yaml
kubectl wait --for=condition=ready pod -l app=zlserver --timeout=180s

# Deploy ZLUI
kubectl apply -f zlui-deployment.yaml
kubectl wait --for=condition=ready pod -l app=zlui --timeout=120s

# Deploy ZLSearch (optional)
kubectl apply -f zlsearch-deployment.yaml
kubectl wait --for=condition=ready pod -l app=zlsearch --timeout=120s

# ============================================================================
# VERIFICATION COMMANDS
# ============================================================================

# Check all pods
kubectl get pods -o wide

# Check services
kubectl get svc

# Check ZooKeeper quorum health
kubectl exec zlzookeeper-0 -- bash -c "cd /opt/ZipLip/ZLZooKeeper/bin && ./zkutil -q"

# Check Tika is listening (port 9972)
kubectl exec zltika-<pod-id> -- netstat -tlnp | grep 9972

# Check ZLServer logs for "Done initializing"
kubectl logs zlserver-<pod-id> | grep -i "done initializing"

# Check ZLUI logs for initialization
kubectl logs zlui-<pod-id> | tail -50

# Get LoadBalancer URL for UI access
kubectl get svc zlui-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}:{.spec.ports[0].port}'

# ============================================================================
# IMAGE REFERENCES
# ============================================================================
#
# Current images in ECR (us-east-1):
# - 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zlserver-k8s-20251222
# - 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zlui-k8s-20251222
# - 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zlsearch-k8s-20251222
# - 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zltika11.1.0-b1140
# - 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zlzookeeper11.1.0-b1140

# ============================================================================
# KNOWN ISSUES AND FIXES
# ============================================================================
#
# 1. TIKA LISTENER NOT STARTING
#    Symptom: zlserver can't connect to Tika, "Connection refused" errors
#    Cause: Tika container exits before Java listener binds to port
#    Fix: Use command override with "sleep infinity" - see zltika-deployment.yaml
#    
#    command:
#      - /bin/sh
#      - -c
#      - cd /opt/ZipLip/ZLTikaConvertor/bin && ./zltikadiag.sh ZLTika /tmp/ZLTika & sleep infinity
#
# 2. DATABASE CONNECTION FAILING
#    Symptom: "SSL connection error" or "certificate" errors
#    Cause: JDBC driver requires TrustServerCertificate for RDS
#    Fix: Ensure JDBC URL includes TrustServerCertificate=true
#    
#    jdbc:sqlserver://hostname:1433;TrustServerCertificate=true
#
# 3. ZOOKEEPER PODS NOT STARTING
#    Symptom: Pods stuck in Init:0/1
#    Cause: Init container can't create myid file
#    Fix: Check volume mounts and permissions
#    
#    kubectl logs zlzookeeper-0 -c init-myid
#
# 4. SUPERADMIN LOGIN FAILING
#    Symptom: NullPointerException for AliasLookup
#    Cause: ZLUI pod started before ZLServer finished initializing
#    Fix: Restart zlui deployment after zlserver shows "Done initializing"
#    
#    kubectl rollout restart deployment zlui

# ============================================================================
# ACCESS INFORMATION
# ============================================================================
#
# LoadBalancer URL: http://a0f6d05f1097a42ca83536c53a1b9e35-458982103.us-east-1.elb.amazonaws.com:8080
# Default Login: superadmin / [configured password]
#
# Port Mappings:
# - ZLUI: 8080 (LoadBalancer)
# - ZLServer: 8080 (ClusterIP)
# - ZLSearch: 8080 (ClusterIP)
# - ZooKeeper Client: 2181 (ClusterIP)
# - ZooKeeper Peer: 2888 (ClusterIP)
# - ZooKeeper Election: 3888 (ClusterIP)
# - Tika: 9972 (ClusterIP)
