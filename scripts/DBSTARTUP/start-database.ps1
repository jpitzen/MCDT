<#
.SYNOPSIS
    Starts the PostgreSQL database for ZLAWS application
.DESCRIPTION
    This script starts the PostgreSQL database either via Docker or Kubernetes port-forward.
    
    Docker mode (default):
      - Uses docker-compose to start eks-deployer-postgres container
      - Credentials: eks_user / eks_password_123 / eks_deployer
    
    Kubernetes mode (-UseKube):
      - Starts kubectl port-forward to Minikube postgres-0 pod
      - Credentials: zlaws_user / ZLAWSSecurePass123! / zlaws_db
      - Requires Minikube running with postgres-0 pod in zlaws namespace

.PARAMETER Force
    Force recreate the container even if it exists (Docker mode only)
.PARAMETER Logs
    Show logs after starting
.PARAMETER UseKube
    Use Kubernetes port-forward to Minikube Postgres instead of Docker
.EXAMPLE
    .\start-database.ps1
    Starts the Docker database container
.EXAMPLE
    .\start-database.ps1 -UseKube
    Starts port-forward to Minikube Postgres pod
.EXAMPLE
    .\start-database.ps1 -Logs
    Starts the database and shows logs
.EXAMPLE
    .\start-database.ps1 -Force
    Recreates and starts the database container
#>

[CmdletBinding()]
param(
    [switch]$Force,
    [switch]$Logs,
    [switch]$UseKube
)

$ErrorActionPreference = "Stop"

# Colors for output
$InfoColor = "Cyan"
$SuccessColor = "Green"
$ErrorColor = "Red"
$WarningColor = "Yellow"

Write-Host "`n=== ZLAWS - Database Startup ===" -ForegroundColor $InfoColor

if ($UseKube) {
    # Kubernetes mode - use port-forward to Minikube
    Write-Host "Starting Kubernetes port-forward to Minikube Postgres...`n" -ForegroundColor $InfoColor
    
    # Check if kubectl is available
    if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: kubectl not found. Please install kubectl." -ForegroundColor $ErrorColor
        exit 1
    }
    
    # Check if Minikube is running
    $minikubeStatus = minikube status --format='{{.Host}}' 2>$null
    if ($minikubeStatus -ne "Running") {
        Write-Host "ERROR: Minikube is not running. Start with: minikube start" -ForegroundColor $ErrorColor
        exit 1
    }
    
    # Check if postgres pod exists
    $podStatus = kubectl get pod -n zlaws postgres-0 -o jsonpath='{.status.phase}' 2>$null
    if ($podStatus -ne "Running") {
        Write-Host "ERROR: postgres-0 pod not running in zlaws namespace. Status: $podStatus" -ForegroundColor $ErrorColor
        Write-Host "Deploy Postgres to Minikube first." -ForegroundColor $WarningColor
        exit 1
    }
    
    # Kill any existing port-forwards on 5432
    Get-Process -Name kubectl -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like '*port-forward*5432*'
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Start port-forward in new window
    Write-Host "Starting kubectl port-forward in new window..." -ForegroundColor $InfoColor
    Start-Process pwsh -ArgumentList @('-NoProfile', '-NoExit', '-Command', 'kubectl port-forward -n zlaws postgres-0 5432:5432')
    
    Start-Sleep -Seconds 3
    
    # Verify port is open
    $portOpen = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
    if ($portOpen.TcpTestSucceeded) {
        Write-Host "✓ Port-forward started successfully!" -ForegroundColor $SuccessColor
    } else {
        Write-Host "⚠ Port-forward may still be starting..." -ForegroundColor $WarningColor
    }
    
    # Display connection information
    Write-Host "`n=== Database Connection Info (Minikube) ===" -ForegroundColor $InfoColor
    Write-Host "Host:     localhost" -ForegroundColor $InfoColor
    Write-Host "Port:     5432" -ForegroundColor $InfoColor
    Write-Host "Database: zlaws_db" -ForegroundColor $InfoColor
    Write-Host "User:     zlaws_user" -ForegroundColor $InfoColor
    Write-Host "Password: ZLAWSSecurePass123!" -ForegroundColor $InfoColor
    
    Write-Host "`n=== Useful Commands ===" -ForegroundColor $InfoColor
    Write-Host "View pod logs:    kubectl logs -n zlaws postgres-0 -f" -ForegroundColor $InfoColor
    Write-Host "Connect to DB:    kubectl exec -n zlaws postgres-0 -- psql -U zlaws_user -d zlaws_db" -ForegroundColor $InfoColor
    Write-Host "Check tables:     kubectl exec -n zlaws postgres-0 -- psql -U zlaws_user -d zlaws_db -c '\dt'" -ForegroundColor $InfoColor
    
    if ($Logs) {
        Write-Host "`n=== Database Logs ===" -ForegroundColor $InfoColor
        kubectl logs -n zlaws postgres-0 --tail=50
    }
    
    Write-Host "`n✓ Kubernetes database startup complete!`n" -ForegroundColor $SuccessColor
    exit 0
}

# Docker mode (original behavior)
Write-Host "Starting PostgreSQL Docker container...`n" -ForegroundColor $InfoColor

# Check if Docker is running
try {
    $dockerVersion = docker version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not running"
    }
} catch {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop." -ForegroundColor $ErrorColor
    Write-Host "Download: https://www.docker.com/products/docker-desktop" -ForegroundColor $WarningColor
    exit 1
}

# Get project root (two levels up from scripts/DBSTARTUP)
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$dockerComposePath = Join-Path $projectRoot "docker-compose.yml"

# Verify docker-compose.yml exists
if (-not (Test-Path $dockerComposePath)) {
    Write-Host "ERROR: docker-compose.yml not found at: $dockerComposePath" -ForegroundColor $ErrorColor
    exit 1
}

Write-Host "Project Root: $projectRoot" -ForegroundColor $InfoColor
Write-Host "Docker Compose: $dockerComposePath`n" -ForegroundColor $InfoColor

# Change to project root
Push-Location $projectRoot

try {
    # Check if container already exists
    $containerExists = docker ps -a --filter "name=eks-deployer-postgres" --format "{{.Names}}" 2>$null
    
    if ($containerExists -and -not $Force) {
        Write-Host "Container 'eks-deployer-postgres' already exists." -ForegroundColor $WarningColor
        
        # Check if running
        $containerRunning = docker ps --filter "name=eks-deployer-postgres" --format "{{.Names}}" 2>$null
        
        if ($containerRunning) {
            Write-Host "✓ Database is already running!" -ForegroundColor $SuccessColor
            
            # Show status
            Write-Host "`nContainer Status:" -ForegroundColor $InfoColor
            docker ps --filter "name=eks-deployer-postgres" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        } else {
            Write-Host "Starting existing container..." -ForegroundColor $InfoColor
            docker-compose up -d postgres
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Database started successfully!" -ForegroundColor $SuccessColor
            } else {
                throw "Failed to start database container"
            }
        }
    } else {
        if ($Force -and $containerExists) {
            Write-Host "Force recreating container..." -ForegroundColor $WarningColor
            docker-compose down postgres
            Start-Sleep -Seconds 2
        }
        
        Write-Host "Creating and starting database container..." -ForegroundColor $InfoColor
        docker-compose up -d postgres
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Database created and started successfully!" -ForegroundColor $SuccessColor
        } else {
            throw "Failed to create database container"
        }
    }
    
    # Wait for database to be healthy
    Write-Host "`nWaiting for database to be ready..." -ForegroundColor $InfoColor
    $maxAttempts = 30
    $attempt = 0
    $healthy = $false
    
    while ($attempt -lt $maxAttempts) {
        $attempt++
        $health = docker inspect --format='{{.State.Health.Status}}' eks-deployer-postgres 2>$null
        
        if ($health -eq "healthy") {
            $healthy = $true
            break
        }
        
        Write-Host "  Attempt $attempt/$maxAttempts - Status: $health" -ForegroundColor $WarningColor
        Start-Sleep -Seconds 2
    }
    
    if ($healthy) {
        Write-Host "✓ Database is healthy and ready!" -ForegroundColor $SuccessColor
    } else {
        Write-Host "⚠ Database started but health check timed out" -ForegroundColor $WarningColor
        Write-Host "  Check logs with: docker-compose logs postgres" -ForegroundColor $InfoColor
    }
    
    # Display connection information
    Write-Host "`n=== Database Connection Info ===" -ForegroundColor $InfoColor
    Write-Host "Host:     localhost" -ForegroundColor $InfoColor
    Write-Host "Port:     5432" -ForegroundColor $InfoColor
    Write-Host "Database: eks_deployer" -ForegroundColor $InfoColor
    Write-Host "User:     eks_user" -ForegroundColor $InfoColor
    Write-Host "Password: eks_password_123" -ForegroundColor $InfoColor
    
    # Display volume information
    Write-Host "`n=== Data Persistence ===" -ForegroundColor $InfoColor
    $volumeName = docker volume ls --filter "name=postgres_data" --format "{{.Name}}" 2>$null
    if ($volumeName) {
        Write-Host "✓ Persistent volume: $volumeName" -ForegroundColor $SuccessColor
        Write-Host "  Data Location: Docker volume (survives container removal)" -ForegroundColor $InfoColor
        Write-Host "  Restart Policy: unless-stopped (survives host reboot)" -ForegroundColor $InfoColor
    }
    
    # Display useful commands
    Write-Host "`n=== Useful Commands ===" -ForegroundColor $InfoColor
    Write-Host "View logs:        docker-compose logs -f postgres" -ForegroundColor $InfoColor
    Write-Host "Stop database:    docker-compose stop postgres" -ForegroundColor $InfoColor
    Write-Host "Restart database: docker-compose restart postgres" -ForegroundColor $InfoColor
    Write-Host "Connect to DB:    docker exec -it eks-deployer-postgres psql -U eks_user -d eks_deployer" -ForegroundColor $InfoColor
    Write-Host "Check tables:     docker exec eks-deployer-postgres psql -U eks_user -d eks_deployer -c '\dt'" -ForegroundColor $InfoColor
    
    # Show logs if requested
    if ($Logs) {
        Write-Host "`n=== Database Logs ===" -ForegroundColor $InfoColor
        docker-compose logs --tail=50 postgres
    }
    
    Write-Host "`n✓ Database startup complete!`n" -ForegroundColor $SuccessColor
    
} catch {
    Write-Host "`nERROR: $($_.Exception.Message)" -ForegroundColor $ErrorColor
    Write-Host "Check logs with: docker-compose logs postgres`n" -ForegroundColor $WarningColor
    Pop-Location
    exit 1
} finally {
    Pop-Location
}
