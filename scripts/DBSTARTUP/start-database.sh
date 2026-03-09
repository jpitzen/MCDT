#!/bin/bash
#
# Starts the PostgreSQL database for EKS Deployer application
# This script starts the PostgreSQL container using docker-compose.
# The database uses persistent volumes and will automatically restart on host reboot.
#
# Usage:
#   ./start-database.sh           - Start the database
#   ./start-database.sh --force   - Force recreate the container
#   ./start-database.sh --logs    - Show logs after starting
#

set -e

# Colors
INFO='\033[0;36m'
SUCCESS='\033[0;32m'
ERROR='\033[0;31m'
WARNING='\033[0;33m'
NC='\033[0m' # No Color

# Parse arguments
FORCE=false
SHOW_LOGS=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --force|-f)
      FORCE=true
      shift
      ;;
    --logs|-l)
      SHOW_LOGS=true
      shift
      ;;
    *)
      echo -e "${ERROR}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "\n${INFO}=== EKS Deployer - Database Startup ===${NC}"
echo -e "${INFO}Starting PostgreSQL database container...${NC}\n"

# Check if Docker is running
if ! docker version &>/dev/null; then
    echo -e "${ERROR}ERROR: Docker is not running. Please start Docker.${NC}"
    echo -e "${WARNING}Install Docker: https://docs.docker.com/get-docker/${NC}"
    exit 1
fi

# Get project root (two levels up from scripts/DBSTARTUP)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
DOCKER_COMPOSE_PATH="$PROJECT_ROOT/docker-compose.yml"

# Verify docker-compose.yml exists
if [ ! -f "$DOCKER_COMPOSE_PATH" ]; then
    echo -e "${ERROR}ERROR: docker-compose.yml not found at: $DOCKER_COMPOSE_PATH${NC}"
    exit 1
fi

echo -e "${INFO}Project Root: $PROJECT_ROOT${NC}"
echo -e "${INFO}Docker Compose: $DOCKER_COMPOSE_PATH${NC}\n"

# Change to project root
cd "$PROJECT_ROOT"

# Check if container already exists
CONTAINER_EXISTS=$(docker ps -a --filter "name=eks-deployer-postgres" --format "{{.Names}}" 2>/dev/null || true)

if [ -n "$CONTAINER_EXISTS" ] && [ "$FORCE" = false ]; then
    echo -e "${WARNING}Container 'eks-deployer-postgres' already exists.${NC}"
    
    # Check if running
    CONTAINER_RUNNING=$(docker ps --filter "name=eks-deployer-postgres" --format "{{.Names}}" 2>/dev/null || true)
    
    if [ -n "$CONTAINER_RUNNING" ]; then
        echo -e "${SUCCESS}✓ Database is already running!${NC}"
        
        # Show status
        echo -e "\n${INFO}Container Status:${NC}"
        docker ps --filter "name=eks-deployer-postgres" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        echo -e "${INFO}Starting existing container...${NC}"
        docker-compose up -d postgres
        echo -e "${SUCCESS}✓ Database started successfully!${NC}"
    fi
else
    if [ "$FORCE" = true ] && [ -n "$CONTAINER_EXISTS" ]; then
        echo -e "${WARNING}Force recreating container...${NC}"
        docker-compose down postgres
        sleep 2
    fi
    
    echo -e "${INFO}Creating and starting database container...${NC}"
    docker-compose up -d postgres
    echo -e "${SUCCESS}✓ Database created and started successfully!${NC}"
fi

# Wait for database to be healthy
echo -e "\n${INFO}Waiting for database to be ready...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0
HEALTHY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' eks-deployer-postgres 2>/dev/null || echo "unknown")
    
    if [ "$HEALTH" = "healthy" ]; then
        HEALTHY=true
        break
    fi
    
    echo -e "${WARNING}  Attempt $ATTEMPT/$MAX_ATTEMPTS - Status: $HEALTH${NC}"
    sleep 2
done

if [ "$HEALTHY" = true ]; then
    echo -e "${SUCCESS}✓ Database is healthy and ready!${NC}"
else
    echo -e "${WARNING}⚠ Database started but health check timed out${NC}"
    echo -e "${INFO}  Check logs with: docker-compose logs postgres${NC}"
fi

# Display connection information
echo -e "\n${INFO}=== Database Connection Info ===${NC}"
echo -e "${INFO}Host:     localhost${NC}"
echo -e "${INFO}Port:     5432${NC}"
echo -e "${INFO}Database: eks_deployer${NC}"
echo -e "${INFO}User:     eks_user${NC}"
echo -e "${INFO}Password: eks_password_123${NC}"

# Display volume information
echo -e "\n${INFO}=== Data Persistence ===${NC}"
VOLUME_NAME=$(docker volume ls --filter "name=postgres_data" --format "{{.Name}}" 2>/dev/null || true)
if [ -n "$VOLUME_NAME" ]; then
    echo -e "${SUCCESS}✓ Persistent volume: $VOLUME_NAME${NC}"
    echo -e "${INFO}  Data Location: Docker volume (survives container removal)${NC}"
    echo -e "${INFO}  Restart Policy: unless-stopped (survives host reboot)${NC}"
fi

# Display useful commands
echo -e "\n${INFO}=== Useful Commands ===${NC}"
echo -e "${INFO}View logs:        docker-compose logs -f postgres${NC}"
echo -e "${INFO}Stop database:    docker-compose stop postgres${NC}"
echo -e "${INFO}Restart database: docker-compose restart postgres${NC}"
echo -e "${INFO}Connect to DB:    docker exec -it eks-deployer-postgres psql -U eks_user -d eks_deployer${NC}"
echo -e "${INFO}Check tables:     docker exec eks-deployer-postgres psql -U eks_user -d eks_deployer -c '\\dt'${NC}"

# Show logs if requested
if [ "$SHOW_LOGS" = true ]; then
    echo -e "\n${INFO}=== Database Logs ===${NC}"
    docker-compose logs --tail=50 postgres
fi

echo -e "\n${SUCCESS}✓ Database startup complete!${NC}\n"
