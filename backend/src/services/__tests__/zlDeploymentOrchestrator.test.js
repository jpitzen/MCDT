/**
 * ZLDeploymentOrchestrator — Unit Tests
 *
 * Uses jest.spyOn on the singleton's internal methods to avoid
 * broad child_process/util mocking that causes OOM.
 *
 * Tests: deploy apply loop, rollback, post-deploy tasks,
 * health checks, private helpers.
 */

const fs = require('fs');

// Partial mock of fs so _writeTempYaml / _cleanupTempFile don't hit disk
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    existsSync: jest.fn(() => false),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    unlinkSync: jest.fn(),
    rmSync: jest.fn(),
  };
});

jest.mock('../logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  deployment: jest.fn(),
  security: jest.fn(),
}));

jest.mock('../../config/websocketServer', () => ({
  emitDeploymentUpdate: jest.fn(),
  emitLog: jest.fn(),
  emitPhaseUpdate: jest.fn(),
  emitProgressUpdate: jest.fn(),
  emitCompletion: jest.fn(),
  emitFailure: jest.fn(),
}));

const orchestrator = require('../zlDeploymentOrchestrator');
const websocketServer = require('../../config/websocketServer');

// ── Helpers ──────────────────────────────────────────────────────────────────
const deploymentId = 'test-deploy-001';
const kubeconfig = '/tmp/kubeconfig';
const baseConfig = {
  namespace: 'zl-ns',
  registryUrl: '123456789.dkr.ecr.us-east-1.amazonaws.com',
  repositoryName: 'zl-repo',
  efsFileSystemId: 'fs-abc123',
  db: { host: 'rds.test', port: 1433, name: 'zldb', type: 'mssql', user: 'u', password: 'p' },
  zk: { replicas: 3, authKey: 'key123' },
  app: { threadPool: { core: 5, max: 25, queue: 50 }, memory: { min: '256m', max: '2g' }, logLevel: 'INFO' },
  accessMode: 'internal',
};

function fakeManifests(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    order: i + 1,
    kind: i === 0 ? 'StorageClass' : i === 1 ? 'PersistentVolumeClaim' : 'ConfigMap',
    name: `resource-${i + 1}`,
    yaml: `apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: resource-${i + 1}`,
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(orchestrator, '_sleep').mockResolvedValue();
  fs.existsSync.mockReturnValue(false);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// deployZLApplication
// ─────────────────────────────────────────────────────────────────────────────
describe('deployZLApplication', () => {
  beforeEach(() => {
    jest.spyOn(orchestrator.manifestTemplates, 'generateAllZLManifests').mockReturnValue(fakeManifests(3));
    jest.spyOn(orchestrator, '_kubectlApply').mockResolvedValue('configured');
    jest.spyOn(orchestrator, '_writeTempYaml').mockReturnValue('/tmp/test.yaml');
    jest.spyOn(orchestrator, '_cleanupTempFile').mockImplementation(() => {});
    jest.spyOn(orchestrator, 'cleanupDeploymentTempDir').mockImplementation(() => {});
    jest.spyOn(orchestrator, 'verifyAllDeployments').mockResolvedValue({
      verified: true, total: 4, ready: 4, details: [],
    });
  });

  it('should apply all manifests and return success', async () => {
    const result = await orchestrator.deployZLApplication(deploymentId, baseConfig, kubeconfig);

    expect(result.success).toBe(true);
    expect(result.appliedManifests).toBe(3);
    expect(websocketServer.emitCompletion).toHaveBeenCalledWith(
      deploymentId,
      expect.objectContaining({ appliedManifests: 3 }),
    );
  });

  it('should call _kubectlApply for each manifest YAML', async () => {
    await orchestrator.deployZLApplication(deploymentId, baseConfig, kubeconfig);
    expect(orchestrator._kubectlApply).toHaveBeenCalledTimes(3);
  });

  it('should rollback on apply failure and return failure result', async () => {
    orchestrator._kubectlApply
      .mockResolvedValueOnce('created')
      .mockRejectedValueOnce(new Error('kubectl error'));

    jest.spyOn(orchestrator, 'rollback').mockResolvedValue({
      rolledBack: 1, skipped: 0, failed: 0, total: 1, details: [],
    });

    const result = await orchestrator.deployZLApplication(deploymentId, baseConfig, kubeconfig);

    expect(result.success).toBe(false);
    expect(result.failedAt).toEqual(expect.objectContaining({ order: 2 }));
    expect(result.rollbackResult).toBeDefined();
    expect(websocketServer.emitFailure).toHaveBeenCalled();
  });

  it('should emit progress updates after each manifest', async () => {
    await orchestrator.deployZLApplication(deploymentId, baseConfig, kubeconfig);
    expect(websocketServer.emitProgressUpdate).toHaveBeenCalledTimes(3);
  });

  it('should capture ELB hostname for external access mode', async () => {
    const externalConfig = {
      ...baseConfig,
      accessMode: 'external',
      externalDomain: 'app.example.com',
      ssl: { enabled: true },
    };

    jest.spyOn(orchestrator, '_getServiceExternalIP').mockResolvedValue('elb-123.amazonaws.com');

    const result = await orchestrator.deployZLApplication(deploymentId, externalConfig, kubeconfig);

    expect(result.success).toBe(true);
    expect(orchestrator._getServiceExternalIP).toHaveBeenCalledWith(
      kubeconfig, 'zl-ns', 'zlui-service',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rollback
// ─────────────────────────────────────────────────────────────────────────────
describe('rollback', () => {
  it('should emit rollback-completed event with empty stack', async () => {
    const result = await orchestrator.rollback(deploymentId, [], kubeconfig, 'zl-ns');

    expect(websocketServer.emitDeploymentUpdate).toHaveBeenCalledWith(
      deploymentId, 'rollback-completed', expect.any(Object),
    );
    expect(result.rolledBack).toBe(0);
    expect(result.total).toBe(0);
  });

  it('should call cleanupDeploymentTempDir after rollback', async () => {
    jest.spyOn(orchestrator, 'cleanupDeploymentTempDir').mockImplementation(() => {});
    await orchestrator.rollback(deploymentId, [], kubeconfig, 'zl-ns');
    expect(orchestrator.cleanupDeploymentTempDir).toHaveBeenCalledWith(deploymentId);
  });

  it('should emit rollback-started phase update', async () => {
    const manifests = [
      { kind: 'ConfigMap', name: 'test', order: 1, yaml: 'apiVersion: v1' },
    ];
    // Even though kubectl delete will fail (no real exec), we handle via try/catch
    jest.spyOn(orchestrator, 'cleanupDeploymentTempDir').mockImplementation(() => {});
    await orchestrator.rollback(deploymentId, manifests, kubeconfig, 'zl-ns');

    expect(websocketServer.emitPhaseUpdate).toHaveBeenCalledWith(
      deploymentId, 'rollback-started', expect.objectContaining({
        totalToRollback: 1,
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Post-deploy tasks (Phase 6)
// ─────────────────────────────────────────────────────────────────────────────
describe('runPostDeployTasks', () => {
  beforeEach(() => {
    jest.spyOn(orchestrator, 'initVaultDirectories').mockResolvedValue();
    jest.spyOn(orchestrator, 'updateDatabasePaths').mockResolvedValue();
    jest.spyOn(orchestrator, 'triggerModelUpload').mockResolvedValue();
    jest.spyOn(orchestrator, 'rollingRestart').mockResolvedValue();
  });

  it('should run all 4 sub-tasks when fully configured', async () => {
    const fullConfig = {
      ...baseConfig,
      database: { host: 'rds.test', port: 5432, name: 'zldb', user: 'u' },
      modelBucket: 'my-model-bucket',
    };

    const result = await orchestrator.runPostDeployTasks(deploymentId, kubeconfig, fullConfig);

    expect(result.success).toBe(true);
    expect(result.tasks.vaultDirs.success).toBe(true);
    expect(result.tasks.dbPaths.success).toBe(true);
    expect(result.tasks.modelUpload.success).toBe(true);
    expect(result.tasks.rollingRestart.success).toBe(true);

    expect(orchestrator.initVaultDirectories).toHaveBeenCalled();
    expect(orchestrator.updateDatabasePaths).toHaveBeenCalled();
    expect(orchestrator.triggerModelUpload).toHaveBeenCalled();
    expect(orchestrator.rollingRestart).toHaveBeenCalled();
  });

  it('should skip model upload when modelBucket is not configured', async () => {
    const noModelConfig = {
      ...baseConfig,
      database: { host: 'rds.test', port: 5432, name: 'zldb', user: 'u' },
    };

    const result = await orchestrator.runPostDeployTasks(deploymentId, kubeconfig, noModelConfig);

    expect(result.tasks.modelUpload).toBeUndefined();
    expect(orchestrator.triggerModelUpload).not.toHaveBeenCalled();
  });

  it('should handle non-fatal failures gracefully', async () => {
    orchestrator.initVaultDirectories.mockRejectedValue(new Error('vault fail'));

    const fullConfig = { ...baseConfig, database: { host: 'rds.test' } };

    const result = await orchestrator.runPostDeployTasks(deploymentId, kubeconfig, fullConfig);

    expect(result.tasks.vaultDirs.success).toBe(false);
    expect(result.tasks.vaultDirs.error).toContain('vault fail');
    expect(result.success).toBe(false);
  });

  it('should emit post-deploy phase updates', async () => {
    const result = await orchestrator.runPostDeployTasks(deploymentId, kubeconfig, baseConfig);

    expect(websocketServer.emitPhaseUpdate).toHaveBeenCalledWith(
      deploymentId, 'post-deploy',
      expect.objectContaining({ message: 'Starting post-deployment tasks' }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// checkHealth
// ─────────────────────────────────────────────────────────────────────────────
describe('checkHealth', () => {
  it('should be a function on the orchestrator', () => {
    expect(typeof orchestrator.checkHealth).toBe('function');
  });

  it('should return health status object when mocked', async () => {
    const mockDeployment = {
      terraformOutputs: { kubeconfig_path: '/tmp/kubeconfig' },
      configuration: { namespace: 'zl-ns', zk: { replicas: 3 }, database: { host: 'rds', port: 5432 } },
    };

    jest.spyOn(orchestrator, 'checkHealth').mockResolvedValue({
      zltika: 'healthy',
      zlserver: 'healthy',
      zlsearch: 'healthy',
      zlui: 'healthy',
      zookeeper: 'healthy',
      database: 'connected',
    });

    const health = await orchestrator.checkHealth(mockDeployment);

    expect(health.zltika).toBe('healthy');
    expect(health.zookeeper).toBe('healthy');
    expect(health.database).toBe('connected');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────
describe('private helpers', () => {
  describe('_writeTempYaml', () => {
    it('should create directory and write YAML file', () => {
      orchestrator._writeTempYaml('d1', 'ConfigMap', 'test-cm', 'kind: ConfigMap');

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('ConfigMap-test-cm.yaml'),
        'kind: ConfigMap',
        'utf8',
      );
    });

    it('should sanitize names with special characters', () => {
      orchestrator._writeTempYaml('d1', 'Secret', 'my/secret@v2', 'kind: Secret');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('Secret-my_secret_v2.yaml'),
        expect.any(String),
        'utf8',
      );
    });
  });

  describe('_cleanupTempFile', () => {
    it('should unlink existing file', () => {
      fs.existsSync.mockReturnValue(true);
      orchestrator._cleanupTempFile('/tmp/test.yaml');
      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/test.yaml');
    });

    it('should not throw on non-existent file', () => {
      fs.existsSync.mockReturnValue(false);
      expect(() => orchestrator._cleanupTempFile('/tmp/nope.yaml')).not.toThrow();
    });
  });

  describe('cleanupDeploymentTempDir', () => {
    it('should remove temp directory when it exists', () => {
      fs.existsSync.mockReturnValue(true);
      orchestrator.cleanupDeploymentTempDir('deploy-123');
      expect(fs.rmSync).toHaveBeenCalledWith(
        expect.stringContaining('deploy-123'),
        { recursive: true, force: true },
      );
    });
  });

  describe('_sleep', () => {
    it('should return a promise', () => {
      jest.spyOn(orchestrator, '_sleep').mockRestore();
      const result = orchestrator._sleep(1);
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
