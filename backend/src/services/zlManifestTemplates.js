/**
 * ZL Application Manifest Templates
 *
 * ZL-specific template layer that calls the generic KubernetesManifestGenerator
 * with exact parameters from DG03/aws reference manifests. Each function encodes
 * the fixed mount paths, port numbers, ConfigMap structures, and resource limits
 * of the ZL application stack, while parameterizing values that change per
 * deployment (ECR URL, DB host, namespace, access mode, etc.).
 *
 * Input:  Single config object with cloud, ECR, DB, ZK, access mode settings.
 * Output: Ordered array of { order, kind, yaml, waitFor? } manifest objects.
 *
 * @see rm-phases/20260302/phase2.md for full specification
 * @see manualprocess/DG03/aws/*.yaml for reference manifests
 */

const KubernetesManifestGenerator = require('./kubernetesManifestGenerator');

class ZLManifestTemplates {
  constructor() {
    this.generator = new KubernetesManifestGenerator();
  }

  // ---------------------------------------------------------------------------
  // Helper: build full container-registry image URI
  // ---------------------------------------------------------------------------
  _imageUri(config, tag) {
    return `${config.registryUrl}/${config.repositoryName}:${tag}`;
  }

  // ---------------------------------------------------------------------------
  // Helper: provider-specific block storage class name
  // ---------------------------------------------------------------------------
  _blockStorageClass(provider) {
    const map = {
      aws: 'ebs-sc',
      azure: 'azure-disk-sc',
      gcp: 'gcp-pd-sc',
      digitalocean: 'do-block-sc',
      linode: 'linode-block-sc',
    };
    return map[provider] || 'ebs-sc';
  }

  // ---------------------------------------------------------------------------
  // Helper: provider-specific storage class name list (for manifest metadata)
  // ---------------------------------------------------------------------------
  _storageClassNames(provider) {
    const map = {
      aws: 'ebs-sc, efs-sc',
      azure: 'azure-disk-sc, azure-files-sc',
      gcp: 'gcp-pd-sc, gcp-filestore-sc',
      digitalocean: 'do-block-sc',
      linode: 'linode-block-sc',
    };
    return map[provider] || 'ebs-sc, efs-sc';
  }

  // ---------------------------------------------------------------------------
  // Helper: build ZK quorum entries (server-side format)
  // Used by zk-config zkQuorum.cfg
  // Format: id~~shortHostname~~clientPort~~peerPort~~leaderPort~~dataDir~~fqdn
  // ---------------------------------------------------------------------------
  _zkServerQuorumEntries(config) {
    const ns = config.namespace || 'default';
    const replicas = (config.zk && config.zk.replicas) || 3;
    const lines = [];
    for (let i = 0; i < replicas; i++) {
      const short = `zlzookeeper-${i}`;
      const fqdn = `${short}.zk-hs.${ns}.svc.cluster.local`;
      lines.push(`zkQuorum.${i}=${i}~~${short}~~2181~~2888~~3888~~/var/ZipLip/DATA/ZooKeeper/zk${i}~~${fqdn}`);
    }
    return lines.join('\n');
  }

  // ---------------------------------------------------------------------------
  // Helper: build ZK quorum entries (client-side format)
  // Used by zkclient-config zkQuorum.cfg
  // Format: id~~fqdn~~clientPort~~peerPort~~leaderPort~~dataDir
  // ---------------------------------------------------------------------------
  _zkClientQuorumEntries(config) {
    const ns = config.namespace || 'default';
    const replicas = (config.zk && config.zk.replicas) || 3;
    const lines = [];
    for (let i = 0; i < replicas; i++) {
      const fqdn = `zlzookeeper-${i}.zk-hs.${ns}.svc.cluster.local`;
      lines.push(`zkQuorum.${i}=${i}~~${fqdn}~~2181~~2888~~3888~~/var/ZipLip/DATA/ZooKeeper/zk${i}`);
    }
    return lines.join('\n');
  }

  // ---------------------------------------------------------------------------
  // Helper: build ZOO_SERVERS env value
  // ---------------------------------------------------------------------------
  _zkServersList(config) {
    const replicas = (config.zk && config.zk.replicas) || 3;
    return Array.from({ length: replicas }, (_, i) => `zlzookeeper-${i}`).join(' ');
  }

  // ---------------------------------------------------------------------------
  // Helper: common app env vars shared by zlserver, zlsearch, zlui
  // ---------------------------------------------------------------------------
  _commonAppEnv(clusterName, config) {
    const env = [
      { name: 'CLUSTER_NAME', value: clusterName },
      { name: 'JAVA_HOME', value: '/usr/lib/jvm/java-21-openjdk-amd64' },
      { name: 'PATH', value: '/usr/lib/jvm/java-21-openjdk-amd64/bin:/usr/local/tomcat/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' },
      { name: 'TIKA_HOST', value: 'zltika-service' },
      { name: 'KAFKA_OPTS', value: '-Djava.security.auth.login.config=/opt/ZipLip/zlserver/WEB-INF/config/zookeeper_jaas.conf' },
    ];
    return env;
  }

  // =========================================================================
  // 2.1 — Storage Classes (2)
  // =========================================================================
  /**
   * Generate provider-appropriate block and file StorageClasses.
   * AWS:   ebs-sc (gp3, default) + efs-sc
   * Azure: azure-disk-sc (Premium_LRS, default) + azure-files-sc
   * GCP:   gcp-pd-sc (pd-ssd, default) + gcp-filestore-sc
   * @returns {string[]} Array of 2 YAML strings
   */
  generateZLStorageClasses(config) {
    const provider = config.cloudProvider || 'aws';

    switch (provider) {
      case 'azure': {
        const diskSc = this.generator.generateStorageClass({
          name: 'azure-disk-sc',
          provisioner: 'disk.csi.azure.com',
          parameters: { skuName: 'Premium_LRS' },
          reclaimPolicy: 'Delete',
          volumeBindingMode: 'WaitForFirstConsumer',
          allowVolumeExpansion: true,
          isDefault: true,
        });
        const filesSc = this.generator.generateStorageClass({
          name: 'azure-files-sc',
          provisioner: 'file.csi.azure.com',
          parameters: {
            skuName: 'Premium_LRS',
            protocol: 'NFS',
          },
          reclaimPolicy: 'Retain',
          volumeBindingMode: 'Immediate',
          allowVolumeExpansion: true,
          isDefault: false,
        });
        return [diskSc, filesSc];
      }

      case 'gcp': {
        const pdSc = this.generator.generateStorageClass({
          name: 'gcp-pd-sc',
          provisioner: 'pd.csi.storage.gke.io',
          parameters: { type: 'pd-ssd' },
          reclaimPolicy: 'Delete',
          volumeBindingMode: 'WaitForFirstConsumer',
          allowVolumeExpansion: true,
          isDefault: true,
        });
        const filestoreSc = this.generator.generateStorageClass({
          name: 'gcp-filestore-sc',
          provisioner: 'filestore.csi.storage.gke.io',
          parameters: {
            tier: 'standard',
            network: 'default',
          },
          reclaimPolicy: 'Retain',
          volumeBindingMode: 'Immediate',
          allowVolumeExpansion: true,
          isDefault: false,
        });
        return [pdSc, filestoreSc];
      }

      case 'digitalocean': {
        const doBlockSc = this.generator.generateStorageClass({
          name: 'do-block-sc',
          provisioner: 'dobs.csi.digitalocean.com',
          parameters: {},
          reclaimPolicy: 'Delete',
          volumeBindingMode: 'WaitForFirstConsumer',
          allowVolumeExpansion: true,
          isDefault: true,
        });
        // DigitalOcean has no native file storage CSI — use block for all
        return [doBlockSc];
      }

      case 'linode': {
        const linodeSc = this.generator.generateStorageClass({
          name: 'linode-block-sc',
          provisioner: 'linodebs.csi.linode.com',
          parameters: {},
          reclaimPolicy: 'Delete',
          volumeBindingMode: 'WaitForFirstConsumer',
          allowVolumeExpansion: true,
          isDefault: true,
        });
        return [linodeSc];
      }

      case 'aws':
      default: {
        const ebsSc = this.generator.generateStorageClass({
          name: 'ebs-sc',
          provisioner: 'ebs.csi.aws.com',
          parameters: { type: 'gp3', fsType: 'ext4' },
          reclaimPolicy: 'Delete',
          volumeBindingMode: 'WaitForFirstConsumer',
          allowVolumeExpansion: true,
          isDefault: true,
        });
        const efsSc = this.generator.generateStorageClass({
          name: 'efs-sc',
          provisioner: 'efs.csi.aws.com',
          parameters: {
            provisioningMode: 'efs-ap',
            fileSystemId: config.efsFileSystemId,
            directoryPerms: '700',
          },
          reclaimPolicy: 'Retain',
          volumeBindingMode: 'Immediate',
          allowVolumeExpansion: false,
          isDefault: false,
        });
        return [ebsSc, efsSc];
      }
    }
  }

  // =========================================================================
  // 2.2 — PVCs (3 — minimal effective set, excludes orphans)
  // =========================================================================
  /**
   * Generate file-storage-backed PVCs for shared logs and vault.
   * Uses provider-appropriate storage class:
   *   AWS → efs-sc, Azure → azure-files-sc, GCP → gcp-filestore-sc
   * Excludes zlservertemp and zltikatemp (emptyDir in all providers).
   * ZK block PVCs come from StatefulSet VCTs, not standalone PVCs.
   * @returns {string[]} Array of 3 YAML strings
   */
  generateZLPVCs(config) {
    const ns = config.namespace || 'default';
    const provider = config.cloudProvider || 'aws';

    // Provider-specific file storage class name
    const fileStorageClassMap = {
      aws: 'efs-sc',
      azure: 'azure-files-sc',
      gcp: 'gcp-filestore-sc',
      digitalocean: 'do-block-sc',   // No native file CSI — fall back to block
      linode: 'linode-block-sc',      // No native file CSI — fall back to block
    };
    const storageClass = fileStorageClassMap[provider] || 'efs-sc';

    // Use provider-neutral PVC names (no "-efs" suffix for non-AWS)
    const pvcSuffix = provider === 'aws' ? '-efs' : '-shared';
    const pvcDefs = [
      `zluilogs${pvcSuffix}`,
      `zlvault${pvcSuffix}`,
      `zlserverlogs${pvcSuffix}`,
    ];

    // Block-only providers (DO, Linode) use ReadWriteOnce instead of ReadWriteMany
    const accessModes = ['digitalocean', 'linode'].includes(provider)
      ? ['ReadWriteOnce']
      : ['ReadWriteMany'];

    return pvcDefs.map(pvcName =>
      this.generator.generatePVC(
        { name: pvcName, namespace: ns },
        {
          pvcName: pvcName,
          accessModes,
          size: '10Gi',
          storageClass,
        }
      )
    );
  }

  // =========================================================================
  // 2.3 — DB Config (ConfigMap + Secret)
  // =========================================================================
  /**
   * Generate db-config ConfigMap and db-secret Secret.
   * Single source of truth for DB connection info (eliminates dual-sourcing).
   * @returns {string[]} Array of 2 YAML strings [configMap, secret]
   */
  generateZLDBConfig(config) {
    const ns = config.namespace || 'default';

    const dbConfigMap = this.generator.generateConfigMap({
      name: 'db-config',
      namespace: ns,
      data: {
        DB_HOST: config.db.host,
        DB_PORT: String(config.db.port),
        DB_NAME: config.db.name,
        DB_TYPE: config.db.type,
        DB_USER: config.db.user,
      },
    });

    const dbSecret = this.generator.generateSecret({
      name: 'db-secret',
      namespace: ns,
      stringData: {
        DB_PASSWORD: config.db.password,
      },
    });

    return [dbConfigMap, dbSecret];
  }

  // =========================================================================
  // 2.4 — ZL App Config (ConfigMap)
  // =========================================================================
  /**
   * Generate zlapp-config ConfigMap with ZLApp.cfg multi-line content.
   * @returns {string} Single YAML string
   */
  generateZLAppConfig(config) {
    const ns = config.namespace || 'default';
    const app = config.app || {};
    const tp = app.threadPool || { core: 10, max: 50, queue: 100 };
    const mem = app.memory || { min: '512m', max: '4g' };
    const logLevel = app.logLevel || 'INFO';

    const zlAppCfg = [
      '#ifndef _ZL_APP_CONFIG_FILE_IS_INCLUDED',
      '#define _ZL_APP_CONFIG_FILE_IS_INCLUDED = true',
      '_zkClientConfig = /opt/ZipLip/ZLZooKeeper/config/zkClient.cfg',
      '_cfg.site.name = K8S',
      `_cfg.thread.pool.core = ${tp.core}`,
      `_cfg.thread.pool.max = ${tp.max}`,
      `_cfg.thread.pool.queue = ${tp.queue}`,
      `_cfg.memory.min = ${mem.min}`,
      `_cfg.memory.max = ${mem.max}`,
      `_cfg.log.level = ${logLevel}`,
      '_cfg.log.dir = /var/opt/zlserverlogs',
      '#endif',
    ].join('\n');

    return this.generator.generateConfigMap({
      name: 'zlapp-config',
      namespace: ns,
      data: { 'ZLApp.cfg': zlAppCfg },
    });
  }

  // =========================================================================
  // 2.5 — ZK Client Config (ConfigMap) — MOST COMPLEX
  // =========================================================================
  /**
   * Generate zkclient-config ConfigMap with 4 embedded .cfg files.
   * Single source for DB password (same config.db.password as db-secret).
   * @returns {string} Single YAML string
   */
  generateZKClientConfig(config) {
    const ns = config.namespace || 'default';
    const db = config.db;
    const zk = config.zk || {};
    const app = config.app || {};
    const executors = app.executors || { initial: 5, service: 3, managed: 3 };

    // tc.cfg — site/cluster config with executor counts
    const tcCfg = [
      '_cfg.machine=tc/K8S',
      '_cfg.param.pmApp.site.name  = K8S',
      '_cfg.param.coord.cluster.default.name  = DEFAULT',
      `_cfg.param.coord.cluster.initial.executors = ${executors.initial}`,
      `_cfg.param.coord.cluster.service.executors = ${executors.service}`,
      `_cfg.param.coord.cluster.managed.executors = ${executors.managed}`,
      'acv.mach=#wsi.config.AllConfigVariables~~@NAMES_THAT_START_WITH@~~_cfg.param.',
      '_tc = #com.zlti.zlzookeeper.ZKConfigFactory~~@_cfg.machine@~~@acv.mach@',
    ].join('\n');

    // tcdb.cfg — database JDBC connection (plaintext password — same as db-secret)
    const dbDefines = [
      `#define DB_ORACLE_DEFAULT   = ${db.type === 'oracle' ? 'true' : 'false'}`,
      `#define DB_MSSQL_DEFAULT    = ${db.type === 'mssql' ? 'true' : 'false'}`,
      `#define DB_PGSQL_DEFAULT    = ${db.type === 'pgsql' ? 'true' : 'false'}`,
      '#define DB_SYBASE_DEFAULT   = false',
      '#define DB_DB2_DEFAULT      = false',
      '#define DB_MYSQL_DEFAULT    = false',
      '#define DB_HSQLDB_DEFAULT   = false',
    ].join('\n');

    // Build JDBC URL based on DB type
    let jdbcBlock;
    if (db.type === 'mssql') {
      jdbcBlock = [
        '#if DB_MSSQL_DEFAULT',
        `_db.param.jdbcUrl=jdbc:sqlserver://${db.host}:${db.port};TrustServerCertificate=true`,
        `_db.param.DatabaseName=${db.name}`,
        '#endif',
      ].join('\n');
    } else if (db.type === 'pgsql') {
      jdbcBlock = [
        '#if DB_PGSQL_DEFAULT',
        `_db.param.jdbcUrl=jdbc:postgresql://${db.host}:${db.port}/${db.name}`,
        '#endif',
      ].join('\n');
    } else if (db.type === 'oracle') {
      jdbcBlock = [
        '#if DB_ORACLE_DEFAULT',
        `_db.param.jdbcUrl=jdbc:oracle:thin:@${db.host}:${db.port}:${db.name}`,
        '#endif',
      ].join('\n');
    } else {
      jdbcBlock = `_db.param.jdbcUrl=jdbc:${db.type}://${db.host}:${db.port}/${db.name}`;
    }

    const tcdbCfg = [
      dbDefines,
      `_db.param.user  = ${db.user}`,
      `_db.password    = ${db.password}`,
      jdbcBlock,
      'acv.db=#wsi.config.AllConfigVariables~~@NAMES_THAT_START_WITH@~~_db.param.',
      '_db.KeyName = zltc/db',
      '_tcdb = #com.zlti.zlzookeeper.ZKProtectedKeyFactory~~@_db.KeyName@~~@_db.password@~~@acv.db@',
    ].join('\n');

    // zkClient.cfg — ZK client bootstrap (all fixed paths)
    const zkClientCfg = [
      '_zkCluster = /opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg',
      '__zk.main=#com.zlti.zlzookeeper.ZLZooKeeper~~@_zkCluster@~~3000~~true',
    ].join('\n');

    // zkQuorum.cfg — ZK ensemble addresses (client-side format: FQDN first)
    const authKey = zk.authKey || '';
    const zkQuorumCfg = [
      '#if !_ZK_SERVER_CONFIG_FILE_IS_INCLUDED',
      '#define _ZK_SERVER_CONFIG_FILE_IS_INCLUDED = true',
      `_zlzk.auth=#com.zlti.zlzookeeper.ZLZKAuth~~${authKey}`,
      this._zkClientQuorumEntries(config),
      'acv.zkQuorum=#wsi.config.AllConfigVariables~~@NAMES_THAT_START_WITH@~~zkQuorum.',
      '#endif',
    ].join('\n');

    return this.generator.generateConfigMap({
      name: 'zkclient-config',
      namespace: ns,
      data: {
        'tc.cfg': tcCfg,
        'tcdb.cfg': tcdbCfg,
        'zkClient.cfg': zkClientCfg,
        'zkQuorum.cfg': zkQuorumCfg,
      },
    });
  }

  // =========================================================================
  // 2.6 — ZK Server Config (ConfigMap)
  // =========================================================================
  /**
   * Generate zk-config ConfigMap with zk.cfg and zkQuorum.cfg (server-side).
   * @returns {string} Single YAML string
   */
  generateZKServerConfig(config) {
    const ns = config.namespace || 'default';
    const zk = config.zk || {};
    const authKey = zk.authKey || '';

    // zk.cfg — full ZK server config (all fixed values from DG03 reference)
    const zkCfg = [
      'cfg.dir = @zlTs.root@/config',
      'log.dir = @zlTs.root@/logs',
      'log.enableLog4j=false',
      'log.output=#wsi.util.Log4JFactory~~@log.enableLog4j@',
      '#include @cfg.dir@/common/Constants.cfg',
      'zk.clientPort=2181',
      '#include /opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg',
      'zkParam.tickTime=2000',
      'zkParam.initLimit=10',
      'zkParam.syncLimit=5',
      'zkParam.autopurge.snapRetainCount=3',
      'zkParam.autopurge.purgeInterval=1',
      'acv.zkParam=#wsi.config.AllConfigVariables~~@NAMES_THAT_START_WITH@~~zkParam.',
      'log.level = 24',
      'log.flush = 20',
      'log.rollOver=86400',
      'te.logs=#wsi.util.TimedErrands~~Logs Errand_Runner~~true',
      'te.misc=#wsi.util.TimedErrands~~Misc Errand_Runner~~true',
      'te.services=#wsi.util.TimedErrands~~Services Errand_Runner~~true',
      'zlTs.log.main =#wsi.util.WebLog~~@log.dir@~~main~~@log.level@~~@te.logs@~~@log.flush@~~@log.rollOver@~~false',
      'app.zk.name=ZLZK',
      'app.zk.id=17',
      '#include @cfg.dir@/zkChild.cfg',
      '__zk.main=#com.zlti.zlzookeeper.server.ZLZooKeeperServer~~@acv.zkParam@~~@acv.zkQuorum@',
    ].join('\n');

    // zkQuorum.cfg — server-side format (short hostname + FQDN at end)
    const zkQuorumCfg = [
      '#if !_ZK_SERVER_CONFIG_FILE_IS_INCLUDED',
      '#define _ZK_SERVER_CONFIG_FILE_IS_INCLUDED = true',
      `_zlzk.auth=#com.zlti.zlzookeeper.ZLZKAuth~~${authKey}`,
      this._zkServerQuorumEntries(config),
      'acv.zkQuorum=#wsi.config.AllConfigVariables~~@NAMES_THAT_START_WITH@~~zkQuorum.',
      '#endif',
    ].join('\n');

    return this.generator.generateConfigMap({
      name: 'zk-config',
      namespace: ns,
      data: {
        'zk.cfg': zkCfg,
        'zkQuorum.cfg': zkQuorumCfg,
      },
    });
  }

  // =========================================================================
  // 2.7 — Access Mode Configs (2 ConfigMaps)
  // =========================================================================
  /**
   * Generate pmappurl-config and tomcat-server-config ConfigMaps.
   * Content branches on config.accessMode ('internal' | 'external').
   * @returns {string[]} Array of 2 YAML strings
   */
  generateAccessModeConfigs(config) {
    const ns = config.namespace || 'default';
    const isExternal = config.accessMode === 'external';
    const domain = isExternal ? config.externalDomain : '';

    // pmappURL.cfg — access-mode-dependent
    const hasSsl = isExternal ? 'true' : 'false';
    const pmappUrlCfg = [
      '//******** HOST SPECIFICATION *******************',
      '//Set Machine Parameters manually if needed',
      '//machine.local.ip = "0.0.0.0"',
      '//machine.local.name = "XYZ"',
      '',
      '//Modify these three variables.',
      '',
      '//*******BEGIN pmappURL.cfg FILE ***************',
      `#define HAS_SSL = ${hasSsl}`,
      `web.server.URL = ${domain}`,
      'mail.server.host = @web.server.URL@',
      '',
      '//**************DO NOT MODIFY VALUES BELOW*****************',
      'web.secure.protocol = https',
      '#if !HAS_SSL',
      'web.secure.protocol = http',
      '#endif',
      '',
      'com.ziplip.prefix.appname=/ps',
      'com.ziplip.url.prefix.insecure=http://@web.server.URL@@com.ziplip.prefix.appname@',
      'com.ziplip.url.prefix.secure=@web.secure.protocol@://@web.server.URL@@com.ziplip.prefix.appname@',
      'com.ziplip.url.prefix.default=@web.secure.protocol@://@web.server.URL@@com.ziplip.prefix.appname@',
      'com.ziplip.url.prefix.report=@com.ziplip.url.prefix.default@',
      'com.ziplip.webdav.prefix=/wd',
      'com.ziplip.webdav.internal.prefix=@com.ziplip.prefix.appname@@com.ziplip.webdav.prefix@',
      'com.ziplip.webdav.url.prefix=@web.secure.protocol@://@web.server.URL@@com.ziplip.webdav.prefix@',
      'com.ziplip.lang.default=en',
      '',
      '//selfLocation=true: Auto-detect URL from the HTTP request Host header.',
      '_jspUtil.selfLocation = #com.zlti.pm.zlui.JspUtil~~true',
      '',
      '//REVERSE URL REDIRECTIONS DUE TO PROXY SERVER RE-WRITING',
      'com.ziplip.url.prefix.reverseMap = #wsi.config.ArrayFactory~~url.reverseMap~~0',
      '',
      '//**************END *****************',
      '//*******END pmappURL.cfg FILE ***************',
    ].join('\n');

    const pmappUrlConfigMap = this.generator.generateConfigMap({
      name: 'pmappurl-config',
      namespace: ns,
      data: { 'pmappURL.cfg': pmappUrlCfg },
    });

    // server.xml — Tomcat config with access-mode-dependent Connector
    let connectorAttrs = [
      'port="80" protocol="HTTP/1.1"',
      '           connectionTimeout="20000"',
      '           redirectPort="8443"',
      '           maxParameterCount="1000"',
    ];
    if (isExternal) {
      connectorAttrs.push(
        `           proxyName="${domain}"`,
        '           proxyPort="443"',
        '           scheme="https"',
        '           secure="true"',
      );
    }

    const serverXml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Server port="8005" shutdown="SHUTDOWN">',
      '  <Listener className="org.apache.catalina.startup.VersionLoggerListener" />',
      '  <Listener className="org.apache.catalina.core.AprLifecycleListener" SSLEngine="on" />',
      '  <Listener className="org.apache.catalina.core.JreMemoryLeakPreventionListener" />',
      '  <Listener className="org.apache.catalina.mbeans.GlobalResourcesLifecycleListener" />',
      '  <Listener className="org.apache.catalina.core.ThreadLocalLeakPreventionListener" />',
      '',
      '  <GlobalNamingResources>',
      '    <Resource name="UserDatabase" auth="Container"',
      '              type="org.apache.catalina.UserDatabase"',
      '              description="User database that can be updated and saved"',
      '              factory="org.apache.catalina.users.MemoryUserDatabaseFactory"',
      '              pathname="conf/tomcat-users.xml" />',
      '  </GlobalNamingResources>',
      '',
      '  <Service name="Catalina">',
      `    <Connector ${connectorAttrs.join('\n    ')}`,
      '           />',
      '',
      '    <Engine name="Catalina" defaultHost="localhost">',
      '      <Realm className="org.apache.catalina.realm.LockOutRealm">',
      '        <Realm className="org.apache.catalina.realm.UserDatabaseRealm"',
      '               resourceName="UserDatabase"/>',
      '      </Realm>',
      '',
      '      <Host name="localhost" appBase="webapps"',
      '            unpackWARs="true" autoDeploy="true">',
      '        <Valve className="org.apache.catalina.valves.AccessLogValve" directory="logs"',
      '               prefix="localhost_access_log" suffix=".txt"',
      '               pattern="%h %l %u %t &quot;%r&quot; %s %b" />',
      '      </Host>',
      '    </Engine>',
      '  </Service>',
      '</Server>',
    ].join('\n');

    const tomcatConfigMap = this.generator.generateConfigMap({
      name: 'tomcat-server-config',
      namespace: ns,
      data: { 'server.xml': serverXml },
    });

    return [pmappUrlConfigMap, tomcatConfigMap];
  }

  // =========================================================================
  // 2.8 — Services (6)
  // =========================================================================
  /**
   * Generate the minimal effective set of Services.
   * Excludes redundant services (zlui port 8081, zltika dup, zlsearch port 80).
   * zlui-service type branches on config.accessMode.
   * @returns {string[]} Array of 6 YAML strings
   */
  generateZLServices(config) {
    const ns = config.namespace || 'default';
    const isExternal = config.accessMode === 'external';

    // 1. zk-hs — Headless service for StatefulSet (required for stable network IDs)
    const zkHs = this.generator.generateService({
      name: 'zk-hs',
      namespace: ns,
      clusterIP: 'None',
      ports: [
        { name: 'client', port: 2181 },
        { name: 'server', port: 2888 },
        { name: 'leader-election', port: 3888 },
      ],
      selector: 'zlzookeeper',
    });

    // 2. zk-cs — Client-facing ZK service
    const zkCs = this.generator.generateService({
      name: 'zk-cs',
      namespace: ns,
      ports: [{ name: 'client', port: 2181 }],
      selector: 'zlzookeeper',
    });

    // 3. zlserver-service
    const zlserverSvc = this.generator.generateService({
      name: 'zlserver-service',
      namespace: ns,
      ports: [{ name: 'http', port: 8080, targetPort: 8080 }],
      selector: 'zlserver',
    });

    // 4. zlsearch-service
    const zlsearchSvc = this.generator.generateService({
      name: 'zlsearch-service',
      namespace: ns,
      ports: [{ name: 'http', port: 8080, targetPort: 8080 }],
      selector: 'zlsearch',
    });

    // 5. zltika-service
    const zltikaSvc = this.generator.generateService({
      name: 'zltika-service',
      namespace: ns,
      ports: [{ name: '9972-9972', port: 9972, targetPort: 9972 }],
      selector: 'zltika',
    });

    // 6. zlui-service — access-mode-dependent type
    const zluiSvc = this.generator.generateService({
      name: 'zlui-service',
      namespace: ns,
      serviceType: isExternal ? 'LoadBalancer' : 'ClusterIP',
      ports: [
        { name: 'http', port: 8080, targetPort: 80 },
        { name: 'https', port: 8443, targetPort: 8443 },
      ],
      selector: 'zlui',
    });

    return [zkHs, zkCs, zlserverSvc, zlsearchSvc, zltikaSvc, zluiSvc];
  }

  // =========================================================================
  // 2.9 — ZooKeeper StatefulSet
  // =========================================================================
  /**
   * Generate zlzookeeper StatefulSet with init-myid container,
   * zk-config ConfigMap volumes, and block-storage VolumeClaimTemplate.
   * Uses provider-appropriate block storage class.
   * @returns {string} Single YAML string
   */
  generateZKStatefulSet(config) {
    const ns = config.namespace || 'default';
    const provider = config.cloudProvider || 'aws';
    const zk = config.zk || {};
    const replicas = zk.replicas || 3;
    const image = this._imageUri(config, config.imageTags.zlzookeeper);
    const saName = config.serviceAccount ? config.serviceAccount.name : 'zlapp-sa';

    return this.generator.generateStatefulSet({
      name: 'zlzookeeper',
      namespace: ns,
      labels: { app: 'zlzookeeper' },
      replicas: replicas,
      serviceName: 'zk-hs',
      podManagementPolicy: 'Parallel',
      image: image,
      imagePullSecrets: [{ name: 'docker-secret' }],
      serviceAccountName: saName,

      ports: [
        { name: 'client', containerPort: 2181 },
        { name: 'server', containerPort: 2888 },
        { name: 'leader-election', containerPort: 3888 },
      ],

      env: [
        { name: 'ZOO_SERVERS', value: this._zkServersList(config) },
      ],

      resources: {
        requests: { cpu: '250m', memory: '512Mi' },
        limits: { cpu: '500m', memory: '1Gi' },
      },

      volumeMounts: [
        { name: 'zlzkdata', mountPath: '/var/ZipLip/DATA/ZooKeeper' },
        { name: 'zk-config', mountPath: '/opt/ZipLip/ZLZooKeeper/config/zk.cfg', subPath: 'zk.cfg' },
        { name: 'zk-config', mountPath: '/opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg', subPath: 'zkQuorum.cfg' },
      ],

      volumes: [
        { name: 'zk-config', configMap: { name: 'zk-config' } },
      ],

      initContainers: [{
        name: 'init-myid',
        image: 'busybox:1.36',
        command: ['sh', '-c', [
          'ORDINAL=$(echo $HOSTNAME | sed \'s/.*-//\')',
          'MYID=$((ORDINAL + 1))',
          'echo "Creating myid=$MYID for $HOSTNAME"',
          'mkdir -p /data',
          'echo $MYID > /data/myid',
          'cat /data/myid',
        ].join('\n')],
        env: [
          { name: 'HOSTNAME', valueFrom: { fieldRef: { fieldPath: 'metadata.name' } } },
        ],
        volumeMounts: [
          { name: 'zlzkdata', mountPath: '/data' },
        ],
      }],

      livenessProbe: {
        tcpSocket: { port: 2181 },
        initialDelaySeconds: 30,
        periodSeconds: 10,
        timeoutSeconds: 5,
        failureThreshold: 3,
      },
      readinessProbe: {
        tcpSocket: { port: 2181 },
        initialDelaySeconds: 10,
        periodSeconds: 5,
        timeoutSeconds: 3,
        failureThreshold: 3,
      },

      volumeClaimTemplates: [{
        name: 'zlzkdata',
        accessModes: ['ReadWriteOnce'],
        storageClassName: this._blockStorageClass(provider),
        storage: '10Gi',
      }],
    });
  }

  // =========================================================================
  // 2.10 — Deployments (4)
  // =========================================================================
  /**
   * Generate zltika, zlserver, zlsearch, zlui Deployments.
   * @returns {string[]} Array of 4 YAML strings
   */
  generateZLDeployments(config) {
    const ns = config.namespace || 'default';
    const saName = config.serviceAccount ? config.serviceAccount.name : 'zlapp-sa';
    const appImage = this._imageUri(config, config.imageTags.zlserver);
    const tikaImage = this._imageUri(config, config.imageTags.zlzookeeper ? config.imageTags.zltika : config.imageTags.zltika);
    const app = config.app || {};
    const executors = app.executors || { initial: 5, service: 3, managed: 3 };

    // Common envFrom for app pods (zlserver, zlsearch, zlui)
    const appEnvFrom = [
      { configMapRef: { name: 'zlapp-config' } },
      { configMapRef: { name: 'db-config' } },
      { secretRef: { name: 'db-secret' } },
    ];

    // Common zkclient-config volumes for app pods
    const zkClientVolumes = [
      { name: 'zkclient-config', mountPath: '/opt/ZipLip/bin/zk/tcdb.cfg', subPath: 'tcdb.cfg', configMap: { name: 'zkclient-config' } },
      { name: 'zkclient-config', mountPath: '/opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg', subPath: 'zkQuorum.cfg', configMap: { name: 'zkclient-config' } },
    ];

    // Common vault volume for app pods — PVC name is provider-dependent
    const provider = config.cloudProvider || 'aws';
    const pvcSuffix = provider === 'aws' ? '-efs' : '-shared';
    const vaultVolume = { name: 'zlvault', mountPath: '/var/opt/zlvault', pvcName: `zlvault${pvcSuffix}` };

    // ---- zltika ----
    const zltika = this.generator.generateDeployment({
      name: 'zltika',
      namespace: ns,
      image: this._imageUri(config, config.imageTags.zltika),
      replicas: 1,
      strategy: 'Recreate',
      imagePullPolicy: 'IfNotPresent',
      imagePullSecrets: [{ name: 'docker-secret' }],
      serviceAccountName: saName,
      ports: [{ name: 'tika', containerPort: 9972 }],
      command: ['/bin/sh', '-c', 'cd /opt/ZipLip/ZLTikaConvertor/bin && ./zltikadiag.sh ZLTika /tmp/ZLTika & sleep infinity'],
      cpuRequest: '250m',
      memoryRequest: '512Mi',
      cpuLimit: '500m',
      memoryLimit: '1Gi',
      livenessProbe: {
        tcpSocket: { port: 9972 },
        initialDelaySeconds: 60,
        periodSeconds: 10,
        timeoutSeconds: 5,
        failureThreshold: 3,
      },
      readinessProbe: {
        tcpSocket: { port: 9972 },
        initialDelaySeconds: 10,
        periodSeconds: 5,
        timeoutSeconds: 3,
        failureThreshold: 3,
      },
    });

    // ---- zlserver ----
    const zlserverEnv = [
      ...this._commonAppEnv('MP', config),
    ];
    const zlserver = this.generator.generateDeployment({
      name: 'zlserver',
      namespace: ns,
      image: appImage,
      replicas: 1,
      strategy: 'Recreate',
      imagePullPolicy: 'IfNotPresent',
      imagePullSecrets: [{ name: 'docker-secret' }],
      serviceAccountName: saName,
      ports: [{ name: 'http', containerPort: 80 }],
      env: zlserverEnv,
      envFrom: appEnvFrom,
      cpuRequest: '500m',
      memoryRequest: '1Gi',
      cpuLimit: '1',
      memoryLimit: '2Gi',
      volumes: [
        { name: 'zlservertemp', mountPath: '/opt/ZipLip/zlserver/WEB-INF/tmp', emptyDir: {} },
        { name: 'zlserverlogs', mountPath: '/opt/ZipLip/logs', pvcName: `zlserverlogs${pvcSuffix}` },
        vaultVolume,
        ...zkClientVolumes,
      ],
    });

    // ---- zlsearch ----
    const zlsearchEnv = [
      ...this._commonAppEnv('SEARCH', config),
      { name: 'INITIAL_EXECUTORS', value: String(executors.initial) },
      { name: 'SERVICE_EXECUTORS', value: String(executors.service) },
      { name: 'MANAGED_EXECUTORS', value: String(executors.managed) },
    ];
    const zlsearch = this.generator.generateDeployment({
      name: 'zlsearch',
      namespace: ns,
      image: appImage,
      replicas: 1,
      strategy: 'Recreate',
      imagePullPolicy: 'IfNotPresent',
      imagePullSecrets: [{ name: 'docker-secret' }],
      serviceAccountName: saName,
      ports: [{ name: 'http', containerPort: 80 }],
      env: zlsearchEnv,
      envFrom: appEnvFrom,
      cpuRequest: '500m',
      memoryRequest: '1Gi',
      cpuLimit: '1',
      memoryLimit: '2Gi',
      volumes: [
        { name: 'zlsearchtemp', mountPath: '/opt/ZipLip/zlserver/WEB-INF/tmp', emptyDir: {} },
        { name: 'zlsearchlogs', mountPath: '/opt/ZipLip/logs', emptyDir: {} },
        vaultVolume,
        ...zkClientVolumes,
      ],
    });

    // ---- zlui ----
    const zluiEnv = [
      ...this._commonAppEnv('UI', config),
      { name: 'INITIAL_EXECUTORS', value: String(executors.initial) },
      { name: 'SERVICE_EXECUTORS', value: String(executors.service) },
      { name: 'MANAGED_EXECUTORS', value: String(executors.managed) },
    ];

    // zlui gets pmappurl-config and tomcat-server-config volumes (access-mode-dependent content)
    const zluiVolumes = [
      { name: 'zluitemp', mountPath: '/opt/ZipLip/zlserver/WEB-INF/tmp', emptyDir: {} },
      { name: 'zluilogs', mountPath: '/opt/ZipLip/logs', pvcName: `zluilogs${pvcSuffix}` },
      vaultVolume,
      ...zkClientVolumes,
      { name: 'pmappurl-config', mountPath: '/opt/ZipLip/config/pmappURL.cfg', subPath: 'pmappURL.cfg', configMap: { name: 'pmappurl-config' } },
      { name: 'tomcat-server-config', mountPath: '/usr/local/tomcat/conf/server.xml', subPath: 'server.xml', configMap: { name: 'tomcat-server-config' } },
    ];

    const zlui = this.generator.generateDeployment({
      name: 'zlui',
      namespace: ns,
      image: appImage,
      replicas: 1,
      strategy: 'Recreate',
      imagePullPolicy: 'IfNotPresent',
      imagePullSecrets: [{ name: 'docker-secret' }],
      serviceAccountName: saName,
      ports: [{ name: 'http', containerPort: 80 }],
      env: zluiEnv,
      envFrom: appEnvFrom,
      cpuRequest: '500m',
      memoryRequest: '1Gi',
      cpuLimit: '1000m',
      memoryLimit: '2Gi',
      volumes: zluiVolumes,
    });

    return [zltika, zlserver, zlsearch, zlui];
  }

  // =========================================================================
  // 2.11 — Secrets (2–3)
  // =========================================================================
  /**
   * Generate db-secret, docker-secret, and optionally zlui-ssl-cert.
   * db-secret is generated by generateZLDBConfig; this produces docker + TLS only.
   * @returns {string[]} Array of 1–2 YAML strings (docker-secret + optional TLS)
   */
  generateZLSecrets(config) {
    const ns = config.namespace || 'default';
    const secrets = [];

    // docker-secret — ECR pull credentials
    const dockerAuth = config.dockerAuth || {};
    secrets.push(this.generator.generateDockerRegistrySecret({
      name: 'docker-secret',
      namespace: ns,
      server: dockerAuth.server,
      username: dockerAuth.username,
      password: dockerAuth.password,
    }));

    // zlui-ssl-cert — only for external access with uploaded certs
    if (config.accessMode === 'external' && config.ssl && config.ssl.mode === 'upload') {
      secrets.push(this.generator.generateSecret({
        name: 'zlui-ssl-cert',
        namespace: ns,
        type: 'kubernetes.io/tls',
        stringData: {
          'tls.crt': config.ssl.cert,
          'tls.key': config.ssl.key,
        },
      }));
    }

    return secrets;
  }

  // =========================================================================
  // 2.12 — Service Account
  // =========================================================================
  /**
   * Generate zlapp-sa ServiceAccount with cloud-specific annotations.
   * Currently implements AWS IRSA; stubs for Azure/GCP.
   * @returns {string} Single YAML string
   */
  generateZLServiceAccount(config) {
    const ns = config.namespace || 'default';
    const sa = config.serviceAccount || {};
    const annotations = {};

    // Cloud-specific annotations
    if (config.cloudProvider === 'aws' && sa.irsaRoleArn) {
      annotations['eks.amazonaws.com/role-arn'] = sa.irsaRoleArn;
    } else if (config.cloudProvider === 'azure' && sa.workloadIdentityClientId) {
      annotations['azure.workload.identity/client-id'] = sa.workloadIdentityClientId;
    } else if (config.cloudProvider === 'gcp' && sa.gcpServiceAccount) {
      annotations['iam.gke.io/gcp-service-account'] = sa.gcpServiceAccount;
    }

    return this.generator.generateServiceAccount({
      name: sa.name || 'zlapp-sa',
      namespace: ns,
      annotations: annotations,
      labels: { app: 'zl' },
    });
  }

  // =========================================================================
  // 2.13 — Orchestrator
  // =========================================================================
  /**
   * Generate ALL ZL manifests in deployment order.
   * Returns ordered array consumed by Phase 3 deployment orchestrator.
   *
   * @param {Object} config - Full deployment configuration
   * @returns {Array<{order: number, kind: string, name: string, yaml: string|string[], waitFor?: string}>}
   */
  generateAllZLManifests(config) {
    const manifests = [];

    // 1. Foundation — StorageClasses
    manifests.push({
      order: 1,
      kind: 'StorageClass',
      name: this._storageClassNames(config.cloudProvider || 'aws'),
      yaml: this.generateZLStorageClasses(config),
    });

    // 2. Foundation — PVCs
    const pvcSuffix = (config.cloudProvider || 'aws') === 'aws' ? '-efs' : '-shared';
    manifests.push({
      order: 2,
      kind: 'PersistentVolumeClaim',
      name: `zluilogs${pvcSuffix}, zlvault${pvcSuffix}, zlserverlogs${pvcSuffix}`,
      yaml: this.generateZLPVCs(config),
    });

    // 3. Identity — ServiceAccount
    manifests.push({
      order: 3,
      kind: 'ServiceAccount',
      name: 'zlapp-sa',
      yaml: this.generateZLServiceAccount(config),
    });

    // 4. Identity — Secrets (docker-secret + optional TLS)
    manifests.push({
      order: 4,
      kind: 'Secret',
      name: 'docker-secret',
      yaml: this.generateZLSecrets(config),
    });

    // 5. Configuration — DB config + secret
    manifests.push({
      order: 5,
      kind: 'ConfigMap+Secret',
      name: 'db-config, db-secret',
      yaml: this.generateZLDBConfig(config),
    });

    // 6. Configuration — App config
    manifests.push({
      order: 6,
      kind: 'ConfigMap',
      name: 'zlapp-config',
      yaml: this.generateZLAppConfig(config),
    });

    // 7. Configuration — ZK client config
    manifests.push({
      order: 7,
      kind: 'ConfigMap',
      name: 'zkclient-config',
      yaml: this.generateZKClientConfig(config),
    });

    // 8. Configuration — ZK server config
    manifests.push({
      order: 8,
      kind: 'ConfigMap',
      name: 'zk-config',
      yaml: this.generateZKServerConfig(config),
    });

    // 9. Configuration — Access mode configs
    manifests.push({
      order: 9,
      kind: 'ConfigMap',
      name: 'pmappurl-config, tomcat-server-config',
      yaml: this.generateAccessModeConfigs(config),
    });

    // 10. Networking — Services
    manifests.push({
      order: 10,
      kind: 'Service',
      name: 'zk-hs, zk-cs, zlserver-service, zlsearch-service, zltika-service, zlui-service',
      yaml: this.generateZLServices(config),
    });

    // 11. Workloads — ZooKeeper StatefulSet (must be up before app pods)
    manifests.push({
      order: 11,
      kind: 'StatefulSet',
      name: 'zlzookeeper',
      yaml: this.generateZKStatefulSet(config),
      waitFor: 'zk-quorum',
    });

    // 12. Workloads — Application Deployments
    manifests.push({
      order: 12,
      kind: 'Deployment',
      name: 'zltika, zlserver, zlsearch, zlui',
      yaml: this.generateZLDeployments(config),
    });

    return manifests;
  }
}

module.exports = ZLManifestTemplates;
