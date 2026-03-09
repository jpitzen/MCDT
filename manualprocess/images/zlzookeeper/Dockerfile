# ZLZooKeeper Dockerfile - Kubernetes Optimized
# Base: Local zlzookeeper:20251219 (or ECR image)
# Improvements:
#   1. Auto-create myid from hostname (eliminates init container)
#   2. Install netcat for health checks

# Use local image by default - override with --build-arg BASE_IMAGE=...
ARG BASE_IMAGE=zlzookeeper:20251219
FROM ${BASE_IMAGE}

LABEL maintainer="ZL DevOps"
LABEL version="11.1.0-b1140-k8s"
LABEL description="ZLZooKeeper optimized for Kubernetes StatefulSet deployment"

USER root

# ============================================================
# 1. INSTALL UTILITIES
# ============================================================
# Alpine Linux uses apk
RUN apk add --no-cache netcat-openbsd

# ============================================================
# 2. HEALTH CHECK SCRIPT
# ============================================================
COPY zk-health.sh /opt/health/zk-health.sh
RUN chmod +x /opt/health/zk-health.sh

# ============================================================
# 3. KUBERNETES STARTUP WRAPPER
# ============================================================
# Creates myid from StatefulSet hostname then calls original startup
COPY zlzookeeper-startup-k8s.sh /opt/zlzookeeper-startup-k8s.sh
RUN chmod +x /opt/zlzookeeper-startup-k8s.sh

ENTRYPOINT ["/opt/zlzookeeper-startup-k8s.sh"]
