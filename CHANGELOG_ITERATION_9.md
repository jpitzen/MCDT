# Changelog - Iteration 9

## Date: 2025-01-18

## Summary
Added Container Registry selector to Phase 2 Cluster Configuration and created new Phase 3 for Database Configuration. All existing phases were renumbered (Storage→4, Deploy→5, Operations→6).

---

## Changes Made

### 1. Container Registry Configuration (Phase 2)

**New File: `phases/Phase2Cluster/ContainerRegistry.jsx`**
- New/Existing registry selection with radio buttons
- For new registries: name input, auto-generated from cluster name
- For existing registries: URL input with validation
- Cloud provider aware (ECR/ACR/GCR naming)
- Enable/disable toggle
- Cost estimate information

**Updated: `phases/Phase2Cluster/index.jsx`**
- Added ContainerRegistry to CLUSTER_STEPS array
- Added 'registry' to expandedSections state
- Updated isStepComplete to handle registry validation

### 2. New Phase 3: Database Configuration

**New File: `phases/Phase3Database/index.jsx`**
- Main phase container with GuidedMode and ExpertMode
- Two sub-steps: Database Config and SQL Scripts
- Phase completion tracking

**New File: `phases/Phase3Database/DatabaseConfig.jsx`**
- Database engine selection (PostgreSQL, MySQL, Aurora, SQL Server, etc.)
- Cloud provider-specific options (AWS RDS, Azure SQL, GCP Cloud SQL)
- Instance class selection with cost estimates
- Storage configuration
- Multi-AZ toggle
- Database credentials (username/password)
- Monthly cost calculator

**New File: `phases/Phase3Database/SqlScripts.jsx`**
- Upload SQL files (.sql)
- Create scripts manually with editor
- Categorizes as init vs migration scripts
- Edit, copy, delete functionality
- Script preview with size information

### 3. Phase Renumbering

**Renamed Directories:**
- `Phase3Storage` → `Phase4Storage`
- `Phase4Deploy` → `Phase5Deploy`
- `Phase5Operations` → `Phase6Operations`

**Updated Phase Files:**
- `Phase4Storage/index.jsx`: Updated function name and header
- `Phase5Deploy/index.jsx`: Updated function name and header
- `Phase6Operations/index.jsx`: Updated function name and header

### 4. WizardContext Updates

**New State:**
```javascript
containerRegistry: {
  enabled: true,
  useExisting: false,
  name: '',
  existingRegistryUrl: '',
  region: '',
}
```

**New Action:**
- `UPDATE_CONTAINER_REGISTRY`
- `updateContainerRegistry()` function

**Updated:**
- `phaseValidation` now includes phase 6
- `nextPhase` checks for phase < 6
- `canProceedToNextPhase` handles 6 phases
- `validatePhase` includes phase 6
- `saveDraft` includes containerRegistry

### 5. UnifiedDeploymentWizard Updates

**Updated: `UnifiedDeploymentWizard.jsx`**
- Added Phase3Database lazy import
- Updated PHASE_COMPONENTS mapping for 6 phases
- Updated PhasePlaceholder phase names

### 6. PhaseNavigation Updates

**Updated: `components/PhaseNavigation.jsx`**
- Added DataObjectIcon import
- Added Database phase (id: 3) with database icon
- Updated phase descriptions
- Now shows 6 phases in stepper

---

## Phase Structure (New)

| Phase | Name | Description |
|-------|------|-------------|
| 1 | Prerequisites | Install tools, configure credentials |
| 2 | Cluster Config | VPC, security groups, cluster, container registry |
| 3 | Database | Managed DB service, SQL scripts |
| 4 | Storage | CSI drivers, storage classes |
| 5 | Deployment | Docker images, K8s resources |
| 6 | Operations | Port forwarding, monitoring |

---

## Files Modified

1. `WizardContext.jsx` - State, actions, validation for 6 phases
2. `UnifiedDeploymentWizard.jsx` - Phase component mapping
3. `components/PhaseNavigation.jsx` - Phase stepper with 6 phases
4. `phases/Phase2Cluster/index.jsx` - Added ContainerRegistry step
5. `phases/Phase4Storage/index.jsx` - Renamed from Phase3
6. `phases/Phase5Deploy/index.jsx` - Renamed from Phase4
7. `phases/Phase6Operations/index.jsx` - Renamed from Phase5

## Files Created

1. `phases/Phase2Cluster/ContainerRegistry.jsx`
2. `phases/Phase3Database/index.jsx`
3. `phases/Phase3Database/DatabaseConfig.jsx`
4. `phases/Phase3Database/SqlScripts.jsx`

---

## Testing Notes

- Navigate through all 6 phases in the wizard
- Test Container Registry new/existing toggle
- Test Database enable/disable and configuration
- Test SQL script upload and editor
- Verify draft save includes containerRegistry
- Verify phase navigation stepper shows 6 phases
