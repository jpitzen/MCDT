# Deployment Wizard User Guide

**Version:** v16  
**Last Updated:** November 26, 2025  
**Feature:** Comprehensive Multi-Cloud Kubernetes Deployment Wizard with Deployment Modes and Resource Groups

---

## Overview

The ZLAWS Deployment Wizard is a comprehensive, step-by-step interface for deploying Kubernetes clusters across multiple cloud providers (AWS, Azure, GCP, DigitalOcean, Linode). The wizard guides you through 12 configuration steps with cloud-specific options, real-time cost estimation, and best practice recommendations.

---

## Features

### ✅ NEW: Deployment Modes
- **New Deployment:** Create complete infrastructure from scratch
- **Add to Existing:** Deploy resources into existing infrastructure with automatic discovery

### ✅ NEW: Resource Groups
- Organize resources logically across all cloud providers
- AWS: Resource Groups + Tags
- Azure: Native Resource Groups
- GCP: Labels + Folders
- DigitalOcean: Projects
- Linode: Tags

### ✅ Cloud-Specific Configuration
- **Instance Types:** Tailored options for each provider with vCPU, RAM, and hourly cost
- **Regions:** Provider-specific regions with descriptions
- **Storage Types:** Cloud-appropriate options (AWS: gp3, Azure: Premium_LRS, GCP: pd-ssd)
- **Database Engines:** Provider-supported databases with versions
- **Terminology:** Adapts terms (VPC vs Virtual Network, NAT Gateway vs Cloud NAT)

### ✅ Comprehensive Resource Configuration
- **Kubernetes Cluster:** Name, version, region
- **Worker Nodes:** Count, instance type, disk size, auto-scaling
- **Additional VMs:** Optional standalone VMs for non-K8s workloads
- **Networking:** VPC creation, subnets, NAT gateway, load balancer
- **Storage:** Block, file, and object storage with size/type selection
- **Database:** Managed database with engine, version, HA, backups
- **Monitoring:** CloudWatch/Monitor integration, logging, alerts

### ✅ Cost Transparency
- **Per-Step Estimation:** See costs as you configure each component
- **Total Monthly Cost:** Comprehensive estimate on review page
- **Cost Breakdown:** Compute, storage, database, networking itemized
- **Pricing Hints:** Hourly rates shown next to instance types
- **Warning Alerts:** Expensive options (Multi-AZ, NAT) clearly marked

### ✅ Guided Experience
- **Explanatory Text:** Each option includes "what is this?" context
- **Best Practices:** Inline recommendations (e.g., "Enable Multi-AZ for production")
- **Helper Text:** Constraints and limits shown (e.g., "1-100 characters")
- **Validation:** Real-time validation with helpful error messages
- **Progress Tracking:** 8-step stepper shows current position

---

## Wizard Steps

### Step 1: Deployment Mode (NEW)

**Purpose:** Choose between creating new infrastructure or adding to existing infrastructure.

**Options:**

| Mode | Description | Use Case |
|------|-------------|----------|
| **New Deployment** | Creates complete infrastructure from scratch | First deployment to a region, isolated environments |
| **Add to Existing** | Deploys into existing VPC/networking | Adding clusters to existing infrastructure |

**New Deployment Mode:**
- Creates new VPC/VNet with specified CIDR
- Creates new subnets, gateways, and security groups
- Full control over all network settings
- Best for isolated, standalone environments

**Add to Existing Mode:**
- Discovers existing VPCs, subnets, security groups
- Allows selecting which resources to reuse
- Preserves existing networking configuration
- Best for multi-cluster environments, cost optimization

**What Happens After Selection:**
- If "Add to Existing" is selected, the wizard will discover your existing infrastructure after you select credentials
- Discovered resources will be shown in Step 3 (Resource Group)

---

### Step 2: Select Credentials

**Purpose:** Choose which cloud provider credentials to use for deployment.

**Supported Cloud Providers:**
- AWS (Access Key / Secret Key)
- Azure (Subscription ID / Client ID / Tenant ID / Client Secret)
- GCP (Project ID / Service Account JSON)
- DigitalOcean (API Token)
- Linode (API Token)

**What You'll See:**
- Grid of your configured credentials
- Provider, region, account information
- Validation status (✓ Validated or ✗ Invalid)
- Credential descriptions

**Action Required:**
- Click on a credential card to select it
- Only validated credentials should be used for production deployments

**Infrastructure Discovery:**
- If "Add to Existing" mode was selected in Step 1, infrastructure discovery runs automatically
- Shows a loading indicator while discovering VPCs, subnets, and security groups

**Next Step Unlocked:** Once credential selected

---

### Step 3: Resource Group Configuration (NEW)

**Purpose:** Configure resource grouping and organization for your deployment.

**What are Resource Groups?**

Resource groups help you organize, manage, and track costs for related cloud resources.

| Cloud Provider | Mechanism | Description |
|----------------|-----------|-------------|
| AWS | Resource Groups + `zlaws:ResourceGroup` tag | Logical grouping via AWS Resource Groups service |
| Azure | Resource Groups (native) | Built-in Azure resource organization |
| GCP | Labels + Folders | Project labels and optional GCP folder structure |
| DigitalOcean | Projects | Built-in project organization |
| Linode | Tags | Tag-based resource grouping |

**Configuration Options:**

**Create New Resource Group:**
- Resource Group Name: Identifier for the group (e.g., `production-api`)
- Description: Optional description for documentation

**Use Existing Resource Group (only in "Add to Existing" mode):**
- Select from discovered resource groups
- Resources will be added to the existing group

**Discovered Infrastructure Panel (Add to Existing mode only):**

When in "Add to Existing" mode, you'll see discovered resources:
- **VPCs/VNets:** Select which VPC to deploy into
- **Subnets:** Number of available subnets shown
- **Security Groups:** Number of available security groups shown

**Best Practices:**
- Use consistent naming conventions across environments
- Include environment (prod, staging, dev) in the name
- Group related resources for easier cost tracking
- Use separate resource groups for different projects/teams

---

### Step 4: Cluster Configuration

**Purpose:** Set fundamental cluster properties.

**Configuration Options:**

| Field | Description | Example | Validation |
|-------|-------------|---------|------------|
| Cluster Name | Unique identifier | `production-api-cluster` | 1-100 characters, alphanumeric and hyphens |
| Kubernetes Version | K8s version to deploy | `1.27` (Stable) | Valid K8s version (1.25-1.29) |
| Region | Cloud provider region | `us-east-1` (AWS) | Provider-specific region |

**Best Practices:**
- Use descriptive names indicating environment and purpose
- Choose K8s 1.27+ for latest features and security patches
- Select region closest to your users for best performance
- Consider data residency requirements when choosing region

**Cost Impact:** Region affects pricing (some regions are more expensive)

---

### Step 5: Compute Resources

**Purpose:** Configure worker nodes and optional additional VMs.

#### Kubernetes Worker Nodes

| Field | Description | Recommendation |
|-------|-------------|----------------|
| Node Count | Initial number of worker nodes | 3 for production, 1 for dev/test |
| Instance Type | VM size for nodes | `t3.medium` (2 vCPU, 4GB) for small apps |
| Disk Size | Root disk per node | 100GB recommended minimum |
| Enable Auto-Scaling | Automatically adjust node count | ✓ Recommended for production |
| Minimum Nodes | Scale down limit | 1 or 2 for cost savings |
| Maximum Nodes | Scale up limit | 5-10 based on expected traffic |

**Instance Type Guide:**

**AWS:**
- `t3.small` (2 vCPU, 2GB) - $0.0208/hr - Dev/test environments
- `t3.medium` (2 vCPU, 4GB) - $0.0416/hr - Small production apps
- `t3.large` (2 vCPU, 8GB) - $0.0832/hr - Medium production apps
- `m5.large` (2 vCPU, 8GB) - $0.096/hr - General purpose production
- `c5.large` (2 vCPU, 4GB) - $0.085/hr - Compute-intensive workloads

**Azure:**
- `Standard_B2s` (2 vCPU, 4GB) - $0.0416/hr - Burstable workloads
- `Standard_D2s_v3` (2 vCPU, 8GB) - $0.096/hr - General purpose

**GCP:**
- `e2-medium` (2 vCPU, 4GB) - $0.0402/hr - Cost-effective standard
- `n2-standard-2` (2 vCPU, 8GB) - $0.097/hr - Higher performance

#### Additional Virtual Machines (Optional)

Deploy standalone VMs for:
- Databases not running in Kubernetes
- Caching layers (Redis, Memcached)
- Monitoring tools (Prometheus, Grafana)
- CI/CD runners
- Bastion hosts

**Configuration:**
- VM Count: 0-20 additional VMs
- VM Instance Type: Same options as worker nodes
- Operating System: Ubuntu 22.04, Debian 11, RHEL 8, etc.

**Cost Estimate:** Displays monthly cost for nodes + VMs combined

---

### Step 6: Networking Configuration

**Purpose:** Set up network infrastructure (VPC, subnets, gateways).

#### VPC Configuration

**Option 1: Create New VPC (Recommended)**

| Field | Description | Default | Best Practice |
|-------|-------------|---------|---------------|
| VPC CIDR | IP address range | `10.0.0.0/16` | Use /16 for 65,536 IPs |
| Public Subnet 1 | Internet-facing subnet | `10.0.1.0/24` | For load balancers, bastion hosts |
| Public Subnet 2 | Second public subnet (HA) | `10.0.2.0/24` | Different availability zone |
| Private Subnet 1 | Internal resources | `10.0.10.0/24` | For K8s nodes, databases |
| Private Subnet 2 | Second private subnet (HA) | `10.0.11.0/24` | Different availability zone |

**Option 2: Use Existing VPC**
- Provide VPC ID (e.g., `vpc-1234567890abcdef0` for AWS)
- Must have appropriate subnets and routing configured

#### Network Features

**NAT Gateway (Recommended for Production)**
- **Purpose:** Allows private subnet resources to access internet for updates and external APIs
- **Cost:** ~$0.045/hour (~$33/month) + data processing charges
- **When to Enable:** Always for production, optional for dev/test

**Load Balancer**
- **Purpose:** Distributes traffic across nodes for high availability
- **Cost:** ~$0.025/hour (~$18/month) for Application Load Balancer
- **When to Enable:** Essential for production applications with external access

**Best Practices:**
- Use multiple subnets across availability zones for high availability
- Keep databases and application servers in private subnets
- Enable NAT Gateway for private subnet internet access
- Public subnets should be smaller than private (fewer resources need public IPs)

**Terminology by Provider:**
- **AWS:** VPC, Subnet, NAT Gateway, Application Load Balancer
- **Azure:** Virtual Network, Subnet, NAT Gateway, Load Balancer
- **GCP:** VPC Network, Subnet, Cloud NAT, Load Balancer
- **DigitalOcean:** VPC, Subnet, NAT Gateway, Load Balancer
- **Linode:** VPC, Subnet, NAT, NodeBalancer

---

### Step 7: Storage Configuration

**Purpose:** Configure persistent storage for applications.

#### Block Storage (Recommended)

**Use Cases:**
- Database volumes (PostgreSQL, MySQL, MongoDB)
- Persistent application data
- Stateful application storage

**Configuration:**
| Field | Description | Recommendation |
|-------|-------------|----------------|
| Storage Size | Total capacity in GB | Start with 100GB, scale as needed |
| Storage Type | Performance tier | `gp3` (AWS), `Premium_LRS` (Azure) for production |

**Storage Types by Provider:**

**AWS:**
- `gp3` - General Purpose SSD - $0.08/GB/month - **Recommended** (balanced performance/cost)
- `io2` - Provisioned IOPS SSD - $0.125/GB/month - High-performance databases
- `st1` - Throughput Optimized HDD - $0.045/GB/month - Log storage, data warehouses

**Azure:**
- `Premium_LRS` - Premium SSD - $0.135/GB/month - Production databases
- `StandardSSD_LRS` - Standard SSD - $0.075/GB/month - General purpose
- `Standard_LRS` - Standard HDD - $0.04/GB/month - Backups, archives

**GCP:**
- `pd-ssd` - SSD Persistent Disk - $0.17/GB/month - High performance
- `pd-balanced` - Balanced Persistent Disk - $0.10/GB/month - **Recommended**
- `pd-standard` - Standard Persistent Disk - $0.04/GB/month - Archives

#### File Storage (Optional)

**Use Cases:**
- Shared configuration files
- Content management systems (WordPress, Drupal)
- Shared data between multiple pods
- Home directories

**Configuration:**
- Storage Size: 100GB typical starting point
- Cost: ~$0.30/GB/month (EFS/Azure Files)

**When to Enable:**
- Multiple pods need to read/write the same files
- Content management systems
- Legacy applications expecting shared filesystem

#### Object Storage (Optional)

**Use Cases:**
- Backups and archives
- Application logs
- Media files (images, videos)
- Static website content
- Data lakes

**Configuration:**
- Bucket Name: Globally unique name (e.g., `my-app-storage-prod`)
- Cost: ~$0.023/GB/month (S3 Standard) + data transfer

**When to Enable:**
- Storing unstructured data
- Backups and disaster recovery
- Serving static content (images, PDFs)
- Log aggregation

**Cost Estimate:** Shows total monthly storage cost across all types

---

### Step 8: Database Configuration

**Purpose:** Deploy a managed database service.

#### When to Enable Managed Database

**Recommended For:**
- Production applications requiring high availability
- Applications needing automated backups
- Teams without dedicated DBA resources
- Compliance requirements (encryption, audit logs)

**Consider Alternatives:**
- Run database in Kubernetes pods (development only)
- Use existing database infrastructure
- Third-party database services (MongoDB Atlas, etc.)

#### Database Engine Selection

**PostgreSQL (Recommended)**
- **Best For:** General-purpose applications, complex queries, JSON data
- **Versions:** 14.6 (latest stable), 13.9, 12.13
- **Use Cases:** Web apps, analytics, geospatial data

**MySQL**
- **Best For:** Web applications, e-commerce, WordPress
- **Versions:** 8.0.32 (latest), 5.7.40 (legacy support)
- **Use Cases:** Content management, web applications

**MariaDB**
- **Best For:** MySQL replacement, open-source alternative
- **Versions:** 10.6.11 (latest), 10.5.18
- **Use Cases:** Same as MySQL with better performance

**Cloud-Specific Engines:**
- **AWS Aurora:** MySQL/PostgreSQL compatible with 5x performance
- **Azure Cosmos DB:** Multi-model, globally distributed (requires separate setup)

#### Instance Configuration

**Instance Class:**

| Class | vCPU | RAM | Hourly Cost | Use Case |
|-------|------|-----|-------------|----------|
| `db.t3.micro` | 1 | 1GB | $0.017 | Dev/test, very light workloads |
| `db.t3.small` | 2 | 2GB | $0.034 | Light production, small apps |
| `db.t3.medium` | 2 | 4GB | $0.068 | **Recommended starting point** |
| `db.m5.large` | 2 | 8GB | $0.192 | Medium production workloads |
| `db.r5.large` | 2 | 16GB | $0.24 | Memory-intensive, large datasets |

**Storage Size:**
- Minimum: 20GB
- Maximum: 65,536GB (64TB)
- Recommendation: Start with 20GB for dev, 100GB for production
- Note: Storage can be increased later without downtime

**Master Username:**
- Default: `admin`
- Avoid: `root`, `postgres`, `mysql`, `admin` on some providers
- Recommendation: Use application-specific username (e.g., `appuser`)

#### High Availability & Backup

**Multi-AZ Deployment**
- **What It Does:** Replicates database to standby instance in different availability zone
- **Benefits:** Automatic failover, 99.95% availability SLA
- **Cost:** 2x instance price (doubles your database cost)
- **When to Enable:** ✓ Always for production, ✗ Optional for dev/test

**Backup Retention**
- **Range:** 0-35 days
- **Recommendation:** 7 days minimum for production
- **Cost:** Backup storage charged separately (~$0.095/GB/month)
- **Note:** 0 days = no automated backups (not recommended)

**Auto-Generated Password:**
- Master password is automatically generated and stored securely
- Retrieved via cloud provider's secrets manager
- Rotatable through platform UI

**Cost Estimate:** Shows monthly database cost including instance + storage + Multi-AZ

---

### Step 9: Database Scripts (SQL Upload)

**Purpose:** Upload SQL scripts for database initialization and schema setup.

**When to Use:**
- Initial schema creation
- Seed data for development/testing
- Custom stored procedures, functions, and triggers
- Data migration scripts

**Script Configuration:**

| Field | Description | Default |
|-------|-------------|---------|
| Script Name | Identifier for the script | Filename |
| Execution Order | Order in which scripts run | Sequential (1, 2, 3...) |
| Halt on Error | Stop if script fails | ✓ Enabled |
| Run in Transaction | Wrap in transaction for rollback | ✓ Enabled |
| Timeout (seconds) | Maximum execution time | 300 |

**Supported Engines:**
- PostgreSQL (`.sql` files with PostgreSQL syntax)
- MySQL (`.sql` files with MySQL syntax)
- SQL Server (`.sql` files with T-SQL syntax)

**Script Execution:**
1. Scripts are stored securely during deployment
2. After database is provisioned, scripts run in order
3. Errors are logged and can be viewed in deployment details
4. Transaction support allows rollback on failure

**Best Practices:**
- Use idempotent scripts (can be run multiple times safely)
- Include `IF NOT EXISTS` checks for tables
- Test scripts locally before uploading
- Keep scripts focused and modular

---

### Step 10: Monitoring & Logging

**Purpose:** Enable observability and troubleshooting tools.

#### Cluster Monitoring

**What It Includes:**
- Cluster health metrics (node status, pod count)
- Resource utilization (CPU, memory, disk per node)
- Pod performance metrics
- Cluster-level dashboards

**Provider Integration:**
- **AWS:** CloudWatch Container Insights
- **Azure:** Azure Monitor for Containers
- **GCP:** Cloud Monitoring (formerly Stackdriver)
- **DigitalOcean:** Built-in monitoring (free)
- **Linode:** Prometheus + Grafana stack

**Cost:**
- **AWS:** ~$0.30/GB ingested + $0.03/GB storage
- **Azure:** ~$0.25/GB ingested
- **GCP:** Free tier (50GB/month), then ~$0.258/MB
- **Estimated:** $5-15/month for small cluster (3 nodes)

**When to Enable:** ✓ Recommended for all environments

#### Centralized Logging

**What It Includes:**
- Aggregated logs from all pods and nodes
- Log search and filtering
- Log retention and archival
- Integration with cloud provider's logging service

**Provider Integration:**
- **AWS:** CloudWatch Logs
- **Azure:** Log Analytics
- **GCP:** Cloud Logging
- **DigitalOcean:** Log forwarding to external services
- **Linode:** ELK or Loki stack integration

**Cost:**
- **AWS:** ~$0.50/GB ingested + $0.03/GB storage
- **Azure:** ~$2.30/GB ingested (first 5GB free)
- **GCP:** First 50GB/month free, then ~$0.50/GB
- **Estimated:** $10-30/month depending on verbosity

**When to Enable:** ✓ Recommended for production, optional for dev/test

#### Automated Alerts (Optional)

**What It Includes:**
- Email notifications for critical events
- Threshold-based alerts (high CPU, low disk space)
- Pod failure notifications
- Node health issues

**Configuration:**
- Alert Email: Email address to receive notifications
- Pre-configured alerts for common issues

**When to Enable:** Production environments with on-call teams

**Cost Impact:** Minimal (alert processing is usually free)

---

### Step 11: Tags

**Purpose:** Add custom tags/labels to all resources for organization and cost tracking.

**Why Tags Are Important:**
- **Cost Allocation:** Track spending by project, team, or environment
- **Resource Organization:** Filter resources in cloud console
- **Automation:** Use tags for automated policies and scripts
- **Compliance:** Meet tagging requirements for governance

**Tag Structure:**

| Field | Description | Example |
|-------|-------------|---------|
| Key | Tag identifier | `Environment`, `Team`, `Project` |
| Value | Tag value | `production`, `platform`, `api-gateway` |

**Common Tags:**

| Key | Purpose | Example Values |
|-----|---------|----------------|
| `Environment` | Deployment stage | `production`, `staging`, `development` |
| `Team` | Owning team | `platform`, `backend`, `data` |
| `Project` | Project identifier | `ecommerce`, `analytics`, `api` |
| `CostCenter` | Billing allocation | `CC-1234`, `engineering` |
| `Owner` | Resource owner email | `team@company.com` |
| `Application` | Application name | `order-service`, `user-api` |

**Automatic Tags Added:**
The wizard automatically adds these tags:
- `zlaws:ManagedBy` = `zlaws-deployer`
- `zlaws:DeploymentId` = unique deployment ID
- `zlaws:ResourceGroup` = resource group name (if configured)
- `zlaws:CreatedAt` = deployment timestamp

**Provider-Specific Notes:**
- **AWS:** Tags applied to all supported resources
- **Azure:** Tags applied at resource group and resource level
- **GCP:** Labels (lowercase keys) applied to resources
- **DigitalOcean:** Tags applied where supported
- **Linode:** Tags applied to all resources

---

### Step 12: Review & Deploy

**Purpose:** Final review before creating cloud resources.

#### What You'll See

**Cloud Provider & Cluster**
- Provider name and cloud platform
- Region selected
- Cluster name and Kubernetes version

**Compute Resources**
- Worker node configuration (count, instance type, auto-scaling)
- Additional VMs (if configured)
- Operating systems selected

**Networking**
- VPC configuration (new or existing)
- Subnet CIDR blocks
- NAT Gateway and Load Balancer status

**Storage**
- Block storage (size and type)
- File storage (if enabled)
- Object storage bucket name (if enabled)

**Database**
- Engine and version
- Instance class
- Storage size
- Multi-AZ and backup configuration

**Monitoring & Logging**
- Monitoring status
- Logging status
- Alert configuration

#### Cost Estimate

**Total Monthly Cost Breakdown:**
```
Compute:    $90.50  (3x t3.medium nodes)
Storage:    $15.00  (100GB gp3 + 50GB file storage)
Database:   $49.64  (db.t3.medium + Multi-AZ)
Networking: $51.00  (NAT Gateway + Load Balancer)
Monitoring: $12.00  (CloudWatch Insights + Logs)
────────────────────
TOTAL:      $218.14/month
```

**Important Notes:**
- Estimate based on 730 hours/month (average)
- Actual costs vary by usage patterns
- Data transfer charges not included
- Regional pricing differences may apply
- Spot/reserved instances can reduce costs

#### Warnings

**Before You Deploy:**
- ⚠️ Cloud resources will be created immediately
- ⚠️ Billing starts as soon as resources are provisioned
- ⚠️ Some resources have hourly charges (NAT, databases)
- ⚠️ Manual cleanup required if deployment fails
- ⚠️ Master database password auto-generated and stored securely

**Deployment Process:**
1. Click "Deploy" button
2. Confirm deployment in dialog
3. Backend creates Terraform configuration
4. Terraform provisions cloud resources (10-20 minutes)
5. Deployment status updates in real-time
6. Redirect to deployment details page

---

## Tips & Best Practices

### Cost Optimization

1. **Start Small, Scale Up**
   - Begin with `t3.small` or `t3.medium` instances
   - Enable auto-scaling to handle traffic spikes
   - Monitor actual resource usage before increasing

2. **Use Auto-Scaling**
   - Set aggressive scale-down policies (min: 1 node)
   - Scale up aggressively for traffic (max: 10+ nodes)
   - Saves 50-70% during low-traffic periods

3. **Disable Expensive Features in Dev**
   - Skip NAT Gateway ($33/month) for dev/test
   - Disable Multi-AZ databases (halves cost)
   - Use smaller instance types
   - Reduce backup retention to 1-2 days

4. **Right-Size Your Database**
   - Don't over-provision storage initially
   - Start with `db.t3.micro` for dev, `db.t3.medium` for prod
   - Enable storage auto-scaling for growth

5. **Monitor and Adjust**
   - Review CloudWatch/Monitor metrics weekly
   - Identify underutilized resources
   - Downsize or consolidate as needed

### High Availability

1. **Use Multi-AZ Everything**
   - Enable Multi-AZ for production databases
   - Deploy nodes across multiple availability zones
   - Use multiple subnets in different AZs

2. **Enable Auto-Scaling**
   - Automatically replace failed nodes
   - Handle traffic spikes without manual intervention
   - Set max nodes high enough for peak traffic

3. **Configure Load Balancer**
   - Distributes traffic across healthy nodes
   - Automatic health checks
   - Essential for production applications

4. **Enable Monitoring & Alerts**
   - Get notified of issues before users report them
   - Set up PagerDuty or similar for on-call
   - Monitor disk space, CPU, memory thresholds

### Security

1. **Use Private Subnets**
   - Keep K8s nodes and databases in private subnets
   - Only load balancers and bastion hosts in public subnets
   - Reduces attack surface significantly

2. **Enable NAT Gateway**
   - Private subnet resources need internet for updates
   - Don't expose nodes directly to internet
   - Worth the cost for security

3. **Credential Management**
   - Use cloud provider's secrets manager for DB passwords
   - Rotate credentials regularly
   - Never hardcode credentials in application code

4. **Network Security**
   - Configure security groups/firewall rules
   - Restrict database access to K8s nodes only
   - Enable VPC Flow Logs for audit trail

### Performance

1. **Choose Right Instance Types**
   - CPU-intensive: Use `c5` (AWS) or compute-optimized
   - Memory-intensive: Use `r5` (AWS) or memory-optimized
   - General purpose: Use `t3` or `m5` series

2. **Storage Performance**
   - Use `gp3` or `io2` for databases requiring high IOPS
   - Use `pd-ssd` (GCP) for maximum performance
   - Standard HDD acceptable for logs, backups

3. **Database Optimization**
   - Choose instance class based on working set size
   - Memory should be 2-3x your database size for caching
   - Use read replicas for read-heavy workloads

4. **Region Selection**
   - Deploy in region closest to users
   - Latency increases ~10-50ms per 1,000 miles
   - Consider data residency requirements (GDPR, etc.)

---

## Troubleshooting

### Credential Selection Issues

**Problem:** No credentials appear in Step 1  
**Solution:** Add credentials first via Credentials Manager

**Problem:** Credential shows as "Invalid"  
**Solution:** Validate credentials via Credentials Manager before deploying

### Validation Errors

**Problem:** "Cluster name must be 1-100 characters"  
**Solution:** Use only alphanumeric characters and hyphens

**Problem:** "Invalid CIDR block"  
**Solution:** Use format `10.0.0.0/16` (valid IP range with subnet mask)

**Problem:** "Email required for alerts"  
**Solution:** Provide valid email address if alerts enabled

### Deployment Failures

**Problem:** Deployment stuck in "init" phase  
**Solution:** Check credential validity, ensure account has sufficient permissions

**Problem:** "Insufficient capacity" error  
**Solution:** Try different region or instance type, some AZs may be at capacity

**Problem:** Database creation fails  
**Solution:** Check username doesn't conflict with reserved names, verify storage size

### Cost Concerns

**Problem:** Estimated cost too high  
**Solution:** 
- Use smaller instance types
- Disable Multi-AZ for dev/test
- Skip NAT Gateway in development
- Reduce node count, enable auto-scaling

**Problem:** Unexpected charges  
**Solution:**
- Data transfer charges not estimated in wizard
- Inter-AZ traffic can add 10-20% to bill
- Monitor actual usage via cloud provider billing dashboard

---

## API Integration

The wizard submits the following JSON structure to `POST /api/deployments`:

```json
{
  "credentialId": "uuid-here",
  "cloudProvider": "aws",
  "clusterName": "production-cluster",
  "kubernetesVersion": "1.27",
  "region": "us-east-1",
  
  "nodeCount": 3,
  "minNodeCount": 1,
  "maxNodeCount": 5,
  "nodeInstanceType": "t3.medium",
  "enableAutoscaling": true,
  "diskSizeGB": 100,
  
  "enableAdditionalVMs": true,
  "vmCount": 2,
  "vmInstanceType": "t3.small",
  "vmOperatingSystem": "ubuntu-22.04",
  
  "createNewVPC": true,
  "vpcCIDR": "10.0.0.0/16",
  "publicSubnets": ["10.0.1.0/24", "10.0.2.0/24"],
  "privateSubnets": ["10.0.10.0/24", "10.0.11.0/24"],
  "enableNATGateway": true,
  "enableLoadBalancer": true,
  
  "enableBlockStorage": true,
  "blockStorageSize": 100,
  "blockStorageType": "gp3",
  "enableFileStorage": false,
  "enableObjectStorage": false,
  
  "enableRDS": true,
  "dbEngine": "postgres",
  "dbVersion": "14.6",
  "dbInstanceClass": "db.t3.medium",
  "dbAllocatedStorage": 100,
  "dbMultiAZ": true,
  "dbBackupRetentionDays": 7,
  "dbUsername": "appuser",
  
  "enableMonitoring": true,
  "enableLogging": true,
  "enableAlerts": true,
  "alertEmail": "alerts@example.com",
  
  "deploymentMode": "new",
  "resourceGroupName": "production-api",
  "resourceGroupDescription": "Production API infrastructure"
}
```

---

## Changelog

### v16 (November 26, 2025)
- ✅ **NEW:** Deployment Mode selection (New vs Add to Existing)
- ✅ **NEW:** Resource Group configuration for all 5 cloud providers
- ✅ **NEW:** Infrastructure discovery for existing deployments
- ✅ **NEW:** Step 1: Deployment Mode with visual selection
- ✅ **NEW:** Step 3: Resource Group with cloud-specific options
- ✅ **NEW:** Step 9: Database Scripts upload
- ✅ **NEW:** Step 11: Custom Tags configuration
- ✅ Updated to 12-step wizard (from 8 steps)
- ✅ DigitalOcean and Linode credential support in Credentials Manager

### v15 (November 19, 2025)
- ✅ Initial comprehensive wizard release
- ✅ 8-step guided deployment process
- ✅ CSP-specific instance types, regions, and storage types
- ✅ Real-time cost estimation with breakdown
- ✅ Additional VMs configuration
- ✅ Advanced networking (VPC, subnets, NAT, LB)
- ✅ Comprehensive storage options (block, file, object)
- ✅ Managed database configuration with HA
- ✅ Monitoring and logging integration
- ✅ Guided help text and best practices throughout

### Planned Enhancements
- ✅ ~~Save draft configurations~~ (Implemented)
- Form validation with Yup schemas
- Template system for common deployments
- Cost prediction based on historical usage
- Multi-region deployment support
- Advanced networking (VPN, Direct Connect)

---

**Support:** For issues or questions, contact your ZLAWS administrator or refer to the troubleshooting section above.
