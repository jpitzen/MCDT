USE ZLDB

GO

--Table: ZLUserPolicy
CREATE SEQUENCE pfuser.ZLUserPolicy_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO

GO

CREATE TABLE pfuser.ZLUserPolicy (
	upolId 		    INT NOT NULL,
	upolProjId      INT NOT NULL,
	upolName		NVARCHAR(255) NOT NULL,
	upolType 	    NVARCHAR(64) NOT NULL,
	upolTenantId	INT NOT NULL,
	upolDesc		NVARCHAR(255) NULL,
	upolCreateDate	DATETIME NOT NULL,
	CONSTRAINT pk_upolicy PRIMARY KEY (upolId),
	CONSTRAINT uk2_upolicy UNIQUE (upolType,upolTenantId,upolName)
)
GO
CREATE INDEX i1_upolicy ON pfuser.ZLUserPolicy(upolProjId)
GO

--End Table: ZLUserPolicy

--Table: ZLUserPolicyRule
CREATE SEQUENCE pfuser.ZLUserPolicyRule_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO

GO

CREATE TABLE pfuser.ZLUserPolicyRule (
    upruleId                 INT NOT NULL,
    uprulePolicyId           INT NOT NULL,
    upruleShortName          NVARCHAR(64) NOT NULL,
    upruleDesc               NVARCHAR(255) NULL,
    upruleSeqNum             INT NOT NULL,
    upruleField1Name         VARCHAR(255) NULL,
    upruleField1Operator     VARCHAR(255) NULL,
    upruleField1Pattern      NVARCHAR(255) NULL,
    upruleField2Name         VARCHAR(255) NULL,
    upruleField2Operator     VARCHAR(255) NULL,
    upruleField2Pattern      NVARCHAR(255) NULL,
    upruleField3Name         VARCHAR(255) NULL,
    upruleField3Operator     VARCHAR(255) NULL,
    upruleField3Pattern      NVARCHAR(255) NULL,
    upruleField4Name         VARCHAR(255) NULL,
    upruleField4Operator     VARCHAR(255) NULL,
    upruleField4Pattern      NVARCHAR(255) NULL,
    upruleAction             VARCHAR(255) NULL,
    upruleActionVal1         NVARCHAR(255) NULL,
    upruleActionVal2         NVARCHAR(255) NULL,
    upruleActionVal3         NVARCHAR(255) NULL,
    CONSTRAINT pk_uprule PRIMARY KEY (upruleId),
    CONSTRAINT uk1_uprule UNIQUE (uprulePolicyId, upruleShortName)
)
GO
--End Table: ZLUserPolicyRule

-- Table: CaseWorkspacePreservation
CREATE TABLE pfuser.CaseWorkspacePreservation (
    cwpCaseId INT NOT NULL,
    cwpCaseDataSourceId INT NOT NULL,
    cwpWorkspaceId INT NOT NULL,
    cwpGovernanceResultId INT NOT NULL,
    cwpTenantId INT NOT NULL,
    cwpDateCreate DATETIME NOT NULL,
    CONSTRAINT PK_CaseWorkspacePreservation PRIMARY KEY (cwpCaseId, cwpCaseDataSourceId, cwpWorkspaceId)
)
GO

CREATE INDEX i1_CaseWorkspacePreservation ON pfuser.CaseWorkspacePreservation(cwpCaseId)
GO
CREATE INDEX i2_CaseWorkspacePreservation ON pfuser.CaseWorkspacePreservation(cwpWorkspaceId)
GO

--end table CaseWorkspacePreservation
--Table: RecategorizationTask
ALTER TABLE pfuser.RecategorizationTask
ADD 
    rtTagType       VARCHAR(128) NULL,
    rtParentTaskId  INT NULL,
    rtRetryCount    INT NULL,
    rtUserName      NVARCHAR(255) NULL
GO

--UPDATE
UPDATE pfuser.RecategorizationTask
SET rtParentTaskId=-1
GO

UPDATE pfuser.RecategorizationTask
SET rtRetryCount=0
GO

--ALTER COLUMN
ALTER TABLE pfuser.RecategorizationTask
ALTER COLUMN rtParentTaskId INT NOT NULL
GO

--ALTER COLUMN
ALTER TABLE pfuser.RecategorizationTask
ALTER COLUMN rtRetryCount INT NOT NULL
GO
--End Table: RecategorizationTask
ALTER TABLE pfuser.RecordSchema
DROP CONSTRAINT uk_recSchema
GO

-- Change the data type nullability for Oracle:
ALTER TABLE pfuser.RecordSchema
ALTER COLUMN rsSchemaName VARCHAR(128) NULL
GO

ALTER TABLE pfuser.RecordSchema
ALTER COLUMN rsSchemaName NVARCHAR(255) NOT NULL
GO

ALTER TABLE pfuser.RecordSchema
ADD CONSTRAINT uk_recSchema UNIQUE(rsStoreId,rsSchemaName)
GO

ALTER TABLE pfuser.RecordSchemaFields
DROP CONSTRAINT pk2_recSchFld
GO

-- Change the data type nullability for Oracle:
ALTER TABLE pfuser.RecordSchemaFields
ALTER COLUMN rsfName VARCHAR(128) NULL
GO

ALTER TABLE pfuser.RecordSchemaFields
ALTER COLUMN rsfName NVARCHAR(255) NOT NULL
GO

ALTER TABLE pfuser.RecordSchemaFields
ADD CONSTRAINT pk2_recSchFld PRIMARY KEY(rsfSchemaId,rsfName)
GO
-- Table: SearchStore

--add ssHasDeleted column

ALTER TABLE pfuser.SearchStore
ADD ssHasDeleted CHAR(1) NULL
GO

UPDATE pfuser.SearchStore
SET ssHasDeleted = 'N'
GO

ALTER TABLE pfuser.SearchStore
ALTER COLUMN ssHasDeleted CHAR(1) NOT NULL
GO

-- end of Table: SearchStore

-- Create a sequence for generating isId
CREATE SEQUENCE pfuser.IndexStore_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

-- Table: IndexStore
CREATE TABLE pfuser.IndexStore (
    isId                INT NOT NULL,
	isRefId		        INT NOT NULL,
	isContextType		VARCHAR(32) NOT NULL,
	isItemType          VARCHAR(32) NULL,
	isVault             VARCHAR(128) NULL,
	isCreateDate	    DATETIME NOT NULL,
	isRefStId		    VARCHAR(255) NOT NULL,
	CONSTRAINT pk_IndexStore PRIMARY KEY (isId),
    CONSTRAINT uk_IndexStore UNIQUE (isRefId,isContextType)
)
GO
--end table IndexStore
ALTER TABLE pfuser.SelectiveArchiveSearch
ADD sasSourceContextType VARCHAR(255) NULL
GO

UPDATE pfuser.SelectiveArchiveSearch
SET sasSourceContextType = ''
GO

ALTER TABLE pfuser.SelectiveArchiveSearch
ALTER COLUMN sasSourceContextType VARCHAR(255) NOT NULL
GO

-- Table: UserLicense
CREATE SEQUENCE pfuser.UserLicense_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.UserLicense (
    ulId INT NOT NULL,
    ulDate DATETIME,
    ulActiveUserCount INT,
    ulTerminatedUserCount INT,
    ulActiveMailingListCount INT,
    ulTerminatedMailingListCount INT,
    ulTenantId INT NOT NULL,
    ulUserWithoutDataCount INT,
    ulMailingListWithoutDataCount INT,
    CONSTRAINT PK_UserLicense PRIMARY KEY (ulId)
)
GO

--end table UserLicense
CREATE INDEX i1_ul_UserLicenseDate ON pfuser.UserLicense (ulDate)
GO
--Table: Workspace
CREATE SEQUENCE pfuser.Workspace_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.Workspace (
    wsId INT NOT NULL,
    wsTenantId INT NOT NULL,
    wsName NVARCHAR(255) NOT NULL,
    wsDesc NVARCHAR(255) NULL,
    wsType INT NOT NULL,
    wsMode INT NOT NULL,
    wsCreateDate DATETIME NOT NULL,
    wsLastAccessedDate DATETIME NOT NULL,
    wsSearchStoreType INT NOT NULL,
    CONSTRAINT pk_Workspace PRIMARY KEY (wsId),
    CONSTRAINT uk_Workspace UNIQUE (wsTenantId,wsName)
)
GO

CREATE INDEX i1_Workspace ON pfuser.Workspace(wsMode)
GO
CREATE INDEX i2_Workspace ON pfuser.Workspace(wsType)
GO
--end table Workspace

sp_rename 'pfuser.Workspace.wsSearchStoreType','wsSearchType','COLUMN'
GO

-- Table WorkspaceDataSource

-- Creating Sequence for WorkspaceDataSource

CREATE SEQUENCE pfuser.WorkspaceDataSource_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

-- Creating Table WorkspaceDataSource

CREATE TABLE pfuser.WorkspaceDataSource (
	-- IDENTITY
	wsdsId		BIGINT NOT NULL,
	wsdsName		NVARCHAR(255) NOT NULL,
	wsdsWorkspaceId 	INT NOT NULL,
	wsdsSrchStoreId INT NOT NULL,
	wsdsPurpose VARCHAR(32) NOT NULL,
	wsdsType		VARCHAR(32),
	wsdsDateCreate	DATETIME NOT NULL,
	wsdsDateUpdate	DATETIME NOT NULL,
	wsdsVaultItemId	VARCHAR(128) NULL,
	wsdsVaultPwd 	VARBINARY(255) NULL,
	wsdsLastExportedDate DATETIME NULL,
	wsdsItemCount BIGINT NOT NULL,
	CONSTRAINT pk_WorkspaceDataSource PRIMARY KEY (wsdsId),
	CONSTRAINT uk_WorkspaceDataSource UNIQUE (wsdsWorkspaceId, wsdsName)
)
GO

CREATE INDEX i1_WorkspaceDataSource ON pfuser.WorkspaceDataSource(wsdsVaultItemId)
GO


CREATE SEQUENCE pfuser.WorkspaceDataSourceRun_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.WorkspaceDataSourceRun (
    wsdsrId INT NOT NULL,
    wsdsrContextId INT NOT NULL,
    wsdsrSrcId INT NOT NULL,
    wsdsrSearchItemCount INT NOT NULL,
    wsdsrSearchStartDate DATETIME NULL,
    wsdsrSearchEndDate DATETIME NULL,
    wsdsrSearchUpdateDate DATETIME NULL,
    wsdsrSearchPID NVARCHAR(64) NOT NULL,
    wsdsrStatus INT NOT NULL,
    wsdsrSearchStatusMsg NVARCHAR(255) NULL,
    wsdsrVaultId VARCHAR(128) NULL,
    wsdsrEncPwd VARBINARY(128) NULL,
    wsdsrImportStartDate DATETIME NULL,
    wsdsrImportUpdateDate DATETIME NULL,
    wsdsrImportEndDate DATETIME NULL,
    wsdsrImportNewItems INT NULL,
    wsdsrImportExistingItems INT NULL,
    wsdsrImportErrors INT NULL,
    wsdsrImportStatusMsg NVARCHAR(255) NULL,
    CONSTRAINT pk_WorkspaceDataSourceRun PRIMARY KEY (wsdsrId)
)
GO
CREATE INDEX i1_WorkspaceDataSourceRun ON pfuser.WorkspaceDataSourceRun(wsdsrContextId,wsdsrSrcId)
GO

--Begin Table WorkspaceDataSourceIndexRuns
CREATE SEQUENCE pfuser.WorkspaceDataSourceIndexRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.WorkspaceDataSourceIndexRuns (
    wsirId INT NOT NULL,
    wsirWorkspaceId INT NOT NULL,
    wsirSrcId INT NOT NULL,
    wsirType VARCHAR(32),
    wsirCreateDate DATETIME NOT NULL,
    wsirSearchDate DATETIME NOT NULL,
    wsirSearchCount INT NOT NULL,
    wsirStartDate DATETIME NULL,
    wsirUpdateDate DATETIME NULL,
    wsirEndDate DATETIME NULL,
    wsirNewCount INT NOT NULL,
    wsirTotalCount INT NOT NULL,
    wsirPID VARCHAR(32) NOT NULL,
    wsirStatus INT NOT NULL,
    wsirStatusMsg VARCHAR(255) NULL,
    CONSTRAINT pk_WorkspaceDataSourceIndexRuns PRIMARY KEY (wsirId)
)
GO
CREATE INDEX i1_WorkspaceDataSourceIndexRuns ON pfuser.WorkspaceDataSourceIndexRuns(wsirWorkspaceId,wsirSrcId)
GO
--End Table WorkspaceDataSourceIndexRuns

--Table: WorkspaceItemData
CREATE TABLE pfuser.WorkspaceItemData (
    wsiId INT NOT NULL,
    wsiContextId    INT NOT NULL,
    wsiType     INT NOT NULL,
    wsiRefId    VARCHAR(128) NOT NULL,
    wsiFlags    INT NOT NULL,
    wsiCreateDate   DATETIME NOT NULL,
    wsiLastUpdate   DATETIME NOT NULL,
    wsiSrcIds    VARCHAR(255) NULL,
    wsiSrcRunIds VARCHAR(255) NULL,
    CONSTRAINT pk_wsi PRIMARY KEY (wsiContextId,wsiId),
    CONSTRAINT uk_wsi UNIQUE (wsiContextId,wsiRefId)
)
GO
--end table WorkspaceItemData

--start table WorkspaceItemSequence
CREATE TABLE pfuser.WorkspaceItemSequence (
    wsSeqWorkspaceId INT NOT NULL,
    wsSeqLast INT NOT NULL,
    wsSeqCreateDate DATETIME NOT NULL,
    wsSeqLastUpdateDate DATETIME NOT NULL,
    CONSTRAINT pk_wsSeq PRIMARY KEY (wsSeqWorkspaceId)
)
GO
--end table WorkspaceItemSequence

CREATE TABLE pfuser.WorkspaceAuditTrail (
	wsaAction INT NOT NULL,
	wsaDate DATETIME NOT NULL,
	wsaItemId BIGINT NOT NULL,
	wsaRefItemId VARCHAR(255) NULL,
	wsaWorkspaceId INT NOT NULL,
	wsaZlpUserId INT NOT NULL,
	wsaUser NVARCHAR(255) NOT NULL,
	wsaDomainId INT NOT NULL,
	wsaTenantId INT NOT NULL,
	wsaTxnId VARCHAR(64) NOT NULL,
	wsaClearanceLevel INT NOT NULL,
	wsaSourceIP VARCHAR(64) NULL,
	wsaDestIP VARCHAR(64) NULL,
	wsaAccessType VARCHAR(128) NULL,
	wsaZViteStId VARCHAR(255) NULL,
	wsaComments NVARCHAR(255) NULL,
	wsaVal1 NVARCHAR(255) NULL,
	wsaVal2 NVARCHAR(255) NULL,
	wsaVal3 NVARCHAR(255) NULL,
	wsaVal4 NVARCHAR(255) NULL,
	wsaVal5 NVARCHAR(255) NULL
)
GO

CREATE INDEX i1_WorkspaceAudit ON pfuser.WorkspaceAuditTrail(wsaDate)
GO
CREATE INDEX i2_WorkspaceAudit ON pfuser.WorkspaceAuditTrail(wsaDomainId)
GO
CREATE INDEX i3_WorkspaceAudit ON pfuser.WorkspaceAuditTrail(wsaItemId)
GO
CREATE INDEX i4_WorkspaceAudit ON pfuser.WorkspaceAuditTrail(wsaRefItemId)
GO
CREATE INDEX i5_WorkspaceAudit ON pfuser.WorkspaceAuditTrail(wsaZlpUserId)
GO

--Table WorkspaceGovernanceResult

CREATE SEQUENCE pfuser.WorkspaceGovernanceResult_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.WorkspaceGovernanceResult (
	wsgrId		INT NOT NULL,
	wsgrName		NVARCHAR(255) NOT NULL,
	wsgrWorkspaceId 	INT NOT NULL,
	wsgrSrchStoreId INT NOT NULL,
	wsgrPurpose VARCHAR(32) NOT NULL,
	wsgrType		VARCHAR(32),
	wsgrDateCreate	DATETIME NOT NULL,
	wsgrDateUpdate	DATETIME NOT NULL,
	wsgrVaultItemId	VARCHAR(128) NULL,
	wsgrVaultPwd 	VARBINARY(255) NULL,
	CONSTRAINT pk_WorkspaceGovernanceResult PRIMARY KEY (wsgrId),
	CONSTRAINT uk_WorkspaceGovernanceResult UNIQUE (wsgrWorkspaceId,wsgrName)
)
GO

--End Table WorkspaceGovernanceResult

--Table WorkspaceGovernanceResultRun

CREATE SEQUENCE pfuser.WorkspaceGovernanceResultRun_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.WorkspaceGovernanceResultRun (
    wsgrrId INT NOT NULL,
    wsgrrWorkspaceId INT NOT NULL,
    wsgrrSearchId INT NOT NULL,
    wsgrrSearchItemCount INT NOT NULL,
    wsgrrSearchStartDate DATETIME NULL,
    wsgrrSearchEndDate DATETIME NULL,
    wsgrrSearchUpdateDate DATETIME NULL,
    wsgrrPID NVARCHAR(64) NOT NULL,
    wsgrrStatus INT NOT NULL,
    wsgrrStatusMsg NVARCHAR(255) NULL,
    wsgrrVaultId VARCHAR(128) NULL,
    wsgrrEncPwd VARBINARY(128) NULL,
    CONSTRAINT pk_WorkspaceGovernanceResultRun PRIMARY KEY (wsgrrId)
)
GO
CREATE INDEX i1_WorkspaceGovernanceResultRun ON pfuser.WorkspaceGovernanceResultRun(wsgrrWorkspaceId,wsgrrSearchId)
GO

--End Table WorkspaceGovernanceResultRun

--start table Workspace
ALTER TABLE pfuser.Workspace
ADD wsVaultItemId VARCHAR(128) NULL
GO
--end table Workspace

-- 20251022 start table Workspace
ALTER TABLE pfuser.Workspace
ADD wsLastKnownCount BIGINT NULL
GO
