# ZLTika Dockerfile - Kubernetes Optimized
# Base: Local zltika:20251219 (or ECR image)
# Improvements:
#   1. Add netcat/curl for health check scripts
#   2. Original entrypoint preserved

# Use local image by default - override with --build-arg BASE_IMAGE=...
ARG BASE_IMAGE=zltika:20251219
FROM ${BASE_IMAGE}

LABEL maintainer="ZL DevOps"
LABEL version="11.1.0-b1140-k8s"
LABEL description="ZLTika optimized for Kubernetes deployment"

USER root

# ============================================================
# 1. INSTALL HEALTH CHECK DEPENDENCIES
# ============================================================
# Install netcat for TCP health checks (CentOS 7 uses yum)
RUN yum install -y nc curl && yum clean all

# ============================================================
# 2. ADD HEALTH CHECK SCRIPT (for use with exec probes)
# ============================================================
COPY tika-health.sh /opt/health/tika-health.sh
RUN chmod +x /opt/health/tika-health.sh

# Original entrypoint is preserved (./zltikadiag.sh)
# Kubernetes can use tcpSocket probe on port 9972 or exec probe with tika-health.sh
