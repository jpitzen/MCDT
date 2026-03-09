/**
 * OpenAPI 3.0 Specification — ZLAWS Multi-Cloud Deployment Platform
 *
 * Serves the API documentation as JSON at GET /api/docs/spec
 * and (when swagger-ui-express is available) a rendered UI at GET /api/docs.
 *
 * Priority endpoints documented per phase7.md:
 *   - POST   /api/deployments          (with accessMode fields)
 *   - GET    /api/deployments/:id
 *   - GET    /api/deployments/:id/health
 *   - POST   /api/deployments/:id/scan
 *   - POST   /api/credentials
 *   - POST   /api/auth/login
 *   - POST   /api/auth/register
 */

const express = require('express');
const router = express.Router();

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'ZLAWS — Multi-Cloud Kubernetes Deployment Platform',
    version: '1.0.0',
    description:
      'REST API for the ZL application deployment platform. Manages Kubernetes cluster ' +
      'provisioning across AWS EKS, Azure AKS, GCP GKE, DigitalOcean DOKS, and Linode LKE, ' +
      'plus ZL application deployment, credential storage, and team-based RBAC.',
    contact: { name: 'ZLAWS Platform Team' },
    license: { name: 'Proprietary' },
  },
  servers: [
    { url: '/api', description: 'Local / production API root' },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication and registration' },
    { name: 'Deployments', description: 'Cluster and application deployments' },
    { name: 'Credentials', description: 'Cloud provider credential management' },
    { name: 'Teams', description: 'Team-based access control' },
    { name: 'Admin', description: 'Administrative operations' },
  ],

  // ── Shared components ─────────────────────────────────────────────────────
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from POST /auth/login',
      },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          message: { type: 'string' },
          data: { type: 'object' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          message: { type: 'string' },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      DeploymentCreate: {
        type: 'object',
        required: ['clusterName', 'cloudProvider', 'credentialId'],
        properties: {
          clusterName: { type: 'string', minLength: 1, maxLength: 100, example: 'prod-cluster' },
          cloudProvider: {
            type: 'string',
            enum: ['aws', 'azure', 'gcp', 'digitalocean', 'linode'],
          },
          credentialId: { type: 'string', format: 'uuid' },
          region: { type: 'string', example: 'us-east-1' },
          nodeCount: { type: 'integer', minimum: 1, default: 3 },
          nodeSize: { type: 'string', example: 't3.medium' },
          kubernetesVersion: { type: 'string', example: '1.28' },
          // Access-mode fields (Phase 4)
          accessMode: { type: 'string', enum: ['internal', 'external'], default: 'internal' },
          externalDomain: { type: 'string', example: 'zlpsaws.zlpsonline.com' },
          sslMode: { type: 'string', enum: ['acm', 'upload'], default: 'acm' },
          sslCertArn: { type: 'string', example: 'arn:aws:acm:us-east-1:123456789012:certificate/abc' },
          configuration: {
            type: 'object',
            description: 'Full configuration blob persisted as JSONB',
          },
        },
      },
      Deployment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          clusterName: { type: 'string' },
          cloudProvider: { type: 'string' },
          status: {
            type: 'string',
            enum: [
              'pending', 'initializing', 'planning', 'applying',
              'configuring', 'running', 'failed', 'destroying',
              'destroyed', 'error',
            ],
          },
          deploymentPhase: { type: 'string' },
          accessMode: { type: 'string', enum: ['internal', 'external'] },
          externalDomain: { type: 'string' },
          outputs: { type: 'object' },
          configuration: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CredentialCreate: {
        type: 'object',
        required: ['name', 'provider', 'credentials'],
        properties: {
          name: { type: 'string', maxLength: 100, example: 'AWS Prod' },
          provider: {
            type: 'string',
            enum: ['aws', 'azure', 'gcp', 'digitalocean', 'linode'],
          },
          credentials: {
            type: 'object',
            description: 'Provider-specific credential keys (encrypted at rest)',
          },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          zltika: { type: 'string', enum: ['healthy', 'degraded', 'unreachable'] },
          zlserver: { type: 'string', enum: ['healthy', 'degraded', 'unreachable'] },
          zlsearch: { type: 'string', enum: ['healthy', 'degraded', 'unreachable'] },
          zlui: { type: 'string', enum: ['healthy', 'degraded', 'unreachable'] },
          zookeeper: { type: 'string', enum: ['healthy', 'degraded', 'unreachable'] },
          database: { type: 'string', enum: ['connected', 'disconnected'] },
        },
      },
      ScanResult: {
        type: 'object',
        properties: {
          imageTag: { type: 'string' },
          vulnerabilities: { type: 'array', items: { type: 'object' } },
          scannedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },

  // ── Security (applied globally) ───────────────────────────────────────────
  security: [{ BearerAuth: [] }],

  // ── Paths ─────────────────────────────────────────────────────────────────
  paths: {
    // Auth
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate and receive JWT',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user account',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string', maxLength: 100 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Registration successful' },
          409: { description: 'Email already registered' },
        },
      },
    },

    // Deployments
    '/deployments': {
      get: {
        tags: ['Deployments'],
        summary: 'List all deployments for the current user',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by status' },
          { name: 'cloudProvider', in: 'query', schema: { type: 'string' }, description: 'Filter by provider' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: {
            description: 'List of deployments',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
        },
      },
      post: {
        tags: ['Deployments'],
        summary: 'Create a new deployment (triggers terraform lifecycle)',
        description:
          'Creates a deployment with the specified configuration. Includes access mode (internal/external), ' +
          'SSL configuration, and full cluster parameters. Triggers a fire-and-forget terraform lifecycle ' +
          '(init → validate → plan → apply) with progress emitted via Socket.IO.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/DeploymentCreate' } },
          },
        },
        responses: {
          201: {
            description: 'Deployment created and terraform lifecycle started',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Insufficient permissions (requires admin or operator role)' },
        },
      },
    },
    '/deployments/{id}': {
      get: {
        tags: ['Deployments'],
        summary: 'Get deployment details by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Deployment details',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/Deployment' } } },
                  ],
                },
              },
            },
          },
          404: { description: 'Deployment not found' },
        },
      },
    },
    '/deployments/{id}/health': {
      get: {
        tags: ['Deployments'],
        summary: 'Check health of all ZL application components',
        description:
          'Returns per-component health status (zltika, zlserver, zlsearch, zlui, zookeeper, database) ' +
          'by querying the Kubernetes cluster via kubectl.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Component health status',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/HealthResponse' } } },
                  ],
                },
              },
            },
          },
          404: { description: 'Deployment not found' },
        },
      },
    },
    '/deployments/{id}/scan': {
      post: {
        tags: ['Deployments'],
        summary: 'Trigger a security scan of deployment container images',
        description:
          'Runs Grype vulnerability scanner against the deployment\'s container images. ' +
          'Requires admin or operator role.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  imageTag: { type: 'string', description: 'Specific image tag to scan (optional)' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Scan results',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/ScanResult' } } },
                  ],
                },
              },
            },
          },
          403: { description: 'Insufficient permissions (requires admin or operator role)' },
          404: { description: 'Deployment not found' },
        },
      },
    },

    // Credentials
    '/credentials': {
      post: {
        tags: ['Credentials'],
        summary: 'Store a new cloud provider credential',
        description: 'Encrypts and stores cloud provider credentials. Supports AWS, Azure, GCP, DO, and Linode.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CredentialCreate' } },
          },
        },
        responses: {
          201: {
            description: 'Credential stored',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
          400: { description: 'Validation error' },
        },
      },
      get: {
        tags: ['Credentials'],
        summary: 'List stored credentials (secrets redacted)',
        responses: {
          200: { description: 'Credential list' },
        },
      },
    },
    '/credentials/{id}/validate': {
      post: {
        tags: ['Credentials'],
        summary: 'Validate a stored credential against the cloud provider',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Credential is valid' },
          400: { description: 'Credential validation failed' },
          404: { description: 'Credential not found' },
        },
      },
    },
  },
};

// ── Route: serve spec as JSON ───────────────────────────────────────────────
router.get('/spec', (req, res) => {
  res.json(spec);
});

// ── Route: try to serve Swagger UI if available ─────────────────────────────
try {
  const swaggerUi = require('swagger-ui-express');
  router.use('/', swaggerUi.serve, swaggerUi.setup(spec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ZLAWS API Documentation',
  }));
} catch {
  // swagger-ui-express not installed — serve a redirect link
  router.get('/', (req, res) => {
    res.json({
      message: 'API documentation spec available at /api/docs/spec',
      hint: 'Install swagger-ui-express for rendered UI: npm i swagger-ui-express',
      specUrl: '/api/docs/spec',
    });
  });
}

module.exports = router;
