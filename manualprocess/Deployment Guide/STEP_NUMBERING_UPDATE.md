# Step Numbering Update - December 2024

## Summary
SSM Host creation steps are integrated into Step 37 as sub-steps 37a-37e, placed immediately before the port forwarding command to provide complete context.

## Complete Step Mapping

### Phase 6: RDS & Database Setup (Steps 29-37)
- **Step 29**: Get VPC and Subnet Information
- **Step 30**: Create RDS DB Subnet Group
- **Step 31**: Create RDS Security Group
  - Step 31a: Get EKS Cluster Security Group
  - Step 31b: Create RDS Security Group
  - Step 31c: Add Inbound Rule for SQL Server (Port 1433)
- **Step 32**: Create RDS SQL Server Express Instance
- **Step 33**: Get RDS Endpoint
- **Step 34**: Create Application Database User
- **Step 35**: Create Database ConfigMap
- **Step 36**: Create Database Secret
- **Step 37**: SSM Port Forwarding for Database Access - **EXPANDED**
  - Step 37a: Create IAM Role and Instance Profile for SSM Host
  - Step 37b: Create Security Group for SSM Host
  - Step 37c: Launch Windows Server 2022 Instance
  - Step 37d: Verify SSM Agent Registration
  - Step 37e: Start Port Forwarding Session

### Phase 7: ZooKeeper Deployment (Steps 38-43)
- **Step 38-39**: Deploy ZooKeeper Services
- **Step 40**: Create Application ConfigMap
- **Step 41-42**: Deploy ZooKeeper StatefulSet
- **Step 43**: Verify ZooKeeper Ensemble

### Phase 8: Application Deployment (Steps 43-48)
- **Step 43**: Create Document Conversion ConfigMap
- **Step 44**: Deploy Tika Service
- **Step 45**: Deploy ZL Server
- **Step 46**: Deploy ZL UI
- **Step 47-48**: Verify All Pods Running

### Phase 9: Ingress & Load Balancer (Steps 49-51)
- **Step 49**: Install AWS Load Balancer Controller
- **Step 50**: Create Ingress for Public Access
- **Step 51**: Verify Ingress and ALB

### Phase 10: Cluster Autoscaling - Optional (Steps 52-56)
- **Step 52**: Create Cluster Autoscaler IAM Policy
- **Step 53**: Create Service Account for Autoscaler
- **Step 54**: Tag ASG for Cluster Autoscaler Discovery
- **Step 55**: Deploy Cluster Autoscaler
- **Step 56**: Verify Autoscaler

### Phase 11: Post-Deployment Configuration (Steps 57-61)
- **Step 57**: Create Vault Directory Structure
- **Step 58**: Verify Vault Structure
- **Step 59**: Update Database Disk Volume Paths
- **Step 60**: Restart Deployments After Configuration Changes
- **Step 61**: Upload NIST Model and ZL Model
  - Step 61a: Get Pod Name
  - Step 61b: Copy Model Files to Pod
  - Step 61c: Verify Files Copied
  - Step 61d: Open the Gate
  - Step 61e: Upload NIST Model

### Phase 12: Security Vulnerability Scanning (Steps 62-64)
- **Step 62**: Grype Local Scanning
- **Step 63**: AWS Inspector Scanning
- **Step 64**: Load & Compare Scan Results

## What Changed
- **Enhanced**: Step 37 now includes SSM Host creation (sub-steps 37a-37d) followed by port forwarding (37e)
- **Impact**: No change to overall step numbering - Step 37 expanded to include prerequisites
- **Total Steps**: Still ends at Step 64

## Key SSM Host Details
- **Instance Type**: t3.medium
- **OS**: Windows Server 2022
- **Purpose**: Jump box for RDS access via SSM Session Manager
- **Instance ID**: i-05f0a52e05bddf73b
- **IAM Role**: SSM-Host-Role with AmazonSSMManagedInstanceCore policy
- **Security Group**: Egress only (no inbound rules needed)

## Format Updates
All SSM Host creation commands include tabbed format for:
- PowerShell (backticks for line continuation)
- Bash (backslashes for line continuation)
- CMD (single-line where applicable)

## Date
January 2025
