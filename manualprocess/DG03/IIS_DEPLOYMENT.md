# ZL Deployment Guide - IIS Deployment Instructions

## Overview
This document provides step-by-step instructions for deploying the ZL Deployment Guide to an IIS server on port 3500.

## Prerequisites
- Windows Server with IIS installed
- IIS URL Rewrite Module installed
- Administrative access to IIS

## Required Files

### Core HTML Files (20 files)
```
DG03/
├── ZL_DG_202512162115.html       # Main landing page
├── ZL_DG_PHASE_0.html             # Phase 0: AWS Configuration
├── ZL_DG_PHASE_1.html             # Phase 1: EKS Cluster Setup
├── ZL_DG_PHASE_2.html             # Phase 2: ECR & Image Management
├── ZL_DG_PHASE_3.html             # Phase 3: Storage Configuration
├── ZL_DG_PHASE_4.html             # Phase 4: EFS CSI Driver
├── ZL_DG_PHASE_5.html             # Phase 5: S3 CSI Driver
├── ZL_DG_PHASE_6.html             # Phase 6: Database Configuration
├── ZL_DG_PHASE_7.html             # Phase 7: ZooKeeper Deployment
├── ZL_DG_PHASE_8.html             # Phase 8: Application Deployment
├── ZL_DG_PHASE_9.html             # Phase 9: Network & Ingress
├── ZL_DG_PHASE_10.html            # Phase 10: Cluster Autoscaler
├── ZL_DG_PHASE_11.html            # Phase 11: Post-Deployment Config
├── ZL_DG_PHASE_12.html            # Phase 12: EC2 Connectivity
├── ZL_DG_PHASE_13.html            # Phase 13: Vulnerability Scanning
├── ZL_DG_APPENDIX_A.html          # Appendix A
├── ZL_DG_APPENDIX_B.html          # Appendix B
├── ZL_DG_APPENDIX_C.html          # Appendix C
├── ZL_DG_APPENDIX_D.html          # Appendix D
├── ZL_DG_APPENDIX_E.html          # Appendix E
├── ZL_DG_APPENDIX_F.html          # Appendix F
└── ZL_DG_TROUBLESHOOTING.html     # Troubleshooting Guide
```

### Stylesheet (1 file)
```
DG03/
└── ZL_DG_202512162115.css         # Global styles for all pages
```

### IIS Configuration (1 file)
```
DG03/
└── web.config                      # IIS URL rewrite and MIME types
```

### Supporting Directories
```
DG03/
├── aws/                            # AWS-related files and logs
├── Instructions/                   # Additional instruction files
└── (Optional) Documentation markdown files
```

## File Structure for Deployment

### Minimal Deployment (Required)
```
C:\inetpub\wwwroot\ZL-DeploymentGuide\
├── ZL_DG_202512162115.html
├── ZL_DG_202512162115.css
├── web.config
├── ZL_DG_PHASE_0.html
├── ZL_DG_PHASE_1.html
├── ZL_DG_PHASE_2.html
├── ZL_DG_PHASE_3.html
├── ZL_DG_PHASE_4.html
├── ZL_DG_PHASE_5.html
├── ZL_DG_PHASE_6.html
├── ZL_DG_PHASE_7.html
├── ZL_DG_PHASE_8.html
├── ZL_DG_PHASE_9.html
├── ZL_DG_PHASE_10.html
├── ZL_DG_PHASE_11.html
├── ZL_DG_PHASE_12.html
├── ZL_DG_PHASE_13.html
├── ZL_DG_APPENDIX_A.html
├── ZL_DG_APPENDIX_B.html
├── ZL_DG_APPENDIX_C.html
├── ZL_DG_APPENDIX_D.html
├── ZL_DG_APPENDIX_E.html
├── ZL_DG_APPENDIX_F.html
└── ZL_DG_TROUBLESHOOTING.html
```

## Deployment Steps

### Step 1: Install IIS URL Rewrite Module
1. Download URL Rewrite Module from Microsoft:
   ```
   https://www.iis.net/downloads/microsoft/url-rewrite
   ```
2. Install the module
3. Restart IIS

### Step 2: Create IIS Application
1. Open **IIS Manager**
2. Expand **Sites** → **Default Web Site**
3. Right-click **Default Web Site** → **Add Application**
   - **Alias**: `ZL-DeploymentGuide`
   - **Physical Path**: `C:\inetpub\wwwroot\ZL-DeploymentGuide`
   - Click **OK**

### Step 3: Copy Files to IIS Directory
```powershell
# Create deployment directory
New-Item -Path "C:\inetpub\wwwroot\ZL-DeploymentGuide" -ItemType Directory -Force

# Copy all HTML files
Copy-Item "C:\Projects\aws-zl\DG03\*.html" -Destination "C:\inetpub\wwwroot\ZL-DeploymentGuide\"

# Copy CSS file
Copy-Item "C:\Projects\aws-zl\DG03\*.css" -Destination "C:\inetpub\wwwroot\ZL-DeploymentGuide\"

# Copy web.config
Copy-Item "C:\Projects\aws-zl\DG03\web.config" -Destination "C:\inetpub\wwwroot\ZL-DeploymentGuide\"
```

### Step 4: Configure IIS Site Binding for Port 3500
1. In **IIS Manager**, select **Default Web Site**
2. Click **Bindings** in the right panel
3. Click **Add**
   - **Type**: http
   - **IP Address**: All Unassigned
   - **Port**: 3500
   - Click **OK**

### Step 5: Configure Application Settings
1. Select the **ZL-DeploymentGuide** application
2. **Application Pool Settings**:
   - Right-click the application → **Manage Application** → **Advanced Settings**
   - Verify **Application Pool**: DefaultAppPool
   - **.NET CLR Version**: No Managed Code (static HTML)

3. **MIME Types** (should be configured via web.config):
   - Ensure `.html` → `text/html`
   - Ensure `.css` → `text/css`
   - Ensure `.js` → `application/javascript`

### Step 6: Verify web.config
The `web.config` file should contain:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <staticContent>
            <mimeMap fileExtension=".html" mimeType="text/html" />
            <mimeMap fileExtension=".css" mimeType="text/css" />
            <mimeMap fileExtension=".js" mimeType="application/javascript" />
            <mimeMap fileExtension=".json" mimeType="application/json" />
        </staticContent>
        <defaultDocument>
            <files>
                <clear />
                <add value="ZL_DG_202512162115.html" />
            </files>
        </defaultDocument>
    </system.webServer>
</configuration>
```

### Step 7: Set Permissions
```powershell
# Grant IIS_IUSRS read access
$path = "C:\inetpub\wwwroot\ZL-DeploymentGuide"
$acl = Get-Acl $path
$permission = "IIS_IUSRS","Read","Allow"
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
$acl.SetAccessRule($accessRule)
Set-Acl $path $acl
```

### Step 8: Configure Firewall
```powershell
# Allow inbound traffic on port 3500
New-NetFirewallRule -DisplayName "IIS Port 3500" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 3500 `
    -Action Allow `
    -Profile Any
```

### Step 9: Restart IIS
```powershell
iisreset
```

## Access the Deployment Guide

### Local Access
```
http://localhost:3500/ZL-DeploymentGuide/
```

### Network Access
```
http://<SERVER-IP>:3500/ZL-DeploymentGuide/
```

### Direct Landing Page
```
http://<SERVER-IP>:3500/ZL-DeploymentGuide/ZL_DG_202512162115.html
```

## Verification Checklist

- [ ] IIS URL Rewrite Module installed
- [ ] Application created in IIS Manager
- [ ] All 22 HTML files copied to deployment directory
- [ ] CSS file copied to deployment directory
- [ ] web.config copied and configured
- [ ] Port 3500 binding added to site
- [ ] Firewall rule created for port 3500
- [ ] Permissions set for IIS_IUSRS
- [ ] IIS restarted
- [ ] Landing page accessible at http://localhost:3500/ZL-DeploymentGuide/
- [ ] All phase links working
- [ ] CSS styles loading correctly
- [ ] Copy buttons appearing on command blocks
- [ ] Bottom navigation controls working

## Troubleshooting

### Issue: 404 Not Found
**Solution**: Verify application alias and physical path in IIS Manager

### Issue: Styles not loading
**Solution**: Check web.config MIME types and verify CSS file is in deployment directory

### Issue: Cannot access from network
**Solution**: Verify firewall rule and network connectivity

### Issue: Copy buttons not working
**Solution**: Check browser console for JavaScript errors; ensure all HTML files are using latest version

### Issue: Pages display but no formatting
**Solution**: Verify CSS file path in HTML files matches deployment structure

## Optional Enhancements

### Add HTTPS (Port 443)
1. Obtain SSL certificate
2. Add HTTPS binding in IIS
3. Update firewall rules

### Custom Domain
1. Configure DNS A record pointing to server IP
2. Add host header binding in IIS

### Logging
1. Enable IIS logging for the application
2. Monitor access logs in `C:\inetpub\logs\LogFiles`

## Files List Summary

**Total Files Required**: 24
- HTML Pages: 22
- CSS Stylesheets: 1
- Configuration: 1 (web.config)

**Deployment Size**: ~5-10 MB (depending on embedded images)

**Browser Requirements**:
- Modern browser with JavaScript enabled
- Support for ES6+ features
- Clipboard API support (for copy buttons)

## Maintenance

### Updating Content
1. Update source files in `C:\Projects\aws-zl\DG03\`
2. Re-copy files to `C:\inetpub\wwwroot\ZL-DeploymentGuide\`
3. Clear browser cache or force refresh (Ctrl+F5)

### Backup
```powershell
# Backup deployment directory
$backupPath = "C:\Backups\ZL-DeploymentGuide-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item "C:\inetpub\wwwroot\ZL-DeploymentGuide" -Destination $backupPath -Recurse
```

## Support Contact
For deployment issues, contact your system administrator or DevOps team.
