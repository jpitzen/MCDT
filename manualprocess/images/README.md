# Kubernetes-Optimized ZL Images

This directory contains Dockerfiles and supporting scripts to build Kubernetes-optimized versions of the ZL application images.

## Overview

| Image | Base | Improvements |
|-------|------|--------------|
| `zlserver:11.1.0-b1140-k8s` | zlserver:11.1.0-b1140 | Java 21 pre-installed, fixed startup script, writable config paths, TIKA_HOST templating |
| `zltika:11.1.0-b1140-k8s` | zltika:11.1.0-b1140 | HTTP health endpoint on port 9973 |
| `zlzookeeper:11.1.0-b1140-k8s` | zlzookeeper:11.1.0-b1140 | Auto myid creation, auto zoo.cfg generation |

## Benefits

| Change | Benefit |
|--------|---------|
| Fix startup script sed | Eliminates ZOO_SERVERS corruption issue |
| Pre-install Java 21 | Saves 30-60s per pod startup |
| Writable config paths | Eliminates config copy workaround |
| DocumentConversion.xml templating | Eliminates 647-line ConfigMap requirement |
| Tika health endpoint | Better Kubernetes integration (httpGet probes) |
| ZooKeeper myid auto-creation | Eliminates init container |
| Kubernetes-aware defaults | Simpler ConfigMaps, fewer overrides needed |

## Directory Structure

```
images/
├── README.md                   # This file
├── zlserver/
│   ├── Dockerfile              # ZLServer Kubernetes-optimized build
│   └── zlserver-startup-k8s.sh # Patched startup script
├── zltika/
│   ├── Dockerfile              # ZLTika Kubernetes-optimized build
│   ├── tika-health.sh          # TCP health check
│   ├── tika-health-server.sh   # HTTP health endpoint
│   └── zltika-startup-k8s.sh   # Startup with health server
├── zlzookeeper/
│   ├── Dockerfile              # ZLZooKeeper Kubernetes-optimized build
│   ├── zlzookeeper-startup-k8s.sh # Auto myid/config startup
│   └── zk-health.sh            # ZK health check (ruok)
└── deployments/
    ├── zlserver-deployment-k8s.yaml    # Simplified zlserver deployment
    ├── zltika-deployment-k8s.yaml      # Tika with HTTP health probes
    ├── zlzookeeper-statefulset-k8s.yaml # ZK without init container
    └── zlapp-config-k8s.yaml           # Minimal ConfigMap
```

## Building Images

### Prerequisites

1. Docker installed and running
2. AWS CLI configured with ECR access (only for push)
3. **Local base images available** (check with `docker images | Select-String zl`)

Your local images:
- `zlserver:20251219` - ZLServer base
- `zltika:20251219` - ZLTika base  
- `zlzookeeper:20251219` - ZLZooKeeper base

### Build Locally (Default)

```powershell
# Build all images using local base images
.\build-k8s-images.ps1

# Build and push to ECR
.\build-k8s-images.ps1 -PushToECR

# Use different local tag
.\build-k8s-images.ps1 -LocalTag "20251220"
```

### Manual Build

```bash
# Build zlserver from local image
cd images/zlserver
docker build -t zlserver:k8s .

# Or specify a different base image
docker build \
  --build-arg BASE_IMAGE=zlserver:20251220 \
  -t zlserver:k8s .

# Build zltika
cd ../zltika
docker build -t zltika:k8s .

# Build zlzookeeper
cd ../zlzookeeper
docker build -t zlzookeeper:k8s .
```

## Image Details

### zlserver:11.1.0-b1140-k8s

**Fixes:**
1. **Java 21 Pre-installed**: No more `apt-get install openjdk-21-jre-headless` at startup
2. **Startup Script Patched**: ZOO_SERVERS env var is safely ignored in Kubernetes
3. **Writable Config Paths**: Direct ConfigMap mounts work without copy workaround
4. **TIKA_HOST Templating**: DocumentConversion.xml contains `__TIKA_HOST__` placeholder

**Environment Variables:**
| Variable | Default | Description |
|----------|---------|-------------|
| `TIKA_HOST` | `zltika` | Tika service hostname |
| `TIKA_PORT` | `9972` | Tika service port |
| `KUBERNETES_DEPLOYMENT` | `true` | Enables Kubernetes-specific behavior |
| `WAIT_FOR_ZOOKEEPER` | `false` | Wait for ZK before starting |

### zltika:11.1.0-b1140-k8s

**Fixes:**
1. **HTTP Health Endpoint**: Port 9973 responds to HTTP requests
2. **Better Probes**: Use `httpGet` instead of `tcpSocket` for readiness/liveness

**Ports:**
| Port | Protocol | Purpose |
|------|----------|---------|
| 9972 | TCP | Tika binary protocol |
| 9973 | HTTP | Health endpoint |

### zlzookeeper:11.1.0-b1140-k8s

**Fixes:**
1. **Auto myid Creation**: Extracts ordinal from StatefulSet hostname
2. **Auto zoo.cfg Generation**: Creates cluster config from environment variables
3. **No Init Container**: Eliminates `initContainers` complexity

**Environment Variables:**
| Variable | Default | Description |
|----------|---------|-------------|
| `ZK_REPLICAS` | `3` | Number of ZK nodes |
| `ZK_SERVICE_NAME` | `zk-hs` | Headless service name |
| `ZK_NAMESPACE` | `default` | Kubernetes namespace |
| `ZK_GENERATE_CONFIG` | unset | Set to generate zoo.cfg |

## Migration Guide

### From Original Images

1. **Build new images:**
   ```powershell
   .\build-k8s-images.ps1 -PushToECR
   ```

2. **Update deployments:**
   ```yaml
   # Change image tag from:
   image: .../zlserver:11.1.0-b1140
   # To:
   image: .../zlserver:11.1.0-b1140-k8s
   ```

3. **Simplify zlserver deployment:**
   - Remove Java install from `args`
   - Remove config-templates volume mounts
   - Mount ConfigMaps directly to final paths

4. **Simplify zltika deployment:**
   - Add port 9973 for health endpoint
   - Change probes from `tcpSocket` to `httpGet`

5. **Simplify zlzookeeper StatefulSet:**
   - Remove `initContainers` section
   - Add environment variables for cluster config

### Example: Before and After

**Before (original image):**
```yaml
containers:
- name: zlserver
  image: .../zlserver:11.1.0-b1140
  command: ["/bin/bash", "-c"]
  args:
  - |
    apt-get update && apt-get install -y openjdk-21-jre-headless
    cp /opt/ZipLip/config-templates/tcdb.cfg /opt/ZipLip/bin/zk/tcdb.cfg
    cp /opt/ZipLip/config-templates/zkQuorum.cfg /opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg
    /opt/ZipLip/bin/zlserver-startup.sh
  volumeMounts:
  - mountPath: /opt/ZipLip/config-templates/tcdb.cfg
    name: zkclient-config
    subPath: tcdb.cfg
```

**After (k8s-optimized image):**
```yaml
containers:
- name: zlserver
  image: .../zlserver:11.1.0-b1140-k8s
  # No command/args needed - image handles everything
  volumeMounts:
  - mountPath: /opt/ZipLip/bin/zk/tcdb.cfg
    name: zkclient-config
    subPath: tcdb.cfg
```

## Troubleshooting

### Image Build Fails

1. Ensure base images are accessible:
   ```bash
   docker pull phoenix-alpine-bld:5000/zlserver:11.1.0-b1140
   ```

2. Check Docker is running and has sufficient resources

### Tika Health Endpoint Not Responding

1. Check both ports are exposed:
   ```bash
   kubectl get svc zltika
   # Should show ports 9972 and 9973
   ```

2. Test health endpoint:
   ```bash
   kubectl run test --rm -it --image=curlimages/curl -- curl http://zltika:9973
   ```

### ZooKeeper myid Not Created

1. Check hostname is parseable:
   ```bash
   kubectl exec zlzookeeper-0 -- hostname
   # Should be: zlzookeeper-0
   ```

2. Check myid file:
   ```bash
   kubectl exec zlzookeeper-0 -- cat /var/lib/zookeeper/data/myid
   # Should be: 1
   ```
