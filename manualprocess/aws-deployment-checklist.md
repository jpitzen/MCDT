# AWS Deployment Checklist - Updated Images & Configuration

## Phase 1: Image Build & Push to ECR

### 1.1 Build Updated Images
```bash
# Build zlserver image with current config changes
docker build -t zlserver:zlserver11.1.0-b1140-aws ./zlserver/
docker tag zlserver:zlserver11.1.0-b1140-aws <aws-account-id>.dkr.ecr.us-west-1.amazonaws.com/zlserver:11.1.0-b1140

# Build zltika image
docker build -t zltika:zltika11.1.0-b1140-aws ./zltika/
docker tag zltika:zltika11.1.0-b1140-aws <aws-account-id>.dkr.ecr.us-west-1.amazonaws.com/zltika:11.1.0-b1140

# Build zlzookeeper image
docker build -t zlzookeeper:zlzookeeper11.1.0-b1140-aws ./zlzookeeper/
docker tag zlzookeeper:zlzookeeper11.1.0-b1140-aws <aws-account-id>.dkr.ecr.us-west-1.amazonaws.com/zlzookeeper:11.1.0-b1140
```

### 1.2 Push to ECR
```bash
aws ecr get-login-password --region us-west-1 | docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.us-west-1.amazonaws.com

docker push <aws-account-id>.dkr.ecr.us-west-1.amazonaws.com/zlserver:11.1.0-b1140
docker push <aws-account-id>.dkr.ecr.us-west-1.amazonaws.com/zltika:11.1.0-b1140
docker push <aws-account-id>.dkr.ecr.us-west-1.amazonaws.com/zlzookeeper:11.1.0-b1140
```

## Phase 2: Database Configuration (AWS RDS)

### 2.1 Update Database ConfigMap
```yaml
# newbuild/db-config.yaml (already configured for AWS RDS)
kind: ConfigMap
apiVersion: v1
metadata:
  name: db-config
data:
  DB_HOST: "usw1-zlps-msexpsql-01-eks.c5s06occm2dn.us-west-1.rds.amazonaws.com"
  DB_NAME: zldb
  DB_PORT: '1433'
  DB_TYPE: mssql
  DB_USER: pfuser
```

### 2.2 Database Secret (AWS RDS Password)
```yaml
# newbuild/db-secret.yaml (update with AWS RDS password)
kind: Secret
apiVersion: v1
metadata:
  name: db-secret
data:
  DB_PASSWORD: <base64-encoded-rds-password>
type: Opaque
```

## Phase 3: Storage Configuration (EFS)

### 3.1 Apply Storage Class
```bash
kubectl apply -f efs-sc.yaml
```

### 3.2 Apply PVCs and PVs
```bash
# Server logs
kubectl apply -f yaml/efs-pv-zlserverlogs.yaml
kubectl apply -f yaml/efs-pvc-zlserverlogs.yaml

# UI logs
kubectl apply -f zluilogs-efs-pvc.yaml

# Server temp
kubectl apply -f zlservertemp-efs-pvc.yaml

# Tika temp
kubectl apply -f zltikatemp-efs-pvc.yaml

# Vault storage
kubectl apply -f zlvault-efs-pvc.yaml
```

## Phase 4: AWS-Specific Configurations

### 4.1 Service Account with IAM Roles
```bash
# Create IAM role for EFS CSI driver
kubectl apply -f policies/efs-iam-policy.yaml

# Create service account
kubectl apply -f yaml/zlapp-service-account.yaml
```

### 4.2 Update Deployment Images
```yaml
# Update newbuild/zlserver-deployment.yaml
spec:
  template:
    spec:
      containers:
      - name: zlserver
        image: <aws-account-id>.dkr.ecr.us-west-1.amazonaws.com/zlserver:11.1.0-b1140
        imagePullPolicy: Always
```

### 4.3 AWS Load Balancer Configuration
```bash
# Install AWS Load Balancer Controller
kubectl apply -f alb-controller.yaml

# Apply ingress
kubectl apply -f yaml/zl-ingress.yaml
```

## Phase 5: Additional AWS Components

### 5.1 Secrets Manager Integration (Optional)
Consider migrating from Kubernetes secrets to AWS Secrets Manager for enhanced security.

### 5.2 SSL/TLS Certificates
```bash
# AWS Certificate Manager integration
kubectl apply -f yaml/zl-tls-certificate.yaml
```

### 5.3 CloudWatch Monitoring
```bash
# Install CloudWatch agent
kubectl apply -f yaml/cloudwatch-agent.yaml
```

## What You Might Be Missing

### 1. **AWS Networking Updates**
- VPC Configuration
- Security Groups for EKS nodes
- RDS Security Group rules
- ALB Security Group

### 2. **Domain & DNS**
- Route 53 hosted zone
- SSL certificate for custom domain
- DNS records pointing to ALB

### 3. **Backup & Recovery**
- RDS automated backups
- EFS backup policies
- EKS cluster snapshots

### 4. **Monitoring & Logging**
- CloudWatch alarms
- X-Ray tracing
- ELK stack or similar

### 5. **Security Hardening**
- Network policies
- Pod security standards
- AWS Config rules
- AWS Security Hub

### 6. **Cost Optimization**
- EKS node group sizing
- RDS instance sizing
- EFS lifecycle policies

### 7. **CI/CD Pipeline**
- ECR image scanning
- Automated deployments
- Rollback strategies

## Deployment Order

1. ✅ **Images**: Build and push updated images to ECR
2. ✅ **Database**: Apply RDS configuration (db-config.yaml, db-secret.yaml)
3. ✅ **Storage**: Apply EFS PVC/PV configurations
4. 🔄 **ConfigMaps**: Apply updated zlapp-config.yaml with AWS endpoints
5. 🔄 **Services**: Deploy ZooKeeper, Tika, ZL Server, ZL UI
6. 🔄 **Ingress**: Configure ALB for external access
7. 🔄 **Security**: Apply network policies and security configurations

Would you like me to help create any of these missing components or update the existing YAML files for AWS deployment?