output "repository_arn" {
  description = "ARN of the ECR repository"
  value       = aws_ecr_repository.main.arn
}

output "repository_name" {
  description = "Name of the ECR repository"
  value       = aws_ecr_repository.main.name
}

output "repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.main.repository_url
}

output "repository_registry_id" {
  description = "Registry ID where the repository was created"
  value       = aws_ecr_repository.main.registry_id
}

output "ecr_access_policy_arn" {
  description = "ARN of the ECR access IAM policy (if created)"
  value       = var.create_ecr_access_policy ? aws_iam_policy.ecr_access[0].arn : null
}

output "scan_on_push" {
  description = "Whether scan on push is enabled"
  value       = var.scan_on_push
}

output "encryption_type" {
  description = "Encryption type used"
  value       = var.encryption_type
}

output "image_tag_mutability" {
  description = "Image tag mutability setting"
  value       = var.image_tag_mutability
}

output "docker_login_command" {
  description = "Command to log in to ECR repository"
  value       = "aws ecr get-login-password --region ${split(".", aws_ecr_repository.main.repository_url)[3]} | docker login --username AWS --password-stdin ${aws_ecr_repository.main.repository_url}"
}

output "push_commands" {
  description = "Example commands to build, tag, and push an image"
  value = [
    "docker build -t ${aws_ecr_repository.main.name} .",
    "docker tag ${aws_ecr_repository.main.name}:latest ${aws_ecr_repository.main.repository_url}:latest",
    "docker push ${aws_ecr_repository.main.repository_url}:latest"
  ]
}
