# AWS EC2 Module - Virtual machine instances for Windows and Linux
# Supports: Windows Server 2016/2019/2022, Amazon Linux 2, Ubuntu, RHEL

# Data source for latest Windows Server AMI
data "aws_ami" "windows" {
  count       = var.vm_operating_system == "Windows Server 2022 Datacenter" || var.vm_operating_system == "Windows Server 2019 Datacenter" || var.vm_operating_system == "Windows Server 2016 Datacenter" ? 1 : 0
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = [var.vm_operating_system == "Windows Server 2022 Datacenter" ? "Windows_Server-2022-English-Full-Base-*" : var.vm_operating_system == "Windows Server 2019 Datacenter" ? "Windows_Server-2019-English-Full-Base-*" : "Windows_Server-2016-English-Full-Base-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Data source for latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux" {
  count       = var.vm_operating_system == "Amazon Linux 2" ? 1 : 0
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = [can(regex("^(t4g|a1|c6g|c7g|m6g|m7g|r6g|r7g|x2gd)", var.vm_instance_type)) ? "amzn2-ami-hvm-*-arm64-gp2" : "amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Data source for latest Ubuntu AMI
data "aws_ami" "ubuntu" {
  count       = var.vm_operating_system == "Ubuntu 22.04 LTS" || var.vm_operating_system == "Ubuntu 20.04 LTS" ? 1 : 0
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name = "name"
    values = [
      can(regex("^(t4g|a1|c6g|c7g|m6g|m7g|r6g|r7g|x2gd)", var.vm_instance_type)) ? (
        var.vm_operating_system == "Ubuntu 22.04 LTS" ? "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-arm64-server-*" : "ubuntu/images/hvm-ssd/ubuntu-focal-20.04-arm64-server-*"
        ) : (
        var.vm_operating_system == "Ubuntu 22.04 LTS" ? "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" : "ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"
      )
    ]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Generate SSH key pair for Linux instances
resource "tls_private_key" "ec2_key" {
  count     = var.create_key_pair ? 1 : 0
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "ec2_key" {
  count      = var.create_key_pair ? 1 : 0
  key_name   = "${var.cluster_name}-ec2-key"
  public_key = tls_private_key.ec2_key[0].public_key_openssh

  tags = var.common_tags
}

# Store private key in Secrets Manager
resource "aws_secretsmanager_secret" "ec2_private_key" {
  count       = var.create_key_pair && var.store_key_in_secrets_manager ? 1 : 0
  name        = "${var.cluster_name}-ec2-private-key"
  description = "Private key for EC2 instances in ${var.cluster_name}"

  tags = var.common_tags
}

resource "aws_secretsmanager_secret_version" "ec2_private_key" {
  count         = var.create_key_pair && var.store_key_in_secrets_manager ? 1 : 0
  secret_id     = aws_secretsmanager_secret.ec2_private_key[0].id
  secret_string = tls_private_key.ec2_key[0].private_key_pem
}

# Security Group for EC2 instances
resource "aws_security_group" "ec2" {
  name        = "${var.cluster_name}-ec2-sg"
  description = "Security group for EC2 instances"
  vpc_id      = var.vpc_id

  # RDP for Windows (3389)
  dynamic "ingress" {
    for_each = var.allow_rdp && (startswith(var.vm_operating_system, "Windows")) ? [1] : []
    content {
      from_port   = 3389
      to_port     = 3389
      protocol    = "tcp"
      cidr_blocks = var.rdp_cidr_blocks
      description = "RDP access"
    }
  }

  # SSH for Linux (22)
  dynamic "ingress" {
    for_each = var.allow_ssh && (!startswith(var.vm_operating_system, "Windows")) ? [1] : []
    content {
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = var.ssh_cidr_blocks
      description = "SSH access"
    }
  }

  # Custom ingress rules
  dynamic "ingress" {
    for_each = var.custom_ingress_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }

  # Allow all internal VPC traffic
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
    description = "Allow all traffic from VPC"
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
      Name = "${var.cluster_name}-ec2-sg"
    }
  )
}

# IAM Role for EC2 instances
resource "aws_iam_role" "ec2" {
  name = "${var.cluster_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

# Attach SSM policy for Systems Manager access
resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Attach CloudWatch policy for logs and metrics
resource "aws_iam_role_policy_attachment" "ec2_cloudwatch" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# IAM Instance Profile
resource "aws_iam_instance_profile" "ec2" {
  name = "${var.cluster_name}-ec2-profile"
  role = aws_iam_role.ec2.name

  tags = var.common_tags
}

# Windows User Data
locals {
  windows_user_data = <<-EOT
    <powershell>
    # Set administrator password
    $Password = ConvertTo-SecureString "${var.windows_admin_password != "" ? var.windows_admin_password : random_password.windows_password.result}" -AsPlainText -Force
    $UserAccount = Get-LocalUser -Name "Administrator"
    $UserAccount | Set-LocalUser -Password $Password

    # Install CloudWatch Agent
    Invoke-WebRequest -Uri "https://s3.amazonaws.com/amazoncloudwatch-agent/windows/amd64/latest/amazon-cloudwatch-agent.msi" -OutFile "C:\amazon-cloudwatch-agent.msi"
    Start-Process msiexec.exe -Wait -ArgumentList '/i C:\amazon-cloudwatch-agent.msi /quiet'

    # Configure firewall for RDP
    Enable-NetFirewallRule -DisplayGroup "Remote Desktop"

    # Additional custom configuration
    ${var.windows_user_data_script}
    </powershell>
  EOT

  linux_user_data = <<-EOT
    #!/bin/bash
    set -e

    # Update system
    yum update -y || apt-get update -y

    # Install CloudWatch Agent
    wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm || \
    wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
    rpm -U amazon-cloudwatch-agent.rpm || dpkg -i -E amazon-cloudwatch-agent.deb

    # Install SSM Agent (if not already installed)
    yum install -y amazon-ssm-agent || snap install amazon-ssm-agent --classic

    # Additional custom configuration
    ${var.linux_user_data_script}
  EOT
}

# Random password for Windows instances
resource "random_password" "windows_password" {
  length           = 16
  special          = true
  override_special = "!@#$%^&*()_+-="
}

# Store Windows password in Secrets Manager
resource "aws_secretsmanager_secret" "windows_password" {
  count       = startswith(var.vm_operating_system, "Windows") && var.store_password_in_secrets_manager ? 1 : 0
  name        = "${var.cluster_name}-windows-admin-password"
  description = "Windows Administrator password for ${var.cluster_name}"

  tags = var.common_tags
}

resource "aws_secretsmanager_secret_version" "windows_password" {
  count         = startswith(var.vm_operating_system, "Windows") && var.store_password_in_secrets_manager ? 1 : 0
  secret_id     = aws_secretsmanager_secret.windows_password[0].id
  secret_string = var.windows_admin_password != "" ? var.windows_admin_password : random_password.windows_password.result
}

# EC2 Instances
resource "aws_instance" "vms" {
  count = var.vm_count

  ami = (
    startswith(var.vm_operating_system, "Windows") ? data.aws_ami.windows[0].id :
    var.vm_operating_system == "Amazon Linux 2" ? data.aws_ami.amazon_linux[0].id :
    data.aws_ami.ubuntu[0].id
  )
  instance_type = var.vm_instance_type
  key_name      = var.create_key_pair ? aws_key_pair.ec2_key[0].key_name : var.existing_key_name

  vpc_security_group_ids = [aws_security_group.ec2.id]
  subnet_id              = var.subnet_ids[count.index % length(var.subnet_ids)]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  user_data = startswith(var.vm_operating_system, "Windows") ? local.windows_user_data : local.linux_user_data

  # Root volume
  root_block_device {
    volume_type           = var.root_volume_type
    volume_size           = var.root_volume_size
    encrypted             = true
    delete_on_termination = true

    tags = merge(
      var.common_tags,
      {
        Name = var.vm_base_name != "" ? format("%s-%02d-root", var.vm_base_name, count.index + 1) : "${var.cluster_name}-vm-${count.index + 1}-root"
      }
    )
  }

  # Additional EBS volumes
  dynamic "ebs_block_device" {
    for_each = var.additional_ebs_volumes
    content {
      device_name           = ebs_block_device.value.device_name
      volume_type           = ebs_block_device.value.volume_type
      volume_size           = ebs_block_device.value.volume_size
      encrypted             = true
      delete_on_termination = true

      tags = merge(
        var.common_tags,
        {
          Name = var.vm_base_name != "" ? format("%s-%02d-%s", var.vm_base_name, count.index + 1, ebs_block_device.value.device_name) : "${var.cluster_name}-vm-${count.index + 1}-${ebs_block_device.value.device_name}"
        }
      )
    }
  }

  tags = merge(
    var.common_tags,
    {
      Name = var.vm_base_name != "" ? format("%s-%02d", var.vm_base_name, count.index + 1) : "${var.cluster_name}-vm-${count.index + 1}"
    }
  )
}
