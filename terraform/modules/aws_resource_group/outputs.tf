# AWS Resource Group Module - Outputs

output "resource_group_arn" {
  description = "ARN of the AWS Resource Group"
  value       = local.resource_group_arn
}

output "resource_group_name" {
  description = "Name of the AWS Resource Group"
  value       = local.resource_group_name
}

output "resource_group_id" {
  description = "ID of the AWS Resource Group"
  value       = aws_resourcegroups_group.deployment.id
}

output "resource_group_tag" {
  description = "Tag key-value pair to apply to resources for group membership"
  value = {
    key   = "zlaws:ResourceGroup"
    value = var.resource_group_name
  }
}
