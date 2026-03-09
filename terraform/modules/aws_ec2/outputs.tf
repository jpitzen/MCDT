output "instance_ids" {
  description = "IDs of EC2 instances"
  value       = aws_instance.vms[*].id
}

output "instance_arns" {
  description = "ARNs of EC2 instances"
  value       = aws_instance.vms[*].arn
}

output "instance_private_ips" {
  description = "Private IP addresses of EC2 instances"
  value       = aws_instance.vms[*].private_ip
}

output "instance_public_ips" {
  description = "Public IP addresses of EC2 instances (if assigned)"
  value       = aws_instance.vms[*].public_ip
}

output "instance_private_dns" {
  description = "Private DNS names of EC2 instances"
  value       = aws_instance.vms[*].private_dns
}

output "instance_public_dns" {
  description = "Public DNS names of EC2 instances (if assigned)"
  value       = aws_instance.vms[*].public_dns
}

output "security_group_id" {
  description = "ID of the EC2 security group"
  value       = aws_security_group.ec2.id
}

output "iam_role_name" {
  description = "Name of the IAM role attached to instances"
  value       = aws_iam_role.ec2.name
}

output "iam_role_arn" {
  description = "ARN of the IAM role attached to instances"
  value       = aws_iam_role.ec2.arn
}

output "key_pair_name" {
  description = "Name of the SSH key pair"
  value       = var.create_key_pair ? aws_key_pair.ec2_key[0].key_name : var.existing_key_name
}

output "private_key_pem" {
  description = "Private key in PEM format (if created)"
  value       = var.create_key_pair ? tls_private_key.ec2_key[0].private_key_pem : null
  sensitive   = true
}

output "windows_admin_password" {
  description = "Windows Administrator password (generated if not provided)"
  value       = startswith(var.vm_operating_system, "Windows") ? (var.windows_admin_password != "" ? var.windows_admin_password : random_password.windows_password.result) : null
  sensitive   = true
}

output "private_key_secret_arn" {
  description = "ARN of the Secrets Manager secret storing private key (if enabled)"
  value       = var.create_key_pair && var.store_key_in_secrets_manager ? aws_secretsmanager_secret.ec2_private_key[0].arn : null
}

output "windows_password_secret_arn" {
  description = "ARN of the Secrets Manager secret storing Windows password (if enabled)"
  value       = startswith(var.vm_operating_system, "Windows") && var.store_password_in_secrets_manager ? aws_secretsmanager_secret.windows_password[0].arn : null
}

output "instance_details" {
  description = "Detailed information about all instances"
  value = [
    for i, instance in aws_instance.vms : {
      id          = instance.id
      name        = "${var.cluster_name}-vm-${i + 1}"
      private_ip  = instance.private_ip
      public_ip   = instance.public_ip
      private_dns = instance.private_dns
      az          = instance.availability_zone
      os          = var.vm_operating_system
    }
  ]
}
