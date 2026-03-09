variable "cluster_name" {
  description = "Name of the cluster (used for resource naming)"
  type        = string
}

variable "db_identifier" {
  description = "Identifier for the RDS instance (if empty, uses cluster_name-db)"
  type        = string
  default     = ""
}

variable "vpc_id" {
  description = "ID of the VPC where RDS will be deployed"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block of the VPC for security group rules"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the DB subnet group"
  type        = list(string)
}

# Database Engine Configuration
variable "db_engine" {
  description = "Database engine type (postgres, mysql, mariadb, sqlserver-ex, sqlserver-se, sqlserver-ee, sqlserver-web, oracle-se2, oracle-ee)"
  type        = string
  default     = "postgres"
}

variable "db_version" {
  description = "Database engine version"
  type        = string
  default     = ""
}

variable "db_instance_class" {
  description = "Instance class for the RDS instance"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_storage_type" {
  description = "Storage type (gp2, gp3, io1)"
  type        = string
  default     = "gp3"
}

# Database Configuration
variable "db_name" {
  description = "Name of the database to create (not applicable for SQL Server)"
  type        = string
  default     = "main"
}

variable "db_username" {
  description = "Master username for the database"
  type        = string
  default     = "dbadmin"
}

variable "db_password" {
  description = "Master password for the database (leave empty to auto-generate)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "db_port" {
  description = "Port for database connections (leave 0 for default)"
  type        = number
  default     = 0
}

# High Availability
variable "db_multi_az" {
  description = "Enable Multi-AZ deployment for high availability"
  type        = bool
  default     = false
}

# Backup Configuration
variable "db_backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "db_backup_window" {
  description = "Preferred backup window (UTC)"
  type        = string
  default     = "03:00-04:00"
}

variable "db_maintenance_window" {
  description = "Preferred maintenance window (UTC)"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

# Monitoring
variable "enable_enhanced_monitoring" {
  description = "Enable enhanced monitoring"
  type        = bool
  default     = false
}

variable "enable_performance_insights" {
  description = "Enable Performance Insights"
  type        = bool
  default     = false
}

variable "enable_cloudwatch_logs" {
  description = "Enable CloudWatch log exports"
  type        = bool
  default     = false
}

variable "db_cloudwatch_log_exports" {
  description = "List of log types to export to CloudWatch (varies by engine)"
  type        = list(string)
  default     = []
}

# Deletion Protection
variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot on deletion (not recommended for production)"
  type        = bool
  default     = true
}

# Secrets Management
variable "store_password_in_secrets_manager" {
  description = "Store database credentials in AWS Secrets Manager"
  type        = bool
  default     = true
}

# Tags
variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
