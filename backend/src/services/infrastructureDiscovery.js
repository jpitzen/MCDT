const AWS = require('aws-sdk');
const { Credential, Deployment, DatabaseCredential } = require('../models');
const credentialService = require('./credentialService');
const logger = require('./logger');

/**
 * Infrastructure Discovery Service
 * Discovers existing cloud resources using stored credentials
 */
class InfrastructureDiscoveryService {
  /**
   * Initialize AWS clients with decrypted credentials
   * @param {object} credential - Credential model instance
   * @returns {object} AWS clients { rds, ec2, eks, s3 }
   */
  async initializeAWSClients(credential) {
    try {
      // Decrypt credentials
      const decrypted = credentialService.decryptCredentials({
        encryptedAccessKeyId: credential.encryptedAccessKeyId,
        encryptedSecretAccessKey: credential.encryptedSecretAccessKey,
        encryptionIv: credential.encryptionIv,
        authTag: credential.authTag,
      });

      const awsConfig = {
        accessKeyId: decrypted.accessKeyId,
        secretAccessKey: decrypted.secretAccessKey,
        region: credential.cloudRegion || credential.awsRegion || 'us-east-1',
      };

      return {
        rds: new AWS.RDS(awsConfig),
        ec2: new AWS.EC2(awsConfig),
        eks: new AWS.EKS(awsConfig),
        ecr: new AWS.ECR(awsConfig),
        s3: new AWS.S3(awsConfig),
        resourceGroups: new AWS.ResourceGroups(awsConfig),
        region: awsConfig.region,
      };
    } catch (error) {
      logger.error('[InfrastructureDiscovery] Failed to initialize AWS clients', { error: error.message });
      throw error;
    }
  }

  /**
   * Discover all RDS database instances
   * @param {object} rdsClient - AWS RDS client
   * @returns {array} List of RDS instances with connection details
   */
  async discoverRDSInstances(rdsClient) {
    try {
      const instances = [];
      let marker = null;

      do {
        const params = marker ? { Marker: marker } : {};
        const response = await rdsClient.describeDBInstances(params).promise();

        for (const db of response.DBInstances) {
          instances.push({
            id: db.DBInstanceIdentifier,
            engine: db.Engine,
            engineVersion: db.EngineVersion,
            status: db.DBInstanceStatus,
            endpoint: db.Endpoint ? {
              host: db.Endpoint.Address,
              port: db.Endpoint.Port,
            } : null,
            databaseName: db.DBName,
            masterUsername: db.MasterUsername,
            instanceClass: db.DBInstanceClass,
            allocatedStorage: db.AllocatedStorage,
            vpcId: db.DBSubnetGroup?.VpcId,
            availabilityZone: db.AvailabilityZone,
            multiAZ: db.MultiAZ,
            publiclyAccessible: db.PubliclyAccessible,
            createdAt: db.InstanceCreateTime,
            tags: db.TagList || [],
          });
        }

        marker = response.Marker;
      } while (marker);

      logger.info(`[InfrastructureDiscovery] Discovered ${instances.length} RDS instances`);
      return instances;
    } catch (error) {
      logger.error('[InfrastructureDiscovery] Failed to discover RDS instances', { error: error.message });
      return [];
    }
  }

  /**
   * Discover all VPCs
   * @param {object} ec2Client - AWS EC2 client
   * @returns {array} List of VPCs
   */
  async discoverVPCs(ec2Client) {
    try {
      const response = await ec2Client.describeVpcs().promise();
      
      const vpcs = response.Vpcs.map(vpc => ({
        id: vpc.VpcId,
        cidr: vpc.CidrBlock,
        isDefault: vpc.IsDefault,
        state: vpc.State,
        tags: vpc.Tags || [],
        name: vpc.Tags?.find(t => t.Key === 'Name')?.Value || vpc.VpcId,
      }));

      logger.info(`[InfrastructureDiscovery] Discovered ${vpcs.length} VPCs`);
      return vpcs;
    } catch (error) {
      logger.error('[InfrastructureDiscovery] Failed to discover VPCs', { error: error.message });
      return [];
    }
  }

  /**
   * Discover all subnets
   * @param {object} ec2Client - AWS EC2 client
   * @returns {array} List of subnets
   */
  async discoverSubnets(ec2Client) {
    try {
      const response = await ec2Client.describeSubnets().promise();
      
      const subnets = response.Subnets.map(subnet => ({
        id: subnet.SubnetId,
        vpcId: subnet.VpcId,
        cidr: subnet.CidrBlock,
        availabilityZone: subnet.AvailabilityZone,
        availableIps: subnet.AvailableIpAddressCount,
        tags: subnet.Tags || [],
        name: subnet.Tags?.find(t => t.Key === 'Name')?.Value || subnet.SubnetId,
        isPublic: subnet.MapPublicIpOnLaunch,
      }));

      logger.info(`[InfrastructureDiscovery] Discovered ${subnets.length} subnets`);
      return subnets;
    } catch (error) {
      logger.error('[InfrastructureDiscovery] Failed to discover subnets', { error: error.message });
      return [];
    }
  }

  /**
   * Discover AWS Resource Groups
   * @param {object} resourceGroupsClient - AWS Resource Groups client
   * @returns {array} List of resource groups
   */
  async discoverResourceGroups(resourceGroupsClient) {
    try {
      const groups = [];
      let nextToken = null;

      do {
        const params = nextToken ? { NextToken: nextToken } : {};
        const response = await resourceGroupsClient.listGroups(params).promise();

        for (const group of response.Groups || []) {
          groups.push({
            name: group.Name,
            arn: group.GroupArn,
            description: group.Description,
          });
        }

        nextToken = response.NextToken;
      } while (nextToken);

      logger.info(`[InfrastructureDiscovery] Discovered ${groups.length} resource groups`);
      return groups;
    } catch (error) {
      logger.error('[InfrastructureDiscovery] Failed to discover resource groups', { error: error.message });
      return [];
    }
  }

  /**
   * Discover EKS clusters
   * @param {object} eksClient - AWS EKS client
   * @returns {array} List of EKS clusters
   */
  async discoverEKSClusters(eksClient) {
    try {
      const response = await eksClient.listClusters().promise();
      const clusters = [];

      for (const clusterName of response.clusters || []) {
        try {
          const details = await eksClient.describeCluster({ name: clusterName }).promise();
          clusters.push({
            name: clusterName,
            arn: details.cluster.arn,
            status: details.cluster.status,
            version: details.cluster.version,
            endpoint: details.cluster.endpoint,
            vpcId: details.cluster.resourcesVpcConfig?.vpcId,
            createdAt: details.cluster.createdAt,
          });
        } catch (err) {
          logger.warn(`[InfrastructureDiscovery] Failed to describe EKS cluster ${clusterName}`, { error: err.message });
        }
      }

      logger.info(`[InfrastructureDiscovery] Discovered ${clusters.length} EKS clusters`);
      return clusters;
    } catch (error) {
      logger.error('[InfrastructureDiscovery] Failed to discover EKS clusters', { error: error.message });
      return [];
    }
  }

  /**
   * Discover all ECR repositories
   * @param {object} ecrClient - AWS ECR client
   * @returns {array} List of ECR repositories
   */
  async discoverECRRepositories(ecrClient) {
    try {
      const repositories = [];
      let nextToken = null;

      do {
        const params = nextToken ? { nextToken } : {};
        const response = await ecrClient.describeRepositories(params).promise();

        for (const repo of response.repositories) {
          // Get repository images count
          let imageCount = 0;
          try {
            const imagesResponse = await ecrClient.listImages({
              repositoryName: repo.repositoryName,
            }).promise();
            imageCount = imagesResponse.imageIds?.length || 0;
          } catch (imgError) {
            logger.warn(`[InfrastructureDiscovery] Failed to count images for ${repo.repositoryName}`);
          }

          repositories.push({
            name: repo.repositoryName,
            arn: repo.repositoryArn,
            uri: repo.repositoryUri,
            registryId: repo.registryId,
            createdAt: repo.createdAt,
            imageTagMutability: repo.imageTagMutability,
            imageScanningConfiguration: repo.imageScanningConfiguration,
            encryptionConfiguration: repo.encryptionConfiguration,
            imageCount,
          });
        }

        nextToken = response.nextToken;
      } while (nextToken);

      logger.info(`[InfrastructureDiscovery] Discovered ${repositories.length} ECR repositories`);
      return repositories;
    } catch (error) {
      logger.error('[InfrastructureDiscovery] Failed to discover ECR repositories', { error: error.message });
      return [];
    }
  }

  /**
   * Discover all infrastructure for a credential
   * @param {string} credentialId - Credential ID
   * @param {string} userId - User ID for authorization
   * @returns {object} Discovered infrastructure
   */
  async discoverAll(credentialId, userId) {
    try {
      const credential = await Credential.findOne({
        where: { id: credentialId, userId, isActive: true },
      });

      if (!credential) {
        throw new Error('Credential not found or not authorized');
      }

      if (!credential.authTag) {
        throw new Error('Legacy credential format - please recreate the credential');
      }

      const clients = await this.initializeAWSClients(credential);

      // Discover all resources in parallel
      const [vpcs, subnets, resourceGroups, rdsInstances, eksClusters, ecrRepositories] = await Promise.all([
        this.discoverVPCs(clients.ec2),
        this.discoverSubnets(clients.ec2),
        this.discoverResourceGroups(clients.resourceGroups),
        this.discoverRDSInstances(clients.rds),
        this.discoverEKSClusters(clients.eks),
        this.discoverECRRepositories(clients.ecr),
      ]);

      return {
        credentialId,
        cloudProvider: credential.cloudProvider,
        region: clients.region,
        discoveredAt: new Date(),
        vpcs,
        subnets,
        resourceGroups,
        rdsInstances,
        eksClusters,
        ecrRepositories,
      };
    } catch (error) {
      logger.error('[InfrastructureDiscovery] Failed to discover infrastructure', { 
        credentialId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get all available databases across all credentials and deployments
   * @param {string} userId - User ID
   * @returns {array} List of all available databases
   */
  async getAllAvailableDatabases(userId) {
    try {
      const databases = [];

      // Get all stored database credentials for this user
      const storedDbCredentials = await DatabaseCredential.findAll({
        where: { userId, isActive: true },
      });

      // Create a lookup map by host+database for quick credential matching
      const credentialLookup = new Map();
      for (const dbCred of storedDbCredentials) {
        const key = `${dbCred.host}:${dbCred.port}:${dbCred.databaseName}`;
        credentialLookup.set(key, {
          id: dbCred.id,
          name: dbCred.name,
          isValid: dbCred.isValid,
          lastValidatedAt: dbCred.lastValidatedAt,
        });
      }

      // 1. Get databases from completed deployments with RDS
      const deployments = await Deployment.findAll({
        where: { 
          userId,
          status: 'completed',
        },
      });

      for (const deployment of deployments) {
        const config = deployment.configuration || {};
        if (config.enableRDS) {
          const host = deployment.terraformOutputs?.rds_endpoint?.split(':')[0] || null;
          const port = this.getDefaultPort(config.dbEngine || 'postgres');
          const dbName = config.dbName || 'zlaws';
          const credKey = `${host}:${port}:${dbName}`;
          const storedCred = credentialLookup.get(credKey);

          databases.push({
            source: 'deployment',
            sourceId: deployment.id,
            sourceName: deployment.clusterName,
            id: `deployment-${deployment.id}`,
            name: dbName,
            engine: config.dbEngine || 'postgres',
            host,
            port,
            username: config.dbUsername || 'admin',
            status: 'deployed',
            cloudProvider: deployment.cloudProvider,
            region: config.awsRegion || deployment.region,
            deploymentId: deployment.id,
            // Database credential info
            hasCredentials: !!storedCred,
            databaseCredentialId: storedCred?.id || null,
            credentialName: storedCred?.name || null,
            credentialValid: storedCred?.isValid || null,
          });
        }
      }

      // 2. Discover databases from cloud credentials
      const credentials = await Credential.findAll({
        where: { userId, isActive: true, cloudProvider: 'aws' },
      });

      for (const credential of credentials) {
        try {
          if (!credential.authTag) continue; // Skip legacy credentials

          const clients = await this.initializeAWSClients(credential);
          const rdsInstances = await this.discoverRDSInstances(clients.rds);

          for (const rds of rdsInstances) {
            // Check if this RDS is already in our deployment list
            const isDeployed = databases.some(
              db => db.host === rds.endpoint?.host && db.source === 'deployment'
            );

            if (!isDeployed && rds.status === 'available') {
              const host = rds.endpoint?.host;
              const port = rds.endpoint?.port;
              const dbName = rds.databaseName || 'postgres';
              const credKey = `${host}:${port}:${dbName}`;
              const storedCred = credentialLookup.get(credKey);

              databases.push({
                source: 'cloud',
                sourceId: credential.id,
                sourceName: credential.name,
                id: `cloud-${credential.id}-${rds.id}`,
                name: dbName,
                engine: rds.engine,
                host,
                port,
                username: rds.masterUsername,
                status: rds.status,
                cloudProvider: 'aws',
                region: clients.region,
                credentialId: credential.id,
                instanceId: rds.id,
                instanceClass: rds.instanceClass,
                multiAZ: rds.multiAZ,
                // Database credential info
                hasCredentials: !!storedCred,
                databaseCredentialId: storedCred?.id || null,
                credentialName: storedCred?.name || null,
                credentialValid: storedCred?.isValid || null,
              });
            }
          }
        } catch (err) {
          logger.warn(`[InfrastructureDiscovery] Failed to discover databases for credential ${credential.id}`, {
            error: err.message,
          });
        }
      }

      logger.info(`[InfrastructureDiscovery] Found ${databases.length} total databases for user`);
      return databases;
    } catch (error) {
      logger.error('[InfrastructureDiscovery] Failed to get all available databases', { error: error.message });
      throw error;
    }
  }

  /**
   * Get default port for database engine
   * @param {string} engine - Database engine type
   * @returns {number} Default port
   */
  getDefaultPort(engine) {
    const ports = {
      postgres: 5432,
      mysql: 3306,
      mariadb: 3306,
      sqlserver: 1433,
      mssql: 1433,
      oracle: 1521,
    };
    return ports[engine?.toLowerCase()] || 5432;
  }
}

module.exports = new InfrastructureDiscoveryService();
