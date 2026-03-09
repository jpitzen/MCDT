# Minikube ZL Application Quick Start Script
# Run this script from the local/yaml directory

Write-Host "Starting ZL Application deployment on Minikube..." -ForegroundColor Green

# Check if Minikube is running
Write-Host "Checking Minikube status..." -ForegroundColor Yellow
minikube status
if ($LASTEXITCODE -ne 0) {
    Write-Host "Minikube is not running. Starting Minikube..." -ForegroundColor Yellow
    minikube start --driver=docker
}

# Deploy database
Write-Host "Deploying MS SQL Express database..." -ForegroundColor Yellow
kubectl apply -f mssql-deployment.yaml

# Wait for database
Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod -l app=mssql-express --timeout=300s

# Deploy ZooKeeper
Write-Host "Deploying ZooKeeper cluster..." -ForegroundColor Yellow
kubectl apply -f zk-config.yaml
kubectl apply -f zk-hs.yaml
kubectl apply -f zk-cs.yaml
kubectl apply -f zlzookeeper-statefulset.yaml

# Wait for ZooKeeper
Write-Host "Waiting for ZooKeeper cluster..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod -l app=zlzookeeper --timeout=300s

# Deploy configurations
Write-Host "Deploying application configurations..." -ForegroundColor Yellow
kubectl apply -f db-config.yaml
kubectl apply -f db-secret.yaml
kubectl apply -f zlapp-config.yaml
kubectl apply -f docconvert-configmap.yaml

# Deploy storage
Write-Host "Deploying persistent volume claims..." -ForegroundColor Yellow
kubectl apply -f zlserver-pvcs.yaml
kubectl apply -f zltika-pvc.yaml
kubectl apply -f zlui-pvc.yaml

# Deploy applications
Write-Host "Deploying ZL Server..." -ForegroundColor Yellow
kubectl apply -f zlserver-deployment.yaml

Write-Host "Deploying Tika service..." -ForegroundColor Yellow
kubectl apply -f zltika-deployment.yaml
kubectl apply -f zltika-service.yaml

Write-Host "Deploying ZL UI..." -ForegroundColor Yellow
kubectl apply -f zlui-deployment.yaml
kubectl apply -f zlui-service.yaml

# Get service URL
Write-Host "Getting ZL UI service URL..." -ForegroundColor Yellow
$serviceUrl = minikube service zlui --url
Write-Host "ZL Application is available at: $serviceUrl" -ForegroundColor Green

Write-Host "Deployment complete! Check pod status with: kubectl get pods" -ForegroundColor Green