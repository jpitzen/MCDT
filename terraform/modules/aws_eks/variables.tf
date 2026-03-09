# Input variables for AWS EKS module

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.34"
}

variable "subnets" {
  description = "List of subnet IDs for the EKS cluster and node groups"
  type        = list(string)
}

variable "node_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 2
}

variable "min_node_count" {
  description = "Minimum number of nodes for autoscaling"
  type        = number
  default     = 1
}

variable "max_node_count" {
  description = "Maximum number of nodes for autoscaling"
  type        = number
  default     = 5
}

variable "enable_autoscaling" {
  description = "Enable cluster autoscaling"
  type        = bool
  default     = false
}

variable "node_instance_type" {
  description = "EC2 instance type for worker nodes"
  type        = string
  default     = "t3.medium"
}

variable "enable_monitoring" {
  description = "Enable enhanced monitoring"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable control plane logging"
  type        = bool
  default     = true
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# =============================================================================
# Private Cluster Configuration
# =============================================================================

variable "endpoint_public_access" {
  description = "Enable public access to EKS API endpoint"
  type        = bool
  default     = true
}

variable "endpoint_private_access" {
  description = "Enable private access to EKS API endpoint"
  type        = bool
  default     = true
}

# =============================================================================
# CSI Driver Configuration
# =============================================================================

variable "enable_ebs_csi_driver" {
  description = "Enable EBS CSI driver EKS addon"
  type        = bool
  default     = true
}

variable "enable_efs_csi_driver" {
  description = "Enable EFS CSI driver EKS addon"
  type        = bool
  default     = false
}

variable "ebs_csi_driver_version" {
  description = "Version of EBS CSI driver addon (leave empty for latest)"
  type        = string
  default     = ""
}

variable "efs_csi_driver_version" {
  description = "Version of EFS CSI driver addon (leave empty for latest)"
  type        = string
  default     = ""
}

# =============================================================================
# Cluster Autoscaler Configuration
# =============================================================================

variable "enable_cluster_autoscaler" {
  description = "Enable cluster autoscaler IAM role and ASG tags"
  type        = bool
  default     = false
}

variable "autoscaler_namespace" {
  description = "Kubernetes namespace for cluster autoscaler"
  type        = string
  default     = "kube-system"
}

variable "autoscaler_service_account" {
  description = "Kubernetes service account name for cluster autoscaler"
  type        = string
  default     = "cluster-autoscaler"
}

# =============================================================================
# Storage Class Configuration
# =============================================================================

variable "create_storage_classes" {
  description = "Create Kubernetes StorageClasses for EBS and EFS"
  type        = bool
  default     = true
}

variable "ebs_default_storage_class" {
  description = "Set EBS StorageClass as the default"
  type        = bool
  default     = true
}
