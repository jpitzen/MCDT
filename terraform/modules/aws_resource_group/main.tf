# AWS Resource Group Module
# Creates an AWS Resource Group to organize and manage related AWS resources
# This module should be applied FIRST before other resources
#
# NOTE: AWS provider does not have a data source for resource groups,
# so we use lifecycle rules to handle re-deployments gracefully.

resource "aws_resourcegroups_group" "deployment" {
  name        = var.resource_group_name
  description = var.description

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [
        {
          Key    = "zlaws:ResourceGroup"
          Values = [var.resource_group_name]
        }
      ]
    })
  }

  tags = merge(var.common_tags, {
    "zlaws:ResourceGroup" = var.resource_group_name
    "zlaws:Environment"   = var.environment
    "zlaws:CostCenter"    = var.cost_center
    "zlaws:Project"       = var.project
    "zlaws:ManagedBy"     = "zlaws-automated-deployer"
  })

  lifecycle {
    # Ignore changes to tags to prevent unnecessary updates
    ignore_changes = [tags]
    # If resource already exists, Terraform will import it
    create_before_destroy = true
  }
}

# Locals for output
locals {
  resource_group_arn  = aws_resourcegroups_group.deployment.arn
  resource_group_name = aws_resourcegroups_group.deployment.name
}
