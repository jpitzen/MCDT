#!/bin/bash
# zk-health.sh - ZooKeeper health check for Kubernetes probes
# Checks if ZooKeeper is responding to "ruok" command

ZK_PORT=${ZK_CLIENT_PORT:-2181}

# Send "ruok" command and check for "imok" response
RESPONSE=$(echo "ruok" | nc -w 2 localhost "$ZK_PORT" 2>/dev/null)

if [ "$RESPONSE" = "imok" ]; then
    echo "ZooKeeper is healthy"
    exit 0
else
    echo "ZooKeeper is not healthy (response: $RESPONSE)"
    exit 1
fi
