# Build Kubernetes-Optimized Images
# Run this script to build and push updated images to ECR
#
# Prerequisites:
#   - Docker installed and running
#   - AWS CLI configured with ECR access (for push)
#   - Local base images available (zlserver:20251219, etc.)

param(
    [string]$Region = "us-east-1",
    [string]$AccountId = "995553364920",
    [string]$Repository = "ue1-zlps-ecr-01",
    [string]$LocalTag = "20251219",
    [string]$K8sVersion = "k8s-$(Get-Date -Format 'yyyyMMdd')",
    [switch]$PushToECR = $false,
    [switch]$SkipBuild = $false
)

$ErrorActionPreference = "Stop"

# Configuration
$ECR_BASE = "$AccountId.dkr.ecr.$Region.amazonaws.com"
$ECR_REPO = "$ECR_BASE/$Repository"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$IMAGES_DIR = Join-Path $SCRIPT_DIR "images"

Write-Host "=========================================="
Write-Host "Build Kubernetes-Optimized ZL Images"
Write-Host "=========================================="
Write-Host "Region:      $Region"
Write-Host "Account:     $AccountId"
Write-Host "Repository:  $Repository"
Write-Host "Local Tag:   $LocalTag"
Write-Host "K8s Version: $K8sVersion"
Write-Host "=========================================="

# Define images to build - using LOCAL images as base
$images = @(
    @{
        Name = "zlserver"
        BaseImage = "zlserver:$LocalTag"
        Context = Join-Path $IMAGES_DIR "zlserver"
    },
    @{
        Name = "zltika"
        BaseImage = "zltika:$LocalTag"
        Context = Join-Path $IMAGES_DIR "zltika"
    },
    @{
        Name = "zlzookeeper"
        BaseImage = "zlzookeeper:$LocalTag"
        Context = Join-Path $IMAGES_DIR "zlzookeeper"
    }
)

# ============================================================
# Build Images
# ============================================================
if (-not $SkipBuild) {
    Write-Host "`n📦 Building images from LOCAL base images..."
    
    foreach ($img in $images) {
        Write-Host "`n  Building $($img.Name)..."
        Write-Host "    Base: $($img.BaseImage)"
        
        $localTag = "$($img.Name):$K8sVersion"
        $ecrTag = "${ECR_REPO}:$($img.Name)-$K8sVersion"
        
        # Build with base image as build arg
        docker build `
            --build-arg "BASE_IMAGE=$($img.BaseImage)" `
            -t $localTag `
            -t $ecrTag `
            $img.Context
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to build $($img.Name)"
            exit 1
        }
        
        Write-Host "  ✅ Built: $localTag"
    }
}

# ============================================================
# Push to ECR
# ============================================================
if ($PushToECR) {
    Write-Host "`n🚀 Pushing to ECR..."
    
    # Login to ECR
    Write-Host "  Authenticating to ECR..."
    aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $ECR_BASE
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to authenticate to ECR"
        exit 1
    }
    
    foreach ($img in $images) {
        $ecrTag = "${ECR_REPO}:$($img.Name)-$K8sVersion"
        
        Write-Host "  Pushing $ecrTag..."
        docker push $ecrTag
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to push $($img.Name)"
            exit 1
        }
        
        Write-Host "  ✅ Pushed: $ecrTag"
    }
}

# ============================================================
# Summary
# ============================================================
Write-Host "`n=========================================="
Write-Host "✅ Build Complete!"
Write-Host "=========================================="
Write-Host "`nLocal images created:"
foreach ($img in $images) {
    Write-Host "  - $($img.Name):$K8sVersion"
}

if ($PushToECR) {
    Write-Host "`nECR images pushed:"
    foreach ($img in $images) {
        Write-Host "  - ${ECR_REPO}:$($img.Name)-$K8sVersion"
    }
}

Write-Host "`nTo use these images in deployments, update image tags to:"
Write-Host "  zlserver:     $($images[0].Name):$K8sVersion (local)"
Write-Host "  zltika:       $($images[1].Name):$K8sVersion (local)"
Write-Host "  zlzookeeper:  $($images[2].Name):$K8sVersion (local)"
Write-Host ""
Write-Host "Or for ECR:"
Write-Host "  zlserver:     ${ECR_REPO}:zlserver-$K8sVersion"
Write-Host "  zltika:       ${ECR_REPO}:zltika-$K8sVersion"
Write-Host "  zlzookeeper:  ${ECR_REPO}:zlzookeeper-$K8sVersion"
