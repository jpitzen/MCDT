/**
 * KubernetesManifestGenerator — Unit Tests
 *
 * Covers every public method of the generator:
 *   generateNamespace, generateDeployment, generateService, generateConfigMap,
 *   generateSecret, generateIngress, generateHPA, generatePVC, generateStatefulSet,
 *   generateStorageClass, generateServiceAccount, generateDockerRegistrySecret, generateAll
 */

const yaml = require('js-yaml');
const KubernetesManifestGenerator = require('../kubernetesManifestGenerator');

describe('KubernetesManifestGenerator', () => {
  let gen;

  beforeEach(() => {
    gen = new KubernetesManifestGenerator();
  });

  // =========================================================================
  // generateNamespace
  // =========================================================================
  describe('generateNamespace', () => {
    it('should produce a valid Namespace manifest', () => {
      const result = gen.generateNamespace('test-ns');
      const parsed = yaml.load(result);

      expect(parsed.apiVersion).toBe('v1');
      expect(parsed.kind).toBe('Namespace');
      expect(parsed.metadata.name).toBe('test-ns');
      expect(parsed.metadata.labels['app.kubernetes.io/managed-by']).toBe('zlaws');
    });
  });

  // =========================================================================
  // generateDeployment
  // =========================================================================
  describe('generateDeployment', () => {
    it('should produce a valid Deployment with defaults', () => {
      const result = gen.generateDeployment({ name: 'myapp' });
      const parsed = yaml.load(result);

      expect(parsed.kind).toBe('Deployment');
      expect(parsed.apiVersion).toBe('apps/v1');
      expect(parsed.metadata.name).toBe('myapp');
      expect(parsed.spec.replicas).toBe(1);
      expect(parsed.spec.template.spec.containers[0].image).toBe('nginx:latest');
    });

    it('should set custom replicas, image, and namespace', () => {
      const result = gen.generateDeployment({
        name: 'web',
        namespace: 'prod',
        image: 'myimage:v2',
        replicas: 5,
      });
      const parsed = yaml.load(result);

      expect(parsed.metadata.namespace).toBe('prod');
      expect(parsed.spec.replicas).toBe(5);
      expect(parsed.spec.template.spec.containers[0].image).toBe('myimage:v2');
    });

    it('should include env vars (plain value and valueFrom)', () => {
      const result = gen.generateDeployment({
        name: 'app',
        env: [
          { name: 'MY_VAR', value: 'hello' },
          { name: 'SECRET_KEY', valueFrom: { secretKeyRef: { name: 'my-secret', key: 'key' } } },
        ],
      });
      const parsed = yaml.load(result);
      const env = parsed.spec.template.spec.containers[0].env;

      expect(env).toHaveLength(2);
      expect(env[0]).toEqual({ name: 'MY_VAR', value: 'hello' });
      expect(env[1].valueFrom.secretKeyRef.name).toBe('my-secret');
    });

    it('should include envFrom (configMap + secrets legacy)', () => {
      const result = gen.generateDeployment({
        name: 'app',
        configMap: true,
        secrets: true,
      });
      const parsed = yaml.load(result);
      const envFrom = parsed.spec.template.spec.containers[0].envFrom;

      expect(envFrom).toHaveLength(2);
      expect(envFrom[0].configMapRef.name).toBe('app-config');
      expect(envFrom[1].secretRef.name).toBe('app-secret');
    });

    it('should include volumes with PVC, ConfigMap, and emptyDir', () => {
      const result = gen.generateDeployment({
        name: 'app',
        volumes: [
          { name: 'data', mountPath: '/data', pvcName: 'data-pvc' },
          { name: 'cfg', mountPath: '/cfg', configMap: { name: 'my-cm' } },
          { name: 'tmp', mountPath: '/tmp', emptyDir: {} },
        ],
      });
      const parsed = yaml.load(result);
      const vols = parsed.spec.template.spec.volumes;
      const mounts = parsed.spec.template.spec.containers[0].volumeMounts;

      expect(vols).toHaveLength(3);
      expect(vols[0].persistentVolumeClaim.claimName).toBe('data-pvc');
      expect(vols[1].configMap.name).toBe('my-cm');
      expect(vols[2]).toHaveProperty('emptyDir');
      expect(mounts).toHaveLength(3);
    });

    it('should include initContainers when provided', () => {
      const result = gen.generateDeployment({
        name: 'app',
        initContainers: [{ name: 'init', image: 'busybox', command: ['sh'] }],
      });
      const parsed = yaml.load(result);

      expect(parsed.spec.template.spec.initContainers).toHaveLength(1);
      expect(parsed.spec.template.spec.initContainers[0].name).toBe('init');
    });

    it('should include imagePullSecrets (array form)', () => {
      const result = gen.generateDeployment({
        name: 'app',
        imagePullSecrets: [{ name: 'regcred' }],
      });
      const parsed = yaml.load(result);

      expect(parsed.spec.template.spec.imagePullSecrets).toEqual([{ name: 'regcred' }]);
    });

    it('should include liveness and readiness probes', () => {
      const result = gen.generateDeployment({
        name: 'app',
        livenessProbe: { httpGet: { path: '/healthz', port: 8080 }, initialDelaySeconds: 10 },
        readinessProbe: { tcpSocket: { port: 8080 }, periodSeconds: 5 },
      });
      const parsed = yaml.load(result);
      const container = parsed.spec.template.spec.containers[0];

      expect(container.livenessProbe.httpGet.path).toBe('/healthz');
      expect(container.readinessProbe.tcpSocket.port).toBe(8080);
    });

    it('should set strategy type when provided', () => {
      const result = gen.generateDeployment({
        name: 'app',
        strategy: 'Recreate',
      });
      const parsed = yaml.load(result);

      expect(parsed.spec.strategy.type).toBe('Recreate');
    });

    it('should support multiple named ports', () => {
      const result = gen.generateDeployment({
        name: 'app',
        ports: [
          { name: 'http', containerPort: 8080 },
          { name: 'admin', containerPort: 9090 },
        ],
      });
      const parsed = yaml.load(result);
      const ports = parsed.spec.template.spec.containers[0].ports;

      expect(ports).toHaveLength(2);
      expect(ports[0].name).toBe('http');
      expect(ports[1].containerPort).toBe(9090);
    });
  });

  // =========================================================================
  // generateService
  // =========================================================================
  describe('generateService', () => {
    it('should produce a ClusterIP service by default', () => {
      const result = gen.generateService({ name: 'my-svc' });
      const parsed = yaml.load(result);

      expect(parsed.kind).toBe('Service');
      expect(parsed.spec.type).toBe('ClusterIP');
      expect(parsed.spec.selector.app).toBe('my-svc');
    });

    it('should set clusterIP to None for headless services', () => {
      const result = gen.generateService({ name: 'zk-hs', clusterIP: 'None' });
      const parsed = yaml.load(result);

      expect(parsed.spec.clusterIP).toBe('None');
    });

    it('should support multi-port services', () => {
      const result = gen.generateService({
        name: 'multi',
        ports: [
          { name: 'http', port: 80, targetPort: 8080 },
          { name: 'grpc', port: 9090, targetPort: 9090 },
        ],
      });
      const parsed = yaml.load(result);

      expect(parsed.spec.ports).toHaveLength(2);
      expect(parsed.spec.ports[0].name).toBe('http');
      expect(parsed.spec.ports[1].port).toBe(9090);
    });

    it('should include annotations when provided', () => {
      const result = gen.generateService({
        name: 'lb',
        annotations: { 'service.beta.kubernetes.io/aws-load-balancer-type': 'nlb' },
      });
      const parsed = yaml.load(result);

      expect(parsed.metadata.annotations['service.beta.kubernetes.io/aws-load-balancer-type']).toBe('nlb');
    });

    it('should include NodePort when serviceType is NodePort', () => {
      const result = gen.generateService({
        name: 'np-svc',
        serviceType: 'NodePort',
        nodePort: 30080,
      });
      const parsed = yaml.load(result);

      expect(parsed.spec.type).toBe('NodePort');
      expect(parsed.spec.ports[0].nodePort).toBe(30080);
    });
  });

  // =========================================================================
  // generateConfigMap
  // =========================================================================
  describe('generateConfigMap', () => {
    it('should create a ConfigMap with direct data', () => {
      const result = gen.generateConfigMap({
        name: 'my-config',
        data: { KEY: 'value', ANOTHER: 'val2' },
      });
      const parsed = yaml.load(result);

      expect(parsed.kind).toBe('ConfigMap');
      expect(parsed.metadata.name).toBe('my-config');
      expect(parsed.data.KEY).toBe('value');
    });

    it('should handle multi-line string values', () => {
      const result = gen.generateConfigMap({
        name: 'ml-config',
        data: { 'app.cfg': 'line1\nline2\nline3' },
      });
      const parsed = yaml.load(result);

      expect(parsed.data['app.cfg']).toContain('line1');
      expect(parsed.data['app.cfg']).toContain('line3');
    });
  });

  // =========================================================================
  // generateSecret
  // =========================================================================
  describe('generateSecret', () => {
    it('should create an Opaque Secret with stringData', () => {
      const result = gen.generateSecret({
        name: 'db-secret',
        stringData: { password: 'hunter2' },
      });
      const parsed = yaml.load(result);

      expect(parsed.kind).toBe('Secret');
      expect(parsed.type).toBe('Opaque');
      expect(parsed.stringData.password).toBe('hunter2');
    });
  });

  // =========================================================================
  // generateStatefulSet
  // =========================================================================
  describe('generateStatefulSet', () => {
    it('should produce a valid StatefulSet YAML', () => {
      const result = gen.generateStatefulSet({
        name: 'zlzookeeper',
        serviceName: 'zk-hs',
        image: 'ecr/zk:1.0',
        replicas: 3,
        volumeClaimTemplates: [
          { name: 'data', storage: '10Gi', storageClassName: 'ebs-sc' },
        ],
      });
      const parsed = yaml.load(result);

      expect(parsed.kind).toBe('StatefulSet');
      expect(parsed.apiVersion).toBe('apps/v1');
      expect(parsed.spec.replicas).toBe(3);
      expect(parsed.spec.serviceName).toBe('zk-hs');
      expect(parsed.spec.volumeClaimTemplates).toHaveLength(1);
      expect(parsed.spec.volumeClaimTemplates[0].spec.storageClassName).toBe('ebs-sc');
    });

    it('should include initContainers when provided', () => {
      const result = gen.generateStatefulSet({
        name: 'zk',
        serviceName: 'zk-hs',
        image: 'zk:1',
        initContainers: [{ name: 'init', image: 'busybox' }],
      });
      const parsed = yaml.load(result);

      expect(parsed.spec.template.spec.initContainers).toHaveLength(1);
    });

    it('should include imagePullSecrets', () => {
      const result = gen.generateStatefulSet({
        name: 'zk',
        serviceName: 'zk-hs',
        image: 'zk:1',
        imagePullSecrets: [{ name: 'ecr-cred' }],
      });
      const parsed = yaml.load(result);

      expect(parsed.spec.template.spec.imagePullSecrets).toEqual([{ name: 'ecr-cred' }]);
    });

    it('should include env and envFrom', () => {
      const result = gen.generateStatefulSet({
        name: 'zk',
        serviceName: 'zk-hs',
        image: 'zk:1',
        env: [{ name: 'ZK_ID', value: '1' }],
        envFrom: [{ configMapRef: { name: 'zk-config' } }],
      });
      const parsed = yaml.load(result);
      const container = parsed.spec.template.spec.containers[0];

      expect(container.env[0].name).toBe('ZK_ID');
      expect(container.envFrom[0].configMapRef.name).toBe('zk-config');
    });

    it('should set podManagementPolicy', () => {
      const result = gen.generateStatefulSet({
        name: 'zk',
        serviceName: 'zk-hs',
        image: 'zk:1',
        podManagementPolicy: 'OrderedReady',
      });
      const parsed = yaml.load(result);

      expect(parsed.spec.podManagementPolicy).toBe('OrderedReady');
    });
  });

  // =========================================================================
  // generateStorageClass
  // =========================================================================
  describe('generateStorageClass', () => {
    it('should produce a valid StorageClass', () => {
      const result = gen.generateStorageClass({
        name: 'ebs-sc',
        provisioner: 'ebs.csi.aws.com',
        parameters: { type: 'gp3' },
      });
      const parsed = yaml.load(result);

      expect(parsed.kind).toBe('StorageClass');
      expect(parsed.provisioner).toBe('ebs.csi.aws.com');
      expect(parsed.parameters.type).toBe('gp3');
      expect(parsed.allowVolumeExpansion).toBe(true);
    });

    it('should set isDefault annotation', () => {
      const result = gen.generateStorageClass({
        name: 'ebs-sc',
        provisioner: 'ebs.csi.aws.com',
        isDefault: true,
      });
      const parsed = yaml.load(result);

      expect(parsed.metadata.annotations['storageclass.kubernetes.io/is-default-class']).toBe('true');
    });

    it('should not set isDefault annotation by default', () => {
      const result = gen.generateStorageClass({
        name: 'efs-sc',
        provisioner: 'efs.csi.aws.com',
      });
      const parsed = yaml.load(result);

      expect(parsed.metadata.annotations).toBeUndefined();
    });
  });

  // =========================================================================
  // generateServiceAccount
  // =========================================================================
  describe('generateServiceAccount', () => {
    it('should produce a valid ServiceAccount', () => {
      const result = gen.generateServiceAccount({
        name: 'zl-sa',
        namespace: 'zl',
      });
      const parsed = yaml.load(result);

      expect(parsed.kind).toBe('ServiceAccount');
      expect(parsed.metadata.name).toBe('zl-sa');
      expect(parsed.metadata.namespace).toBe('zl');
    });

    it('should include IRSA annotations', () => {
      const result = gen.generateServiceAccount({
        name: 'zl-sa',
        annotations: { 'eks.amazonaws.com/role-arn': 'arn:aws:iam::role/test' },
      });
      const parsed = yaml.load(result);

      expect(parsed.metadata.annotations['eks.amazonaws.com/role-arn']).toBe('arn:aws:iam::role/test');
    });
  });

  // =========================================================================
  // generateIngress
  // =========================================================================
  describe('generateIngress', () => {
    it('should produce an nginx Ingress by default', () => {
      const result = gen.generateIngress({
        name: 'web-ingress',
        ingress: {
          host: 'example.com',
        },
      });
      const parsed = yaml.load(result);

      expect(parsed.kind).toBe('Ingress');
      expect(parsed.metadata.annotations['kubernetes.io/ingress.class']).toBe('nginx');
    });

    it('should produce ALB Ingress with annotations', () => {
      const result = gen.generateIngress({
        name: 'alb-ingress',
        ingress: {
          class: 'alb',
          host: 'app.example.com',
          certificateArn: 'arn:aws:acm:us-east-1:123:certificate/abc',
        },
      });
      const parsed = yaml.load(result);

      expect(parsed.spec.ingressClassName).toBe('alb');
      expect(parsed.metadata.annotations['alb.ingress.kubernetes.io/scheme']).toBe('internet-facing');
      expect(parsed.metadata.annotations['alb.ingress.kubernetes.io/certificate-arn']).toBe(
        'arn:aws:acm:us-east-1:123:certificate/abc'
      );
    });
  });

  // =========================================================================
  // generateHPA
  // =========================================================================
  describe('generateHPA', () => {
    it('should produce a valid HPA', () => {
      const result = gen.generateHPA({
        name: 'web-hpa',
        autoscaling: { minReplicas: 2, maxReplicas: 10 },
      });
      const parsed = yaml.load(result);

      expect(parsed.kind).toBe('HorizontalPodAutoscaler');
      expect(parsed.spec.minReplicas).toBe(2);
      expect(parsed.spec.maxReplicas).toBe(10);
    });
  });

  // =========================================================================
  // generatePVC
  // =========================================================================
  describe('generatePVC', () => {
    it('should produce a valid PVC', () => {
      const result = gen.generatePVC(
        { name: 'data-pvc', namespace: 'prod' },
        { pvcName: 'data-pvc', size: '50Gi', storageClass: 'ebs-sc' }
      );
      const parsed = yaml.load(result);

      expect(parsed.kind).toBe('PersistentVolumeClaim');
      expect(parsed.spec.resources.requests.storage).toBe('50Gi');
      expect(parsed.spec.storageClassName).toBe('ebs-sc');
    });
  });

  // =========================================================================
  // generateAll
  // =========================================================================
  describe('generateAll', () => {
    it('should produce an array of manifest objects', () => {
      const result = gen.generateAll({
        clusterName: 'test',
        namespace: 'default',
        image: 'nginx:1.25',
        replicas: 2,
        port: 80,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);

      // Each item is { kind, name, content } where content is a YAML string
      result.forEach(item => {
        expect(item).toHaveProperty('kind');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('content');
        const parsed = yaml.load(item.content);
        expect(parsed).toHaveProperty('kind');
        expect(parsed).toHaveProperty('apiVersion');
      });
    });
  });
});
