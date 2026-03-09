variable "cluster_name" {
  description = "Name of the cluster (used for resource naming)"
  type        = string
}

variable "vm_base_name" {
  description = "Base name for EC2 instances (will be suffixed with -01, -02, etc.)"
  type        = string
  default     = ""
}

variable "vpc_id" {
  description = "ID of the VPC where EC2 instances will be deployed"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block of the VPC for security group rules"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs where EC2 instances will be deployed"
  type        = list(string)
}

# Instance Configuration
variable "vm_count" {
  description = "Number of EC2 instances to create"
  type        = number
  default     = 1
}

variable "vm_instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "vm_operating_system" {
  description = "Operating system for the instances (Windows Server 2022 Datacenter, Windows Server 2019 Datacenter, Windows Server 2016 Datacenter, Amazon Linux 2, Ubuntu 22.04 LTS, Ubuntu 20.04 LTS)"
  type        = string
  default     = "Amazon Linux 2"
}

# Key Pair Configuration
variable "create_key_pair" {
  description = "Create a new SSH key pair"
  type        = bool
  default     = true
}

variable "existing_key_name" {
  description = "Name of existing key pair to use (if create_key_pair is false)"
  type        = string
  default     = ""
}

variable "store_key_in_secrets_manager" {
  description = "Store private key in AWS Secrets Manager"
  type        = bool
  default     = true
}

# Windows Configuration
variable "windows_admin_password" {
  description = "Administrator password for Windows instances (leave empty to auto-generate)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "store_password_in_secrets_manager" {
  description = "Store Windows password in AWS Secrets Manager"
  type        = bool
  default     = true
}

variable "windows_user_data_script" {
  description = "Additional PowerShell script to run on Windows instances"
  type        = string
  default     = ""
}

# Linux Configuration
variable "linux_user_data_script" {
  description = "Additional bash script to run on Linux instances"
  type        = string
  default     = ""
}

# Storage Configuration
variable "root_volume_type" {
  description = "Root volume type (gp2, gp3, io1, io2)"
  type        = string
  default     = "gp3"
}

variable "root_volume_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 50
}

variable "additional_ebs_volumes" {
  description = "List of additional EBS volumes to attach"
  type = list(object({
    device_name = string
    volume_type = string
    volume_size = number
  }))
  default = []
}

# Network Security
variable "allow_rdp" {
  description = "Allow RDP access to Windows instances"
  type        = bool
  default     = true
}

variable "rdp_cidr_blocks" {
  description = "CIDR blocks allowed for RDP access"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "allow_ssh" {
  description = "Allow SSH access to Linux instances"
  type        = bool
  default     = true
}

variable "ssh_cidr_blocks" {
  description = "CIDR blocks allowed for SSH access"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "custom_ingress_rules" {
  description = "Custom ingress rules"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = []
}

# Tags
variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
