/**
 * Deployment Template Service
 * 
 * Manages reusable deployment templates for common configurations
 * Supports versioning, validation, and quick-start deployment
 * 
 * Features:
 *  - Create/update/delete templates
 *  - Template versioning
 *  - Parameter validation
 *  - Quick-deploy from template
 *  - Community/custom templates
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

class DeploymentTemplateService {
  constructor() {
    // Built-in templates
    this.builtinTemplates = {
      'eks-basic': {
        id: 'eks-basic',
        name: 'Basic EKS Cluster',
        version: '1.0.0',
        description: 'Minimal EKS cluster with 2 nodes',
        cloudProvider: 'aws',
        category: 'basic',
        config: {
          clusterName: 'my-cluster',
          kubernetesVersion: '1.34',
          nodeCount: 2,
          nodeInstanceType: 't3.medium',
          enableAutoscaling: false,
          enableRDS: false,
          enableMonitoring: true,
          enableLogging: true,
          region: 'us-east-1',
        },
        parameters: [
          {
            name: 'clusterName',
            type: 'string',
            description: 'Kubernetes cluster name',
            required: true,
            pattern: '^[a-z0-9-]{1,63}$',
          },
          {
            name: 'nodeCount',
            type: 'number',
            description: 'Number of worker nodes',
            required: true,
            min: 1,
            max: 100,
            default: 2,
          },
          {
            name: 'nodeInstanceType',
            type: 'string',
            description: 'EC2 instance type for nodes',
            required: true,
            enum: ['t3.small', 't3.medium', 't3.large', 't3.xlarge'],
            default: 't3.medium',
          },
        ],
      },
      'eks-production': {
        id: 'eks-production',
        name: 'Production EKS Cluster',
        version: '1.0.0',
        description: 'Production-grade EKS cluster with auto-scaling and monitoring',
        cloudProvider: 'aws',
        category: 'production',
        config: {
          clusterName: 'prod-cluster',
          kubernetesVersion: '1.34',
          nodeCount: 3,
          minNodeCount: 3,
          maxNodeCount: 10,
          nodeInstanceType: 't3.large',
          enableAutoscaling: true,
          enableRDS: true,
          enableMonitoring: true,
          enableLogging: true,
          region: 'us-east-1',
          tags: {
            Environment: 'production',
            ManagedBy: 'zlaws',
          },
        },
        parameters: [
          {
            name: 'clusterName',
            type: 'string',
            required: true,
            pattern: '^[a-z0-9-]{1,63}$',
          },
          {
            name: 'nodeCount',
            type: 'number',
            required: true,
            min: 3,
            max: 100,
            default: 3,
          },
          {
            name: 'maxNodeCount',
            type: 'number',
            required: true,
            min: 3,
            max: 100,
            default: 10,
          },
        ],
      },
      'gke-basic': {
        id: 'gke-basic',
        name: 'Basic GKE Cluster',
        version: '1.0.0',
        description: 'Minimal Google Kubernetes Engine cluster',
        cloudProvider: 'gcp',
        category: 'basic',
        config: {
          clusterName: 'my-gke-cluster',
          kubernetesVersion: '1.34',
          nodeCount: 2,
          nodeInstanceType: 'n1-standard-1',
          enableAutoscaling: false,
          enableMonitoring: true,
          enableLogging: true,
          zone: 'us-central1-a',
        },
        parameters: [
          {
            name: 'clusterName',
            type: 'string',
            required: true,
            pattern: '^[a-z0-9-]{1,63}$',
          },
          {
            name: 'nodeCount',
            type: 'number',
            required: true,
            min: 1,
            max: 100,
            default: 2,
          },
        ],
      },
      'aks-basic': {
        id: 'aks-basic',
        name: 'Basic AKS Cluster',
        version: '1.0.0',
        description: 'Minimal Azure Kubernetes Service cluster',
        cloudProvider: 'azure',
        category: 'basic',
        config: {
          clusterName: 'my-aks-cluster',
          kubernetesVersion: '1.34',
          nodeCount: 2,
          nodeInstanceType: 'Standard_B2s',
          enableAutoscaling: false,
          enableMonitoring: true,
          enableLogging: true,
          location: 'eastus',
        },
        parameters: [
          {
            name: 'clusterName',
            type: 'string',
            required: true,
            pattern: '^[a-z0-9-]{1,63}$',
          },
          {
            name: 'nodeCount',
            type: 'number',
            required: true,
            min: 1,
            max: 100,
            default: 2,
          },
        ],
      },
    };

    // Custom templates storage (in production, use database)
    this.customTemplates = new Map();

    logger.info('DeploymentTemplateService initialized with builtin templates');
  }

  /**
   * Get all available templates
   */
  getAllTemplates(cloudProvider = null) {
    const all = {
      builtin: Object.values(this.builtinTemplates),
      custom: Array.from(this.customTemplates.values()),
    };

    if (cloudProvider) {
      all.builtin = all.builtin.filter(t => t.cloudProvider === cloudProvider);
      all.custom = all.custom.filter(t => t.cloudProvider === cloudProvider);
    }

    return all;
  }

  /**
   * Get single template by ID
   */
  getTemplate(templateId) {
    return this.builtinTemplates[templateId] || this.customTemplates.get(templateId);
  }

  /**
   * Create custom template
   */
  createTemplate(templateData, userId) {
    const { name, description, cloudProvider, config, parameters, category } = templateData;

    // Validate required fields
    if (!name || !cloudProvider || !config) {
      throw new Error('Template must include name, cloudProvider, and config');
    }

    if (!['aws', 'azure', 'gcp', 'digitalocean', 'linode'].includes(cloudProvider)) {
      throw new Error('Invalid cloud provider');
    }

    // Validate config structure
    if (typeof config !== 'object') {
      throw new Error('Config must be an object');
    }

    // Create template
    const template = {
      id: uuidv4(),
      name,
      description: description || '',
      cloudProvider,
      config,
      parameters: parameters || [],
      category: category || 'custom',
      version: '1.0.0',
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate parameters if provided
    if (parameters) {
      for (const param of parameters) {
        this.validateParameterDefinition(param);
      }
    }

    this.customTemplates.set(template.id, template);

    logger.info(`Custom template created`, {
      templateId: template.id,
      templateName: name,
      userId,
      cloudProvider,
    });

    return template;
  }

  /**
   * Update template
   */
  updateTemplate(templateId, updates, userId) {
    if (this.builtinTemplates[templateId]) {
      throw new Error('Cannot modify built-in templates');
    }

    const template = this.customTemplates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (template.createdBy !== userId) {
      throw new Error('Unauthorized to modify this template');
    }

    // Update fields
    if (updates.name) template.name = updates.name;
    if (updates.description) template.description = updates.description;
    if (updates.config) template.config = { ...template.config, ...updates.config };
    if (updates.parameters) {
      for (const param of updates.parameters) {
        this.validateParameterDefinition(param);
      }
      template.parameters = updates.parameters;
    }

    template.updatedAt = new Date();
    this.customTemplates.set(templateId, template);

    logger.info(`Template updated`, { templateId, userId });

    return template;
  }

  /**
   * Delete template
   */
  deleteTemplate(templateId, userId) {
    if (this.builtinTemplates[templateId]) {
      throw new Error('Cannot delete built-in templates');
    }

    const template = this.customTemplates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (template.createdBy !== userId) {
      throw new Error('Unauthorized to delete this template');
    }

    this.customTemplates.delete(templateId);

    logger.info(`Template deleted`, { templateId, userId });

    return true;
  }

  /**
   * Validate deployment configuration against template
   */
  validateDeploymentConfig(templateId, configOverrides = {}) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Merge template config with overrides
    const finalConfig = { ...template.config, ...configOverrides };

    // Validate all parameters
    const errors = [];
    for (const param of template.parameters) {
      const value = finalConfig[param.name];

      // Check required
      if (param.required && value === undefined) {
        errors.push(`Parameter '${param.name}' is required`);
        continue;
      }

      if (value !== undefined) {
        // Type validation
        if (param.type === 'number' && typeof value !== 'number') {
          errors.push(`Parameter '${param.name}' must be a number`);
          continue;
        }
        if (param.type === 'string' && typeof value !== 'string') {
          errors.push(`Parameter '${param.name}' must be a string`);
          continue;
        }
        if (param.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Parameter '${param.name}' must be a boolean`);
          continue;
        }

        // Pattern validation
        if (param.pattern) {
          const regex = new RegExp(param.pattern);
          if (!regex.test(value)) {
            errors.push(`Parameter '${param.name}' does not match required pattern: ${param.pattern}`);
          }
        }

        // Range validation
        if (param.type === 'number') {
          if (param.min !== undefined && value < param.min) {
            errors.push(`Parameter '${param.name}' must be >= ${param.min}`);
          }
          if (param.max !== undefined && value > param.max) {
            errors.push(`Parameter '${param.name}' must be <= ${param.max}`);
          }
        }

        // Enum validation
        if (param.enum && !param.enum.includes(value)) {
          errors.push(`Parameter '${param.name}' must be one of: ${param.enum.join(', ')}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      finalConfig: errors.length === 0 ? finalConfig : null,
    };
  }

  /**
   * Quick deploy from template
   */
  quickDeploy(templateId, configOverrides = {}, deploymentService, userId) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Validate configuration
    const validation = this.validateDeploymentConfig(templateId, configOverrides);
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join('; ')}`);
    }

    // Create deployment
    const finalConfig = validation.finalConfig;
    const deployment = deploymentService.createDeployment({
      userId,
      clusterName: finalConfig.clusterName,
      cloudProvider: template.cloudProvider,
      configuration: finalConfig,
      templateId,
      templateVersion: template.version,
    });

    logger.info(`Deployment created from template`, {
      templateId,
      deploymentId: deployment.id,
      userId,
    });

    return deployment;
  }

  /**
   * Get template statistics
   */
  getTemplateStats(templateId) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    return {
      templateId,
      name: template.name,
      cloudProvider: template.cloudProvider,
      version: template.version,
      parameterCount: template.parameters?.length || 0,
      isBuiltin: !!this.builtinTemplates[templateId],
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  /**
   * Private: Validate parameter definition
   */
  validateParameterDefinition(param) {
    if (!param.name || !param.type) {
      throw new Error('Parameter must have name and type');
    }

    const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
    if (!validTypes.includes(param.type)) {
      throw new Error(`Invalid parameter type: ${param.type}`);
    }

    if (param.enum && !Array.isArray(param.enum)) {
      throw new Error('Parameter enum must be an array');
    }
  }
}

module.exports = new DeploymentTemplateService();
