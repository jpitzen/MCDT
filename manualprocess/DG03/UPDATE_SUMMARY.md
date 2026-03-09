# DG03 AWS Deployment Guide - Update Summary

**Date:** December 22, 2025  
**Version:** 3.0

---

## Overview

This document summarizes the updates made to the DG03 AWS Deployment Guide based on critical issues discovered during deployment testing.

---

## 🔴 December 22, 2025 Updates (v3.0)

### New K8s-Optimized Images

| Component | Old Image | New Image | Changes |
|-----------|-----------|-----------|---------|
| **ZLServer** | `zlserver:20251219` | `zlserver-k8s-20251222` | Java 21 pre-installed, K8s startup script |
| **ZLTika** | `zltika:20251219` | `zltika-k8s-20251222` | nc/curl added for health checks |
| **ZLZooKeeper** | `zlzookeeper:20251219` | `zlzookeeper-k8s-20251222` | Auto myid creation from hostname |

### Key Changes in v3.0

1. **No Runtime Java Installation** - Java 21 pre-installed in zlserver image (faster startup)
2. **Dynamic Tika Configuration** - `TIKA_HOST` environment variable replaces static DocumentConversion.xml
3. **Vault Mount Path Changed** - `/var/opt/zlvault/` (application creates ZLVault/ subfolder)
4. **CLUSTER_NAME Settings** - Standardized: MP (zlserver), UI (zlui), SEARCH (zlsearch)
5. **Health Probes Added** - liveness/readiness probes for zltika and zlzookeeper
6. **Simplified ConfigMaps** - No more docconvert-config ConfigMap needed

### Files Updated for v3.0

| File | Changes |
|------|---------|
| `ZL_DG_PHASE_2.html` | Updated image table with k8s-20251222 images |
| `ZL_DG_PHASE_8.html` | Removed DocumentConversion.xml, added TIKA_HOST env var |
| `ZL_DG_PHASE_11.html` | Updated vault path to /var/opt/zlvault/ |
| `aws/*.yaml` | All deployment YAMLs updated with new images and config |

---

## Files Created

### New AWS YAML Files (`DG03/aws/`)

| File | Purpose | Critical Changes |
|------|---------|------------------|
| `zlapp-config.yaml` | Application ConfigMap | **NO ZOO_SERVERS** - env var removed to prevent zkQuorum.cfg corruption. Contains TIKA_HOST/TIKA_PORT for Tika connection |
| `zkclient-config.yaml` | ZooKeeper client configuration | Contains zkQuorum.cfg with **full DNS names** and tcdb.cfg with database config |
| `zlserver-deployment.yaml` | ZL Server deployment | **Config template copy pattern** - mounts ConfigMaps to templates dir, copies at startup |
| `zltika-deployment.yaml` | Tika deployment + service | Combined deployment and service YAML. Tika connection via env vars |
| `zlzookeeper-statefulset.yaml` | ZooKeeper StatefulSet + services | Combined StatefulSet with headless and client services |
| `aws-deployment-checklist.md` | Comprehensive deployment checklist | Step-by-step verification with critical config checks |

---

## Files Updated

### HTML Documentation

| File | Changes |
|------|---------|
| `ZL_DG_PHASE_7.html` | Updated Step 2 "Create Application ConfigMap" to use zkclient-config with zkQuorum.cfg, removed ZOO_SERVERS reference, added critical warnings |
| `ZL_DG_PHASE_8.html` | Updated Steps 1-3 with simplified Tika configuration via environment variables, ConfigMap copy pattern, deployment order requirements |
| `ZL_DG_TROUBLESHOOTING.html` | Added new "ZL Application Issues" section with 7 critical issues and solutions |

---

## Critical Issues Documented

### 1. ZOO_SERVERS Environment Variable Corruption
- **Problem:** ZOO_SERVERS triggers sed commands in startup script that corrupt zkQuorum.cfg
- **Solution:** Remove ZOO_SERVERS from zlapp-config, use zkclient-config ConfigMap instead
- **Files Affected:** zlapp-config.yaml, ZL_DG_PHASE_7.html, ZL_DG_TROUBLESHOOTING.html

### 2. zkQuorum.cfg Requires Full DNS Names
- **Problem:** Short hostnames (zlzookeeper-0) don't resolve in Kubernetes
- **Solution:** Use full DNS format: `zlzookeeper-0.zk-hs.default.svc.cluster.local`
- **Files Affected:** zkclient-config.yaml, ZL_DG_PHASE_7.html, ZL_DG_TROUBLESHOOTING.html

### 3. ConfigMap Files Are Read-Only
- **Problem:** Startup script tries to modify ConfigMap-mounted files, fails with "Device or resource busy"
- **Solution:** Mount ConfigMaps to `/opt/ZipLip/config-templates/`, copy to writable locations at startup
- **Files Affected:** zlserver-deployment.yaml, ZL_DG_PHASE_8.html, ZL_DG_TROUBLESHOOTING.html

### 4. Database SSL Certificate Error
- **Problem:** JDBC connection fails with "trustServerCertificate property is set to false"
- **Solution:** Add `TrustServerCertificate=true` to JDBC URL (for self-signed certs) or use proper CA certs
- **Files Affected:** zkclient-config.yaml (tcdb.cfg), ZL_DG_TROUBLESHOOTING.html

### 5. Tika Connection Configuration
- **Problem:** Tika connection can fail if service name not properly configured
- **Solution:** Use environment variables in zlapp-config: TIKA_HOST=zltika, TIKA_PORT=9972
- **Files Affected:** zlapp-config.yaml, zltika-deployment.yaml

### 6. PVC Name Mismatch
- **Problem:** Deployment references PVC names that don't exist
- **Solution:** Ensure deployment PVC names match actual PVC resources (use `-efs` suffix for AWS)
- **Files Affected:** zlserver-deployment.yaml, zltika-deployment.yaml, ZL_DG_TROUBLESHOOTING.html

---

## Simplification: Tika Configuration via Environment Variables

**Previous Approach (Removed):** Required extracting 647-line DocumentConversion.xml from container, creating ConfigMap, mounting to deployment.

**Current Approach (Simplified):** Tika connection is configured via environment variables in zlapp-config.yaml:
- `TIKA_HOST=zltika` - Service name of Tika deployment
- `TIKA_PORT="9972"` - Tika service port  
- `__tika.ZLTikaService.Host=zltika` - ZL-specific Tika host config
- `__tika.ZLTikaService.Port=9972` - ZL-specific Tika port config

This eliminates the need for:
- Extracting DocumentConversion.xml from container
- Creating docconvert-config ConfigMap
- Mounting additional volumes in zlserver-deployment

---

## Usage Guide

### For New Deployments

1. Read `aws-deployment-checklist.md` for complete step-by-step guide
2. Use YAML files from `DG03/aws/` directory
3. Follow Phase 7 and Phase 8 documentation in order
4. Verify success with: `kubectl logs deployment/zlserver | grep -i "done init"`

### For Troubleshooting

1. Check `ZL_DG_TROUBLESHOOTING.html` for symptoms and solutions
2. Reference critical config checks in `aws-deployment-checklist.md`
3. Verify ConfigMaps don't contain ZOO_SERVERS: `kubectl get configmap zlapp-config -o yaml | grep -i zoo`

---

## File Structure

```
DG03/
├── aws/                                    # NEW - AWS-specific YAML files
│   ├── aws-deployment-checklist.md         # Comprehensive checklist
│   ├── zkclient-config.yaml                # ZooKeeper client config
│   ├── zlapp-config.yaml                   # Application config (NO ZOO_SERVERS, has TIKA_HOST)
│   ├── zlserver-deployment.yaml            # Server deployment
│   ├── zltika-deployment.yaml              # Tika deployment + service
│   └── zlzookeeper-statefulset.yaml        # ZooKeeper StatefulSet + services
├── ZL_DG_PHASE_7.html                      # UPDATED - ZooKeeper deployment
├── ZL_DG_PHASE_8.html                      # UPDATED - Application deployment
├── ZL_DG_TROUBLESHOOTING.html              # UPDATED - Added 6 ZL-specific issues
└── UPDATE_SUMMARY.md                       # This file
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.0 | Dec 22, 2025 | K8s-optimized images (k8s-20251222), TIKA_HOST env var, vault path /var/opt/zlvault/, health probes |
| 2.0 | Dec 2025 | Major update with 7 critical issues, new aws/ directory with corrected YAML files |
| 1.3 | Dec 16, 2025 | Original deployment guide |

