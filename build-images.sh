#!/bin/bash

# ZLAWS Docker Images Build Script
# This script builds all Docker images for the ZLAWS deployment with version tagging

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         ZLAWS Docker Images Build & Version Control            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Define image versions (increment when component changes)
declare -A IMAGE_VERSIONS=(
    ["zlaws-backend"]="v1"
    ["zlaws-postgres"]="v1"
    ["zlaws-nginx"]="v1"
)

declare -A IMAGE_DOCKERFILES=(
    ["zlaws-backend"]="Dockerfile"
    ["zlaws-postgres"]="postgres.Dockerfile"
    ["zlaws-nginx"]="nginx.Dockerfile"
)

declare -A IMAGE_DESCRIPTIONS=(
    ["zlaws-backend"]="Node.js Express backend API"
    ["zlaws-postgres"]="PostgreSQL 14 with ZLAWS schema"
    ["zlaws-nginx"]="Nginx reverse proxy with SSL"
)

# Step 1: Configure Docker to use Minikube
echo "Step 1: Configuring Docker for Minikube..."
echo ""

eval $(minikube docker-env)
echo "✓ Docker environment configured for Minikube"
echo ""

# Step 2: Build all images
echo "Step 2: Building Docker images..."
echo ""

BUILT_IMAGES=()

for IMAGE_NAME in "${!IMAGE_VERSIONS[@]}"; do
    VERSION="${IMAGE_VERSIONS[$IMAGE_NAME]}"
    DOCKERFILE="${IMAGE_DOCKERFILES[$IMAGE_NAME]}"
    DESCRIPTION="${IMAGE_DESCRIPTIONS[$IMAGE_NAME]}"
    FULL_IMAGE_NAME="${IMAGE_NAME}:${VERSION}"
    
    echo "Building: $IMAGE_NAME ($DESCRIPTION)"
    echo "  Version: $VERSION"
    echo "  Dockerfile: $DOCKERFILE"
    echo "  Image: $FULL_IMAGE_NAME"
    
    if [ ! -f "$DOCKERFILE" ]; then
        echo "  ⚠ WARNING: $DOCKERFILE not found, skipping..."
        echo ""
        continue
    fi
    
    if docker build -t "$FULL_IMAGE_NAME" -f "$DOCKERFILE" .; then
        echo "  ✓ Built successfully: $FULL_IMAGE_NAME"
        BUILT_IMAGES+=("$FULL_IMAGE_NAME")
    else
        echo "  ✗ Build failed for $IMAGE_NAME"
    fi
    
    echo ""
done

# Step 3: Tag with 'latest' for convenient access
echo "Step 3: Tagging images with 'latest'..."
echo ""

for FULL_IMAGE_NAME in "${BUILT_IMAGES[@]}"; do
    IMAGE_NAME="${FULL_IMAGE_NAME%:*}"
    LATEST_TAG="${IMAGE_NAME}:latest"
    
    echo "Tagging: $FULL_IMAGE_NAME → $LATEST_TAG"
    docker tag "$FULL_IMAGE_NAME" "$LATEST_TAG"
    echo "  ✓ Tagged"
done

echo ""

# Step 4: List all images
echo "Step 4: Available ZLAWS Docker images..."
echo ""

docker images | grep "zlaws-" || echo "  (no images found)"

echo ""

# Step 5: Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Build Summary                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "Built Images:"
for FULL_IMAGE_NAME in "${BUILT_IMAGES[@]}"; do
    echo "  ✓ $FULL_IMAGE_NAME"
done

echo ""
echo "Image Version Reference:"
for IMAGE_NAME in "${!IMAGE_VERSIONS[@]}"; do
    VERSION="${IMAGE_VERSIONS[$IMAGE_NAME]}"
    echo "  • $IMAGE_NAME: $VERSION"
done

echo ""
echo "Next Steps:"
echo "  1. Deploy with: bash deploy-to-minikube.sh"
echo "  2. View images: docker images | grep zlaws"
echo "  3. To update a component:"
echo "     - Edit the component"
echo "     - Increment version (e.g., v1 → v2)"
echo "     - Rebuild: docker build -t zlaws-component:v2 ..."
echo ""

echo "✓ Build complete!"
