#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Start ZLAWS frontend tunnel for local development
.DESCRIPTION
    Creates port-forward for K8s Multi-Cloud Deployment Platform from localhost to Kubernetes.
    The backend serves both API routes and static frontend files on the same port.
    Frontend: http://localhost:31392
    Features: Real-time WebSocket monitoring, live logs, multi-cloud deployments
#>

Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     ZLAWS Frontend Tunnel Starter                ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check if minikube is running
Write-Host "� Checking Minikube status..." -ForegroundColor Yellow
$minikubeStatus = minikube status 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Minikube is not running!" -ForegroundColor Red
    Write-Host "   Run: minikube start" -ForegroundColor Yellow
    Read-Host "`nPress Enter to exit"
    exit 1
}
Write-Host "✅ Minikube is running`n" -ForegroundColor Green

# Kill any existing kubectl port-forward processes
Write-Host "🧹 Cleaning up existing port-forwards..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*kubectl*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Job | Where-Object {$_.Name -like "*-pf"} | Stop-Job -ErrorAction SilentlyContinue
Get-Job | Where-Object {$_.Name -like "*-pf"} | Remove-Job -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "✅ Cleanup complete`n" -ForegroundColor Green

# Start frontend port-forward in background
Write-Host "🌐 Starting frontend port-forward (31392:80)..." -ForegroundColor Cyan
Write-Host "   Backend serves both API routes (/api/*) and static frontend files" -ForegroundColor Gray
Write-Host "   Note: Using NodePort 31392 (Kubernetes service port)" -ForegroundColor Gray
Start-Job -Name "frontend-pf" -ScriptBlock {
    kubectl port-forward -n zlaws svc/zlaws-backend 31392:80
} | Out-Null

# ========================================
# BACKEND PORT-FORWARDS - NOT NEEDED!
# Frontend Nginx proxies all API requests internally via Kubernetes service DNS
# ========================================

# # Start auth-service port-forward in background
# Write-Host "🔐 Starting auth-service port-forward (3002:3002)..." -ForegroundColor Cyan
# Start-Job -Name "auth-pf" -ScriptBlock {
#     kubectl port-forward -n shared-service svc/auth-service 3002:3002
# } | Out-Null

# # Start postgres port-forward in background (for direct DB access)
# Write-Host "🗄️  Starting postgres port-forward (5432:5432)..." -ForegroundColor Cyan
# Start-Job -Name "postgres-pf" -ScriptBlock {
#     kubectl port-forward -n zlms-data svc/postgres 5432:5432
# } | Out-Null

# # Start file-system-api port-forward in background
# Write-Host "📁 Starting file-system-api port-forward (4004:3008)..." -ForegroundColor Cyan
# Start-Job -Name "filesystem-pf" -ScriptBlock {
#     kubectl port-forward -n filens svc/file-system-api-service 4004:3008
# } | Out-Null

# Wait for port-forward to initialize
Write-Host "`n⏳ Waiting for port-forward to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check status
Write-Host "`n📊 Port-forward status:" -ForegroundColor Green
Get-Job | Where-Object {$_.Name -like "*-pf"} | Format-Table Name, State -AutoSize

Write-Host "`n✅ Frontend is now accessible:" -ForegroundColor Green
Write-Host "   🌐 K8s Deployment Platform: http://localhost:31392" -ForegroundColor White
Write-Host "   📡 API Endpoints:            http://localhost:31392/api/*" -ForegroundColor White
Write-Host "      └─ /api/auth/*        → Authentication" -ForegroundColor Gray
Write-Host "      └─ /api/credentials/* → Cloud Credentials" -ForegroundColor Gray
Write-Host "      └─ /api/deployments/* → Deployments" -ForegroundColor Gray
Write-Host "      └─ /api/clusters/*    → Cluster Management" -ForegroundColor Gray
Write-Host "      └─ /api/status/*      → Status & Metrics" -ForegroundColor Gray
Write-Host "      └─ /api/logs/*        → Logging" -ForegroundColor Gray
Write-Host "   🔌 WebSocket:                ws://localhost:31392" -ForegroundColor White
Write-Host "      └─ Real-time deployment monitoring & logs" -ForegroundColor Gray

Write-Host "`n💡 Tips:" -ForegroundColor Yellow
Write-Host "   • Single unified backend serves both API and frontend" -ForegroundColor Gray
Write-Host "   • Running v16 with WebSocket real-time features" -ForegroundColor Gray
Write-Host "   • View logs: Receive-Job -Name frontend-pf -Keep" -ForegroundColor Gray
Write-Host "   • Stop tunnel: Get-Job | Where-Object {`$_.Name -like '*-pf'} | Stop-Job; Get-Job | Where-Object {`$_.Name -like '*-pf'} | Remove-Job" -ForegroundColor Gray

Write-Host "`n✨ Ready to use K8s Deployment Platform! Press Enter to keep tunnel running or Ctrl+C to stop..." -ForegroundColor Green
Read-Host
