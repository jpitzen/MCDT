/**
 * Cost Optimization Service
 * 
 * Analyzes deployment costs, identifies optimization opportunities,
 * and provides recommendations for reducing infrastructure expenses
 */

const { Deployment, DeploymentLog } = require('../models');
// Import logger directly to avoid circular dependency with index.js
const logger = require('./logger');

class CostOptimizationService {
  constructor() {
    // Cloud provider pricing (simplified - can be updated from APIs)
    this.pricing = {
      AWS: {
        ec2: {
          't3.micro': 0.0104,
          't3.small': 0.0208,
          't3.medium': 0.0416,
          't3.large': 0.0832,
          'm5.large': 0.096,
          'm5.xlarge': 0.192,
          'm5.2xlarge': 0.384,
          'c5.large': 0.085,
          'c5.xlarge': 0.17,
          'c5.2xlarge': 0.34,
        },
        ebs: {
          'gp3': 0.08,      // per GB-month
          'gp2': 0.1,
          'io1': 0.125,
          'st1': 0.045,
        },
        elb: 0.0225,        // per hour
        nat: 0.045,         // per hour
        dataTransfer: 0.09, // per GB out
      },
      GCP: {
        compute: {
          'e2-micro': 0.0085,
          'e2-small': 0.017,
          'e2-medium': 0.034,
          'e2-standard-2': 0.067,
          'e2-standard-4': 0.134,
          'n1-standard-1': 0.048,
          'n1-standard-2': 0.095,
          'n1-standard-4': 0.19,
        },
        storage: {
          'standard': 0.02,  // per GB-month
          'balanced': 0.04,
          'ssd': 0.17,
        },
        network: 0.12,       // per GB out
      },
      Azure: {
        vm: {
          'Standard_B1s': 0.012,
          'Standard_B2s': 0.048,
          'Standard_B2ms': 0.096,
          'Standard_D2s_v3': 0.096,
          'Standard_D4s_v3': 0.192,
          'Standard_D8s_v3': 0.384,
        },
        storage: {
          'Standard_LRS': 0.0212, // per GB-month
          'Premium_LRS': 0.123,
          'Standard_GRS': 0.0318,
        },
        bandwidth: 0.087,   // per GB out
      },
    };

    // Optimization rules and recommendations
    this.optimizationRules = [
      {
        id: 'reserved-instances',
        name: 'Use Reserved Instances',
        category: 'commitment',
        savings: 0.40,
        description: 'Purchase reserved instances for long-term predictable workloads',
      },
      {
        id: 'spot-instances',
        name: 'Spot/Preemptible Instances',
        category: 'interruption-tolerance',
        savings: 0.70,
        description: 'Use spot/preemptible instances for fault-tolerant, non-critical workloads',
      },
      {
        id: 'right-size',
        name: 'Right-Size Instances',
        category: 'utilization',
        savings: 0.30,
        description: 'Reduce instance sizes for underutilized nodes',
      },
      {
        id: 'auto-scaling',
        name: 'Enable Auto-Scaling',
        category: 'scaling',
        savings: 0.25,
        description: 'Automatically scale down during off-peak hours',
      },
      {
        id: 'storage-optimization',
        name: 'Optimize Storage',
        category: 'storage',
        savings: 0.35,
        description: 'Use cheaper storage classes for infrequently accessed data',
      },
      {
        id: 'data-transfer',
        name: 'Reduce Data Transfer',
        category: 'network',
        savings: 0.20,
        description: 'Use CDN and reduce cross-region data transfers',
      },
      {
        id: 'idle-resources',
        name: 'Remove Idle Resources',
        category: 'cleanup',
        savings: 0.15,
        description: 'Delete unused VPCs, security groups, and storage volumes',
      },
      {
        id: 'consolidation',
        name: 'Workload Consolidation',
        category: 'efficiency',
        savings: 0.25,
        description: 'Consolidate multiple low-utilization deployments',
      },
    ];
  }

  /**
   * Calculate monthly cost for a deployment
   */
  async calculateDeploymentCost(deployment) {
    try {
      if (!deployment.config || !deployment.config.infrastructure) {
        return {
          monthly: 0,
          breakdown: {},
          details: 'Insufficient configuration data',
        };
      }

      const infra = deployment.config.infrastructure;
      const provider = deployment.provider;

      let totalCost = 0;
      const breakdown = {};

      // Calculate compute costs
      if (infra.nodeCount && infra.nodeType) {
        const computeCost = this._calculateComputeCost(
          provider,
          infra.nodeType,
          infra.nodeCount
        );
        breakdown.compute = computeCost;
        totalCost += computeCost;
      }

      // Calculate storage costs
      if (infra.storageSize) {
        const storageCost = this._calculateStorageCost(
          provider,
          infra.storageSize,
          infra.storageType
        );
        breakdown.storage = storageCost;
        totalCost += storageCost;
      }

      // Calculate network costs
      if (infra.estimatedDataTransfer) {
        const networkCost = this._calculateNetworkCost(
          provider,
          infra.estimatedDataTransfer
        );
        breakdown.network = networkCost;
        totalCost += networkCost;
      }

      // Add load balancer costs
      if (infra.loadBalancer) {
        const lbCost = this._calculateLoadBalancerCost(provider);
        breakdown.loadBalancer = lbCost;
        totalCost += lbCost;
      }

      // Add additional services costs
      if (infra.services && Array.isArray(infra.services)) {
        const servicesCost = this._calculateServicesCost(
          provider,
          infra.services
        );
        breakdown.services = servicesCost;
        totalCost += servicesCost;
      }

      return {
        monthly: parseFloat(totalCost.toFixed(2)),
        yearly: parseFloat((totalCost * 12).toFixed(2)),
        breakdown,
        currency: 'USD',
      };
    } catch (error) {
      logger.error('Error calculating deployment cost', error);
      return {
        monthly: 0,
        breakdown: {},
        error: error.message,
      };
    }
  }

  /**
   * Analyze all deployments for cost optimization opportunities
   */
  async analyzeOptimizationOpportunities(deployments) {
    try {
      const opportunities = [];

      for (const deployment of deployments) {
        const cost = await this.calculateDeploymentCost(deployment);
        const opps = this._generateRecommendations(deployment, cost);
        opportunities.push({
          deploymentId: deployment.id,
          deploymentName: deployment.name,
          currentCost: cost.monthly,
          recommendations: opps,
          estimatedSavings: opps.reduce((sum, opp) => sum + opp.potentialSavings, 0),
        });
      }

      // Sort by estimated savings
      opportunities.sort((a, b) => b.estimatedSavings - a.estimatedSavings);

      return {
        timestamp: new Date(),
        totalOpportunities: opportunities.length,
        totalPotentialSavings: opportunities.reduce((sum, opp) => sum + opp.estimatedSavings, 0),
        opportunities,
      };
    } catch (error) {
      logger.error('Error analyzing optimization opportunities', error);
      throw error;
    }
  }

  /**
   * Get cost trends over time
   */
  async getCostTrends(deploymentId, days = 30) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);
      if (!deployment) {
        throw new Error('Deployment not found');
      }

      const logs = await DeploymentLog.findAll({
        where: {
          deploymentId,
          createdAt: {
            [require('sequelize').Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        },
        order: [['createdAt', 'ASC']],
      });

      const trends = {};
      const dailyCosts = {};

      for (const log of logs) {
        const date = log.createdAt.toISOString().split('T')[0];
        if (!dailyCosts[date]) {
          dailyCosts[date] = [];
        }

        try {
          const cost = await this.calculateDeploymentCost({
            ...deployment,
            config: log.details,
          });
          dailyCosts[date].push(cost.monthly);
        } catch (e) {
          // Skip logs that can't be calculated
        }
      }

      // Calculate daily averages
      for (const [date, costs] of Object.entries(dailyCosts)) {
        const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
        trends[date] = parseFloat(avg.toFixed(2));
      }

      return {
        deploymentId,
        days,
        trends,
        averageDailyCost: Object.values(trends).length > 0
          ? parseFloat(
              (Object.values(trends).reduce((a, b) => a + b, 0) / Object.values(trends).length).toFixed(2)
            )
          : 0,
      };
    } catch (error) {
      logger.error('Error getting cost trends', error);
      throw error;
    }
  }

  /**
   * Compare costs across different configurations
   */
  compareCosts(configurations) {
    try {
      const comparison = [];

      for (const config of configurations) {
        const cost = this._calculateComputeCost(
          config.provider,
          config.nodeType,
          config.nodeCount
        );

        comparison.push({
          name: config.name,
          provider: config.provider,
          nodeType: config.nodeType,
          nodeCount: config.nodeCount,
          monthlyCost: cost,
          yearlyCost: cost * 12,
        });
      }

      comparison.sort((a, b) => a.monthlyCost - b.monthlyCost);

      const cheapest = comparison[0];
      const expensive = comparison[comparison.length - 1];
      const savings = expensive.monthlyCost - cheapest.monthlyCost;

      return {
        configurations: comparison,
        mostCostEffective: cheapest,
        mostExpensive: expensive,
        monthlySavings: parseFloat(savings.toFixed(2)),
        yearlySavings: parseFloat((savings * 12).toFixed(2)),
      };
    } catch (error) {
      logger.error('Error comparing costs', error);
      throw error;
    }
  }

  /**
   * Generate optimization report
   */
  async generateOptimizationReport(deployments) {
    try {
      const report = {
        timestamp: new Date(),
        summary: {},
        deployments: [],
        recommendations: [],
        financialImpact: {},
      };

      let totalCurrentCost = 0;
      let totalPotentialSavings = 0;

      for (const deployment of deployments) {
        const cost = await this.calculateDeploymentCost(deployment);
        const opportunities = this._generateRecommendations(deployment, cost);
        const savings = opportunities.reduce((sum, opp) => sum + opp.potentialSavings, 0);

        report.deployments.push({
          id: deployment.id,
          name: deployment.name,
          provider: deployment.provider,
          currentCost: cost.monthly,
          yearlyCurrentCost: cost.monthly * 12,
          potentialSavings: savings,
          potentialSavingsPercent: ((savings / cost.monthly) * 100).toFixed(1),
          recommendations: opportunities,
        });

        totalCurrentCost += cost.monthly;
        totalPotentialSavings += savings;
      }

      report.summary = {
        totalDeployments: deployments.length,
        totalMonthlySpend: parseFloat(totalCurrentCost.toFixed(2)),
        totalYearlySpend: parseFloat((totalCurrentCost * 12).toFixed(2)),
        optimizableDeployments: report.deployments.filter((d) => d.potentialSavings > 0).length,
      };

      report.financialImpact = {
        potentialMonthlySavings: parseFloat(totalPotentialSavings.toFixed(2)),
        potentialYearlySavings: parseFloat((totalPotentialSavings * 12).toFixed(2)),
        savingsPercentage: ((totalPotentialSavings / totalCurrentCost) * 100).toFixed(1),
      };

      // Top recommendations across all deployments
      const allRecommendations = report.deployments.flatMap((d) => d.recommendations);
      report.recommendations = allRecommendations
        .sort((a, b) => b.potentialSavings - a.potentialSavings)
        .slice(0, 10);

      return report;
    } catch (error) {
      logger.error('Error generating optimization report', error);
      throw error;
    }
  }

  // Private helper methods

  _calculateComputeCost(provider, nodeType, nodeCount) {
    const pricing = this.pricing[provider];
    if (!pricing || !pricing[nodeType]) {
      return 0;
    }

    const hourlyRate = pricing[nodeType];
    return hourlyRate * nodeCount * 730; // 730 hours in a month
  }

  _calculateStorageCost(provider, storageSize, storageType = 'standard') {
    const pricing = this.pricing[provider]?.storage;
    if (!pricing || !pricing[storageType]) {
      return 0;
    }

    return pricing[storageType] * storageSize;
  }

  _calculateNetworkCost(provider, dataTransferGB) {
    const pricing = this.pricing[provider];
    if (!pricing || !pricing.dataTransfer) {
      return 0;
    }

    return pricing.dataTransfer * dataTransferGB;
  }

  _calculateLoadBalancerCost(provider) {
    const pricing = this.pricing[provider];
    if (provider === 'AWS') {
      return pricing.elb * 730; // Monthly
    } else if (provider === 'GCP') {
      return 15; // Fixed cost
    } else if (provider === 'Azure') {
      return 16.44; // Fixed cost
    }
    return 0;
  }

  _calculateServicesCost(provider, services) {
    let total = 0;

    const servicePricing = {
      AWS: { rds: 100, elasticache: 50, documentdb: 150 },
      GCP: { cloudsql: 80, memorystore: 40, firestore: 100 },
      Azure: { sqlserver: 90, cosmosdb: 120, cache: 45 },
    };

    const providerPricing = servicePricing[provider] || {};

    for (const service of services) {
      total += providerPricing[service] || 50;
    }

    return total;
  }

  _generateRecommendations(deployment, cost) {
    const recommendations = [];
    const monthlySpend = cost.monthly;

    // Rule 1: Reserved Instances (for constant workloads)
    if (deployment.config?.infrastructure?.nodeCount >= 3) {
      recommendations.push({
        ruleId: 'reserved-instances',
        title: 'Use Reserved Instances',
        description: 'Your deployment has consistent usage. Consider purchasing reserved instances for 40% savings.',
        potentialSavings: monthlySpend * 0.40,
        priority: 'high',
        effort: 'medium',
      });
    }

    // Rule 2: Spot Instances (for interruptible workloads)
    if (deployment.config?.infrastructure?.workloadType === 'batch' || deployment.config?.infrastructure?.workloadType === 'analytics') {
      recommendations.push({
        ruleId: 'spot-instances',
        title: 'Use Spot/Preemptible Instances',
        description: 'Batch and analytics workloads are ideal for spot instances, saving up to 70%.',
        potentialSavings: monthlySpend * 0.70,
        priority: 'high',
        effort: 'high',
      });
    }

    // Rule 3: Auto-Scaling (for variable workloads)
    if (deployment.config?.infrastructure?.autoScaling === false) {
      recommendations.push({
        ruleId: 'auto-scaling',
        title: 'Enable Auto-Scaling',
        description: 'Enable automatic scaling to reduce costs during off-peak hours.',
        potentialSavings: monthlySpend * 0.25,
        priority: 'medium',
        effort: 'low',
      });
    }

    // Rule 4: Right-size instances
    if (deployment.config?.infrastructure?.nodeType?.includes('2xlarge')) {
      recommendations.push({
        ruleId: 'right-size',
        title: 'Right-Size Instances',
        description: 'Consider using smaller instance types if you have low CPU/memory utilization.',
        potentialSavings: monthlySpend * 0.30,
        priority: 'medium',
        effort: 'medium',
      });
    }

    // Rule 5: Storage optimization
    if (cost.breakdown.storage > monthlySpend * 0.20) {
      recommendations.push({
        ruleId: 'storage-optimization',
        title: 'Optimize Storage Configuration',
        description: 'Consider using cheaper storage classes or data lifecycle policies.',
        potentialSavings: cost.breakdown.storage * 0.35,
        priority: 'medium',
        effort: 'low',
      });
    }

    // Rule 6: Data transfer costs
    if (cost.breakdown.network > monthlySpend * 0.15) {
      recommendations.push({
        ruleId: 'data-transfer',
        title: 'Reduce Data Transfer Costs',
        description: 'Use CDN, optimize data transfer patterns, and consider colocation.',
        potentialSavings: cost.breakdown.network * 0.20,
        priority: 'low',
        effort: 'high',
      });
    }

    return recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }
}

module.exports = CostOptimizationService;
