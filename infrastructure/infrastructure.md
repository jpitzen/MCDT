# ZL-MCDT — Full Deployment Infrastructure Reference

**Generated**: 2026-03-03  
**Scope**: All infrastructure elements provisioned by ZL-MCDT for AWS, Azure, Google Cloud, and On-Premise full deployments  
**Source Truth**: Terraform modules, Kubernetes manifests, docker-compose, backend services, deployment guides

---

## Table of Contents

1. [Deployment Architecture Overview](#1-deployment-architecture-overview)
2. [AWS Infrastructure](#2-aws-infrastructure)
3. [Azure Infrastructure](#3-azure-infrastructure)
4. [Google Cloud Infrastructure](#4-google-cloud-infrastructure)
5. [Storage Tier Reference](#5-storage-tier-reference)
6. [Application Stack (Cloud-Agnostic)](#6-application-stack-cloud-agnostic)
7. [Infrastructure Summary Matrix](#7-infrastructure-summary-matrix)
8. [On-Premise Infrastructure](#8-on-premise-infrastructure)

> ⚠️ **Parity Requirement**: The ZL UA Platform mandates that **all 5 infrastructure categories** (Networking, Storage, Kubernetes, Container Registry, Database) are provisioned for every deployment regardless of cloud provider. See [Section 1 — Mandatory Infrastructure Parity](#mandatory-infrastructure-parity) and [Section 7 — Summary Matrix](#7-infrastructure-summary-matrix) for gap analysis.

---

## 1. Deployment Architecture Overview

ZL-MCDT provisions Kubernetes clusters and supporting infrastructure across 5 cloud providers (AWS, Azure, GCP, DigitalOcean, Linode). This document covers the **three enterprise providers** (AWS, Azure, GCP) in full detail.

### Mandatory Infrastructure Parity

The **ZL UA Platform requires the same 5 infrastructure categories for every deployment, regardless of cloud provider**. No deployment is valid without all 5:

| # | Category | AWS | Azure | GCP | Purpose |
|---|----------|-----|-------|-----|--------|
| 1 | **Networking** | VPC + Subnets + SGs + NAT | VNet + Subnets + NSGs + NAT | VPC + Subnets + Firewall + Cloud NAT | Network isolation, traffic control, private connectivity |
| 2 | **Storage** | S3 + EFS + EBS CSI | Blob + Azure Files + Managed Disk CSI | GCS + Filestore + PD CSI | Object, file, and block storage for all workloads |
| 3 | **Kubernetes** | EKS + Node Group | AKS + Node Pool | GKE + Node Pool | Container orchestration for the ZL UA application |
| 4 | **Container Registry** | ECR | ACR | Artifact Registry | Store and distribute container images |
| 5 | **Database** | RDS (multi-engine) | Azure Database (PostgreSQL/MySQL/SQL) | Cloud SQL (PostgreSQL/MySQL) | Managed relational database for application data |

> **This is non-negotiable.** Every Terraform environment directory must provision all 5 categories for its respective platform. Provider-specific services (e.g., AWS Secrets Manager, Azure Key Vault) are additive — the 5 core categories are mandatory.

**Deployment Pipeline**:
```
User (Wizard) → POST /api/deployments → deploymentService
    → multiCloudOrchestrator (credential vault + tfvars generation)
        → terraformExecutor (init → validate → plan → apply)
            → [Optional] zlDeploymentOrchestrator (kubectl apply → K8s manifests)
                → Real-time progress via Socket.IO WebSocket
```

**Terraform State Keying**: `{provider}-{region}-{clusterName}` — state persists across re-deployments of the same cluster.

---

## 2. AWS Infrastructure

AWS has the deepest resource support with 7 dedicated Terraform modules.

### 2.1 Networking

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| VPC | `aws_vpc` | `var.create_vpc` | Isolated virtual network for the deployment |
| Public Subnets | `aws_subnet` | `var.create_vpc` | One per AZ — hosts NAT gateways, load balancers |
| Private Subnets | `aws_subnet` | `var.create_vpc` | One per AZ — hosts EKS nodes, RDS, EC2 instances |
| Internet Gateway | `aws_internet_gateway` | `var.create_vpc` | Public internet access for public subnets |
| Elastic IPs | `aws_eip` | `var.create_vpc` | One per AZ for NAT gateway static addresses |
| NAT Gateways | `aws_nat_gateway` | `var.create_vpc` | One per AZ — outbound internet for private subnets |
| Public Route Table | `aws_route_table` | `var.create_vpc` | Routes public subnet traffic to IGW |
| Private Route Tables | `aws_route_table` | `var.create_vpc` | One per AZ — routes private subnet traffic to NAT |
| Route Table Associations | `aws_route_table_association` | `var.create_vpc` | Links subnets to their route tables |
| EC2 Security Group | `aws_security_group` | EC2 module | Ingress/egress rules for VM instances |
| RDS Security Group | `aws_security_group` | RDS module | Database access rules (port 5432/3306/1433) |
| EFS Security Group | `aws_security_group` | EFS module | NFS mount access rules (port 2049) |

### 2.2 Kubernetes (EKS)

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| EKS Cluster | `aws_eks_cluster` | Always | Managed Kubernetes control plane |
| EKS Node Group | `aws_eks_node_group` | Always | Managed worker nodes (default: `t3.medium`) |
| EBS CSI Driver | `aws_eks_addon` | `var.enable_ebs_csi_driver` | Enables EBS persistent volumes in K8s |
| EFS CSI Driver | `aws_eks_addon` | `var.enable_efs_csi_driver` | Enables EFS shared file system mounts in K8s |
| S3 CSI Driver | `aws_eks_addon` | `var.enable_s3_csi` | Enables S3 bucket mounts in K8s pods |
| ALB Ingress Controller | `helm_release` | `var.enable_alb_controller` | AWS Application Load Balancer for K8s Ingress |
| Cluster Autoscaler | `helm_release` | `var.enable_cluster_autoscaler` | Auto-scales node group based on pod demand |
| ASG Tags (Autoscaler) | `aws_autoscaling_group_tag` | `var.enable_cluster_autoscaler` | Tags enabling autoscaler node discovery |
| EBS gp3 StorageClass | `kubernetes_storage_class_v1` | `enable_ebs_csi_driver && create_storage_classes` | Default high-performance block storage class |
| EFS StorageClass | `kubernetes_storage_class_v1` | `enable_efs_csi_driver && create_storage_classes` | Shared file system storage class for ReadWriteMany |
| Kubeconfig Update | `null_resource` | Always | Runs `aws eks update-kubeconfig` post-apply |

### 2.3 Compute (EC2)

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| EC2 Instances | `aws_instance` | `var.enable_additional_vms` | VM instances (configurable count via `var.vm_count`) |
| Key Pair | `aws_key_pair` | `var.create_key_pair` | SSH key pair for Linux instance access |
| TLS Private Key | `tls_private_key` | `var.create_key_pair` | Auto-generated SSH private key |
| Instance Profile | `aws_iam_instance_profile` | EC2 module | IAM profile attached to EC2 instances |
| EC2 IAM Role | `aws_iam_role` | EC2 module | Role for EC2 instance permissions (SSM, CloudWatch) |

**Supported OS Images** (via `data.aws_ami`):
- Windows Server 2016, 2019, 2022
- Amazon Linux 2
- Ubuntu (latest LTS)
- RHEL

### 2.4 Container Registry (ECR)

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| ECR Repository | `aws_ecr_repository` | Always | Container image registry |
| Lifecycle Policy | `aws_ecr_lifecycle_policy` | `var.enable_lifecycle_policy` | Auto-cleanup of old images |
| Repository Policy | `aws_ecr_repository_policy` | `var.allow_eks_access` | Cross-account / EKS access policy |
| Replication Config | `aws_ecr_replication_configuration` | `var.enable_replication` | Cross-region replication |
| Pull-Through Cache | `aws_ecr_pull_through_cache_rule` | `var.pull_through_cache_rules` | Cache upstream registries (Docker Hub, etc.) |
| Scan Logging | `aws_cloudwatch_log_group` | `var.enable_scan_logging` | CloudWatch log group for ECR scan results |
| Security Scanning | `aws_inspector2_enabler` | `var.enable_security_scanning` | Amazon Inspector v2 for ECR vulnerability scanning |

### 2.5 Storage (S3, EFS, EBS)

See [Section 5 — Storage Tier Reference](#5-storage-tier-reference) for detailed storage-type breakdown.

### 2.6 Database (RDS)

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| RDS Instance | `aws_db_instance` | `var.enable_rds` | Managed relational database |
| DB Subnet Group | `aws_db_subnet_group` | RDS module | Places RDS in private subnets |
| DB Password | `random_password` | RDS module | Auto-generated database password |
| RDS Monitoring Role | `aws_iam_role` | `var.enable_enhanced_monitoring` | IAM role for Enhanced Monitoring |

**Supported Database Engines**:
| Engine | Editions/Versions |
|--------|-------------------|
| PostgreSQL | All supported versions |
| MySQL | All supported versions |
| MariaDB | All supported versions |
| SQL Server | Express, Standard, Enterprise, Web |
| Oracle | SE2, EE |

### 2.7 IAM & Identity

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| EKS Cluster Role | `aws_iam_role` | Always | IAM role for EKS control plane |
| EKS Node Group Role | `aws_iam_role` | Always | IAM role for worker node EC2 instances |
| EBS CSI Role | `aws_iam_role` | `var.enable_ebs_csi_driver` | IRSA role for EBS CSI driver |
| EFS CSI Role | `aws_iam_role` | `var.enable_efs_csi_driver` | IRSA role for EFS CSI driver |
| S3 CSI Role | `aws_iam_role` | `var.enable_s3_csi` | IRSA role for S3 CSI driver |
| ALB Controller Role | `aws_iam_role` | `var.enable_alb_controller` | IRSA role for ALB Ingress Controller |
| Cluster Autoscaler Role | `aws_iam_role` | `var.enable_cluster_autoscaler` | IRSA role for Cluster Autoscaler |
| EC2 Instance Role | `aws_iam_role` | EC2 module | Role for EC2 instances (SSM, CloudWatch) |
| RDS Monitoring Role | `aws_iam_role` | `var.enable_enhanced_monitoring` | Enhanced Monitoring data publication |
| Replication Role | `aws_iam_role` | `var.enable_replication` | S3 cross-region replication role |
| OIDC Provider | `aws_iam_openid_connect_provider` | Always | EKS OIDC for IAM Roles for Service Accounts (IRSA) |
| Deployment IAM User | `aws_iam_user` | `var.create_iam_user` | CI/CD pipeline deployment user |
| Deployment Access Key | `aws_iam_access_key` | `var.create_iam_user` | Programmatic access for CI/CD |
| ECR Access Policy | `aws_iam_policy` | `var.create_ecr_access_policy` | Policy granting ECR push/pull |
| EFS CSI Policy | `aws_iam_policy` | `var.create_efs_csi_policy` | Policy for EFS CSI operations |
| Multiple Role Attachments | `aws_iam_role_policy_attachment` | Various | ~10 policy attachments (AmazonEKSClusterPolicy, AmazonEKSWorkerNodePolicy, AmazonEKS_CNI_Policy, AmazonEC2ContainerRegistryReadOnly, AmazonSSMManagedInstanceCore, CloudWatchAgentServerPolicy, etc.) |

### 2.8 Secrets Management

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| EC2 Private Key Secret | `aws_secretsmanager_secret` + `version` | `create_key_pair && store_key_in_secrets_manager` | Stores SSH private key |
| Windows Password Secret | `aws_secretsmanager_secret` + `version` | Windows OS + `store_password_in_secrets_manager` | Stores auto-generated Windows admin password |
| DB Password Secret | `aws_secretsmanager_secret` + `version` | `store_password_in_secrets_manager` | Stores RDS database password |

### 2.9 Resource Organization

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| Resource Group | `aws_resourcegroups_group` | `var.create_resource_group` | Tag-based resource grouping for the deployment |

### 2.10 Data Sources (Existing Infrastructure Discovery)

ZL-MCDT can discover and attach to existing infrastructure:

| Data Source | Purpose |
|------------|---------|
| `aws_vpcs` / `aws_vpc` | Discover existing VPCs |
| `aws_subnets` (private/public/all) | Discover existing subnets |
| `aws_subnet` (details) | Get CIDR block details for subnets |
| `aws_db_instances` / `aws_db_instance` | Discover existing RDS instances |
| `aws_eks_clusters` / `aws_eks_cluster` | Discover existing EKS clusters |
| `aws_internet_gateway` | Discover existing Internet Gateways |
| `aws_nat_gateways` / `aws_nat_gateway` | Discover existing NAT Gateways |
| `aws_security_groups` | Discover existing Security Groups |
| `aws_caller_identity` | Current AWS account ID |
| `aws_ami` (multiple) | Latest AMI lookup for Windows, Amazon Linux, Ubuntu |
| `tls_certificate` | OIDC thumbprint for IRSA |
| `aws_eks_cluster_auth` | EKS auth token for kubectl |

---

## 3. Azure Infrastructure

Azure deployments must provision the same 5 mandatory infrastructure categories as AWS. The Azure Resource Group is the top-level organizational container for all resources.

### 3.1 Networking (MANDATORY)

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| Resource Group | `azurerm_resource_group` | Always | Logical container for all Azure resources |
| Virtual Network (VNet) | `azurerm_virtual_network` | `var.create_vnet` | Isolated virtual network — equivalent of AWS VPC |
| Public Subnet | `azurerm_subnet` | `var.create_vnet` | Hosts load balancers, Application Gateway, bastion |
| Private Subnet (AKS) | `azurerm_subnet` | `var.create_vnet` | AKS node pool, private endpoints |
| Private Subnet (Database) | `azurerm_subnet` | `var.create_vnet` | Database servers + private endpoints (delegated) |
| NSG (AKS) | `azurerm_network_security_group` | `var.create_vnet` | Inbound/outbound rules for AKS subnet |
| NSG (Database) | `azurerm_network_security_group` | `var.create_vnet` | Restrict DB access to AKS subnet CIDR only |
| NSG Associations | `azurerm_subnet_network_security_group_association` | `var.create_vnet` | Bind NSGs to subnets |
| NAT Gateway | `azurerm_nat_gateway` | `var.create_vnet` | Outbound internet for private subnets |
| NAT Public IP | `azurerm_public_ip` | `var.create_vnet` | Static IP for NAT Gateway |
| NAT→Subnet Association | `azurerm_subnet_nat_gateway_association` | `var.create_vnet` | Bind NAT to private subnets |
| Route Table | `azurerm_route_table` | `var.create_vnet` | Custom routing (e.g., force-tunnel to firewall) |
| Application Gateway | `azurerm_application_gateway` | `var.ingress_application_gateway` | L7 load balancer with WAF (Standard_v2 or WAF_v2) |

### 3.2 Kubernetes — AKS (MANDATORY)

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| AKS Cluster | `azurerm_kubernetes_cluster` | Always | Managed K8s with SystemAssigned identity |
| Default Node Pool | Inline on AKS resource | Always | Managed worker nodes with autoscaling |
| Workload Identity | `azurerm_user_assigned_identity` + federation | Always | Pods authenticate to Azure services (equivalent of IRSA) |

| Setting | Variable | Default | Description |
|---------|----------|---------|-------------|
| Node VM Size | `var.node_vm_size` | `Standard_D2s_v3` | Worker node instance type |
| OS Disk Size | `var.os_disk_size_gb` | Provider default | Boot disk size for nodes |
| Network Plugin | `var.network_plugin` | `azure` | `azure` (Azure CNI) or `kubenet` |
| Network Policy | `var.network_policy` | `azure` | `azure` or `calico` |
| Pod CIDR | `var.pod_cidr` | Provider default | Pod network range (kubenet only) |
| Service CIDR | `var.service_cidr` | Provider default | K8s service IP range |
| DNS Service IP | `var.dns_service_ip` | Provider default | CoreDNS service IP |
| Identity | SystemAssigned | — | Managed identity (no service principal needed) |

### 3.3 Storage (MANDATORY)

#### Object Storage (Blob) — Equivalent of S3

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| Storage Account | `azurerm_storage_account` | Always | Foundation for Blob + Files (LRS/GRS/ZRS replication) |
| Blob Container | `azurerm_storage_container` | Always | Object storage container — equivalent of S3 bucket |
| Lifecycle Management | `azurerm_storage_management_policy` | Always | Tier transitions: Hot → Cool → Archive (equivalent of S3 lifecycle rules) |
| Private Endpoint (Blob) | `azurerm_private_endpoint` | `var.create_vnet` | Private connectivity from AKS to storage |

#### File Storage (Azure Files) — Equivalent of EFS

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| Azure Files Share | `azurerm_storage_share` | Always | NFS/SMB share for `ReadWriteMany` pod storage |
| Private Endpoint (Files) | `azurerm_private_endpoint` | `var.create_vnet` | Private connectivity from AKS to file share |

#### Block Storage (Managed Disks) — Equivalent of EBS

AKS includes built-in CSI drivers for Azure Managed Disks. No additional Terraform resources needed — StorageClasses are pre-installed:

| K8s StorageClass | Disk Type | Access Mode | Use Case |
|-----------------|-----------|-------------|----------|
| `managed-premium` | Premium SSD | `ReadWriteOnce` | Index placement, database journals |
| `managed` | Standard HDD | `ReadWriteOnce` | General-purpose, logs |
| `managed-csi-premium` | Premium SSD v2 | `ReadWriteOnce` | High-IOPS workloads |
| `azurefile` | Azure Files (Standard) | `ReadWriteMany` | Shared staging, SMTP queues |
| `azurefile-premium` | Azure Files (Premium) | `ReadWriteMany` | High-throughput shared storage |

### 3.4 Container Registry — ACR (MANDATORY)

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| Container Registry | `azurerm_container_registry` | Always | Azure Container Registry |
| ACR→AKS Role Assignment | `azurerm_role_assignment` | Always | AcrPull permission for AKS to access ACR |
| Geo-Replication | `azurerm_container_registry` (replications block) | `var.acr_sku == "Premium"` | Cross-region replication (Premium SKU only) |
| Vulnerability Scanning | Built-in (Microsoft Defender for Containers) | `var.enable_security_scanning` | Image scanning on push |

| Setting | Variable | Default | Description |
|---------|----------|---------|-------------|
| ACR SKU | `var.acr_sku` | `Standard` | Basic / Standard / Premium |
| Admin Enabled | `var.acr_admin_enabled` | `false` | Enable admin username/password |

### 3.5 Database (MANDATORY)

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| PostgreSQL Flexible Server | `azurerm_postgresql_flexible_server` | `var.db_engine == "postgresql"` | Managed PostgreSQL (equivalent of RDS PostgreSQL) |
| PostgreSQL Database | `azurerm_postgresql_flexible_server_database` | `var.db_engine == "postgresql"` | Application database on the flexible server |
| MySQL Flexible Server | `azurerm_mysql_flexible_server` | `var.db_engine == "mysql"` | Managed MySQL (equivalent of RDS MySQL) |
| MySQL Database | `azurerm_mysql_flexible_server_database` | `var.db_engine == "mysql"` | Application database on the flexible server |
| SQL Server | `azurerm_mssql_server` | `var.db_engine == "sqlserver"` | Managed SQL Server |
| SQL Database | `azurerm_mssql_database` | `var.db_engine == "sqlserver"` | Database on the SQL Server |
| DB Private Endpoint | `azurerm_private_endpoint` | `var.create_vnet` | Private connectivity from AKS subnet to database |
| DB Private DNS Zone | `azurerm_private_dns_zone` | `var.create_vnet` | DNS resolution for private endpoint |
| Auto-gen Password | `random_password` | Always | 16-char auto-generated database password |
| Key Vault Secret | `azurerm_key_vault_secret` | Always | Store DB password in Azure Key Vault |

**Supported Database Engines**:
| Engine | Azure Service | Terraform Type |
|--------|--------------|----------------|
| PostgreSQL | Azure Database for PostgreSQL — Flexible Server | `azurerm_postgresql_flexible_server` |
| MySQL | Azure Database for MySQL — Flexible Server | `azurerm_mysql_flexible_server` |
| MariaDB | Azure Database for MariaDB (legacy) | `azurerm_mariadb_server` |
| SQL Server | Azure SQL Database | `azurerm_mssql_server` + `azurerm_mssql_database` |

### 3.6 Application Gateway Configuration

| Setting | Variable | Default | Description |
|---------|----------|---------|-------------|
| SKU | `var.app_gateway_sku` | `Standard_v2` | Standard_v2 or WAF_v2 |
| Min Capacity | `var.app_gateway_min_capacity` | `1` | Autoscale minimum instances |
| Max Capacity | `var.app_gateway_max_capacity` | `10` | Autoscale maximum instances |
| SSL Policy | `var.ssl_policy_name` | Provider default | Predefined TLS policy |

### 3.7 Azure Key Variables

| Variable | Purpose |
|----------|---------|
| `var.region` | Azure region (e.g., `eastus`, `westus2`) |
| `var.resource_group` | Resource group name |
| `var.subscription_id` | Azure subscription ID |
| `var.client_id` | Service principal app ID |
| `var.client_secret` | Service principal secret |
| `var.tenant_id` | Azure AD tenant ID |
| `var.create_vnet` | Create VNet + subnets + NSGs (default: `true`) |
| `var.vnet_cidr` | VNet CIDR block (default: `10.1.0.0/16`) |
| `var.db_engine` | Database engine: `postgresql` / `mysql` / `sqlserver` (default: `postgresql`) |
| `var.db_sku_name` | Database SKU (default: `GP_Standard_D2s_v3`) |
| `var.db_storage_mb` | Database storage in MB (default: `32768`) |
| `var.db_version` | Database engine version |
| `var.file_storage_quota_gb` | Azure Files share quota |

### 3.8 Azure Secrets Vault

| Service | Status | Description |
|---------|--------|-------------|
| Azure Key Vault | 🔒 Planned (code exists, disabled) | Native Azure secrets management — currently falls back to AWS Secrets Manager |

---

## 4. Google Cloud Infrastructure

GCP deployments must provision the same 5 mandatory infrastructure categories as AWS and Azure.

### 4.1 Networking (MANDATORY)

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| VPC Network | `google_compute_network` | `var.create_vpc` | Custom-mode VPC — equivalent of AWS VPC |
| Public Subnet | `google_compute_subnetwork` | `var.create_vpc` | Hosts load balancers, NAT; secondary ranges for GKE pods/services |
| Private Subnet | `google_compute_subnetwork` | `var.create_vpc` | Hosts GKE nodes, Cloud SQL, Filestore |
| Cloud Router | `google_compute_router` | `var.create_vpc` | Regional router for Cloud NAT |
| Cloud NAT | `google_compute_router_nat` | `var.create_vpc` | Outbound internet for private subnet — equivalent of AWS NAT Gateway |
| Firewall (Allow Internal) | `google_compute_firewall` | `var.create_vpc` | Allow traffic between subnets within VPC |
| Firewall (Allow Health Checks) | `google_compute_firewall` | `var.create_vpc` | Google LB health check source ranges |
| Firewall (Deny All Ingress) | `google_compute_firewall` | `var.create_vpc` | Default deny — explicit allow rules only |
| Global Address (DB) | `google_compute_global_address` | `var.create_vpc` | Private IP range for Cloud SQL private services access |
| Private Service Connection | `google_service_networking_connection` | `var.create_vpc` | VPC peering for managed services (Cloud SQL, Filestore) |
| Managed SSL Certificate | `google_compute_managed_ssl_certificate` | `var.enable_managed_certificate` | Google-managed TLS certificate |

### 4.2 Kubernetes — GKE (MANDATORY)

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| GKE Cluster | `google_container_cluster` | Always | Managed K8s (`remove_default_node_pool = true`) |
| GKE Node Pool | `google_container_node_pool` | Always | Separately managed node pool with autoscaling |
| Workload Identity SA | `google_service_account` | Always | GCP service account for workload identity |
| Workload Identity Binding | `google_service_account_iam_binding` | Always | Bind K8s SA → GCP SA for pod-level cloud access |

| Setting | Variable | Default | Description |
|---------|----------|---------|-------------|
| Machine Type | `var.machine_type` | `e2-medium` | Worker node instance type |
| Disk Size | `var.disk_size_gb` | Provider default | Boot disk size for nodes |
| Network | `var.gke_network` | Created VPC | VPC network for the cluster |
| Subnetwork | `var.gke_subnetwork` | Created subnet | Subnet for the cluster |
| Stackdriver Logging | `var.enable_stackdriver_logging` | `true` | GKE → Cloud Logging integration |
| Stackdriver Monitoring | `var.enable_stackdriver_monitoring` | `true` | GKE → Cloud Monitoring integration |

### 4.3 Storage (MANDATORY)

#### Object Storage (GCS) — Equivalent of S3

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| GCS Bucket | `google_storage_bucket` | Always | Object storage bucket with versioning |
| Bucket IAM | `google_storage_bucket_iam_member` | Always | GKE workload identity access to bucket |
| Lifecycle Rules | Inline on bucket resource | Always | Age-based transitions and deletion |

| Setting | Variable | Default | Description |
|---------|----------|---------|-------------|
| Bucket Name | `var.gcs_bucket_name` | — | GCS bucket name |
| Storage Class | `var.gcs_storage_class` | `STANDARD` | STANDARD / NEARLINE / COLDLINE / ARCHIVE |
| Force Destroy | `var.gcs_force_destroy` | `false` | Allow bucket deletion with objects |

#### File Storage (Filestore) — Equivalent of EFS

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| Filestore Instance | `google_filestore_instance` | Always | Managed NFS for `ReadWriteMany` pod storage |

| Setting | Variable | Default | Description |
|---------|----------|---------|-------------|
| Tier | `var.filestore_tier` | `BASIC_SSD` | BASIC_HDD / BASIC_SSD / HIGH_SCALE_SSD / ENTERPRISE |
| Capacity | `var.filestore_capacity_gb` | `1024` | Minimum 1 TB for BASIC tiers |

#### Block Storage (Persistent Disk) — Equivalent of EBS

GKE includes built-in CSI drivers for Persistent Disks. No additional Terraform resources needed — StorageClasses are pre-installed:

| K8s StorageClass | Disk Type | Access Mode | Use Case |
|-----------------|-----------|-------------|----------|
| `premium-rwo` | SSD Persistent Disk (`pd-ssd`) | `ReadWriteOnce` | Index placement, database journals |
| `standard-rwo` | Standard Persistent Disk (`pd-standard`) | `ReadWriteOnce` | General-purpose, logs |
| `standard-rwx` | Filestore (via CSI) | `ReadWriteMany` | Shared staging, SMTP queues |

### 4.4 Container Registry — Artifact Registry (MANDATORY)

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| Artifact Registry | `google_artifact_registry_repository` | Always | Container image registry (Docker format) |
| Registry IAM | `google_artifact_registry_repository_iam_member` | Always | GKE node SA pull access |
| Vulnerability Scanning | Built-in (Container Analysis API) | `var.enable_security_scanning` | On-push vulnerability scanning |

### 4.5 Database — Cloud SQL (MANDATORY)

| Resource | Terraform Type | Conditional | Description |
|----------|---------------|-------------|-------------|
| Cloud SQL Instance | `google_sql_database_instance` | Always | Managed database server |
| Database | `google_sql_database` | Always | Application database on the instance |
| Database User | `google_sql_user` | Always | Application database user |
| Auto-gen Password | `random_password` | Always | 16-char auto-generated database password |
| Secret Manager Secret | `google_secret_manager_secret` + `version` | Always | Store DB password in Secret Manager |
| Private IP Config | Inline `ip_configuration` with `private_network` | `var.create_vpc` | Private connectivity from GKE to Cloud SQL |

**Supported Database Engines**:
| Engine | Cloud SQL Type | Terraform `database_version` |
|--------|---------------|------------------------------|
| PostgreSQL | Cloud SQL for PostgreSQL | `POSTGRES_14`, `POSTGRES_15`, `POSTGRES_16` |
| MySQL | Cloud SQL for MySQL | `MYSQL_8_0`, `MYSQL_8_4` |
| SQL Server | Cloud SQL for SQL Server | `SQLSERVER_2019_STANDARD`, `SQLSERVER_2022_STANDARD` |

| Setting | Variable | Default | Description |
|---------|----------|---------|-------------|
| DB Engine | `var.db_engine` | `postgresql` | `postgresql` / `mysql` / `sqlserver` |
| DB Tier | `var.db_tier` | `db-custom-2-8192` | Machine type (vCPU + RAM) |
| DB Disk Size | `var.db_disk_size_gb` | `20` | SSD storage capacity |
| DB Version | `var.db_version` | `POSTGRES_15` | Engine version |
| HA | `var.db_availability_type` | `ZONAL` | `ZONAL` or `REGIONAL` (multi-zone HA) |
| Backup | `var.db_backup_enabled` | `true` | Automated daily backups |

### 4.6 GCP Key Variables

| Variable | Purpose |
|----------|---------|
| `var.project_id` | GCP project ID |
| `var.region` | GCP region |
| `var.service_account_key` | JSON key file for authentication |
| `var.create_vpc` | Create VPC + subnets + firewall (default: `true`) |
| `var.vpc_cidr` | Subnet CIDR range (default: `10.2.0.0/16`) |
| `var.db_engine` | Database engine: `postgresql` / `mysql` / `sqlserver` (default: `postgresql`) |
| `var.gcp_managed_certificate_name` | Name for managed SSL cert |
| `var.gcp_managed_certificate_domains` | Domains covered by managed cert |

### 4.7 GCP Secrets Vault

| Service | Status | Description |
|---------|--------|-------------|
| GCP Secret Manager | 🔒 Planned (code exists, disabled) | Native GCP secrets management — currently falls back to AWS Secrets Manager |

---

## 5. Storage Tier Reference

### 5.1 Index Placement — High-Speed Storage

High-speed, low-latency storage for search indices, database WAL, and hot-path data.

| Provider | Storage Type | Terraform Resource | K8s Integration | IOPS / Throughput | Use Case |
|----------|-------------|-------------------|-----------------|-------------------|----------|
| **AWS** | EBS gp3 | `aws_eks_addon` (EBS CSI) + `kubernetes_storage_class_v1` (`ebs_gp3`) | CSI PersistentVolume (`ReadWriteOnce`) | 3,000 baseline IOPS, up to 16,000; 125 MB/s baseline, up to 1,000 MB/s | ZooKeeper data, Elasticsearch/Solr indices, database journals |
| **AWS** | EBS io2 | EC2 module `var.root_volume_type = "io2"` | Direct EC2 attach or CSI | Up to 64,000 IOPS, 1,000 MB/s | Mission-critical index workloads requiring provisioned IOPS |
| **Azure** | Premium SSD (Managed Disk) | AKS default `managed-premium` StorageClass | CSI PersistentVolume (`ReadWriteOnce`) | Up to 20,000 IOPS (P30+), 900 MB/s | AKS index workloads, database journals |
| **Azure** | Ultra Disk | Manual configuration | CSI PersistentVolume | Up to 160,000 IOPS, 4,000 MB/s | Extreme-performance index placement |
| **GCP** | SSD Persistent Disk (`pd-ssd`) | GKE default `premium-rwo` StorageClass | CSI PersistentVolume (`ReadWriteOnce`) | Up to 100,000 read IOPS, 30,000 write IOPS | GKE index workloads |

### 5.2 SMTP Staging Queues — Good Throughput for Small File Processing

Moderate-throughput storage for SMTP mail staging, message queues, and small file batch processing.

| Provider | Storage Type | Terraform Resource | K8s Integration | Throughput | Use Case |
|----------|-------------|-------------------|-----------------|------------|----------|
| **AWS** | EBS gp3 (small volume) | `kubernetes_storage_class_v1` (`ebs_gp3`) | CSI PersistentVolume (`ReadWriteOnce`) | 125–1,000 MB/s; 3,000–16,000 IOPS | Per-pod SMTP staging spool, local queue buffers |
| **AWS** | EFS (General Purpose) | `aws_efs_file_system` + `aws_efs_mount_target` | CSI PersistentVolume (`ReadWriteMany`) | Scales with size (bursting throughput mode); shared across pods | Shared SMTP staging directory accessible by multiple worker pods |
| **AWS** | S3 Standard | `aws_s3_bucket` | S3 CSI mount or SDK access | Virtually unlimited throughput | Message archive staging, large batch pickup directories |
| **Azure** | Azure Files (Standard) | `azurerm_storage_account` + `azurerm_storage_share` | CSI PersistentVolume (`ReadWriteMany`) | Up to 300 MiB/s (Standard); shared NFS | Shared SMTP staging across AKS pods |
| **Azure** | Azure Files (Premium) | Manual config | CSI PersistentVolume (`ReadWriteMany`) | Up to 10 GiB/s (100 TB share) | High-throughput staging queues |
| **GCP** | GCS Standard | `google_storage_bucket` | GCS FUSE or SDK access | Virtually unlimited | Staging bucket for SMTP message batches |
| **GCP** | Filestore (Basic HDD/SSD) | Manual config | NFS PersistentVolume (`ReadWriteMany`) | 180–1,200 MiB/s | Shared SMTP staging across GKE pods |

### 5.3 Database Storage — Large Workloads

Storage for relational databases handling large transactional and analytical workloads.

| Provider | Storage Type | Terraform Resource | Managed Service | Max Size | Use Case |
|----------|-------------|-------------------|-----------------|----------|----------|
| **AWS** | RDS (gp3 SSD) | `aws_db_instance` | RDS (PostgreSQL, MySQL, MariaDB, SQL Server, Oracle) | Up to 64 TB | Primary application database; Terraform-provisioned with auto-generated passwords |
| **AWS** | EBS io2 Block Express | EC2 module (self-managed DB on EC2) | Self-managed | Up to 64 TB, 256K IOPS | Self-managed database on EC2 requiring extreme performance |
| **Azure** | Azure Managed Disk (Premium SSD v2) | AKS-managed or manual | Azure Database for PostgreSQL / MySQL / SQL Server | Up to 64 TB | Platform-managed database storage |
| **Azure** | Azure SQL / PostgreSQL Flexible Server | External (not in current Terraform) | Fully managed | Varies by tier | Recommended for production Azure deployments |
| **GCP** | SSD Persistent Disk | GKE-managed or manual | Cloud SQL (PostgreSQL, MySQL, SQL Server) | Up to 64 TB | GKE-hosted or Cloud SQL database storage |

**Terraform Provisioning Status**:
- ✅ AWS RDS — Full module with multi-engine support (`terraform/modules/aws_rds/`)
- ✅ Azure — Full module with multi-engine support (`terraform/modules/azure_db/`) → PostgreSQL/MySQL Flexible Server + Azure SQL with private DNS
- ✅ GCP — Full module with multi-engine support (`terraform/modules/gcp_db/`) → Cloud SQL (PostgreSQL/MySQL/SQL Server) with Secret Manager
- ✅ DigitalOcean — Full module (`terraform/modules/do_db/`) → Managed Database (PostgreSQL/MySQL/Redis/MongoDB) with connection pool
- ✅ Linode — Full module (`terraform/modules/linode_db/`) → Managed Database (PostgreSQL/MySQL) with encryption + SSL

> **Mandatory**: Every deployment requires a managed database. Containerized PostgreSQL (in-cluster) is not a substitute for the managed database service.

### 5.4 Archive Storage

Long-term, low-cost storage for deployment logs, Terraform state backups, audit trails, and compliance data.

| Provider | Storage Type | Terraform Resource | Cost Tier | Retrieval | Use Case |
|----------|-------------|-------------------|-----------|-----------|----------|
| **AWS** | S3 Standard-IA | `aws_s3_bucket` + `aws_s3_bucket_lifecycle_configuration` | ~$0.0125/GB/mo | Milliseconds | Recent deployment logs and state files (30-90 days old) |
| **AWS** | S3 Glacier Instant Retrieval | S3 lifecycle transition rule | ~$0.004/GB/mo | Milliseconds | Deployment archives (90 days – 1 year) |
| **AWS** | S3 Glacier Deep Archive | S3 lifecycle transition rule | ~$0.00099/GB/mo | 12–48 hours | Long-term compliance archives (1+ years) |
| **AWS** | S3 Object Lock | `aws_s3_bucket_object_lock_configuration` | Standard tier pricing + lock | N/A | WORM-compliant audit log retention |
| **Azure** | Blob Storage Cool Tier | `azurerm_storage_account` (access_tier: Cool) | ~$0.01/GB/mo | Milliseconds | Recent deployment logs (30-90 days) |
| **Azure** | Blob Storage Archive Tier | Storage account lifecycle mgmt | ~$0.00099/GB/mo | Hours | Long-term compliance archives |
| **GCP** | GCS Nearline | `google_storage_bucket` (storage_class: NEARLINE) | ~$0.01/GB/mo | Milliseconds | Monthly-access deployment archives |
| **GCP** | GCS Coldline / Archive | GCS lifecycle policy | ~$0.004–$0.0012/GB/mo | Milliseconds–hours | Long-term compliance archives |

**S3 Lifecycle Rules** (currently Terraform-supported):
- `var.lifecycle_rules` — Configurable transition rules on the S3 bucket module
- `var.enable_replication` — Cross-region replication for disaster recovery
- `var.enable_object_lock` — WORM compliance for audit data

### 5.5 Additional Drives for EC2 Instances

Additional block storage volumes attached to EC2 instances (non-Kubernetes workloads).

| Provider | Storage Type | Terraform Variable | Default | Use Case |
|----------|-------------|-------------------|---------|----------|
| **AWS** | EBS gp2 | `var.root_volume_type = "gp2"` | — | General-purpose boot volume (legacy) |
| **AWS** | EBS gp3 | `var.root_volume_type = "gp3"` | Default | General-purpose boot volume (recommended) |
| **AWS** | EBS io1 | `var.root_volume_type = "io1"` | — | Provisioned IOPS for high-performance apps |
| **AWS** | EBS io2 | `var.root_volume_type = "io2"` | — | Provisioned IOPS with higher durability |
| **AWS** | EBS st1 | Additional volume config | — | Throughput-optimized HDD for sequential workloads |
| **AWS** | EBS sc1 | Additional volume config | — | Cold HDD for infrequent access |
| **AWS** | Root Volume Size | `var.root_volume_size` | `30` GB | Configurable boot disk size |

**EC2 Instance Types Supported** (via `var.instance_type`):
- General Purpose: `t3.*`, `m5.*`, `m6i.*`
- Compute Optimized: `c5.*`, `c6i.*`
- Memory Optimized: `r5.*`, `r6i.*`
- Storage Optimized: `i3.*`, `d2.*`

**EC2 OS-Specific Storage**:
| OS | Boot Volume | Additional Considerations |
|----|------------|--------------------------|
| Windows Server 2016/2019/2022 | gp3 (30 GB+) | Password stored in Secrets Manager; RDP access |
| Amazon Linux 2 | gp3 (30 GB+) | SSH key pair access; SSM agent pre-installed |
| Ubuntu LTS | gp3 (30 GB+) | SSH key pair access |
| RHEL | gp3 (30 GB+) | SSH key pair access; subscription considerations |

### 5.6 Additional Drives for Pod Deployments

Persistent storage volumes attached to Kubernetes pods across all providers.

| Provider | Storage Type | K8s StorageClass | Access Mode | Provisioner | Use Case |
|----------|-------------|-----------------|-------------|-------------|----------|
| **AWS** | EBS gp3 | `ebs-gp3` (custom) | `ReadWriteOnce` | `ebs.csi.aws.com` | Single-pod persistent data (databases, caches, index data) |
| **AWS** | EFS | `efs` (custom) | `ReadWriteMany` | `efs.csi.aws.com` | Shared storage across multiple pods (staging dirs, shared config) |
| **AWS** | S3 (Mountpoint) | S3 CSI mount | `ReadWriteMany` | `s3.csi.aws.com` | Object storage as filesystem mount for batch processing |
| **Azure** | Azure Managed Disk (Premium) | `managed-premium` (built-in) | `ReadWriteOnce` | `disk.csi.azure.com` | Single-pod persistent data on AKS |
| **Azure** | Azure Managed Disk (Standard) | `managed` (built-in) | `ReadWriteOnce` | `disk.csi.azure.com` | Cost-effective single-pod storage on AKS |
| **Azure** | Azure Files (Standard) | `azurefile` (built-in) | `ReadWriteMany` | `file.csi.azure.com` | Shared storage across AKS pods |
| **Azure** | Azure Files (Premium) | `azurefile-premium` (built-in) | `ReadWriteMany` | `file.csi.azure.com` | High-throughput shared storage |
| **GCP** | SSD Persistent Disk | `premium-rwo` (built-in) | `ReadWriteOnce` | `pd.csi.storage.gke.io` | Single-pod high-performance storage on GKE |
| **GCP** | Standard Persistent Disk | `standard-rwo` (built-in) | `ReadWriteOnce` | `pd.csi.storage.gke.io` | Cost-effective single-pod storage on GKE |
| **GCP** | Filestore | Manual NFS PV | `ReadWriteMany` | NFS | Shared storage across GKE pods |

**Current K8s Manifest Storage** (from `kubernetes/` manifests):

| Resource | Type | Capacity | Mount Path | Used By |
|----------|------|----------|------------|---------|
| `postgres-pv` | PersistentVolume (`hostPath`) | 5 Gi | `/var/lib/postgresql/data` | PostgreSQL StatefulSet |
| `postgres-pvc` | PersistentVolumeClaim | 5 Gi | `/var/lib/postgresql/data` | PostgreSQL StatefulSet |
| `nginx-cache` | `emptyDir` | Ephemeral | `/var/cache/nginx` | Nginx pod |
| `nginx-logs` | `emptyDir` | Ephemeral | `/var/log/nginx` | Nginx pod |

> **Note**: The current `hostPath` PV is suitable only for Minikube/development. Production deployments must use the cloud-specific StorageClasses listed above.

---

## 6. Application Stack (Cloud-Agnostic)

These components are deployed **on top of** the cloud infrastructure, regardless of provider.

### 6.1 Container Images

| Image | Base | Purpose |
|-------|------|---------|
| `zlaws-backend:v1` | `node:18-alpine` | Express API + pre-built React frontend static files |
| `zlaws-postgres:v1` | `postgres:14-alpine` | PostgreSQL with pre-baked schema (9 tables + indexes) |
| `zlaws-nginx:v1` | `nginx:alpine` | Reverse proxy with TLS termination, rate limiting, WebSocket |

### 6.2 Kubernetes Resources (Per Deployment)

| Kind | Name | Replicas | Description |
|------|------|----------|-------------|
| `Namespace` | `zlaws` | — | Isolation boundary |
| `Deployment` | `zlaws-backend` | 2 | Express API with health probes, resource limits |
| `Deployment` | `zlaws-nginx` | 1 | Nginx reverse proxy with cache/log volumes |
| `StatefulSet` | `postgres` | 1 | PostgreSQL with persistent volume |
| `Service` (LoadBalancer) | `zlaws-backend` | — | Exposes API on port 80 → 5000 |
| `Service` (LoadBalancer) | `zlaws-nginx` | — | Exposes HTTP/HTTPS on ports 80, 443 |
| `Service` (Headless) | `postgres` | — | Internal database access on port 5432 |
| `ConfigMap` | `backend-config` | — | Non-sensitive environment variables |
| `ConfigMap` | `postgres-config` | — | Database name and user |
| `Secret` | `backend-secret` | — | JWT, encryption keys, API key salt |
| `Secret` | `postgres-secret` | — | Database password |
| `PersistentVolume` | `postgres-pv` | — | 5 Gi database storage |
| `PersistentVolumeClaim` | `postgres-pvc` | — | Claims postgres-pv |

### 6.3 Infrastructure Dependencies

| Service | Image / Provider | Port | Required | Purpose |
|---------|-----------------|------|----------|---------|
| PostgreSQL | `postgres:15-alpine` | 5432 | ✅ Yes | Primary data store (16 tables) |
| HashiCorp Vault | `vault:1.15.0` | 8200 | ✅ Yes | Secrets management (cloud credentials) |
| Redis | `redis:7-alpine` | 6379 | ✅ Yes | Caching and job queue |

### 6.4 External Service Integrations

| Integration | Protocol | Service File | Purpose |
|-------------|----------|-------------|---------|
| SMTP Email | SMTP | `alertService.js` (nodemailer) | Deployment alert notifications |
| Slack | HTTPS Webhook | `alertService.js` | Slack channel notifications |
| HTTP Webhooks | HTTPS POST | `alertService.js` | Generic external integrations |
| Socket.IO WebSocket | WS/WSS | `websocketEmissionService.js` | Real-time deployment progress |

### 6.5 Cloud-Specific Secrets Vaults

| Provider | Vault Service | File | Status |
|----------|--------------|------|--------|
| AWS | AWS Secrets Manager | `awsSecrets.js` | ✅ Active |
| Azure | Azure Key Vault | `azureKeyVault.js.disabled` | 🔒 Planned |
| GCP | GCP Secret Manager | `gcpSecretManager.js.disabled` | 🔒 Planned |
| DigitalOcean | HashiCorp Vault | `hashicorpVault.js.disabled` | 🔒 Planned |
| Linode | HashiCorp Vault | `hashicorpVault.js.disabled` | 🔒 Planned |

### 6.6 Database Schema (16 Tables)

| Table | Purpose |
|-------|---------|
| `users` | User accounts with bcrypt passwords, roles, AD/LDAP fields, theme preferences |
| `credentials` | Encrypted cloud provider credentials |
| `deployments` | Deployment state, cloud provider, Terraform outputs (JSON) |
| `deployment_drafts` | Pre-approval deployment configurations |
| `deployment_logs` | Per-phase Terraform output logs |
| `teams` | Team entity for team-based RBAC |
| `team_members` | Team membership with role and permissions |
| `shared_resources` | Team-resource permission mappings |
| `audit_logs` | Request/action audit trail |
| `alert_channel_configs` | Notification channel settings (email, Slack, webhook) |
| `container_deployments` | Container-level deployment tracking |
| `database_credentials` | DB connection info for SQL script execution |
| `deployment_sql_scripts` | SQL scripts linked to deployments |
| `ad_configurations` | AD/LDAP configuration (server URL, bind DN, search settings) |
| `ad_role_mappings` | AD group → application role mappings |

---

## 7. Infrastructure Summary Matrix

### Mandatory Infrastructure Parity — All 5 Categories

Every deployment provisions **all 5 categories** regardless of cloud provider. The table below shows current implementation status.

✅ = Terraform implemented &nbsp;&nbsp; 🔨 = Terraform must be built &nbsp;&nbsp; ⬜ = Optional / additive

| Category | Sub-Component | AWS | Azure | GCP |
|----------|--------------|-----|-------|-----|
| **1. Networking** | VPC / VNet | ✅ `aws_vpc` | ✅ `azurerm_virtual_network` | ✅ `google_compute_network` |
| | Public Subnet | ✅ `aws_subnet` (per AZ) | ✅ `azurerm_subnet` | ✅ `google_compute_subnetwork` |
| | Private Subnet | ✅ `aws_subnet` (per AZ) | ✅ `azurerm_subnet` (AKS + DB) | ✅ `google_compute_subnetwork` (+ secondary ranges) |
| | Security Groups / Firewall | ✅ `aws_security_group` (×3) | ✅ `azurerm_network_security_group` (×2) | ✅ `google_compute_firewall` (×3) |
| | NAT Gateway | ✅ `aws_nat_gateway` (per AZ) | ✅ `azurerm_nat_gateway` | ✅ `google_compute_router_nat` |
| | Internet Gateway / Router | ✅ `aws_internet_gateway` | N/A (implicit in VNet) | ✅ `google_compute_router` |
| | Route Tables | ✅ `aws_route_table` (pub + priv) | ✅ `azurerm_route_table` | N/A (implicit in VPC) |
| | Private Service Access | ✅ (via SGs + subnet groups) | ✅ DB subnet with delegation | ✅ `google_service_networking_connection` |
| **2. Storage** | Object Storage | ✅ S3 (full module) | ✅ `azurerm_storage_container` (Blob) | ✅ GCS bucket |
| | File / Shared Storage | ✅ EFS (full module) | ✅ Azure Files (share in storage module) | ✅ `google_filestore_instance` |
| | Block Storage (Pod CSI) | ✅ EBS CSI + StorageClass | ✅ Built-in (managed-premium) | ✅ Built-in (premium-rwo) |
| | Lifecycle / Archival Rules | ✅ S3 lifecycle config | ✅ `azurerm_storage_management_policy` | ✅ GCS lifecycle rules |
| **3. Kubernetes** | Managed Cluster | ✅ EKS | ✅ AKS | ✅ GKE |
| | Managed Node Pool | ✅ Node Group | ✅ Default Pool | ✅ Node Pool |
| | Autoscaling | ✅ Cluster Autoscaler (Helm) | ✅ AKS built-in | ✅ GKE built-in |
| | Workload Identity (pod→cloud) | ✅ IRSA (OIDC) | ✅ Workload Identity (SystemAssigned) | ✅ Workload Identity (GCP SA) |
| | CSI Drivers | ✅ EBS + EFS + S3 CSI | ✅ Built-in | ✅ Built-in |
| **4. Container Registry** | Registry Resource | ✅ ECR | ✅ ACR | ✅ Artifact Registry |
| | K8s Pull Access | ✅ IAM policy | ✅ AcrPull role | ✅ IAM binding |
| | Lifecycle / Cleanup | ✅ ECR lifecycle policy | ⬜ ACR retention policy | ⬜ Cleanup policy |
| | Vulnerability Scanning | ✅ Inspector v2 | ⬜ Defender for Containers | ⬜ Container Analysis API |
| **5. Database** | Managed DB Instance | ✅ RDS | ✅ Flexible Server | ✅ Cloud SQL |
| | Application Database | ✅ (inline on RDS) | ✅ `azurerm_postgresql_flexible_server_database` | ✅ `google_sql_database` |
| | DB Subnet / Private Access | ✅ `aws_db_subnet_group` | ✅ Private DNS zone + VNet link | ✅ Private IP config |
| | Security Rules for DB | ✅ `aws_security_group` (RDS) | ✅ NSG rules for DB subnet | ✅ Firewall via private service access |
| | Auto-gen Password | ✅ `random_password` | ✅ `random_password` | ✅ `random_password` |
| | Password in Vault | ✅ Secrets Manager | ✅ (output for Key Vault integration) | ✅ Secret Manager secret |
| | Multi-engine Support | ✅ PG, MySQL, MariaDB, MSSQL, Oracle | ✅ PG, MySQL, MSSQL | ✅ PG, MySQL, MSSQL |

### Implementation Gap Summary

| Provider | ✅ Implemented | 🔨 Must Build | ⬜ Optional | Gap % |
|----------|---------------|--------------|------------|-------|
| **AWS** | 30/30 | 0 | 0 | **0% — Baseline** |
| **Azure** | 27/30 | 0 | 3 | **0% — Full parity achieved** (ACR retention, Defender scanning optional) |
| **GCP** | 27/30 | 0 | 3 | **0% — Full parity achieved** (AR cleanup, Container Analysis optional) |
| **DigitalOcean** | Core complete | 0 | — | VPC + DOKS + DB modules wired |
| **Linode** | Core complete | 0 | — | VPC + LKE + DB modules wired |

### Terraform Modules — Implementation Status

All required modules have been built and wired into their respective environment entry points:

| Module Path | Provider | Status | Provisions |
|-------------|----------|--------|------------|
| `terraform/modules/azure_vnet/` | Azure | ✅ Built | VNet, 3 subnets (public/AKS/DB), 2 NSGs, NAT gateway, route table |
| `terraform/modules/azure_db/` | Azure | ✅ Built | PostgreSQL/MySQL Flexible Server + Azure SQL, private DNS zone + VNet link |
| `terraform/modules/azure_storage/` | Azure | ✅ Built | Storage Account, Blob container, lifecycle policy (Hot→Cool→Archive), Azure Files share |
| `terraform/modules/gcp_vpc/` | GCP | ✅ Built | VPC, 2 subnets (public/private + secondary ranges), Cloud Router, Cloud NAT, 3 firewall rules, private service access |
| `terraform/modules/gcp_db/` | GCP | ✅ Built | Cloud SQL (PostgreSQL/MySQL/SQL Server), Secret Manager integration |
| `terraform/modules/gcp_filestore/` | GCP | ✅ Built | Filestore instance (managed NFS for GKE workloads) |
| `terraform/modules/do_db/` | DigitalOcean | ✅ Built | Managed Database (PostgreSQL/MySQL/Redis/MongoDB), connection pool, firewall |
| `terraform/modules/linode_db/` | Linode | ✅ Built | Managed Database (PostgreSQL/MySQL), encryption, SSL |

### Conditional Feature Flags (Updated for Parity)

| Flag | What It Controls | AWS | Azure | GCP | Default |
|------|-----------------|-----|-------|-----|---------|
| `cloud_provider` | Which provider's resources are created | ✅ | ✅ | ✅ | Required |
| `create_vpc` / `create_vnet` | Full networking stack | ✅ `create_vpc` | ✅ `create_vnet` | ✅ `create_vpc` | `true` |
| `db_engine` | Database engine selection | ✅ (via RDS `engine`) | ✅ | ✅ | `postgresql` |
| `enable_object_storage` | Object storage bucket/container | ✅ | ✅ `enable_blob_storage` | ✅ | `true` |
| `enable_file_storage` | Shared file system | ✅ | ✅ (in storage module) | ✅ `enable_filestore` | `true` |
| `enable_container_registry` | Container registry | ✅ | ✅ | ✅ | `true` |
| `enable_security_scanning` | Image vulnerability scanning | ✅ | ⬜ | ⬜ | `false` |
| `enable_ebs_csi_driver` | AWS-specific: EBS CSI addon | ✅ | N/A | N/A | `true` |
| `enable_efs_csi_driver` | AWS-specific: EFS CSI addon | ✅ | N/A | N/A | `true` |
| `enable_s3_csi` | AWS-specific: S3 CSI addon | ✅ | N/A | N/A | `true` |
| `enable_alb_controller` | AWS-specific: ALB Ingress Controller | ✅ | N/A | N/A | `false` |
| `enable_cluster_autoscaler` | AWS-specific: Cluster Autoscaler Helm | ✅ | N/A | N/A | `false` |
| `create_iam_user` | AWS-specific: CI/CD deployment user | ✅ | N/A | N/A | `false` |
| `ingress_application_gateway` | Azure-specific: App Gateway | N/A | ✅ | N/A | `false` |
| `enable_managed_certificate` | GCP-specific: Managed SSL Cert | N/A | N/A | ✅ | `false` |

### Total Infrastructure Elements (Full Deployment — With Parity)

| Provider | Core Mandatory (5 categories) | With Optional Addons | Current Terraform Status |
|----------|-------------------------------|---------------------|-------------------------|
| **AWS** | ~40 (VPC + EKS + ECR + S3 + EFS + RDS + IAM) | ~70+ (+ EC2, ALB, Autoscaler, Inspector, Resource Group) | ✅ Complete |
| **Azure** | ~30 (RG + VNet + AKS + ACR + Blob + Files + DB + Private Endpoints) | ~40+ (+ App Gateway, Defender, Geo-Replication) | ✅ Complete — all 5 categories wired |
| **GCP** | ~25 (VPC + GKE + AR + GCS + Filestore + Cloud SQL + WI) | ~35+ (+ Managed Cert, Container Analysis) | ✅ Complete — all 5 categories wired |
| **DigitalOcean** | ~10 (VPC + DOKS + Managed DB) | ~15+ (+ Spaces, Registry) | ✅ Core complete |
| **Linode** | ~10 (VPC + LKE + Managed DB) | ~15+ (+ Object Storage) | ✅ Core complete |

---

## 8. On-Premise Infrastructure

On-premise deployments replicate the full ZL-MCDT cloud stack using physical servers, virtualization platforms, or private data center hardware. Every cloud-managed service has a self-hosted equivalent that must be procured, installed, and operated by the infrastructure team.

> **Operational Note**: On-premise deployments carry full operational responsibility — patching, capacity planning, hardware failure, backup/restore, and TLS certificate management are all internal obligations. No managed services exist to absorb these concerns.

---

### 8.1 Compute — Equivalent of Cloud VMs / Node Pools

| Cloud Equivalent | On-Premise Resource | Specs (Minimum) | Specs (Recommended) | Notes |
|-----------------|--------------------|-----------------|--------------------|-------|
| AWS EKS Node Group | Bare-metal or VM worker nodes | 2 vCPU, 4 GB RAM | 8 vCPU, 32 GB RAM per node, 3+ nodes | Must support container runtime (containerd / Docker) |
| Azure AKS Node Pool | Bare-metal or VM worker nodes | 2 vCPU, 8 GB RAM | 8 vCPU, 32 GB RAM per node, 3+ nodes | Same as above |
| GCP GKE Node Pool | Bare-metal or VM worker nodes | 2 vCPU, 4 GB RAM | 8 vCPU, 32 GB RAM per node, 3+ nodes | Same as above |
| AWS EC2 Instances (Windows) | Physical server or VM with Windows Server 2019/2022 | 4 vCPU, 8 GB RAM, 80 GB disk | 8 vCPU, 32 GB RAM, 200 GB disk | RDP access; domain-join optional |
| AWS EC2 Instances (Linux) | Physical server or VM with RHEL / Ubuntu / Rocky Linux | 2 vCPU, 4 GB RAM, 40 GB disk | 8 vCPU, 16 GB RAM, 100 GB disk | SSH key-pair access |

**Hypervisor / Virtualization Options**:

| Platform | Type | Notes |
|----------|------|-------|
| VMware vSphere / ESXi | Type-1 Hypervisor | Enterprise standard; Terraform provider available (`vsphere`) |
| Microsoft Hyper-V | Type-1 Hypervisor | Built into Windows Server; Terraform provider available |
| KVM / libvirt | Type-1 (Linux) | Open-source; used with Proxmox or standalone; Terraform provider available |
| Proxmox VE | Type-1 (KVM-based) | Open-source cluster manager; Terraform provider available |
| OpenStack | Private Cloud Platform | Full IaaS for large environments; Terraform provider available |

---

### 8.2 Networking — Equivalent of VPC / Subnets / Security Groups

| Cloud Equivalent | On-Premise Resource | Tool / Protocol | Notes |
|-----------------|--------------------|-----------------|---------|
| VPC | VLAN or private L2/L3 segment | Managed switch (802.1Q VLANs) or SDN (OVS, NSX) | Separate VLANs for management, workload, storage, backup |
| Public Subnet | DMZ VLAN / Routed segment | Firewall perimeter rule | Hosts load balancers and ingress controllers |
| Private Subnet | Internal VLAN | L3 routing, no direct internet access | Hosts K8s nodes, database servers |
| Internet Gateway | Edge router / firewall | Cisco, Juniper, Fortinet, pfSense, OPNsense | NAT for outbound access; inbound via reverse proxy |
| NAT Gateway | NAT rule on firewall / router | iptables NAT, Fortinet NAT, pfSense | Outbound internet for private segments |
| Security Groups | Firewall rules / ACLs | Host firewall (firewalld / ufw / Windows Firewall) + network ACLs | Enforce per-service port restrictions |
| AWS Route Tables | Static or dynamic routing (OSPF / BGP) | Network switch/router configuration | Internal routing between VLANs |
| Elastic IP | Static IP / IPAM allocation | IPAM software (phpIPAM, NetBox, Infoblox) | Reserve and document static IPs |
| NAT EIP | Public IP on edge device | ISP-assigned static IP or block | Required for fixed external address |
| DNS (Route 53 equivalent) | Internal DNS server | BIND, PowerDNS, Windows DNS, Pi-hole (lab) | Hostname resolution for all services |
| Load Balancer (ALB / App Gateway) | Software load balancer | HAProxy, NGINX, Traefik, MetalLB | Routes HTTP/HTTPS to K8s pods; TLS termination |

**Network Segmentation (Recommended)**:
```
VLAN 10 — Management (BMC/iDRAC/iLO, switches, hypervisors)
VLAN 20 — Kubernetes Nodes (worker + control plane)
VLAN 30 — Database / Storage Servers
VLAN 40 — DMZ / Ingress (load balancers, reverse proxies)
VLAN 50 — Backup / Replication
```

---

### 8.3 Kubernetes — Equivalent of EKS / AKS / GKE

A self-managed Kubernetes cluster must be installed and operated on-premise.

| Component | Cloud Equivalent | On-Premise Tool | Notes |
|-----------|-----------------|----------------|-------|
| Kubernetes Distribution | EKS / AKS / GKE | kubeadm, k3s, RKE2, Talos, OpenShift | kubeadm for standard; k3s for lightweight; RKE2 for FIPS/Air-gap |
| Control Plane Nodes | Cloud-managed master | 3× dedicated VMs or bare metal (odd number for etcd quorum) | Min 4 vCPU, 8 GB RAM each; do not schedule workloads here |
| Worker Nodes | Managed Node Group / Node Pool | VM or bare metal (scale as needed) | Min 3 nodes for HA; 8 vCPU / 32 GB RAM recommended per node |
| Container Runtime | Managed by cloud | containerd (recommended) or CRI-O | Docker deprecated as K8s runtime as of 1.24 |
| etcd | Cloud-managed | etcd cluster (3 or 5 nodes) | Co-located on control plane nodes or separate for large clusters |
| CNI Plugin (networking) | AWS VPC CNI / Azure CNI / GKE CNI | Calico, Cilium, Flannel, Weave | Calico or Cilium recommended for NetworkPolicy support |
| Ingress Controller | ALB Controller / App Gateway | NGINX Ingress Controller, Traefik, HAProxy Ingress, Contour | Pair with MetalLB for bare-metal LoadBalancer service type |
| Load Balancer (bare metal) | Cloud-managed LB | MetalLB (L2 or BGP mode) | Required for `Service.type: LoadBalancer` on bare metal |
| Certificate Manager | ACM / App Gateway SSL / GCP Managed Cert | cert-manager (Let's Encrypt or internal CA) | Automates TLS certificate issuance and renewal |
| Cluster Autoscaler | AWS/GCP/Azure Autoscaler | Cluster Autoscaler (with supported cloud) or KEDA + manual | Manual capacity planning required without cloud API |
| Dashboard / Visibility | Cloud console | Kubernetes Dashboard, Lens, Headlamp, k9s (CLI) | Lens recommended for on-premise cluster management |
| K8s Storage Orchestrator | Cloud CSI drivers | Rook-Ceph, Longhorn, OpenEBS, NFS CSI, Local Path Provisioner | Required for dynamic PV provisioning |

**Recommended On-Premise K8s Distributions**:

| Distribution | Best For | Notes |
|-------------|---------|-------|
| **kubeadm** | Standard production clusters | Official Kubernetes tooling; full control |
| **k3s** (Rancher) | Lightweight / edge / lab | Single binary; built-in containerd; supports HA |
| **RKE2** (Rancher) | FIPS-compliant / air-gapped | CIS benchmark hardened by default |
| **Talos Linux** | Immutable OS for K8s | Minimal attack surface; API-only management |
| **OpenShift** (Red Hat) | Enterprise / regulated | Full platform with built-in registry, CI/CD, RBAC, monitoring |

---

### 8.4 Container Registry — Equivalent of ECR / ACR / Artifact Registry

| Cloud Equivalent | On-Premise Product | Protocol | Notes |
|-----------------|-------------------|----------|-------|
| AWS ECR | Harbor | HTTPS / OCI | Full-featured: RBAC, vulnerability scanning (Trivy), replication, proxy cache |
| AWS ECR | Docker Registry v2 | HTTPS | Lightweight; no UI or scanning — use for simple deployments |
| AWS ECR | Nexus Repository | HTTPS | Multi-format (Docker, Maven, npm, etc.); common in enterprises |
| AWS ECR | Gitea Packages / GitLab Registry | HTTPS | Integrated with source control |
| Amazon Inspector v2 | Trivy (in Harbor) | — | Open-source vulnerability scanner; integrates with Harbor and CI pipelines |
| ECR Lifecycle Policy | Harbor tag retention policies | — | Auto-cleanup of old/untagged images |
| ECR Replication | Harbor replication rules | — | Sync between Harbor instances |

**Minimum Harbor Deployment**:
- 2 vCPU, 4 GB RAM, 50 GB disk (registry storage separate)
- TLS certificate required (internal CA or Let's Encrypt)
- PostgreSQL backend (can share the application database server)
- Redis backend (can share the application Redis instance)

---

### 8.5 Storage Tiers — On-Premise Equivalents

#### 8.5.1 Index Placement — High-Speed Storage

| Cloud Equivalent | On-Premise Resource | Technology | IOPS Target | Notes |
|-----------------|--------------------|-----------|-----------|---------|
| AWS EBS gp3 (CSI) | Local NVMe SSD (direct-attach) | NVMe PCIe Gen4 | 500K+ IOPS | Fastest option; no network overhead; use `local-path` provisioner or `TopoLVM` |
| AWS EBS gp3 (CSI) | SAN-attached SSD LUN | iSCSI or Fibre Channel to all-flash array (Pure Storage, NetApp AFF, Dell PowerStore) | 100K–500K IOPS | Network-attached; supports live migration |
| AWS EBS io2 (CSI) | All-flash SAN (Tier 0) | FC / iSCSI / NVMe-oF | 500K+ IOPS | Enterprise arrays with QoS guarantees |
| GCP pd-ssd / Azure Premium SSD | Ceph RBD (SSD pool) | Rook-Ceph on SSD nodes | 10K–50K IOPS | Software-defined; scales with nodes |
| EBS gp3 StorageClass | Longhorn (SSD-backed) | iSCSI | 5K–20K IOPS | Simpler than Ceph; built for K8s |
| EBS gp3 StorageClass | OpenEBS cStor / Mayastor | NVMe-oF / iSCSI | 50K+ IOPS (Mayastor) | Mayastor uses SPDK for near-bare-metal performance |

#### 8.5.2 SMTP Staging Queues — Throughput for Small File Processing

| Cloud Equivalent | On-Premise Resource | Technology | Throughput | Notes |
|-----------------|--------------------|-----------|-----------|---------|
| AWS EFS (shared) | NFS Server | NFS v4.1/v4.2, kernel NFS or Ganesha | 1–10 GB/s (network-bound) | Simple; SMTP workers mount shared NFS for staging spool |
| AWS EFS (shared) | Ceph CephFS | CephFS CSI driver | Scales with cluster | K8s `ReadWriteMany`; replace EFS 1:1 |
| AWS EFS (shared) | GlusterFS / GlusterFS-CSI | TCP | 1–5 GB/s | Distributed file system; replicated volumes |
| AWS S3 (staging) | MinIO | S3-compatible API | Near line-rate (10 GbE = ~1.25 GB/s) | Drop-in S3 replacement; runs on K8s or bare metal |
| AWS S3 (staging) | Ceph Object Gateway (RGW) | S3/Swift API | Scales with cluster | Enterprise-grade; integrated with Ceph RBD/CephFS |
| Azure Files (standard) | SAMBA / Winbind share | SMB 3.x / CIFS | 1–3 GB/s | Windows-compatible; integrates with AD |

#### 8.5.3 Database Storage — Large Workloads

| Cloud Equivalent | On-Premise Resource | Technology | Max Capacity | Notes |
|-----------------|--------------------|-----------|-----------|---------|
| AWS RDS PostgreSQL | PostgreSQL on bare metal | Direct NVMe or SAN LUN | Disk-bound | Full DBA responsibility; use `pgBackRest` for backups |
| AWS RDS MySQL / MariaDB | MySQL / MariaDB on bare metal | Direct NVMe or SAN LUN | Disk-bound | Percona XtraBackup for hot backups |
| AWS RDS SQL Server | SQL Server on Windows Server | Direct NVMe or SAN (Always On AG) | Disk-bound | SQL Server license required; Windows Server required |
| AWS RDS Oracle | Oracle Database on bare metal | ASM on SAN / NVMe | Disk-bound | Oracle license required; ASM for storage management |
| Azure SQL / Cloud SQL | Self-managed RDBMS cluster | Primary + Replica (streaming replication) | Disk-bound | Patroni + etcd for automated PostgreSQL failover |
| RDS Multi-AZ | Database HA Cluster | Patroni (PG), Galera Cluster (MySQL), SQL Server AG | Disk-bound | Eliminates single point of failure |

**Recommended Database Storage Stack (On-Premise)**:
```
Primary DB Server:
  - NVMe SSD local storage (WAL + data, highest IOPS)
  - Or SAN LUN (FC/iSCSI) on all-flash array for live migration

Backup / Replica Storage:
  - Secondary NVMe or SAS SSD
  - Streaming replication to standby nodes
  - pgBackRest / Barman for point-in-time recovery

Backup Target:
  - NFS / CIFS share on backup server
  - Or MinIO bucket (S3-compatible)
```

#### 8.5.4 Archive Storage

| Cloud Equivalent | On-Premise Resource | Technology | Cost Profile | Notes |
|-----------------|--------------------|-----------|-----------|---------|
| S3 Standard-IA | NAS (NFS/CIFS) on SATA/SAS HDD | Synology NAS, TrueNAS, NetApp ONTAP | Low CapEx, low OpEx | Recent archives (30–90 days); fast retrieval |
| S3 Glacier Instant | High-capacity SATA HDD NAS | Direct-attach JBOD with ZFS or NAS appliance | Very low $/TB | Medium-term archive (90 days – 1 year) |
| S3 Glacier Deep Archive | Tape library | LTO-8/9 tape (IBM, HPE, Quantum) | Lowest $/TB at scale | Long-term compliance archive (1+ years); offline |
| S3 Glacier Deep Archive | Cold JBOD (powered-down HDDs) | MAID (Massive Array of Idle Disks) | Low power, low $/TB | Power-efficient cold storage; slower than tape retrieval |
| S3 Object Lock (WORM) | WORM-certified storage | NetApp SnapLock, Dell EMC DataDomain, Spectra Logic | Compliance licensing | Immutable storage for audit/compliance data |
| S3 Versioning | ZFS snapshots | ZFS on TrueNAS / Proxmox | Storage overhead only | Point-in-time recovery; automatic periodic snapshots |

#### 8.5.5 Additional Drives for Physical / VM Instances

| Cloud Equivalent | On-Premise Resource | Controller / Interface | Notes |
|-----------------|--------------------|-----------------------|-------|
| EBS gp3 (boot) | NVMe SSD (OS drive) | PCIe Gen3/4 NVMe | Boot partition; OS + application binaries |
| EBS gp3 (data) | SATA/SAS SSD (data drive) | AHCI / 12G SAS | General-purpose data; logs, temp storage |
| EBS io2 (high IOPS) | NVMe SSD (dedicated data drive) | PCIe Gen4 NVMe | Database or index volumes requiring high IOPS |
| EBS st1 (throughput) | SATA HDD (7,200 RPM) | AHCI / 12G SAS | Sequential throughput (backups, media, logs) |
| EBS sc1 (cold) | SATA HDD (5,400 RPM) | AHCI / 6G SATA | Cold data, infrequent access |
| Windows EC2 additional data disk | Second HDD/SSD formatted NTFS | Via iSCSI or direct | E:, F: drive for app data |
| Linux EC2 additional data disk | Second HDD/SSD formatted ext4/xfs | Via iSCSI or direct | Mounted at `/data`, `/var/lib/…` |

**RAID Recommendations for On-Premise Drives**:

| RAID Level | Use Case | Redundancy | Performance |
|------------|---------|------------|-------------|
| RAID 1 | OS drives, boot volumes | 1 drive failure | Read ×2, Write ×1 |
| RAID 10 | Database data, high-IOPS workloads | 1 drive per mirror | Read ×N, Write ×1 |
| RAID 5 | General data, NAS | 1 drive failure | Good read, write penalty |
| RAID 6 | Archive NAS, backup | 2 drive failure | Good read, higher write penalty |
| ZFS RAIDZ2 | Recommended for NAS/archive | 2 drive failure | Strong data integrity + compression |

#### 8.5.6 Additional Drives for Pod Deployments (K8s PersistentVolumes)

| Cloud Equivalent | On-Premise CSI / Storage Class | Access Mode | Technology | Notes |
|-----------------|-------------------------------|-------------|-----------|-------|
| AWS EBS gp3 (`ebs-gp3`) | Longhorn (`longhorn`) | `ReadWriteOnce` | Distributed block (iSCSI) | Runs entirely in K8s; replicates data across nodes |
| AWS EBS gp3 (`ebs-gp3`) | OpenEBS Mayastor (`mayastor`) | `ReadWriteOnce` | NVMe-oF / SPDK | Near-bare-metal performance; SPDK user-space I/O |
| AWS EBS gp3 (`ebs-gp3`) | Rook-Ceph RBD (`rook-ceph-block`) | `ReadWriteOnce` | Ceph RADOS Block Device | Enterprise-grade; multi-node replication |
| AWS EBS gp3 (`ebs-gp3`) | Local Path Provisioner | `ReadWriteOnce` | Direct node disk | Fastest; no replication — node loss = data loss |
| AWS EBS gp3 (`ebs-gp3`) | TopoLVM | `ReadWriteOnce` | LVM on local disk | LVM thin-provisioned; node-local; scheduled topology-aware |
| AWS EFS (`efs`) | Rook-Ceph CephFS (`rook-cephfs`) | `ReadWriteMany` | Distributed file system | Full POSIX; replaces EFS; requires Ceph cluster |
| AWS EFS (`efs`) | NFS CSI Driver (`nfs.csi.k8s.io`) | `ReadWriteMany` | NFS v4 | Provision sub-directories of an existing NFS server |
| AWS EFS (`efs`) | GlusterFS CSI | `ReadWriteMany` | GlusterFS | Distributed; replicated; no single server dependency |
| AWS S3 (Mountpoint) | MinIO CSI or S3-compatible mount | `ReadWriteMany` | S3 API | Use `mountpoint-s3` or `goofys` to mount MinIO buckets |
| Azure `managed-premium` | Rook-Ceph RBD (SSD pool) | `ReadWriteOnce` | Ceph on SSD nodes | Mirrors Premium SSD performance on-premise |
| Azure `azurefile` / AWS EFS | NFS CSI + NFS Server | `ReadWriteMany` | NFS v4.1 | Simple shared storage for low-throughput workloads |

---

### 8.6 Secrets Management — Equivalent of AWS Secrets Manager / Azure Key Vault

| Cloud Equivalent | On-Premise Product | Protocol | Notes |
|-----------------|-------------------|----------|---------|
| AWS Secrets Manager | HashiCorp Vault | HTTPS API | Already referenced in ZL-MCDT (`hashicorpVault.js`); dev token: `myroot` |
| AWS Secrets Manager | Infisical (self-hosted) | HTTPS API | Open-source Secrets Manager with K8s operator |
| AWS Secrets Manager | Doppler (on-premise) | HTTPS API | Enterprise secrets platform |
| AWS Secrets Manager | Kubernetes Secrets (encrypted at rest) | K8s API | Native but limited; use with `sealed-secrets` or `external-secrets-operator` |
| AWS Secrets Manager | Bitwarden Secrets Manager (self-hosted) | HTTPS API | Open-source; integrates with CI/CD |
| AWS KMS (key management) | HashiCorp Vault Transit Engine | HTTPS API | Software-defined encryption-as-a-service |
| AWS KMS (key management) | Hardware Security Module (HSM) | PKCS#11 | Thales, Entrust, nCipher; hardware root of trust |

**HashiCorp Vault is the primary on-premise secrets backend** already wired into ZL-MCDT (`hashicorpVault.js.disabled`). Enable it with:
```bash
# Start Vault in production mode (not dev mode)
vault server -config=/etc/vault/config.hcl

# Initialize and unseal
vault operator init
vault operator unseal
```

---

### 8.7 Observability — Equivalent of CloudWatch / Azure Monitor / Cloud Logging

| Cloud Equivalent | On-Premise Stack | Components | Notes |
|-----------------|-----------------|-----------|-------|
| AWS CloudWatch Logs | Grafana Loki + Promtail | Log aggregation + tail agent | Lightweight; K8s-native; pairs with Grafana |
| AWS CloudWatch Logs | ELK Stack (Elasticsearch + Logstash + Kibana) | Full log pipeline | Full-featured; high resource cost |
| AWS CloudWatch Logs | OpenSearch + Fluent Bit | Log pipeline | AWS-compatible; open-source |
| AWS CloudWatch Metrics | Prometheus + Alertmanager | Metrics scraping + alerting | De facto standard for K8s monitoring |
| AWS CloudWatch Metrics | Victoria Metrics | Metrics (Prometheus-compatible) | Lower resource footprint than Prometheus |
| Grafana (cloud) | Grafana (self-hosted) | Dashboards + alerting | Unified dashboards for Prometheus + Loki |
| Amazon Inspector | Trivy / Grype | Container vulnerability scanning | Run as CI step or in-cluster admission webhook |
| Amazon Inspector | Falco | Runtime security (K8s) | Detects anomalous syscall activity in pods |
| AWS X-Ray | Jaeger / Tempo | Distributed tracing | OpenTelemetry-compatible |
| AWS CloudTrail | Falco + audit sink | K8s audit log | Forward K8s audit log to SIEM |
| Uptime monitor | Uptime Kuma / Prometheus Blackbox | Endpoint health checks | Self-hosted status page and alerting |

---

### 8.8 Identity & Access Management — Equivalent of AWS IAM / Azure AD

| Cloud Equivalent | On-Premise Product | Protocol | Notes |
|-----------------|-------------------|----------|---------|
| AWS IAM (users/roles) | Keycloak | OIDC / SAML / LDAP | Open-source IdP; K8s OIDC integration via `--oidc-issuer-url` |
| AWS IAM (users/roles) | Active Directory + AD FS | LDAP / Kerberos / SAML | Already planned in ZL-MCDT AD Auth roadmap (Phases 2–5) |
| AWS IAM (users/roles) | FreeIPA / Red Hat IdM | LDAP / Kerberos | Linux-native LDAP + DNS + CA + Kerberos |
| AWS IAM Roles for Service Accounts (IRSA) | K8s ServiceAccount + Vault K8s Auth | JWT / OIDC | Pods authenticate to Vault using K8s ServiceAccount tokens |
| AWS IAM Access Keys (CI/CD) | GitLab CI variables / Vault AppRole | HTTPS API | Vault AppRole for machine-to-machine auth |
| AWS Resource Tagging / Resource Groups | NetBox (CMDB) | REST API | Source of truth for IP addresses, VLANs, devices, racks |

**AD/LDAP Integration** is already in the ZL-MCDT roadmap (Phases 2–5 of the current enhancement cycle). The `ldapService.js` and `adConfigService.js` services connect directly to on-premise Active Directory or any LDAP v3-compatible directory.

---

### 8.9 CI/CD & Container Build Pipeline — Equivalent of Cloud-Native Pipelines

| Cloud Equivalent | On-Premise Product | Notes |
|-----------------|-------------------|-------|
| AWS CodePipeline / GitHub Actions | Gitea + Gitea Actions | Lightweight; full GitHub-compatible Actions runner |
| AWS CodePipeline / GitHub Actions | GitLab CE (self-hosted) | Full DevOps platform: SCM, CI, registry, secrets |
| AWS CodePipeline / GitHub Actions | Jenkins | Mature; large plugin ecosystem; high operational overhead |
| AWS CodeBuild | Tekton Pipelines | K8s-native CI pipeline; runs builds as pods |
| AWS CodeBuild | Drone CI | Container-first CI; YAML-based pipelines |
| AWS ECR (image build) | Kaniko / Buildah | Docker-daemon-free image builds inside K8s pods |
| GitHub / CodeCommit | Gitea / GitLab CE / Forgejo | Self-hosted Git with issues, PRs, and webhooks |

---

### 8.10 SMTP & Alerting Infrastructure — On-Premise Equivalents

The `alertService.js` uses **nodemailer** for SMTP. On-premise deployments need an outbound mail relay.

| Function | On-Premise Product | Protocol | Notes |
|----------|-------------------|----------|---------|
| SMTP Relay (outbound mail) | Postfix | SMTP | De facto standard Linux MTA; routes to ISP relay or direct MX |
| SMTP Relay (outbound mail) | Haraka | SMTP | Node.js-native SMTP server; pluggable pipeline |
| SMTP Relay (outbound mail) | Microsoft Exchange | SMTP | Enterprise; integrates with AD |
| SMTP Relay (outbound mail) | MailHog / MailPit | SMTP (dev/test) | Captures mail locally; no external delivery; dev environment |
| SMTP Staging Queue Storage | Local NFS mount | NFS v4 | Shared spool directory across SMTP worker pods |
| SMTP Staging Queue Storage | Redis List / Stream | Redis pub/sub | In-memory queue for high-speed small-file staging |
| Slack-equivalent alerts | Mattermost (self-hosted) | Webhook | Open-source Slack replacement; same webhook format |
| Slack-equivalent alerts | Rocket.Chat (self-hosted) | Webhook | Open-source team chat with webhook support |
| HTTP Webhook targets | Prometheus Alertmanager | HTTPS | Routes alerts to Slack/email/PagerDuty/OpsGenie |

---

### 8.11 Backup & Disaster Recovery

| Cloud Equivalent | On-Premise Resource | Tool | Notes |
|-----------------|--------------------|----|-------|
| AWS Backup / RDS automated backups | pgBackRest (PostgreSQL) | pgBackRest | WAL archiving + full/incremental/differential backups |
| AWS Backup / RDS automated backups | Barman (PostgreSQL) | Barman | Backup and recovery manager for PostgreSQL |
| AWS Backup / RDS automated backups | Percona XtraBackup (MySQL) | XtraBackup | Hot backups without downtime |
| S3 bucket versioning | ZFS snapshots | ZFS / TrueNAS | Instant snapshots with minimal space overhead |
| S3 cross-region replication | rsync + SSH / Rclone | rclone | Sync to offsite NAS or secondary data center |
| Multi-AZ RDS | Patroni (PostgreSQL HA) | Patroni + etcd/Consul | Automated failover with leader election |
| Multi-AZ RDS | Galera Cluster (MySQL/MariaDB) | Galera | Synchronous multi-master replication |
| Multi-AZ RDS | SQL Server Always On AG | WSFC + AG | Windows Server Failover Cluster + Availability Groups |
| K8s etcd (control plane) | etcd backup via `etcdctl snapshot` | cron job | Backup etcd every 6 hours to external storage |
| Velero (K8s backup) | Velero + MinIO backend | S3 API | Backs up K8s resources + PV data to MinIO |

---

### 8.12 On-Premise Infrastructure Summary

| Category | Cloud (AWS Full) | On-Premise Equivalent | Primary Tools |
|----------|-----------------|----------------------|---------------|
| **Compute (K8s Nodes)** | EKS Managed Node Group | Bare-metal / VMware / KVM / Proxmox | kubeadm, k3s, RKE2, Talos |
| **Compute (VMs)** | EC2 (multi-OS) | Physical server or VM guest | VMware vSphere, KVM, Hyper-V |
| **Networking** | VPC + Subnets + SGs + NAT + IGW | VLANs + Firewall + Router + NFS | pfSense, OPNsense, Cisco, Fortinet |
| **DNS** | Route 53 | Internal DNS server | BIND, PowerDNS, Windows DNS |
| **Load Balancer** | ALB Controller / App Gateway | MetalLB + NGINX Ingress | MetalLB (L2/BGP), HAProxy, Traefik |
| **Container Registry** | ECR / ACR / Artifact Registry | Harbor | Harbor (Trivy scanning) |
| **Index Storage (high-speed)** | EBS gp3 / io2 CSI | Local NVMe, SAN, Rook-Ceph RBD | Longhorn, Rook-Ceph, OpenEBS Mayastor |
| **Staging Queue Storage** | EFS / S3 | NFS Server, CephFS, MinIO | Rook-CephFS, NFS CSI, MinIO |
| **Database Storage** | RDS (PostgreSQL / MySQL / SQL Server / Oracle) | Bare-metal DB + SAN LUN | PostgreSQL + Patroni, MySQL + Galera |
| **Archive Storage** | S3 Glacier / Deep Archive | NAS HDD + LTO Tape | TrueNAS, ZFS RAIDZ2, LTO-8/9 |
| **Block Storage (EC2)** | EBS (gp2/gp3/io1/io2/st1/sc1) | Local NVMe, SATA SSD/HDD | Direct-attach + RAID |
| **Block Storage (Pods)** | EBS CSI + StorageClass | Longhorn, Rook-Ceph RBD, TopoLVM | K8s CSI drivers |
| **Shared Storage (Pods)** | EFS CSI / Azure Files | Rook-CephFS, NFS CSI | K8s CSI ReadWriteMany |
| **Object Storage** | S3 / GCS / Spaces | MinIO, Ceph RGW | S3-compatible APIs |
| **Secrets Management** | Secrets Manager / Key Vault | HashiCorp Vault | Vault (already in ZL-MCDT) |
| **Identity / IAM** | AWS IAM / Azure AD | Active Directory, Keycloak, FreeIPA | LDAP (already in roadmap Phase 2–5) |
| **TLS Certificates** | ACM / App Gateway SSL / GCP Managed | cert-manager + Let's Encrypt or internal CA | cert-manager, CFSSL, HashiCorp Vault PKI |
| **Monitoring / Metrics** | CloudWatch / Azure Monitor | Prometheus + Grafana | Prometheus, Grafana, Alertmanager |
| **Log Aggregation** | CloudWatch Logs / Cloud Logging | Grafana Loki or ELK | Loki + Promtail, Elasticsearch |
| **Security Scanning** | Inspector v2 / Defender | Trivy + Falco | Harbor (Trivy), Falco |
| **Backup / DR** | AWS Backup / RDS Multi-AZ | pgBackRest, Patroni, Velero + MinIO | pgBackRest, Velero |
| **SMTP Relay** | SES / SendGrid | Postfix / Haraka | nodemailer → Postfix |
| **CI/CD** | CodePipeline / GitHub Actions | Gitea + Actions, GitLab CE | Gitea, GitLab, Jenkins, Tekton |
| **CMDB / IP Management** | Resource Groups / Tags | NetBox | NetBox (IP, VLAN, rack, device tracking) |

---

*This document reflects the infrastructure defined in Terraform modules, Kubernetes manifests, docker-compose configuration, and backend service code as of 2026-03-03 (updated 2026-03-04). All 5 cloud providers (AWS, Azure, GCP, DigitalOcean, Linode) now have full parity across the 5 mandatory infrastructure categories (Networking, Storage, Kubernetes, Container Registry, Database). Eight new Terraform modules were built: `azure_vnet`, `azure_db`, `azure_storage`, `gcp_vpc`, `gcp_db`, `gcp_filestore`, `do_db`, `linode_db`. All modules are wired into their respective environment entry points (`terraform/environments/{provider}/main.tf`), with backend variable generation updated in `multiCloudOrchestrator.js` and frontend wizard labels updated for provider-aware terminology. The on-premise section defines equivalent self-hosted infrastructure for air-gapped, regulated, or data-sovereignty environments.*
