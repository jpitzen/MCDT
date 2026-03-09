<#
.SYNOPSIS
    Optimized start script for ZLAWS dev environment (DB, backend, frontend)

.DESCRIPTION
    - Checks for PostgreSQL on localhost (default port 5432).
    - If not present, can start a Docker container named 'zlaws-postgres'.
    - Optionally suggests/uses kubectl port-forward (does not auto-launch port-forward).
    - Installs npm dependencies in backend/frontend in parallel (unless -NoInstall).
    - Optionally runs migrations after DB is ready (-RunMigrations).
    - Launches backend (`npm run dev`) and frontend (`npm start`) in separate external PowerShell windows.
    - Logs output to logs\<timestamp>\{db_log,BE_log,FE_log}.txt
    - Waits for backend health endpoint and optionally opens browser to frontend.

.PARAMETER NoInstall
    Skip installing npm dependencies.

.PARAMETER DbWaitSeconds
    Seconds to wait for DB readiness after starting it (default 60).

.PARAMETER UseKube
    Use Kubernetes port-forwarding (user must run the port-forward separately).

.PARAMETER RunMigrations
    Run `npm run db:migrate` after backend dependencies installed and DB ready.

.PARAMETER OpenBrowser
    Open `http://localhost:3000` in default browser when servers are up.

.NOTES
    Location: scripts/start-dev-environment.ps1
#>

param(
    [switch]$NoInstall,
    [int]$DbWaitSeconds = 60,
    [switch]$UseKube,
    [switch]$RunMigrations,
    [switch]$OpenBrowser
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  ZLAWS - Start Dev Environment" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

$projectRoot = Split-Path -Parent -Path (Split-Path -Path $PSCommandPath -Parent)
$backendDir = Join-Path $projectRoot 'backend'
$frontendDir = Join-Path $projectRoot 'frontend'

# Create timestamped logs directory
$ts = Get-Date -Format yyyyMMddHHmm
$logsBase = Join-Path $projectRoot 'logs'
$sessionLogDir = Join-Path $logsBase $ts
New-Item -ItemType Directory -Force -Path $sessionLogDir | Out-Null
$dbLogPath = Join-Path $sessionLogDir 'db_log.txt'
$feLogPath = Join-Path $sessionLogDir 'FE_log.txt'
$beLogPath = Join-Path $sessionLogDir 'BE_log.txt'
Write-Host "Logs will be written to: $sessionLogDir" -ForegroundColor Cyan

function Test-PostgresPort {
    param([int]$port = 5432)
    try {
        $result = Test-NetConnection -ComputerName '127.0.0.1' -Port $port -WarningAction SilentlyContinue
        return $result.TcpTestSucceeded
    } catch {
        return $false
    }
}

function Check-Command {
    param([string]$name)
    return (Get-Command $name -ErrorAction SilentlyContinue) -ne $null
}

function Start-PostgresDocker {
    Write-Host "Checking Docker for existing 'zlaws-postgres' container..." -ForegroundColor Cyan
    $containerName = 'zlaws-postgres'

    $existing = (& docker ps -a --filter "name=$containerName" --format "{{.Names}}") 2>$null
    if ($existing) {
        $running = (& docker ps --filter "name=$containerName" --format "{{.Names}}") 2>$null
        if ($running) {
            Write-Host "Postgres container '$containerName' is already running." -ForegroundColor Green
            return
        }
        Write-Host "Starting existing container '$containerName'..." -ForegroundColor Yellow
        docker start $containerName | Out-Null
        return
    }

    Write-Host "Creating and starting new Postgres container '$containerName'..." -ForegroundColor Yellow
    docker run -d `
        --name $containerName `
        -e POSTGRES_USER=postgres `
        -e POSTGRES_PASSWORD=postgres `
        -e POSTGRES_DB=eks_deployer_dev `
        -p 5432:5432 `
        -v zlaws-postgres-data:/var/lib/postgresql/data `
        postgres:14-alpine | Out-Null
    Start-Sleep -Seconds 3
}

function Start-KubePortForward {
    # Kill any existing kubectl port-forward processes for postgres
    Write-Host "Stopping any existing kubectl port-forward processes..." -ForegroundColor Yellow
    Get-Process -Name kubectl -ErrorAction SilentlyContinue | ForEach-Object {
        # Check if it's a port-forward for our postgres pod (best effort)
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    
    # Start port-forward in a new PowerShell window with a recognizable title
    Write-Host "Starting kubectl port-forward in new window..." -ForegroundColor Cyan
    $portForwardCmd = "Set-Title 'ZLAWS Port-Forward'; kubectl port-forward -n zlaws postgres-0 5432:5432"
    Start-Process pwsh -ArgumentList @('-NoProfile', '-NoExit', '-Command', @"
function Set-Title { param([string]`$t) `$Host.UI.RawUI.WindowTitle = `$t }
Set-Title 'ZLAWS Port-Forward'
Write-Host 'Starting port-forward to postgres-0...' -ForegroundColor Cyan
kubectl port-forward -n zlaws postgres-0 5432:5432
"@) -WorkingDirectory $projectRoot
    
    # Wait a moment for port-forward to establish
    Write-Host "Waiting for port-forward to establish..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}

function Wait-For-Postgres {
    param([int]$timeoutSeconds = 60)
    $deadline = (Get-Date).AddSeconds($timeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-PostgresPort) { return $true }
        Start-Sleep -Seconds 2
    }
    return $false
}

Write-Host "Checking PostgreSQL on localhost:5432..." -ForegroundColor Cyan
if (Test-PostgresPort) {
    Write-Host "✓ PostgreSQL reachable" -ForegroundColor Green
} else {
    Write-Host "⚠ PostgreSQL not reachable on localhost:5432" -ForegroundColor Yellow
    if ($UseKube) {
        Start-KubePortForward
        Write-Host "Waiting up to $DbWaitSeconds seconds for PostgreSQL via port-forward..." -ForegroundColor Cyan
        if (Wait-For-Postgres -timeoutSeconds $DbWaitSeconds) {
            Write-Host "✓ PostgreSQL ready via port-forward" -ForegroundColor Green
        } else {
            Write-Host "✗ Postgres did not become reachable via port-forward" -ForegroundColor Red
            Write-Host "Check that Minikube is running and postgres-0 pod is healthy:" -ForegroundColor Yellow
            Write-Host "  kubectl get pods -n zlaws" -ForegroundColor Yellow
            exit 1
        }
    } elseif (-not (Check-Command 'docker')) {
        Write-Host "Docker not found. Start Postgres manually or use -UseKube." -ForegroundColor Red
        exit 1
    } else {
        Start-PostgresDocker
        Write-Host "Waiting up to $DbWaitSeconds seconds for PostgreSQL..." -ForegroundColor Cyan
        if (Wait-For-Postgres -timeoutSeconds $DbWaitSeconds) {
            Write-Host "✓ PostgreSQL ready" -ForegroundColor Green
        } else {
            Write-Host "✗ Postgres did not become ready" -ForegroundColor Red
            Write-Host "Check 'docker logs zlaws-postgres'" -ForegroundColor Yellow
            exit 1
        }
    }
}

# Concurrent npm installs (backend and frontend) if needed
if (-not $NoInstall) {
    $procs = @()
    foreach ($d in @($backendDir, $frontendDir)) {
        if (Test-Path $d) {
            if (-not (Test-Path (Join-Path $d 'node_modules'))) {
                Write-Host "Installing npm in $d..." -ForegroundColor Cyan
                $installLog = Join-Path $sessionLogDir "install_$(Split-Path -Leaf $d).txt"
                $p = Start-Process pwsh -ArgumentList @('-NoProfile', '-Command', "Set-Location -LiteralPath '$d'; npm install 2>&1 | Tee-Object -FilePath '$installLog'") -PassThru
                $procs += $p
            } else {
                Write-Host "Deps already present in $d" -ForegroundColor Green
            }
        }
    }
    if ($procs.Count -gt 0) {
        $procs | ForEach-Object { $_ | Wait-Process }
        Write-Host "npm installs finished" -ForegroundColor Green
    }
}

Write-Host "Launching dev servers and logging output to files..." -ForegroundColor Cyan

# Start DB logs follower
if ($UseKube) {
    if (Check-Command 'kubectl') {
        Write-Host "Starting kubectl logs follow into $dbLogPath (if pod exists)" -ForegroundColor Yellow
        Start-Process pwsh -ArgumentList @('-NoProfile', '-NoExit', '-Command', "kubectl logs -n zlaws -l app=postgres -f 2>&1 | Tee-Object -FilePath '$dbLogPath'") -WorkingDirectory $projectRoot
    } else {
        Write-Host "kubectl not available; skipping DB logs capture" -ForegroundColor Yellow
    }
} else {
    Write-Host "Starting docker logs -f into $dbLogPath" -ForegroundColor Yellow
    Start-Process pwsh -ArgumentList @('-NoProfile', '-NoExit', '-Command', "docker logs -f zlaws-postgres 2>&1 | Tee-Object -FilePath '$dbLogPath'") -WorkingDirectory $projectRoot
}

# Start backend in new window and tee output
if (Test-Path $backendDir) {
    Write-Host "→ Backend: launching and teeing to $beLogPath" -ForegroundColor Yellow
    Start-Process pwsh -ArgumentList @('-NoProfile', '-NoExit', '-Command', "Set-Location -LiteralPath '$backendDir'; npm run dev 2>&1 | Tee-Object -FilePath '$beLogPath'") -WorkingDirectory $backendDir
} else {
    Write-Host "Backend dir not found: $backendDir" -ForegroundColor Red
}

# Start frontend in new window and tee output
if (Test-Path $frontendDir) {
    Write-Host "→ Frontend: launching and teeing to $feLogPath" -ForegroundColor Yellow
    Start-Process pwsh -ArgumentList @('-NoProfile', '-NoExit', '-Command', "Set-Location -LiteralPath '$frontendDir'; npm start 2>&1 | Tee-Object -FilePath '$feLogPath'") -WorkingDirectory $frontendDir
} else {
    Write-Host "Frontend dir not found: $frontendDir" -ForegroundColor Red
}

if ($RunMigrations -and (Test-Path $backendDir)) {
    Write-Host "Running migrations: npm run db:migrate" -ForegroundColor Cyan
    Push-Location $backendDir
    npm run db:migrate
    Pop-Location
}

Write-Host "Waiting for backend health (http://localhost:5000/health) up to 60s..." -ForegroundColor Cyan
$ok = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $r = Invoke-WebRequest -Uri 'http://localhost:5000/health' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -eq 200) {
            $ok = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}
if ($ok) {
    Write-Host "✓ Backend healthy" -ForegroundColor Green
} else {
    Write-Host "⚠ Backend did not respond within timeout" -ForegroundColor Yellow
}

if ($OpenBrowser) {
    Start-Process 'http://localhost:3000'
} else {
    Write-Host "Open http://localhost:3000 when ready" -ForegroundColor Cyan
}

Write-Host "`nDone. Logs: $sessionLogDir" -ForegroundColor Green
