# PostgreSQL Port Forward Script
# Forwards PostgreSQL from Kubernetes to localhost:5433 (using 5433 to avoid conflicts)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Port Forward" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting port-forward to PostgreSQL pod..." -ForegroundColor Yellow
Write-Host "Kubernetes: postgres-0.zlaws (port 5432)" -ForegroundColor Gray
Write-Host "Local: localhost:5433" -ForegroundColor Yellow
Write-Host ""
Write-Host "NOTE: Backend .env should use DB_PORT=5433" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the tunnel" -ForegroundColor Yellow
Write-Host ""

# Start the port forward
kubectl port-forward -n zlaws postgres-0 5433:5432

# This line only executes if the port-forward is interrupted
Write-Host ""
Write-Host "Port-forward stopped." -ForegroundColor Red
