#!/bin/bash
# tika-health.sh - Check if Tika binary protocol is responding
# Returns 0 if healthy, 1 if unhealthy

TIKA_PORT=${TIKA_PORT:-9972}
TIKA_HOST=${TIKA_HOST:-localhost}

# Try to connect to Tika port
if nc -z "$TIKA_HOST" "$TIKA_PORT" 2>/dev/null; then
    echo "Tika is healthy on port $TIKA_PORT"
    exit 0
else
    echo "Tika is not responding on port $TIKA_PORT"
    exit 1
fi
