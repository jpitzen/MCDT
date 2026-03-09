# High-Level Deployment Guide: Classified Records Management Platform (DOD SCIF)

## Executive Summary

This document provides high-level guidance for deploying the ZLAWS Multi-Cloud Deployment Platform as a classified records management system within a Department of Defense Sensitive Compartmented Information Facility (SCIF). This deployment handles classified materials up to and including TS/SCI and must comply with all applicable Intelligence Community Directives (ICDs), DoD regulations, and NISPOM requirements.

**Classification Level**: This deployment guide addresses systems handling **SECRET** through **TOP SECRET/SCI** materials.

---

## 1. Prerequisites and Compliance Requirements

### 1.1 Facility Requirements
- [ ] **Accredited SCIF** meeting ICD 705 standards
- [ ] Active ATO (Authority to Operate) for the SCIF facility
- [ ] Approved tempest and electromagnetic shielding
- [ ] Physical access controls and security monitoring
- [ ] Approved destruction capabilities (NSA-approved shredders, degaussers)

### 1.2 Network Requirements
- [ ] **SIPRNET** connectivity with approved cross-domain solution (CDS)
- [ ] Air-gapped or one-way data diode if connecting to JWICS
- [ ] Approved network architecture diagram reviewed by NSA/CSS
- [ ] Network isolation from NIPRNET and public internet
- [ ] Approved VPN/encrypted transport for any remote access

### 1.3 Compliance Frameworks
- **ICD 503**: Intelligence Community Information Technology Systems Security Risk Management
- **ICD 705**: Sensitive Compartmented Information Facilities
- **NIST SP 800-53** (High Baseline): Security and Privacy Controls
- **DISA STIGs**: Security Technical Implementation Guides
- **FedRAMP High** (if using cloud): Federal Risk and Authorization Management Program
- **CNSSI 1253**: Security Categorization and Control Selection

---

## 2. Team Composition and Roles

### 2.1 Core Team Members

| Role | Clearance Required | Responsibilities | Estimated FTE |
|------|-------------------|------------------|---------------|
| **Program Manager** | TS/SCI | Overall deployment oversight, stakeholder coordination | 1.0 |
| **Information System Security Officer (ISSO)** | TS/SCI | Security compliance, ATO package, continuous monitoring | 1.0 |
| **System Administrator (SA)** | TS/SCI | Infrastructure deployment, Kubernetes cluster management | 2.0 |
| **Database Administrator (DBA)** | TS/SCI | PostgreSQL/SQL Server configuration, backup/recovery | 1.0 |
| **Network Engineer** | TS/SCI | SIPRNET integration, firewall rules, network segmentation | 1.0 |
| **Application Developer** | TS/SCI | Custom connector development, platform configuration | 1.5 |
| **Records Management Specialist** | TS/SCI | Classification management, retention policies, workflow design | 1.0 |
| **Authorizing Official (AO)** | TS/SCI | Final ATO approval authority | 0.2 |
| **Cyber Security Analyst** | TS/SCI | Vulnerability scanning, penetration testing, threat monitoring | 0.5 |

### 2.2 Supporting Roles
- **SSO (Special Security Officer)**: Handles SCI program security
- **Facility Security Officer (FSO)**: Physical security coordination
- **Contracting Officer**: Procurement and vendor management
- **Legal Counsel**: Classification guidance, FOIA/MDR support
- **Auditor**: Independent security assessment

### 2.3 Clearance Processing Timeline
- **Secret Clearance**: 3-6 months
- **Top Secret/SCI**: 6-12+ months
- **Plan accordingly**: Begin personnel security processing early

---

## 3. Deployment Architecture Options

### 3.1 Option A: On-Premise Deployment (RECOMMENDED for SCIF)

**Overview**: Deploy ZLAWS platform entirely within SCIF on government-owned hardware.

#### Advantages
- ✅ Full control over hardware and data sovereignty
- ✅ No cloud compliance overhead (FedRAMP High not required)
- ✅ Meets air-gap requirements for highest classification levels
- ✅ Reduced third-party vendor risk
- ✅ Faster ATO process (fewer interconnections)

#### Architecture
```
┌─────────────────────────────────────────────────────────┐
│                        SCIF Boundary                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Kubernetes Cluster (On-Prem)              │  │
│  │  ┌──────────────┐  ┌──────────────┐              │  │
│  │  │   Backend    │  │   Frontend   │              │  │
│  │  │   Pods (5)   │  │   Pods (3)   │              │  │
│  │  └──────────────┘  └──────────────┘              │  │
│  │  ┌──────────────┐  ┌──────────────┐              │  │
│  │  │  PostgreSQL  │  │    Redis     │              │  │
│  │  │   (Primary)  │  │    Cache     │              │  │
│  │  └──────────────┘  └──────────────┘              │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │        SIPRNET Integration Layer                  │  │
│  │  - Email Connector (Exchange/Outlook)             │  │
│  │  - File Share Connector (SMB/NFS)                 │  │
│  │  - Database Connector (Oracle/SQL Server)         │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  Hardware: Dell/HP Servers, NetApp Storage, Cisco Net   │
└─────────────────────────────────────────────────────────┘
```

#### Hardware Requirements (Minimum)
- **Kubernetes Master Nodes**: 3x servers (16 vCPU, 64GB RAM, 500GB SSD each)
- **Kubernetes Worker Nodes**: 5x servers (32 vCPU, 128GB RAM, 1TB SSD each)
- **Database Servers**: 2x servers (16 vCPU, 64GB RAM, 2TB SSD RAID 10)
- **Storage (NFS/SAN)**: 20TB usable capacity, RAID 6 or better
- **Network**: 10Gbps switches, redundant firewalls, IDS/IPS appliances

#### Estimated Cost
- **Hardware**: $250,000 - $400,000
- **Software Licenses**: $50,000 - $100,000/year
- **Personnel (Year 1)**: $800,000 - $1,200,000
- **Facilities/Ops**: $100,000/year

---

### 3.2 Option B: Cloud-Based Deployment (AWS GovCloud/Azure Government)

**Overview**: Deploy to FedRAMP High authorized cloud environment with SIPRNET connectivity.

#### Advantages
- ✅ Rapid scaling and elasticity
- ✅ Reduced hardware capital expenditure
- ✅ Built-in disaster recovery and high availability
- ✅ Managed Kubernetes services (EKS/AKS)

#### Disadvantages
- ❌ Requires FedRAMP High ATO (12-24 months)
- ❌ Limited to SECRET classification (TS/SCI requires Impact Level 6)
- ❌ Third-party vendor dependency
- ❌ Egress fees for data transfer
- ❌ More complex interconnection security agreements

#### Supported Cloud Platforms
1. **AWS GovCloud (US)** - FedRAMP High, DISA IL4/IL5
   - EKS for Kubernetes
   - RDS for PostgreSQL
   - S3 for object storage
   - Direct Connect to SIPRNET

2. **Azure Government** - FedRAMP High, DISA IL5
   - AKS for Kubernetes
   - Azure Database for PostgreSQL
   - Azure Blob Storage
   - ExpressRoute to SIPRNET

3. **Google Cloud for Government** - FedRAMP High (limited availability)

#### Architecture
```
┌─────────────────────────────────────────────────────────┐
│              AWS GovCloud / Azure Government            │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Managed Kubernetes (EKS/AKS)              │  │
│  │  ┌──────────────┐  ┌──────────────┐              │  │
│  │  │   Backend    │  │   Frontend   │              │  │
│  │  │ Auto-Scaling │  │ Auto-Scaling │              │  │
│  │  └──────────────┘  └──────────────┘              │  │
│  │  ┌──────────────┐  ┌──────────────┐              │  │
│  │  │ Managed RDS  │  │ ElastiCache  │              │  │
│  │  │ (Multi-AZ)   │  │    Redis     │              │  │
│  │  └──────────────┘  └──────────────┘              │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│              VPN/Direct Connect to SIPRNET              │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  SCIF Network │
                    │   (SIPRNET)   │
                    └───────────────┘
```

#### Estimated Cost (Annual)
- **Compute (EKS/AKS)**: $60,000 - $120,000
- **Database (RDS/Azure DB)**: $40,000 - $80,000
- **Storage**: $20,000 - $50,000
- **Network/Bandwidth**: $30,000 - $60,000
- **Support/Professional Services**: $100,000 - $200,000
- **Total**: $250,000 - $510,000/year

---

### 3.3 Option C: Hybrid Deployment

**Overview**: Kubernetes control plane on-premise, with selective cloud bursting for non-classified processing.

#### Use Case
- Data ingest/OCR processing in cloud (unclassified staging)
- Classified data remains on-premise
- Cloud-based disaster recovery

#### Complexity: **High** - Not recommended unless specific mission requirements exist.

---

## 4. SIPRNET Integration and Data Feeds

### 4.1 File Feed Connectors

#### 4.1.1 SIPRNET File Share Access
**Protocols**: SMB/CIFS, NFS, SFTP

**Configuration Requirements**:
```yaml
# Example connector configuration
siprnet_file_connector:
  type: "smb"
  server: "sipr-fileserver.smil.mil"
  share_path: "/classified/records"
  auth_method: "kerberos"
  domain: "SIPR.MIL"
  service_account: "svc_zlaws_reader"
  polling_interval: "300s"  # 5 minutes
  classification_handler: "auto_detect"  # Parse classification markings
  retention_policy: "ICD_501"
```

**Security Controls**:
- Service account with read-only permissions
- Audit logging of all file access
- Virus scanning before ingest
- Classification validation (banner/portion markings)
- Encryption in transit (SMB 3.0 encryption)

#### 4.1.2 Supported File Types
- **Documents**: PDF, DOCX, XLSX, PPTX
- **Images**: JPEG, PNG, TIFF (scanned documents)
- **Email**: PST, EML, MSG (Outlook exports)
- **Structured Data**: CSV, XML, JSON

#### 4.1.3 File Processing Pipeline
```
SIPRNET File Share → Connector Poll → Virus Scan → 
Classification Parse → Metadata Extract → Database Insert → 
Index for Search → Notification to Users
```

---

### 4.2 Email Feed Connectors

#### 4.2.1 Microsoft Exchange/Outlook Integration
**Protocols**: EWS (Exchange Web Services), Graph API (if available)

**Configuration Requirements**:
```yaml
# Example email connector configuration
siprnet_email_connector:
  type: "exchange_ews"
  server: "sipr-exchange.smil.mil"
  auth_method: "ntlm"
  domain: "SIPR.MIL"
  service_account: "svc_zlaws_email"
  mailbox: "records-intake@sipr.smil.mil"
  folder_watch: "Inbox/Records"
  processing_rules:
    - extract_attachments: true
    - parse_classification_headers: true
    - archive_after_processing: true
  retention_policy: "DOD_5015.2"
```

**Email Processing Features**:
- **Attachment extraction**: Save to file store with parent email linkage
- **Classification parsing**: Extract from subject line and X-Headers
- **Thread tracking**: Maintain email conversation threads
- **Sender authentication**: Verify CAC/PIV certificate signatures
- **Redaction support**: Auto-detect PII/CUI for compartmentalization

#### 4.2.2 IBM Lotus Notes Integration (Legacy Systems)
**Protocol**: DIIOP (Domino Internet Inter-ORB Protocol)

**Use Case**: Many DOD organizations still use Lotus Notes for classified email.

**Configuration**:
```yaml
siprnet_lotus_connector:
  type: "lotus_notes"
  server: "sipr-notes.smil.mil"
  database: "records.nsf"
  auth_method: "notes_id"
  credential_file: "/secure/notes_id/svc_zlaws.id"
  password_vault: "hashicorp_vault"
```

---

### 4.3 Database Connectors (Federated Queries)

#### 4.3.1 Oracle Database Connector
**Use Case**: Query existing Oracle-based records systems for metadata enrichment.

```yaml
oracle_connector:
  host: "sipr-oracle.smil.mil"
  port: 1521
  service_name: "RECORDS_PROD"
  auth_method: "oracle_wallet"
  wallet_path: "/secure/oracle_wallet"
  query_timeout: "30s"
  max_connections: 10
```

#### 4.3.2 SQL Server Connector
**Use Case**: Integrate with SharePoint SQL backends or other MSSQL systems.

```yaml
mssql_connector:
  host: "sipr-sqlserver.smil.mil"
  port: 1433
  database: "RecordsManagement"
  auth_method: "windows_auth"
  domain: "SIPR"
  service_account: "svc_zlaws_sql"
  encrypt_connection: true
  trust_server_certificate: false
```

---

### 4.4 Cross-Domain Solution (CDS) Integration

**Critical**: Any data transfer between classification domains (e.g., NIPRNET to SIPRNET) requires an NSA-approved CDS.

#### Approved CDS Devices
- **Owl Computing**: XTD (Data Diode)
- **BAE Systems**: XTS Guard
- **Forcepoint**: Trusted Thin Client
- **General Dynamics**: Sec.ret CDS

#### Data Flow Example (Low to High)
```
NIPRNET (Unclass) → CDS Review Queue → Human Review → 
Approval → One-Way Transfer → SIPRNET (Secret)
```

**Implementation**:
- ZLAWS can export data packages to CDS staging area
- CDS operator reviews for classification spillage
- Approved data imported into SIPRNET ZLAWS instance
- Full audit trail maintained

---

## 5. Deployment Process (Step-by-Step)

### Phase 1: Planning and Authorization (Weeks 1-12)

#### Week 1-4: Requirements Gathering
- [ ] Conduct security impact analysis
- [ ] Define system boundary and data flows
- [ ] Identify all interconnections (SIPRNET, databases, file shares)
- [ ] Develop system security plan (SSP)
- [ ] Submit SSP to AO for initial review

#### Week 5-8: Environment Preparation
- [ ] Procure hardware (if on-premise) or provision cloud accounts
- [ ] Establish SCIF access for team members
- [ ] Configure network segmentation and VLANs
- [ ] Install and harden base operating systems (RHEL/Ubuntu LTS)
- [ ] Apply DISA STIGs to all systems

#### Week 9-12: Security Testing
- [ ] Conduct vulnerability scanning (Nessus, ACAS)
- [ ] Perform penetration testing
- [ ] Remediate findings
- [ ] Document risk acceptance for any residual risks
- [ ] Prepare ATO package (SSP, SAR, POA&M)

---

### Phase 2: Infrastructure Deployment (Weeks 13-20)

#### Week 13-14: Kubernetes Cluster Deployment
```powershell
# On-premise deployment using kubeadm (example)
# On master node 1
sudo kubeadm init --control-plane-endpoint "k8s-master-lb.sipr.mil:6443" \
  --pod-network-cidr=10.244.0.0/16 \
  --upload-certs

# On master nodes 2-3 (HA control plane)
sudo kubeadm join k8s-master-lb.sipr.mil:6443 --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash> \
  --control-plane --certificate-key <cert-key>

# On worker nodes 1-5
sudo kubeadm join k8s-master-lb.sipr.mil:6443 --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash>

# Install CNI (Calico for network policies)
kubectl apply -f calico.yaml

# Install storage provisioner (Rook-Ceph or NFS)
kubectl apply -f rook-ceph-operator.yaml
```

**Security Hardening**:
- Enable Pod Security Policies (PSP) or Pod Security Admission
- Implement Network Policies for micro-segmentation
- Enable RBAC (Role-Based Access Control)
- Configure audit logging to syslog server
- Deploy Falco for runtime security monitoring

#### Week 15-16: Database Deployment
```powershell
# Deploy PostgreSQL using StatefulSet
kubectl apply -f postgresql-statefulset.yaml

# Initialize database schema
kubectl exec -it postgresql-0 -- psql -U zlaws -d zlaws_prod -f /migrations/init.sql

# Run ZLAWS migrations
cd c:\Projects\ZLAWS\MCDT\backend
npm run db:migrate
```

**Database Security**:
- Enable SSL/TLS for all connections
- Implement row-level security (RLS) for classification labels
- Configure pg_audit for query logging
- Set up automated encrypted backups to tape/off-site

#### Week 17-18: Application Deployment
```powershell
# Build container images (on secure build server)
docker build -t zlaws-backend:1.0.0 -f Dockerfile .
docker build -t zlaws-frontend:1.0.0 -f nginx.Dockerfile .

# Push to internal container registry (Harbor/Artifactory)
docker tag zlaws-backend:1.0.0 registry.sipr.mil/zlaws/backend:1.0.0
docker push registry.sipr.mil/zlaws/backend:1.0.0

# Deploy to Kubernetes
kubectl apply -f kubernetes/deployments/backend-deployment.yaml
kubectl apply -f kubernetes/deployments/frontend-deployment.yaml
kubectl apply -f kubernetes/services/

# Verify deployment
kubectl get pods -n zlaws-production
kubectl logs -f deployment/zlaws-backend -n zlaws-production
```

#### Week 19-20: SIPRNET Integration
```powershell
# Deploy file connector pods
kubectl apply -f kubernetes/connectors/siprnet-file-connector.yaml

# Deploy email connector pods
kubectl apply -f kubernetes/connectors/siprnet-email-connector.yaml

# Configure service accounts (Active Directory/Kerberos)
kubectl create secret generic sipr-ad-credentials \
  --from-literal=username='svc_zlaws_reader@SIPR.MIL' \
  --from-file=keytab=/secure/svc_zlaws_reader.keytab

# Test connectivity
kubectl exec -it siprnet-file-connector-0 -- \
  smbclient //sipr-fileserver.smil.mil/records -k
```

---

### Phase 3: Testing and Validation (Weeks 21-26)

#### Week 21-22: Functional Testing
- [ ] User acceptance testing (UAT) with records specialists
- [ ] Test all SIPRNET connectors (file, email, database)
- [ ] Verify classification marking propagation
- [ ] Test search and retrieval functions
- [ ] Validate retention policy enforcement

#### Week 23-24: Security Testing
- [ ] Re-run vulnerability scans on production config
- [ ] Conduct secure code review
- [ ] Perform security regression testing
- [ ] Test access controls and least privilege
- [ ] Validate audit logging completeness

#### Week 25-26: ATO Package Finalization
- [ ] Update SSP with as-built configuration
- [ ] Complete Security Assessment Report (SAR)
- [ ] Finalize Plan of Action and Milestones (POA&M)
- [ ] Conduct AO briefing
- [ ] **Obtain ATO signature**

---

### Phase 4: Production Deployment (Weeks 27-30)

#### Week 27-28: Data Migration
```powershell
# Example: Migrate legacy records from file share
# Run data import job
kubectl create job --from=cronjob/legacy-import legacy-import-initial

# Monitor progress
kubectl logs -f job/legacy-import-initial

# Verify data integrity
kubectl exec -it postgresql-0 -- psql -U zlaws -d zlaws_prod -c \
  "SELECT COUNT(*), classification_level FROM documents GROUP BY classification_level;"
```

#### Week 29: User Training
- [ ] Conduct administrator training (8 hours)
- [ ] Conduct end-user training (4 hours)
- [ ] Provide quick reference guides
- [ ] Set up help desk support procedures

#### Week 30: Go-Live
- [ ] Cutover from legacy system
- [ ] Monitor system performance (CPU, memory, disk I/O)
- [ ] Address any production issues
- [ ] Collect user feedback

---

### Phase 5: Continuous Monitoring (Ongoing)

#### Daily Activities
- Monitor system health dashboards (Grafana/Prometheus)
- Review security event logs (SIEM integration)
- Check backup completion status
- Respond to user support tickets

#### Weekly Activities
- Vulnerability scanning (ACAS)
- Patch assessment and planning
- Performance trending analysis
- Audit log review

#### Monthly Activities
- Security control assessment
- POA&M updates to AO
- Disaster recovery testing
- User access review/recertification

#### Quarterly Activities
- Penetration testing
- Business continuity exercise
- Capacity planning review
- Vendor security assessments

---

## 6. Security Controls Implementation

### 6.1 Access Control (AC Family)
- **AC-2**: Account Management - CAC/PIV authentication via Active Directory
- **AC-3**: Access Enforcement - RBAC based on clearance level and need-to-know
- **AC-6**: Least Privilege - Separation of duties for admin functions
- **AC-17**: Remote Access - VPN with MFA for remote administration

### 6.2 Audit and Accountability (AU Family)
- **AU-2**: Audit Events - Log all CRUD operations on classified records
- **AU-3**: Content of Audit Records - Who, what, when, where, source/destination
- **AU-6**: Audit Review - Weekly ISSO review of security logs
- **AU-9**: Protection of Audit Information - Immutable log storage, WORM media

### 6.3 Identification and Authentication (IA Family)
- **IA-2**: Identification and Authentication - CAC/PIV required
- **IA-2(1)**: Multi-Factor Authentication - PIV + PIN
- **IA-2(12)**: PIV-Compliant - FIPS 201-2 compliance
- **IA-5**: Authenticator Management - PKI certificate lifecycle

### 6.4 System and Communications Protection (SC Family)
- **SC-7**: Boundary Protection - Firewall at SCIF perimeter
- **SC-8**: Transmission Confidentiality - TLS 1.3 for all connections
- **SC-12**: Cryptographic Key Management - FIPS 140-2 Level 2 HSM
- **SC-13**: Cryptographic Protection - AES-256, SHA-256 minimum

### 6.5 Media Protection (MP Family)
- **MP-6**: Media Sanitization - DoD 5220.22-M (3-pass wipe) or physical destruction
- **MP-7**: Media Use - Removable media disabled on all systems

---

## 7. Classification Handling

### 7.1 Automated Classification Detection

**Banner Marking Parsing**:
```
Input: "(S//NF) Operational Planning Document"
Parsed:
  - Classification: SECRET
  - Dissemination: NOFORN
  - Title: Operational Planning Document
```

**Portion Marking Validation**:
```
Input Document:
"(U) Introduction
(S) The classified section discusses...
(U) Conclusion"

Validation:
- Overall classification: SECRET (highest portion)
- Portion count: 2x (U), 1x (S)
- Warning if overall banner doesn't match highest portion
```

### 7.2 Classification Metadata

Each record stores:
```json
{
  "classification_level": "SECRET",
  "classification_authority": "Derived from: ICD 203-2015",
  "declassification_date": "2036-02-13",
  "dissemination_controls": ["NOFORN", "RELIDO"],
  "sci_compartments": ["TK", "SI"],
  "portion_markings": [
    {"paragraph": 1, "level": "U"},
    {"paragraph": 2, "level": "S"},
    {"paragraph": 3, "level": "S//NF"}
  ]
}
```

### 7.3 User Clearance Validation

**Database Schema**:
```sql
CREATE TABLE user_clearances (
  user_id UUID REFERENCES users(id),
  clearance_level VARCHAR(10) CHECK (clearance_level IN ('U', 'C', 'S', 'TS')),
  sci_eligible BOOLEAN DEFAULT FALSE,
  compartments TEXT[], -- ['TK', 'SI', 'HCS']
  investigation_date DATE,
  expiration_date DATE,
  adjudication_authority VARCHAR(100)
);
```

**Access Control Logic**:
```javascript
// Pseudo-code for access check
function canAccessDocument(user, document) {
  // 1. Clearance level check
  if (user.clearance_level < document.classification_level) {
    return false;
  }
  
  // 2. SCI compartment check
  if (document.sci_compartments.length > 0) {
    if (!user.sci_eligible) return false;
    if (!document.sci_compartments.every(c => user.compartments.includes(c))) {
      return false;
    }
  }
  
  // 3. Dissemination control check
  if (document.dissemination_controls.includes('NOFORN') && 
      user.citizenship !== 'US') {
    return false;
  }
  
  // 4. Need-to-know check (role-based)
  if (!user.roles.some(role => document.authorized_roles.includes(role))) {
    return false;
  }
  
  return true;
}
```

---

## 8. Disaster Recovery and Business Continuity

### 8.1 Backup Strategy

**RPO (Recovery Point Objective)**: 1 hour  
**RTO (Recovery Time Objective)**: 4 hours

#### Backup Schedule
- **Database**: Continuous WAL archiving + hourly snapshots
- **File Storage**: 4-hour incremental, daily full backup
- **Configuration**: Daily backup to version control (Git) + encrypted archive
- **Logs**: Real-time streaming to off-site syslog server

#### Backup Storage
- **Primary**: NetApp/Dell EMC storage with snapshots
- **Secondary**: Tape library (LTO-9) for long-term retention
- **Tertiary**: Off-site SCIF at alternate location (24-hour rotation)

### 8.2 Disaster Recovery Plan

**Scenario 1: Single Server Failure**
- **Detection**: Kubernetes auto-restarts pod on healthy node
- **Time to Recover**: < 5 minutes (automatic)
- **Data Loss**: None (persistent volumes)

**Scenario 2: Database Corruption**
- **Detection**: Health check fails, alarms trigger
- **Recovery**: Restore from most recent snapshot (< 1 hour old)
- **Time to Recover**: 30 minutes
- **Data Loss**: Up to 1 hour (per RPO)

**Scenario 3: Complete SCIF Failure (Fire/Flood)**
- **Detection**: Loss of heartbeat from primary site
- **Recovery**: Activate disaster recovery SCIF
  1. Restore database from overnight tape (transported daily)
  2. Redeploy Kubernetes cluster from configuration backups
  3. Reconnect to SIPRNET at DR site
  4. Resume operations
- **Time to Recover**: 8-12 hours
- **Data Loss**: Up to 24 hours (tape rotation cycle)

### 8.3 Continuity of Operations (COOP)

**Alternate Processing Site**: Secondary SCIF location 100+ miles away

**Essential Functions**:
1. Search and retrieval of classified records
2. Classification review and downgrade workflows
3. FOIA/MDR request processing
4. Audit trail preservation

**Maximum Tolerable Downtime (MTD)**: 24 hours

---

## 9. Risk Considerations and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Classification Spillage** | Critical | Low | Automated classification validation, user training, DLP tools |
| **Insider Threat** | Critical | Medium | Least privilege, audit logging, behavioral analytics, two-person integrity |
| **Data Breach (External)** | Critical | Low | Air-gap, no internet access, physical security, encryption at rest |
| **Supply Chain Attack** | High | Medium | Vendor security assessments, code signing, checksums, isolated build environment |
| **System Downtime** | High | Medium | HA architecture, automated failover, disaster recovery testing |
| **Unauthorized Access** | Critical | Low | CAC/PIV authentication, MFA, access reviews, role-based access control |
| **Data Loss** | High | Low | Hourly backups, off-site storage, immutable storage, RAID arrays |
| **Compliance Violation** | High | Medium | Continuous monitoring, ISSO oversight, automated compliance checks |

---

## 10. Cost Estimation Summary

### 10.1 On-Premise Deployment (5-Year TCO)

| Cost Category | Year 1 | Years 2-5 (Annual) | 5-Year Total |
|---------------|--------|---------------------|--------------|
| **Hardware** | $350,000 | $50,000 (refresh) | $550,000 |
| **Software Licenses** | $80,000 | $80,000 | $400,000 |
| **Personnel (8 FTE)** | $1,000,000 | $1,050,000 | $5,200,000 |
| **Facilities** | $100,000 | $100,000 | $500,000 |
| **Training** | $50,000 | $20,000 | $130,000 |
| **ATO/Compliance** | $200,000 | $50,000 | $400,000 |
| **Contingency (10%)** | $178,000 | $135,000 | $718,000 |
| **Total** | **$1,958,000** | **$1,485,000** | **$7,898,000** |

### 10.2 Cloud Deployment (5-Year TCO)

| Cost Category | Year 1 | Years 2-5 (Annual) | 5-Year Total |
|---------------|--------|---------------------|--------------|
| **Cloud Infrastructure** | $300,000 | $350,000 | $1,700,000 |
| **Software Licenses** | $80,000 | $80,000 | $400,000 |
| **Personnel (6 FTE)** | $750,000 | $787,500 | $3,900,000 |
| **FedRAMP ATO** | $500,000 | $100,000 | $900,000 |
| **Training** | $50,000 | $20,000 | $130,000 |
| **Network (Direct Connect)** | $120,000 | $120,000 | $600,000 |
| **Contingency (10%)** | $180,000 | $145,750 | $763,000 |
| **Total** | **$1,980,000** | **$1,603,250** | **$8,393,000** |

**Recommendation**: On-premise deployment is more cost-effective for long-term SCIF deployments and offers better control.

---

## 11. Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Phase 1: Planning** | 12 weeks | SSP, ATO package (initial), hardware procurement |
| **Phase 2: Infrastructure** | 8 weeks | Kubernetes cluster, database, application deployed |
| **Phase 3: Testing** | 6 weeks | SAR, functional testing complete, ATO signed |
| **Phase 4: Production** | 4 weeks | Data migrated, users trained, system live |
| **Total** | **30 weeks (7.5 months)** | Operational classified records management system |

**Critical Path**: ATO process (can extend timeline by 6-12 months if complex)

---

## 12. Success Criteria

### Technical Metrics
- [ ] System availability: 99.5% uptime (43.8 hours/year downtime)
- [ ] Search query response: < 2 seconds for 95th percentile
- [ ] Concurrent users: Support 500+ simultaneous users
- [ ] Data throughput: Ingest 10,000 documents/day
- [ ] Backup success rate: 100% of scheduled backups complete

### Security Metrics
- [ ] Zero classification spillage incidents
- [ ] 100% CAC/PIV authentication compliance
- [ ] < 5 high-risk vulnerabilities open (per ACAS)
- [ ] Audit log completeness: 100% of security events captured
- [ ] Access review: 100% of users recertified quarterly

### Operational Metrics
- [ ] Mean time to resolution (MTTR): < 4 hours for critical issues
- [ ] User satisfaction: > 85% positive rating
- [ ] Training completion: 100% of users trained before access granted
- [ ] Compliance: Zero POA&M items > 90 days overdue

---

## 13. References and Resources

### Regulatory Documents
- **ICD 503**: [https://www.dni.gov/files/documents/ICD/ICD_503.pdf](https://www.dni.gov/files/documents/ICD/ICD_503.pdf)
- **ICD 705**: [https://www.dni.gov/files/documents/ICD/ICD_705.pdf](https://www.dni.gov/files/documents/ICD/ICD_705.pdf)
- **NIST SP 800-53**: [https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- **DoD 5015.2**: [https://www.esd.whs.mil/DD/](https://www.esd.whs.mil/DD/)
- **CNSSI 1253**: [https://www.cnss.gov/CNSS/issuances/Policies.cfm](https://www.cnss.gov/CNSS/issuances/Policies.cfm)

### Technical Guides
- **DISA STIGs**: [https://public.cyber.mil/stigs/](https://public.cyber.mil/stigs/)
- **Kubernetes Hardening Guide**: [https://media.defense.gov/2021/Aug/03/2002820425/-1/-1/1/CTR_KUBERNETES%20HARDENING%20GUIDANCE.PDF](https://media.defense.gov/2021/Aug/03/2002820425/-1/-1/1/CTR_KUBERNETES%20HARDENING%20GUIDANCE.PDF)
- **NIST Cybersecurity Framework**: [https://www.nist.gov/cyberframework](https://www.nist.gov/cyberframework)

### Vendor Resources
- **AWS GovCloud**: [https://aws.amazon.com/govcloud-us/](https://aws.amazon.com/govcloud-us/)
- **Azure Government**: [https://azure.microsoft.com/en-us/global-infrastructure/government/](https://azure.microsoft.com/en-us/global-infrastructure/government/)
- **Red Hat OpenShift (Gov)**: [https://www.redhat.com/en/technologies/cloud-computing/openshift/government](https://www.redhat.com/en/technologies/cloud-computing/openshift/government)

---

## 14. Appendices

### Appendix A: Acronyms and Definitions

- **AO**: Authorizing Official
- **ATO**: Authority to Operate
- **CAC**: Common Access Card
- **CDS**: Cross-Domain Solution
- **COOP**: Continuity of Operations
- **DISA**: Defense Information Systems Agency
- **DoD**: Department of Defense
- **FSO**: Facility Security Officer
- **ICD**: Intelligence Community Directive
- **ISSO**: Information System Security Officer
- **JWICS**: Joint Worldwide Intelligence Communications System
- **MDR**: Mandatory Declassification Review
- **NIPRNET**: Non-classified Internet Protocol Router Network
- **NISPOM**: National Industrial Security Program Operating Manual
- **PIV**: Personal Identity Verification
- **POA&M**: Plan of Action and Milestones
- **RTO**: Recovery Time Objective
- **RPO**: Recovery Point Objective
- **SAR**: Security Assessment Report
- **SCI**: Sensitive Compartmented Information
- **SCIF**: Sensitive Compartmented Information Facility
- **SIPRNET**: Secret Internet Protocol Router Network
- **SSO**: Special Security Officer
- **SSP**: System Security Plan
- **STIG**: Security Technical Implementation Guide

### Appendix B: Sample Configuration Files

See separate repository: `c:\Projects\ZLAWS\MCDT\docs\scif-deployment-configs\`

### Appendix C: Contact Information

**ISSO**: isso@organization.smil.mil  
**System Administrators**: sysadmin@organization.smil.mil  
**Help Desk**: 1-800-XXX-XXXX (SIPR), helpdesk@organization.smil.mil

---

**Document Control**

- **Classification**: UNCLASSIFIED (deployment guide only)
- **Version**: 1.0
- **Date**: February 13, 2026
- **Author**: ZLAWS Development Team
- **Review Cycle**: Annually or upon major system changes
- **Approval**: [ISSO Signature Required]

---

*This document provides high-level guidance only. Specific implementation details must be developed in coordination with your organization's ISSO, AO, and mission requirements. All deployments handling classified information require formal ATO approval before operations commence.*
