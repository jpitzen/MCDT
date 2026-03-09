# ZLAWS Deployment Script for Minikube (PowerShell)
# This script deploys the ZLAWS application to a local Minikube cluster on Windows

$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "ZLAWS Minikube Deployment Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Function to check command existence
function Test-CommandExists {
    param([string]$command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Check prerequisites
Write-Host ""
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-CommandExists minikube)) {
    Write-Host "ERROR: minikube not found. Please install Minikube." -ForegroundColor Red
    exit 1
}

if (-not (Test-CommandExists kubectl)) {
    Write-Host "ERROR: kubectl not found. Please install kubectl." -ForegroundColor Red
    exit 1
}

if (-not (Test-CommandExists docker)) {
    Write-Host "ERROR: docker not found. Please install Docker." -ForegroundColor Red
    exit 1
}

Write-Host "✓ All prerequisites found" -ForegroundColor Green

# Check if Minikube is running
Write-Host ""
Write-Host "1. Checking Minikube status..." -ForegroundColor Yellow

$minikubeStatus = & minikube status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Minikube is not running. Please start it with:" -ForegroundColor Red
    Write-Host "  minikube start --cpus=4 --memory=4096 --disk-size=20G" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Minikube is running" -ForegroundColor Green

# Configure Docker environment for Minikube
Write-Host ""
Write-Host "2. Configuring Docker for Minikube..." -ForegroundColor Yellow

# Get Minikube Docker environment
$dockerEnv = & minikube docker-env --shell=powershell | Out-String
Invoke-Expression $dockerEnv

Write-Host "✓ Docker environment configured" -ForegroundColor Green

# Build Docker image
Write-Host ""
Write-Host "3. Building Docker image..." -ForegroundColor Yellow

if (-not (Test-Path "Dockerfile")) {
    Write-Host "ERROR: Dockerfile not found in current directory" -ForegroundColor Red
    exit 1
}

& docker build -t zlaws:latest -f Dockerfile .
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to build Docker image" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Docker image built successfully" -ForegroundColor Green

# Apply Kubernetes manifests
Write-Host ""
Write-Host "4. Applying Kubernetes manifests..." -ForegroundColor Yellow

Write-Host "   Creating namespace..." -ForegroundColor Gray
& kubectl apply -f kubernetes\namespace.yaml

Write-Host "   Creating PostgreSQL deployment..." -ForegroundColor Gray
& kubectl apply -f kubernetes\postgres.yaml

Write-Host "   Creating backend configuration..." -ForegroundColor Gray
& kubectl apply -f kubernetes\backend-config.yaml

Write-Host "   Creating backend deployment..." -ForegroundColor Gray
& kubectl apply -f kubernetes\backend.yaml

Write-Host "✓ All manifests applied" -ForegroundColor Green

# Wait for deployments
Write-Host ""
Write-Host "5. Waiting for deployments to be ready..." -ForegroundColor Yellow
Write-Host "   This may take a minute..." -ForegroundColor Gray

# Wait for PostgreSQL
Write-Host "   Waiting for PostgreSQL..." -ForegroundColor Gray
$maxAttempts = 60
$attempt = 0
while ($attempt -lt $maxAttempts) {
    $podStatus = & kubectl get pods -n zlaws -l app=postgres -o jsonpath='{.items[0].status.phase}' 2>$null
    if ($podStatus -eq "Running") {
        break
    }
    $attempt++
    Start-Sleep -Seconds 2
}

# Wait for Backend
Write-Host "   Waiting for Backend..." -ForegroundColor Gray
$attempt = 0
while ($attempt -lt $maxAttempts) {
    $readyCount = & kubectl get deployment zlaws-backend -n zlaws -o jsonpath='{.status.readyReplicas}' 2>$null
    if ($readyCount -ge 1) {
        break
    }
    $attempt++
    Start-Sleep -Seconds 2
}

Write-Host "✓ Deployments are ready" -ForegroundColor Green

# Display deployment information
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Deployment Information" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Namespace: zlaws" -ForegroundColor Cyan
Write-Host ""

Write-Host "Pods:" -ForegroundColor Yellow
& kubectl get pods -n zlaws

Write-Host ""
Write-Host "Services:" -ForegroundColor Yellow
& kubectl get svc -n zlaws

# Get backend service details
Write-Host ""
Write-Host "To access the backend service, use port forwarding:" -ForegroundColor Yellow
Write-Host "  kubectl port-forward svc/zlaws-backend 8080:80 -n zlaws" -ForegroundColor Cyan
Write-Host "  Then access: http://localhost:8080" -ForegroundColor Cyan

Write-Host ""
Write-Host "✓ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Monitor pods: kubectl get pods -n zlaws -w" -ForegroundColor Cyan
Write-Host "2. View logs: kubectl logs -f deployment/zlaws-backend -n zlaws" -ForegroundColor Cyan
Write-Host "3. Port forward: kubectl port-forward svc/zlaws-backend 8080:80 -n zlaws" -ForegroundColor Cyan
Write-Host "4. Test health: curl http://localhost:8080/health" -ForegroundColor Cyan
Write-Host "5. See MINIKUBE_DEPLOYMENT_GUIDE.md for more information" -ForegroundColor Cyan
