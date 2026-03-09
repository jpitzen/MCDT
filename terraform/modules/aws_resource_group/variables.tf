# AWS Resource Group Module - Variables

variable "resource_group_name" {
  description = "Name of the AWS Resource Group"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9-_]+$", var.resource_group_name))
    error_message = "Resource group name must contain only alphanumeric characters, hyphens, and underscores."
  }
}

variable "description" {
  description = "Description of the AWS Resource Group"
  type        = string
  default     = "Managed by ZLAWS Automated EKS Deployer"
}

variable "environment" {
  description = "Environment (dev/development, staging, prod/production)"
  type        = string
  default     = "development"

  validation {
    condition     = contains(["dev", "development", "staging", "stag", "prod", "production"], var.environment)
    error_message = "Environment must be one of: dev, development, staging, stag, prod, production."
  }
}

variable "cost_center" {
  description = "Cost center for resource tagging"
  type        = string
  default     = ""
}

variable "project" {
  description = "Project name for resource tagging"
  type        = string
  default     = ""
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
