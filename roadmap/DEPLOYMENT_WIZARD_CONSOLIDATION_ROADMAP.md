# Deployment Wizard Consolidation Roadmap
## Converting Cloud Deployment Toolkit into a Unified Deployment Wizard

**Date:** November 30, 2025  
**Status:** Evaluation & Roadmap  
**Priority:** High - Eliminate Duplication, Improve UX

---

## Executive Summary

### Current State Analysis

The application has **significant functional overlap** between multiple components:

| Component | Lines | Purpose | Overlap |
|-----------|-------|---------|---------|
| `CloudDeploymentToolkit.jsx` | 5,713 | Tab-based browser for Docker/K8s/Cloud operations | 70% |
| `DeploymentWizardMultiCloud.jsx` | 3,067 | 12-step wizard for infrastructure provisioning | 60% |
| `ContainerDeployments.jsx` | 1,409 | Container image → K8s deployment stepper | 40% |
| `DeploymentDrafts.jsx` | 802 | Save/load draft deployments | Shared |

**Total Overlapping Code:** ~8,000+ lines across components

### Recommendation

**Merge into a single "Unified Deployment Wizard"** that:
1. Follows the logical 5-phase structure from `AWS_USWEST1_DEPLOYMENT_HOWTO.md`
2. Provides both **Guided Wizard Mode** and **Expert Tab Mode**
3. Intelligently detects existing infrastructure before prompting to create new
4. Consolidates all deployment paths into one entry point

---

## Feasibility Assessment

### ✅ Highly Feasible (Score: 8.5/10)

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| **Shared Backend APIs** | 9/10 | All components use same `containerDeploymentService.js` (5,870 lines, 120+ endpoints) |
| **UI Consistency** | 8/10 | All use Material-UI, same styling patterns |
| **State Management** | 7/10 | Similar state patterns, can be unified with context/reducer |
| **User Workflow Alignment** | 9/10 | Both follow prerequisites → config → deploy → operate flow |
| **Technical Debt Reduction** | 10/10 | Eliminates ~5,000 lines of duplicate code |

### Challenges

| Challenge | Mitigation |
|-----------|------------|
| Component size (5,700+ lines) | Split into sub-components by phase |
| Backward compatibility | Maintain route aliases, redirect old paths |
| User preference (wizard vs tabs) | Dual-mode toggle (guided vs expert) |

---

## Current Components Comparison

### Cloud Deployment Toolkit (Tabs)

```
┌─────────────────────────────────────────────────────────────┐
│  Setup │ Storage │ Network │ Operations │ Advanced │ Docker │ K8s │ Cloud │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [Tab Content - Non-Linear Navigation]                    │
│   ✅ Can jump to any tab                                    │
│   ✅ Good for experienced users                             │
│   ❌ No guided flow                                         │
│   ❌ Users can miss steps                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Wizard Multi-Cloud (Stepper)

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1 → Step 2 → Step 3 → ... → Step 12                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [Stepper Content - Linear Navigation]                    │
│   ✅ Guided flow                                            │
│   ✅ Validates each step                                    │
│   ❌ No quick access to specific sections                   │
│   ❌ Separate from operations/monitoring                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Gap Analysis

| Feature | Toolkit | Wizard | Unified Should Have |
|---------|---------|--------|---------------------|
| Prerequisites check | ✅ | ❌ | ✅ |
| Credential management | ✅ | ✅ | ✅ (dedupe) |
| Infrastructure discovery | ❌ | ✅ | ✅ |
| Storage management | ✅ | ✅ | ✅ (dedupe) |
| Network configuration | ✅ | ✅ | ✅ (dedupe) |
| Docker image browser | ✅ | ❌ | ✅ |
| K8s resource browser | ✅ | ❌ | ✅ |
| Quick Deploy | ✅ | ❌ | ✅ |
| Helm/StatefulSets | ✅ | ❌ | ✅ |
| Port forwarding | ✅ | ❌ | ✅ |
| Bastion setup guide | ✅ | ❌ | ✅ |
| ConfigMaps/Secrets | ✅ | ❌ | ✅ |
| Monitoring/Metrics | ✅ | ✅ | ✅ (dedupe) |
| Troubleshooting | ✅ | ❌ | ✅ |
| Draft save/load | ❌ | ✅ | ✅ |
| Approval workflow | ❌ | ✅ | ✅ |
| Database scripts | ❌ | ✅ | ✅ |
| Terraform generation | ❌ | ✅ | ✅ |

---

## Proposed Unified Architecture

### Dual-Mode Design

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    UNIFIED DEPLOYMENT WIZARD                               │
├───────────────────────────────────────────────────────────────────────────┤
│  [🧭 Guided Mode]  [⚡ Expert Mode]                    [💾 Load Draft ▼]  │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ PHASE NAVIGATION (Both Modes)                                       │ │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│  │ [1.Prerequisites]→[2.Cluster]→[3.Storage]→[4.Deploy]→[5.Operations]│ │
│  │      ✅              ⏳           ⭕           ⭕           ⭕       │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌───────────────────────────────┬─────────────────────────────────────┐ │
│  │ GUIDED MODE                   │ EXPERT MODE                         │ │
│  │ (Stepper within Phase)        │ (Tabs within Phase)                 │ │
│  ├───────────────────────────────┼─────────────────────────────────────┤ │
│  │ Phase 1: Prerequisites        │ Phase 1: Prerequisites              │ │
│  │ ┌─────────────────────────┐   │ ┌─────────────────────────────────┐ │ │
│  │ │ Step 1.1: Install Tools │   │ │ [Tools] [AWS CLI] [kubectl]    │ │ │
│  │ │ ○ Docker ✅              │   │ ├─────────────────────────────────┤ │ │
│  │ │ ○ kubectl ✅             │   │ │ All tools in one view          │ │ │
│  │ │ ○ AWS CLI ⚠️            │   │ │ [Install All Missing] button   │ │ │
│  │ │                         │   │ │                                 │ │ │
│  │ │ [Next: Configure AWS →] │   │ │                                 │ │ │
│  │ └─────────────────────────┘   │ └─────────────────────────────────┘ │ │
│  └───────────────────────────────┴─────────────────────────────────────┘ │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ CONTEXT PANEL (Both Modes)                                          │ │
│  │ Shows: Selected resources, validation status, live cluster events  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  [← Previous Phase] [Save Draft] [Submit for Approval] [Next Phase →]    │
└───────────────────────────────────────────────────────────────────────────┘
```

### Phase Structure (Aligned with How-To Document)

```
PHASE 1: PREREQUISITES & SETUP
├── 1.1 Check/Install Required Tools
│   ├── Docker Desktop
│   ├── kubectl
│   ├── AWS CLI / Azure CLI / gcloud
│   └── Helm (optional)
├── 1.2 Configure Cloud Credentials
│   ├── Select existing credentials OR
│   └── Add new credentials
├── 1.3 Configure kubeconfig
│   ├── Connect to existing cluster OR
│   └── Plan new cluster (goes to Phase 2)
└── 1.4 Verify Connectivity
    ├── Test cloud provider connection
    └── Test K8s cluster connection (if exists)

PHASE 2: CLUSTER CONFIGURATION
├── 2.1 Deployment Mode Selection
│   ├── "New Infrastructure" → Full wizard flow
│   └── "Add to Existing" → Discovery flow
├── 2.2 Infrastructure Discovery (if existing)
│   ├── Discover VPCs, Subnets, Security Groups
│   ├── Discover existing clusters
│   └── Auto-select resources
├── 2.3 Network Configuration
│   ├── VPC settings (new or existing)
│   ├── Subnet configuration
│   ├── Security groups
│   └── Private/public endpoint config
├── 2.4 Bastion Setup (for private clusters)
│   ├── View setup guide
│   └── Configure security group rules
└── 2.5 Cluster Settings
    ├── Cluster name, version
    ├── Node groups
    └── Autoscaling settings

PHASE 3: STORAGE SETUP
├── 3.1 CSI Drivers
│   ├── Check EBS CSI status
│   ├── Check EFS CSI status
│   └── Install missing drivers
├── 3.2 Storage Classes
│   ├── View existing StorageClasses
│   ├── Create from templates (EBS gp3, EFS, etc.)
│   └── Configure reclaim policies
└── 3.3 Persistent Volume Claims
    ├── Create PVCs for stateful apps
    └── Verify binding status

PHASE 4: APPLICATION DEPLOYMENT
├── 4.1 Docker Image Management
│   ├── Browse local images
│   ├── Build new images
│   └── Tag images for registry
├── 4.2 Container Registry
│   ├── Create/select ECR repository
│   ├── Push images to registry
│   └── Verify pushed images
├── 4.3 Kubernetes Deployment
│   ├── Quick Deploy (form/YAML modes)
│   ├── StatefulSet deployment (Zookeeper, etc.)
│   ├── Service creation (LoadBalancer, internal)
│   └── ConfigMaps & Secrets
├── 4.4 Database Setup (optional)
│   ├── RDS configuration
│   ├── Database scripts upload
│   └── Connection testing
└── 4.5 Verification
    ├── Check pod status
    ├── Verify services
    └── Test connectivity

PHASE 5: OPERATIONS & MONITORING
├── 5.1 Configuration Management
│   ├── ConfigMaps browser/editor
│   └── Secrets browser/editor
├── 5.2 Monitoring Setup
│   ├── Metrics Server status
│   ├── Cluster Autoscaler
│   └── Resource usage dashboard
├── 5.3 Port Forwarding
│   ├── Active forwards list
│   ├── Create new forwards
│   └── Templates (common services)
├── 5.4 Helm Management
│   ├── Repository management
│   ├── Chart installation
│   └── Release management
└── 5.5 Troubleshooting
    ├── Issue type selection
    ├── Step-by-step checklist
    └── Common solutions
```

---

## Implementation Roadmap

### Phase A: Foundation (Week 1-2)

#### A1: Create Unified Component Structure
```
frontend/src/pages/UnifiedDeploymentWizard/
├── index.jsx                    # Main component with mode toggle
├── WizardContext.jsx            # Shared state management
├── PhaseNavigation.jsx          # Top phase indicator
├── phases/
│   ├── Phase1Prerequisites/
│   │   ├── index.jsx
│   │   ├── ToolsCheck.jsx
│   │   ├── CredentialsSetup.jsx
│   │   ├── KubeconfigSetup.jsx
│   │   └── ConnectivityTest.jsx
│   ├── Phase2ClusterConfig/
│   │   ├── index.jsx
│   │   ├── DeploymentMode.jsx
│   │   ├── InfraDiscovery.jsx
│   │   ├── NetworkConfig.jsx
│   │   ├── BastionSetup.jsx
│   │   └── ClusterSettings.jsx
│   ├── Phase3Storage/
│   │   ├── index.jsx
│   │   ├── CSIDrivers.jsx
│   │   ├── StorageClasses.jsx
│   │   └── PVCManagement.jsx
│   ├── Phase4Deployment/
│   │   ├── index.jsx
│   │   ├── DockerImages.jsx
│   │   ├── ContainerRegistry.jsx
│   │   ├── K8sDeployment.jsx
│   │   ├── DatabaseSetup.jsx
│   │   └── Verification.jsx
│   └── Phase5Operations/
│       ├── index.jsx
│       ├── ConfigManagement.jsx
│       ├── Monitoring.jsx
│       ├── PortForwarding.jsx
│       ├── HelmManagement.jsx
│       └── Troubleshooting.jsx
├── components/
│   ├── GuidedStepper.jsx        # Step-by-step navigation
│   ├── ExpertTabs.jsx           # Tab-based navigation
│   ├── ContextPanel.jsx         # Right panel with details
│   ├── DraftManager.jsx         # Save/load drafts
│   └── ApprovalWorkflow.jsx     # Submit for approval
└── hooks/
    ├── useWizardState.js
    ├── usePhaseValidation.js
    └── useInfraDiscovery.js
```

#### A2: Extract Reusable Components from Existing Code

**From `CloudDeploymentToolkit.jsx` (5,713 lines):**
- Extract `renderSetupTab()` → `Phase1Prerequisites/ToolsCheck.jsx`
- Extract `renderStorageTab()` → `Phase3Storage/` components
- Extract `renderNetworkTab()` → `Phase2ClusterConfig/NetworkConfig.jsx`
- Extract `renderOperationsTab()` → `Phase5Operations/` components
- Extract `renderAdvancedTab()` → Split across phases
- Extract `renderDockerBrowser()` → `Phase4Deployment/DockerImages.jsx`
- Extract `renderK8sBrowser()` → `Phase4Deployment/K8sDeployment.jsx`
- Extract `renderCloudBrowser()` → `Phase1Prerequisites/CredentialsSetup.jsx`

**From `DeploymentWizardMultiCloud.jsx` (3,067 lines):**
- Keep stepper logic → `GuidedStepper.jsx`
- Keep infrastructure discovery → `useInfraDiscovery.js`
- Keep draft save/load → `DraftManager.jsx`
- Keep approval workflow → `ApprovalWorkflow.jsx`
- Keep Terraform generation logic → Backend service

### Phase B: Core Implementation (Week 2-4)

#### B1: Implement WizardContext
```jsx
// WizardContext.jsx - Centralized state management
const WizardContext = createContext();

const wizardReducer = (state, action) => {
  switch (action.type) {
    case 'SET_MODE': // 'guided' | 'expert'
    case 'SET_PHASE': // 1-5
    case 'SET_STEP': // Within phase
    case 'UPDATE_CONFIG': // Form data
    case 'SET_DISCOVERED_INFRA': // Discovery results
    case 'VALIDATE_PHASE': // Run validation
    case 'LOAD_DRAFT': // Load saved draft
    case 'SAVE_DRAFT': // Save current state
    // ...
  }
};

export const WizardProvider = ({ children }) => {
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  // ... API integration, validation logic
};
```

#### B2: Implement Phase Navigation
```jsx
// PhaseNavigation.jsx
const phases = [
  { id: 1, label: 'Prerequisites', icon: BuildIcon, path: 'prerequisites' },
  { id: 2, label: 'Cluster Config', icon: CloudIcon, path: 'cluster' },
  { id: 3, label: 'Storage', icon: StorageIcon, path: 'storage' },
  { id: 4, label: 'Deployment', icon: RocketIcon, path: 'deployment' },
  { id: 5, label: 'Operations', icon: SettingsIcon, path: 'operations' },
];

// Visual indicator showing completed/current/pending phases
// Allows jumping to any completed phase
// Validates before allowing forward navigation
```

#### B3: Implement Mode Toggle
```jsx
// Support switching between Guided and Expert modes
// Preserve state when switching
// Remember user preference
```

### Phase C: Feature Migration (Week 4-6)

#### C1: Migrate Prerequisites Features
- Tool detection (Docker, kubectl, cloud CLIs)
- Installation guidance
- Kubeconfig management
- Connectivity testing

#### C2: Migrate Cluster Configuration
- Infrastructure discovery
- VPC/Subnet management
- Security group configuration
- Bastion setup guide
- Endpoint configuration

#### C3: Migrate Storage Features
- CSI driver management
- StorageClass templates
- PVC creation and monitoring

#### C4: Migrate Deployment Features
- Docker image browser
- Registry management
- Quick Deploy (form + YAML modes)
- StatefulSet wizard
- Database configuration
- Database script upload

#### C5: Migrate Operations Features
- ConfigMap/Secret management
- Metrics and monitoring
- Port forwarding
- Helm integration
- Troubleshooting workflows

### Phase D: Integration & Testing (Week 6-7)

#### D1: Route Integration
```jsx
// App.jsx - Unified routes
<Route path="/deploy" element={<UnifiedDeploymentWizard />} />
<Route path="/deploy/:phase" element={<UnifiedDeploymentWizard />} />
<Route path="/deploy/:phase/:step" element={<UnifiedDeploymentWizard />} />

// Legacy route redirects
<Route path="/deploy-wizard" element={<Navigate to="/deploy" replace />} />
<Route path="/wizard-multicloud" element={<Navigate to="/deploy" replace />} />
<Route path="/cloud-toolkit" element={<Navigate to="/deploy?mode=expert" replace />} />
```

#### D2: Draft Compatibility
- Migrate existing drafts to new format
- Maintain backward compatibility
- Add draft versioning

#### D3: Testing
- Unit tests for each phase component
- Integration tests for full workflow
- E2E tests for common user journeys

### Phase E: Deprecation & Cleanup (Week 7-8)

#### E1: Deprecate Old Components
1. Add deprecation notices to old components
2. Redirect all entry points to unified wizard
3. Remove old components after transition period

#### E2: Documentation
- Update user documentation
- Create migration guide for users
- Update API documentation

---

## Effort Estimation

| Phase | Duration | Effort | Risk |
|-------|----------|--------|------|
| Phase A: Foundation | 2 weeks | 40 hours | Low |
| Phase B: Core Implementation | 2 weeks | 60 hours | Medium |
| Phase C: Feature Migration | 2 weeks | 80 hours | Medium |
| Phase D: Integration & Testing | 1 week | 30 hours | Low |
| Phase E: Deprecation & Cleanup | 1 week | 20 hours | Low |
| **Total** | **8 weeks** | **230 hours** | **Medium** |

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing workflows | Medium | High | Maintain route aliases, gradual rollout |
| State management complexity | Medium | Medium | Use React Context + useReducer pattern |
| Performance with large component | Low | Medium | Code splitting, lazy loading phases |
| User confusion during transition | Medium | Low | Dual-mode access, clear documentation |

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Lines of code | ~10,000 | ~6,000 | -40% reduction |
| Components to maintain | 4 | 1 | -75% reduction |
| User task completion rate | Unknown | +20% | Analytics |
| Time to deploy (new user) | ~45 min | ~20 min | User testing |
| Support tickets (confusion) | Unknown | -50% | Ticket tracking |

---

## Recommendation

### Proceed with Consolidation ✅

**Rationale:**
1. **High duplication** - 60-70% overlap between components
2. **Clear structure** - How-To document provides logical phase flow
3. **Backend ready** - All APIs already exist (5,870 lines of service code)
4. **User benefit** - Single entry point, guided experience
5. **Maintenance benefit** - One component vs four

### Suggested Approach

1. **Start with Phase A** - Create foundation without breaking existing functionality
2. **Incremental migration** - Move one phase at a time
3. **Keep both accessible** - Allow users to choose during transition
4. **Gather feedback** - Iterate based on user testing

### Quick Wins (Can do immediately)

1. Add "Switch to Expert Mode" link in `DeploymentWizardMultiCloud`
2. Add "Switch to Guided Mode" link in `CloudDeploymentToolkit`
3. Unify the navigation entry points in sidebar
4. Create shared state management for credentials/cluster selection

---

## Appendix: Component Dependency Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND SERVICES                                   │
│  containerDeploymentService.js (5,870 lines, 120+ methods)                  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Prerequisites │ Storage │ Network │ Docker │ K8s │ Cloud │ Operations │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ API Calls
                                    ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              CURRENT STATE                                    │
│                                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────────┐   │
│  │ CloudDeploymentToolkit│  │DeploymentWizardMulti │  │ContainerDeployments│  │
│  │      (5,713 lines)    │  │   Cloud (3,067 lines)│  │   (1,409 lines)    │  │
│  ├──────────────────────┤  ├──────────────────────┤  ├───────────────────┤   │
│  │ • 8 tabs             │  │ • 12 steps           │  │ • 5 steps         │   │
│  │ • Non-linear nav     │  │ • Linear nav         │  │ • Image → K8s     │   │
│  │ • All operations     │  │ • Infra provisioning │  │ • Focused flow    │   │
│  │ • No drafts          │  │ • Draft support      │  │ • No infra        │   │
│  └──────────────────────┘  └──────────────────────┘  └───────────────────┘   │
│            │                         │                        │               │
│            └─────────────────────────┼────────────────────────┘               │
│                                      ▼                                        │
│                         ┌─────────────────────────┐                          │
│                         │ DUPLICATE FUNCTIONALITY │                          │
│                         │ • Credential selection  │                          │
│                         │ • Cluster connection    │                          │
│                         │ • Storage configuration │                          │
│                         │ • Network setup         │                          │
│                         │ • Deployment creation   │                          │
│                         └─────────────────────────┘                          │
└───────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              TARGET STATE                                     │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    UNIFIED DEPLOYMENT WIZARD                            │ │
│  │                        (~6,000 lines)                                   │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │  [Guided Mode]  ←──── Toggle ────→  [Expert Mode]                      │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │  Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5                       │ │
│  │  Prerequisites  Cluster   Storage   Deploy   Operations                │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │  • Single entry point                                                  │ │
│  │  • Draft save/load                                                     │ │
│  │  • Approval workflow                                                   │ │
│  │  • Infrastructure discovery                                            │ │
│  │  • All operations in one place                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

*Roadmap prepared for evaluation - November 30, 2025*
