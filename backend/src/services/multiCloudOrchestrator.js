const { awsSecretsService } = require('./secrets');
const logger = require('./logger');
const { execSync } = require('child_process');
const path = require('path');

/**
 * Multi-Cloud Orchestrator Service
 * Handles cloud-agnostic deployment orchestration with support for AWS, Azure, GCP, DigitalOcean, and Linode
 */
class MultiCloudOrchestrator {
  constructor() {
    this.secretServices = {
      'aws-secrets': awsSecretsService,
      // 'azure-kv': azureKeyVaultService,  // Temporarily disabled
      // 'gcp-secrets': gcpSecretManagerService,  // Temporarily disabled
      // 'hashicorp-vault': hashicorpVaultService,  // Temporarily disabled
    };

    this.cloudProviders = {
      aws: 'aws-secrets',
      azure: 'aws-secrets',        // Fallback: uses AWS Secrets Manager until azure-kv is implemented
      gcp: 'aws-secrets',           // Fallback: uses AWS Secrets Manager until gcp-secrets is implemented
      digitalocean: 'aws-secrets',   // Fallback: uses AWS Secrets Manager until hashicorp-vault is implemented
      linode: 'aws-secrets',         // Fallback: uses AWS Secrets Manager until hashicorp-vault is implemented
    };

    this.terraformModules = {
      aws: 'terraform/environments/aws',
      azure: 'terraform/environments/azure',
      gcp: 'terraform/environments/gcp',
      digitalocean: 'terraform/environments/digitalocean',
      linode: 'terraform/environments/linode',
    };
  }

  /**
   * Get the appropriate secret service for a cloud provider
   * @param {string} cloudProvider - Cloud provider (aws, azure, gcp, etc.)
   * @returns {object} Secret service instance
   */
  getSecretService(cloudProvider) {
    const vaultType = this.cloudProviders[cloudProvider];
    if (!vaultType) {
      throw new Error(`Unsupported cloud provider: ${cloudProvider}`);
    }
    return this.secretServices[vaultType];
  }

  /**
   * Initialize cloud credentials with appropriate secret vault
   * @param {string} cloudProvider - Cloud provider
   * @param {object} credentials - Cloud-specific credentials
   * @returns {Promise<object>} Initialized secret service
   */
  async initializeCloudCredentials(cloudProvider, credentials) {
    try {
      const secretService = this.getSecretService(cloudProvider);
      await secretService.initialize(credentials);
      logger.info('Cloud credentials initialized', { cloudProvider });
      return secretService;
    } catch (error) {
      logger.error('Failed to initialize cloud credentials', { cloudProvider, error: error.message });
      throw error;
    }
  }

  /**
   * Store cloud credentials in appropriate vault
   * @param {string} cloudProvider - Cloud provider
   * @param {string} deploymentId - Unique deployment ID
   * @param {object} credentials - Credentials to store
   * @returns {Promise<string>} Reference ID to stored credentials
   */
  async storeCloudCredentials(cloudProvider, deploymentId, credentials) {
    try {
      const secretService = this.getSecretService(cloudProvider);
      const referenceId = await secretService.storeCredentials(deploymentId, credentials);

      logger.audit('cloud_credentials_stored', 'credential', deploymentId, null, {
        cloudProvider,
        vault: this.cloudProviders[cloudProvider],
        referenceId,
      }, 'success');

      return referenceId;
    } catch (error) {
      logger.error('Failed to store cloud credentials', { cloudProvider, deploymentId, error: error.message });
      throw error;
    }
  }

  /**
   * Retrieve cloud credentials from vault
   * @param {string} cloudProvider - Cloud provider
   * @param {string} deploymentId - Unique deployment ID
   * @returns {Promise<object>} Stored credentials
   */
  async retrieveCloudCredentials(cloudProvider, deploymentId) {
    try {
      const secretService = this.getSecretService(cloudProvider);
      const credentials = await secretService.retrieveCredentials(deploymentId);

      logger.audit('cloud_credentials_retrieved', 'credential', deploymentId, null, {
        cloudProvider,
        vault: this.cloudProviders[cloudProvider],
      }, 'success');

      return credentials;
    } catch (error) {
      logger.error('Failed to retrieve cloud credentials', { cloudProvider, deploymentId, error: error.message });
      throw error;
    }
  }

  /**
   * Validate cloud provider credentials
   * @param {string} cloudProvider - Cloud provider
   * @param {object} credentials - Credentials to validate
   * @returns {Promise<boolean>} True if valid
   */
  async validateCloudCredentials(cloudProvider, credentials) {
    try {
      const secretService = this.getSecretService(cloudProvider);
      await secretService.initialize(credentials);
      const isValid = await secretService.validateAccess();

      logger.info('Cloud credentials validated successfully', { cloudProvider });
      return isValid;
    } catch (error) {
      logger.warn('Cloud credentials validation failed', { cloudProvider, error: error.message });
      return false;
    }
  }

  /**
   * Get Terraform module path for cloud provider
   * @param {string} cloudProvider - Cloud provider
   * @returns {string} Path to Terraform module
   */
  getTerraformModulePath(cloudProvider) {
    const modulePath = this.terraformModules[cloudProvider];
    if (!modulePath) {
      throw new Error(`No Terraform module available for cloud provider: ${cloudProvider}`);
    }
    return modulePath;
  }

  /**
   * Generate Terraform variables for deployment (with credential retrieval)
   * Fetches credentials from vault and merges with configuration
   * 
   * @param {string} deploymentId - Deployment ID
   * @param {string} cloudProvider - Cloud provider
   * @param {string} secretRefId - Secret reference ID for credential retrieval
   * @param {string} vaultType - Type of vault (aws-secrets, azure-kv, etc.)
   * @param {object} deploymentConfig - Deployment configuration
   * @returns {Promise<object>} Terraform variables ready for tfvars file
   */
  async generateTerraformVars(deploymentId, cloudProvider, secretRefId, vaultType, deploymentConfig) {
    try {
      // Retrieve credentials from vault
      const secretService = this.secretServices[vaultType];
      if (!secretService) {
        throw new Error(`Unknown vault type: ${vaultType}`);
      }

      let credentials = {};
      try {
        credentials = await secretService.retrieveCredentials(secretRefId);
      } catch (error) {
        logger.warn(`Failed to retrieve credentials from vault`, {
          deploymentId,
          vaultType,
          error: error.message,
        });
        // Continue with empty credentials if retrieval fails
      }

      // Convert tags array to object format for Terraform
      let tagsObject = { ManagedBy: 'zl-mcdt' };
      if (deploymentConfig.tags && Array.isArray(deploymentConfig.tags)) {
        deploymentConfig.tags.forEach(tag => {
          if (tag.key && tag.value) {
            tagsObject[tag.key] = tag.value;
          }
        });
      } else if (deploymentConfig.tags && typeof deploymentConfig.tags === 'object') {
        tagsObject = { ...tagsObject, ...deploymentConfig.tags };
      }

      // Check if this is a re-deployment (use existing resources)
      const isRedeployment = deploymentConfig.isRedeployment || deploymentConfig.useExistingResources || false;

    const baseVars = {
      cloud_provider: cloudProvider,
      cluster_name: deploymentConfig.clusterName || `cluster-${deploymentId}`,
      region: deploymentConfig.region || this._defaultRegion(cloudProvider),
      kubernetes_version: deploymentConfig.kubernetesVersion || '1.34',
      node_count: deploymentConfig.nodeCount || 3,
        node_group_name: deploymentConfig.nodeGroupName || '',
        node_instance_type: deploymentConfig.nodeInstanceType || this._defaultInstanceType(cloudProvider),
        enable_autoscaling: deploymentConfig.enableAutoscaling !== false,
        min_node_count: deploymentConfig.minNodeCount || 1,
        max_node_count: deploymentConfig.maxNodeCount || 5,
        enable_monitoring: deploymentConfig.enableMonitoring !== false,
        enable_logging: deploymentConfig.enableLogging !== false,
        enable_storage: deploymentConfig.enableStorage !== false,
        enable_managed_database: deploymentConfig.enableRDS !== false,
        // Legacy alias for Terraform compatibility
        enable_rds: deploymentConfig.enableRDS !== false,
        tags: tagsObject,
      };

      // Merge cloud-specific variables
      const cloudSpecificVars = this.generateCloudSpecificVars(cloudProvider, deploymentConfig, credentials);

      // Inject access mode fields for all providers
      if (deploymentConfig.accessMode === 'external') {
        const accessModeOverrides = {
          access_mode: 'external',
          external_domain: deploymentConfig.externalDomain || '',
        };

        // AWS-specific: ACM cert ARN already handled in generateCloudSpecificVars
        // Non-AWS: append provider-specific SSL vars
        if (cloudProvider !== 'aws' && deploymentConfig.sslMode) {
          accessModeOverrides.ssl_mode = deploymentConfig.sslMode;
        }

        Object.assign(cloudSpecificVars, accessModeOverrides);
      }

      const tfvars = { ...baseVars, ...cloudSpecificVars };

      logger.info(`Terraform variables generated for deployment`, {
        deploymentId,
        cloudProvider,
        variableCount: Object.keys(tfvars).length,
        isRedeployment,
      });

      return tfvars;
    } catch (error) {
      logger.error(`Failed to generate Terraform variables`, {
        deploymentId,
        cloudProvider,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Convert tags array [{ key, value }] to a plain object { key: value }.
   * Accepts arrays, plain objects, or falsy values. Invalid entries (no key) are skipped.
   * @param {Array|object|null} tags
   * @param {object} [options]
   * @param {boolean} [options.lowercaseKeys] - Force keys to lowercase (GCP label requirement)
   * @param {RegExp}  [options.valueSanitize]  - Regex for characters to replace with '-' in values
   * @returns {object}
   * @private
   */
  _normalizeTags(tags, options = {}) {
    if (!tags) return {};
    if (!Array.isArray(tags)) return typeof tags === 'object' ? tags : {};
    const obj = {};
    tags.forEach(t => {
      if (t && t.key) {
        let key = t.key;
        let val = t.value || '';
        if (options.lowercaseKeys) key = key.toLowerCase();
        if (options.valueSanitize) val = val.toLowerCase().replace(options.valueSanitize, '-');
        obj[key] = val;
      }
    });
    return obj;
  }

  /**
   * Provider-specific default region.
   * @private
   */
  _defaultRegion(cloudProvider) {
    const defaults = {
      aws: 'us-east-1',
      azure: 'eastus',
      gcp: 'us-central1',
      digitalocean: 'nyc1',
      linode: 'us-east',
    };
    return defaults[cloudProvider] || 'us-east-1';
  }

  /**
   * Provider-specific default instance/VM type.
   * @private
   */
  _defaultInstanceType(cloudProvider) {
    const defaults = {
      aws: 't3.medium',
      azure: 'Standard_D2s_v3',
      gcp: 'e2-medium',
      digitalocean: 's-2vcpu-4gb',
      linode: 'g6-standard-2',
    };
    return defaults[cloudProvider] || 't3.medium';
  }

  /**
   * Generate cloud-specific Terraform variables
   * @private
   */
  generateCloudSpecificVars(cloudProvider, deploymentConfig, credentials) {
    switch (cloudProvider) {
      case 'aws':
        const awsRegion = deploymentConfig.region || 'us-east-1';
        // Some AWS regions don't have all availability zones (e.g., us-west-1 only has a and c, no b)
        // Map of regions with non-standard AZ suffixes
        const regionAzMap = {
          'us-west-1': ['a', 'c'],  // us-west-1b doesn't exist
          'us-east-1': ['a', 'b', 'c', 'd', 'e', 'f'],
          'us-east-2': ['a', 'b', 'c'],
          'us-west-2': ['a', 'b', 'c', 'd'],
          'eu-west-1': ['a', 'b', 'c'],
          'eu-west-2': ['a', 'b', 'c'],
          'eu-central-1': ['a', 'b', 'c'],
          'ap-southeast-1': ['a', 'b', 'c'],
          'ap-southeast-2': ['a', 'b', 'c'],
          'ap-northeast-1': ['a', 'c', 'd'],  // ap-northeast-1b doesn't exist for most account types
        };
        const azSuffix = regionAzMap[awsRegion] || ['a', 'b', 'c'];
        // Only use first 2-3 AZs for subnet creation (EKS requires at least 2)
        const selectedAzSuffix = azSuffix.slice(0, 3);
        const awsAvailabilityZones = deploymentConfig.availabilityZones || 
                                     selectedAzSuffix.map(az => `${awsRegion}${az}`);
        
        return {
          // Resource Group - disabled by default (requires IAM permission: resource-groups:CreateGroup)
          create_resource_group: deploymentConfig.createResourceGroup || false,
          
          // Base AWS config
          aws_region: awsRegion,
          vpc_name: deploymentConfig.vpcName || '',
          aws_vpc_cidr: deploymentConfig.vpcCidr || '10.0.0.0/16',
          aws_subnets: deploymentConfig.subnets || [],
          create_vpc: deploymentConfig.createVpc !== false,
          aws_availability_zones: awsAvailabilityZones,
          vpc_id: deploymentConfig.vpcId || '',
          vpc_cidr: deploymentConfig.vpcCidr || '',
          
          // AWS credentials
          aws_access_key: credentials?.accessKeyId || '',
          aws_secret_key: credentials?.secretAccessKey || '',

          // Private cluster configuration
          endpoint_public_access: deploymentConfig.endpointPublicAccess !== false,
          endpoint_private_access: deploymentConfig.endpointPrivateAccess !== false,

          // CSI Driver configuration
          enable_ebs_csi_driver: deploymentConfig.enableEbsCsiDriver !== false,
          enable_efs_csi_driver: deploymentConfig.enableEfsCsiDriver || false,
          ebs_csi_driver_version: deploymentConfig.ebsCsiDriverVersion || '',
          efs_csi_driver_version: deploymentConfig.efsCsiDriverVersion || '',

          // Cluster Autoscaler configuration
          enable_cluster_autoscaler: deploymentConfig.enableClusterAutoscaler || false,
          autoscaler_namespace: deploymentConfig.autoscalerNamespace || 'kube-system',
          autoscaler_service_account: deploymentConfig.autoscalerServiceAccount || 'cluster-autoscaler',

          // RDS configuration
          enable_rds: deploymentConfig.enableRDS || false,
          db_identifier: deploymentConfig.dbName || '',
          db_name: deploymentConfig.dbName || '',
          db_engine: deploymentConfig.dbEngine || 'postgres',
          db_version: deploymentConfig.dbVersion || '',
          db_instance_class: deploymentConfig.dbInstanceClass || 'db.t3.medium',
          db_allocated_storage: deploymentConfig.dbAllocatedStorage || 20,
          db_storage_type: deploymentConfig.dbStorageType || 'gp3',
          db_username: deploymentConfig.dbUsername || 'dbadmin',
          db_password: deploymentConfig.dbPassword || '',
          db_port: deploymentConfig.dbPort || 0,
          db_multi_az: deploymentConfig.dbMultiAZ || false,
          db_backup_retention_days: deploymentConfig.dbBackupRetentionDays || 7,
          db_backup_window: deploymentConfig.dbBackupWindow || '03:00-04:00',
          db_maintenance_window: deploymentConfig.dbMaintenanceWindow || 'sun:04:00-sun:05:00',
          db_enable_enhanced_monitoring: deploymentConfig.dbEnableEnhancedMonitoring || false,
          db_enable_performance_insights: deploymentConfig.dbEnablePerformanceInsights || false,
          db_enable_cloudwatch_logs: deploymentConfig.dbEnableCloudWatchLogs || false,
          db_cloudwatch_log_exports: deploymentConfig.dbCloudWatchLogExports || [],
          db_deletion_protection: deploymentConfig.dbDeletionProtection || false,
          db_skip_final_snapshot: deploymentConfig.dbSkipFinalSnapshot !== false,
          db_store_password_in_secrets_manager: deploymentConfig.dbStorePasswordInSecretsManager !== false,

          // EC2/VM configuration
          enable_additional_vms: deploymentConfig.enableAdditionalVMs || false,
          vm_count: deploymentConfig.enableAdditionalVMs ? (deploymentConfig.vmCount || 1) : 0,
          vm_base_name: deploymentConfig.vmBaseName || '',
          vm_instance_type: deploymentConfig.vmInstanceType || 't3.medium',
          vm_operating_system: deploymentConfig.vmOperatingSystem || 'Amazon Linux 2',
          vm_create_key_pair: deploymentConfig.vmCreateKeyPair !== false,
          vm_existing_key_name: deploymentConfig.vmExistingKeyName || '',
          vm_store_key_in_secrets_manager: deploymentConfig.vmStoreKeyInSecretsManager !== false,
          vm_windows_admin_password: deploymentConfig.vmWindowsAdminPassword || '',
          vm_store_password_in_secrets_manager: deploymentConfig.vmStorePasswordInSecretsManager !== false,
          vm_windows_user_data_script: deploymentConfig.vmWindowsUserDataScript || '',
          vm_linux_user_data_script: deploymentConfig.vmLinuxUserDataScript || '',
          vm_root_volume_type: deploymentConfig.vmRootVolumeType || 'gp3',
          vm_root_volume_size: deploymentConfig.vmRootVolumeSize || 50,
          vm_additional_ebs_volumes: deploymentConfig.vmAdditionalEbsVolumes || [],
          vm_allow_rdp: deploymentConfig.vmAllowRdp !== false,
          vm_rdp_cidr_blocks: deploymentConfig.vmRdpCidrBlocks || ['0.0.0.0/0'],
          vm_allow_ssh: deploymentConfig.vmAllowSsh !== false,
          vm_ssh_cidr_blocks: deploymentConfig.vmSshCidrBlocks || ['0.0.0.0/0'],
          vm_custom_ingress_rules: deploymentConfig.vmCustomIngressRules || [],

          // ECR configuration
          enable_container_registry: deploymentConfig.enableContainerRegistry || false,
          
          // S3 configuration
          enable_object_storage: deploymentConfig.enableObjectStorage || false,
          object_storage_bucket: deploymentConfig.objectStorageBucket || '',
          s3_force_destroy: deploymentConfig.s3ForceDestroy || false,
          s3_enable_versioning: deploymentConfig.s3EnableVersioning || false,
          s3_encryption_type: deploymentConfig.s3EncryptionType || 'AES256',
          s3_kms_key_id: deploymentConfig.s3KmsKeyId || '',
          s3_block_public_access: deploymentConfig.s3BlockPublicAccess !== false,
          s3_allow_eks_access: deploymentConfig.s3AllowEksAccess !== false,
          s3_lifecycle_rules: deploymentConfig.s3LifecycleRules || [],
          s3_cors_rules: deploymentConfig.s3CorsRules || [],
          s3_enable_logging: deploymentConfig.s3EnableLogging || false,
          s3_logging_target_bucket: deploymentConfig.s3LoggingTargetBucket || '',
          s3_logging_target_prefix: deploymentConfig.s3LoggingTargetPrefix || 'logs/',
          s3_enable_object_lock: deploymentConfig.s3EnableObjectLock || false,
          s3_object_lock_mode: deploymentConfig.s3ObjectLockMode || 'GOVERNANCE',
          s3_object_lock_retention_days: deploymentConfig.s3ObjectLockRetentionDays || 365,
          s3_enable_replication: deploymentConfig.s3EnableReplication || false,
          s3_replication_destination_bucket_arn: deploymentConfig.s3ReplicationDestinationBucketArn || '',
          s3_replication_storage_class: deploymentConfig.s3ReplicationStorageClass || 'STANDARD',

          // EFS configuration
          enable_file_storage: deploymentConfig.enableFileStorage || false,
          efs_name: deploymentConfig.fileStorageName || '',
          efs_performance_mode: deploymentConfig.efsPerformanceMode || 'generalPurpose',
          efs_throughput_mode: deploymentConfig.efsThroughputMode || 'bursting',
          efs_provisioned_throughput_in_mibps: deploymentConfig.efsProvisionedThroughputInMibps || null,
          efs_kms_key_id: deploymentConfig.efsKmsKeyId || '',
          efs_transition_to_ia_days: deploymentConfig.efsTransitionToIaDays || null,
          efs_transition_to_archive_days: deploymentConfig.efsTransitionToArchiveDays || null,
          efs_enable_automatic_backups: deploymentConfig.efsEnableAutomaticBackups !== false,
          efs_access_points: deploymentConfig.efsAccessPoints || [],
          efs_create_csi_policy: deploymentConfig.efsCreateCsiPolicy !== false,
          efs_file_system_policy: deploymentConfig.efsFileSystemPolicy || '',

          // ECR configuration (always enabled for container deployments)
          ecr_repository_name: deploymentConfig.ecrRepositoryName || '',
          ecr_image_tag_mutability: deploymentConfig.ecrImageTagMutability || 'MUTABLE',
          ecr_scan_on_push: deploymentConfig.ecrScanOnPush !== false,
          ecr_enable_scan_logging: deploymentConfig.ecrEnableScanLogging || false,
          ecr_scan_log_retention_days: deploymentConfig.ecrScanLogRetentionDays || 7,
          ecr_encryption_type: deploymentConfig.ecrEncryptionType || 'AES256',
          ecr_kms_key_id: deploymentConfig.ecrKmsKeyId || '',
          ecr_enable_lifecycle_policy: deploymentConfig.ecrEnableLifecyclePolicy !== false,
          ecr_lifecycle_policy_json: deploymentConfig.ecrLifecyclePolicyJson || '',
          ecr_keep_last_n_images: deploymentConfig.ecrKeepLastNImages || 30,
          ecr_untagged_image_retention_days: deploymentConfig.ecrUntaggedImageRetentionDays || 7,
          ecr_repository_policy_json: deploymentConfig.ecrRepositoryPolicyJson || '',
          ecr_allow_eks_access: deploymentConfig.ecrAllowEksAccess !== false,
          ecr_enable_replication: deploymentConfig.ecrEnableReplication || false,
          ecr_replication_destinations: deploymentConfig.ecrReplicationDestinations || [],
          ecr_pull_through_cache_rules: deploymentConfig.ecrPullThroughCacheRules || {},
          ecr_create_access_policy: deploymentConfig.ecrCreateAccessPolicy !== false,
        };

      case 'azure':
        return {
          // Core
          resource_group: deploymentConfig.resourceGroup || `rg-${deploymentConfig.clusterName}`,
          environment: deploymentConfig.environment || 'production',

          // Node pool
          node_vm_size: deploymentConfig.nodeInstanceType || 'Standard_D2s_v3',
          os_disk_size_gb: deploymentConfig.osDiskSizeGb || 50,

          // Networking
          network_plugin: deploymentConfig.networkPlugin || 'azure',
          network_policy: deploymentConfig.networkPolicy || 'azure',
          pod_cidr: deploymentConfig.podCidr || '172.17.0.0/16',
          service_cidr: deploymentConfig.serviceCidr || '172.20.0.0/16',
          dns_service_ip: deploymentConfig.dnsServiceIp || '172.20.0.10',

          // Auth
          subscription_id: credentials?.subscriptionId || '',
          client_id: credentials?.clientId || '',
          client_secret: credentials?.clientSecret || '',
          tenant_id: credentials?.tenantId || '',

          // Container Registry (ACR)
          enable_container_registry: deploymentConfig.enableContainerRegistry || false,
          acr_name: deploymentConfig.acrName || '',
          acr_sku: deploymentConfig.acrSku || 'Standard',
          acr_admin_enabled: deploymentConfig.acrAdminEnabled || false,

          // File Storage (Azure Files)
          enable_file_storage: deploymentConfig.enableFileStorage || false,
          file_storage_quota_gb: deploymentConfig.fileStorageQuotaGb || 100,

          // Object Storage (Blob)
          enable_object_storage: deploymentConfig.enableObjectStorage || false,
          storage_account_name: deploymentConfig.storageAccountName || '',
          storage_container_name: deploymentConfig.storageContainerName || '',

          // VNet
          create_vnet: deploymentConfig.createVnet !== false,
          vnet_cidr: deploymentConfig.vnetCidr || '10.1.0.0/16',
          public_subnet_cidr: deploymentConfig.publicSubnetCidr || '10.1.1.0/24',
          aks_subnet_cidr: deploymentConfig.aksSubnetCidr || '10.1.10.0/24',
          db_subnet_cidr: deploymentConfig.dbSubnetCidr || '10.1.20.0/24',
          enable_nat_gateway: deploymentConfig.enableNatGateway !== false,
          existing_vnet_id: deploymentConfig.existingVnetId || '',
          existing_aks_subnet_id: deploymentConfig.existingAksSubnetId || '',
          existing_db_subnet_id: deploymentConfig.existingDbSubnetId || '',
          existing_public_subnet_id: deploymentConfig.existingPublicSubnetId || '',

          // Database
          enable_database: deploymentConfig.enableDatabase || false,
          db_engine: deploymentConfig.dbEngine || 'postgresql',
          db_name: deploymentConfig.dbName || 'zlaws_db',
          db_version: deploymentConfig.dbVersion || '',
          db_sku_name: deploymentConfig.dbSkuName || 'B_Standard_B1ms',
          db_storage_mb: deploymentConfig.dbStorageMb || 32768,
          db_username: deploymentConfig.dbUsername || 'zlaws_admin',
          db_password: deploymentConfig.dbPassword || '',
          db_backup_retention_days: deploymentConfig.dbBackupRetentionDays || 7,
          db_geo_redundant_backup: deploymentConfig.dbGeoRedundantBackup || false,

          // Blob Storage (full module)
          enable_blob_storage: deploymentConfig.enableBlobStorage || false,
          blob_container_name: deploymentConfig.blobContainerName || 'zlaws-data',
          storage_tier: deploymentConfig.storageTier || 'Standard',
          storage_replication_type: deploymentConfig.storageReplicationType || 'LRS',
          enable_blob_versioning: deploymentConfig.enableBlobVersioning !== false,

          // SSL / Ingress (Azure App Gateway or nginx-ingress)
          ssl_certificate_name: deploymentConfig.sslCertificateName || '',
          ingress_application_gateway: deploymentConfig.ingressApplicationGateway || false,
          app_gateway_name: deploymentConfig.appGatewayName || '',
          app_gateway_sku: deploymentConfig.appGatewaySku || 'WAF_v2',
          app_gateway_min_capacity: deploymentConfig.appGatewayMinCapacity || 1,
          app_gateway_max_capacity: deploymentConfig.appGatewayMaxCapacity || 3,
          ssl_policy_name: deploymentConfig.sslPolicyName || 'AppGwSslPolicy20220101',

          // Tags
          common_tags: this._normalizeTags(deploymentConfig.tags),
        };

      case 'gcp':
        return {
          // Core
          project_id: deploymentConfig.projectId || credentials?.projectId || '',
          kubernetes_version: deploymentConfig.kubernetesVersion || '1.28',

          // Node pool
          machine_type: deploymentConfig.machineType || 'e2-medium',
          disk_size_gb: deploymentConfig.diskSizeGb || 50,

          // Networking
          gke_network: deploymentConfig.gkeNetwork || 'default',
          gke_subnetwork: deploymentConfig.gkeSubnetwork || 'default',

          // VPC
          create_vpc: deploymentConfig.createVpc !== false,
          public_subnet_cidr: deploymentConfig.publicSubnetCidr || '10.2.1.0/24',
          private_subnet_cidr: deploymentConfig.privateSubnetCidr || '10.2.10.0/24',
          pods_cidr: deploymentConfig.podsCidr || '10.4.0.0/14',
          services_cidr: deploymentConfig.servicesCidr || '10.8.0.0/20',
          enable_cloud_nat: deploymentConfig.enableCloudNat !== false,
          enable_private_service_access: deploymentConfig.enablePrivateServiceAccess !== false,

          // Auth
          service_account_key: credentials?.serviceAccountKey || '',

          // Autoscaling
          enable_autoscaling: deploymentConfig.enableAutoscaling !== false,
          min_node_count: deploymentConfig.minNodeCount || 1,
          max_node_count: deploymentConfig.maxNodeCount || 5,

          // Observability
          enable_stackdriver_logging: deploymentConfig.enableStackdriver !== false,
          enable_stackdriver_monitoring: deploymentConfig.enableStackdriver !== false,

          // Container Registry (Artifact Registry)
          enable_container_registry: deploymentConfig.enableContainerRegistry || false,

          // Object Storage (GCS)
          enable_object_storage: deploymentConfig.enableObjectStorage || false,
          gcs_bucket_name: deploymentConfig.gcsBucketName || '',
          gcs_force_destroy: deploymentConfig.gcsForceDestroy || false,

          // SSL (GCP Managed Certificate)
          gcp_managed_certificate_name: deploymentConfig.gcpManagedCertificateName || '',
          gcp_managed_certificate_domains: deploymentConfig.gcpManagedCertificateDomains ||
            (deploymentConfig.externalDomain ? [deploymentConfig.externalDomain] : []),
          enable_managed_certificate: !!(deploymentConfig.gcpManagedCertificateDomains?.length ||
            deploymentConfig.externalDomain),

          // Database (Cloud SQL)
          enable_database: deploymentConfig.enableDatabase || false,
          db_engine: deploymentConfig.dbEngine || 'postgresql',
          db_name: deploymentConfig.dbName || 'zlaws_db',
          db_version: deploymentConfig.dbVersion || '',
          db_tier: deploymentConfig.dbTier || '',
          db_disk_size_gb: deploymentConfig.dbDiskSizeGb || 20,
          db_username: deploymentConfig.dbUsername || 'zlaws_admin',
          db_password: deploymentConfig.dbPassword || '',
          db_backup_retention_days: deploymentConfig.dbBackupRetentionDays || 7,
          db_high_availability: deploymentConfig.dbHighAvailability || false,
          db_deletion_protection: deploymentConfig.dbDeletionProtection !== false,

          // Filestore (NFS)
          enable_filestore: deploymentConfig.enableFilestore || false,
          filestore_tier: deploymentConfig.filestoreTier || 'BASIC_HDD',
          filestore_share_name: deploymentConfig.filestoreShareName || 'zlaws_share',
          filestore_capacity_gb: deploymentConfig.filestoreCapacityGb || 1024,

          // Labels (GCP requires lowercase keys and values)
          common_labels: this._normalizeTags(deploymentConfig.tags, {
            lowercaseKeys: true,
            valueSanitize: /[^a-z0-9-_]/g,
          }),
        };

      case 'digitalocean':
        return {
          // Core
          cluster_version: deploymentConfig.kubernetesVersion || '1.28',
          node_size: deploymentConfig.nodeInstanceType || 's-2vcpu-4gb',
          node_count: deploymentConfig.nodeCount || 3,
          min_node_count: deploymentConfig.minNodeCount || 1,
          max_node_count: deploymentConfig.maxNodeCount || 5,
          enable_autoscaling: deploymentConfig.enableAutoscaling !== false,
          surge_upgrade: deploymentConfig.surgeUpgrade !== false,

          // Auth
          do_token: credentials?.apiToken || '',

          // VPC
          create_vpc: deploymentConfig.createVpc !== false,
          vpc_cidr: deploymentConfig.vpcCidr || '10.3.0.0/16',
          existing_vpc_id: deploymentConfig.existingVpcId || '',

          // Container Registry
          enable_container_registry: deploymentConfig.enableContainerRegistry !== false,
          registry_name: deploymentConfig.registryName || '',
          registry_tier: deploymentConfig.registryTier || 'basic',

          // Object Storage (Spaces — S3-compatible)
          enable_object_storage: deploymentConfig.enableObjectStorage || false,
          spaces_bucket_name: deploymentConfig.spacesBucketName || '',
          do_spaces_access_key: credentials?.spacesAccessKey || '',
          do_spaces_secret_key: credentials?.spacesSecretKey || '',

          // SSL (DigitalOcean Certificate + cert-manager annotation on ingress)
          enable_ssl_certificate: deploymentConfig.enableSslCertificate ||
            deploymentConfig.accessMode === 'external',
          do_certificate_name: deploymentConfig.doCertificateName || '',
          do_certificate_type: deploymentConfig.doCertificateType || 'lets_encrypt',
          do_certificate_domains: deploymentConfig.doCertificateDomains ||
            (deploymentConfig.externalDomain ? [deploymentConfig.externalDomain] : []),

          // Database
          enable_database: deploymentConfig.enableDatabase || false,
          db_engine: deploymentConfig.dbEngine || 'pg',
          db_name: deploymentConfig.dbName || 'zlaws_db',
          db_version: deploymentConfig.dbVersion || '',
          db_size: deploymentConfig.dbSize || 'db-s-1vcpu-2gb',
          db_node_count: deploymentConfig.dbNodeCount || 1,
          db_username: deploymentConfig.dbUsername || 'zlaws_admin',
          enable_connection_pool: deploymentConfig.enableConnectionPool || false,

          // Tags
          common_tags: this._normalizeTags(deploymentConfig.tags),
        };

      case 'linode':
        return {
          // Core
          cluster_version: deploymentConfig.kubernetesVersion || '1.28',
          node_type: deploymentConfig.nodeInstanceType || 'g6-standard-2',
          node_count: deploymentConfig.nodeCount || 3,
          min_node_count: deploymentConfig.minNodeCount || 1,
          max_node_count: deploymentConfig.maxNodeCount || 5,
          enable_autoscaling: deploymentConfig.enableAutoscaling !== false,
          ha_controlplane: deploymentConfig.haControlplane !== false,

          // Auth
          linode_token: credentials?.apiToken || '',

          // VPC
          create_vpc: deploymentConfig.createVpc !== false,
          vpc_subnet_cidr: deploymentConfig.vpcSubnetCidr || '10.4.0.0/20',

          // Object Storage (S3-compatible)
          enable_object_storage: deploymentConfig.enableObjectStorage || false,
          object_bucket_name: deploymentConfig.objectBucketName || '',

          // SSL (Linode NodeBalancer SSL termination)
          enable_ssl: deploymentConfig.enableSsl || deploymentConfig.accessMode === 'external',
          ssl_cert: deploymentConfig.sslCert || '',
          ssl_key: deploymentConfig.sslKey || '',

          // Database
          enable_database: deploymentConfig.enableDatabase || false,
          db_engine: deploymentConfig.dbEngine || 'postgresql',
          db_version: deploymentConfig.dbVersion || '',
          db_type: deploymentConfig.dbType || 'g6-nanode-1',
          db_cluster_size: deploymentConfig.dbClusterSize || 1,
          db_encrypted: deploymentConfig.dbEncrypted !== false,
          db_require_ssl: deploymentConfig.dbRequireSsl !== false,
          db_allow_list: deploymentConfig.dbAllowList || ['0.0.0.0/0'],

          // Tags
          common_tags: this._normalizeTags(deploymentConfig.tags),
        };

      default:
        return {};
    }
  }

  /**
   * Generate Terraform variables (legacy: without credential retrieval)
   * @deprecated Use generateTerraformVars with vault parameters
   */
  generateTerraformVars_legacy(cloudProvider, deploymentConfig) {
    // Convert tags array to object format for Terraform
    let tagsObject = { ManagedBy: 'zlaws-deployer' };
    if (deploymentConfig.tags && Array.isArray(deploymentConfig.tags)) {
      deploymentConfig.tags.forEach(tag => {
        if (tag.key && tag.value) {
          tagsObject[tag.key] = tag.value;
        }
      });
    } else if (deploymentConfig.tags && typeof deploymentConfig.tags === 'object') {
      tagsObject = { ...tagsObject, ...deploymentConfig.tags };
    }

    // Check if this is a re-deployment
    const isRedeployment = deploymentConfig.isRedeployment || deploymentConfig.useExistingResources || false;

    const baseVars = {
      cloud_provider: cloudProvider,
      cluster_name: deploymentConfig.clusterName,
      region: deploymentConfig.region || this._defaultRegion(cloudProvider),
      kubernetes_version: deploymentConfig.kubernetesVersion || '1.34',
      node_count: deploymentConfig.nodeCount || 3,
      node_instance_type: deploymentConfig.nodeInstanceType || this._defaultInstanceType(cloudProvider),
      enable_autoscaling: deploymentConfig.enableAutoscaling !== false,
      min_node_count: deploymentConfig.minNodeCount || 1,
      max_node_count: deploymentConfig.maxNodeCount || 5,
      enable_monitoring: deploymentConfig.enableMonitoring !== false,
      enable_logging: deploymentConfig.enableLogging !== false,
      enable_storage: deploymentConfig.enableStorage !== false,
      enable_managed_database: deploymentConfig.enableRDS !== false,
      enable_rds: deploymentConfig.enableRDS !== false,
      tags: tagsObject,
    };

    // Cloud-specific variables
    switch (cloudProvider) {
      case 'aws':
        return {
          ...baseVars,
          vpc_cidr: deploymentConfig.vpcCidr || '10.0.0.0/16',
          ebs_optimized: deploymentConfig.ebsOptimized !== false,
          enable_nat_gateway: deploymentConfig.enableNatGateway !== false,
          db_allocated_storage: deploymentConfig.dbAllocatedStorage || 20,
          db_engine_version: deploymentConfig.dbEngineVersion || '14.6',
        };

      case 'azure':
        return {
          ...baseVars,
          resource_group: deploymentConfig.resourceGroup || `rg-${deploymentConfig.clusterName}`,
          environment: deploymentConfig.environment || 'production',
          network_policy: deploymentConfig.networkPolicy || 'azure',
          pod_cidr: deploymentConfig.podCidr || '172.17.0.0/16',
          service_cidr: deploymentConfig.serviceCidr || '172.20.0.0/16',
          dns_service_ip: deploymentConfig.dnsServiceIp || '172.20.0.10',
        };

      case 'gcp':
        return {
          ...baseVars,
          project_id: deploymentConfig.projectId,
          gke_network: deploymentConfig.gkeNetwork || 'default',
          enable_stackdriver_logging: deploymentConfig.enableStackdriver !== false,
          enable_stackdriver_monitoring: deploymentConfig.enableStackdriver !== false,
          machine_type: deploymentConfig.machineType || 'e2-medium',
        };

      case 'digitalocean':
        return {
          ...baseVars,
          cluster_version: deploymentConfig.kubernetesVersion || '1.34',
          registry_enabled: deploymentConfig.registryEnabled !== false,
          surge_upgrade: deploymentConfig.surgeUpgrade !== false,
        };

      case 'linode':
        return {
          ...baseVars,
          cluster_version: deploymentConfig.kubernetesVersion || '1.34',
          region: deploymentConfig.region || 'us-east',
          ha_controlplane: deploymentConfig.haControlplane !== false,
        };

      default:
        return baseVars;
    }
  }


  /**
   * Generate Terraform tfvars file
   * @param {object} terraformVars - Terraform variables
   * @returns {string} HCL formatted tfvars
   */
  generateTfvarsContent(terraformVars) {
    const lines = [];

    for (const [key, value] of Object.entries(terraformVars)) {
      if (typeof value === 'string') {
        lines.push(`${key} = "${value}"`);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        lines.push(`${key} = ${value}`);
      } else if (typeof value === 'object') {
        lines.push(`${key} = ${JSON.stringify(value)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Execute Terraform deployment
   * @param {string} deploymentId - Unique deployment ID
   * @param {string} cloudProvider - Cloud provider
   * @param {object} deploymentConfig - Deployment configuration
   * @returns {Promise<object>} Deployment results
   */
  async executeDeployment(deploymentId, cloudProvider, deploymentConfig) {
    try {
      const modulePath = this.getTerraformModulePath(cloudProvider);
      const terraformVars = this.generateTerraformVars(cloudProvider, deploymentConfig);
      const tfvarsContent = this.generateTfvarsContent(terraformVars);

      logger.info('Starting Terraform deployment', { deploymentId, cloudProvider, modulePath });

      // Call Terraform orchestrator script
      const orchestratorPath = path.join(process.cwd(), 'scripts', 'multi-cloud-orchestrator.sh');
      const result = {
        deploymentId,
        cloudProvider,
        startTime: new Date().toISOString(),
        modulePath,
        terraformVars,
        tfvarsContent,
        // Actual execution would be done via script/external process
        status: 'initialized',
      };

      logger.audit('deployment_executed', 'deployment', deploymentId, null, {
        cloudProvider,
        modulePath,
        status: result.status,
      }, 'success');

      return result;
    } catch (error) {
      logger.error('Deployment execution failed', { deploymentId, cloudProvider, error: error.message });
      throw error;
    }
  }

  /**
   * Deploy ZL application stack after Terraform cluster provisioning completes.
   * This is the bridge between infrastructure provisioning (Terraform) and
   * application deployment (kubectl apply).
   *
   * Called as a post-terraform hook when deployment.configuration.deployZLApplication is true.
   *
   * @param {object} deployment — Deployment model instance
   * @param {string} kubeconfigPath — path to kubeconfig for the provisioned cluster
   * @returns {Promise<object>} ZL orchestration result
   */
  async deployZLApplication(deployment, kubeconfigPath) {
    if (!deployment.configuration?.deployZLApplication) {
      logger.info('ZL application deployment not requested, skipping', {
        deploymentId: deployment.id,
      });
      return null;
    }

    logger.info('Starting post-terraform ZL application deployment', {
      deploymentId: deployment.id,
      cloudProvider: deployment.cloudProvider,
    });

    const zlOrchestrator = require('./zlDeploymentOrchestrator');
    return zlOrchestrator.deployZLApplication(
      deployment.id,
      deployment.configuration.zlConfig,
      kubeconfigPath,
    );
  }

  /**
   * Get supported cloud providers
   * @returns {array} List of supported providers
   */
  getSupportedProviders() {
    return Object.keys(this.cloudProviders);
  }

  /**
   * Get cloud provider information
   * @param {string} cloudProvider - Cloud provider
   * @returns {object} Provider information
   */
  getProviderInfo(cloudProvider) {
    const providerInfo = {
      aws: {
        name: 'Amazon Web Services (AWS)',
        description: 'Deploy to AWS EKS (Elastic Kubernetes Service)',
        icon: 'aws',
        regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
        credentialsRequired: ['accessKeyId', 'secretAccessKey', 'region'],
      },
      azure: {
        name: 'Microsoft Azure',
        description: 'Deploy to Azure AKS (Azure Kubernetes Service)',
        icon: 'azure',
        regions: ['eastus', 'westus', 'northeurope', 'southeastasia'],
        credentialsRequired: ['subscriptionId', 'clientId', 'clientSecret', 'tenantId'],
      },
      gcp: {
        name: 'Google Cloud Platform (GCP)',
        description: 'Deploy to Google GKE (Google Kubernetes Engine)',
        icon: 'gcp',
        regions: ['us-central1', 'us-east1', 'europe-west1', 'asia-east1'],
        credentialsRequired: ['projectId', 'serviceAccountKey'],
      },
      digitalocean: {
        name: 'DigitalOcean',
        description: 'Deploy to DigitalOcean Kubernetes (DOKS)',
        icon: 'digitalocean',
        regions: ['nyc1', 'sfo3', 'ams3', 'sgp1'],
        credentialsRequired: ['apiToken'],
      },
      linode: {
        name: 'Linode (Akamai)',
        description: 'Deploy to Linode Kubernetes Engine (LKE)',
        icon: 'linode',
        regions: ['us-east', 'us-central', 'eu-west', 'ap-south'],
        credentialsRequired: ['apiToken'],
      },
    };

    return providerInfo[cloudProvider] || null;
  }

  /**
   * Get all provider information
   * @returns {object} Map of all provider information
   */
  getAllProvidersInfo() {
    const allInfo = {};
    for (const provider of this.getSupportedProviders()) {
      allInfo[provider] = this.getProviderInfo(provider);
    }
    return allInfo;
  }

  /**
   * Initiate deployment with multi-cloud orchestration
   * @param {string} deploymentId - Deployment ID
   * @param {string} cloudProvider - Cloud provider
   * @param {object} deploymentConfig - Deployment configuration with credentials and cluster config
   * @returns {object} Orchestration result
   */
  async initiateDeployment(deploymentId, cloudProvider, deploymentConfig) {
    try {
      logger.info(`Initiating ${cloudProvider} deployment`, { deploymentId });

      // Validate cloud provider
      if (!this.cloudProviders[cloudProvider]) {
        throw new Error(`Unsupported cloud provider: ${cloudProvider}`);
      }

      // Retrieve credentials from vault
      const secretService = this.getSecretService(cloudProvider);
      let credentials;
      
      try {
        credentials = await secretService.retrieveCredentials(deploymentConfig.credentialSecretRefId);
      } catch (error) {
        logger.error(`Failed to retrieve credentials from ${deploymentConfig.vaultType}`, error);
        throw new Error(`Credential retrieval failed: ${error.message}`);
      }

      // Generate Terraform configuration
      const terraformVars = await this.generateTerraformVars(
        deploymentId,
        cloudProvider,
        deploymentConfig.credentialSecretRefId,
        this.cloudProviders[cloudProvider],
        {
          clusterName: deploymentConfig.clusterName,
          region: deploymentConfig.configuration?.clusterConfig?.region || deploymentConfig.configuration?.region || 'us-east-1',
          nodeCount: deploymentConfig.configuration?.nodeCount || 3,
          nodeInstanceType: deploymentConfig.configuration?.nodeInstanceType || 't3.medium',
          kubernetesVersion: deploymentConfig.configuration?.kubernetesVersion || '1.34',
          ...deploymentConfig.configuration,
        }
      );

      logger.info(`Generated Terraform configuration for deployment`, {
        deploymentId,
        cloudProvider,
        tfVarsCount: Object.keys(terraformVars).length,
      });

      // Return orchestration result for async processing
      return {
        deploymentId,
        cloudProvider,
        status: 'initiated',
        orchestratorId: `orch-${deploymentId}`,
        message: `Deployment orchestration initiated on ${cloudProvider}`,
        terraformModulePath: this.getTerraformModulePath(cloudProvider),
        credentialsValidated: Boolean(credentials),
        variablesGenerated: Object.keys(terraformVars).length,
      };
    } catch (error) {
      logger.error(`Deployment initiation failed`, {
        deploymentId,
        cloudProvider,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Execute deployment via Terraform (legacy method)
   * @deprecated Use startTerraformExecution in routes/deployments.js for the full pipeline
   * @param {string} deploymentId - Deployment ID
   * @param {string} cloudProvider - Cloud provider
   * @param {object} config - Deployment configuration
   * @returns {object} Execution result
   */
  async executeDeployment(deploymentId, cloudProvider, config) {
    try {
      const modulePath = this.getTerraformModulePath(cloudProvider);
      const tfvars = this.generateTerraformVars_legacy(cloudProvider, config);
      const tfvarsContent = this.generateTfvarsContent(tfvars);

      logger.info(`Executing Terraform deployment`, {
        deploymentId,
        cloudProvider,
        modulePath,
      });

      // In production, this would execute Terraform commands
      // For now, return execution metadata
      return {
        deploymentId,
        cloudProvider,
        status: 'executing',
        modulePath,
        variablesSet: Object.keys(tfvars).length,
        tfvarsFileSize: tfvarsContent.length,
        message: 'Deployment execution started',
      };
    } catch (error) {
      logger.error(`Terraform execution failed`, { deploymentId, cloudProvider, error: error.message });
      throw error;
    }
  }
}

module.exports = new MultiCloudOrchestrator();
