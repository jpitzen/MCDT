# ZL AWS EKS Deployment Guide

This consolidated reference mirrors every phase, step, and appendix available in the original static HTML guide stored under `DG_PROD`. Each section references the source HTML so you can dive into the interactive experience if needed.

## Overview

This comprehensive guide walks you through deploying the ZL application on Amazon EKS (Elastic Kubernetes Service) with all necessary AWS integrations including ECR, EBS, EFS, S3, and RDS.

**Path:** DG_PROD/ZL_DG_202512162115.html

## Phase 0: AWS Configuration

Phase 0 configures AWS credentials, creates IAM users and policies, and sets up service accounts required for EKS cluster management and application deployment.

**Steps**

1. Step 1: Configure AWS CLI
2. Step 2: Create IAM User
3. Step 3: Attach AWS Managed Policies
4. Step 4: Create Custom EKS Admin Policy
5. Step 5: Create EBS CSI Driver Policy
6. Step 6: Create ALB Controller Policy
7. Step 7: Configure IAM OIDC Provider
8. Step 8: Create IAM Service Account Roles
9. Step 9: Enable AWS Inspector2
10. Phase 0 Completion Checklist

**Source:** [DG_PROD/ZL_DG_PHASE_0.html](DG_PROD/ZL_DG_PHASE_0.html)

## Phase 1: EKS Cluster Creation

Phase 1 creates the Amazon EKS cluster with managed node groups, configures OIDC provider for IAM roles, and retrieves essential cluster information for subsequent phases.

**Steps**

1. Step 1.1: Create EKS Cluster
2. Step 1.2: Associate OIDC Provider
3. Step 1.3: Get Cluster OIDC Issuer
4. Step 1.4: Get Cluster VPC Information
5. Phase 1 Completion Checklist

**Source:** [DG_PROD/ZL_DG_PHASE_1.html](DG_PROD/ZL_DG_PHASE_1.html)

## Phase 2: ECR & Image Management

Phase 2 sets up Amazon Elastic Container Registry (ECR) repositories and manages container images for the ZL application deployment.

**Steps**

1. Overview & Repository Info
2. Create ECR Repository
3. Authenticate Docker to ECR
4. Push Images to ECR
5. Verify Images in ECR
6. Phase 2 Completion Checklist

**Source:** [DG_PROD/ZL_DG_PHASE_2.html](DG_PROD/ZL_DG_PHASE_2.html)

## Phase 3: EBS CSI Driver

Phase 3 installs the Amazon EBS CSI Driver to enable Kubernetes to manage EBS volumes for persistent storage, which is essential for ZooKeeper's stateful data.

**Steps**

1. Overview & Prerequisites
2. Create EBS CSI Driver IAM Policy
3. Create IAM Service Account for EBS CSI Driver
4. Install EBS CSI Driver
5. Verify EBS CSI Driver Installation
6. Create EBS StorageClass
7. Phase 3 Completion Checklist

**Source:** [DG_PROD/ZL_DG_PHASE_3.html](DG_PROD/ZL_DG_PHASE_3.html)

## Phase 4: EFS CSI Driver

Phase 4 installs the Amazon EFS CSI Driver to provide shared, persistent storage that can be accessed by multiple pods simultaneously.

**Steps**

1. Overview & EFS Use Cases
2. Create EFS IAM Policy
3. Create IAM Service Account
4. Install EFS CSI Driver
5. Create EFS File System
6. Create EFS Security Group
7. Create Mount Targets
8. Mount EFS on EC2/EKS Nodes
9. Create EFS Access Points
10. Phase 4 Completion Checklist

**Source:** [DG_PROD/ZL_DG_PHASE_4.html](DG_PROD/ZL_DG_PHASE_4.html)

## Phase 5: S3 CSI Driver

Phase 5 installs Mountpoint for Amazon S3 to enable Kubernetes pods to mount S3 buckets as file systems for archive storage.

**Steps**

1. Create S3 Bucket
2. Enable Versioning
3. Create S3 CSI Driver IAM Policy
4. Create IAM Service Account for S3 CSI Driver
5. Install S3 Mountpoint CSI Driver
6. Configure S3 Storage Class and PV
7. Phase 5 Completion Checklist

**Source:** [DG_PROD/ZL_DG_PHASE_5.html](DG_PROD/ZL_DG_PHASE_5.html)

## Phase 6: Database Configuration

Phase 6 creates an Amazon RDS SQL Server Express instance in the same VPC as the EKS cluster for application data storage.

**Steps**

1. Get VPC and Subnet Information
2. Create DB Subnet Group
3. Create RDS Security Group
4. Create RDS SQL Server Express Instance
5. Get RDS Endpoint
6. Create Application Database User
7. Create Database ConfigMap and Secret
8. SSM Port Forwarding Setup
9. Deploy Database Schemas via SQLCMD
10. Phase 6 Completion Checklist

**Source:** [DG_PROD/ZL_DG_PHASE_6.html](DG_PROD/ZL_DG_PHASE_6.html)

## Phase 7: ZooKeeper Deployment

Phase 7 deploys Apache ZooKeeper to provide distributed coordination services for cluster state management, leader election, and configuration synchronization.

**Steps**

1. Deploy ZooKeeper Headless Service
2. Deploy ZooKeeper Client Service
3. Create ZooKeeper EFS PV/PVC
4. Deploy zlapp-config ConfigMap
5. Deploy zkclient-config ConfigMap
6. Deploy ZooKeeper StatefulSet
7. Run ZooKeeper Config Seed Job
8. Verify ZooKeeper Deployment
9. Phase 7 Completion Checklist

**Source:** [DG_PROD/ZL_DG_PHASE_7.html](DG_PROD/ZL_DG_PHASE_7.html)

## Phase 8: Application Deployment

Phase 8 deploys the ZL Application components: Document Conversion (Tika), Backend Server, and Web UI.

**Steps**

1. Create ZLServer ZK EFS Volumes
2. Deploy Tika Service
3. Deploy ZL Server
4. Deploy ZL UI
5. Run ZL ZK Client Init Job
6. Deploy ZL Search
7. Verify All Components
8. Phase 8 Completion Checklist

**Source:** [DG_PROD/ZL_DG_PHASE_8.html](DG_PROD/ZL_DG_PHASE_8.html)

## Phase 9: Network & Ingress

Phase 9 configures the AWS Load Balancer Controller and creates an Ingress to expose the application via Application Load Balancer.

**Steps**

1. Install AWS Load Balancer Controller
2. Create Ingress for Public Access
3. Verify Load Balancer & Application Access
4. Configure SSL/TLS (Optional)
5. Phase 9 Completion Checklist

**Source:** [DG_PROD/ZL_DG_PHASE_9.html](DG_PROD/ZL_DG_PHASE_9.html)

## Phase 10: Cluster Autoscaling

Phase 10 installs and configures Cluster Autoscaler to automatically adjust the number of nodes based on pod resource requests.

**Steps**

1. Step 54: Create Cluster Autoscaler IAM Policy
2. Step 55: Create Service Account for Autoscaler
3. Step 56: Tag Auto Scaling Group for Discovery
4. Step 57: Deploy Cluster Autoscaler
5. Step 58: Phase 10 Completion Checklist

**Source:** [DG_PROD/ZL_DG_PHASE_10.html](DG_PROD/ZL_DG_PHASE_10.html)

## Phase 11: Post-Deployment (Optional)

Phase 11 completes the deployment by creating vault directories, updating database paths, and restarting deployments. **This phase is optional and only required if storage is not properly mapped or vault directories need to be created.**

**Steps**

1. Step 59: Create Vault Directory Structure
2. Step 60: Update Database Disk Volume Paths
3. Step 61: Restart Application Deployments
4. Step 62: Upload NIST and ZL Models
5. Step 63: Phase 11 Completion Checklist

**Source:** [DG_PROD/ZL_DG_PHASE_11.html](DG_PROD/ZL_DG_PHASE_11.html)

## Phase 12: EC2 Configuration

Phase 12 configures EC2 instances for integration with the EKS cluster, including EFS mounting and network connectivity for hybrid deployments.

*This page does not use the guided step structure; refer to the source for full context.*

**Source:** [DG_PROD/ZL_DG_PHASE_12.html](DG_PROD/ZL_DG_PHASE_12.html)

## Phase 13: Security Scanning

Phase 13 covers container vulnerability scanning using both local (Grype) and cloud (AWS Inspector) tools to ensure container images are secure before production deployment.

**Steps**

1. Step 69: Security Scanning Overview
2. Step 70: Scan with Grype
3. Step 71: Fetch AWS Inspector Results
4. Step 72: Use Interactive Scanner Tool
5. Step 73: Compare Scan Results
6. Step 74: Phase 13 Completion

**Source:** [DG_PROD/ZL_DG_PHASE_13.html](DG_PROD/ZL_DG_PHASE_13.html)

## Troubleshooting Guide

This troubleshooting guide provides solutions for common issues encountered during ZL application deployment on AWS EKS.

*This page does not use the guided step structure; refer to the source for full context.*

**Source:** [DG_PROD/ZL_DG_TROUBLESHOOTING.html](DG_PROD/ZL_DG_TROUBLESHOOTING.html)

## Appendix A: AWS CLI Commands Reference

This appendix provides a comprehensive reference of AWS CLI commands used throughout the ZL application deployment process.

*This page does not use the guided step structure; refer to the source for full context.*

**Source:** [DG_PROD/ZL_DG_APPENDIX_A.html](DG_PROD/ZL_DG_APPENDIX_A.html)

## Appendix B: Kubernetes Manifests Reference

This appendix provides complete, working Kubernetes manifests from the us-east-1 deployment. All manifests have been tested and verified.

*This page does not use the guided step structure; refer to the source for full context.*

**Source:** [DG_PROD/ZL_DG_APPENDIX_B.html](DG_PROD/ZL_DG_APPENDIX_B.html)

## Appendix C: IAM Policies Reference

This appendix provides complete IAM policy documents used for ZL application deployment on AWS EKS.

*This page does not use the guided step structure; refer to the source for full context.*

**Source:** [DG_PROD/ZL_DG_APPENDIX_C.html](DG_PROD/ZL_DG_APPENDIX_C.html)

## Appendix D: Security Groups Reference

This appendix provides security group configurations for the ZL application deployment on AWS EKS.

*This page does not use the guided step structure; refer to the source for full context.*

**Source:** [DG_PROD/ZL_DG_APPENDIX_D.html](DG_PROD/ZL_DG_APPENDIX_D.html)

## Appendix E: Monitoring & Logging Reference

This appendix provides monitoring and logging configurations for the ZL application deployment on AWS EKS.

*This page does not use the guided step structure; refer to the source for full context.*

**Source:** [DG_PROD/ZL_DG_APPENDIX_E.html](DG_PROD/ZL_DG_APPENDIX_E.html)

## Appendix F: Performance Tuning Reference

This appendix provides performance tuning recommendations and configurations for optimizing the ZL application deployment on AWS EKS.

*This page does not use the guided step structure; refer to the source for full context.*

**Source:** [DG_PROD/ZL_DG_APPENDIX_F.html](DG_PROD/ZL_DG_APPENDIX_F.html)
