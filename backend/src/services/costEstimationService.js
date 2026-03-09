const logger = require('./logger');

/**
 * CostEstimationService - Calculate estimated monthly costs for deployments
 * Based on AWS, Azure, GCP pricing for common resources
 */
class CostEstimationService {
  constructor() {
    // AWS pricing (USD/month, approximate)
    this.awsPricing = {
      compute: {
        't3.micro': 7.3,
        't3.small': 14.6,
        't3.medium': 29.2,
        't3.large': 58.4,
        't3.xlarge': 116.8,
        'm5.large': 69.6,
        'm5.xlarge': 139.2,
        'm5.2xlarge': 278.4,
        'm5.4xlarge': 556.8,
      },
      storage: {
        gp3: 0.08, // per GB/month
        gp2: 0.10,
        io1: 0.125,
        io2: 0.125,
      },
      database: {
        'db.t3.micro': 11.8,
        'db.t3.small': 23.6,
        'db.t3.medium': 47.2,
        'db.t3.large': 94.4,
        'db.m5.large': 104.4,
        'db.m5.xlarge': 208.8,
        'db.m5.2xlarge': 417.6,
        // SQL Server pricing (includes license)
        'sqlserver-ex-db.t3.micro': 0, // Free tier eligible
        'sqlserver-ex-db.t3.small': 23.6,
        'sqlserver-ex-db.t3.medium': 47.2,
        'sqlserver-se-db.t3.medium': 147.2, // Standard Edition with license
        'sqlserver-se-db.m5.large': 304.4,
        'sqlserver-ee-db.m5.large': 804.4, // Enterprise Edition with license
      },
      natGateway: 32.4, // per NAT Gateway
      loadBalancer: 16.2, // ALB/NLB
      fileStorage: 0.30, // EFS per GB
      objectStorage: 0.023, // S3 Standard per GB
    };

    // Azure pricing (USD/month, approximate)
    this.azurePricing = {
      compute: {
        'Standard_B2s': 30.4,
        'Standard_B2ms': 60.8,
        'Standard_D2s_v3': 70.0,
        'Standard_D4s_v3': 140.0,
        'Standard_D8s_v3': 280.0,
      },
      storage: {
        Premium_LRS: 0.135, // per GB/month
        Standard_LRS: 0.045,
      },
      database: {
        GP_Gen5_2: 200.0, // General Purpose 2 vCores
        GP_Gen5_4: 400.0,
        GP_Gen5_8: 800.0,
        BC_Gen5_2: 600.0, // Business Critical 2 vCores
        BC_Gen5_4: 1200.0,
      },
      natGateway: 35.0,
      loadBalancer: 18.0,
      fileStorage: 0.18, // Azure Files per GB
      objectStorage: 0.018, // Blob Storage per GB
    };

    // GCP pricing (USD/month, approximate)
    this.gcpPricing = {
      compute: {
        'e2-micro': 6.7,
        'e2-small': 13.4,
        'e2-medium': 26.8,
        'e2-standard-2': 48.6,
        'e2-standard-4': 97.2,
        'n1-standard-2': 48.5,
        'n1-standard-4': 97.0,
      },
      storage: {
        'pd-standard': 0.04, // per GB/month
        'pd-ssd': 0.17,
        'pd-balanced': 0.10,
      },
      database: {
        'db-n1-standard-1': 51.3,
        'db-n1-standard-2': 102.6,
        'db-n1-standard-4': 205.2,
        'db-custom-2-7680': 85.0,
        'db-custom-4-15360': 170.0,
      },
      natGateway: 45.0,
      loadBalancer: 18.0,
      fileStorage: 0.20, // Filestore per GB
      objectStorage: 0.020, // Cloud Storage per GB
    };
  }

  /**
   * Calculate total estimated monthly cost for a deployment
   * @param {string} cloudProvider - 'aws', 'azure', or 'gcp'
   * @param {object} configuration - Deployment configuration
   * @returns {object} - { totalCost, breakdown: { compute, storage, database, networking, other } }
   */
  calculateMonthlyCost(cloudProvider, configuration) {
    try {
      const breakdown = {
        compute: 0,
        storage: 0,
        database: 0,
        networking: 0,
        monitoring: 0,
        other: 0,
      };

      // Calculate compute costs (Kubernetes nodes + additional VMs)
      breakdown.compute = this.calculateComputeCost(cloudProvider, configuration);

      // Calculate storage costs
      breakdown.storage = this.calculateStorageCost(cloudProvider, configuration);

      // Calculate database costs
      breakdown.database = this.calculateDatabaseCost(cloudProvider, configuration);

      // Calculate networking costs
      breakdown.networking = this.calculateNetworkingCost(cloudProvider, configuration);

      // Calculate monitoring costs (approximate)
      if (configuration.enableMonitoring) {
        breakdown.monitoring = 10.0; // CloudWatch/Azure Monitor/Stackdriver basic costs
      }

      // Calculate total
      const totalCost = Object.values(breakdown).reduce((sum, cost) => sum + cost, 0);

      logger.info('Cost estimation calculated', {
        cloudProvider,
        totalCost: totalCost.toFixed(2),
        breakdown,
      });

      return {
        totalCost: parseFloat(totalCost.toFixed(2)),
        breakdown,
        currency: 'USD',
        period: 'month',
      };
    } catch (error) {
      logger.error('Failed to calculate cost estimation', { error: error.message, cloudProvider });
      // Return safe defaults on error
      return {
        totalCost: 0,
        breakdown: { compute: 0, storage: 0, database: 0, networking: 0, monitoring: 0, other: 0 },
        currency: 'USD',
        period: 'month',
        error: 'Cost estimation unavailable',
      };
    }
  }

  calculateComputeCost(cloudProvider, config) {
    let cost = 0;
    const pricing = this.getPricingTable(cloudProvider);

    // Kubernetes worker nodes
    const nodeCount = config.nodeCount || 2;
    const nodeInstanceType = config.nodeInstanceType || (cloudProvider === 'aws' ? 't3.medium' : 'Standard_B2ms');
    const nodePrice = pricing.compute[nodeInstanceType] || 30.0; // Default fallback
    cost += nodePrice * nodeCount;

    // Additional VMs
    if (config.enableAdditionalVMs && config.vmCount) {
      const vmInstanceType = config.vmInstanceType || nodeInstanceType;
      const vmPrice = pricing.compute[vmInstanceType] || 30.0;
      cost += vmPrice * config.vmCount;
    }

    return cost;
  }

  calculateStorageCost(cloudProvider, config) {
    let cost = 0;
    const pricing = this.getPricingTable(cloudProvider);

    // Block storage (EBS/Azure Disk/Persistent Disk)
    if (config.enableBlockStorage) {
      const blockSize = config.blockStorageSize || 100; // GB
      const blockType = config.blockStorageType || (cloudProvider === 'aws' ? 'gp3' : 'Premium_LRS');
      const blockPrice = pricing.storage[blockType] || 0.10;
      cost += blockSize * blockPrice;
    }

    // File storage (EFS/Azure Files/Filestore)
    if (config.enableFileStorage) {
      const fileSize = config.fileStorageSize || 100; // GB
      cost += fileSize * pricing.fileStorage;
    }

    // Object storage (S3/Blob/GCS)
    if (config.enableObjectStorage) {
      const objectSize = config.objectStorageSize || 100; // GB (estimate)
      cost += objectSize * pricing.objectStorage;
    }

    // Node disk storage (each node has attached disk)
    const nodeCount = config.nodeCount || 2;
    const diskSizeGB = config.diskSizeGB || 100;
    const diskType = cloudProvider === 'aws' ? 'gp3' : 'Premium_LRS';
    const diskPrice = pricing.storage[diskType] || 0.10;
    cost += nodeCount * diskSizeGB * diskPrice;

    return cost;
  }

  calculateDatabaseCost(cloudProvider, config) {
    let cost = 0;

    if (!config.enableRDS || !config.dbInstanceClass) {
      return cost;
    }

    const pricing = this.getPricingTable(cloudProvider);
    const dbEngine = config.dbEngine || 'postgres';
    
    // Special handling for SQL Server with licensing
    let dbKey = config.dbInstanceClass;
    if (cloudProvider === 'aws' && dbEngine.startsWith('sqlserver')) {
      dbKey = `${dbEngine}-${config.dbInstanceClass}`;
    }

    const dbPrice = pricing.database[dbKey] || pricing.database[config.dbInstanceClass] || 50.0;
    cost += dbPrice;

    // Multi-AZ doubles the cost
    if (config.dbMultiAZ) {
      cost *= 2;
    }

    // Storage costs for database
    const storageSize = config.dbAllocatedStorage || 20; // GB
    const storagePrice = cloudProvider === 'aws' ? 0.115 : 0.125; // RDS storage pricing
    cost += storageSize * storagePrice;

    // Backup storage (approximate - first 100GB free for AWS)
    if (config.dbBackupRetentionDays > 0 && storageSize > 100) {
      cost += (storageSize - 100) * 0.095; // Backup storage cost
    }

    return cost;
  }

  calculateNetworkingCost(cloudProvider, config) {
    let cost = 0;
    const pricing = this.getPricingTable(cloudProvider);

    // NAT Gateway
    if (config.enableNATGateway) {
      const natCount = config.publicSubnets?.length || 2;
      cost += pricing.natGateway * natCount;
    }

    // Load Balancer
    if (config.enableLoadBalancer) {
      cost += pricing.loadBalancer;
    }

    // Data transfer out (approximate - 100GB/month estimate)
    const dataTransferOut = 100; // GB
    const transferCost = 0.09; // per GB (first 10TB tier)
    cost += dataTransferOut * transferCost;

    return cost;
  }

  getPricingTable(cloudProvider) {
    switch (cloudProvider) {
      case 'aws':
        return this.awsPricing;
      case 'azure':
        return this.azurePricing;
      case 'gcp':
        return this.gcpPricing;
      default:
        return this.awsPricing; // Default fallback
    }
  }

  /**
   * Get pricing info for a specific resource
   * @param {string} cloudProvider 
   * @param {string} category - 'compute', 'storage', 'database'
   * @param {string} resourceType 
   * @returns {number} - Price per month
   */
  getResourcePrice(cloudProvider, category, resourceType) {
    const pricing = this.getPricingTable(cloudProvider);
    if (!pricing[category]) {
      return 0;
    }
    return pricing[category][resourceType] || 0;
  }
}

module.exports = new CostEstimationService();
