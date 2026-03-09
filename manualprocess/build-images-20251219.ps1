# Docker Image Build Script - December 19, 2025
# Creates new images with current configuration state

# Set today's date
$DATE = "20251219"

# ECR Repository
$ACCOUNT_ID = "995553364920"
$REGION = "us-east-1"
$ECR_BASE = "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
$ECR_REPO = "$ECR_BASE/ue1-zlps-ecr-01"

# Login to ECR
Write-Host "Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_BASE

# Tag existing images with new date-based tags
Write-Host "Creating new image tags with date $DATE..."

# ZL Server (also used for ZL UI)
docker tag phoenix-alpine-bld:5000/zlserver:11.1.0-b1140 zlserver:$DATE
docker tag phoenix-alpine-bld:5000/zlserver:11.1.0-b1140 zlui:$DATE

# ZL ZooKeeper
docker tag phoenix-alpine-bld:5000/zlzookeeper:11.1.0-b1140 zlzookeeper:$DATE

# ZL Tika
docker tag phoenix-alpine-bld:5000/zltika:11.1.0-b1140 zltika:$DATE

# Tag for ECR push
$SERVER_TAG = "$ECR_REPO`:zlserver$DATE"
$UI_TAG = "$ECR_REPO`:zlui$DATE"
$ZK_TAG = "$ECR_REPO`:zlzookeeper$DATE"
$TIKA_TAG = "$ECR_REPO`:zltika$DATE"

docker tag zlserver:$DATE $SERVER_TAG
docker tag zlui:$DATE $UI_TAG
docker tag zlzookeeper:$DATE $ZK_TAG
docker tag zltika:$DATE $TIKA_TAG

# Push to ECR
Write-Host "Pushing images to ECR..."
docker push $SERVER_TAG
docker push $UI_TAG
docker push $ZK_TAG
docker push $TIKA_TAG

Write-Host "✅ Images created and pushed successfully!"
Write-Host "Available images:"
Write-Host "  - zlserver:$DATE (ECR: $SERVER_TAG)"
Write-Host "  - zlui:$DATE (ECR: $UI_TAG)"
Write-Host "  - zlzookeeper:$DATE (ECR: $ZK_TAG)"
Write-Host "  - zltika:$DATE (ECR: $TIKA_TAG)"