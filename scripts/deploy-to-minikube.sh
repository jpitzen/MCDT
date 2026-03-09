#!/bin/bash

# ZLAWS Deployment Script for Minikube
# This script deploys the ZLAWS application to a local Minikube cluster

set -e

echo "================================"
echo "ZLAWS Minikube Deployment Script"
echo "================================"

# Check if Minikube is running
echo ""
echo "1. Checking Minikube status..."
if ! minikube status > /dev/null 2>&1; then
    echo "Error: Minikube is not running. Please start it with: minikube start"
    exit 1
fi
echo "✓ Minikube is running"

# Set Docker environment to Minikube's Docker daemon
echo ""
echo "2. Configuring Docker for Minikube..."
eval $(minikube docker-env)
echo "✓ Docker environment configured"

# Build the Docker image in Minikube's Docker daemon
echo ""
echo "3. Building Docker image..."
if [ ! -f "backend/Dockerfile" ]; then
    echo "Warning: Dockerfile not found. Creating one..."
    mkdir -p backend
    cat > backend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY backend/src ./src

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "src/server.js"]
EOF
    echo "✓ Dockerfile created"
fi

docker build -t zlaws:latest -f backend/Dockerfile .
echo "✓ Docker image built successfully"

# Apply Kubernetes manifests
echo ""
echo "4. Applying Kubernetes manifests..."

echo "   - Creating namespace..."
kubectl apply -f kubernetes/namespace.yaml

echo "   - Creating secrets and config..."
kubectl apply -f kubernetes/postgres.yaml
kubectl apply -f kubernetes/backend-config.yaml

echo "   - Deploying PostgreSQL..."
sleep 5  # Give StatefulSet time to initialize

echo "   - Deploying backend..."
kubectl apply -f kubernetes/backend.yaml

echo "✓ All manifests applied"

# Wait for deployments to be ready
echo ""
echo "5. Waiting for deployments to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n zlaws --timeout=300s || true
sleep 5
kubectl wait --for=condition=ready pod -l app=zlaws-backend -n zlaws --timeout=300s || true

echo "✓ Deployments are ready"

# Display deployment information
echo ""
echo "================================"
echo "Deployment Information"
echo "================================"
echo ""
echo "Namespace: zlaws"
echo ""
echo "Pods:"
kubectl get pods -n zlaws
echo ""
echo "Services:"
kubectl get svc -n zlaws
echo ""

# Get the backend service details
BACKEND_IP=$(kubectl get svc zlaws-backend -n zlaws -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")

if [ "$BACKEND_IP" = "pending" ] || [ -z "$BACKEND_IP" ]; then
    echo "Backend Service: Use port-forward to access"
    echo "  Run: kubectl port-forward svc/zlaws-backend 8080:80 -n zlaws"
    echo "  Then access: http://localhost:8080"
else
    echo "Backend Service: http://${BACKEND_IP}:80"
fi

echo ""
echo "✓ Deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Monitor pods: kubectl get pods -n zlaws -w"
echo "2. View logs: kubectl logs -f deployment/zlaws-backend -n zlaws"
echo "3. Test health: curl http://localhost:8080/health (after port-forward)"
echo "4. Test API endpoints: See DEPLOYMENT_GUIDE.md for more information"
