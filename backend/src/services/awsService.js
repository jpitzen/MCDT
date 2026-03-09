const AWS = require('aws-sdk');
const logger = require('./logger');

/**
 * AWSService - Handles AWS SDK operations for EKS deployment
 */
class AWSService {
  constructor() {
    this.eks = null;
    this.rds = null;
    this.ec2 = null;
    this.ecr = null;
    this.iam = null;
    this.s3 = null;
    this.cloudwatch = null;
  }

  /**
   * Initialize AWS clients with credentials
   * @param {object} credentials - { accessKeyId, secretAccessKey, region }
   */
  initializeClients(credentials) {
    try {
      const awsConfig = {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        region: credentials.region || 'us-east-1',
      };

      AWS.config.update(awsConfig);

      this.eks = new AWS.EKS(awsConfig);
      this.rds = new AWS.RDS(awsConfig);
      this.ec2 = new AWS.EC2(awsConfig);
      this.ecr = new AWS.ECR(awsConfig);
      this.iam = new AWS.IAM(awsConfig);
      this.s3 = new AWS.S3(awsConfig);
      this.cloudwatch = new AWS.CloudWatch(awsConfig);

      logger.info('AWS clients initialized', { region: awsConfig.region });
    } catch (error) {
      logger.error('Failed to initialize AWS clients', error);
      throw error;
    }
  }

  /**
   * Verify AWS credentials are valid
   * @returns {boolean} - True if credentials are valid
   */
  async validateCredentials() {
    try {
      const sts = new AWS.STS();
      await sts.getCallerIdentity().promise();
      logger.info('AWS credentials validated successfully');
      return true;
    } catch (error) {
      logger.error('AWS credentials validation failed', error);
      throw new Error('Invalid AWS credentials');
    }
  }

  /**
   * Create EKS cluster
   * @param {object} params - { clusterName, version, roleArn, resourcesVpcConfig }
   * @returns {object} - EKS cluster details
   */
  async createEKSCluster(params) {
    try {
      const response = await this.eks.createCluster(params).promise();
      logger.info(`EKS cluster created: ${params.clusterName}`, {
        arn: response.cluster.arn,
      });
      return response.cluster;
    } catch (error) {
      logger.error('Failed to create EKS cluster', error);
      throw error;
    }
  }

  /**
   * Describe EKS cluster
   * @param {string} clusterName - Cluster name
   * @returns {object} - EKS cluster details
   */
  async describeEKSCluster(clusterName) {
    try {
      const response = await this.eks.describeCluster({ name: clusterName }).promise();
      return response.cluster;
    } catch (error) {
      logger.error(`Failed to describe EKS cluster: ${clusterName}`, error);
      throw error;
    }
  }

  /**
   * List EKS clusters
   * @returns {array} - List of cluster names
   */
  async listEKSClusters() {
    try {
      const response = await this.eks.listClusters().promise();
      return response.clusters;
    } catch (error) {
      logger.error('Failed to list EKS clusters', error);
      throw error;
    }
  }

  /**
   * Delete EKS cluster
   * @param {string} clusterName - Cluster name
   * @returns {object} - Deletion response
   */
  async deleteEKSCluster(clusterName) {
    try {
      const response = await this.eks.deleteCluster({ name: clusterName }).promise();
      logger.info(`EKS cluster deleted: ${clusterName}`);
      return response.cluster;
    } catch (error) {
      logger.error(`Failed to delete EKS cluster: ${clusterName}`, error);
      throw error;
    }
  }

  /**
   * Create RDS database
   * @param {object} params - RDS database parameters
   * @returns {object} - Database details
   */
  async createRDSDatabase(params) {
    try {
      const response = await this.rds.createDBInstance(params).promise();
      logger.info(`RDS database created: ${params.DBInstanceIdentifier}`, {
        engine: params.Engine,
      });
      return response.DBInstance;
    } catch (error) {
      logger.error('Failed to create RDS database', error);
      throw error;
    }
  }

  /**
   * Describe RDS database
   * @param {string} dbInstanceIdentifier - Database instance identifier
   * @returns {object} - Database details
   */
  async describeRDSDatabase(dbInstanceIdentifier) {
    try {
      const response = await this.rds
        .describeDBInstances({ DBInstanceIdentifier: dbInstanceIdentifier })
        .promise();
      return response.DBInstances[0];
    } catch (error) {
      logger.error(`Failed to describe RDS database: ${dbInstanceIdentifier}`, error);
      throw error;
    }
  }

  /**
   * Delete RDS database
   * @param {string} dbInstanceIdentifier - Database instance identifier
   * @returns {object} - Deletion response
   */
  async deleteRDSDatabase(dbInstanceIdentifier) {
    try {
      const response = await this.rds
        .deleteDBInstance({ DBInstanceIdentifier: dbInstanceIdentifier, SkipFinalSnapshot: true })
        .promise();
      logger.info(`RDS database deleted: ${dbInstanceIdentifier}`);
      return response.DBInstance;
    } catch (error) {
      logger.error(`Failed to delete RDS database: ${dbInstanceIdentifier}`, error);
      throw error;
    }
  }

  /**
   * Create ECR repository
   * @param {string} repositoryName - Repository name
   * @returns {object} - Repository details
   */
  async createECRRepository(repositoryName) {
    try {
      const response = await this.ecr.createRepository({ repositoryName }).promise();
      logger.info(`ECR repository created: ${repositoryName}`);
      return response.repository;
    } catch (error) {
      logger.error(`Failed to create ECR repository: ${repositoryName}`, error);
      throw error;
    }
  }

  /**
   * List ECR repositories
   * @returns {array} - List of repositories
   */
  async listECRRepositories() {
    try {
      const response = await this.ecr.describeRepositories().promise();
      return response.repositories;
    } catch (error) {
      logger.error('Failed to list ECR repositories', error);
      throw error;
    }
  }

  /**
   * Create IAM role
   * @param {object} params - { RoleName, AssumeRolePolicyDocument }
   * @returns {object} - Role details
   */
  async createIAMRole(params) {
    try {
      const response = await this.iam.createRole(params).promise();
      logger.info(`IAM role created: ${params.RoleName}`);
      return response.Role;
    } catch (error) {
      logger.error(`Failed to create IAM role: ${params.RoleName}`, error);
      throw error;
    }
  }

  /**
   * Attach IAM policy to role
   * @param {string} roleName - Role name
   * @param {string} policyArn - Policy ARN
   */
  async attachRolePolicy(roleName, policyArn) {
    try {
      await this.iam.attachRolePolicy({ RoleName: roleName, PolicyArn: policyArn }).promise();
      logger.info(`Policy attached to role: ${roleName}`);
    } catch (error) {
      logger.error(`Failed to attach policy to role: ${roleName}`, error);
      throw error;
    }
  }

  /**
   * Get S3 bucket
   * @param {string} bucketName - Bucket name
   * @returns {object} - Bucket details
   */
  async getS3Bucket(bucketName) {
    try {
      const response = await this.s3.headBucket({ Bucket: bucketName }).promise();
      return response;
    } catch (error) {
      logger.error(`Failed to get S3 bucket: ${bucketName}`, error);
      throw error;
    }
  }

  /**
   * Put CloudWatch metric
   * @param {object} params - { Namespace, MetricName, Value, Unit }
   */
  async putMetric(params) {
    try {
      await this.cloudwatch
        .putMetricData({
          Namespace: params.Namespace,
          MetricData: [
            {
              MetricName: params.MetricName,
              Value: params.Value,
              Unit: params.Unit || 'None',
              Timestamp: new Date(),
            },
          ],
        })
        .promise();

      logger.debug(`CloudWatch metric recorded: ${params.MetricName}`);
    } catch (error) {
      logger.error('Failed to put CloudWatch metric', error);
      // Don't throw - metrics shouldn't break deployments
    }
  }

  /**
   * Check AWS service availability in region
   * @param {string} service - Service name (eks, rds, ec2, etc)
   * @returns {boolean} - True if service is available
   */
  async isServiceAvailable(service) {
    try {
      // Simple availability check - try to list or describe
      switch (service) {
        case 'eks':
          await this.listEKSClusters();
          break;
        case 'rds':
          await this.rds.describeDBInstances().promise();
          break;
        case 'ec2':
          await this.ec2.describeInstances().promise();
          break;
        default:
          return true;
      }

      logger.info(`Service available: ${service}`);
      return true;
    } catch (error) {
      logger.warn(`Service may not be available: ${service}`, { error: error.message });
      return false;
    }
  }

  /**
   * Check AWS quotas and existing resources before deployment
   * @param {object} params - { clusterName, region, configuration }
   * @returns {object} - { valid: boolean, warnings: [], errors: [] }
   */
  async checkDeploymentPrerequisites(params) {
    const result = {
      valid: true,
      warnings: [],
      errors: [],
      quotas: {},
      existingResources: [],
    };

    try {
      // Check VPC quota
      const vpcQuota = await this.checkVpcQuota();
      result.quotas.vpc = vpcQuota;
      if (!vpcQuota.available) {
        result.errors.push(`VPC limit reached: ${vpcQuota.used}/${vpcQuota.limit} VPCs in use. Cannot create new VPC.`);
        result.valid = false;
      } else if (vpcQuota.remaining <= 1) {
        result.warnings.push(`VPC limit nearly reached: ${vpcQuota.used}/${vpcQuota.limit} VPCs in use.`);
      }

      // Check Elastic IP quota (NAT gateways need EIPs)
      const eipQuota = await this.checkEipQuota();
      result.quotas.eip = eipQuota;
      const eipsNeeded = params.configuration?.azCount || 3; // NAT gateway per AZ
      if (eipQuota.remaining < eipsNeeded) {
        result.errors.push(`Elastic IP limit insufficient: ${eipQuota.remaining} available, ${eipsNeeded} needed for NAT gateways.`);
        result.valid = false;
      }

      // Check for existing ECR repository
      if (params.clusterName) {
        const ecrExists = await this.checkEcrRepositoryExists(params.clusterName);
        if (ecrExists) {
          result.existingResources.push({
            type: 'ECR Repository',
            name: params.clusterName,
            message: `ECR repository '${params.clusterName}' already exists. Deployment may fail or need to import existing resource.`,
          });
          result.warnings.push(`ECR repository '${params.clusterName}' already exists.`);
        }
      }

      // Check for existing IAM roles
      if (params.clusterName) {
        const roleNames = [
          `${params.clusterName}-cluster-role`,
          `${params.clusterName}-node-role`,
        ];
        for (const roleName of roleNames) {
          const roleExists = await this.checkIamRoleExists(roleName);
          if (roleExists) {
            result.existingResources.push({
              type: 'IAM Role',
              name: roleName,
              message: `IAM role '${roleName}' already exists. Deployment may fail.`,
            });
            result.errors.push(`IAM role '${roleName}' already exists. Please clean up existing resources or use a different cluster name.`);
            result.valid = false;
          }
        }
      }

      logger.info('AWS deployment prerequisites check completed', {
        valid: result.valid,
        warningCount: result.warnings.length,
        errorCount: result.errors.length,
      });

    } catch (error) {
      logger.error('Error checking AWS deployment prerequisites', { error: error.message });
      result.warnings.push(`Could not fully validate AWS prerequisites: ${error.message}`);
    }

    return result;
  }

  /**
   * Check VPC quota and usage
   * @returns {object} - { limit, used, remaining, available }
   */
  async checkVpcQuota() {
    try {
      // Get current VPC count
      const vpcs = await this.ec2.describeVpcs().promise();
      const used = vpcs.Vpcs.length;

      // Default VPC limit is 5, but can check Service Quotas
      let limit = 5;
      try {
        const quotas = new AWS.ServiceQuotas();
        const quotaResponse = await quotas.getServiceQuota({
          ServiceCode: 'vpc',
          QuotaCode: 'L-F678F1CE', // VPCs per Region
        }).promise();
        limit = quotaResponse.Quota.Value;
      } catch (quotaError) {
        logger.warn('Could not retrieve VPC quota from Service Quotas, using default', { error: quotaError.message });
      }

      return {
        limit,
        used,
        remaining: limit - used,
        available: used < limit,
      };
    } catch (error) {
      logger.error('Error checking VPC quota', { error: error.message });
      throw error;
    }
  }

  /**
   * Check Elastic IP quota and usage
   * @returns {object} - { limit, used, remaining, available }
   */
  async checkEipQuota() {
    try {
      // Get current EIP count
      const eips = await this.ec2.describeAddresses().promise();
      const used = eips.Addresses.length;

      // Default EIP limit is 5, but can check Service Quotas
      let limit = 5;
      try {
        const quotas = new AWS.ServiceQuotas();
        const quotaResponse = await quotas.getServiceQuota({
          ServiceCode: 'ec2',
          QuotaCode: 'L-0263D0A3', // EC2-VPC Elastic IPs
        }).promise();
        limit = quotaResponse.Quota.Value;
      } catch (quotaError) {
        logger.warn('Could not retrieve EIP quota from Service Quotas, using default', { error: quotaError.message });
      }

      return {
        limit,
        used,
        remaining: limit - used,
        available: used < limit,
      };
    } catch (error) {
      logger.error('Error checking EIP quota', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if ECR repository exists
   * @param {string} repositoryName - Repository name
   * @returns {boolean} - True if repository exists
   */
  async checkEcrRepositoryExists(repositoryName) {
    try {
      await this.ecr.describeRepositories({
        repositoryNames: [repositoryName],
      }).promise();
      return true;
    } catch (error) {
      if (error.code === 'RepositoryNotFoundException') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Check if IAM role exists
   * @param {string} roleName - Role name
   * @returns {boolean} - True if role exists
   */
  async checkIamRoleExists(roleName) {
    try {
      await this.iam.getRole({
        RoleName: roleName,
      }).promise();
      return true;
    } catch (error) {
      if (error.code === 'NoSuchEntity') {
        return false;
      }
      throw error;
    }
  }
}

module.exports = new AWSService();
