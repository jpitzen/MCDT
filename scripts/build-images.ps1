# ZLAWS Docker Images Build Script
# This script builds all Docker images for the ZLAWS deployment with version tagging

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         ZLAWS Docker Images Build & Version Control            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Define image versions (increment when component changes)
$IMAGES = @{
    "zlaws-backend" = @{
        "version" = "v1"
        "dockerfile" = "Dockerfile"
        "context" = "."
        "description" = "Node.js Express backend API"
    }
    "zlaws-postgres" = @{
        "version" = "v1"
        "dockerfile" = "postgres.Dockerfile"
        "context" = "."
        "description" = "PostgreSQL 14 with ZLAWS schema"
    }
    "zlaws-nginx" = @{
        "version" = "v1"
        "dockerfile" = "nginx.Dockerfile"
        "context" = "."
        "description" = "Nginx reverse proxy with SSL"
    }
}

# Step 1: Configure Docker to use Minikube
Write-Host "Step 1: Configuring Docker for Minikube..." -ForegroundColor Yellow
Write-Host ""

$dockerEnv = & minikube docker-env --shell=powershell | Out-String
Invoke-Expression $dockerEnv
Write-Host "✓ Docker environment configured for Minikube" -ForegroundColor Green
Write-Host ""

# Step 2: Build all images
Write-Host "Step 2: Building Docker images..." -ForegroundColor Yellow
Write-Host ""

$builtImages = @()

foreach ($imageName in $IMAGES.Keys) {
    $imageConfig = $IMAGES[$imageName]
    $fullImageName = "$imageName`:$($imageConfig.version)"
    $dockerfile = $imageConfig.dockerfile
    $context = $imageConfig.context
    $description = $imageConfig.description
    
    Write-Host "Building: $imageName ($description)" -ForegroundColor Cyan
    Write-Host "  Version: $($imageConfig.version)" -ForegroundColor Gray
    Write-Host "  Dockerfile: $dockerfile" -ForegroundColor Gray
    Write-Host "  Image: $fullImageName" -ForegroundColor Gray
    
    if (-not (Test-Path $dockerfile)) {
        Write-Host "  ⚠ WARNING: $dockerfile not found, skipping..." -ForegroundColor Yellow
        continue
    }
    
    try {
        & docker build -t $fullImageName -f $dockerfile $context
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Built successfully: $fullImageName" -ForegroundColor Green
            $builtImages += $fullImageName
        } else {
            Write-Host "  ✗ Build failed for $imageName" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ Error building $imageName`: $_" -ForegroundColor Red
    }
    
    Write-Host ""
}

# Step 3: Tag with 'latest' for convenient access
Write-Host "Step 3: Tagging images with 'latest'..." -ForegroundColor Yellow
Write-Host ""

foreach ($fullImageName in $builtImages) {
    $imageName = $fullImageName.Split(":")[0]
    $latestTag = "$imageName`:latest"
    
    Write-Host "Tagging: $fullImageName → $latestTag" -ForegroundColor Cyan
    & docker tag $fullImageName $latestTag
    Write-Host "  ✓ Tagged" -ForegroundColor Green
}

Write-Host ""

# Step 4: List all images
Write-Host "Step 4: Available ZLAWS Docker images..." -ForegroundColor Yellow
Write-Host ""

& docker images | Where-Object { $_ -match "zlaws-" }

Write-Host ""

# Step 5: Summary
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    Build Summary                              ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "Built Images:" -ForegroundColor Cyan
foreach ($fullImageName in $builtImages) {
    Write-Host "  ✓ $fullImageName" -ForegroundColor Green
}

Write-Host ""
Write-Host "Image Version Reference:" -ForegroundColor Cyan
foreach ($imageName in $IMAGES.Keys) {
    $version = $IMAGES[$imageName].version
    Write-Host "  • $imageName`: $version" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Deploy with: ./deploy-to-minikube.ps1" -ForegroundColor Cyan
Write-Host "  2. View images: docker images | grep zlaws" -ForegroundColor Cyan
Write-Host "  3. To update a component:" -ForegroundColor Cyan
Write-Host "     - Edit the component" -ForegroundColor Cyan
Write-Host "     - Increment version (e.g., v1 → v2)" -ForegroundColor Cyan
Write-Host "     - Rebuild: docker build -t zlaws-component:v2 ..." -ForegroundColor Cyan
Write-Host ""

Write-Host "✓ Build complete!" -ForegroundColor Green
