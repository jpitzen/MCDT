#!/bin/bash

################################################################################
#
# AWS EKS Deployment Orchestrator
# Master script that coordinates all 11 deployment phases
# 
# Usage: ./deploy-orchestrator.sh <deployment-id> <config-file>
#
################################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ID="${1:?Deployment ID required}"
CONFIG_FILE="${2:?Configuration file required}"
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${LOG_DIR:-./logs/deployments/${DEPLOYMENT_ID}}"
STATE_FILE="${LOG_DIR}/state.json"

# Initialize
mkdir -p "$LOG_DIR"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "${LOG_DIR}/deployment.log"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "${LOG_DIR}/deployment.log"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "${LOG_DIR}/deployment.log"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "${LOG_DIR}/deployment.log"
}

# Update deployment status
update_status() {
    local phase=$1
    local status=$2
    local message=$3
    
    # TODO: Call backend API to update deployment status
    log_info "Phase $phase: $status - $message"
}

# Execute phase with error handling
execute_phase() {
    local phase=$1
    local phase_name=$2
    local script=$3
    
    log_info "Starting Phase $phase: $phase_name"
    update_status "$phase" "IN_PROGRESS" "$phase_name"
    
    if [ ! -f "$script" ]; then
        log_error "Script not found: $script"
        update_status "$phase" "FAILED" "Script not found"
        return 1
    fi
    
    # Execute phase script
    if bash "$script" "$CONFIG_FILE" "$LOG_DIR" 2>&1 | tee -a "${LOG_DIR}/phase-${phase}.log"; then
        log_success "Phase $phase completed: $phase_name"
        update_status "$phase" "COMPLETED" "$phase_name"
        return 0
    else
        log_error "Phase $phase failed: $phase_name"
        update_status "$phase" "FAILED" "$phase_name"
        return 1
    fi
}

# Rollback function
rollback() {
    local failed_phase=$1
    
    log_warning "Deployment failed at phase $failed_phase. Initiating rollback..."
    update_status "0" "ROLLING_BACK" "Rollback initiated after phase $failed_phase"
    
    # Execute rollback in reverse order
    for ((phase=$((failed_phase-1)); phase>=1; phase--)); do
        case $phase in
            11) bash "${SCRIPTS_DIR}/rollback/11-monitoring.sh" "$CONFIG_FILE" "$LOG_DIR" ;;
            10) bash "${SCRIPTS_DIR}/rollback/10-main-app.sh" "$CONFIG_FILE" "$LOG_DIR" ;;
            9)  bash "${SCRIPTS_DIR}/rollback/09-zookeeper.sh" "$CONFIG_FILE" "$LOG_DIR" ;;
            8)  bash "${SCRIPTS_DIR}/rollback/08-autoscaling.sh" "$CONFIG_FILE" "$LOG_DIR" ;;
            7)  bash "${SCRIPTS_DIR}/rollback/07-s3-csi.sh" "$CONFIG_FILE" "$LOG_DIR" ;;
            6)  bash "${SCRIPTS_DIR}/rollback/06-efs-csi.sh" "$CONFIG_FILE" "$LOG_DIR" ;;
            5)  bash "${SCRIPTS_DIR}/rollback/05-ebs-csi.sh" "$CONFIG_FILE" "$LOG_DIR" ;;
            4)  bash "${SCRIPTS_DIR}/rollback/04-ecr.sh" "$CONFIG_FILE" "$LOG_DIR" ;;
            3)  bash "${SCRIPTS_DIR}/rollback/03-rds.sh" "$CONFIG_FILE" "$LOG_DIR" ;;
            2)  bash "${SCRIPTS_DIR}/rollback/02-eks-cluster.sh" "$CONFIG_FILE" "$LOG_DIR" ;;
            1)  log_warning "Skipping rollback for phase 1 (tools installation)" ;;
        esac
    done
    
    log_error "Deployment failed and rolled back"
    update_status "0" "FAILED" "Rollback completed"
}

# Main deployment orchestration
main() {
    log_info "=========================================="
    log_info "EKS Deployment Orchestrator"
    log_info "=========================================="
    log_info "Deployment ID: $DEPLOYMENT_ID"
    log_info "Configuration: $CONFIG_FILE"
    log_info "Log Directory: $LOG_DIR"
    log_info "=========================================="
    
    # Validate configuration file
    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
    
    # Source configuration
    source "$CONFIG_FILE"
    
    # Track which phase we're on for rollback
    local current_phase=0
    
    # Phase 1: Install CLI tools
    if ! execute_phase 1 "Install CLI Tools" "${SCRIPTS_DIR}/01-install-tools.sh"; then
        rollback 1
        exit 1
    fi
    current_phase=1
    
    # Phase 2: Create EKS Cluster
    if ! execute_phase 2 "Create EKS Cluster" "${SCRIPTS_DIR}/02-create-eks-cluster.sh"; then
        rollback 2
        exit 1
    fi
    current_phase=2
    
    # Phase 3: Setup RDS Database
    if ! execute_phase 3 "Setup RDS Database" "${SCRIPTS_DIR}/03-create-rds.sh"; then
        rollback 3
        exit 1
    fi
    current_phase=3
    
    # Phase 4: Setup ECR Repository
    if ! execute_phase 4 "Setup ECR Repository" "${SCRIPTS_DIR}/04-setup-ecr.sh"; then
        rollback 4
        exit 1
    fi
    current_phase=4
    
    # Phase 5: Setup EBS CSI Driver
    if ! execute_phase 5 "Setup EBS CSI Driver" "${SCRIPTS_DIR}/05-setup-ebs-csi.sh"; then
        rollback 5
        exit 1
    fi
    current_phase=5
    
    # Phase 6: Setup EFS CSI Driver
    if ! execute_phase 6 "Setup EFS CSI Driver" "${SCRIPTS_DIR}/06-setup-efs-csi.sh"; then
        rollback 6
        exit 1
    fi
    current_phase=6
    
    # Phase 7: Setup S3 Integration
    if ! execute_phase 7 "Setup S3 Integration" "${SCRIPTS_DIR}/07-setup-s3-csi.sh"; then
        rollback 7
        exit 1
    fi
    current_phase=7
    
    # Phase 8: Setup Node Autoscaling
    if ! execute_phase 8 "Setup Node Autoscaling" "${SCRIPTS_DIR}/08-setup-autoscaling.sh"; then
        rollback 8
        exit 1
    fi
    current_phase=8
    
    # Phase 9: Deploy ZooKeeper StatefulSet
    if ! execute_phase 9 "Deploy ZooKeeper" "${SCRIPTS_DIR}/09-deploy-zookeeper.sh"; then
        rollback 9
        exit 1
    fi
    current_phase=9
    
    # Phase 10: Deploy Main Application
    if ! execute_phase 10 "Deploy Main Application" "${SCRIPTS_DIR}/10-deploy-main-app.sh"; then
        rollback 10
        exit 1
    fi
    current_phase=10
    
    # Phase 11: Setup Monitoring & Logging
    if ! execute_phase 11 "Setup Monitoring" "${SCRIPTS_DIR}/11-setup-monitoring.sh"; then
        rollback 11
        exit 1
    fi
    current_phase=11
    
    # Post-deployment verification
    log_info "Running post-deployment verification..."
    
    # Verify cluster health
    if ! kubectl get nodes &>/dev/null; then
        log_error "Failed to verify cluster health"
        rollback "$current_phase"
        exit 1
    fi
    
    # Verify applications are running
    local app_pods=$(kubectl get pods -l app=main-app --no-headers 2>/dev/null | wc -l)
    if [ "$app_pods" -lt 1 ]; then
        log_warning "No application pods detected"
    fi
    
    # Generate summary report
    log_info "=========================================="
    log_success "Deployment completed successfully!"
    log_info "=========================================="
    log_info "Cluster Name: ${CLUSTER_NAME}"
    log_info "Region: ${AWS_REGION}"
    log_info "Cluster Endpoint: $(kubectl cluster-info 2>/dev/null | grep 'Kubernetes' | awk '{print $7}' || echo 'N/A')"
    log_info "Total Nodes: $(kubectl get nodes --no-headers 2>/dev/null | wc -l)"
    log_info "Running Pods: $(kubectl get pods -A --no-headers 2>/dev/null | wc -l)"
    log_info "=========================================="
    log_info "Deployment logs available at: ${LOG_DIR}"
    log_info "=========================================="
    
    # TODO: Call backend API to mark deployment as COMPLETED
    update_status "0" "COMPLETED" "Deployment completed successfully"
}

# Error handler
trap 'log_error "Deployment interrupted"; rollback "$current_phase"; exit 1' EXIT INT TERM

# Run main orchestration
main "$@"
