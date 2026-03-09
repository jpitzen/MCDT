# ZL Deployment Guide - File Structure

## Directory Structure

```
DG03/
├── Core Files (Required)
│   ├── ZL_DG_202512162115.html        # Main landing page/index
│   ├── ZL_DG_202512162115.css         # Global stylesheet
│   └── web.config                      # IIS configuration
│
├── Phase Files (14 files)
│   ├── ZL_DG_PHASE_0.html             # AWS Configuration & Prerequisites
│   ├── ZL_DG_PHASE_1.html             # EKS Cluster Creation
│   ├── ZL_DG_PHASE_2.html             # ECR & Container Image Management
│   ├── ZL_DG_PHASE_3.html             # EBS CSI Driver & Storage Classes
│   ├── ZL_DG_PHASE_4.html             # EFS CSI Driver & Persistent Volumes
│   ├── ZL_DG_PHASE_5.html             # S3 CSI Driver (Mountpoint for S3)
│   ├── ZL_DG_PHASE_6.html             # Database Configuration
│   ├── ZL_DG_PHASE_7.html             # ZooKeeper Deployment
│   ├── ZL_DG_PHASE_8.html             # Application Deployment (Tika, Server, UI)
│   ├── ZL_DG_PHASE_9.html             # Network & Ingress (ALB Controller)
│   ├── ZL_DG_PHASE_10.html            # Cluster Autoscaler
│   ├── ZL_DG_PHASE_11.html            # Post-Deployment Configuration
│   ├── ZL_DG_PHASE_12.html            # EC2 Network Connectivity
│   └── ZL_DG_PHASE_13.html            # Vulnerability Scanning & Security
│
├── Appendix Files (6 files)
│   ├── ZL_DG_APPENDIX_A.html          # Appendix A
│   ├── ZL_DG_APPENDIX_B.html          # Appendix B
│   ├── ZL_DG_APPENDIX_C.html          # Appendix C
│   ├── ZL_DG_APPENDIX_D.html          # Appendix D
│   ├── ZL_DG_APPENDIX_E.html          # Appendix E
│   └── ZL_DG_APPENDIX_F.html          # Appendix F
│
├── Additional Pages (1 file)
│   └── ZL_DG_TROUBLESHOOTING.html     # Troubleshooting guide
│
├── Supporting Directories
│   ├── aws/                            # AWS configuration files and logs
│   │   └── Logs/                       # Console logs and debug files
│   │
│   └── Instructions/                   # Additional deployment instructions
│
└── Documentation (Optional)
    ├── IIS_DEPLOYMENT.md               # This deployment guide
    ├── applicationDeployment.md        # Application deployment notes
    ├── DG03_UPDATE_20251222.md        # Update history
    └── UPDATE_SUMMARY.md               # Summary of recent updates
```

## File Manifest

### Essential Files (24 total)

#### HTML Pages (22 files)
1. `ZL_DG_202512162115.html` - Main landing page
2. `ZL_DG_PHASE_0.html` - Phase 0
3. `ZL_DG_PHASE_1.html` - Phase 1
4. `ZL_DG_PHASE_2.html` - Phase 2
5. `ZL_DG_PHASE_3.html` - Phase 3
6. `ZL_DG_PHASE_4.html` - Phase 4
7. `ZL_DG_PHASE_5.html` - Phase 5
8. `ZL_DG_PHASE_6.html` - Phase 6
9. `ZL_DG_PHASE_7.html` - Phase 7
10. `ZL_DG_PHASE_8.html` - Phase 8
11. `ZL_DG_PHASE_9.html` - Phase 9
12. `ZL_DG_PHASE_10.html` - Phase 10
13. `ZL_DG_PHASE_11.html` - Phase 11
14. `ZL_DG_PHASE_12.html` - Phase 12
15. `ZL_DG_PHASE_13.html` - Phase 13
16. `ZL_DG_APPENDIX_A.html` - Appendix A
17. `ZL_DG_APPENDIX_B.html` - Appendix B
18. `ZL_DG_APPENDIX_C.html` - Appendix C
19. `ZL_DG_APPENDIX_D.html` - Appendix D
20. `ZL_DG_APPENDIX_E.html` - Appendix E
21. `ZL_DG_APPENDIX_F.html` - Appendix F
22. `ZL_DG_TROUBLESHOOTING.html` - Troubleshooting

#### Stylesheets (1 file)
23. `ZL_DG_202512162115.css` - Global styles

#### Configuration (1 file)
24. `web.config` - IIS configuration

## Dependencies and References

### CSS References
All HTML files reference:
```html
<link rel="stylesheet" href="ZL_DG_202512162115.css">
```

### Navigation Links
- Landing page (`ZL_DG_202512162115.html`) links to all phases and appendices
- Each phase has Previous/Next navigation to adjacent phases
- Phase 0 is first phase, Phase 13 is last phase

### Copy Button System
All phases include:
- `initializeCopyButtons()` function
- `copyToClipboard()` function  
- `fallbackCopy()` function
- `showCopied()` function
- Copy buttons exclude `.output-block` and `.yaml-panel` elements

### Navigation Pattern
Each phase includes:
- Top navigation controls (always visible)
- Bottom navigation controls (per step)
- Step indicators/dots
- Progress bar
- No automatic scrolling on navigation

## File Sizes (Approximate)

| File Type | Count | Est. Size Each | Total Size |
|-----------|-------|----------------|------------|
| HTML (Landing) | 1 | 500 KB | 500 KB |
| HTML (Phases) | 14 | 200-400 KB | 4 MB |
| HTML (Appendices) | 6 | 150-300 KB | 1.5 MB |
| HTML (Other) | 1 | 200 KB | 200 KB |
| CSS | 1 | 50 KB | 50 KB |
| Config | 1 | 1 KB | 1 KB |
| **TOTAL** | **24** | - | **~6-7 MB** |

## Browser Compatibility

### Required Features
- HTML5 support
- CSS3 support (Grid, Flexbox)
- JavaScript ES6+
- Clipboard API (for copy buttons)
- Local Storage (for progress tracking)

### Tested Browsers
- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

### Mobile Support
- Responsive design included
- Touch-friendly navigation
- Mobile sidebar toggle

## Version Information

**Current Version**: December 2024 Update
**Last Updated**: December 22, 2024
**CSS Version**: 202512162115

## Feature Summary

### All Phases Include
✅ Step-by-step pagination navigation  
✅ Copy buttons on command blocks  
✅ Progress tracking with dots and progress bar  
✅ Collapsible YAML viewers  
✅ Syntax-highlighted code blocks  
✅ Bottom navigation controls  
✅ Objective highlighting  
✅ Local storage for progress  

### Excluded from Copy Buttons
- `.output-block` elements (verification outputs)
- `.yaml-panel` elements (have own copy buttons)
- Already wrapped `.pre-wrapper` elements

## Deployment Checklist

- [ ] All 22 HTML files present
- [ ] CSS file present
- [ ] web.config present
- [ ] All HTML files reference correct CSS path
- [ ] Navigation links verified between phases
- [ ] Copy button functionality tested
- [ ] Bottom navigation tested on all phases
- [ ] No console errors in browser
- [ ] Responsive design working on mobile

## Quick Deploy Command (PowerShell)

```powershell
# Deploy all required files to IIS
$source = "C:\Projects\aws-zl\DG03"
$dest = "C:\inetpub\wwwroot\ZL-DeploymentGuide"

# Create destination
New-Item -Path $dest -ItemType Directory -Force

# Copy essential files
Copy-Item "$source\*.html" -Destination $dest
Copy-Item "$source\*.css" -Destination $dest
Copy-Item "$source\web.config" -Destination $dest

Write-Host "Deployment complete: $dest" -ForegroundColor Green
Write-Host "Total files copied: $(Get-ChildItem $dest | Measure-Object | Select-Object -ExpandProperty Count)" -ForegroundColor Cyan
```

## Access URLs After Deployment

```
Landing Page:    http://localhost:3500/ZL-DeploymentGuide/
Phase 0:         http://localhost:3500/ZL-DeploymentGuide/ZL_DG_PHASE_0.html
Phase 1:         http://localhost:3500/ZL-DeploymentGuide/ZL_DG_PHASE_1.html
...
Phase 13:        http://localhost:3500/ZL-DeploymentGuide/ZL_DG_PHASE_13.html
Appendix A:      http://localhost:3500/ZL-DeploymentGuide/ZL_DG_APPENDIX_A.html
Troubleshooting: http://localhost:3500/ZL-DeploymentGuide/ZL_DG_TROUBLESHOOTING.html
```
