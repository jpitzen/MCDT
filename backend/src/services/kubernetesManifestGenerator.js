/**
 * Kubernetes Manifest Generator
 * 
 * Generates Kubernetes YAML manifests from deployment configuration.
 * Used for local Minikube deployments instead of Terraform.
 */

const yaml = require('js-yaml');

class KubernetesManifestGenerator {
  /**
   * Generate Namespace manifest
   */
  generateNamespace(name) {
    const manifest = {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: name,
        labels: {
          'app.kubernetes.io/managed-by': 'zlaws',
          'zlaws.io/environment': 'local'
        }
      }
    };

    return yaml.dump(manifest);
  }

  /**
   * Generate Deployment manifest
   * 
   * Supports:
   * - command/args: Container command override
   * - initContainers: Pre-start init container specs
   * - imagePullSecrets: Array of image pull secret refs (also supports legacy singular imagePullSecret)
   * - serviceAccountName: Pod service account
   * - env: Per-key env vars with plain value, configMapKeyRef, or secretKeyRef
   * - envFrom: Explicit envFrom array (in addition to legacy configMap/secrets boolean triggers)
   * - volumes: PVC, ConfigMap (with items/subPath), and emptyDir volume types
   * - Separate livenessProbe and readinessProbe configuration
   */
  generateDeployment(config) {
    const name = config.name || config.clusterName;
    const namespace = config.namespace || 'default';
    const image = config.image || 'nginx:latest';
    const replicas = config.replicas || 1;
    const port = config.port || config.containerPort || 80;

    // Build container spec
    const containerSpec = {
      name: name,
      image: image,
    };

    // Image pull policy
    if (config.imagePullPolicy) {
      containerSpec.imagePullPolicy = config.imagePullPolicy;
    }

    // Ports — support array of {name, containerPort} or single port number
    if (config.ports && Array.isArray(config.ports)) {
      containerSpec.ports = config.ports.map(p => ({
        name: p.name,
        containerPort: p.containerPort || p.port,
        protocol: p.protocol || 'TCP'
      }));
    } else {
      containerSpec.ports = [{
        containerPort: port,
        protocol: 'TCP'
      }];
    }

    // Resources
    containerSpec.resources = {
      requests: {
        memory: config.memoryRequest || '128Mi',
        cpu: config.cpuRequest || '100m'
      },
      limits: {
        memory: config.memoryLimit || '256Mi',
        cpu: config.cpuLimit || '200m'
      }
    };

    // Command override
    if (config.command) {
      containerSpec.command = config.command;
    }

    // Args
    if (config.args) {
      containerSpec.args = config.args;
    }

    // Per-key environment variables (plain value, configMapKeyRef, secretKeyRef)
    if (config.env && config.env.length > 0) {
      containerSpec.env = config.env.map(e => {
        if (e.valueFrom) {
          return { name: e.name, valueFrom: e.valueFrom };
        }
        return { name: e.name, value: String(e.value) };
      });
    }

    // envFrom: explicit array + legacy configMap/secrets boolean triggers
    const envFrom = [];
    if (config.envFrom && config.envFrom.length > 0) {
      envFrom.push(...config.envFrom);
    }
    if (config.configMap) {
      envFrom.push({ configMapRef: { name: `${name}-config` } });
    }
    if (config.secrets) {
      envFrom.push({ secretRef: { name: `${name}-secret` } });
    }
    if (envFrom.length > 0) {
      containerSpec.envFrom = envFrom;
    }

    // Build volumes and volumeMounts — supports PVC, ConfigMap, and emptyDir types
    const volumeMounts = [];
    const volumes = [];

    if (config.volumes && config.volumes.length > 0) {
      config.volumes.forEach(v => {
        // Volume mount
        if (v.mountPath) {
          const mount = { name: v.name, mountPath: v.mountPath };
          if (v.subPath) {
            mount.subPath = v.subPath;
          }
          if (v.readOnly) {
            mount.readOnly = true;
          }
          volumeMounts.push(mount);
        }

        // Volume source — determine type
        if (v.configMap) {
          // ConfigMap volume (with optional items for subPath mounting)
          const volDef = { name: v.name, configMap: { name: v.configMap.name } };
          if (v.configMap.items) {
            volDef.configMap.items = v.configMap.items;
          }
          volumes.push(volDef);
        } else if (v.emptyDir !== undefined) {
          // emptyDir volume
          volumes.push({ name: v.name, emptyDir: v.emptyDir || {} });
        } else {
          // PVC volume (existing/default behavior)
          volumes.push({
            name: v.name,
            persistentVolumeClaim: {
              claimName: v.pvcName || `${name}-${v.name}-pvc`
            }
          });
        }
      });
    }

    if (volumeMounts.length > 0) {
      containerSpec.volumeMounts = volumeMounts;
    }

    // Liveness and readiness probes
    if (config.healthCheck || config.livenessProbe) {
      const probe = config.healthCheck || config.livenessProbe;
      containerSpec.livenessProbe = this._buildProbe(probe);
      // Use same probe for readiness unless a separate readinessProbe is provided
      if (!config.readinessProbe) {
        containerSpec.readinessProbe = this._buildProbe(probe);
      }
    }
    if (config.readinessProbe) {
      containerSpec.readinessProbe = this._buildProbe(config.readinessProbe);
    }

    // Build pod spec
    const podSpec = {
      containers: [containerSpec]
    };

    // Service account
    if (config.serviceAccountName) {
      podSpec.serviceAccountName = config.serviceAccountName;
    }

    // Init containers
    if (config.initContainers && config.initContainers.length > 0) {
      podSpec.initContainers = config.initContainers;
    }

    // Image pull secrets — array form or legacy singular
    if (config.imagePullSecrets && config.imagePullSecrets.length > 0) {
      podSpec.imagePullSecrets = config.imagePullSecrets;
    } else if (config.imagePullSecret) {
      podSpec.imagePullSecrets = [{ name: config.imagePullSecret }];
    }

    // Attach volumes to pod spec (deduplicate by name for multiple subPath mounts)
    if (volumes.length > 0) {
      const uniqueVolumes = [];
      const seenVolumeNames = new Set();
      volumes.forEach(v => {
        if (!seenVolumeNames.has(v.name)) {
          uniqueVolumes.push(v);
          seenVolumeNames.add(v.name);
        }
      });
      podSpec.volumes = uniqueVolumes;
    }

    const manifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: name,
        namespace: namespace,
        labels: {
          app: name,
          'app.kubernetes.io/name': name,
          'app.kubernetes.io/managed-by': 'zlaws',
          'zlaws.io/environment': 'local'
        }
      },
      spec: {
        replicas: replicas,
        ...(config.strategy ? { strategy: { type: config.strategy } } : {}),
        selector: {
          matchLabels: {
            app: name
          }
        },
        template: {
          metadata: {
            labels: {
              app: name,
              'app.kubernetes.io/name': name
            }
          },
          spec: podSpec
        }
      }
    };

    return yaml.dump(manifest);
  }

  /**
   * Generate Service manifest
   * 
   * Supports:
   * - clusterIP: 'None' for headless services (StatefulSet requirement)
   * - ports: Array of port objects for multi-port services
   * - annotations: Service annotations (e.g. for load balancer config)
   * - Backward compatible with single port/targetPort/nodePort
   */
  generateService(config) {
    const name = config.name || config.clusterName;
    const namespace = config.namespace || 'default';
    const serviceType = config.serviceType || 'ClusterIP';

    // Build ports — support either array of ports or legacy single port/targetPort
    let ports;
    if (config.ports && Array.isArray(config.ports)) {
      ports = config.ports.map(p => ({
        name: p.name || 'http',
        port: p.port,
        targetPort: p.targetPort || p.port,
        protocol: p.protocol || 'TCP'
      }));
    } else {
      const port = config.port || config.containerPort || 80;
      const targetPort = config.targetPort || port;
      ports = [{
        name: 'http',
        port: port,
        targetPort: targetPort,
        protocol: 'TCP'
      }];
    }

    const manifest = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: name,
        namespace: namespace,
        labels: {
          app: name,
          'app.kubernetes.io/name': name,
          'app.kubernetes.io/managed-by': 'zlaws'
        }
      },
      spec: {
        type: serviceType,
        selector: {
          app: config.selector || name
        },
        ports: ports
      }
    };

    // Annotations (e.g. for load balancer, AWS ALB, etc.)
    if (config.annotations && Object.keys(config.annotations).length > 0) {
      manifest.metadata.annotations = config.annotations;
    }

    // Headless service — clusterIP: None (required for StatefulSets)
    if (config.clusterIP === 'None') {
      manifest.spec.clusterIP = 'None';
    }

    // For NodePort, add nodePort if specified
    if (serviceType === 'NodePort' && config.nodePort) {
      manifest.spec.ports[0].nodePort = config.nodePort;
    }

    return yaml.dump(manifest);
  }

  /**
   * Generate ConfigMap manifest
   * 
   * Two calling conventions:
   * - Direct: { name: 'my-config', data: { 'key': 'value' } } — name used as-is
   * - Legacy: { name: 'myapp', configMap: { KEY: 'val' } } — auto-appends '-config' suffix
   * 
   * Multi-line string values automatically render as YAML block scalars (|) via js-yaml.
   */
  generateConfigMap(config) {
    const namespace = config.namespace || 'default';

    // Determine naming and data source
    let metadataName;
    let data;
    if (config.data) {
      // Direct mode: name is used as-is, data provided directly
      metadataName = config.name;
      data = config.data;
    } else {
      // Legacy mode: auto-append '-config', data from config.configMap
      const name = config.name || config.clusterName;
      metadataName = `${name}-config`;
      data = config.configMap || {};
    }

    const appLabel = config.name || config.clusterName || metadataName;

    const manifest = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: metadataName,
        namespace: namespace,
        labels: {
          app: appLabel,
          'app.kubernetes.io/name': appLabel,
          'app.kubernetes.io/managed-by': 'zlaws'
        }
      },
      data: {}
    };

    // Convert all values to strings (preserves multi-line content for block scalars)
    Object.keys(data).forEach(key => {
      manifest.data[key] = String(data[key]);
    });

    return yaml.dump(manifest);
  }

  /**
   * Generate Secret manifest
   * 
   * Two calling conventions:
   * - Direct: { name: 'db-secret', stringData: { KEY: 'val' } } — name used as-is
   * - Legacy: { name: 'myapp', secrets: { KEY: 'val' } } — auto-appends '-secret' suffix
   */
  generateSecret(config) {
    const namespace = config.namespace || 'default';

    // Determine naming and data source
    let metadataName;
    let stringData;
    let secretType = config.type || 'Opaque';
    if (config.stringData) {
      // Direct mode: name used as-is
      metadataName = config.name;
      stringData = config.stringData;
    } else {
      // Legacy mode: auto-append '-secret'
      const name = config.name || config.clusterName;
      metadataName = `${name}-secret`;
      stringData = config.secrets || {};
    }

    const appLabel = config.name || config.clusterName || metadataName;

    const manifest = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: metadataName,
        namespace: namespace,
        labels: {
          app: appLabel,
          'app.kubernetes.io/name': appLabel,
          'app.kubernetes.io/managed-by': 'zlaws'
        }
      },
      type: secretType,
      stringData: {}
    };

    // Add secrets as stringData (will be base64 encoded by K8s)
    Object.keys(stringData).forEach(key => {
      manifest.stringData[key] = String(stringData[key]);
    });

    return yaml.dump(manifest);
  }

  /**
   * Generate Ingress manifest
   * 
   * Supports:
   * - Standard nginx ingress class (default)
   * - AWS ALB ingress class with full annotation support
   * - TLS termination via secrets or ACM certificate ARN
   * - Multiple path rules
   */
  generateIngress(config) {
    const name = config.name || config.clusterName;
    const namespace = config.namespace || 'default';
    const port = config.port || 80;
    const ingressConfig = config.ingress || {};

    // Determine ingress class — alb or nginx (default)
    const ingressClass = ingressConfig.class || ingressConfig.ingressClass || 'nginx';

    // Build annotations based on ingress class
    const annotations = {};

    if (ingressClass === 'alb') {
      // AWS ALB Ingress annotations
      annotations['kubernetes.io/ingress.class'] = 'alb';
      annotations['alb.ingress.kubernetes.io/scheme'] = ingressConfig.scheme || 'internet-facing';
      annotations['alb.ingress.kubernetes.io/target-type'] = ingressConfig.targetType || 'ip';

      // SSL via ACM certificate
      if (ingressConfig.certificateArn) {
        annotations['alb.ingress.kubernetes.io/certificate-arn'] = ingressConfig.certificateArn;
        annotations['alb.ingress.kubernetes.io/listen-ports'] = '[{"HTTPS":443}]';
        annotations['alb.ingress.kubernetes.io/ssl-redirect'] = '443';
        annotations['alb.ingress.kubernetes.io/ssl-policy'] = ingressConfig.sslPolicy || 'ELBSecurityPolicy-TLS13-1-2-2021-06';
      } else {
        annotations['alb.ingress.kubernetes.io/listen-ports'] = '[{"HTTP":80}]';
      }

      // Health check customization
      if (ingressConfig.healthCheckPath) {
        annotations['alb.ingress.kubernetes.io/healthcheck-path'] = ingressConfig.healthCheckPath;
      }

      // Group name for shared ALB
      if (ingressConfig.groupName) {
        annotations['alb.ingress.kubernetes.io/group.name'] = ingressConfig.groupName;
      }

      // Idle timeout
      if (ingressConfig.idleTimeout) {
        annotations['alb.ingress.kubernetes.io/load-balancer-attributes'] =
          `idle_timeout.timeout_seconds=${ingressConfig.idleTimeout}`;
      }
    } else {
      // Default nginx annotations
      annotations['kubernetes.io/ingress.class'] = 'nginx';
    }

    // Merge any user-provided annotations (overrides defaults)
    if (ingressConfig.annotations) {
      Object.assign(annotations, ingressConfig.annotations);
    }

    // Build path rules — support array of paths or single path
    let paths;
    if (ingressConfig.paths && Array.isArray(ingressConfig.paths)) {
      paths = ingressConfig.paths.map(p => ({
        path: p.path || '/',
        pathType: p.pathType || 'Prefix',
        backend: {
          service: {
            name: p.serviceName || name,
            port: {
              number: p.port || port
            }
          }
        }
      }));
    } else {
      paths = [{
        path: ingressConfig.path || '/',
        pathType: 'Prefix',
        backend: {
          service: {
            name: name,
            port: {
              number: port
            }
          }
        }
      }];
    }

    const manifest = {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name: `${name}-ingress`,
        namespace: namespace,
        labels: {
          app: name,
          'app.kubernetes.io/name': name,
          'app.kubernetes.io/managed-by': 'zlaws'
        },
        annotations: annotations
      },
      spec: {
        rules: [{
          host: ingressConfig.host || `${name}.local`,
          http: {
            paths: paths
          }
        }]
      }
    };

    // For ALB with ingressClassName (networking.k8s.io/v1 style)
    if (ingressClass === 'alb') {
      manifest.spec.ingressClassName = 'alb';
    }

    // Add TLS if configured (nginx-style secret or ALB ACM)
    if (ingressConfig.tls) {
      manifest.spec.tls = [{
        hosts: [ingressConfig.host || `${name}.local`],
        secretName: ingressConfig.tlsSecretName || `${name}-tls`
      }];
    }

    return yaml.dump(manifest);
  }

  /**
   * Generate HorizontalPodAutoscaler manifest
   */
  generateHPA(config) {
    const name = config.name || config.clusterName;
    const namespace = config.namespace || 'default';
    const hpa = config.autoscaling || {};

    const manifest = {
      apiVersion: 'autoscaling/v2',
      kind: 'HorizontalPodAutoscaler',
      metadata: {
        name: `${name}-hpa`,
        namespace: namespace,
        labels: {
          app: name,
          'app.kubernetes.io/managed-by': 'zlaws'
        }
      },
      spec: {
        scaleTargetRef: {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          name: name
        },
        minReplicas: hpa.minReplicas || 1,
        maxReplicas: hpa.maxReplicas || 10,
        metrics: [{
          type: 'Resource',
          resource: {
            name: 'cpu',
            target: {
              type: 'Utilization',
              averageUtilization: hpa.targetCPUUtilization || 70
            }
          }
        }]
      }
    };

    return yaml.dump(manifest);
  }

  /**
   * Generate PersistentVolumeClaim manifest
   */
  generatePVC(config, volumeConfig) {
    const name = config.name || config.clusterName;
    const namespace = config.namespace || 'default';

    const manifest = {
      apiVersion: 'v1',
      kind: 'PersistentVolumeClaim',
      metadata: {
        name: volumeConfig.pvcName || `${name}-${volumeConfig.name}-pvc`,
        namespace: namespace,
        labels: {
          app: name,
          'app.kubernetes.io/managed-by': 'zlaws'
        }
      },
      spec: {
        accessModes: volumeConfig.accessModes || ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: volumeConfig.size || '1Gi'
          }
        },
        storageClassName: volumeConfig.storageClass || 'standard'
      }
    };

    return yaml.dump(manifest);
  }

  /**
   * Generate all manifests for a deployment
   */
  generateAll(config) {
    const manifests = [];
    const name = config.name || config.clusterName;

    // Namespace (if not default)
    if (config.namespace && config.namespace !== 'default') {
      manifests.push({
        kind: 'Namespace',
        name: config.namespace,
        content: this.generateNamespace(config.namespace)
      });
    }

    // ConfigMap
    if (config.configMap && Object.keys(config.configMap).length > 0) {
      manifests.push({
        kind: 'ConfigMap',
        name: `${name}-config`,
        content: this.generateConfigMap(config)
      });
    }

    // Secret
    if (config.secrets && Object.keys(config.secrets).length > 0) {
      manifests.push({
        kind: 'Secret',
        name: `${name}-secret`,
        content: this.generateSecret(config)
      });
    }

    // PVCs
    if (config.volumes && config.volumes.length > 0) {
      config.volumes.forEach(vol => {
        manifests.push({
          kind: 'PersistentVolumeClaim',
          name: vol.pvcName || `${name}-${vol.name}-pvc`,
          content: this.generatePVC(config, vol)
        });
      });
    }

    // Deployment
    manifests.push({
      kind: 'Deployment',
      name: name,
      content: this.generateDeployment(config)
    });

    // Service
    manifests.push({
      kind: 'Service',
      name: name,
      content: this.generateService(config)
    });

    // Ingress
    if (config.ingress?.enabled) {
      manifests.push({
        kind: 'Ingress',
        name: `${name}-ingress`,
        content: this.generateIngress(config)
      });
    }

    // HPA
    if (config.autoscaling?.enabled) {
      manifests.push({
        kind: 'HorizontalPodAutoscaler',
        name: `${name}-hpa`,
        content: this.generateHPA(config)
      });
    }

    return manifests;
  }

  /**
   * Build health check probe configuration
   */
  _buildProbe(probe) {
    const probeConfig = {
      initialDelaySeconds: probe.initialDelaySeconds || 30,
      periodSeconds: probe.periodSeconds || 10,
      timeoutSeconds: probe.timeoutSeconds || 5,
      failureThreshold: probe.failureThreshold || 3,
      successThreshold: probe.successThreshold || 1
    };

    if (probe.httpGet || probe.path) {
      probeConfig.httpGet = {
        path: probe.path || probe.httpGet?.path || '/health',
        port: probe.port || probe.httpGet?.port || 80
      };
    } else if (probe.tcpSocket || probe.tcpPort) {
      probeConfig.tcpSocket = {
        port: probe.tcpPort || probe.tcpSocket?.port
      };
    } else if (probe.exec || probe.command) {
      probeConfig.exec = {
        command: probe.command || probe.exec?.command
      };
    }

    return probeConfig;
  }

  /**
   * Generate StatefulSet manifest
   * 
   * Produces a full StatefulSet with volumeClaimTemplates, initContainers,
   * command/args override, serviceName (headless service link), and podManagementPolicy.
   */
  generateStatefulSet(config) {
    const {
      name,
      namespace = 'default',
      labels = {},
      replicas = 3,
      serviceName,
      podManagementPolicy = 'Parallel',
      image,
      imagePullSecrets = [],
      serviceAccountName,
      ports = [],
      env = [],
      envFrom = [],
      command,
      args,
      volumes = [],
      volumeMounts = [],
      initContainers = [],
      resources = {},
      livenessProbe,
      readinessProbe,
      volumeClaimTemplates = [],
    } = config;

    const mergedLabels = {
      app: name,
      'app.kubernetes.io/name': name,
      'app.kubernetes.io/managed-by': 'zlaws',
      ...labels
    };

    // Build container spec
    const containerSpec = {
      name: name,
      image: image,
    };

    if (command) {
      containerSpec.command = command;
    }
    if (args) {
      containerSpec.args = args;
    }

    if (ports.length > 0) {
      containerSpec.ports = ports.map(p => ({
        name: p.name,
        containerPort: p.containerPort || p.port,
        protocol: p.protocol || 'TCP'
      }));
    }

    // Environment variables — plain value, configMapKeyRef, secretKeyRef
    if (env.length > 0) {
      containerSpec.env = env.map(e => {
        if (e.valueFrom) {
          return { name: e.name, valueFrom: e.valueFrom };
        }
        return { name: e.name, value: String(e.value) };
      });
    }

    if (envFrom.length > 0) {
      containerSpec.envFrom = envFrom;
    }

    if (Object.keys(resources).length > 0) {
      containerSpec.resources = resources;
    }

    if (volumeMounts.length > 0) {
      containerSpec.volumeMounts = volumeMounts;
    }

    if (livenessProbe) {
      containerSpec.livenessProbe = this._buildProbe(livenessProbe);
    }
    if (readinessProbe) {
      containerSpec.readinessProbe = this._buildProbe(readinessProbe);
    }

    // Build pod spec
    const podSpec = {
      containers: [containerSpec]
    };

    if (serviceAccountName) {
      podSpec.serviceAccountName = serviceAccountName;
    }

    if (imagePullSecrets.length > 0) {
      podSpec.imagePullSecrets = imagePullSecrets;
    }

    if (initContainers.length > 0) {
      podSpec.initContainers = initContainers;
    }

    if (volumes.length > 0) {
      podSpec.volumes = volumes;
    }

    const manifest = {
      apiVersion: 'apps/v1',
      kind: 'StatefulSet',
      metadata: {
        name: name,
        namespace: namespace,
        labels: mergedLabels
      },
      spec: {
        replicas: replicas,
        serviceName: serviceName,
        podManagementPolicy: podManagementPolicy,
        selector: {
          matchLabels: {
            app: name
          }
        },
        template: {
          metadata: {
            labels: mergedLabels
          },
          spec: podSpec
        }
      }
    };

    // Volume claim templates — the defining feature of StatefulSets
    if (volumeClaimTemplates.length > 0) {
      manifest.spec.volumeClaimTemplates = volumeClaimTemplates.map(vct => ({
        metadata: {
          name: vct.name
        },
        spec: {
          accessModes: vct.accessModes || ['ReadWriteOnce'],
          storageClassName: vct.storageClassName,
          resources: {
            requests: {
              storage: vct.storage || '10Gi'
            }
          }
        }
      }));
    }

    return yaml.dump(manifest);
  }

  /**
   * Generate StorageClass manifest
   * 
   * Supports arbitrary cloud-specific parameters (EBS, EFS, etc.),
   * isDefault annotation, and volumeBindingMode.
   */
  generateStorageClass(config) {
    const {
      name,
      provisioner,
      parameters = {},
      reclaimPolicy = 'Delete',
      volumeBindingMode = 'WaitForFirstConsumer',
      allowVolumeExpansion = true,
      isDefault = false,
    } = config;

    const manifest = {
      apiVersion: 'storage.k8s.io/v1',
      kind: 'StorageClass',
      metadata: {
        name: name,
        labels: {
          'app.kubernetes.io/managed-by': 'zlaws'
        }
      },
      provisioner: provisioner,
      parameters: parameters,
      reclaimPolicy: reclaimPolicy,
      volumeBindingMode: volumeBindingMode,
      allowVolumeExpansion: allowVolumeExpansion,
    };

    if (isDefault) {
      manifest.metadata.annotations = {
        'storageclass.kubernetes.io/is-default-class': 'true'
      };
    }

    return yaml.dump(manifest);
  }

  /**
   * Generate ServiceAccount manifest
   * 
   * Supports IRSA annotations for AWS EKS (eks.amazonaws.com/role-arn).
   */
  generateServiceAccount(config) {
    const {
      name,
      namespace = 'default',
      annotations = {},
      labels = {},
    } = config;

    const manifest = {
      apiVersion: 'v1',
      kind: 'ServiceAccount',
      metadata: {
        name: name,
        namespace: namespace,
        labels: {
          'app.kubernetes.io/managed-by': 'zlaws',
          ...labels
        }
      }
    };

    if (Object.keys(annotations).length > 0) {
      manifest.metadata.annotations = annotations;
    }

    return yaml.dump(manifest);
  }

  /**
   * Generate Docker Registry Secret manifest (kubernetes.io/dockerconfigjson)
   * 
   * Produces a Secret for ECR/private registry imagePullSecrets with
   * properly base64-encoded .dockerconfigjson data.
   */
  generateDockerRegistrySecret(config) {
    const {
      name,
      namespace = 'default',
      server,
      username,
      password,
      email = '',
    } = config;

    const dockerConfigJson = JSON.stringify({
      auths: {
        [server]: {
          username: username,
          password: password,
          email: email,
          auth: Buffer.from(`${username}:${password}`).toString('base64')
        }
      }
    });

    const manifest = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: name,
        namespace: namespace,
        labels: {
          'app.kubernetes.io/managed-by': 'zlaws'
        }
      },
      type: 'kubernetes.io/dockerconfigjson',
      data: {
        '.dockerconfigjson': Buffer.from(dockerConfigJson).toString('base64')
      }
    };

    return yaml.dump(manifest);
  }
}

module.exports = KubernetesManifestGenerator;
