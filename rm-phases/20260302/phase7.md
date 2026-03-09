# Phase 7 — Testing & Documentation
## Test Infrastructure, Coverage Targets, API Documentation

**Priority**: P4 (quality assurance — runs continuously alongside Phases 1–6)
**Effort**: 15+ days (ongoing)
**Sprint**: Continuous from Week 1 onward
**Prerequisites**: None (testing should start immediately and grow with each phase)

---

## Objective

Establish a test infrastructure with meaningful coverage targets for both backend and frontend. Create API documentation. This phase runs **in parallel** with all other phases — each phase should include tests for its own deliverables.

---

## Tasks

### 7.1 — Backend Test Infrastructure
**Effort**: 2 days (setup) + ongoing (test writing)

#### 7.1.1 — Jest Setup (0.5 days)

**File**: `backend/jest.config.js`
```javascript
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/migrations/**',
    '!src/models/index.js',
  ],
  coverageThresholds: {
    global: {
      branches: 40,
      functions: 40,
      lines: 40,
      statements: 40,
    },
  },
  setupFilesAfterSetup: ['<rootDir>/src/__tests__/setup.js'],
};
```

**`package.json` scripts**:
```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

#### 7.1.2 — Test Database Setup (0.5 days)

**File**: `backend/src/__tests__/setup.js`
```javascript
// Use SQLite in-memory for unit tests, PostgreSQL test DB for integration
const { Sequelize } = require('sequelize');

beforeAll(async () => {
  // Sync models to test DB
});

afterAll(async () => {
  // Close connections
});
```

#### 7.1.3 — Priority Test Targets (1 day for initial tests)

| Service | Priority | Test Focus |
|---------|:--------:|------------|
| `kubernetesManifestGenerator.js` | 🔴 P1 | Each method produces valid YAML; parameterization works |
| `zlManifestTemplates.js` (Phase 2) | 🔴 P1 | Generated YAML matches DG03 reference; access mode branching |
| `zlDeploymentOrchestrator.js` (Phase 3) | 🔴 P1 | Apply ordering; rollback logic; health check timeouts |
| `terraformExecutor.js` | 🟠 P2 | Phase transitions; error handling; output parsing |
| `deploymentService.js` | 🟠 P2 | Lifecycle state machine; validation |
| `multiCloudOrchestrator.js` | 🟡 P3 | Config generation per provider; fire-and-forget |
| `containerDeploymentService.js` | 🟡 P3 | Image build/push; StorageClass/PVC operations |

**Example test** for manifest generator:
```javascript
// backend/src/services/__tests__/kubernetesManifestGenerator.test.js
const KMG = require('../kubernetesManifestGenerator');
const yaml = require('js-yaml');

describe('KubernetesManifestGenerator', () => {
  let gen;
  
  beforeEach(() => {
    gen = new KMG();
  });
  
  describe('generateStatefulSet', () => {
    it('should produce valid StatefulSet YAML', () => {
      const result = gen.generateStatefulSet({
        name: 'zlzookeeper',
        serviceName: 'zk-hs',
        image: 'ecr/zk:1.0',
        replicas: 3,
        volumeClaimTemplates: [{ name: 'data', storage: '10Gi', storageClassName: 'ebs-sc' }],
      });
      
      const parsed = yaml.load(result);
      expect(parsed.kind).toBe('StatefulSet');
      expect(parsed.spec.replicas).toBe(3);
      expect(parsed.spec.serviceName).toBe('zk-hs');
      expect(parsed.spec.volumeClaimTemplates).toHaveLength(1);
    });
    
    it('should include initContainers when provided', () => { ... });
    it('should include imagePullSecrets', () => { ... });
  });
  
  describe('generateService - headless', () => {
    it('should set clusterIP to None', () => {
      const result = gen.generateService({
        name: 'zk-hs',
        clusterIP: 'None',
        ports: [{ name: 'client', port: 2181 }],
      });
      
      const parsed = yaml.load(result);
      expect(parsed.spec.clusterIP).toBe('None');
    });
  });
});
```

**Example test** for ZL templates:
```javascript
// backend/src/services/__tests__/zlManifestTemplates.test.js
const ZLT = require('../zlManifestTemplates');
const yaml = require('js-yaml');

describe('ZLManifestTemplates', () => {
  const baseConfig = {
    namespace: 'default',
    registryUrl: '123456789.dkr.ecr.us-east-1.amazonaws.com',
    repositoryName: 'test-repo',
    imageTags: { zlzookeeper: 'zk:1.0', zltika: 'tika:1.0', zlserver: 'server:1.0' },
    efsFileSystemId: 'fs-test123',
    db: { host: 'test-rds.amazonaws.com', port: 1433, name: 'zldb', user: 'testuser', password: 'testpass', type: 'mssql' },
    zk: { replicas: 3, authKey: 'testauthkey' },
    accessMode: 'internal',
    // ... etc
  };
  
  describe('generateAccessModeConfigs', () => {
    it('should produce HAS_SSL=false for internal mode', () => {
      const result = new ZLT().generateAccessModeConfigs({ ...baseConfig, accessMode: 'internal' });
      expect(result).toContain('HAS_SSL=false');
      expect(result).not.toContain('proxyName');
    });
    
    it('should produce HAS_SSL=true with domain for external mode', () => {
      const result = new ZLT().generateAccessModeConfigs({ ...baseConfig, accessMode: 'external', externalDomain: 'test.example.com' });
      expect(result).toContain('HAS_SSL=true');
      expect(result).toContain('web.server.URL=test.example.com');
      expect(result).toContain('proxyName="test.example.com"');
    });
  });
  
  describe('dual-source consistency', () => {
    it('should use same password in db-secret and zkclient-config', () => {
      const zlt = new ZLT();
      const dbConfig = zlt.generateZLDBConfig(baseConfig);
      const zkConfig = zlt.generateZKClientConfig(baseConfig);
      
      // Both should reference the same password value
      const dbSecret = yaml.loadAll(dbConfig).find(d => d.kind === 'Secret');
      expect(dbSecret.stringData.DB_PASSWORD).toBe(baseConfig.db.password);
      expect(zkConfig).toContain(`DB_MSSQL_PASSWORD=${baseConfig.db.password}`);
    });
  });
});
```

---

### 7.2 — Frontend Test Infrastructure
**Effort**: 2 days (setup) + ongoing

#### 7.2.1 — React Testing Library Setup (0.5 days)

**Dependencies** (should already be in CRA setup):
```json
{
  "@testing-library/react": "^14.0.0",
  "@testing-library/jest-dom": "^5.16.0",
  "@testing-library/user-event": "^14.0.0"
}
```

#### 7.2.2 — Priority Frontend Test Targets

| Component | Priority | Test Focus |
|-----------|:--------:|------------|
| `AccessModeConfig.jsx` (Phase 4) | 🔴 P1 | Radio toggle, conditional fields, dispatch calls |
| `WizardContext.jsx` | 🔴 P1 | Reducer action types, state transitions |
| `Phase5Deploy/index.jsx` | 🟠 P2 | Step rendering order, AccessMode integration |
| `Phase6Operations/index.jsx` | 🟠 P2 | Access info card rendering |
| `services/api.js` | 🟡 P3 | Namespaced vs raw Axios passthrough |

**Example test**:
```javascript
// frontend/src/pages/UnifiedDeploymentWizard/phases/Phase5Deploy/__tests__/AccessModeConfig.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { WizardProvider } from '../../../WizardContext';
import AccessModeConfig from '../AccessModeConfig';

describe('AccessModeConfig', () => {
  it('should default to internal mode', () => {
    render(<WizardProvider><AccessModeConfig /></WizardProvider>);
    expect(screen.getByLabelText(/internal only/i)).toBeChecked();
  });
  
  it('should show domain field when external is selected', () => {
    render(<WizardProvider><AccessModeConfig /></WizardProvider>);
    fireEvent.click(screen.getByLabelText(/external access/i));
    expect(screen.getByLabelText(/domain name/i)).toBeInTheDocument();
  });
  
  it('should hide domain field for internal mode', () => {
    render(<WizardProvider><AccessModeConfig /></WizardProvider>);
    expect(screen.queryByLabelText(/domain name/i)).not.toBeInTheDocument();
  });
});
```

---

### 7.3 — Coverage Targets

| Milestone | Backend | Frontend | Date |
|-----------|:-------:|:--------:|------|
| Phase 1 complete | 20% | — | Week 2 |
| Phase 2 complete | 35% | — | Week 4 |
| Phase 4 complete | 40% | 20% | Week 8 |
| Phase 6 complete | 50% | 30% | Week 12 |
| End of Q2 2026 | 60% | 40% | June 2026 |
| End of Q3 2026 | 80% | 60% | Sept 2026 |

---

### 7.4 — API Documentation
**Effort**: 3 days

#### 7.4.1 — OpenAPI/Swagger Spec (2 days)

Generate OpenAPI 3.0 spec from existing routes. Can use `swagger-jsdoc` to generate from JSDoc comments added to route files.

**File**: `backend/src/swagger.js` (or `docs/openapi.yaml`)

Priority endpoints:
1. `POST /api/deployments` — with new `accessMode` fields
2. `GET /api/deployments/:id` — full deployment record
3. `GET /api/deployments/:id/health` — health check (Phase 6)
4. `POST /api/credentials` — credential management
5. WebSocket events documentation

#### 7.4.2 — Architecture Diagrams (1 day)

Create diagrams using Mermaid or draw.io:
1. **System architecture**: Frontend → API → Terraform → Cloud → K8s
2. **Deployment lifecycle**: Draft → Approve → Terraform → ZL Deploy → Health → Complete
3. **Manifest generation flow**: Config → ZL Templates → Generator → YAML → kubectl
4. **Access mode decision tree**: Internal vs External branching

---

## Files Created

| File | Purpose |
|------|---------|
| `backend/jest.config.js` | Jest configuration |
| `backend/src/__tests__/setup.js` | Test database setup |
| `backend/src/services/__tests__/kubernetesManifestGenerator.test.js` | Generator unit tests |
| `backend/src/services/__tests__/zlManifestTemplates.test.js` | ZL template tests |
| `backend/src/services/__tests__/zlDeploymentOrchestrator.test.js` | Orchestrator tests |
| `frontend/src/pages/UnifiedDeploymentWizard/phases/Phase5Deploy/__tests__/AccessModeConfig.test.jsx` | Access mode component tests |
| `backend/src/swagger.js` | OpenAPI spec generator |
| `docs/architecture/` | Architecture diagrams |

---

## Continuous Integration

Each PR should:
1. Run `npm test` (backend + frontend)
2. Check coverage doesn't drop below threshold
3. Lint pass (ESLint)
4. Validate generated YAML against K8s schema (optional: `kubeval`)

---

## Phase Dependency for Test Writing

| Phase | Tests to Write Alongside |
|-------|-------------------------|
| Phase 1 | Generator method unit tests (all new/modified methods) |
| Phase 2 | ZL template tests + DG03 reference comparison |
| Phase 3 | Orchestrator tests (mock kubectl exec) |
| Phase 4 | AccessModeConfig component tests + WizardContext reducer tests |
| Phase 5 | Terraform variable validation tests |
| Phase 6 | Health check endpoint tests + scan result tests |
