output "file_system_id" {
  description = "ID of the EFS file system"
  value       = aws_efs_file_system.main.id
}

output "file_system_arn" {
  description = "ARN of the EFS file system"
  value       = aws_efs_file_system.main.arn
}

output "file_system_dns_name" {
  description = "DNS name of the EFS file system"
  value       = aws_efs_file_system.main.dns_name
}

output "mount_target_ids" {
  description = "IDs of the EFS mount targets"
  value       = aws_efs_mount_target.main[*].id
}

output "mount_target_dns_names" {
  description = "DNS names of the EFS mount targets"
  value       = aws_efs_mount_target.main[*].dns_name
}

output "mount_target_ips" {
  description = "IP addresses of the EFS mount targets"
  value       = aws_efs_mount_target.main[*].ip_address
}

output "security_group_id" {
  description = "ID of the EFS security group"
  value       = aws_security_group.efs.id
}

output "access_point_ids" {
  description = "IDs of the EFS access points"
  value       = aws_efs_access_point.main[*].id
}

output "access_point_arns" {
  description = "ARNs of the EFS access points"
  value       = aws_efs_access_point.main[*].arn
}

output "efs_csi_policy_arn" {
  description = "ARN of the EFS CSI driver IAM policy (if created)"
  value       = var.create_efs_csi_policy ? aws_iam_policy.efs_csi[0].arn : null
}

output "mount_command" {
  description = "Example mount command for Linux instances"
  value       = "sudo mount -t nfs4 -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport ${aws_efs_file_system.main.dns_name}:/ /mnt/efs"
}

output "performance_mode" {
  description = "Performance mode of the file system"
  value       = aws_efs_file_system.main.performance_mode
}

output "throughput_mode" {
  description = "Throughput mode of the file system"
  value       = aws_efs_file_system.main.throughput_mode
}

output "encrypted" {
  description = "Whether the file system is encrypted"
  value       = aws_efs_file_system.main.encrypted
}
