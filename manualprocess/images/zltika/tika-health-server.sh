#!/bin/bash
# tika-health-server.sh - Simple HTTP health endpoint for Kubernetes probes
# Listens on HEALTH_PORT and responds with 200 OK if Tika is healthy

HEALTH_PORT=${HEALTH_PORT:-9973}
TIKA_PORT=${TIKA_PORT:-9972}

echo "Starting health server on port $HEALTH_PORT..."

# Simple HTTP server using socat
while true; do
    # Check Tika health
    if nc -z localhost "$TIKA_PORT" 2>/dev/null; then
        RESPONSE="HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\nOK - Tika is healthy on port $TIKA_PORT"
    else
        RESPONSE="HTTP/1.1 503 Service Unavailable\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\nUNHEALTHY - Tika not responding on port $TIKA_PORT"
    fi
    
    # Respond to HTTP request
    echo -e "$RESPONSE" | nc -l -p "$HEALTH_PORT" -q 1 2>/dev/null || true
done
