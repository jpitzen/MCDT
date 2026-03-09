variable "environment" {
  type        = string
  description = "Environment name (dev/development, staging, prod/production)"
  default     = "development"
}

# ============================================================================
# Resource Group Variables
# ============================================================================

variable "create_resource_group" {
  type        = bool
  description = "Whether to create an AWS Resource Group for organizing resources. Disabled by default as it requires IAM permission: resource-groups:CreateGroup"
  default     = false
}

variable "resource_group_name" {
  type        = string
  description = "Name of the AWS Resource Group (defaults to cluster_name if empty)"
  default     = ""
}

variable "resource_group_description" {
  type        = string
  description = "Description of the AWS Resource Group"
  default     = "Managed by ZLAWS Automated EKS Deployer"
}

variable "cost_center" {
  type        = string
  description = "Cost center for resource tagging"
  default     = ""
}

variable "project" {
  type        = string
  description = "Project name for resource tagging"
  default     = ""
}

variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "cluster_name" {
  type        = string
  description = "Name of the Kubernetes cluster"
}

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version"
  default     = "1.34"
}

variable "node_count" {
  type        = number
  description = "Number of nodes"
  default     = 3
}

variable "min_node_count" {
  type        = number
  description = "Minimum number of nodes"
  default     = 1
}

variable "max_node_count" {
  type        = number
  description = "Maximum number of nodes"
  default     = 5
}

variable "enable_autoscaling" {
  type        = bool
  description = "Enable autoscaling"
  default     = true
}

variable "node_instance_type" {
  type        = string
  description = "EC2 instance type for nodes"
  default     = "t3.medium"
}

variable "enable_monitoring" {
  type        = bool
  description = "Enable CloudWatch monitoring"
  default     = true
}

variable "enable_logging" {
  type        = bool
  description = "Enable CloudWatch logging"
  default     = true
}

# =============================================================================
# Private Cluster Variables
# =============================================================================

variable "endpoint_public_access" {
  type        = bool
  description = "Enable public access to EKS API endpoint"
  default     = true
}

variable "endpoint_private_access" {
  type        = bool
  description = "Enable private access to EKS API endpoint"
  default     = true
}

# =============================================================================
# CSI Driver Variables
# =============================================================================

variable "enable_ebs_csi_driver" {
  type        = bool
  description = "Enable EBS CSI driver EKS addon for persistent volumes"
  default     = true
}

variable "enable_efs_csi_driver" {
  type        = bool
  description = "Enable EFS CSI driver EKS addon for shared file storage"
  default     = false
}

variable "ebs_csi_driver_version" {
  type        = string
  description = "Version of EBS CSI driver addon (leave empty for latest)"
  default     = ""
}

variable "efs_csi_driver_version" {
  type        = string
  description = "Version of EFS CSI driver addon (leave empty for latest)"
  default     = ""
}

# =============================================================================
# Cluster Autoscaler Variables
# =============================================================================

variable "enable_cluster_autoscaler" {
  type        = bool
  description = "Enable cluster autoscaler IAM role and ASG tags"
  default     = false
}

variable "autoscaler_namespace" {
  type        = string
  description = "Kubernetes namespace for cluster autoscaler"
  default     = "kube-system"
}

variable "autoscaler_service_account" {
  type        = string
  description = "Kubernetes service account name for cluster autoscaler"
  default     = "cluster-autoscaler"
}

variable "aws_vpc_cidr" {
  type        = string
  description = "VPC CIDR block"
  default     = "10.0.0.0/16"
}

variable "aws_subnets" {
  type        = list(string)
  description = "Subnet IDs (leave empty to create new VPC)"
  default     = []
}

variable "aws_availability_zones" {
  type        = list(string)
  description = "Availability zones for subnets"
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "create_vpc" {
  type        = bool
  description = "Whether to create a new VPC"
  default     = true
}

variable "common_tags" {
  type        = map(string)
  description = "Common tags for all resources"
  default     = {}
}

variable "vpc_id" {
  type        = string
  description = "Existing VPC ID (required if create_vpc is false)"
  default     = ""
}

variable "vpc_cidr" {
  type        = string
  description = "Existing VPC CIDR (required if create_vpc is false)"
  default     = ""
}

# =============================================================================
# RDS Variables
# =============================================================================

variable "enable_rds" {
  type        = bool
  description = "Enable RDS database deployment"
  default     = false
}

variable "db_engine" {
  type        = string
  description = "Database engine (postgres, mysql, mariadb, sqlserver-ex, sqlserver-se, oracle-se2)"
  default     = "postgres"
}

variable "db_version" {
  type        = string
  description = "Database engine version"
  default     = ""
}

variable "db_instance_class" {
  type        = string
  description = "RDS instance class"
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  type        = number
  description = "Allocated storage in GB"
  default     = 20
}

variable "db_storage_type" {
  type        = string
  description = "Storage type (gp2, gp3, io1)"
  default     = "gp3"
}

variable "db_identifier" {
  type        = string
  description = "RDS instance identifier (optional, defaults to cluster_name-db)"
  default     = ""
}

variable "db_name" {
  type        = string
  description = "Database name"
  default     = "main"
}

variable "db_username" {
  type        = string
  description = "Master username"
  default     = "dbadmin"
}

variable "db_password" {
  type        = string
  description = "Master password (leave empty to auto-generate)"
  default     = ""
  sensitive   = true
}

variable "db_port" {
  type        = number
  description = "Database port (0 for default)"
  default     = 0
}

variable "db_multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment"
  default     = false
}

variable "db_backup_retention_days" {
  type        = number
  description = "Backup retention period in days"
  default     = 7
}

variable "db_backup_window" {
  type        = string
  description = "Preferred backup window"
  default     = "03:00-04:00"
}

variable "db_maintenance_window" {
  type        = string
  description = "Preferred maintenance window"
  default     = "sun:04:00-sun:05:00"
}

variable "db_enable_enhanced_monitoring" {
  type        = bool
  description = "Enable enhanced monitoring"
  default     = false
}

variable "db_enable_performance_insights" {
  type        = bool
  description = "Enable Performance Insights"
  default     = false
}

variable "db_enable_cloudwatch_logs" {
  type        = bool
  description = "Enable CloudWatch log exports"
  default     = false
}

variable "db_cloudwatch_log_exports" {
  type        = list(string)
  description = "List of log types to export"
  default     = []
}

variable "db_deletion_protection" {
  type        = bool
  description = "Enable deletion protection"
  default     = false
}

variable "db_skip_final_snapshot" {
  type        = bool
  description = "Skip final snapshot on deletion"
  default     = true
}

variable "db_store_password_in_secrets_manager" {
  type        = bool
  description = "Store password in Secrets Manager"
  default     = true
}

# =============================================================================
# EC2 Variables
# =============================================================================

variable "enable_additional_vms" {
  type        = bool
  description = "Enable additional VM deployment"
  default     = false
}

variable "vm_count" {
  type        = number
  description = "Number of VMs to create"
  default     = 1
}

variable "vm_base_name" {
  type        = string
  description = "Base name for VMs (e.g., 'zlps-adt-app' will create zlps-adt-app-01, zlps-adt-app-02, etc.)"
  default     = ""
}

variable "vm_instance_type" {
  type        = string
  description = "EC2 instance type"
  default     = "t3.medium"
}

variable "vm_operating_system" {
  type        = string
  description = "Operating system"
  default     = "Amazon Linux 2"
}

variable "vm_create_key_pair" {
  type        = bool
  description = "Create new SSH key pair"
  default     = true
}

variable "vm_existing_key_name" {
  type        = string
  description = "Existing key pair name"
  default     = ""
}

variable "vm_store_key_in_secrets_manager" {
  type        = bool
  description = "Store private key in Secrets Manager"
  default     = true
}

variable "vm_windows_admin_password" {
  type        = string
  description = "Windows admin password"
  default     = ""
  sensitive   = true
}

variable "vm_store_password_in_secrets_manager" {
  type        = bool
  description = "Store Windows password in Secrets Manager"
  default     = true
}

variable "vm_windows_user_data_script" {
  type        = string
  description = "Additional Windows user data script"
  default     = ""
}

variable "vm_linux_user_data_script" {
  type        = string
  description = "Additional Linux user data script"
  default     = ""
}

variable "vm_root_volume_type" {
  type        = string
  description = "Root volume type"
  default     = "gp3"
}

variable "vm_root_volume_size" {
  type        = number
  description = "Root volume size in GB"
  default     = 50
}

variable "vm_additional_ebs_volumes" {
  type = list(object({
    device_name = string
    volume_type = string
    volume_size = number
  }))
  description = "Additional EBS volumes"
  default     = []
}

variable "vm_allow_rdp" {
  type        = bool
  description = "Allow RDP access"
  default     = true
}

variable "vm_rdp_cidr_blocks" {
  type        = list(string)
  description = "CIDR blocks for RDP access"
  default     = ["0.0.0.0/0"]
}

variable "vm_allow_ssh" {
  type        = bool
  description = "Allow SSH access"
  default     = true
}

variable "vm_ssh_cidr_blocks" {
  type        = list(string)
  description = "CIDR blocks for SSH access"
  default     = ["0.0.0.0/0"]
}

variable "vm_custom_ingress_rules" {
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  description = "Custom ingress rules"
  default     = []
}

# =============================================================================
# S3 Variables
# =============================================================================

variable "enable_object_storage" {
  type        = bool
  description = "Enable S3 bucket deployment"
  default     = false
}

variable "object_storage_bucket" {
  type        = string
  description = "S3 bucket name"
  default     = ""
}

variable "s3_force_destroy" {
  type        = bool
  description = "Allow bucket deletion when not empty"
  default     = false
}

variable "s3_enable_versioning" {
  type        = bool
  description = "Enable versioning"
  default     = false
}

variable "s3_encryption_type" {
  type        = string
  description = "Encryption type (AES256 or aws:kms)"
  default     = "AES256"
}

variable "s3_kms_key_id" {
  type        = string
  description = "KMS key ID for encryption"
  default     = ""
}

variable "s3_block_public_access" {
  type        = bool
  description = "Block public access"
  default     = true
}

variable "s3_allow_eks_access" {
  type        = bool
  description = "Allow EKS access"
  default     = true
}

variable "s3_lifecycle_rules" {
  type        = list(any)
  description = "Lifecycle rules"
  default     = []
}

variable "s3_cors_rules" {
  type        = list(any)
  description = "CORS rules"
  default     = []
}

variable "s3_enable_logging" {
  type        = bool
  description = "Enable access logging"
  default     = false
}

variable "s3_logging_target_bucket" {
  type        = string
  description = "Target bucket for logs"
  default     = ""
}

variable "s3_logging_target_prefix" {
  type        = string
  description = "Prefix for log objects"
  default     = "logs/"
}

variable "s3_enable_object_lock" {
  type        = bool
  description = "Enable object lock"
  default     = false
}

variable "s3_object_lock_mode" {
  type        = string
  description = "Object lock mode"
  default     = "GOVERNANCE"
}

variable "s3_object_lock_retention_days" {
  type        = number
  description = "Retention period in days"
  default     = 365
}

variable "s3_enable_replication" {
  type        = bool
  description = "Enable cross-region replication"
  default     = false
}

variable "s3_replication_destination_bucket_arn" {
  type        = string
  description = "Destination bucket ARN"
  default     = ""
}

variable "s3_replication_storage_class" {
  type        = string
  description = "Replication storage class"
  default     = "STANDARD"
}

# =============================================================================
# EFS Variables
# =============================================================================

variable "enable_file_storage" {
  type        = bool
  description = "Enable EFS deployment"
  default     = false
}

variable "efs_name" {
  type        = string
  description = "EFS file system name (optional, defaults to cluster_name-efs)"
  default     = ""
}

variable "efs_performance_mode" {
  type        = string
  description = "Performance mode (generalPurpose or maxIO)"
  default     = "generalPurpose"
}

variable "efs_throughput_mode" {
  type        = string
  description = "Throughput mode (bursting, provisioned, or elastic)"
  default     = "bursting"
}

variable "efs_provisioned_throughput_in_mibps" {
  type        = number
  description = "Provisioned throughput in MiB/s"
  default     = null
}

variable "efs_kms_key_id" {
  type        = string
  description = "KMS key ID for encryption"
  default     = ""
}

variable "efs_transition_to_ia_days" {
  type        = number
  description = "Days to transition to IA"
  default     = null
}

variable "efs_transition_to_archive_days" {
  type        = number
  description = "Days to transition to Archive"
  default     = null
}

variable "efs_enable_automatic_backups" {
  type        = bool
  description = "Enable automatic backups"
  default     = true
}

variable "efs_access_points" {
  type        = list(any)
  description = "EFS access points"
  default     = []
}

variable "efs_create_csi_policy" {
  type        = bool
  description = "Create EFS CSI driver policy"
  default     = true
}

variable "efs_file_system_policy" {
  type        = string
  description = "File system policy JSON"
  default     = ""
}

# =============================================================================
# ECR Variables
# =============================================================================

variable "ecr_repository_name" {
  type        = string
  description = "ECR repository name (empty for cluster name)"
  default     = ""
}

variable "ecr_image_tag_mutability" {
  type        = string
  description = "Tag mutability (MUTABLE or IMMUTABLE)"
  default     = "MUTABLE"
}

variable "ecr_scan_on_push" {
  type        = bool
  description = "Enable scan on push"
  default     = true
}

variable "ecr_enable_scan_logging" {
  type        = bool
  description = "Enable scan logging"
  default     = false
}

variable "ecr_scan_log_retention_days" {
  type        = number
  description = "Scan log retention days"
  default     = 7
}

variable "ecr_encryption_type" {
  type        = string
  description = "Encryption type (AES256 or KMS)"
  default     = "AES256"
}

variable "ecr_kms_key_id" {
  type        = string
  description = "KMS key ID for encryption"
  default     = ""
}

variable "ecr_enable_lifecycle_policy" {
  type        = bool
  description = "Enable lifecycle policy"
  default     = true
}

variable "ecr_lifecycle_policy_json" {
  type        = string
  description = "Custom lifecycle policy JSON"
  default     = ""
}

variable "ecr_keep_last_n_images" {
  type        = number
  description = "Number of images to keep"
  default     = 30
}

variable "ecr_untagged_image_retention_days" {
  type        = number
  description = "Days to retain untagged images"
  default     = 7
}

variable "ecr_repository_policy_json" {
  type        = string
  description = "Custom repository policy JSON"
  default     = ""
}

variable "ecr_allow_eks_access" {
  type        = bool
  description = "Allow EKS access"
  default     = true
}

variable "ecr_enable_replication" {
  type        = bool
  description = "Enable replication"
  default     = false
}

variable "ecr_replication_destinations" {
  type        = list(any)
  description = "Replication destinations"
  default     = []
}

variable "ecr_pull_through_cache_rules" {
  type        = map(any)
  description = "Pull through cache rules"
  default     = {}
}

variable "ecr_create_access_policy" {
  type        = bool
  description = "Create ECR access policy"
  default     = true
}

# Placeholder variables for other providers (for module compatibility)
variable "azure_location" {
  type    = string
  default = ""
}

variable "azure_resource_group" {
  type    = string
  default = ""
}

variable "gcp_project_id" {
  type    = string
  default = ""
}

variable "do_region" {
  type    = string
  default = ""
}

variable "linode_region" {
  type    = string
  default = ""
}
