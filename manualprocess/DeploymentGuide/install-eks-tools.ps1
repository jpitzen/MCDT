# Install kubectl and aws-cli on Windows SSM bastion
# This script will be executed via SSM Run Command

# Install Chocolatey if not present
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
}

# Install kubectl
choco install kubernetes-cli -y

# Install AWS CLI v2
$awscliUrl = "https://awscli.amazonaws.com/AWSCLIV2.msi"
$installerPath = "$env:TEMP\AWSCLIV2.msi"
Invoke-WebRequest -Uri $awscliUrl -OutFile $installerPath
Start-Process msiexec.exe -Wait -ArgumentList "/i $installerPath /quiet /norestart"
Remove-Item $installerPath

# Verify installations
Write-Host "kubectl version:"
kubectl version --client

Write-Host "`naws-cli version:"
aws --version

Write-Host "`nInstallation complete!"
