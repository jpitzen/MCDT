output "bucket_id" {
  description = "ID of the S3 bucket"
  value       = aws_s3_bucket.main.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.main.arn
}

output "bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.main.bucket
}

output "bucket_domain_name" {
  description = "Domain name of the bucket"
  value       = aws_s3_bucket.main.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "Regional domain name of the bucket"
  value       = aws_s3_bucket.main.bucket_regional_domain_name
}

output "bucket_region" {
  description = "AWS region where the bucket is located"
  value       = aws_s3_bucket.main.region
}

output "versioning_enabled" {
  description = "Whether versioning is enabled"
  value       = var.enable_versioning
}

output "encryption_type" {
  description = "Type of encryption used"
  value       = var.encryption_type
}

output "replication_role_arn" {
  description = "ARN of the replication IAM role (if enabled)"
  value       = var.enable_replication ? aws_iam_role.replication[0].arn : null
}
