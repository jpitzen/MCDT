# Deploy ZL Deployment Guide to IIS on Port 3500
# This script configures IIS to serve the Deployment Guide from E:\projects\DG_PROD

#Requires -RunAsAdministrator

# Set encoding to UTF-8 for proper character display
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Configuration
$siteName = "Default Web Site"
$appName = "ZL-DeploymentGuide"
$physicalPath = "E:\projects\DG_PROD"
$port = 3500

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "ZL Deployment Guide - IIS Configuration" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Import IIS Module
Write-Host "[Step 1/9] Importing IIS WebAdministration module..." -ForegroundColor Yellow
try {
    Import-Module WebAdministration -ErrorAction Stop
    Write-Host "[OK] IIS module loaded successfully" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to load IIS module. Is IIS installed?" -ForegroundColor Red
    Write-Host "  Install IIS: Install-WindowsFeature -name Web-Server -IncludeManagementTools" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check if URL Rewrite Module is installed
Write-Host "`n[Step 2/9] Checking for IIS URL Rewrite Module..." -ForegroundColor Yellow
$urlRewriteInstalled = Get-WindowsFeature -Name Web-Url-Rewrite -ErrorAction SilentlyContinue
if (-not $urlRewriteInstalled -or $urlRewriteInstalled.InstallState -ne "Installed") {
    Write-Host "[WARN] URL Rewrite Module not detected (optional for this deployment)" -ForegroundColor Yellow
    Write-Host "  Download from: https://www.iis.net/downloads/microsoft/url-rewrite" -ForegroundColor Cyan
} else {
    Write-Host "[OK] URL Rewrite Module is installed" -ForegroundColor Green
}

# Step 3: Verify physical path exists
Write-Host "`n[Step 3/9] Verifying physical path..." -ForegroundColor Yellow
if (-not (Test-Path $physicalPath)) {
    Write-Host "[ERROR] Path does not exist: $physicalPath" -ForegroundColor Red
    Write-Host "  Creating directory..." -ForegroundColor Yellow
    try {
        New-Item -Path $physicalPath -ItemType Directory -Force | Out-Null
        Write-Host "[OK] Directory created: $physicalPath" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to create directory: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[OK] Physical path exists: $physicalPath" -ForegroundColor Green
}

# Step 4: Count files in deployment directory
Write-Host "`n[Step 4/9] Checking deployment files..." -ForegroundColor Yellow
$htmlFiles = Get-ChildItem -Path $physicalPath -Filter "*.html" -ErrorAction SilentlyContinue
$cssFiles = Get-ChildItem -Path $physicalPath -Filter "*.css" -ErrorAction SilentlyContinue
$webConfig = Get-ChildItem -Path $physicalPath -Filter "web.config" -ErrorAction SilentlyContinue

Write-Host "  HTML files: $($htmlFiles.Count) (expected: 22)" -ForegroundColor Cyan
Write-Host "  CSS files: $($cssFiles.Count) (expected: 1)" -ForegroundColor Cyan
Write-Host "  web.config: $(if($webConfig){'Found'}else{'Missing'})" -ForegroundColor $(if($webConfig){'Green'}else{'Yellow'})

if ($htmlFiles.Count -eq 0) {
    Write-Host "[WARN] No HTML files found. You need to copy files to: $physicalPath" -ForegroundColor Yellow
}

# Step 5: Check if site exists
Write-Host "`n[Step 5/9] Checking IIS Default Web Site..." -ForegroundColor Yellow
$site = Get-Website -Name $siteName -ErrorAction SilentlyContinue
if (-not $site) {
    Write-Host "[ERROR] Site '$siteName' not found" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Site '$siteName' exists" -ForegroundColor Green

# Step 6: Remove existing application if present
Write-Host "`n[Step 6/9] Checking for existing application..." -ForegroundColor Yellow
$existingApp = Get-WebApplication -Site $siteName -Name $appName -ErrorAction SilentlyContinue
if ($existingApp) {
    Write-Host "  Removing existing application: $appName" -ForegroundColor Yellow
    Remove-WebApplication -Site $siteName -Name $appName -ErrorAction Stop
    Write-Host "[OK] Existing application removed" -ForegroundColor Green
} else {
    Write-Host "[OK] No existing application found" -ForegroundColor Green
}

# Step 7: Create new application
Write-Host "`n[Step 7/9] Creating IIS application..." -ForegroundColor Yellow
try {
    New-WebApplication -Site $siteName -Name $appName -PhysicalPath $physicalPath -ApplicationPool "DefaultAppPool" -ErrorAction Stop | Out-Null
    Write-Host "[OK] Application created: /$appName" -ForegroundColor Green
    Write-Host "  Physical path: $physicalPath" -ForegroundColor Cyan
    Write-Host "  Application pool: DefaultAppPool" -ForegroundColor Cyan
} catch {
    Write-Host "[ERROR] Failed to create application: $_" -ForegroundColor Red
    exit 1
}

# Step 8: Configure site binding for port 3500
Write-Host "`n[Step 8/9] Configuring port $port binding..." -ForegroundColor Yellow
$binding = Get-WebBinding -Name $siteName -Port $port -Protocol "http" -ErrorAction SilentlyContinue
if (-not $binding) {
    try {
        New-WebBinding -Name $siteName -Protocol "http" -Port $port -IPAddress "*" -ErrorAction Stop
        Write-Host "[OK] Port $port binding created" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to create binding: $_" -ForegroundColor Red
        Write-Host "  Port may already be in use by another application" -ForegroundColor Yellow
    }
} else {
    Write-Host "[OK] Port $port binding already exists" -ForegroundColor Green
}

# Step 9: Configure firewall rule
Write-Host "`n[Step 9/9] Configuring Windows Firewall..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -DisplayName "IIS Port $port" -ErrorAction SilentlyContinue
if (-not $firewallRule) {
    try {
        New-NetFirewallRule -DisplayName "IIS Port $port" `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort $port `
            -Action Allow `
            -Profile Any `
            -ErrorAction Stop | Out-Null
        Write-Host "[OK] Firewall rule created for port $port" -ForegroundColor Green
    } catch {
        Write-Host "[WARN] Failed to create firewall rule: $_" -ForegroundColor Yellow
        Write-Host "  You may need to manually configure firewall" -ForegroundColor Yellow
    }
} else {
    Write-Host "[OK] Firewall rule already exists" -ForegroundColor Green
}

# Step 10: Set file permissions
Write-Host "`n[Step 10/10] Setting file permissions..." -ForegroundColor Yellow
try {
    $acl = Get-Acl $physicalPath
    $permission = "IIS_IUSRS","Read","Allow"
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
    $acl.SetAccessRule($accessRule)
    Set-Acl $physicalPath $acl
    Write-Host "[OK] IIS_IUSRS granted Read access" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Failed to set permissions: $_" -ForegroundColor Yellow
}

# Restart IIS
Write-Host "`n[Final] Restarting IIS..." -ForegroundColor Yellow
try {
    iisreset /noforce | Out-Null
    Write-Host "[OK] IIS restarted successfully" -ForegroundColor Green
} catch {
    Write-Host "[WARN] IIS restart failed: $_" -ForegroundColor Yellow
}

# Summary
Write-Host "`n=======================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Yellow
Write-Host "  Local:   http://localhost:$port/$appName/" -ForegroundColor Cyan
Write-Host "  Network: http://$(hostname):$port/$appName/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Landing Page:" -ForegroundColor Yellow
Write-Host "  http://localhost:$port/$appName/ZL_DG_202512162115.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "Phase 0:" -ForegroundColor Yellow
Write-Host "  http://localhost:$port/$appName/ZL_DG_PHASE_0.html" -ForegroundColor Cyan
Write-Host ""

# Verification
Write-Host "Verification:" -ForegroundColor Yellow
Write-Host "  Files in deployment: $(Get-ChildItem $physicalPath | Measure-Object | Select-Object -ExpandProperty Count)" -ForegroundColor Cyan
Write-Host "  Application path: /$appName" -ForegroundColor Cyan
Write-Host "  Physical path: $physicalPath" -ForegroundColor Cyan
Write-Host ""

# Test URL
Write-Host "Testing connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$port/$appName/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "[OK] Site is responding (HTTP $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Could not connect to site" -ForegroundColor Yellow
    Write-Host "  This may be normal if web.config redirects or no default document exists" -ForegroundColor Cyan
    Write-Host "  Try accessing specific files like ZL_DG_202512162115.html" -ForegroundColor Cyan
}

Write-Host "`nDeployment script completed." -ForegroundColor Green
Write-Host "Review any warnings above before accessing the site." -ForegroundColor Yellow
