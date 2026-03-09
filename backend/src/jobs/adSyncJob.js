/**
 * AD Sync Job
 *
 * Scheduled background job that periodically synchronises users from
 * the active AD/LDAP configuration.
 *
 * Usage:
 *   const adSyncJob = require('./jobs/adSyncJob');
 *   adSyncJob.start();          // call once at boot
 *   adSyncJob.restart();        // after config changes
 *   adSyncJob.stop();           // on graceful shutdown
 */
const { AdConfiguration } = require('../models');
const adConfigService = require('../services/adConfigService');
const auditService = require('../services/auditService');
const logger = require('../services/logger');

class AdSyncJob {
  constructor() {
    this._timer = null;
    this._running = false;
    this._intervalMs = null;
    this._configId = null;
  }

  /**
   * Start (or re-start) the sync scheduler.
   * Looks for the active AD configuration; if it has a sync interval > 0
   * it schedules a recurring call to `runSync()`.
   */
  async start() {
    this.stop(); // clear any previous schedule

    try {
      const activeConfig = await AdConfiguration.findOne({
        where: { isActive: true },
      });

      if (!activeConfig) {
        logger.info('[AdSyncJob] No active AD configuration — sync scheduler idle');
        return;
      }

      const intervalMinutes = activeConfig.syncIntervalMinutes || 0;
      if (intervalMinutes <= 0) {
        logger.info('[AdSyncJob] Sync interval is 0 — automatic sync disabled', {
          configId: activeConfig.id,
        });
        return;
      }

      this._configId = activeConfig.id;
      this._intervalMs = intervalMinutes * 60 * 1000;

      logger.info(`[AdSyncJob] Scheduling AD user sync every ${intervalMinutes} minutes`, {
        configId: this._configId,
      });

      // Run immediately on start, then on the interval
      this._scheduleNext();
    } catch (err) {
      logger.error('[AdSyncJob] Failed to initialise sync scheduler', { error: err.message });
    }
  }

  /** Cancel any pending timer. */
  stop() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._configId = null;
    this._intervalMs = null;
  }

  /** Convenience: stop + start (call after config changes). */
  async restart() {
    await this.start();
  }

  // ── Internal ────────────────────────────────────────────────

  _scheduleNext() {
    if (!this._intervalMs) return;
    this._timer = setTimeout(async () => {
      await this.runSync();
      this._scheduleNext(); // queue the next run
    }, this._intervalMs);
    // Allow the process to exit even if timer is pending
    if (this._timer.unref) this._timer.unref();
  }

  /**
   * Execute a single sync cycle against the active AD config.
   */
  async runSync() {
    if (this._running) {
      logger.warn('[AdSyncJob] Sync already in progress — skipping');
      return;
    }
    if (!this._configId) return;

    this._running = true;
    const startTime = Date.now();

    try {
      logger.info('[AdSyncJob] Starting scheduled AD user sync', {
        configId: this._configId,
      });

      const result = await adConfigService.syncUsers(this._configId);

      const durationMs = Date.now() - startTime;
      logger.info('[AdSyncJob] Scheduled sync completed', {
        configId: this._configId,
        durationMs,
        ...result,
      });

      await auditService.adSync('scheduled_sync_completed', {
        configId: this._configId,
        durationMs,
        totalUsers: result?.totalUsers,
        newUsers: result?.newUsers,
        updatedUsers: result?.updatedUsers,
        errors: result?.errors,
      });
    } catch (err) {
      const durationMs = Date.now() - startTime;
      logger.error('[AdSyncJob] Scheduled sync failed', {
        configId: this._configId,
        durationMs,
        error: err.message,
      });

      await auditService.adSync(
        'scheduled_sync_failed',
        { configId: this._configId, durationMs },
        { status: 'failure', errorMessage: err.message },
      );
    } finally {
      this._running = false;
    }
  }
}

module.exports = new AdSyncJob();
