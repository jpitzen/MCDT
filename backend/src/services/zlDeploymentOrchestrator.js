/**
 * ZL Deployment Orchestrator
 *
 * Takes the ordered manifest array from ZLManifestTemplates.generateAllZLManifests()
 * and applies it to a live Kubernetes cluster with:
 *   - Dependency-aware ordering
 *   - Health-gate waits (ZK quorum, deployment rollout)
 *   - Progress reporting via WebSocket
 *   - Reverse-order rollback on failure (PVC-preserving)
 *
 * Architecture:
 *   deploymentService → multiCloudOrchestrator (terraform) → zlDeploymentOrchestrator (kubectl)
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('./logger');
const websocketServer = require('../config/websocketServer');
const ZLManifestTemplates = require('./zlManifestTemplates');

const execPromise = promisify(exec);

class ZLDeploymentOrchestrator {
  constructor() {
    this.manifestTemplates = new ZLManifestTemplates();
  }

  // ---------------------------------------------------------------------------
  // 3.1 — Core apply loop
  // ---------------------------------------------------------------------------

  /**
   * Deploy the full ZL application stack to a Kubernetes cluster.
   *
   * @param {string}  deploymentId — for logging and WebSocket progress
   * @param {object}  config       — ZL manifest config (see Phase 2 config spec)
   * @param {string}  kubeconfig   — path to kubeconfig file
   * @returns {object} { success, appliedManifests[], failedAt?, rollbackResult?, verification? }
   */
  async deployZLApplication(deploymentId, config, kubeconfig) {
    const manifests = this.manifestTemplates.generateAllZLManifests(config);
    const appliedStack = [];
    const totalSteps = manifests.length;

    logger.deployment(deploymentId, 'zl-deploy',
      `Starting ZL application deployment (${totalSteps} manifest groups)`);

    websocketServer.emitPhaseUpdate(deploymentId, 'zl-application-deploy', {
      totalSteps,
      message: 'Starting ZL application deployment',
    });

    // --- Ordered apply loop ---
    for (const manifest of manifests) {
      try {
        // Phase update: about to apply
        websocketServer.emitPhaseUpdate(deploymentId, `applying-${manifest.kind}`, {
          order: manifest.order,
          name: manifest.name,
        });

        logger.deployment(deploymentId, 'zl-deploy',
          `Applying ${manifest.kind}: ${manifest.name} (${manifest.order}/${totalSteps})`);

        // Write YAML(s) to temp and kubectl apply
        const yamlArray = Array.isArray(manifest.yaml) ? manifest.yaml : [manifest.yaml];
        for (const yamlContent of yamlArray) {
          const tmpFile = this._writeTempYaml(deploymentId, manifest.kind, manifest.name, yamlContent);
          try {
            await this._kubectlApply(tmpFile, kubeconfig, config.namespace);
          } finally {
            this._cleanupTempFile(tmpFile);
          }
        }

        appliedStack.push(manifest);

        // Progress update
        const progress = Math.round((manifest.order / totalSteps) * 100);
        websocketServer.emitProgressUpdate(deploymentId, progress, {
          message: `Applied ${manifest.kind}: ${manifest.name}`,
        });

        // --- Wait gates ---
        if (manifest.waitFor === 'zk-quorum') {
          await this.waitForZKQuorum(
            deploymentId, kubeconfig, config.namespace,
            config.zk?.replicas || 3,
          );
        }

      } catch (error) {
        logger.deployment(deploymentId, 'zl-deploy',
          `Failed applying ${manifest.kind}: ${manifest.name}`, {
            error: error.message,
          });

        websocketServer.emitFailure(deploymentId, error.message, {
          failedAt: manifest.kind,
          failedName: manifest.name,
          order: manifest.order,
        });

        // Rollback everything applied so far
        const rollbackResult = await this.rollback(
          deploymentId, appliedStack, kubeconfig, config.namespace,
        );

        return {
          success: false,
          failedAt: { kind: manifest.kind, name: manifest.name, order: manifest.order },
          error: error.message,
          appliedBeforeFailure: appliedStack.length,
          rollbackResult,
        };
      }
    }

    // --- Post-apply verification ---
    logger.deployment(deploymentId, 'zl-deploy', 'All manifests applied, verifying deployments');

    let verificationResult;
    try {
      verificationResult = await this.verifyAllDeployments(
        deploymentId, kubeconfig, config,
      );
    } catch (verifyError) {
      logger.deployment(deploymentId, 'zl-deploy', 'Post-deploy verification failed', {
        error: verifyError.message,
      });
      verificationResult = { verified: false, error: verifyError.message };
    }

    // --- Build completion data ---
    const completionData = {
      appliedManifests: appliedStack.length,
      totalManifests: totalSteps,
      verification: verificationResult,
    };

    // If external mode, capture ELB hostname
    if (config.accessMode === 'external') {
      try {
        const elbHostname = await this._getServiceExternalIP(
          kubeconfig, config.namespace, 'zlui-service',
        );
        completionData.elbHostname = elbHostname;
        completionData.accessUrl = config.ssl?.enabled
          ? `https://${config.externalDomain}`
          : `http://${elbHostname}`;
      } catch (e) {
        logger.deployment(deploymentId, 'zl-deploy',
          'Could not retrieve ELB hostname', { error: e.message });
      }
    }

    websocketServer.emitCompletion(deploymentId, completionData);

    logger.deployment(deploymentId, 'zl-deploy',
      'ZL application deployment completed', completionData);

    // Cleanup temp directory
    this.cleanupDeploymentTempDir(deploymentId);

    return {
      success: true,
      appliedManifests: appliedStack.map(m => ({
        kind: m.kind, name: m.name, order: m.order,
      })),
      ...completionData,
    };
  }

  // ---------------------------------------------------------------------------
  // 3.2 — ZooKeeper quorum health gate
  // ---------------------------------------------------------------------------

  /**
   * Wait for ZooKeeper quorum to become healthy.
   * Polls pod readiness every 5 s, then verifies via `ruok` four-letter command.
   *
   * @param {string} deploymentId
   * @param {string} kubeconfig
   * @param {string} namespace
   * @param {number} replicas       — expected replica count (default 3)
   * @param {number} timeoutMs      — max wait (default 180 000 ms = 3 min)
   * @returns {boolean} true when quorum healthy
   * @throws {Error} on timeout
   */
  async waitForZKQuorum(deploymentId, kubeconfig, namespace, replicas = 3, timeoutMs = 180000) {
    const startTime = Date.now();
    const pollInterval = 5000;

    logger.deployment(deploymentId, 'zk-health',
      `Waiting for ZK quorum (${replicas} replicas, timeout ${timeoutMs / 1000}s)`);

    websocketServer.emitLog(deploymentId, {
      timestamp: new Date(),
      type: 'health-check',
      message: `Waiting for ZooKeeper quorum (${replicas} pods)`,
    });

    while (Date.now() - startTime < timeoutMs) {
      try {
        const { stdout } = await execPromise(
          `kubectl get pods -l app=zlzookeeper -n ${namespace} ` +
          `--kubeconfig="${kubeconfig}" -o json`,
          { timeout: 15000 },
        );

        const podList = JSON.parse(stdout);
        const readyPods = (podList.items || []).filter(p =>
          p.status?.conditions?.some(c => c.type === 'Ready' && c.status === 'True'),
        );

        logger.deployment(deploymentId, 'zk-health',
          `ZK pods ready: ${readyPods.length}/${replicas}`);

        if (readyPods.length >= replicas) {
          // Verify quorum via ruok
          try {
            const { stdout: ruokResult } = await execPromise(
              `kubectl exec zlzookeeper-0 -n ${namespace} ` +
              `--kubeconfig="${kubeconfig}" -- sh -c "echo ruok | nc localhost 2181"`,
              { timeout: 10000 },
            );

            if (ruokResult.trim() === 'imok') {
              logger.deployment(deploymentId, 'zk-health',
                `ZK quorum healthy: ${readyPods.length}/${replicas} pods ready`);

              websocketServer.emitLog(deploymentId, {
                timestamp: new Date(),
                type: 'health-check',
                message: `ZooKeeper quorum healthy: ${readyPods.length}/${replicas} pods ready`,
              });

              return true;
            }
          } catch (ruokErr) {
            logger.deployment(deploymentId, 'zk-health',
              'ZK pods ready but ruok check failed, retrying', {
                error: ruokErr.message,
              });
          }
        }
      } catch (pollErr) {
        logger.deployment(deploymentId, 'zk-health',
          'ZK health poll error, retrying', { error: pollErr.message });
      }

      await this._sleep(pollInterval);
    }

    throw new Error(
      `ZooKeeper quorum not healthy after ${timeoutMs / 1000}s ` +
      `(expected ${replicas} ready pods)`,
    );
  }

  // ---------------------------------------------------------------------------
  // 3.3 — Application pod readiness verification
  // ---------------------------------------------------------------------------

  /**
   * Wait for a single Deployment to finish rolling out.
   *
   * @param {string} deploymentId   — platform deployment ID (for logging)
   * @param {string} name           — K8s Deployment name (e.g. 'zlserver')
   * @param {string} namespace
   * @param {string} kubeconfig
   * @param {number} timeoutMs      — default 120 000 ms = 2 min
   * @returns {{ name, ready: true }}
   * @throws {Error} on timeout
   */
  async waitForDeploymentReady(deploymentId, name, namespace, kubeconfig, timeoutMs = 120000) {
    const startTime = Date.now();

    logger.deployment(deploymentId, 'readiness',
      `Waiting for deployment ${name} to be ready (timeout ${timeoutMs / 1000}s)`);

    while (Date.now() - startTime < timeoutMs) {
      try {
        const { stdout } = await execPromise(
          `kubectl rollout status deployment/${name} -n ${namespace} ` +
          `--kubeconfig="${kubeconfig}" --timeout=10s`,
          { timeout: 15000 },
        );

        if (stdout.includes('successfully rolled out')) {
          logger.deployment(deploymentId, 'readiness', `Deployment ${name} is ready`);
          return { name, ready: true };
        }
      } catch (err) {
        // Timeout or not yet ready — continue polling
      }

      await this._sleep(5000);
    }

    throw new Error(`Deployment ${name} not ready after ${timeoutMs / 1000}s`);
  }

  /**
   * Verify all ZL application deployments after kubectl apply finishes.
   * Order: zltika → zlserver → zlsearch → zlui (dependency order).
   * If external mode, also checks for LoadBalancer external IP on zlui-service.
   *
   * @param {string} deploymentId
   * @param {string} kubeconfig
   * @param {object} config
   * @returns {{ verified, total, ready, details[] }}
   */
  async verifyAllDeployments(deploymentId, kubeconfig, config) {
    const deploymentNames = ['zltika', 'zlserver', 'zlsearch', 'zlui'];
    const results = [];

    websocketServer.emitPhaseUpdate(deploymentId, 'verifying-deployments', {
      message: 'Verifying application deployments',
    });

    for (const name of deploymentNames) {
      try {
        const result = await this.waitForDeploymentReady(
          deploymentId, name, config.namespace, kubeconfig,
        );
        results.push(result);

        websocketServer.emitLog(deploymentId, {
          timestamp: new Date(),
          type: 'verification',
          message: `✓ ${name} deployment ready`,
        });
      } catch (err) {
        results.push({ name, ready: false, error: err.message });

        websocketServer.emitLog(deploymentId, {
          timestamp: new Date(),
          type: 'verification',
          message: `✗ ${name} deployment not ready: ${err.message}`,
        });
      }
    }

    // If external mode, check for external IP on zlui-service
    if (config.accessMode === 'external') {
      try {
        const elbHostname = await this._getServiceExternalIP(
          kubeconfig, config.namespace, 'zlui-service',
        );
        results.push({ name: 'zlui-service-lb', ready: true, hostname: elbHostname });
      } catch (err) {
        results.push({ name: 'zlui-service-lb', ready: false, error: err.message });
      }
    }

    const readyCount = results.filter(r => r.ready).length;
    const verified = readyCount === results.length;

    return { verified, total: results.length, ready: readyCount, details: results };
  }

  // ---------------------------------------------------------------------------
  // 3.4 — Rollback on failure
  // ---------------------------------------------------------------------------

  /**
   * Delete applied resources in reverse order.
   * PVCs are **skipped** (reclaimPolicy: Retain — data preservation).
   *
   * @param {string}   deploymentId
   * @param {object[]} appliedStack — manifests applied so far
   * @param {string}   kubeconfig
   * @param {string}   namespace
   * @returns {{ rolledBack, skipped, failed, total, details[] }}
   */
  async rollback(deploymentId, appliedStack, kubeconfig, namespace) {
    logger.deployment(deploymentId, 'rollback',
      `Rolling back ${appliedStack.length} applied manifests`);

    websocketServer.emitPhaseUpdate(deploymentId, 'rollback-started', {
      totalToRollback: appliedStack.length,
      message: 'Rolling back applied manifests',
    });

    const results = [];

    for (const manifest of [...appliedStack].reverse()) {
      // Skip PVCs — preserve data
      if (manifest.kind === 'PersistentVolumeClaim') {
        logger.deployment(deploymentId, 'rollback',
          `Skipping PVC ${manifest.name} (data preservation)`);
        results.push({ kind: manifest.kind, name: manifest.name, status: 'skipped-pvc' });
        continue;
      }

      try {
        const yamlArray = Array.isArray(manifest.yaml) ? manifest.yaml : [manifest.yaml];

        for (const yamlContent of yamlArray) {
          const tmpFile = this._writeTempYaml(
            deploymentId, manifest.kind, manifest.name, yamlContent,
          );
          try {
            await execPromise(
              `kubectl delete -f "${tmpFile}" --kubeconfig="${kubeconfig}" ` +
              `-n ${namespace} --ignore-not-found`,
              { timeout: 30000 },
            );
          } finally {
            this._cleanupTempFile(tmpFile);
          }
        }

        results.push({ kind: manifest.kind, name: manifest.name, status: 'deleted' });
        logger.deployment(deploymentId, 'rollback',
          `Deleted ${manifest.kind}: ${manifest.name}`);

      } catch (err) {
        results.push({
          kind: manifest.kind, name: manifest.name,
          status: 'delete-failed', error: err.message,
        });
        logger.deployment(deploymentId, 'rollback',
          `Failed to delete ${manifest.kind}: ${manifest.name}`, {
            error: err.message,
          });
      }
    }

    const rollbackResult = {
      rolledBack: results.filter(r => r.status === 'deleted').length,
      skipped: results.filter(r => r.status === 'skipped-pvc').length,
      failed: results.filter(r => r.status === 'delete-failed').length,
      total: appliedStack.length,
      details: results,
    };

    // Emit rollback-completed event
    websocketServer.emitDeploymentUpdate(deploymentId, 'rollback-completed', rollbackResult);

    logger.deployment(deploymentId, 'rollback', 'Rollback completed', rollbackResult);

    // Cleanup temp files
    this.cleanupDeploymentTempDir(deploymentId);

    return rollbackResult;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Write YAML content to a uniquely named temp file for kubectl apply/delete.
   */
  _writeTempYaml(deploymentId, kind, name, yamlContent) {
    const tmpDir = path.join(os.tmpdir(), 'zlaws-deploy', deploymentId);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const sanitizedName = name.replace(/[^a-zA-Z0-9-]/g, '_');
    const tmpFile = path.join(tmpDir, `${kind}-${sanitizedName}.yaml`);
    fs.writeFileSync(tmpFile, yamlContent, 'utf8');
    return tmpFile;
  }

  /**
   * Remove a single temp file (non-critical failures are swallowed).
   */
  _cleanupTempFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      // Non-critical — temp files cleaned up by OS or cleanupDeploymentTempDir
    }
  }

  /**
   * Remove the entire temp directory for a deployment.
   */
  cleanupDeploymentTempDir(deploymentId) {
    const tmpDir = path.join(os.tmpdir(), 'zlaws-deploy', deploymentId);
    try {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (e) {
      logger.warn(`Failed to clean up temp dir for deployment ${deploymentId}`, {
        error: e.message,
      });
    }
  }

  /**
   * Execute kubectl apply -f on a YAML file.
   * Throws on genuine errors; ignores informational stderr.
   */
  async _kubectlApply(filePath, kubeconfig, namespace) {
    const nsFlag = namespace ? `-n ${namespace}` : '';
    const cmd = `kubectl apply -f "${filePath}" --kubeconfig="${kubeconfig}" ${nsFlag}`;

    const { stdout, stderr } = await execPromise(cmd, { timeout: 60000 });

    // kubectl sometimes writes info to stderr even on success (e.g. "configured", "created")
    if (stderr && !stderr.includes('configured') && !stderr.includes('created') && !stderr.includes('unchanged')) {
      if (stderr.toLowerCase().includes('error') || stderr.toLowerCase().includes('failed')) {
        throw new Error(`kubectl apply failed: ${stderr}`);
      }
    }

    return stdout;
  }

  /**
   * Poll for LoadBalancer external hostname/IP on a Service.
   * AWS returns hostname; other providers may return IP.
   */
  async _getServiceExternalIP(kubeconfig, namespace, serviceName, timeoutMs = 120000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Try hostname first (AWS ELB)
        const { stdout } = await execPromise(
          `kubectl get svc ${serviceName} -n ${namespace} ` +
          `--kubeconfig="${kubeconfig}" ` +
          `-o jsonpath='{.status.loadBalancer.ingress[0].hostname}'`,
          { timeout: 10000 },
        );

        const hostname = stdout.trim().replace(/'/g, '');
        if (hostname && hostname !== '' && hostname !== '<none>') {
          return hostname;
        }

        // Try IP (GCP, Azure, DO, Linode)
        const { stdout: ipOut } = await execPromise(
          `kubectl get svc ${serviceName} -n ${namespace} ` +
          `--kubeconfig="${kubeconfig}" ` +
          `-o jsonpath='{.status.loadBalancer.ingress[0].ip}'`,
          { timeout: 10000 },
        );

        const ip = ipOut.trim().replace(/'/g, '');
        if (ip && ip !== '' && ip !== '<none>') {
          return ip;
        }
      } catch (e) {
        // Not yet assigned — keep polling
      }

      await this._sleep(10000);
    }

    throw new Error(
      `Service ${serviceName} did not receive external IP/hostname within ${timeoutMs / 1000}s`,
    );
  }

  /**
   * Promise-based sleep.
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ---------------------------------------------------------------------------
  // 6.1 — Post-deployment automation
  // ---------------------------------------------------------------------------

  /**
   * Run all post-deployment tasks after pods are healthy:
   *   1. Initialize vault directories on shared file storage
   *   2. Update database paths
   *   3. Upload models (object storage → shared volume sync Job)
   *   4. Rolling restart
   *
   * @param {string} deploymentId
   * @param {string} kubeconfig
   * @param {object} config — ZL manifest config
   * @returns {object} summary of post-deploy tasks
   */
  async runPostDeployTasks(deploymentId, kubeconfig, config) {
    const namespace = config.namespace || 'default';
    const results = {};

    websocketServer.emitPhaseUpdate(deploymentId, 'post-deploy', {
      message: 'Starting post-deployment tasks',
    });

    // 1. Vault directory initialization
    try {
      await this.initVaultDirectories(kubeconfig, namespace);
      results.vaultDirs = { success: true };
      websocketServer.emitLog(deploymentId, {
        timestamp: new Date(), type: 'post-deploy',
        message: '✓ Vault directories initialized on shared volume',
      });
    } catch (err) {
      results.vaultDirs = { success: false, error: err.message };
      logger.deployment(deploymentId, 'post-deploy',
        'Vault directory init failed (non-fatal)', { error: err.message });
    }

    // 2. Database path update
    if (config.database) {
      try {
        await this.updateDatabasePaths(kubeconfig, namespace, config);
        results.dbPaths = { success: true };
        websocketServer.emitLog(deploymentId, {
          timestamp: new Date(), type: 'post-deploy',
          message: '✓ Database paths updated for K8s volume mounts',
        });
      } catch (err) {
        results.dbPaths = { success: false, error: err.message };
        logger.deployment(deploymentId, 'post-deploy',
          'DB path update failed (non-fatal)', { error: err.message });
      }
    }

    // 3. Model upload (if model bucket configured)
    if (config.modelBucket) {
      try {
        await this.triggerModelUpload(deploymentId, kubeconfig, config);
        results.modelUpload = { success: true };
        websocketServer.emitLog(deploymentId, {
          timestamp: new Date(), type: 'post-deploy',
          message: '✓ Model upload Job submitted',
        });
      } catch (err) {
        results.modelUpload = { success: false, error: err.message };
        logger.deployment(deploymentId, 'post-deploy',
          'Model upload failed (non-fatal)', { error: err.message });
      }
    }

    // 4. Rolling restart after config changes
    try {
      await this.rollingRestart(kubeconfig, namespace, deploymentId);
      results.rollingRestart = { success: true };
      websocketServer.emitLog(deploymentId, {
        timestamp: new Date(), type: 'post-deploy',
        message: '✓ Rolling restart completed',
      });
    } catch (err) {
      results.rollingRestart = { success: false, error: err.message };
      logger.deployment(deploymentId, 'post-deploy',
        'Rolling restart failed (non-fatal)', { error: err.message });
    }

    const allOk = Object.values(results).every(r => r.success);

    websocketServer.emitPhaseUpdate(deploymentId, 'post-deploy', {
      status: allOk ? 'completed' : 'completed-with-warnings',
      results,
    });

    return { success: allOk, tasks: results };
  }

  /**
   * Create vault directory structure on the shared file-storage volume via kubectl exec.
   * Targets zlserver-0 (or any pod mounting /var/opt/zlvault).
   */
  async initVaultDirectories(kubeconfig, namespace) {
    const vaultPod = 'zlserver-0';
    const commands = [
      'mkdir -p /var/opt/zlvault/keys',
      'mkdir -p /var/opt/zlvault/certs',
      'mkdir -p /var/opt/zlvault/config',
      'mkdir -p /var/opt/zlvault/models',
      'chmod -R 700 /var/opt/zlvault',
    ];

    for (const cmd of commands) {
      await execPromise(
        `kubectl exec ${vaultPod} -n ${namespace} --kubeconfig="${kubeconfig}" -- sh -c "${cmd}"`,
        { timeout: 30000 },
      );
    }
  }

  /**
   * Execute SQL path-update commands via kubectl exec against a pod with DB connectivity.
   */
  async updateDatabasePaths(kubeconfig, namespace, config) {
    const dbPod = 'zlserver-0';
    const dbHost = config.database?.host || 'localhost';
    const dbPort = config.database?.port || 5432;
    const dbName = config.database?.name || 'zldb';
    const dbUser = config.database?.user || 'pfuser';

    const sqlCommands = [
      `UPDATE ZL_CONFIG SET config_value = '/var/opt/zlvault' WHERE config_key = 'VAULT_PATH'`,
      `UPDATE ZL_CONFIG SET config_value = '/opt/ZipLip/logs' WHERE config_key = 'LOG_PATH'`,
    ];

    for (const sql of sqlCommands) {
      await execPromise(
        `kubectl exec ${dbPod} -n ${namespace} --kubeconfig="${kubeconfig}" -- ` +
        `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -c "${sql}"`,
        { timeout: 30000 },
      );
    }
  }

  /**
   * Generate and apply a Kubernetes Job that syncs models from cloud object storage
   * to the persistent volume. Supports all 5 providers via _buildModelSyncContainer().
   */
  async triggerModelUpload(deploymentId, kubeconfig, config) {
    const cloudProvider = config.cloudProvider || config.cloud_provider || 'aws';
    const namespace = config.namespace || 'default';
    const yaml = require('js-yaml');

    // Build provider-aware sync container spec
    const containerSpec = this._buildModelSyncContainer(cloudProvider, config);
    if (!containerSpec) {
      logger.warn(`[ZLDeploymentOrchestrator] No model sync container available for provider '${cloudProvider}'; skipping model upload.`, { deploymentId });
      return;
    }

    logger.deployment(deploymentId, 'model-upload', `Syncing models via ${cloudProvider} storage`, { image: containerSpec.image });

    const jobManifest = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name: `model-upload-${Date.now()}`,
        namespace,
        labels: { 'app.kubernetes.io/managed-by': 'zlaws', purpose: 'model-upload' },
      },
      spec: {
        ttlSecondsAfterFinished: 300,
        backoffLimit: 3,
        template: {
          spec: {
            containers: [{
              name: 'model-sync',
              image: containerSpec.image,
              command: containerSpec.command,
              env: containerSpec.env,
              volumeMounts: [
                { name: 'zlvault', mountPath: '/var/opt/zlvault' },
                // GCP only: mount the service account key secret
                ...(cloudProvider === 'gcp'
                  ? [{ name: 'gcp-sa-key', mountPath: '/var/secrets/google', readOnly: true }]
                  : []),
              ],
            }],
            volumes: [
              {
                name: 'zlvault',
                persistentVolumeClaim: {
                  claimName: config.pvcName || ((config.cloudProvider || 'aws') === 'aws' ? 'zlvault-efs' : 'zlvault-shared'),
                },
              },
              ...(cloudProvider === 'gcp'
                ? [{ name: 'gcp-sa-key', secret: { secretName: 'gcp-sa-key' } }]
                : []),
            ],
            restartPolicy: 'Never',
            ...(config.serviceAccountName
              ? { serviceAccountName: config.serviceAccountName }
              : {}),
          },
        },
      },
    };

    const tmpFile = this._writeTempYaml(deploymentId, 'Job', 'model-upload', yaml.dump(jobManifest));
    try {
      await this._kubectlApply(tmpFile, kubeconfig, namespace);
    } finally {
      this._cleanupTempFile(tmpFile);
    }
  }

  /**
   * Build the Kubernetes container spec for syncing model files from object storage.
   * Each provider uses the correct CLI image, command, and credentials.
   *
   * @param {string} cloudProvider - One of aws | azure | gcp | digitalocean | linode
   * @param {object} config - Deployment config (bucket, account, container, region, credentials)
   * @returns {{ image: string, command: string[], env: Array<{name:string, value:string}> } | null}
   */
  _buildModelSyncContainer(cloudProvider, config) {
    switch (cloudProvider) {
      // ── AWS S3 ──────────────────────────────────────────────────────────
      case 'aws':
        return {
          image: 'amazon/aws-cli:latest',
          command: [
            'sh', '-c',
            `aws s3 sync s3://${config.modelBucket}/models/ /var/opt/zlvault/models/ --delete --no-progress`,
          ],
          env: [
            { name: 'AWS_ACCESS_KEY_ID',     value: config.accessKeyId     || '' },
            { name: 'AWS_SECRET_ACCESS_KEY', value: config.secretAccessKey || '' },
            { name: 'AWS_DEFAULT_REGION',    value: config.region          || 'us-east-1' },
          ],
        };

      // ── Azure Blob Storage ──────────────────────────────────────────────
      case 'azure':
        return {
          image: 'mcr.microsoft.com/azure-cli:latest',
          command: [
            'sh', '-c',
            `az storage blob download-batch ` +
            `--source ${config.storageContainerName || 'models'} ` +
            `--destination /var/opt/zlvault/models/ ` +
            `--account-name ${config.storageAccountName || ''} ` +
            `--pattern "models/*"`,
          ],
          env: [
            { name: 'AZURE_CLIENT_ID',       value: config.clientId       || '' },
            { name: 'AZURE_CLIENT_SECRET',   value: config.clientSecret   || '' },
            { name: 'AZURE_TENANT_ID',       value: config.tenantId       || '' },
            { name: 'AZURE_SUBSCRIPTION_ID', value: config.subscriptionId || '' },
          ],
        };

      // ── GCP Cloud Storage ───────────────────────────────────────────────
      case 'gcp':
        return {
          image: 'gcr.io/google.com/cloudsdktool/google-cloud-cli:slim',
          command: [
            'sh', '-c',
            `gsutil -m rsync -d -r gs://${config.modelBucket || config.gcsBucketName || ''}/models/ /var/opt/zlvault/models/`,
          ],
          env: [
            { name: 'GOOGLE_APPLICATION_CREDENTIALS', value: '/var/secrets/google/key.json' },
          ],
        };

      // ── DigitalOcean Spaces (S3-compatible) ─────────────────────────────
      case 'digitalocean':
        return {
          image: 'amazon/aws-cli:latest',
          command: [
            'sh', '-c',
            `aws s3 sync s3://${config.spacesBucket || config.spacesBucketName || ''}/models/ /var/opt/zlvault/models/ ` +
            `--delete --no-progress ` +
            `--endpoint-url https://${config.region || 'nyc1'}.digitaloceanspaces.com`,
          ],
          env: [
            { name: 'AWS_ACCESS_KEY_ID',     value: config.spacesAccessKey || '' },
            { name: 'AWS_SECRET_ACCESS_KEY', value: config.spacesSecretKey || '' },
          ],
        };

      // ── Linode Object Storage (S3-compatible) ────────────────────────────
      case 'linode':
        return {
          image: 'amazon/aws-cli:latest',
          command: [
            'sh', '-c',
            `aws s3 sync s3://${config.objectStorageBucket || config.objectBucketName || ''}/models/ /var/opt/zlvault/models/ ` +
            `--delete --no-progress ` +
            `--endpoint-url https://${config.region || 'us-east'}.linodeobjects.com`,
          ],
          env: [
            { name: 'AWS_ACCESS_KEY_ID',     value: config.objectStorageKey    || '' },
            { name: 'AWS_SECRET_ACCESS_KEY', value: config.objectStorageSecret || '' },
          ],
        };

      default:
        logger.warn(`[ZLDeploymentOrchestrator] Unknown cloud provider '${cloudProvider}' for model sync; skipping.`, { cloudProvider });
        return null;
    }
  }

  /**
   * Ensure the GCP service account key secret exists in the target namespace.
   * Called before triggerModelUpload when cloudProvider === 'gcp'.
   *
   * @param {string} deploymentId
   * @param {string} kubeconfig - Path to kubeconfig file
   * @param {string} gcpKeyJson - Raw service account JSON key
   * @param {string} [namespace='default']
   */
  async _ensureGcpSaKeySecret(deploymentId, kubeconfig, gcpKeyJson, namespace = 'default') {
    const yaml = require('js-yaml');
    const secretManifest = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: 'gcp-sa-key', namespace },
      type: 'Opaque',
      data: {
        'key.json': Buffer.from(gcpKeyJson).toString('base64'),
      },
    };

    const tmpFile = this._writeTempYaml(deploymentId, 'Secret', 'gcp-sa-key', yaml.dump(secretManifest));
    try {
      await this._kubectlApply(tmpFile, kubeconfig, namespace);
    } finally {
      this._cleanupTempFile(tmpFile);
    }
  }

  /**
   * Perform ordered rolling restarts of ZL application deployments.
   * Waits for each to become Ready before restarting the next.
   */
  async rollingRestart(kubeconfig, namespace, deploymentId) {
    const order = ['zltika', 'zlserver', 'zlsearch', 'zlui'];

    for (const name of order) {
      logger.deployment(deploymentId, 'post-deploy',
        `Rolling restart: ${name}`);

      await execPromise(
        `kubectl rollout restart deployment/${name} -n ${namespace} --kubeconfig="${kubeconfig}"`,
        { timeout: 30000 },
      );

      await this.waitForDeploymentReady(deploymentId, name, namespace, kubeconfig);

      websocketServer.emitLog(deploymentId, {
        timestamp: new Date(), type: 'post-deploy',
        message: `✓ ${name} restarted and ready`,
      });
    }
  }

  /**
   * Check the health of all ZL application components from outside the cluster.
   * Returns per-component health status.
   *
   * @param {object} deployment — Deployment model instance (with outputs/configuration)
   * @returns {object} health status per component
   */
  async checkHealth(deployment) {
    const outputs = deployment.terraformOutputs || deployment.outputs || {};
    const config = deployment.configuration || {};
    const namespace = config.namespace || 'default';
    const kubeconfig = outputs.kubeconfig_path || outputs.kubeconfigPath;

    const components = ['zltika', 'zlserver', 'zlsearch', 'zlui'];
    const health = {};

    for (const name of components) {
      try {
        const { stdout } = await execPromise(
          `kubectl get deployment ${name} -n ${namespace} --kubeconfig="${kubeconfig}" ` +
          `-o jsonpath='{.status.conditions[?(@.type=="Available")].status}'`,
          { timeout: 10000 },
        );
        health[name] = stdout.trim().replace(/'/g, '') === 'True' ? 'healthy' : 'degraded';
      } catch (e) {
        health[name] = 'unreachable';
      }
    }

    // ZooKeeper health
    try {
      const zkReplicas = config.zk?.replicas || 3;
      const { stdout } = await execPromise(
        `kubectl get statefulset zookeeper -n ${namespace} --kubeconfig="${kubeconfig}" ` +
        `-o jsonpath='{.status.readyReplicas}'`,
        { timeout: 10000 },
      );
      const ready = parseInt(stdout.trim().replace(/'/g, '')) || 0;
      health.zookeeper = ready >= Math.ceil(zkReplicas / 2) ? 'healthy' : 'degraded';
    } catch (e) {
      health.zookeeper = 'unreachable';
    }

    // Database connectivity (via pod exec)
    try {
      await execPromise(
        `kubectl exec zlserver-0 -n ${namespace} --kubeconfig="${kubeconfig}" -- ` +
        `sh -c "pg_isready -h ${config.database?.host || 'localhost'} -p ${config.database?.port || 5432}" 2>/dev/null`,
        { timeout: 10000 },
      );
      health.database = 'connected';
    } catch (e) {
      health.database = 'disconnected';
    }

    return health;
  }
}

module.exports = new ZLDeploymentOrchestrator();
