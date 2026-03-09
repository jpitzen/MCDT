output "db_instance_id" {
  description = "ID of the RDS instance"
  value       = aws_db_instance.main.id
}

output "db_instance_arn" {
  description = "ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "db_endpoint" {
  description = "Connection endpoint for the database"
  value       = aws_db_instance.main.endpoint
}

output "db_address" {
  description = "Hostname of the database"
  value       = aws_db_instance.main.address
}

output "db_port" {
  description = "Port of the database"
  value       = aws_db_instance.main.port
}

output "db_name" {
  description = "Name of the database"
  value       = aws_db_instance.main.db_name
}

output "db_username" {
  description = "Master username"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "db_password" {
  description = "Master password (generated if not provided)"
  value       = var.db_password != "" ? var.db_password : random_password.db_password.result
  sensitive   = true
}

output "db_engine" {
  description = "Database engine type"
  value       = aws_db_instance.main.engine
}

output "db_engine_version" {
  description = "Database engine version"
  value       = aws_db_instance.main.engine_version
}

output "db_security_group_id" {
  description = "ID of the database security group"
  value       = aws_security_group.rds.id
}

output "db_subnet_group_name" {
  description = "Name of the DB subnet group"
  value       = aws_db_subnet_group.main.name
}

output "connection_string" {
  description = "Connection string for the database (format varies by engine)"
  value = var.db_engine == "postgres" || startswith(var.db_engine, "postgres") ? (
    "postgresql://${aws_db_instance.main.username}:${var.db_password != "" ? var.db_password : random_password.db_password.result}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}"
    ) : var.db_engine == "mysql" || startswith(var.db_engine, "mysql") || startswith(var.db_engine, "mariadb") ? (
    "mysql://${aws_db_instance.main.username}:${var.db_password != "" ? var.db_password : random_password.db_password.result}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}"
    ) : startswith(var.db_engine, "sqlserver") ? (
    "Server=${aws_db_instance.main.address},${aws_db_instance.main.port};User Id=${aws_db_instance.main.username};Password=${var.db_password != "" ? var.db_password : random_password.db_password.result};"
    ) : (
    "${aws_db_instance.main.address}:${aws_db_instance.main.port}"
  )
  sensitive = true
}

output "secrets_manager_secret_arn" {
  description = "ARN of the Secrets Manager secret (if enabled)"
  value       = var.store_password_in_secrets_manager ? aws_secretsmanager_secret.db_password[0].arn : null
}
