#!/bin/bash
# zltika-startup-k8s.sh - Kubernetes-optimized Tika startup
# Starts both Tika service and health endpoint

set -e

echo "=========================================="
echo "ZLTika Kubernetes Startup Script"
echo "=========================================="

# Start health server in background
echo "Starting health endpoint on port ${HEALTH_PORT:-9973}..."
/opt/health/tika-health-server.sh &
HEALTH_PID=$!

# Trap to cleanup background processes
cleanup() {
    echo "Shutting down..."
    kill $HEALTH_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGTERM SIGINT

# Start Tika (using original entrypoint)
echo "Starting Tika service on port ${TIKA_PORT:-9972}..."

# Change to the original working directory
cd /opt/ZipLip/ZLTikaConvertor/bin

# Execute the original startup script
exec ./zltikadiag.sh
