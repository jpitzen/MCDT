/**
 * Health Check Route — /api/health
 *
 * Comprehensive service health endpoint that checks connectivity to all
 * critical backend dependencies:
 *   - PostgreSQL (Sequelize)
 *   - Redis (ioredis / generic)
 *   - HashiCorp Vault
 *
 * Each dependency is checked independently; partial failures are reported as
 * `degraded` while total failure returns `unhealthy`.
 *
 * No authentication required — intended for load-balancer / uptime probes.
 */

const express = require('express');
const { sequelize } = require('../models');
const logger = require('../services/logger');

const router = express.Router();

/**
 * GET /api/health
 * Returns detailed health status of all backend services
 */
router.get('/', async (req, res) => {
  const checks = {};
  let overallHealthy = true;

  // ── 1. Database (PostgreSQL) ──────────────────────────────────────────
  try {
    const start = Date.now();
    await sequelize.authenticate();
    checks.database = {
      status: 'connected',
      responseTimeMs: Date.now() - start,
    };
  } catch (err) {
    overallHealthy = false;
    checks.database = {
      status: 'disconnected',
      error: err.message,
    };
    logger.error('Health check — database unreachable', { error: err.message });
  }

  // ── 2. Redis ──────────────────────────────────────────────────────────
  try {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      // Attempt a lightweight PING without maintaining a persistent client
      const net = require('net');
      const url = new URL(redisUrl);
      const start = Date.now();
      await new Promise((resolve, reject) => {
        const socket = net.createConnection(
          { host: url.hostname, port: parseInt(url.port, 10) || 6379, timeout: 3000 },
          () => { socket.end(); resolve(); }
        );
        socket.on('error', reject);
        socket.on('timeout', () => { socket.destroy(); reject(new Error('timeout')); });
      });
      checks.redis = {
        status: 'connected',
        responseTimeMs: Date.now() - start,
      };
    } else {
      checks.redis = { status: 'not_configured' };
    }
  } catch (err) {
    overallHealthy = false;
    checks.redis = {
      status: 'disconnected',
      error: err.message,
    };
    logger.warn('Health check — Redis unreachable', { error: err.message });
  }

  // ── 3. HashiCorp Vault ────────────────────────────────────────────────
  try {
    const vaultAddr = process.env.VAULT_ADDR;
    if (vaultAddr) {
      const http = require('http');
      const https = require('https');
      const start = Date.now();
      const proto = vaultAddr.startsWith('https') ? https : http;
      await new Promise((resolve, reject) => {
        const vaultReq = proto.get(`${vaultAddr}/v1/sys/health`, { timeout: 3000 }, (resp) => {
          // 200 = initialised+unsealed, 429 = unsealed+standby, 472 = DR secondary
          // 501 = not initialised, 503 = sealed — all mean "reachable"
          resolve(resp.statusCode);
        });
        vaultReq.on('error', reject);
        vaultReq.on('timeout', () => { vaultReq.destroy(); reject(new Error('timeout')); });
      });
      checks.vault = {
        status: 'connected',
        responseTimeMs: Date.now() - start,
      };
    } else {
      checks.vault = { status: 'not_configured' };
    }
  } catch (err) {
    overallHealthy = false;
    checks.vault = {
      status: 'disconnected',
      error: err.message,
    };
    logger.warn('Health check — Vault unreachable', { error: err.message });
  }

  // ── 4. AD / LDAP ──────────────────────────────────────────────────────
  try {
    const { AdConfiguration } = require('../models');
    const activeConfig = await AdConfiguration.findOne({ where: { isActive: true } });
    if (activeConfig) {
      checks.adLdap = {
        status: 'configured',
        configName: activeConfig.name,
        lastTestedAt: activeConfig.lastTestedAt || null,
        lastTestResult: activeConfig.lastTestResult || null,
      };
    } else {
      checks.adLdap = { status: 'not_configured' };
    }
  } catch (err) {
    checks.adLdap = {
      status: 'error',
      error: err.message,
    };
    logger.warn('Health check — AD/LDAP check failed', { error: err.message });
  }

  // ── Overall ───────────────────────────────────────────────────────────
  // "degraded" when at least one configured service is down but DB is up
  const dbUp = checks.database.status === 'connected';
  const overallStatus = !dbUp ? 'unhealthy' : overallHealthy ? 'healthy' : 'degraded';

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    version: require('../../package.json').version || '1.0.0',
    services: checks,
  });
});

module.exports = router;
