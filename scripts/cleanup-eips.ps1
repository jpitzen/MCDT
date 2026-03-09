<#
.SYNOPSIS
    Cleanup unused Elastic IP addresses from failed deployments

.DESCRIPTION
    Identifies and releases unattached Elastic IPs to free up quota.
    Checks for EIPs not associated with any network interface.

.PARAMETER Region
    AWS region to check (default: us-east-2)

.PARAMETER DryRun
    If specified, only show what would be deleted without actually deleting

.PARAMETER Force
    Skip confirmation prompts

.EXAMPLE
    .\cleanup-eips.ps1 -Region us-east-2 -DryRun
    .\cleanup-eips.ps1 -Region us-east-2 -Force
#>

param(
    [string]$Region = "us-east-2",
    [switch]$DryRun,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  AWS EIP Cleanup Tool" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
try {
    $null = aws --version
} catch {
    Write-Host "ERROR: AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    exit 1
}

Write-Host "Region: $Region" -ForegroundColor Yellow
if ($DryRun) {
    Write-Host "Mode: DRY RUN (no changes will be made)" -ForegroundColor Yellow
} else {
    Write-Host "Mode: ACTIVE (EIPs will be released)" -ForegroundColor Yellow
}
Write-Host ""

# Get current EIP quota
Write-Host "Checking EIP quota..." -ForegroundColor Cyan
try {
    $quotaJson = aws service-quotas get-service-quota --service-code ec2 --quota-code L-0263D0A3 --region $Region 2>&1
    if ($LASTEXITCODE -eq 0) {
        $quota = $quotaJson | ConvertFrom-Json
        $maxEips = $quota.Quota.Value
        Write-Host "  EIP Quota Limit: $maxEips" -ForegroundColor Green
    } else {
        Write-Host "  Could not retrieve quota (using default: 5)" -ForegroundColor Yellow
        $maxEips = 5
    }
} catch {
    Write-Host "  Could not retrieve quota (using default: 5)" -ForegroundColor Yellow
    $maxEips = 5
}

# Get all EIPs
Write-Host ""
Write-Host "Fetching all Elastic IPs..." -ForegroundColor Cyan
$eipsJson = aws ec2 describe-addresses --region $Region --output json
$eips = ($eipsJson | ConvertFrom-Json).Addresses

Write-Host "  Total EIPs: $($eips.Count)" -ForegroundColor Green
Write-Host "  Available quota: $($maxEips - $eips.Count)" -ForegroundColor $(if (($maxEips - $eips.Count) -le 0) { "Red" } else { "Green" })

# Find unattached EIPs
$unattachedEips = $eips | Where-Object { 
    -not $_.NetworkInterfaceId -and -not $_.InstanceId -and -not $_.AssociationId
}

Write-Host ""
if ($unattachedEips.Count -eq 0) {
    Write-Host "No unattached EIPs found. All EIPs are in use." -ForegroundColor Green
    exit 0
}

Write-Host "Found $($unattachedEips.Count) unattached EIP(s):" -ForegroundColor Yellow
Write-Host ""

$unattachedEips | ForEach-Object {
    $name = ($_.Tags | Where-Object { $_.Key -eq "Name" }).Value
    if (-not $name) { $name = "(no name)" }
    
    Write-Host "  • AllocationId: $($_.AllocationId)" -ForegroundColor White
    Write-Host "    Public IP: $($_.PublicIp)" -ForegroundColor Gray
    Write-Host "    Name: $name" -ForegroundColor Gray
    Write-Host ""
}

# Confirm deletion
if (-not $DryRun -and -not $Force) {
    Write-Host ""
    $confirmation = Read-Host "Do you want to release these $($unattachedEips.Count) EIP(s)? (yes/no)"
    if ($confirmation -ne "yes") {
        Write-Host "Aborted by user." -ForegroundColor Yellow
        exit 0
    }
}

# Release EIPs
$successCount = 0
$failCount = 0

Write-Host ""
Write-Host "Releasing EIPs..." -ForegroundColor Cyan

foreach ($eip in $unattachedEips) {
    $name = ($eip.Tags | Where-Object { $_.Key -eq "Name" }).Value
    if (-not $name) { $name = $eip.PublicIp }
    
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would release: $name ($($eip.AllocationId))" -ForegroundColor Yellow
        $successCount++
    } else {
        try {
            aws ec2 release-address --allocation-id $eip.AllocationId --region $Region 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Released: $name ($($eip.AllocationId))" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host "  ✗ Failed to release: $name ($($eip.AllocationId))" -ForegroundColor Red
                $failCount++
            }
        } catch {
            Write-Host "  ✗ Error releasing: $name - $($_.Exception.Message)" -ForegroundColor Red
            $failCount++
        }
    }
}

# Summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "  Would release: $successCount EIP(s)" -ForegroundColor Yellow
} else {
    Write-Host "  Successfully released: $successCount EIP(s)" -ForegroundColor Green
    if ($failCount -gt 0) {
        Write-Host "  Failed: $failCount EIP(s)" -ForegroundColor Red
    }
    
    # Show new quota
    $newAvailable = $maxEips - ($eips.Count - $successCount)
    Write-Host "  New available quota: $newAvailable" -ForegroundColor $(if ($newAvailable -gt 0) { "Green" } else { "Yellow" })
}
Write-Host ""
