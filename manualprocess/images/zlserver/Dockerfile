# ZLServer Dockerfile - Kubernetes Optimized
# Base: Local zlserver:20251219 (or ECR image)
# Improvements:
#   1. Fix startup script sed commands (ZOO_SERVERS corruption)
#   2. Pre-install Java 21 (saves 30-60s per startup)
#   3. Make config paths writable (eliminates copy workaround)
#   4. Template DocumentConversion.xml for TIKA_HOST env var
#   5. Kubernetes-aware defaults in config files

# Use local image by default - override with --build-arg BASE_IMAGE=...
ARG BASE_IMAGE=zlserver:20251219
FROM ${BASE_IMAGE}

LABEL maintainer="ZL DevOps"
LABEL version="11.1.0-b1140-k8s"
LABEL description="ZLServer optimized for Kubernetes deployment"

# ============================================================
# 1. PRE-INSTALL JAVA 21 (Eliminates 30-60s startup delay)
# ============================================================
USER root
RUN apt-get update && \
    apt-get install -y --no-install-recommends openjdk-21-jre-headless && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# ============================================================
# 2. FIX STARTUP SCRIPT (Prevent ZOO_SERVERS corruption)
# ============================================================
# The original startup script has sed commands that corrupt zkQuorum.cfg
# when ZOO_SERVERS env var is set. We patch the script to skip these
# sed commands when running in Kubernetes (detected by KUBERNETES_SERVICE_HOST)

COPY zlserver-startup-k8s.sh /opt/ZipLip/bin/zlserver-startup-k8s.sh
RUN chmod +x /opt/ZipLip/bin/zlserver-startup-k8s.sh

# ============================================================
# 3. MAKE CONFIG PATHS WRITABLE
# ============================================================
# Create writable config directories so ConfigMaps can be mounted
# without needing the copy-from-templates workaround
RUN mkdir -p /opt/ZipLip/bin/zk && \
    mkdir -p /opt/ZipLip/ZLZooKeeper/config && \
    mkdir -p /opt/ZipLip/zlserver/WEB-INF/config/app/sheet && \
    chmod -R 777 /opt/ZipLip/bin/zk && \
    chmod -R 777 /opt/ZipLip/ZLZooKeeper/config && \
    chmod -R 777 /opt/ZipLip/zlserver/WEB-INF/config/app/sheet

# ============================================================
# 4. TEMPLATE DOCUMENTCONVERSION.XML FOR TIKA_HOST
# ============================================================
# Replace localhost with __TIKA_HOST__ placeholder in DocumentConversion.xml
# The startup script will substitute TIKA_HOST env var at runtime
RUN if [ -f /opt/ZipLip/zlserver/WEB-INF/config/app/sheet/DocumentConversion.xml ]; then \
        sed -i 's/<BeanValue>localhost<\/BeanValue>/<BeanValue>__TIKA_HOST__<\/BeanValue>/g' \
            /opt/ZipLip/zlserver/WEB-INF/config/app/sheet/DocumentConversion.xml; \
    fi

# ============================================================
# 5. KUBERNETES-AWARE DEFAULTS
# ============================================================
# Set default environment variables for Kubernetes deployment
ENV KUBERNETES_DEPLOYMENT=true
ENV TIKA_HOST=zltika
ENV TIKA_PORT=9972
ENV ZK_SERVICE_NAME=zk-hs
ENV ZK_NAMESPACE=default

# Default zkQuorum.cfg with Kubernetes DNS names
# Will be overwritten if ConfigMap is mounted
RUN echo "zlzookeeper-0.zk-hs.default.svc.cluster.local:2181" > /opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg && \
    echo "zlzookeeper-1.zk-hs.default.svc.cluster.local:2181" >> /opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg && \
    echo "zlzookeeper-2.zk-hs.default.svc.cluster.local:2181" >> /opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg

# ============================================================
# ENTRYPOINT
# ============================================================
# Use the patched startup script that:
# - Skips ZOO_SERVERS sed commands in Kubernetes
# - Substitutes TIKA_HOST in DocumentConversion.xml
ENTRYPOINT ["/opt/ZipLip/bin/zlserver-startup-k8s.sh"]
