#!/usr/bin/env pwsh
<#
.SYNOPSIS
    ZLAWS EKS Deployer - Database Setup Script
    
.DESCRIPTION
    This script sets up the PostgreSQL database, runs migrations, and seeds initial data.
    It handles all database initialization for local development.

.PARAMETER Action
    The action to perform: setup, migrate, seed, reset, status
    
.EXAMPLE
    ./setup-database.ps1 -Action setup
    ./setup-database.ps1 -Action migrate
    ./setup-database.ps1 -Action seed
    ./setup-database.ps1 -Action reset
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('setup', 'migrate', 'seed', 'reset', 'status', 'all')]
    [string]$Action = 'all'
)

# Color output
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

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠ " -ForegroundColor $WarningColor -NoNewline
    Write-Host $Message -ForegroundColor $WarningColor
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ " -ForegroundColor $InfoColor -NoNewline
    Write-Host $Message -ForegroundColor $InfoColor
}

# Main setup function
function Setup-Database {
    Write-Header "🗄️  DATABASE SETUP - ZLAWS EKS Deployer"
    
    # Check if backend directory exists
    $BackendDir = Join-Path $PSScriptRoot ".." "backend"
    if (-not (Test-Path $BackendDir)) {
        Write-Error-Custom "Backend directory not found: $BackendDir"
        exit 1
    }
    
    Write-Info "Backend directory: $BackendDir"
    
    # Check if Node.js is installed
    Write-Header "Checking Prerequisites"
    
    try {
        $nodeVersion = node --version
        Write-Success "Node.js installed: $nodeVersion"
    }
    catch {
        Write-Error-Custom "Node.js not found. Please install Node.js 18+ first."
        exit 1
    }
    
    try {
        $npmVersion = npm --version
        Write-Success "npm installed: $npmVersion"
    }
    catch {
        Write-Error-Custom "npm not found. Please install Node.js first."
        exit 1
    }
    
    # Check if PostgreSQL is running or Docker
    Write-Header "Checking Database Connectivity"
    
    # Try to connect to PostgreSQL
    $env:PGPASSWORD = "postgres"
    try {
        # Check if PostgreSQL is available
        $pgResult = psql -h localhost -U postgres -d postgres -c "SELECT 1" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "PostgreSQL is running and accessible"
        }
        else {
            Write-Warning-Custom "Could not connect to PostgreSQL. Attempting to start Docker container..."
            Start-DockerPostgres
        }
    }
    catch {
        Write-Warning-Custom "PostgreSQL connection check failed. Attempting to start Docker container..."
        Start-DockerPostgres
    }
    finally {
        Remove-Item env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
    
    # Install dependencies if needed
    Write-Header "Installing Dependencies"
    
    $PackageJsonPath = Join-Path $BackendDir "package.json"
    if (Test-Path $PackageJsonPath) {
        $NodeModulesPath = Join-Path $BackendDir "node_modules"
        if (-not (Test-Path $NodeModulesPath)) {
            Write-Info "Installing npm packages..."
            Push-Location $BackendDir
            npm install
            if ($LASTEXITCODE -ne 0) {
                Write-Error-Custom "npm install failed"
                Pop-Location
                exit 1
            }
            Write-Success "npm packages installed"
            Pop-Location
        }
        else {
            Write-Success "npm packages already installed"
        }
    }
    
    Write-Success "Setup prerequisites completed"
}

# Start PostgreSQL in Docker if not running
function Start-DockerPostgres {
    Write-Info "Checking for existing PostgreSQL Docker container..."
    
    $containerName = "zlaws-postgres"
    $existingContainer = docker ps -a --filter "name=$containerName" --format "{{.Names}}" 2>$null
    
    if ($existingContainer) {
        $runningContainer = docker ps --filter "name=$containerName" --format "{{.Names}}" 2>$null
        if ($runningContainer) {
            Write-Success "PostgreSQL Docker container is already running: $containerName"
        }
        else {
            Write-Info "Starting existing PostgreSQL container..."
            docker start $containerName
            Start-Sleep -Seconds 3
            Write-Success "PostgreSQL container started"
        }
    }
    else {
        Write-Info "Starting new PostgreSQL Docker container..."
        docker run -d `
            --name $containerName `
            -e POSTGRES_USER=postgres `
            -e POSTGRES_PASSWORD=postgres `
            -e POSTGRES_DB=eks_deployer_dev `
            -p 5432:5432 `
            -v postgres-data:/var/lib/postgresql/data `
            postgres:14-alpine
        
        Start-Sleep -Seconds 5
        Write-Success "PostgreSQL Docker container started: $containerName"
    }
}

# Run database migrations
function Run-Migrations {
    Write-Header "Running Database Migrations"
    
    $BackendDir = Join-Path $PSScriptRoot ".." "backend"
    Push-Location $BackendDir
    
    try {
        Write-Info "Running: npm run db:migrate"
        npm run db:migrate
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database migrations completed successfully"
        }
        else {
            Write-Error-Custom "Database migrations failed"
            Pop-Location
            exit 1
        }
    }
    finally {
        Pop-Location
    }
}

# Run database seeders
function Run-Seeders {
    Write-Header "Running Database Seeders"
    
    $BackendDir = Join-Path $PSScriptRoot ".." "backend"
    Push-Location $BackendDir
    
    try {
        Write-Info "Running: npm run db:seed"
        npm run db:seed
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database seeders completed successfully"
        }
        else {
            Write-Error-Custom "Database seeders failed"
            Pop-Location
            exit 1
        }
    }
    finally {
        Pop-Location
    }
}

# Display database status
function Show-DatabaseStatus {
    Write-Header "Database Status"
    
    $BackendDir = Join-Path $PSScriptRoot ".." "backend"
    
    # Check .env file
    $EnvPath = Join-Path $BackendDir ".." ".env"
    if (Test-Path $EnvPath) {
        Write-Success ".env file exists"
    }
    else {
        Write-Error-Custom ".env file not found"
    }
    
    # Check PostgreSQL connection
    $env:PGPASSWORD = "postgres"
    try {
        $result = psql -h localhost -U postgres -d postgres -c "SELECT 1" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "PostgreSQL is accessible"
            
            # Check if database exists
            $dbCheck = psql -h localhost -U postgres -d postgres -c "SELECT datname FROM pg_database WHERE datname='eks_deployer_dev';" 2>$null
            if ($dbCheck) {
                Write-Success "Database 'eks_deployer_dev' exists"
            }
            else {
                Write-Warning-Custom "Database 'eks_deployer_dev' not found"
            }
        }
    }
    catch {
        Write-Error-Custom "PostgreSQL is not accessible"
    }
    finally {
        Remove-Item env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# Reset database (drop and recreate)
function Reset-Database {
    Write-Header "Resetting Database"
    Write-Warning-Custom "This will DROP all tables and data. Proceed? (yes/no)"
    
    $response = Read-Host
    if ($response -ne "yes") {
        Write-Info "Reset cancelled"
        return
    }
    
    $BackendDir = Join-Path $PSScriptRoot ".." "backend"
    Push-Location $BackendDir
    
    try {
        Write-Info "Running: npm run db:migrate:undo:all"
        npm run db:migrate:undo:all
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "All migrations undone"
        }
        else {
            Write-Warning-Custom "Some migrations may not have been undone"
        }
        
        # Run migrations again
        Write-Info "Running migrations again..."
        npm run db:migrate
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database reset and migrations applied"
        }
        else {
            Write-Error-Custom "Database reset failed"
            Pop-Location
            exit 1
        }
    }
    finally {
        Pop-Location
    }
}

# Main execution
try {
    switch ($Action) {
        "setup" {
            Setup-Database
        }
        "migrate" {
            Setup-Database
            Run-Migrations
        }
        "seed" {
            Run-Seeders
        }
        "reset" {
            Reset-Database
        }
        "status" {
            Show-DatabaseStatus
        }
        "all" {
            Setup-Database
            Run-Migrations
            Run-Seeders
            Show-DatabaseStatus
        }
    }
    
    Write-Header "✓ Database Operations Completed Successfully"
    Write-Info "Next steps:"
    Write-Info "1. Start the backend: npm run dev"
    Write-Info "2. Backend will be available at http://localhost:5000"
    Write-Info "3. API documentation available at http://localhost:5000/api/docs"
    
}
catch {
    Write-Error-Custom "An error occurred: $_"
    exit 1
}

