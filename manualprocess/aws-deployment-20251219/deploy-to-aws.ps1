# AWS EKS Deployment Script - December 19, 2025
# Deploys ZL application with new images (zlserver20251219, zlui20251219, etc.)

# Prerequisites:
# 1. EKS cluster running in us-east-1
# 2. ECR repository with images pushed
# 3. EFS file system created
# 4. RDS database configured
# 5. IAM roles and policies created

# Verify database configuration
Write-Host "Verifying database configuration..."
.\verify-db-password.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Database configuration verification failed!"
    exit 1
}

# Step 1: Create ECR Secret for image pulling
echo "Step 1: Creating ECR secret..."
kubectl apply -f ecr-secret.yaml

# Step 2: Create Service Account with IAM role
echo "Step 2: Creating service account..."
kubectl apply -f zlapp-service-account.yaml

# Step 3: Apply Storage Configuration
echo "Step 3: Applying storage configuration..."
kubectl apply -f ../efs-sc.yaml
kubectl apply -f ../yaml/efs-pv-zlserverlogs.yaml
kubectl apply -f ../yaml/efs-pvc-zlserverlogs.yaml
kubectl apply -f ../zluilogs-efs-pvc.yaml
kubectl apply -f ../zlservertemp-efs-pvc.yaml
kubectl apply -f ../zltikatemp-efs-pvc.yaml
kubectl apply -f ../zlvault-efs-pvc.yaml

# Step 4: Apply Database Configuration
echo "Step 4: Applying database configuration..."
kubectl apply -f db-config.yaml
kubectl apply -f db-secret.yaml

# Step 5: Apply Application Configuration
echo "Step 5: Applying application configuration..."
kubectl apply -f ../newbuild/zlapp-config.yaml
kubectl apply -f ../newbuild/docconvert-configmap.yaml
kubectl apply -f ../yaml/pmapp-config.yaml

# Step 6: Deploy ZooKeeper
echo "Step 6: Deploying ZooKeeper..."
kubectl apply -f ../newbuild/zk-hs.yaml
kubectl apply -f ../newbuild/zk-cs.yaml
kubectl apply -f ../yaml/zk-config.yaml
kubectl apply -f ../yaml/zk-jaas-config.yaml
kubectl apply -f zlzookeeper-statefulset.yaml

# Wait for ZooKeeper
echo "Waiting for ZooKeeper to be ready..."
kubectl wait --for=condition=ready pod -l app=zlzookeeper --timeout=300s

# Step 7: Initialize ZooKeeper
echo "Step 7: Initializing ZooKeeper..."
kubectl apply -f ../yaml/zookeeper-init-job.yaml

# Step 8: Deploy Tika Service
echo "Step 8: Deploying Tika service..."
kubectl apply -f ../newbuild/zltika-service.yaml
kubectl apply -f zltika-deployment.yaml

# Step 9: Deploy ZL Server
echo "Step 9: Deploying ZL Server..."
kubectl apply -f zlserver-deployment.yaml

# Step 10: Deploy ZL UI
echo "Step 10: Deploying ZL UI..."
kubectl apply -f ../newbuild/zlui-service.yaml
kubectl apply -f zlui-deployment.yaml

# Step 11: Verify Deployment
echo "Step 11: Verifying deployment..."
kubectl get pods
kubectl get services

echo "✅ AWS deployment completed!"
echo "Access ZL UI at: http://<ALB-DNS>/ps/app/home.jsp"