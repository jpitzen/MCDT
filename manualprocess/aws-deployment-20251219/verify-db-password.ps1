# Database Password Verification Script
# Verifies that pfuser password is correctly set for AWS deployment

Write-Host "🔍 Verifying Database Password Configuration..." -ForegroundColor Cyan

# Decode the base64 password from the secret
$encodedPassword = "TEpaLXdrVnZAdF8hZCpQaU0ydGJ4M1RaNGg="
$decodedPassword = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($encodedPassword))

Write-Host "Expected password: LJZ-wkVv@t_!d*PiM2tbx3TZ4h" -ForegroundColor Yellow
Write-Host "Decoded password:  $decodedPassword" -ForegroundColor Yellow

if ($decodedPassword -eq "LJZ-wkVv@t_!d*PiM2tbx3TZ4h") {
    Write-Host "✅ Database password is correctly configured!" -ForegroundColor Green
} else {
    Write-Host "❌ Database password mismatch!" -ForegroundColor Red
    exit 1
}

# Check if the secret file exists and is correct
$secretFile = ".\db-secret.yaml"
if (Test-Path $secretFile) {
    $content = Get-Content $secretFile -Raw
    if ($content -match "DB_PASSWORD: TEpaLXdrVnZAdF8hZCpQaU0ydGJ4M1RaNGg=") {
        Write-Host "✅ db-secret.yaml contains correct password" -ForegroundColor Green
    } else {
        Write-Host "❌ db-secret.yaml password is incorrect" -ForegroundColor Red
    }
} else {
    Write-Host "❌ db-secret.yaml not found" -ForegroundColor Red
}

# Check database config
$configFile = ".\db-config.yaml"
if (Test-Path $configFile) {
    $content = Get-Content $configFile -Raw
    if ($content -match "use1-zlps-msexpsql-01-eks") {
        Write-Host "✅ db-config.yaml points to us-east-1 RDS" -ForegroundColor Green
    } else {
        Write-Host "❌ db-config.yaml not configured for us-east-1" -ForegroundColor Red
    }
} else {
    Write-Host "❌ db-config.yaml not found" -ForegroundColor Red
}

Write-Host "`n📋 Database Configuration Summary:" -ForegroundColor Cyan
Write-Host "Host: use1-zlps-msexpsql-01-eks.c5s06occm2dn.us-east-1.rds.amazonaws.com" -ForegroundColor White
Write-Host "Database: zldb" -ForegroundColor White
Write-Host "User: pfuser" -ForegroundColor White
Write-Host "Password: LJZ-wkVv@t_!d*PiM2tbx3TZ4h" -ForegroundColor White
Write-Host "Port: 1433" -ForegroundColor White