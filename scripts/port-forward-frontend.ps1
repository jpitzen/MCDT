#!/usr/bin/env pwsh
<#
.SYNOPSIS
    K8s Deployment Platform - Frontend Port Forwarding Script
    
.DESCRIPTION
    Ensures clean port forwarding to the frontend service.
    Kills any existing port-forward sessions on the target port and establishes a new connection.

.PARAMETER Port
    Local port to forward to (default: 8080)
    
.PARAMETER Namespace
    Kubernetes namespace (default: zlaws)
    
.PARAMETER ServiceName
    Service name to forward to (default: zlaws-backend)

.EXAMPLE
    .\port-forward-frontend.ps1
    .\port-forward-frontend.ps1 -Port 3000
    .\port-forward-frontend.ps1 -Port 8080 -Namespace zlaws -ServiceName zlaws-backend
#>

param(
    [Parameter(Mandatory=$false)]
    [int]$Port = 8080,
    
    [Parameter(Mandatory=$false)]
    [string]$Namespace = 'zlaws',
    
    [Parameter(Mandatory=$false)]
    [string]$ServiceName = 'zlaws-backend'
)

# Color output
$InfoColor = 'Cyan'
$SuccessColor = 'Green'
$ErrorColor = 'Red'
$WarningColor = 'Yellow'

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = 'White',
        [string]$Prefix = ''
    )
    if ($Prefix) {
        Write-Host "$Prefix " -ForegroundColor $Color -NoNewline
    }
    Write-Host $Message -ForegroundColor $Color
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "▶" $InfoColor $Message
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✓" $SuccessColor $Message
}

function Write-Error-Custom {
    param([string]$Message)
    Write-ColorOutput "✗" $ErrorColor $Message
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-ColorOutput "⚠" $WarningColor $Message
}

Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor $InfoColor
Write-Host "  K8s Deployment Platform - Frontend Port Forward" -ForegroundColor $InfoColor
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor $InfoColor

# Step 1: Check if kubectl is available
Write-Step "Checking kubectl availability..."
try {
    $null = kubectl version --client --short 2>&1
    Write-Success "kubectl is available"
} catch {
    Write-Error-Custom "kubectl not found. Please install kubectl first."
    exit 1
}

# Step 2: Verify Kubernetes context
Write-Step "Verifying Kubernetes context..."
$currentContext = kubectl config current-context 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "No Kubernetes context configured"
    exit 1
}
Write-Success "Current context: $currentContext"

# Step 3: Check if namespace exists
Write-Step "Checking namespace '$Namespace'..."
$namespaceExists = kubectl get namespace $Namespace 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Namespace '$Namespace' not found"
    exit 1
}
Write-Success "Namespace exists"

# Step 4: Check if service exists
Write-Step "Checking service '$ServiceName'..."
$serviceExists = kubectl get service $ServiceName -n $Namespace 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Service '$ServiceName' not found in namespace '$Namespace'"
    exit 1
}
Write-Success "Service exists"

# Step 5: Check if pods are ready
Write-Step "Checking pod status..."
$pods = kubectl get pods -n $Namespace -l app=$ServiceName -o json | ConvertFrom-Json
if ($pods.items.Count -eq 0) {
    Write-Error-Custom "No pods found for service '$ServiceName'"
    exit 1
}

$readyPods = $pods.items | Where-Object { 
    $_.status.containerStatuses | Where-Object { $_.ready -eq $true } 
}

if ($readyPods.Count -eq 0) {
    Write-Error-Custom "No ready pods found. Please wait for pods to be ready."
    kubectl get pods -n $Namespace -l app=$ServiceName
    exit 1
}

Write-Success "$($readyPods.Count) ready pod(s) found"

# Step 6: Kill existing port-forward processes on the target port
Write-Step "Checking for existing port-forward sessions on port $Port..."

# Find processes using the port
$existingProcesses = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
    Select-Object -ExpandProperty OwningProcess -Unique

if ($existingProcesses) {
    Write-Warning-Custom "Found existing process(es) using port $Port"
    foreach ($pid in $existingProcesses) {
        try {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Write-Step "Killing process: $($process.Name) (PID: $pid)"
                Stop-Process -Id $pid -Force
                Write-Success "Process killed"
            }
        } catch {
            Write-Warning-Custom "Could not kill process $pid : $_"
        }
    }
    Start-Sleep -Seconds 2
}

# Also kill any kubectl port-forward processes
Write-Step "Checking for kubectl port-forward processes..."
$kubectlProcesses = Get-Process -Name kubectl -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*port-forward*"
}

if ($kubectlProcesses) {
    Write-Warning-Custom "Found existing kubectl port-forward process(es)"
    foreach ($proc in $kubectlProcesses) {
        Write-Step "Killing kubectl port-forward (PID: $($proc.Id))"
        Stop-Process -Id $proc.Id -Force
        Write-Success "Process killed"
    }
    Start-Sleep -Seconds 2
}

# Step 7: Verify port is now free
Write-Step "Verifying port $Port is available..."
$portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Error-Custom "Port $Port is still in use. Please check manually:"
    Write-Host "  netstat -ano | findstr :$Port" -ForegroundColor Yellow
    exit 1
}
Write-Success "Port $Port is available"

# Step 8: Get service port
Write-Step "Getting service port configuration..."
$serviceInfo = kubectl get service $ServiceName -n $Namespace -o json | ConvertFrom-Json
$servicePort = $serviceInfo.spec.ports[0].port
Write-Success "Service port: $servicePort"

# Step 9: Start port forwarding
Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor $SuccessColor
Write-Host "  Starting Port Forward" -ForegroundColor $SuccessColor
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor $SuccessColor

Write-ColorOutput "Local Port:" $InfoColor "  http://localhost:$Port"
Write-ColorOutput "Service:" $InfoColor "     $Namespace/$ServiceName`:$servicePort"
Write-ColorOutput "Context:" $InfoColor "     $currentContext"
Write-Host ""
Write-Warning-Custom "Press Ctrl+C to stop port forwarding"
Write-Host ""

# Start port forwarding (this will run in foreground)
try {
    kubectl port-forward -n $Namespace "svc/$ServiceName" "${Port}:$servicePort"
} catch {
    Write-Host ""
    Write-Error-Custom "Port forwarding interrupted"
    exit 0
}
