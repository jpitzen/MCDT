#!/bin/bash
# zlserver-startup-k8s.sh - Kubernetes-optimized startup script
# This script wraps the original zlserver-startup.sh with Kubernetes-specific fixes

set -e

echo "=========================================="
echo "ZLServer Kubernetes Startup Script"
echo "=========================================="

# ============================================================
# 1. TIKA_HOST SUBSTITUTION
# ============================================================
# Replace __TIKA_HOST__ placeholder with actual TIKA_HOST env var
if [ -n "$TIKA_HOST" ]; then
    echo "Configuring Tika host: $TIKA_HOST"
    DOCCONV_FILE="/opt/ZipLip/zlserver/WEB-INF/config/app/sheet/DocumentConversion.xml"
    if [ -f "$DOCCONV_FILE" ]; then
        # Only substitute if file is writable
        if [ -w "$DOCCONV_FILE" ]; then
            sed -i "s/__TIKA_HOST__/$TIKA_HOST/g" "$DOCCONV_FILE"
            echo "  Updated DocumentConversion.xml with TIKA_HOST=$TIKA_HOST"
        else
            echo "  DocumentConversion.xml is read-only (ConfigMap mount), skipping substitution"
            echo "  Ensure TIKA_HOST env var is set for application configuration"
        fi
    fi
fi

# ============================================================
# 2. SKIP ZOO_SERVERS PROCESSING IN KUBERNETES
# ============================================================
# The original script's ZOO_SERVERS handling corrupts zkQuorum.cfg
# In Kubernetes, we use ConfigMaps with pre-formatted files instead

if [ -n "$KUBERNETES_SERVICE_HOST" ] || [ "$KUBERNETES_DEPLOYMENT" = "true" ]; then
    echo "Running in Kubernetes - skipping ZOO_SERVERS processing"
    # Unset ZOO_SERVERS to prevent original script from processing it
    unset ZOO_SERVERS
    
    # Verify zkQuorum.cfg exists and has content
    ZK_QUORUM_FILE="/opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg"
    if [ -f "$ZK_QUORUM_FILE" ]; then
        echo "Using zkQuorum.cfg from ConfigMap or default:"
        cat "$ZK_QUORUM_FILE"
    else
        echo "WARNING: zkQuorum.cfg not found, using defaults"
        # Create default with Kubernetes DNS names
        mkdir -p /opt/ZipLip/ZLZooKeeper/config
        echo "zlzookeeper-0.zk-hs.default.svc.cluster.local:2181" > "$ZK_QUORUM_FILE"
        echo "zlzookeeper-1.zk-hs.default.svc.cluster.local:2181" >> "$ZK_QUORUM_FILE"
        echo "zlzookeeper-2.zk-hs.default.svc.cluster.local:2181" >> "$ZK_QUORUM_FILE"
    fi
fi

# ============================================================
# 3. COPY CONFIG FILES IF MOUNTED AS TEMPLATES
# ============================================================
# If config-templates directory exists, copy files to writable locations
# This supports both old (copy pattern) and new (direct mount) approaches

CONFIG_TEMPLATES="/opt/ZipLip/config-templates"
if [ -d "$CONFIG_TEMPLATES" ]; then
    echo "Found config-templates directory, copying files..."
    
    # Copy tcdb.cfg if exists
    if [ -f "$CONFIG_TEMPLATES/tcdb.cfg" ]; then
        cp "$CONFIG_TEMPLATES/tcdb.cfg" /opt/ZipLip/bin/zk/tcdb.cfg
        echo "  Copied tcdb.cfg"
    fi
    
    # Copy zkQuorum.cfg if exists
    if [ -f "$CONFIG_TEMPLATES/zkQuorum.cfg" ]; then
        cp "$CONFIG_TEMPLATES/zkQuorum.cfg" /opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg
        echo "  Copied zkQuorum.cfg"
    fi
fi

# ============================================================
# 4. WAIT FOR DEPENDENCIES
# ============================================================
# Wait for ZooKeeper to be ready before starting

if [ -n "$WAIT_FOR_ZOOKEEPER" ] && [ "$WAIT_FOR_ZOOKEEPER" = "true" ]; then
    ZK_HOST="${ZK_SERVICE_NAME:-zk-cs}"
    ZK_PORT="${ZK_CLIENT_PORT:-2181}"
    MAX_WAIT=60
    WAIT_COUNT=0
    
    echo "Waiting for ZooKeeper at $ZK_HOST:$ZK_PORT..."
    while ! nc -z "$ZK_HOST" "$ZK_PORT" 2>/dev/null; do
        WAIT_COUNT=$((WAIT_COUNT + 1))
        if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
            echo "WARNING: ZooKeeper not ready after ${MAX_WAIT}s, proceeding anyway"
            break
        fi
        sleep 1
    done
    echo "ZooKeeper is ready (or timeout reached)"
fi

# ============================================================
# 5. LAUNCH ORIGINAL STARTUP SCRIPT
# ============================================================
echo "Starting ZLServer..."
echo "=========================================="

# Execute original startup script
exec /opt/ZipLip/bin/zlserver-startup.sh
