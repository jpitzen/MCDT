#!/bin/bash
# zlzookeeper-startup-k8s.sh - Kubernetes wrapper for ZooKeeper startup
# Creates myid from StatefulSet hostname, then calls original startup

set -e

echo "=========================================="
echo "ZLZooKeeper Kubernetes Startup"
echo "=========================================="

# ============================================================
# 1. AUTO-CREATE MYID FROM HOSTNAME
# ============================================================
# StatefulSet pods have hostnames like: zlzookeeper-0, zlzookeeper-1, etc.
# Extract the ordinal and add 1 to get myid (ZK uses 1-based IDs)

HOSTNAME=$(hostname)
echo "Hostname: $HOSTNAME"

# Extract ordinal from hostname (zlzookeeper-0 → 0)
if [[ "$HOSTNAME" =~ -([0-9]+)$ ]]; then
    ORDINAL="${BASH_REMATCH[1]}"
    MYID=$((ORDINAL + 1))
    echo "Detected StatefulSet ordinal: $ORDINAL, setting myid: $MYID"
else
    echo "WARNING: Could not parse ordinal from hostname, defaulting to myid=1"
    MYID=1
fi

# Create myid file in the ZK data directory
ZK_DATA_DIR="${ZK_DATA_DIR:-/opt/ZipLip/ZLZooKeeper/data}"
mkdir -p "$ZK_DATA_DIR"
echo "$MYID" > "$ZK_DATA_DIR/myid"
echo "Created myid file: $ZK_DATA_DIR/myid = $MYID"

# ============================================================
# 2. START ZOOKEEPER (original startup)
# ============================================================
echo "Starting ZooKeeper..."
echo "=========================================="

# Execute original startup script
exec /opt/ZipLip/ZLZooKeeper/bin/zookeeper-startup.sh
