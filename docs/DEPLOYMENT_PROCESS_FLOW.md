# EKS Deployment Process Flow

## Overview

This document describes the updated deployment workflow for the Automated EKS Deployer. The system uses a phased approach where configuration is collected in phases 1-5, validated with a Terraform preview (Dry Run), and resources are only created during the final deployment step.

## Key Principle: Terraform Manages All AWS Resources

> **Important:** All AWS resources (VPCs, subnets, IAM roles, security groups, EKS clusters, etc.) are created and managed by Terraform. The UI phases are for **configuration collection** and **status checking** only - they do not create resources.

---

## Deployment Phases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONFIGURATION PHASES                                 │
│                    (No AWS resources created yet)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 1: Prerequisites                                                     │
│  ├── Verify CLI tools (terraform, aws, kubectl)                            │
│  ├── Select cloud credentials                                              │
│  ├── Choose deployment mode (new/existing infrastructure)                  │
│  ├── View required IAM roles (informational only)                          │
│  └── View required security groups (informational only)                    │
│                                                                             │
│  Phase 2: Cluster Configuration                                            │
│  ├── Set cluster name and region                                           │
│  ├── Configure VPC settings (new or existing)                              │
│  ├── Select Kubernetes version                                             │
│  └── Configure network settings                                            │
│                                                                             │
│  Phase 3: Node Groups                                                       │
│  ├── Configure worker node instance types                                  │
│  ├── Set scaling parameters (min/max/desired)                              │
│  └── Configure node labels and taints                                      │
│                                                                             │
│  Phase 4: Add-ons & Services                                               │
│  ├── Select EKS add-ons (CoreDNS, kube-proxy, VPC-CNI)                    │
│  ├── Configure monitoring (CloudWatch, Prometheus)                         │
│  └── Set up logging                                                        │
│                                                                             │
│  Phase 5: Review & Save                                                     │
│  ├── Review all configuration                                              │
│  ├── View cost estimate                                                    │
│  └── Save as Deployment Draft                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          APPROVAL WORKFLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Draft Status: DRAFT                                                        │
│       │                                                                     │
│       ▼                                                                     │
│  Submit for Approval                                                        │
│       │                                                                     │
│       ▼                                                                     │
│  Draft Status: PENDING_APPROVAL                                             │
│       │                                                                     │
│       ├──► Approved ──► Draft Status: APPROVED                             │
│       │                                                                     │
│       └──► Rejected ──► Draft Status: REJECTED (can edit and resubmit)    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DRY RUN / PREVIEW (terraform plan)                       │
│                    (No AWS resources created yet)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Click "Preview" button on approved draft                               │
│                                                                             │
│  2. System executes:                                                        │
│     ├── Creates deployment record (database only)                          │
│     ├── Generates Terraform configuration files                            │
│     ├── Runs: terraform init                                               │
│     ├── Runs: terraform validate                                           │
│     ├── Runs: terraform plan (DRY RUN - no resources created)             │
│     └── Checks AWS prerequisites (VPC quota, EIP quota, existing resources)│
│                                                                             │
│  3. Preview Results Dialog shows:                                           │
│     ├── Summary tab: Resources to add/change/destroy                       │
│     ├── Changes tab: Detailed resource list                                │
│     ├── Checks tab: AWS quota and prerequisite status                      │
│     └── Raw Output tab: Full terraform plan output                         │
│                                                                             │
│  4. User Options:                                                           │
│     ├── [Cancel] - Close without saving                                    │
│     ├── [Save and Close] - Save preview, deploy later                      │
│     └── [Deploy Now] - Proceed to actual deployment                        │
│                                                                             │
│  If "Save and Close":                                                       │
│     └── Draft Status: DEPLOYMENT_PENDING (Ready to Deploy)                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT (terraform apply)                             │
│              ⚠️  AWS RESOURCES ARE CREATED IN THIS STEP                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Triggered by:                                                              │
│  ├── "Deploy Now" button from Preview dialog                               │
│  └── "Deploy" button on DEPLOYMENT_PENDING draft                           │
│                                                                             │
│  Execution Flow:                                                            │
│                                                                             │
│  1. terraform init (if not already initialized)                            │
│                                                                             │
│  2. terraform apply -auto-approve                                          │
│     └── Creates ALL resources:                                             │
│         ├── VPC, Subnets, Internet Gateway, NAT Gateway                   │
│         ├── IAM Roles (cluster-role, node-group-role)                     │
│         ├── Security Groups                                                │
│         ├── EKS Cluster                                                    │
│         ├── EKS Node Groups                                                │
│         ├── EKS Add-ons                                                    │
│         └── Supporting resources (EIPs, Route Tables, etc.)               │
│                                                                             │
│  3. Post-deployment tasks:                                                  │
│     ├── Update kubeconfig                                                  │
│     ├── Verify cluster connectivity                                        │
│     └── Run database migrations (if configured)                            │
│                                                                             │
│  4. Draft Status: DEPLOYED                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Status Flow Diagram

```
                    ┌──────────┐
                    │  DRAFT   │
                    └────┬─────┘
                         │ Submit for Approval
                         ▼
              ┌─────────────────────┐
              │  PENDING_APPROVAL   │
              └──────────┬──────────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼                           ▼
     ┌──────────┐               ┌──────────┐
     │ APPROVED │               │ REJECTED │
     └────┬─────┘               └────┬─────┘
          │                          │
          │ Preview (Dry Run)        │ Edit & Resubmit
          ▼                          │
   ┌───────────────────┐             │
   │ DEPLOYMENT_PENDING│◄────────────┘
   │ (Preview Saved)   │
   └────────┬──────────┘
            │
            │ Deploy Now
            ▼
      ┌──────────┐
      │ DEPLOYED │
      └──────────┘
```

---

## What Gets Created When

| Phase | Action | AWS Resources Created |
|-------|--------|----------------------|
| Phase 1-5 | Configuration | **None** |
| Submit/Approve | Workflow | **None** |
| Preview/Dry Run | `terraform plan` | **None** |
| **Deploy Now** | `terraform apply` | **ALL resources** |

---

## AWS Prerequisite Checks (During Preview)

The preview step now includes AWS quota and resource checks:

| Check | Description | Warning Threshold |
|-------|-------------|-------------------|
| VPC Quota | Current VPCs vs account limit | >80% usage |
| EIP Quota | Current EIPs vs account limit | >80% usage |
| Existing ECR Repo | Check if ECR repository exists | Exists |
| Existing IAM Roles | Check if IAM roles exist | Exists |
| Existing Security Groups | Check if SGs with same name exist | Exists |

These checks warn you before deployment if resources already exist or if you're approaching AWS limits.

---

## Cleanup of Legacy Phase 1 Resources

If you previously used Phase 1 to create IAM roles or security groups, run the cleanup script before deploying:

```bash
# Dry run first (shows what would be deleted)
node scripts/cleanup-phase1-resources.js \
  --cluster-name <your-cluster-name> \
  --region <aws-region> \
  --vpc-id <vpc-id> \
  --dry-run

# Actual cleanup
node scripts/cleanup-phase1-resources.js \
  --cluster-name <your-cluster-name> \
  --region <aws-region> \
  --vpc-id <vpc-id>
```

---

## Resource Lifecycle Management

### Creating Resources
All resources are created by `terraform apply` during the "Deploy Now" step.

### Updating Resources
1. Edit the deployment draft
2. Re-run Preview to see changes
3. Deploy to apply updates (Terraform handles incremental updates)

### Destroying Resources
1. Use the "Destroy" option on a deployed configuration
2. System runs `terraform destroy`
3. All resources created by that deployment are removed

---

## Best Practices

1. **Always run Preview first** - Review the terraform plan before deploying
2. **Check the Checks tab** - Verify AWS quotas and existing resources
3. **Use Save and Close** - If you need time to review or get approval
4. **Clean up old resources** - Run cleanup script if you used old Phase 1 create buttons
5. **One cluster per deployment** - Each deployment manages its own set of resources

---

## Troubleshooting

### "EntityAlreadyExists" Error
IAM roles with the same name already exist. Run the cleanup script or use a different cluster name.

### "VpcLimitExceeded" Error
Account has reached VPC limit. Delete unused VPCs or request limit increase.

### "RepositoryAlreadyExistsException" Error
ECR repository exists. Either:
- Use the existing repository (configure in Phase 2)
- Delete the existing repository
- Use a different name

### Preview passes but Deploy fails
- Check AWS credentials are valid
- Verify you have sufficient IAM permissions
- Check for resources created outside Terraform that conflict
