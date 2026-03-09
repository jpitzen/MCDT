# AWS RDS Module - Database instances for various engines
# Supports: PostgreSQL, MySQL, SQL Server, MariaDB, Oracle

# Random password generation for database
resource "random_password" "db_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.cluster_name}-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-db-subnet-group"
    }
  )
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "${var.cluster_name}-rds-sg"
  description = "Security group for RDS database"
  vpc_id      = var.vpc_id

  # SQL Server
  dynamic "ingress" {
    for_each = var.db_engine == "sqlserver-ex" || var.db_engine == "sqlserver-se" || var.db_engine == "sqlserver-ee" || var.db_engine == "sqlserver-web" ? [1] : []
    content {
      from_port   = 1433
      to_port     = 1433
      protocol    = "tcp"
      cidr_blocks = [var.vpc_cidr]
      description = "SQL Server access from VPC"
    }
  }

  # PostgreSQL
  dynamic "ingress" {
    for_each = startswith(var.db_engine, "postgres") ? [1] : []
    content {
      from_port   = 5432
      to_port     = 5432
      protocol    = "tcp"
      cidr_blocks = [var.vpc_cidr]
      description = "PostgreSQL access from VPC"
    }
  }

  # MySQL/MariaDB
  dynamic "ingress" {
    for_each = startswith(var.db_engine, "mysql") || startswith(var.db_engine, "mariadb") ? [1] : []
    content {
      from_port   = 3306
      to_port     = 3306
      protocol    = "tcp"
      cidr_blocks = [var.vpc_cidr]
      description = "MySQL/MariaDB access from VPC"
    }
  }

  # Oracle
  dynamic "ingress" {
    for_each = startswith(var.db_engine, "oracle") ? [1] : []
    content {
      from_port   = 1521
      to_port     = 1521
      protocol    = "tcp"
      cidr_blocks = [var.vpc_cidr]
      description = "Oracle access from VPC"
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-rds-sg"
    }
  )
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = var.db_identifier != "" ? var.db_identifier : "${var.cluster_name}-db"

  # Engine configuration
  engine            = var.db_engine
  engine_version    = var.db_version
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_type      = var.db_storage_type
  storage_encrypted = true

  # Database configuration
  db_name  = var.db_engine == "sqlserver-ex" || var.db_engine == "sqlserver-se" ? null : var.db_name
  username = var.db_username
  password = var.db_password != "" ? var.db_password : random_password.db_password.result
  port     = var.db_port

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # High availability
  multi_az = var.db_multi_az

  # Backup configuration
  backup_retention_period = var.db_backup_retention_days
  backup_window           = var.db_backup_window
  maintenance_window      = var.db_maintenance_window

  # Monitoring
  enabled_cloudwatch_logs_exports = var.enable_cloudwatch_logs ? var.db_cloudwatch_log_exports : []
  monitoring_interval             = var.enable_enhanced_monitoring ? 60 : 0
  monitoring_role_arn             = var.enable_enhanced_monitoring ? aws_iam_role.rds_monitoring[0].arn : null

  # Deletion protection
  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.cluster_name}-db-final-snapshot"

  # Performance Insights
  performance_insights_enabled          = var.enable_performance_insights
  performance_insights_retention_period = var.enable_performance_insights ? 7 : null

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-db"
    }
  )
}

# IAM Role for Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  name = "${var.cluster_name}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Store password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  count = var.store_password_in_secrets_manager ? 1 : 0

  name        = "${var.cluster_name}-db-password"
  description = "Database password for ${var.cluster_name}"

  tags = var.common_tags
}

resource "aws_secretsmanager_secret_version" "db_password" {
  count = var.store_password_in_secrets_manager ? 1 : 0

  secret_id = aws_secretsmanager_secret.db_password[0].id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password != "" ? var.db_password : random_password.db_password.result
    engine   = var.db_engine
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = aws_db_instance.main.db_name
  })
}
