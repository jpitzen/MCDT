# MCDT Implementation Phases — 2026-03-02
## Phase Index & Dependency Map

**Source**: [roadmap20260302-1045.md](../../roadmap/roadmap20260302-1045.md)
**Directive**: Manual process endstate = automated process endstate (access mode is the only variable)

---

## Phase Summary

| Phase | Title | Effort | Sprint | Prerequisites | Priority |
|:-----:|-------|:------:|:------:|:-------------:|:--------:|
| [1](phase1.md) | Manifest Generator Foundation | 5.5d | Week 1–2 | — | P0 |
| [2](phase2.md) | ZL Application Manifest Templates | 7.5d | Week 3–4 | Phase 1 | P0 |
| [3](phase3.md) | Deployment Pipeline & Orchestration | 3d | Week 5–6 | Phase 1, Phase 2 (partial) | P0 |
| [4](phase4.md) | Wizard Integration & Access Mode | 4d | Week 7–8 | Phase 2 §2.7, Phase 3 | P2 |
| [5](phase5.md) | Infrastructure Gaps | 7d | Week 9–10 | — (parallel) | P1 |
| [6](phase6.md) | Hardening & Post-Deployment | 6d | Week 11–12 | Phases 1–3 | P3 |
| [7](phase7.md) | Testing & Documentation | 15d+ | Continuous | — (parallel) | P4 |
| | **Total** | **~48d** | **12 weeks** | | |

---

## Dependency Graph

```
                    ┌──────────────────┐
                    │  Phase 7: Testing │ (continuous, parallel)
                    └──────────────────┘

Phase 1 ──────► Phase 2 ──────► Phase 3 ──────► Phase 4
Generator       ZL Templates    Deploy Pipeline  Wizard + Access Mode
Foundation      (7.5d)          & Orchestration   (4d)
(5.5d)                          (3d)

                                                  Phase 5
                                                  Infrastructure
                                                  Gaps (7d)
                                                  [PARALLEL — no deps]

                Phase 1+2+3 ──────────────────► Phase 6
                                                 Hardening &
                                                 Post-Deploy (6d)
```

**Critical path**: Phase 1 → Phase 2 → Phase 3 → Phase 4 (20 days, 8 weeks)
**Parallel work**: Phases 5 and 7 can run from day 1 alongside the critical path.

---

## DG Coverage Progression

```
         Start    Ph1    Ph2    Ph3    Ph4    Ph5    Ph6    Target
         ─────    ───    ───    ───    ───    ───    ───    ──────
Phase 0   60%     60%    60%    60%    60%    60%    70%     70%
Phase 1   95%     95%    95%    95%    95%    95%    95%     95%
Phase 2   70%     70%    70%    70%    70%    90%    90%     90%
Phase 3   95%     95%    95%    95%    95%    95%    95%     95%
Phase 4   85%     85%    85%    85%    85%    90%    90%     90%
Phase 5   50%     50%    50%    50%    50%    90%    90%     90%
Phase 6   60%     60%    60%    60%    60%    85%    85%     85%
Phase 7   15%     15%    90%    95%    95%    95%    95%     95%  ← ZooKeeper
Phase 8   10%     10%    85%    90%    90%    90%    90%     90%  ← App Deploy
Phase 9   15%     15%    40%    40%    65%    80%    80%     80%  ← Network
Phase 10  65%     65%    65%    65%    65%    95%    95%     95%
Phase 11   0%      0%     0%    20%    20%    20%    70%     70%
Phase 12  55%     55%    55%    55%    55%    55%    65%     65%
Phase 13   5%      5%     5%     5%     5%     5%    50%     50%

Weighted  52%     52%    68%    72%    75%    80%    87%     87%
```

---

## Key Files Across All Phases

### Created (new files)
| File | Phase |
|------|:-----:|
| `backend/src/services/zlManifestTemplates.js` | 2 |
| `backend/src/services/zlDeploymentOrchestrator.js` | 3 |
| `frontend/src/.../Phase5Deploy/AccessModeConfig.jsx` | 4 |
| `backend/migrations/add-access-mode-fields.sql` | 4 |
| `terraform/.../templates/bastion-userdata.sh` | 6 |
| `backend/jest.config.js` | 7 |
| `backend/src/services/__tests__/*.test.js` | 7 |

### Modified (existing files)
| File | Phases |
|------|:------:|
| `backend/src/services/kubernetesManifestGenerator.js` | 1, 5 |
| `backend/src/services/index.js` | 1, 2, 3 |
| `backend/src/services/multiCloudOrchestrator.js` | 3 |
| `backend/src/services/deploymentService.js` | 3, 4 |
| `backend/src/models/Deployment.js` | 4 |
| `backend/src/routes/deployments.js` | 4, 6 |
| `frontend/src/.../WizardContext.jsx` | 4 |
| `frontend/src/.../Phase5Deploy/index.jsx` | 4 |
| `frontend/src/.../Phase6Operations/index.jsx` | 4, 6 |
| `terraform/modules/kubernetes_cluster/main.tf` | 5 |
| `terraform/modules/kubernetes_cluster/aws.tf` | 5, 6 |
| `terraform/modules/kubernetes_cluster/variables.tf` | 5, 6 |
| `terraform/modules/kubernetes_cluster/outputs.tf` | 5 |
| `backend/src/services/containerDeploymentService.js` | 6 |

---

## How to Use These Phase Documents

1. **Before starting a phase**: Read the phase doc to understand scope, prerequisites, and acceptance criteria
2. **During implementation**: Check off acceptance criteria items as they're completed
3. **Before marking complete**: Verify DG coverage impact matches expectations
4. **Phase reviews**: Compare generated YAML against `manualprocess/DG03/aws/` reference files
5. **Test alongside**: Phase 7 provides test targets per phase — write tests with the implementation, not after
