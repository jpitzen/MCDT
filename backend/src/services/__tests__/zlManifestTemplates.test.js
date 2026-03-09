/**
 * ZLManifestTemplates — Unit Tests
 *
 * Covers the ZL-specific template layer:
 *   - Storage classes (EBS + EFS)
 *   - PVCs (EFS-backed)
 *   - DB config (ConfigMap + Secret — single source of truth)
 *   - ZL App config
 *   - ZK client/server config (quorum entries)
 *   - Access mode branching (internal vs external)
 *   - Services, deployments, secrets, service accounts
 *   - generateAllZLManifests ordering
 */

const yaml = require('js-yaml');
const ZLManifestTemplates = require('../zlManifestTemplates');

describe('ZLManifestTemplates', () => {
  const baseConfig = {
    namespace: 'zl-ns',
    registryUrl: '123456789.dkr.ecr.us-east-1.amazonaws.com',
    repositoryName: 'zl-repo',
    efsFileSystemId: 'fs-abc123',
    db: {
      host: 'test-rds.amazonaws.com',
      port: 1433,
      name: 'zldb',
      type: 'mssql',
      user: 'testuser',
      password: 'testpass123',
    },
    zk: { replicas: 3, authKey: 'testauthkey' },
    app: {
      threadPool: { core: 10, max: 50, queue: 100 },
      memory: { min: '512m', max: '4g' },
      logLevel: 'INFO',
    },
    accessMode: 'internal',
    imageTags: {
      zlzookeeper: 'latest',
      zlserver: 'latest',
      zlsearch: 'latest',
      zlui: 'latest',
      zltika: 'latest',
    },
    clusterName: 'test-cluster',
  };

  let zlt;

  beforeEach(() => {
    zlt = new ZLManifestTemplates();
  });

  // =========================================================================
  // 2.1 — Storage Classes
  // =========================================================================
  describe('generateZLStorageClasses', () => {
    it('should return exactly 2 storage classes', () => {
      const result = zlt.generateZLStorageClasses(baseConfig);
      expect(result).toHaveLength(2);
    });

    it('should create ebs-sc with gp3 as default class', () => {
      const [ebsYaml] = zlt.generateZLStorageClasses(baseConfig);
      const parsed = yaml.load(ebsYaml);

      expect(parsed.kind).toBe('StorageClass');
      expect(parsed.metadata.name).toBe('ebs-sc');
      expect(parsed.provisioner).toBe('ebs.csi.aws.com');
      expect(parsed.parameters.type).toBe('gp3');
      expect(parsed.metadata.annotations['storageclass.kubernetes.io/is-default-class']).toBe('true');
    });

    it('should create efs-sc with file system ID', () => {
      const [, efsYaml] = zlt.generateZLStorageClasses(baseConfig);
      const parsed = yaml.load(efsYaml);

      expect(parsed.metadata.name).toBe('efs-sc');
      expect(parsed.provisioner).toBe('efs.csi.aws.com');
      expect(parsed.parameters.fileSystemId).toBe('fs-abc123');
      expect(parsed.reclaimPolicy).toBe('Retain');
    });
  });

  // =========================================================================
  // 2.2 — PVCs
  // =========================================================================
  describe('generateZLPVCs', () => {
    it('should return 3 EFS-backed PVCs', () => {
      const result = zlt.generateZLPVCs(baseConfig);
      expect(result).toHaveLength(3);

      const names = result.map(y => yaml.load(y).metadata.name);
      expect(names).toContain('zluilogs-efs');
      expect(names).toContain('zlvault-efs');
      expect(names).toContain('zlserverlogs-efs');
    });

    it('should use ReadWriteMany access mode for EFS', () => {
      const result = zlt.generateZLPVCs(baseConfig);
      result.forEach(y => {
        const parsed = yaml.load(y);
        expect(parsed.spec.accessModes).toContain('ReadWriteMany');
        expect(parsed.spec.storageClassName).toBe('efs-sc');
      });
    });
  });

  // =========================================================================
  // 2.3 — DB Config
  // =========================================================================
  describe('generateZLDBConfig', () => {
    it('should return [configMap, secret]', () => {
      const result = zlt.generateZLDBConfig(baseConfig);
      expect(result).toHaveLength(2);

      const cm = yaml.load(result[0]);
      const secret = yaml.load(result[1]);

      expect(cm.kind).toBe('ConfigMap');
      expect(cm.metadata.name).toBe('db-config');
      expect(secret.kind).toBe('Secret');
      expect(secret.metadata.name).toBe('db-secret');
    });

    it('should set DB connection info in ConfigMap', () => {
      const [cmYaml] = zlt.generateZLDBConfig(baseConfig);
      const cm = yaml.load(cmYaml);

      expect(cm.data.DB_HOST).toBe('test-rds.amazonaws.com');
      expect(cm.data.DB_PORT).toBe('1433');
      expect(cm.data.DB_NAME).toBe('zldb');
      expect(cm.data.DB_TYPE).toBe('mssql');
      expect(cm.data.DB_USER).toBe('testuser');
    });

    it('should set password in Secret stringData', () => {
      const [, secretYaml] = zlt.generateZLDBConfig(baseConfig);
      const secret = yaml.load(secretYaml);

      expect(secret.stringData.DB_PASSWORD).toBe('testpass123');
    });
  });

  // =========================================================================
  // 2.4 — ZL App Config
  // =========================================================================
  describe('generateZLAppConfig', () => {
    it('should create zlapp-config ConfigMap with ZLApp.cfg', () => {
      const result = zlt.generateZLAppConfig(baseConfig);
      const parsed = yaml.load(result);

      expect(parsed.kind).toBe('ConfigMap');
      expect(parsed.metadata.name).toBe('zlapp-config');
      expect(parsed.data['ZLApp.cfg']).toBeDefined();
    });

    it('should include thread pool and memory settings', () => {
      const result = zlt.generateZLAppConfig(baseConfig);
      const parsed = yaml.load(result);
      const cfg = parsed.data['ZLApp.cfg'];

      expect(cfg).toContain('_cfg.thread.pool.core = 10');
      expect(cfg).toContain('_cfg.thread.pool.max = 50');
      expect(cfg).toContain('_cfg.memory.min = 512m');
      expect(cfg).toContain('_cfg.memory.max = 4g');
    });
  });

  // =========================================================================
  // 2.5 — ZK Client Config
  // =========================================================================
  describe('generateZKClientConfig', () => {
    it('should create zkclient-config with 4 config files', () => {
      const result = zlt.generateZKClientConfig(baseConfig);
      const parsed = yaml.load(result);

      expect(parsed.metadata.name).toBe('zkclient-config');
      expect(parsed.data['tc.cfg']).toBeDefined();
      expect(parsed.data['tcdb.cfg']).toBeDefined();
      expect(parsed.data['zkClient.cfg']).toBeDefined();
      expect(parsed.data['zkQuorum.cfg']).toBeDefined();
    });

    it('should include DB password in tcdb.cfg (single source consistency)', () => {
      const result = zlt.generateZKClientConfig(baseConfig);
      const parsed = yaml.load(result);

      expect(parsed.data['tcdb.cfg']).toContain(`_db.password    = ${baseConfig.db.password}`);
    });

    it('should generate correct quorum entries for 3 replicas', () => {
      const result = zlt.generateZKClientConfig(baseConfig);
      const parsed = yaml.load(result);
      const quorum = parsed.data['zkQuorum.cfg'];

      expect(quorum).toContain('zkQuorum.0=');
      expect(quorum).toContain('zkQuorum.1=');
      expect(quorum).toContain('zkQuorum.2=');
      expect(quorum).toContain('zk-hs.zl-ns.svc.cluster.local');
    });

    it('should include MSSQL JDBC URL for mssql type', () => {
      const result = zlt.generateZKClientConfig(baseConfig);
      const parsed = yaml.load(result);

      expect(parsed.data['tcdb.cfg']).toContain('jdbc:sqlserver://');
      expect(parsed.data['tcdb.cfg']).toContain('#define DB_MSSQL_DEFAULT    = true');
    });

    it('should switch to PostgreSQL JDBC for pgsql type', () => {
      const pgsqlConfig = {
        ...baseConfig,
        db: { ...baseConfig.db, type: 'pgsql', port: 5432 },
      };
      const result = zlt.generateZKClientConfig(pgsqlConfig);
      const parsed = yaml.load(result);

      expect(parsed.data['tcdb.cfg']).toContain('jdbc:postgresql://');
      expect(parsed.data['tcdb.cfg']).toContain('#define DB_PGSQL_DEFAULT    = true');
    });

    it('should include auth key in zkQuorum.cfg', () => {
      const result = zlt.generateZKClientConfig(baseConfig);
      const parsed = yaml.load(result);

      expect(parsed.data['zkQuorum.cfg']).toContain('testauthkey');
    });
  });

  // =========================================================================
  // 2.6 — ZK Server Config
  // =========================================================================
  describe('generateZKServerConfig', () => {
    it('should create zk-config with zk.cfg and zkQuorum.cfg', () => {
      const result = zlt.generateZKServerConfig(baseConfig);
      const parsed = yaml.load(result);

      expect(parsed.metadata.name).toBe('zk-config');
      expect(parsed.data['zk.cfg']).toBeDefined();
      expect(parsed.data['zkQuorum.cfg']).toBeDefined();
    });

    it('should use server-side quorum format (short hostname + FQDN)', () => {
      const result = zlt.generateZKServerConfig(baseConfig);
      const parsed = yaml.load(result);
      const quorum = parsed.data['zkQuorum.cfg'];

      // Server-side format has both short hostname and FQDN
      expect(quorum).toContain('zlzookeeper-0');
      expect(quorum).toContain('zlzookeeper-0.zk-hs.zl-ns.svc.cluster.local');
    });
  });

  // =========================================================================
  // 2.7 — Access Mode Configs
  // =========================================================================
  describe('generateAccessModeConfigs', () => {
    it('should return 2 ConfigMaps (pmappurl + tomcat)', () => {
      const result = zlt.generateAccessModeConfigs(baseConfig);
      expect(result).toHaveLength(2);

      const names = result.map(y => yaml.load(y).metadata.name);
      expect(names).toContain('pmappurl-config');
      expect(names).toContain('tomcat-server-config');
    });

    it('should produce HAS_SSL=false for internal mode', () => {
      const result = zlt.generateAccessModeConfigs({
        ...baseConfig,
        accessMode: 'internal',
      });
      const pmapp = yaml.load(result[0]);

      expect(pmapp.data['pmappURL.cfg']).toContain('#define HAS_SSL = false');
      expect(pmapp.data['pmappURL.cfg']).not.toContain('proxyName');
    });

    it('should produce HAS_SSL=true with domain for external mode', () => {
      const result = zlt.generateAccessModeConfigs({
        ...baseConfig,
        accessMode: 'external',
        externalDomain: 'test.example.com',
      });
      const pmapp = yaml.load(result[0]);
      const tomcat = yaml.load(result[1]);

      expect(pmapp.data['pmappURL.cfg']).toContain('#define HAS_SSL = true');
      expect(pmapp.data['pmappURL.cfg']).toContain('web.server.URL = test.example.com');
      expect(tomcat.data['server.xml']).toContain('proxyName="test.example.com"');
      expect(tomcat.data['server.xml']).toContain('proxyPort="443"');
    });

    it('should NOT include proxy attrs in tomcat for internal mode', () => {
      const result = zlt.generateAccessModeConfigs({
        ...baseConfig,
        accessMode: 'internal',
      });
      const tomcat = yaml.load(result[1]);

      expect(tomcat.data['server.xml']).not.toContain('proxyName');
      expect(tomcat.data['server.xml']).not.toContain('proxyPort');
    });
  });

  // =========================================================================
  // Dual-source consistency: DB password
  // =========================================================================
  describe('dual-source consistency', () => {
    it('should use same password in db-secret and zkclient-config tcdb.cfg', () => {
      const dbConfig = zlt.generateZLDBConfig(baseConfig);
      const zkConfig = zlt.generateZKClientConfig(baseConfig);

      const dbSecret = yaml.load(dbConfig[1]);
      const zkClient = yaml.load(zkConfig);

      expect(dbSecret.stringData.DB_PASSWORD).toBe(baseConfig.db.password);
      expect(zkClient.data['tcdb.cfg']).toContain(`_db.password    = ${baseConfig.db.password}`);
    });
  });

  // =========================================================================
  // generateAllZLManifests — ordering
  // =========================================================================
  describe('generateAllZLManifests', () => {
    it('should return an ordered array of manifest objects', () => {
      const result = zlt.generateAllZLManifests(baseConfig);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(10);

      // Each item should have order, kind, yaml
      result.forEach(item => {
        expect(item).toHaveProperty('order');
        expect(item).toHaveProperty('kind');
        expect(item).toHaveProperty('yaml');
        expect(typeof item.order).toBe('number');
      });
    });

    it('should be sorted by order field (ascending)', () => {
      const result = zlt.generateAllZLManifests(baseConfig);
      const orders = result.map(r => r.order);

      for (let i = 1; i < orders.length; i++) {
        expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]);
      }
    });

    it('should include StorageClass before PVC before ConfigMap before StatefulSet', () => {
      const result = zlt.generateAllZLManifests(baseConfig);
      const kinds = result.map(r => r.kind);

      const scIdx = kinds.indexOf('StorageClass');
      const pvcIdx = kinds.indexOf('PersistentVolumeClaim');
      const cmIdx = kinds.indexOf('ConfigMap');
      const ssIdx = kinds.indexOf('StatefulSet');

      expect(scIdx).toBeLessThan(pvcIdx);
      expect(pvcIdx).toBeLessThan(cmIdx);
      expect(cmIdx).toBeLessThan(ssIdx);
    });

    it('should produce valid YAML for every manifest', () => {
      const result = zlt.generateAllZLManifests(baseConfig);
      result.forEach(item => {
        const yamlItems = Array.isArray(item.yaml) ? item.yaml : [item.yaml];
        yamlItems.forEach(yamlStr => {
          const doc = yaml.load(yamlStr);
          if (doc) {
            expect(doc).toHaveProperty('kind');
          }
        });
      });
    });
  });
});
