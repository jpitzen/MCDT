#!/bin/bash
################################################################################
# ZLAWS EKS Deployer - Database Setup Script (Bash)
# 
# This script sets up the PostgreSQL database, runs migrations, and seeds 
# initial data. It handles all database initialization for local development.
#
# Usage:
#   bash setup-database.sh [setup|migrate|seed|reset|status|all]
#
# Examples:
#   bash setup-database.sh setup
#   bash setup-database.sh all
#   bash setup-database.sh reset
################################################################################

set -e  # Exit on any error

# Configuration
ACTION="${1:-all}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/backend"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Output functions
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

write_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

write_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# Validate action
validate_action() {
    case "$ACTION" in
        setup|migrate|seed|reset|status|all)
            return 0
            ;;
        *)
            write_error "Invalid action: $ACTION"
            write_info "Valid actions: setup, migrate, seed, reset, status, all"
            exit 1
            ;;
    esac
}

# Setup function
setup_database() {
    write_header "🗄️  DATABASE SETUP - ZLAWS EKS Deployer"
    
    # Check if backend directory exists
    if [[ ! -d "$BACKEND_DIR" ]]; then
        write_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    
    write_info "Backend directory: $BACKEND_DIR"
    
    # Check prerequisites
    write_header "Checking Prerequisites"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        write_success "Node.js installed: $NODE_VERSION"
    else
        write_error "Node.js not found. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        write_success "npm installed: $NPM_VERSION"
    else
        write_error "npm not found. Please install Node.js first."
        exit 1
    fi
    
    # Check database connectivity
    write_header "Checking Database Connectivity"
    
    if check_postgres_connection; then
        write_success "PostgreSQL is running and accessible"
    else
        write_warning "Could not connect to PostgreSQL. Attempting to start Docker container..."
        start_docker_postgres
    fi
    
    # Install dependencies
    write_header "Installing Dependencies"
    
    if [[ -f "$BACKEND_DIR/package.json" ]]; then
        if [[ ! -d "$BACKEND_DIR/node_modules" ]]; then
            write_info "Installing npm packages..."
            cd "$BACKEND_DIR"
            npm install
            write_success "npm packages installed"
            cd - > /dev/null
        else
            write_success "npm packages already installed"
        fi
    fi
    
    write_success "Setup prerequisites completed"
}

# Check PostgreSQL connection
check_postgres_connection() {
    PGPASSWORD=postgres psql -h localhost -U postgres -d postgres -c "SELECT 1" &>/dev/null
    return $?
}

# Start PostgreSQL in Docker
start_docker_postgres() {
    local CONTAINER_NAME="zlaws-postgres"
    
    write_info "Checking for existing PostgreSQL Docker container..."
    
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
            write_success "PostgreSQL Docker container is already running: $CONTAINER_NAME"
        else
            write_info "Starting existing PostgreSQL container..."
            docker start "$CONTAINER_NAME"
            sleep 3
            write_success "PostgreSQL container started"
        fi
    else
        write_info "Starting new PostgreSQL Docker container..."
        docker run -d \
            --name "$CONTAINER_NAME" \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=postgres \
            -e POSTGRES_DB=eks_deployer_dev \
            -p 5432:5432 \
            -v postgres-data:/var/lib/postgresql/data \
            postgres:14-alpine
        
        sleep 5
        write_success "PostgreSQL Docker container started: $CONTAINER_NAME"
    fi
}

# Run migrations
run_migrations() {
    write_header "Running Database Migrations"
    
    cd "$BACKEND_DIR"
    
    write_info "Running: npm run db:migrate"
    if npm run db:migrate; then
        write_success "Database migrations completed successfully"
    else
        write_error "Database migrations failed"
        cd - > /dev/null
        exit 1
    fi
    
    cd - > /dev/null
}

# Run seeders
run_seeders() {
    write_header "Running Database Seeders"
    
    cd "$BACKEND_DIR"
    
    write_info "Running: npm run db:seed"
    if npm run db:seed; then
        write_success "Database seeders completed successfully"
    else
        write_error "Database seeders failed"
        cd - > /dev/null
        exit 1
    fi
    
    cd - > /dev/null
}

# Show database status
show_database_status() {
    write_header "Database Status"
    
    # Check .env file
    ENV_PATH="$BACKEND_DIR/../.env"
    if [[ -f "$ENV_PATH" ]]; then
        write_success ".env file exists"
    else
        write_error ".env file not found"
    fi
    
    # Check PostgreSQL connection
    if check_postgres_connection; then
        write_success "PostgreSQL is accessible"
        
        # Check if database exists
        if PGPASSWORD=postgres psql -h localhost -U postgres -d postgres -c "SELECT datname FROM pg_database WHERE datname='eks_deployer_dev';" 2>/dev/null | grep -q "eks_deployer_dev"; then
            write_success "Database 'eks_deployer_dev' exists"
        else
            write_warning "Database 'eks_deployer_dev' not found"
        fi
    else
        write_error "PostgreSQL is not accessible"
    fi
}

# Reset database
reset_database() {
    write_header "Resetting Database"
    write_warning "This will DROP all tables and data. Proceed? (yes/no)"
    
    read -r response
    if [[ "$response" != "yes" ]]; then
        write_info "Reset cancelled"
        return
    fi
    
    cd "$BACKEND_DIR"
    
    write_info "Running: npm run db:migrate:undo:all"
    if npm run db:migrate:undo:all; then
        write_success "All migrations undone"
    else
        write_warning "Some migrations may not have been undone"
    fi
    
    # Run migrations again
    write_info "Running migrations again..."
    if npm run db:migrate; then
        write_success "Database reset and migrations applied"
    else
        write_error "Database reset failed"
        cd - > /dev/null
        exit 1
    fi
    
    cd - > /dev/null
}

# Main execution
main() {
    validate_action
    
    case "$ACTION" in
        setup)
            setup_database
            ;;
        migrate)
            setup_database
            run_migrations
            ;;
        seed)
            run_seeders
            ;;
        reset)
            reset_database
            ;;
        status)
            show_database_status
            ;;
        all)
            setup_database
            run_migrations
            run_seeders
            show_database_status
            ;;
    esac
    
    write_header "✓ Database Operations Completed Successfully"
    write_info "Next steps:"
    write_info "1. Start the backend: npm run dev"
    write_info "2. Backend will be available at http://localhost:5000"
    write_info "3. API documentation available at http://localhost:5000/api/docs"
}

# Run main function
main

