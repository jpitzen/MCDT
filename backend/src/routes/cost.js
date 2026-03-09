/**
 * Cost Optimization Routes
 * 
 * Provides endpoints for cost analysis, optimization recommendations,
 * and financial reporting
 */

const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { authorizeTeam } = require('../middleware/rbac');
const { Deployment } = require('../models');
const CostOptimizationService = require('../services/costOptimizationService');
const { logger } = require('../services');

const costService = new CostOptimizationService();

/**
 * GET /api/cost/deployment/:deploymentId
 * Get cost analysis for a specific deployment
 */
router.get('/deployment/:deploymentId', authenticate, async (req, res) => {
  try {
    const deployment = await Deployment.findByPk(req.params.deploymentId);

    if (!deployment) {
      return res.status(404).json({
        status: 'error',
        message: 'Deployment not found',
        code: 'DEPLOYMENT_NOT_FOUND',
      });
    }

    // Check authorization
    if (deployment.userId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
        code: 'ACCESS_DENIED',
      });
    }

    const cost = await costService.calculateDeploymentCost(deployment);

    res.json({
      status: 'success',
      data: {
        deploymentId: deployment.id,
        deploymentName: deployment.clusterName,
        provider: deployment.cloudProvider,
        cost,
      },
    });

    logger.info('Deployment cost calculated', {
      deploymentId: deployment.id,
      monthlyCost: cost.monthly,
    });
  } catch (error) {
    logger.error('Error calculating deployment cost', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to calculate cost',
      code: 'COST_CALCULATION_ERROR',
    });
  }
});

/**
 * GET /api/cost/deployments
 * Get cost analysis for all user deployments
 */
router.get('/deployments', authenticate, async (req, res) => {
  try {
    const deployments = await Deployment.findAll({
      where: { userId: req.user.id },
    });

    const costs = [];
    let totalMonthlyCost = 0;

    for (const deployment of deployments) {
      const cost = await costService.calculateDeploymentCost(deployment);
      costs.push({
        deploymentId: deployment.id,
        deploymentName: deployment.clusterName,
        provider: deployment.cloudProvider,
        status: deployment.status,
        cost: cost.monthly,
        yearlyEstimate: cost.yearly,
      });
      totalMonthlyCost += cost.monthly;
    }

    costs.sort((a, b) => b.cost - a.cost);

    res.json({
      status: 'success',
      data: {
        deployments: costs,
        summary: {
          totalDeployments: deployments.length,
          totalMonthlyCost: parseFloat(totalMonthlyCost.toFixed(2)),
          totalYearlyCost: parseFloat((totalMonthlyCost * 12).toFixed(2)),
          averageCostPerDeployment: deployments.length > 0
            ? parseFloat((totalMonthlyCost / deployments.length).toFixed(2))
            : 0,
        },
      },
    });

    logger.info('Deployment costs analyzed', {
      userId: req.user.id,
      count: deployments.length,
      totalCost: totalMonthlyCost,
    });
  } catch (error) {
    logger.error('Error analyzing deployment costs', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to analyze costs',
      code: 'COST_ANALYSIS_ERROR',
    });
  }
});

/**
 * GET /api/cost/opportunities
 * Get optimization opportunities for all deployments
 */
router.get('/opportunities', authenticate, async (req, res) => {
  try {
    const deployments = await Deployment.findAll({
      where: { userId: req.user.id },
    });

    const analysis = await costService.analyzeOptimizationOpportunities(deployments);

    res.json({
      status: 'success',
      data: analysis,
    });

    logger.info('Optimization opportunities analyzed', {
      userId: req.user.id,
      opportunitiesCount: analysis.opportunities.length,
      potentialSavings: analysis.totalPotentialSavings,
    });
  } catch (error) {
    logger.error('Error analyzing opportunities', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to analyze opportunities',
      code: 'OPPORTUNITY_ANALYSIS_ERROR',
    });
  }
});

/**
 * GET /api/cost/deployment/:deploymentId/opportunities
 * Get optimization opportunities for specific deployment
 */
router.get('/deployment/:deploymentId/opportunities', authenticate, async (req, res) => {
  try {
    const deployment = await Deployment.findByPk(req.params.deploymentId);

    if (!deployment) {
      return res.status(404).json({
        status: 'error',
        message: 'Deployment not found',
        code: 'DEPLOYMENT_NOT_FOUND',
      });
    }

    if (deployment.userId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
        code: 'ACCESS_DENIED',
      });
    }

    const analysis = await costService.analyzeOptimizationOpportunities([deployment]);
    const opportunity = analysis.opportunities[0] || {
      deploymentId: deployment.id,
      currentCost: 0,
      recommendations: [],
      estimatedSavings: 0,
    };

    res.json({
      status: 'success',
      data: opportunity,
    });

    logger.info('Deployment opportunities identified', {
      deploymentId: deployment.id,
      recommendationCount: opportunity.recommendations.length,
    });
  } catch (error) {
    logger.error('Error analyzing deployment opportunities', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to analyze opportunities',
      code: 'OPPORTUNITY_ANALYSIS_ERROR',
    });
  }
});

/**
 * GET /api/cost/trends/:deploymentId
 * Get cost trends for a deployment
 */
router.get('/trends/:deploymentId', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    if (isNaN(days) || days < 1 || days > 365) {
      return res.status(400).json({
        status: 'error',
        message: 'Days must be between 1 and 365',
        code: 'INVALID_DAYS',
      });
    }

    const deployment = await Deployment.findByPk(req.params.deploymentId);

    if (!deployment) {
      return res.status(404).json({
        status: 'error',
        message: 'Deployment not found',
        code: 'DEPLOYMENT_NOT_FOUND',
      });
    }

    if (deployment.userId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
        code: 'ACCESS_DENIED',
      });
    }

    const trends = await costService.getCostTrends(deployment.id, parseInt(days));

    res.json({
      status: 'success',
      data: trends,
    });

    logger.info('Cost trends retrieved', {
      deploymentId: deployment.id,
      days: parseInt(days),
    });
  } catch (error) {
    logger.error('Error retrieving cost trends', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve trends',
      code: 'TRENDS_ERROR',
    });
  }
});

/**
 * POST /api/cost/compare
 * Compare costs between different configurations
 */
router.post('/compare', authenticate, async (req, res) => {
  try {
    const { configurations } = req.body;

    if (!Array.isArray(configurations) || configurations.length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'At least 2 configurations required for comparison',
        code: 'INVALID_CONFIGURATIONS',
      });
    }

    // Validate each configuration
    for (const config of configurations) {
      if (!config.name || !config.provider || !config.nodeType || !config.nodeCount) {
        return res.status(400).json({
          status: 'error',
          message: 'Each configuration must have name, provider, nodeType, and nodeCount',
          code: 'INVALID_CONFIG_FORMAT',
        });
      }
    }

    const comparison = costService.compareCosts(configurations);

    res.json({
      status: 'success',
      data: comparison,
    });

    logger.info('Cost comparison performed', {
      userId: req.user.id,
      configurationsCount: configurations.length,
    });
  } catch (error) {
    logger.error('Error comparing costs', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to compare costs',
      code: 'COMPARISON_ERROR',
    });
  }
});

/**
 * GET /api/cost/report
 * Generate comprehensive cost optimization report
 */
router.get('/report', authenticate, async (req, res) => {
  try {
    const deployments = await Deployment.findAll({
      where: { userId: req.user.id },
    });

    if (deployments.length === 0) {
      return res.json({
        status: 'success',
        data: {
          timestamp: new Date(),
          summary: {
            totalDeployments: 0,
            totalMonthlySpend: 0,
            totalYearlySpend: 0,
            optimizableDeployments: 0,
          },
          deployments: [],
          recommendations: [],
          financialImpact: {
            potentialMonthlySavings: 0,
            potentialYearlySavings: 0,
            savingsPercentage: '0.0',
          },
        },
      });
    }

    const report = await costService.generateOptimizationReport(deployments);

    res.json({
      status: 'success',
      data: report,
    });

    logger.info('Optimization report generated', {
      userId: req.user.id,
      deploymentCount: deployments.length,
      totalSavings: report.financialImpact.potentialYearlySavings,
    });
  } catch (error) {
    logger.error('Error generating report', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate report',
      code: 'REPORT_ERROR',
    });
  }
});

/**
 * GET /api/cost/export
 * Export cost data as CSV
 */
router.get('/export', authenticate, async (req, res) => {
  try {
    const deployments = await Deployment.findAll({
      where: { userId: req.user.id },
    });

    let csv = 'Deployment Name,Provider,Status,Monthly Cost,Yearly Cost\n';

    let totalMonthly = 0;
    for (const deployment of deployments) {
      const cost = await costService.calculateDeploymentCost(deployment);
      csv += `"${deployment.clusterName}","${deployment.cloudProvider}","${deployment.status}",${cost.monthly},${cost.yearly}\n`;
      totalMonthly += cost.monthly;
    }

    csv += `\n"TOTAL","","","${totalMonthly.toFixed(2)}","${(totalMonthly * 12).toFixed(2)}"\n`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="cost-analysis.csv"');
    res.send(csv);

    logger.info('Cost data exported', {
      userId: req.user.id,
      deploymentCount: deployments.length,
    });
  } catch (error) {
    logger.error('Error exporting cost data', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export data',
      code: 'EXPORT_ERROR',
    });
  }
});

/**
 * POST /api/cost/budget
 * Set budget alert for deployments
 */
router.post('/budget', authenticate, async (req, res) => {
  try {
    const { monthlyBudget, alertThreshold = 0.8 } = req.body;

    if (!monthlyBudget || monthlyBudget <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid monthly budget is required',
        code: 'INVALID_BUDGET',
      });
    }

    if (alertThreshold < 0 || alertThreshold > 1) {
      return res.status(400).json({
        status: 'error',
        message: 'Alert threshold must be between 0 and 1',
        code: 'INVALID_THRESHOLD',
      });
    }

    const deployments = await Deployment.findAll({
      where: { userId: req.user.id },
    });

    let totalCost = 0;
    for (const deployment of deployments) {
      const cost = await costService.calculateDeploymentCost(deployment);
      totalCost += cost.monthly;
    }

    const alertLevel = monthlyBudget * alertThreshold;
    const status = totalCost > alertLevel ? 'warning' : 'ok';

    res.json({
      status: 'success',
      data: {
        monthlyBudget,
        alertThreshold,
        alertLevel,
        currentMonthlySpend: parseFloat(totalCost.toFixed(2)),
        budgetStatus: status,
        percentageUsed: parseFloat(((totalCost / monthlyBudget) * 100).toFixed(1)),
        remainingBudget: parseFloat((monthlyBudget - totalCost).toFixed(2)),
      },
    });

    logger.info('Budget alert set', {
      userId: req.user.id,
      budget: monthlyBudget,
      threshold: alertThreshold,
    });
  } catch (error) {
    logger.error('Error setting budget alert', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to set budget alert',
      code: 'BUDGET_ERROR',
    });
  }
});

/**
 * GET /api/cost/providers
 * Get pricing information for different providers
 */
router.get('/providers', authenticate, async (req, res) => {
  try {
    res.json({
      status: 'success',
      data: {
        providers: [
          {
            name: 'AWS',
            description: 'Amazon Web Services',
            regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
          },
          {
            name: 'GCP',
            description: 'Google Cloud Platform',
            regions: ['us-central1', 'europe-west1', 'asia-east1'],
          },
          {
            name: 'Azure',
            description: 'Microsoft Azure',
            regions: ['eastus', 'westeurope', 'southeastasia'],
          },
        ],
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error retrieving provider info', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve provider information',
      code: 'PROVIDER_INFO_ERROR',
    });
  }
});

/**
 * POST /api/cost/estimate
 * Estimate cost for a deployment configuration
 */
router.post('/estimate', authenticate, async (req, res) => {
  try {
    const { cloudProvider, instanceType, nodeCount, region, storageGB } = req.body;

    if (!cloudProvider || !instanceType || !nodeCount) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: cloudProvider, instanceType, nodeCount',
        code: 'MISSING_FIELDS',
      });
    }

    // Calculate estimated cost using cost service
    const estimate = await costService.estimateDeploymentCost({
      cloudProvider,
      instanceType,
      nodeCount,
      region: region || 'us-east-1',
      storageGB: storageGB || 100
    });

    res.json({
      status: 'success',
      data: {
        estimate,
        breakdown: {
          compute: estimate.computeCost,
          storage: estimate.storageCost,
          network: estimate.networkCost,
          total: estimate.totalCost
        },
        monthly: estimate.monthlyCost,
        yearly: estimate.yearlyCost
      },
      message: 'Cost estimate calculated successfully',
    });
  } catch (error) {
    logger.error('Error estimating cost', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to estimate cost',
      code: 'COST_ESTIMATE_ERROR',
    });
  }
});

/**
 * GET /api/cost/optimizations/:id
 * Get cost optimization recommendations for a deployment
 */
router.get('/optimizations/:id', authenticate, async (req, res) => {
  try {
    const deployment = await Deployment.findByPk(req.params.id);

    if (!deployment) {
      return res.status(404).json({
        status: 'error',
        message: 'Deployment not found',
        code: 'DEPLOYMENT_NOT_FOUND',
      });
    }

    // Get optimization recommendations
    const optimizations = await CostOptimizationService.analyzeDeployment(deployment.id);

    res.json({
      status: 'success',
      data: {
        deploymentId: deployment.id,
        currentCost: optimizations.currentCost,
        potentialSavings: optimizations.potentialSavings,
        recommendations: optimizations.recommendations,
        priority: optimizations.priority
      },
      message: 'Cost optimizations retrieved successfully',
    });
  } catch (error) {
    logger.error('Error retrieving cost optimizations', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve cost optimizations',
      code: 'COST_OPTIMIZATION_ERROR',
    });
  }
});

module.exports = router;
