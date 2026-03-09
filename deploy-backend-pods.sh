#!/bin/bash
################################################################################
# Kubernetes Pod Deployment Script - ZLAWS EKS Deployer (Bash)
#
# Deploys backend API server to Kubernetes pods on Minikube or EKS
#
# Usage:
#   bash deploy-backend-pods.sh [deploy|start|stop|logs|shell|scale|status|rollback]
#
# Examples:
#   bash deploy-backend-pods.sh deploy
#   bash deploy-backend-pods.sh logs
#   bash deploy-backend-pods.sh scale 5
################################################################################

set -e

# Configuration
ACTION="${1:-deploy}"
REPLICAS="${2:-2}"
NAMESPACE="zlaws"
IMAGE_NAME="zlaws-backend"
IMAGE_TAG="v1"
FULL_IMAGE="$IMAGE_NAME:$IMAGE_TAG"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Helper functions
write_header() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}\n"
}

write_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

write_error() {
    echo -e "${RED}✗ $1${NC}"
}

write_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# Deploy to Kubernetes
deploy_backend() {
    write_header "🚀 Deploying Backend API Server to Kubernetes Pods"
    
    # Step 1: Build Docker image
    write_header "Step 1: Building Docker Image"
    
    write_info "Building image: $FULL_IMAGE"
    docker build -t "$FULL_IMAGE" -f Dockerfile .
    
    if [ $? -ne 0 ]; then
        write_error "Docker build failed"
        exit 1
    fi
    write_success "Docker image built successfully"
    
    # Step 2: Configure Minikube Docker environment (if using Minikube)
    write_header "Step 2: Configuring Minikube Docker Environment"
    
    if command -v minikube &> /dev/null; then
        write_info "Minikube detected. Configuring Docker environment"
        eval "$(minikube docker-env)"
        
        write_info "Rebuilding image in Minikube environment"
        docker build -t "$FULL_IMAGE" -f Dockerfile .
        
        if [ $? -ne 0 ]; then
            write_error "Docker build in Minikube failed"
            exit 1
        fi
        write_success "Image available in Minikube"
    fi
    
    # Step 3: Verify image exists
    write_header "Step 3: Verifying Image"
    
    if docker images | grep -q "$IMAGE_NAME"; then
        write_success "Image verified: $FULL_IMAGE"
    else
        write_error "Image not found"
        exit 1
    fi
    
    # Step 4: Create namespace if needed
    write_header "Step 4: Setting Up Kubernetes Namespace"
    
    if kubectl get namespace "$NAMESPACE" &>/dev/null; then
        write_success "Namespace already exists: $NAMESPACE"
    else
        write_info "Creating namespace: $NAMESPACE"
        kubectl create namespace "$NAMESPACE"
        write_success "Namespace created"
    fi
    
    # Step 5: Deploy using kubectl
    write_header "Step 5: Deploying to Kubernetes"
    
    write_info "Applying backend deployment manifest"
    kubectl apply -f kubernetes/backend.yaml -n "$NAMESPACE"
    
    if [ $? -ne 0 ]; then
        write_error "Kubernetes deployment failed"
        exit 1
    fi
    write_success "Deployment manifest applied"
    
    # Step 6: Wait for pods to be ready
    write_header "Step 6: Waiting for Pods to Start"
    
    write_info "Waiting for backend pods to be ready..."
    if kubectl wait --for=condition=ready pod -l app=zlaws-backend -n "$NAMESPACE" --timeout=120s 2>/dev/null; then
        write_success "Pods are ready and running"
    else
        write_info "Pods did not become ready within timeout (this may be normal for initial deployments)"
    fi
    
    # Step 7: Display deployment status
    write_header "Deployment Complete!"
    show_status
}

# Show deployment status
show_status() {
    write_header "📊 Deployment Status"
    
    write_info "Deployments:"
    kubectl get deployments -n "$NAMESPACE" --selector='app=zlaws-backend' -o wide
    
    echo ""
    write_info "Pods:"
    kubectl get pods -n "$NAMESPACE" --selector='app=zlaws-backend' -o wide
    
    echo ""
    write_info "Services:"
    kubectl get services -n "$NAMESPACE" --selector='app=zlaws-backend' -o wide
    
    echo ""
    write_info "Pod Resource Usage:"
    if kubectl top pods -n "$NAMESPACE" --selector='app=zlaws-backend' 2>/dev/null; then
        :
    else
        write_info "(Metrics not available yet)"
    fi
}

# View pod logs
show_logs() {
    write_header "📋 Pod Logs"
    
    write_info "Getting pod names..."
    pods=$(kubectl get pods -n "$NAMESPACE" -l app=zlaws-backend --no-headers -o custom-columns=NAME:.metadata.name)
    
    if [ -z "$pods" ]; then
        write_error "No pods found"
        return
    fi
    
    for pod in $pods; do
        echo ""
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${CYAN}Pod: $pod${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        
        kubectl logs -n "$NAMESPACE" "$pod" --tail=50 2>/dev/null || write_error "Could not get logs for $pod"
    done
}

# Open shell in pod
open_shell() {
    write_header "🐚 Interactive Pod Shell"
    
    write_info "Getting pod name..."
    pod=$(kubectl get pods -n "$NAMESPACE" -l app=zlaws-backend --no-headers -o custom-columns=NAME:.metadata.name | head -1)
    
    if [ -z "$pod" ]; then
        write_error "No pods found"
        return
    fi
    
    write_info "Opening shell in pod: $pod"
    write_info "Type 'exit' to exit the pod shell\n"
    
    kubectl exec -it -n "$NAMESPACE" "$pod" -- /bin/sh
}

# Scale deployment
scale_deployment() {
    local num_replicas=$1
    
    write_header "⚖️ Scaling Deployment"
    
    write_info "Scaling zlaws-backend to $num_replicas replicas"
    kubectl scale deployment zlaws-backend -n "$NAMESPACE" --replicas="$num_replicas"
    
    if [ $? -eq 0 ]; then
        write_success "Deployment scaled to $num_replicas replicas"
        
        write_info "Waiting for new pods to be ready..."
        kubectl wait --for=condition=ready pod -l app=zlaws-backend -n "$NAMESPACE" --timeout=120s 2>/dev/null || true
        
        show_status
    else
        write_error "Failed to scale deployment"
    fi
}

# Start deployment
start_deployment() {
    write_header "▶️ Starting Backend Deployment"
    
    write_info "Checking deployment status..."
    if kubectl get deployment zlaws-backend -n "$NAMESPACE" &>/dev/null; then
        write_info "Deployment already exists. Ensuring replicas are set..."
        kubectl scale deployment zlaws-backend -n "$NAMESPACE" --replicas=2
        write_success "Deployment started"
    else
        write_error "Deployment not found. Run 'deploy' first"
        exit 1
    fi
    
    show_status
}

# Stop deployment
stop_deployment() {
    write_header "⏸️  Stopping Backend Deployment"
    
    write_info "Scaling deployment to 0 replicas"
    kubectl scale deployment zlaws-backend -n "$NAMESPACE" --replicas=0
    
    write_success "Deployment stopped (pods terminated)"
    
    echo ""
    write_info "To resume, run: kubectl scale deployment zlaws-backend -n $NAMESPACE --replicas=2"
}

# Rollback deployment
rollback_deployment() {
    write_header "⏮️ Rolling Back Deployment"
    
    write_info "Rolling back to previous deployment revision"
    kubectl rollout undo deployment/zlaws-backend -n "$NAMESPACE"
    
    if [ $? -eq 0 ]; then
        write_success "Rollback completed"
        
        write_info "Waiting for pods to restart..."
        kubectl wait --for=condition=ready pod -l app=zlaws-backend -n "$NAMESPACE" --timeout=120s 2>/dev/null || true
        
        show_status
    else
        write_error "Rollback failed"
    fi
}

# Main execution
case "$ACTION" in
    deploy)
        deploy_backend
        ;;
    start)
        start_deployment
        ;;
    stop)
        stop_deployment
        ;;
    logs)
        show_logs
        ;;
    shell)
        open_shell
        ;;
    scale)
        scale_deployment "$REPLICAS"
        ;;
    status)
        show_status
        ;;
    rollback)
        rollback_deployment
        ;;
    *)
        write_error "Unknown action: $ACTION"
        echo "Valid actions: deploy, start, stop, logs, shell, scale, status, rollback"
        exit 1
        ;;
esac

echo ""

