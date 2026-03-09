#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy Backend API Server to Kubernetes Pods
    
.DESCRIPTION
    Deploys the ZLAWS EKS Deployer backend API server to Kubernetes pods.
    Handles image building, pushing to local Minikube registry, and pod creation.
    
.PARAMETER Action
    deploy      - Build, push image, and deploy to Kubernetes
    start       - Start existing deployment
    stop        - Stop/pause deployment
    logs        - View pod logs
    shell       - Open interactive shell in pod
    scale       - Scale replicas
    status      - Show deployment status
    rollback    - Rollback to previous version
    
.EXAMPLE
    ./deploy-backend-pods.ps1 -Action deploy
    ./deploy-backend-pods.ps1 -Action logs
    ./deploy-backend-pods.ps1 -Action scale -Replicas 3
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('deploy', 'start', 'stop', 'logs', 'shell', 'scale', 'status', 'rollback')]
    [string]$Action = 'deploy',
    
    [Parameter(Mandatory=$false)]
    [int]$Replicas = 2,
    
    [Parameter(Mandatory=$false)]
    [string]$Namespace = 'zlaws'
)

# Colors
$ErrorColor = 'Red'
$SuccessColor = 'Green'
$InfoColor = 'Cyan'
$WarningColor = 'Yellow'

function Write-Header {
    param([string]$Message)
    Write-Host "`n" -NoNewline
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor $InfoColor
    Write-Host $Message -ForegroundColor $InfoColor
    Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor $InfoColor
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ " -ForegroundColor $SuccessColor -NoNewline
    Write-Host $Message -ForegroundColor $SuccessColor
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ " -ForegroundColor $ErrorColor -NoNewline
    Write-Host $Message -ForegroundColor $ErrorColor
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ " -ForegroundColor $InfoColor -NoNewline
    Write-Host $Message -ForegroundColor $InfoColor
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠ " -ForegroundColor $WarningColor -NoNewline
    Write-Host $Message -ForegroundColor $WarningColor
}

# Deploy to Kubernetes
function Deploy-BackendPods {
    Write-Header "🚀 Deploying Backend API Server to Kubernetes Pods"
    
    # Step 1: Build Docker image
    Write-Header "Step 1: Building Docker Image"
    
    $imageName = "zlaws-backend"
    $imageTag = "v1"
    $fullImage = "${imageName}:${imageTag}"
    
    Write-Info "Building image: $fullImage"
    docker build -t $fullImage -f Dockerfile .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Docker build failed"
        exit 1
    }
    Write-Success "Docker image built successfully"
    
    # Step 2: Configure Minikube Docker environment
    Write-Header "Step 2: Configuring Minikube Docker Environment"
    
    Write-Info "Configuring Docker to use Minikube's Docker daemon"
    $dockerEnv = minikube docker-env --shell powershell | Out-String
    Invoke-Expression $dockerEnv
    
    # Step 3: Rebuild image in Minikube
    Write-Info "Rebuilding image in Minikube environment"
    docker build -t $fullImage -f Dockerfile .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Docker build in Minikube failed"
        exit 1
    }
    Write-Success "Image available in Minikube"
    
    # Step 4: Verify image exists
    Write-Header "Step 3: Verifying Image"
    
    $imageExists = docker images | Select-String $imageName
    if ($imageExists) {
        Write-Success "Image verified in Minikube: $fullImage"
    }
    else {
        Write-Error-Custom "Image not found in Minikube"
        exit 1
    }
    
    # Step 5: Create namespace if needed
    Write-Header "Step 4: Setting Up Kubernetes Namespace"
    
    $nsExists = kubectl get namespace $Namespace --ignore-not-found
    if (-not $nsExists) {
        Write-Info "Creating namespace: $Namespace"
        kubectl create namespace $Namespace
        Write-Success "Namespace created"
    }
    else {
        Write-Success "Namespace already exists: $Namespace"
    }
    
    # Step 6: Deploy using kubectl
    Write-Header "Step 5: Deploying to Kubernetes"
    
    Write-Info "Applying backend deployment manifest"
    kubectl apply -f kubernetes/backend.yaml -n $Namespace
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Kubernetes deployment failed"
        exit 1
    }
    Write-Success "Deployment manifest applied"
    
    # Step 7: Wait for pods to be ready
    Write-Header "Step 6: Waiting for Pods to Start"
    
    Write-Info "Waiting for backend pods to be ready (this may take a minute)..."
    kubectl wait --for=condition=ready pod -l app=zlaws-backend -n $Namespace --timeout=300s 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Pods are ready and running"
    }
    else {
        Write-Info "Pods are starting up, checking status..."
        Start-Sleep -Seconds 5
    }
    
    # Step 8: Display deployment status
    Write-Header "Deployment Complete!"
    
    Show-DeploymentStatus
}

# Show deployment status
function Show-DeploymentStatus {
    Write-Header "📊 Deployment Status"
    
    Write-Info "Deployments:"
    kubectl get deployments -n $Namespace --selector='app=zlaws-backend' -o wide
    
    Write-Host ""
    Write-Info "Pods:"
    kubectl get pods -n $Namespace --selector='app=zlaws-backend' -o wide
    
    Write-Host ""
    Write-Info "Services:"
    kubectl get services -n $Namespace --selector='app=zlaws-backend' -o wide
    
    Write-Host ""
    Write-Info "Pod Resource Usage:"
    kubectl top pods -n $Namespace --selector='app=zlaws-backend' 2>$null || Write-Info "(Metrics not available yet)"
}

# View pod logs
function Show-PodLogs {
    Write-Header "📋 Pod Logs"
    
    Write-Info "Getting pod names..."
    $pods = kubectl get pods -n $Namespace -l app=zlaws-backend --no-headers -o custom-columns=NAME:.metadata.name
    
    if ($pods) {
        foreach ($pod in $pods) {
            Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $InfoColor
            Write-Host "Pod: $pod" -ForegroundColor $InfoColor
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor $InfoColor
            
            kubectl logs -n $Namespace $pod --tail=50 2>$null
        }
    }
    else {
        Write-Error-Custom "No pods found"
    }
}

# Open shell in pod
function Open-PodShell {
    Write-Header "🐚 Interactive Pod Shell"
    
    Write-Info "Getting pod name..."
    $pod = kubectl get pods -n $Namespace -l app=zlaws-backend --no-headers -o custom-columns=NAME:.metadata.name | Select-Object -First 1
    
    if ($pod) {
        Write-Info "Opening shell in pod: $pod"
        Write-Info "Type 'exit' to exit the pod shell`n"
        
        kubectl exec -it -n $Namespace $pod -- /bin/sh
    }
    else {
        Write-Error-Custom "No pods found"
    }
}

# Scale deployment
function Scale-Deployment {
    param([int]$NumReplicas)
    
    Write-Header "⚖️ Scaling Deployment"
    
    Write-Info "Scaling zlaws-backend to $NumReplicas replicas"
    kubectl scale deployment zlaws-backend -n $Namespace --replicas=$NumReplicas
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Deployment scaled to $NumReplicas replicas"
        
        Write-Info "Waiting for new pods to be ready..."
        kubectl wait --for=condition=ready pod -l app=zlaws-backend -n $Namespace --timeout=120s
        
        Show-DeploymentStatus
    }
    else {
        Write-Error-Custom "Failed to scale deployment"
    }
}

# Start deployment
function Start-Deployment {
    Write-Header "▶️ Starting Backend Deployment"
    
    Write-Info "Checking deployment status..."
    $deploy = kubectl get deployment zlaws-backend -n $Namespace --ignore-not-found
    
    if ($deploy) {
        Write-Info "Deployment already exists. Ensuring replicas are set..."
        kubectl scale deployment zlaws-backend -n $Namespace --replicas=2
        Write-Success "Deployment started"
    }
    else {
        Write-Error-Custom "Deployment not found. Run with -Action deploy first"
        exit 1
    }
    
    Show-DeploymentStatus
}

# Stop deployment
function Stop-Deployment {
    Write-Header "⏸️  Stopping Backend Deployment"
    
    Write-Info "Scaling deployment to 0 replicas"
    kubectl scale deployment zlaws-backend -n $Namespace --replicas=0
    
    Write-Success "Deployment stopped (pods terminated)"
    
    Write-Host ""
    Write-Info "To resume, run: kubectl scale deployment zlaws-backend -n $Namespace --replicas=2"
}

# Rollback to previous version
function Rollback-Deployment {
    Write-Header "⏮️  Rolling Back Deployment"
    
    Write-Info "Rolling back to previous deployment revision"
    kubectl rollout undo deployment/zlaws-backend -n $Namespace
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Rollback completed"
        
        Write-Info "Waiting for pods to restart..."
        kubectl wait --for=condition=ready pod -l app=zlaws-backend -n $Namespace --timeout=120s
        
        Show-DeploymentStatus
    }
    else {
        Write-Error-Custom "Rollback failed"
    }
}

# Main execution
try {
    switch ($Action) {
        "deploy" {
            Deploy-BackendPods
        }
        "start" {
            Start-Deployment
        }
        "stop" {
            Stop-Deployment
        }
        "logs" {
            Show-PodLogs
        }
        "shell" {
            Open-PodShell
        }
        "scale" {
            Scale-Deployment -NumReplicas $Replicas
        }
        "status" {
            Show-DeploymentStatus
        }
        "rollback" {
            Rollback-Deployment
        }
    }
}
catch {
    Write-Error-Custom "An error occurred: $_"
    exit 1
}

Write-Host "`n"

