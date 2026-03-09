



-- *************************************************************************************
--	Case 
-- *************************************************************************************


CREATE SEQUENCE pfuser01.Case_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.CaseInfo (
	caseId		INT NOT NULL,
	caseOwnerZlpUserId INT NOT NULL,
	caseJournalDomainId	INT NOT NULL,
	caseTenantId INT NOT NULL,
	caseName	        NVARCHAR(255) NOT NULL,
	caseDisplayName	        NVARCHAR(255) NOT NULL,
	caseKey 	NVARCHAR(255) NULL,
	caseJurisdiction NVARCHAR(255) NULL,
	caseDockNumber	 NVARCHAR(255) NULL,
	caseCreatorZlpUserId INT NOT NULL,
	caseInAttyZlpUserId INT  NULL,
	caseInParaLegal	 INT  NULL,
	caseOutCounsel  NVARCHAR(255) NULL,
	caseITZlpUserId INT NULL,
	caseState	INT NOT NULL,
	caseFlags	INT NOT NULL,
	caseCategory INT NOT NULL,
	casePurgeDate	DATETIME NULL,
	caseCreateDate	DATETIME NOT NULL,
	caseFileDate	DATETIME NOT NULL,
	caseLastUpdate	DATETIME NOT NULL,
	caseDeleted 	CHAR(1) NOT NULL,
	caseSchemaId	INT NOT NULL,
	caseItemSchemaId	INT NOT NULL,
	caseUserDataId	INT NOT NULL,
	caseNotesVal1	NVARCHAR(255) NULL,
	caseNotesVal2	NVARCHAR(255) NULL,
	caseNotesVal3	NVARCHAR(255) NULL,
	caseNotesVal4	NVARCHAR(255) NULL,
	caseParamVal1	NVARCHAR(255) NULL,
	caseParamVal2	NVARCHAR(255) NULL,
	caseParamVal3	NVARCHAR(255) NULL,
	caseExcludeTagIds	VARCHAR(255) NULL, 
	caseBulkRcptCount	INT NOT NULL, 
	caseLegalHoldSyncDate	DATETIME NULL,
	caseItemSyncDate	DATETIME NULL,
	CONSTRAINT pk_CaseInfo PRIMARY KEY(caseId) ON ZL_APP_INDEX,
--	CONSTRAINT fk_CaseInfoJDomain FOREIGN KEY (caseJournalDomainId) REFERENCES pfuser01.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseInfoZLPUser FOREIGN KEY (caseOwnerZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE,
	CONSTRAINT uk2_CaseInfo UNIQUE (caseTenantId,caseName) ON ZL_APP_INDEX
) ON ZL_APP
GO
CREATE INDEX i1_CaseInfo ON pfuser01.CaseInfo(caseJournalDomainId)  ON ZL_APP_INDEX
GO




CREATE TABLE pfuser01.CasePrivileges (
	cpCaseId INT NOT NULL,
        cpPrivilegeFlags INT NOT NULL,
        cpEntityId INT NOT NULL,
	cpEntityType INT NOT NULL,
--	CONSTRAINT fk_CasePriv FOREIGN KEY (cpCaseId) REFERENCES pfuser01.CaseInfo(caseId) ON DELETE CASCADE,
	CONSTRAINT uk_CasePriv UNIQUE (cpCaseId,cpEntityId,cpEntityType) ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE INDEX i1_CasePriv ON pfuser01.CasePrivileges(cpCaseId)  ON ZL_APP_INDEX
GO
CREATE INDEX i2_CasePriv  ON pfuser01.CasePrivileges(cpEntityId,cpEntityType) ON ZL_APP_INDEX
GO


CREATE TABLE pfuser01.CaseUserPreference (
	cupZlpUserId 		INT NOT NULL,
	cupFlags			INT NOT NULL,
	cupVal1		NVARCHAR(255) NULL,
	cupVal2		NVARCHAR(255) NULL,
	cupVal3		NVARCHAR(255) NULL,
	cupVal4		NVARCHAR(255) NULL,	
	CONSTRAINT pk_CaseUser PRIMARY KEY (cupZlpUserId)  ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_CaseUser FOREIGN KEY (cupZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE
) ON ZL_APP
GO


CREATE TABLE pfuser01.CaseUserSubscription (
	cusAcctNo 		INT NOT NULL,
	cusCaseId		INT NOT NULL,
	cusDate			DATETIME NOT NULL,
	CONSTRAINT pk_CaseUsSub PRIMARY KEY (cusAcctNo,cusCaseId)  ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_CaseUserSub FOREIGN KEY (cupCaseId) REFERENCES pfuser01.CaseInfo(caseId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_CaseUserAcct FOREIGN KEY (cupAcctNo) REFERENCES pfuser01.ZipAccount(zaAcctNo) ON DELETE CASCADE
) ON ZL_APP
GO



-- OPTIONAL
CREATE SEQUENCE pfuser01.CaseDataSource_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.CaseDataSource (
	-- IDENTITY
	srcId		BIGINT NOT NULL,
	srcParentId	INT NOT NULL,
	srcName		NVARCHAR(255) NOT NULL,
	srcDisplayName		NVARCHAR(255) NULL,
	srcCaseId 	INT NOT NULL,
	srcSrchStoreId INT NOT NULL,
	srcPurpose VARCHAR(32) NOT NULL,
	srcType		VARCHAR(32),
	srcDateCreate	DATETIME NOT NULL,
	srcUpdate	DATETIME NOT NULL,
	srcVaultItemId	VARCHAR(128) NULL,
	srcVaultPwd 	VARBINARY(255) NULL,
	srcDeleted	CHAR(1) NOT NULL,
	srcFedFlag INT NULL,
	srcFedParamVal1 NVARCHAR(255) NULL,
	srcFedParamVal2 NVARCHAR(255) NULL,
	srcFedParamVal3 NVARCHAR(255) NULL,
	srcFedParamVal4 NVARCHAR(255) NULL,
	srcFedParamVal5 NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseDataSource PRIMARY KEY (srcId)  ON ZL_APP_INDEX,
	CONSTRAINT uk_CaseDataSource UNIQUE (srcCaseId,srcName) ON ZL_APP_INDEX
) ON ZL_APP
GO
CREATE INDEX i1_CaseDataSource ON pfuser01.CaseDataSource(srcVaultItemId)  ON ZL_APP_INDEX
GO


CREATE SEQUENCE pfuser01.CaseDataSourceRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.CaseDataSourceRuns (
	runId		INT NOT NULL,
	runSrcId		INT NOT NULL,
	runCaseId 	INT NOT NULL,
	runSrchPID		NVARCHAR(255),
	runStatus	INT NOT NULL,
	runSrchStart	DATETIME NOT NULL,
	runSrchUpdate	DATETIME NOT NULL,
	runSrchEnd	DATETIME NULL,
	runSrchItemFound	INT NOT NULL,
	runSrchStatusMsg NVARCHAR(255) NULL,
	runImportPID		NVARCHAR(255),
	runImportStart	DATETIME NULL,
	runImportUpdate	DATETIME NULL,
	runImportEnd	DATETIME NULL,
	runItemNew	INT NULL,
	runItemNewRef	INT NULL,
	runItemPrev	INT NULL,
	runItemNotFound	INT NULL,
	runIItemErrors	INT NULL,
	runImportStatusMsg NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseDataSrcRuns PRIMARY KEY (runId)  ON ZL_APP_INDEX
) ON ZL_APP
GO
CREATE INDEX i1_CaseDataSrcRuns ON pfuser01.CaseDataSourceRuns(runCaseId,runSrcId)  ON ZL_APP_INDEX
GO


CREATE TABLE pfuser01.CaseDataSourceScheduledRuns (
	schedSrcId	INT NOT NULL,
	schedIntervalSec INT NOT NULL,
	schedDateStart	DATETIME NOT NULL,
	schedDateExpiry DATETIME NULL,
	schedIterations	INT NULL,
	CONSTRAINT pk_CaseDataSourceScheduledRuns PRIMARY KEY (schedSrcId)  ON ZL_APP_INDEX
) ON ZL_APP
GO









CREATE TABLE pfuser01.CaseItem (
	caseItemCaseId INT NOT NULL,	
	caseItemId	INT NOT NULL,
	caseItemType	INT NOT NULL,
	caseItemSrcIds  VARCHAR(255) NULL,
	caseItemRunIds  VARCHAR(255) NULL,
    caseItemRefItemId VARCHAR(128) NOT NULL,
    caseItemSize 	BIGINT NOT NULL,
	caseItemFlags   INT NOT NULL,
    caseItemTagType INT NOT NULL,
    caseItemTagIds VARCHAR(255) NULL,
	caseItemExpTagIds VARCHAR(255) NULL,
	caseItemCreateDate    DATETIME  NOT NULL,
	caseItemProcessDate    DATETIME  NOT NULL,
    caseItemLastUpdate    DATETIME  NOT NULL,
	caseItemUserDataId	INT NOT NULL,
	caseItemParamVal1			NVARCHAR(255) NULL,
	caseItemParamVal2			NVARCHAR(255) NULL,
	caseItemParamVal3			NVARCHAR(255) NULL,
	caseItemParamVal4			NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseItem PRIMARY KEY(caseItemCaseId,caseItemId) ON ZL_CASEITEM_INDEX,
	CONSTRAINT uk_CaseItem UNIQUE (caseItemCaseId,caseItemRefItemId) ON ZL_CASEITEM_INDEX
--,
--	CONSTRAINT fk_CaseItem FOREIGN KEY (caseItemCaseId) REFERENCES pfuser01.CaseInfo(caseId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseItemSrc FOREIGN KEY (caseItemSrcId) REFERENCES pfuser01.CaseDataSource(srcId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseItemRun FOREIGN KEY (caseItemRunId) REFERENCES pfuser01.CaseDataSourceRuns(runId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseItemFldr FOREIGN KEY (caseItemFldrId) REFERENCES pfuser01.CaseFolder(caseFldrId) ON DELETE CASCADE
)
ON ZL_CASEITEM
GO
-- STORAGE (INITIAL 125M NEXT 250M MINEXTENTS 1 MAXEXTENTS 30 PCTINCREASE 0)
CREATE INDEX i1_CaseItem ON pfuser01.CaseItem(caseItemRefItemId) ON ZL_CASEITEM_INDEX
GO
CREATE INDEX i2_CaseItem ON pfuser01.CaseItem(caseItemCaseId,caseItemLastUpdate) ON ZL_CASEITEM_INDEX
GO



CREATE TABLE pfuser01.CaseItemProperty (
	cipCaseId INT NOT NULL,	
	cipCaseItemId			INT NOT NULL,
	cipType				NVARCHAR(32) NOT NULL,
	cipDate			DATETIME NOT NULL,
	cipVal1			NVARCHAR(255) NULL,
	cipVal2			NVARCHAR(255) NULL,
	cipVal3			NVARCHAR(255) NULL,
	cipVal4			NVARCHAR(255) NULL,
	cipVal5			NVARCHAR(255) NULL,
	cipVal6			NVARCHAR(255) NULL,
	cipVal7			NVARCHAR(255) NULL,
	cipVal8			NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseItemProp PRIMARY KEY (cipCaseId,cipCaseItemId,cipType) ON ZL_APP_INDEX
) ON ZL_APP
GO



CREATE TABLE pfuser01.CaseAuditTrail (
	caAction	INT NOT NULL,
	caDate		DATETIME NOT NULL,
	caItemId	BIGINT NOT NULL,
	caRefItemId	VARCHAR(255) NULL,
	caCaseId	INT NOT NULL,
	caCaseDomainId	INT NOT NULL,
	caZlpUserId	INT NOT NULL,
	caUser		NVARCHAR(255) NOT NULL,
	caDomainId	INT NOT NULL,
	caTenantId 	INT NOT NULL,	
	caTxnId		VARCHAR(64) NOT NULL,
	caClearanceLevel	INT NOT NULL,
	caSourceIP 	VARCHAR(64) NULL,
	caDestIP   	VARCHAR(64) NULL,
	caAccessType 	VARCHAR(128) NULL,
	caZViteStId 	VARCHAR(255) NULL,
	caComments	NVARCHAR(255) NULL,
	caVal1 	NVARCHAR(255) NULL,
	caVal2 	NVARCHAR(255) NULL,
	caVal3 	NVARCHAR(255) NULL,
	caVal4 	NVARCHAR(255) NULL,
	caVal5 	NVARCHAR(255) NULL
)
ON ZL_ITEM
GO

CREATE INDEX i1_CaseAudit ON pfuser01.CaseAuditTrail(caDate) ON ZL_ITEM_INDEX
GO
CREATE INDEX i2_CaseAudit ON pfuser01.CaseAuditTrail(caDomainId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i3_CaseAudit ON pfuser01.CaseAuditTrail(caItemId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i4_CaseAudit ON pfuser01.CaseAuditTrail(caRefItemId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i5_CaseAudit ON pfuser01.CaseAuditTrail(caZlpUserId) ON ZL_ITEM_INDEX
GO







CREATE SEQUENCE pfuser01.Custodian_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.Custodian (
	custId		INT NOT NULL,
	custCaseId	INT NOT NULL,
	custTenantId INT NOT NULL,
	custType			INT NOT NULL,
	custAddress 	NVARCHAR(255) NOT NULL,
	custZlpUserId	INT NOT NULL,
	custTerminated	CHAR(1) NOT NULL,
	custFullName		NVARCHAR(255) NOT NULL,
	custCreateDate		DATETIME NOT NULL,
	custLastUpdate		DATETIME NOT NULL,
	custExtRef	NVARCHAR(255) NULL,
	custMisc1		NVARCHAR(255) NULL,
	CONSTRAINT pk_Custodian PRIMARY KEY (custId) ON ZL_APP_INDEX,
--	CONSTRAINT fk_Custodian FOREIGN KEY (custCaseId) REFERENCES pfuser01.CaseInfo(caseId) ON DELETE CASCADE,
--	CONSTRAINT fk_CustodianZLPUser FOREIGN KEY (custZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE,
 	CONSTRAINT uk_Custodian UNIQUE (custCaseId,custAddress) ON ZL_APP_INDEX
) ON ZL_APP
GO
CREATE INDEX i1_custodian ON pfuser01.Custodian(custZlpUserId) ON ZL_APP_INDEX
GO

CREATE TABLE pfuser01.CustodianAlias (	
	caAlias NVARCHAR(255) NOT NULL,
	caCustId	INT NOT NULL,
	caCaseId		INT NOT NULL,
	caType	INT NOT NULL,
	caDate 	DATETIME NOT NULL,
	CONSTRAINT pk_custAlias PRIMARY KEY (caCustId,caAlias) ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_custAlias FOREIGN KEY (caCaseId) REFERENCES pfuser01.CaseInfo(caseId) ON DELETE CASCADE,
--	CONSTRAINT fk_custAliasCust FOREIGN KEY (caCustId) REFERENCES pfuser01.Custodian(custId) ON DELETE CASCADE,
) ON ZL_APP
GO
CREATE INDEX i1_custAlias ON pfuser01.CustodianAlias(caCaseId) ON ZL_APP_INDEX
GO
	

CREATE SEQUENCE pfuser01.CaseTag_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.CaseTag (	
	tagId		INT NOT NULL,
	tagParentId	INT NOT NULL,
	tagCaseId	INT NOT NULL,
	tagName 	NVARCHAR(255) NOT NULL,
	tagDisplayName NVARCHAR(255) NOT NULL,
	tagFlags BIGINT NOT NULL,
	tagDesc 	NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseTag PRIMARY KEY (tagId) ON ZL_APP_INDEX,
	CONSTRAINT uk_caseTag UNIQUE (tagCaseId,tagName) ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_CaseTag FOREIGN KEY (tagCaseId) REFERENCES pfuser01.CaseInfo(caseId) ON DELETE CASCADE,
) ON ZL_APP
GO
	





CREATE SEQUENCE pfuser01.CustodianLegalHold_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.CustodianLegalHold (
	clhId INT NOT NULL,
	clhTenantId INT NOT NULL,
	clhCaseId	INT NOT NULL,
	clhCustId	INT NOT NULL,
	clhZlpUserId	INT NOT NULL,
	clhDataSrcId	INT NOT NULL,
	clhSrchStoreId INT NOT NULL,
	clhCreateDate	DATETIME NOT NULL,
	clhSrchQueryBeginDate	DATETIME NULL,
	clhSrchQueryEndDate	DATETIME NULL,
	clhFuture	CHAR(1) NOT NULL,
	clhEndDate	DATETIME NULL,
	clhDeleted	CHAR(1) NOT NULL,
	clhNotesVal1 NVARCHAR(255) NULL,
	clhNotesVal2	NVARCHAR(255) NULL,
	clhNotesVal3 NVARCHAR(255) NULL,
	clhNotesVal4	NVARCHAR(255) NULL,
	CONSTRAINT pk_custLegalHold PRIMARY KEY (clhId) ON ZL_APP_INDEX,
	CONSTRAINT uk_custLegalHold UNIQUE (clhCaseId,clhCustId, clhSrchStoreId) ON ZL_APP_INDEX
) ON ZL_APP
GO
CREATE INDEX i1_custLegalHold ON pfuser01.CustodianLegalHold(clhZlpUserId,clhCaseId,clhFuture) ON ZL_APP_INDEX
GO
CREATE INDEX i2_custLegalHold ON pfuser01.CustodianLegalHold(clhCaseId,clhCustId) ON ZL_APP_INDEX
GO



CREATE SEQUENCE pfuser01.CaseTask_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser01.CaseTask (
	taskId	INT NOT NULL,
	taskType	INT NOT NULL,
	taskReferenceId VARCHAR(255) NULL,
	taskData  NVARCHAR(255) NULL,
	taskParentTaskId 	INT NOT NULL,
	taskDomainId INT NOT NULL,
	taskTenantId INT NOT NULL,
	taskSubject NVARCHAR(255) NULL,
    taskCreator VARCHAR(255) NULL,
	taskStatus   INT NOT NULL,
	taskZLPUserId INT NULL,
    taskPriority   INT NOT NULL,
	taskFlags	INT NULL,
	taskCaseId    INT NOT NULL,
    taskCreateDate    DATETIME NOT NULL,
    taskLastUpdate    DATETIME NOT NULL,
   	taskCompleteDate    DATETIME NULL,
	CONSTRAINT pk_CaseTask PRIMARY KEY (taskId) ON ZL_APP_INDEX 
)ON ZL_APP
GO
CREATE INDEX i1_CaseTask ON pfuser01.CaseTask(taskStatus,taskDomainId,taskType,taskCreateDate) ON ZL_APP_INDEX
GO
CREATE INDEX i2_CaseTask ON pfuser01.CaseTask(taskParentTaskId) ON ZL_APP_INDEX
GO
CREATE INDEX i3_CaseTask ON pfuser01.CaseTask(taskType,taskReferenceId) ON ZL_APP_INDEX
GO
CREATE INDEX i4_CaseTask ON pfuser01.CaseTask(taskCaseId,taskStatus,taskCreateDate) ON ZL_APP_INDEX
GO

CREATE TABLE pfuser01.CaseTaskEntity (
	teTaskId	INT NOT NULL,
	teEntityType INT NOT NULL,
	teEntityId INT NOT NULL,
	teEntityStatus	INT NOT NULL,
	CONSTRAINT uk_caseTaskEntity UNIQUE (teTaskId,teEntityType,teEntityId) ON ZL_APP_INDEX
)ON ZL_APP
GO

CREATE SEQUENCE pfuser01.ZlCaseObject_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.ZlCaseObject (
	zlcoId			INT NOT NULL,
	zlcoSeqNumber		INT NOT NULL,
	zlcoNext		CHAR(1) NOT NULL,
	zlcoCaseId		INT NOT NULL,
	zlcoName		NVARCHAR(255) NULL,
	zlcoVal1		NVARCHAR(255) NULL,
	zlcoVal2		NVARCHAR(255) NULL,
	zlcoVal3		NVARCHAR(255) NULL,
	zlcoVal4		NVARCHAR(255) NULL,
	zlcoVal5		NVARCHAR(255) NULL,
   	CONSTRAINT pk_zlcObj PRIMARY KEY (zlcoId,zlcoSeqNumber) ON ZL_APP_INDEX
)ON ZL_APP
GO
CREATE INDEX i1_zlcObj ON pfuser01.ZlCaseObject(zlcoCaseId) ON ZL_APP_INDEX
GO



CREATE SEQUENCE pfuser01.CaseTaskAnnot_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.CaseTaskAnnotation (
	ctaId			INT NOT NULL,
	ctaType			INT NOT NULL,
	ctaTaskId		INT NOT NULL,
	ctaCaseId INT NOT NULL,
	ctaDate			DATETIME NOT NULL,
	ctaZlpUserId		INT NOT NULL,
	ctaSeqNumber		INT NOT NULL,
	ctaNext			CHAR(1) NOT NULL,
	ctaVal1			NVARCHAR(255) NULL,
	ctaVal2			NVARCHAR(255) NULL,
	ctaVal3			NVARCHAR(255) NULL,
	ctaVal4			NVARCHAR(255) NULL,
	ctaVal5			NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseTaskAnnot PRIMARY KEY (ctaId,ctaSeqNumber) ON ZL_APP_INDEX
) ON ZL_APP
GO



CREATE SEQUENCE pfuser01.InvRequest_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.InvestigationRequest (
	irId		INT NOT NULL,
	irName		NVARCHAR(255) NOT NULL,
	irOwnerZlpUserId	INT NOT NULL,
	irDomainId INT NOT NULL,
	irTenantId INT NOT NULL,
	irStatus	INT NOT NULL,
	irPriority INT NOT NULL,
	irReason	NVARCHAR(255) NULL,
	irDateCreate	DATETIME NOT NULL,
	irDateUpdate	DATETIME NOT NULL,
	irVaultItemId	VARCHAR(128) NULL,
	irVaultPwd 	VARBINARY(255) NULL,
	irCaseId INT NULL,
	CONSTRAINT pk_InvReq PRIMARY KEY (irId)  ON ZL_APP_INDEX,
	CONSTRAINT uk_InvReq UNIQUE (irOwnerZlpUserId,irName) ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE INDEX i1_InvReq ON pfuser01.InvestigationRequest(irVaultItemId) ON ZL_APP_INDEX
GO



CREATE SEQUENCE pfuser01.CaseTaskAuditTrail_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO




CREATE TABLE pfuser01.CaseTaskAuditTrail (
	ctaId		INT NOT NULL,
	ctaDate		DATETIME NOT NULL,
	ctaAction		INT NOT NULL,
	ctaZlpUserId	INT NOT NULL,
	ctaUser		NVARCHAR(255) NOT NULL,
	ctaTaskId	INT NOT NULL,
	ctaDomainId	INT NOT NULL,
	ctaTenantId INT NOT NULL,
	ctaCaseId	INT NOT NULL,
	ctaTaskDomainId	INT NOT NULL,
	ctaTaskType	INT NOT NULL,
	ctaRefItemId	VARCHAR(255) NULL,
	ctaTxnId		VARCHAR(64) NOT NULL,
	ctaClearanceLevel	INT NOT NULL,
	ctaSourceIP 	VARCHAR(64) NULL,
	ctaDestIP   	VARCHAR(64) NULL,
	ctaAccessType 	VARCHAR(128) NULL,
	ctaZViteStId 	VARCHAR(255) NULL,
	ctaComments	NVARCHAR(255) NULL,
	ctaVal1 	NVARCHAR(255) NULL,
	ctaVal2 	NVARCHAR(255) NULL,
	ctaVal3 	NVARCHAR(255) NULL,
	ctaVal4 	NVARCHAR(255) NULL,
	ctaVal5 	NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseTaskAudTrail PRIMARY KEY(ctaId) ON ZL_ITEM_INDEX
)
ON ZL_ITEM
GO


CREATE INDEX i1_CaseTaskAudTrail ON pfuser01.CaseTaskAuditTrail(ctaDate) ON ZL_ITEM_INDEX
GO
CREATE INDEX i2_CaseTaskAudTrail ON pfuser01.CaseTaskAuditTrail(ctaDomainId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i3_CaseTaskAudTrail ON pfuser01.CaseTaskAuditTrail(ctaCaseId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i4_CaseTaskAudTrail ON pfuser01.CaseTaskAuditTrail(ctaTaskType,ctaRefItemId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i5_CaseTaskAudTrail ON pfuser01.CaseTaskAuditTrail(ctaZlpUserId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i6_CaseTaskAudTrail ON pfuser01.CaseTaskAuditTrail(ctaTaskId) ON ZL_ITEM_INDEX
GO




CREATE SEQUENCE pfuser01.SurveyForm_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.SurveyForm (
	sfId		INT NOT NULL,
	sfIdVersion		INT NOT NULL,
	sfCaseId	INT NOT NULL,
	sfTenantId 	INT NOT NULL,
	sfZlpUserId	INT NOT NULL,
	sfType 	NVARCHAR(255) NOT NULL,
	sfName		NVARCHAR(255) NOT NULL,
	sfDisplayName	NVARCHAR(255) NOT NULL,
	sfDateCreate	DATETIME NOT NULL,
	sfLastUpdate	DATETIME NOT NULL,
	sfReleaseDate	DATETIME NULL,
	sfFlags	INT NOT NULL,
	sfStatus	INT NOT NULL,
	sfApprovalId	INT NOT NULL,
	sfRemindParam NVARCHAR(255) NULL,
	sfRecur	CHAR(1)  NOT NULL,
	sfRecurParam	NVARCHAR(255) NULL,
	sfRandomize	CHAR(1)  NULL,
	sfDuration		INT  NOT NULL,
	sfCurrentRunId	INT NULL,
	sfAttachVaultId	VARCHAR(128) NULL,
	sfAttachVaultPwd 	VARBINARY(255) NULL,
	sfReleaseAttachVaultId	VARCHAR(128) NULL,
	sfReleaseAttachVaultPwd 	VARBINARY(255) NULL,
	CONSTRAINT pk_surForm PRIMARY KEY(sfId) ON ZL_APP_INDEX,
	CONSTRAINT uk2_surForm UNIQUE(sfCaseId,sfName,sfTenantId) ON ZL_APP_INDEX
) ON ZL_APP
GO
CREATE INDEX i1_surForm ON pfuser01.SurveyForm(sfAttachVaultId)  ON ZL_APP_INDEX
GO
CREATE INDEX i2_surForm ON pfuser01.SurveyForm(sfReleaseAttachVaultId)  ON ZL_APP_INDEX
GO


CREATE SEQUENCE pfuser01.SurveyFormVersion_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser01.SurveyFormVersion (
	sfvId		INT NOT NULL,
	sfvFormId		INT NOT NULL,
	sfvCaseId	INT NOT NULL,
	sfvTenantId 	INT NOT NULL,
	sfvZlpUserId	INT NOT NULL,
	sfvDateCreate	DATETIME NOT NULL,
	sfvLastUpdate	DATETIME NOT NULL,
	sfvFlags	INT NOT NULL,
	sfvStatus	INT NOT NULL,
	sfvApprovalId	INT NOT NULL,
	sfvRandomize	CHAR(1)  NULL,
	sfvDuration		INT  NOT NULL,
	sfvAttachVaultId	VARCHAR(128) NULL,
	sfvAttachVaultPwd 	VARBINARY(255) NULL,
	sfvReleaseAttachVaultId	VARCHAR(128) NULL,
	sfvReleaseAttachVaultPwd 	VARBINARY(255) NULL,
	CONSTRAINT pk_surFormVer PRIMARY KEY(sfvFormId,sfvId) ON ZL_APP_INDEX
) ON ZL_APP
GO
CREATE INDEX i1_surFormVer ON pfuser01.SurveyFormVersion(sfvAttachVaultId)  ON ZL_APP_INDEX
GO
CREATE INDEX i2_surFormVer ON pfuser01.SurveyFormVersion(sfvReleaseAttachVaultId)  ON ZL_APP_INDEX
GO






CREATE TABLE pfuser01.SurveyFormObject (
	 objId		INT NOT NULL,
	 objSfId	INT NOT NULL,
	 objSfVerId	INT NOT NULL,
	 objCaseId	INT NOT NULL,
	objType		INT NOT NULL,
 	objGroupId	INT NOT NULL,
	objQuesNo	INT NOT NULL,
	CONSTRAINT uk_surFormObj UNIQUE(objSfId,objSfVerId,objId) ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE INDEX i1_surFormObj ON pfuser01.SurveyFormObject(objCaseId) ON ZL_APP_INDEX
GO




CREATE TABLE pfuser01.CustodianSurvey (
	csCaseId	INT NOT NULL,
	csSfId		INT NOT NULL,
	csSfVerId		INT NOT NULL,
	csZlpUserId 	INT NOT NULL,
	csApprovalId 	INT NOT NULL,
	csDateCreate 	DATETIME NOT NULL,
	csDateUpdate 	DATETIME NOT NULL,
	csDateExpiry	DATETIME NULL,
	csStartDate 	DATETIME NULL,
	csEndDate	DATETIME NULL,
	csFlags INT NOT NULL,
	csStatus	INT NOT NULL,
	csFeedback	NVARCHAR(255) NULL,
	csAuthMethod	INT NOT NULL,
	csPassword 	NVARCHAR(255) NULL,
	csEscalateStateVal1 NVARCHAR(255) NULL,
	csEscalateStateVal2 NVARCHAR(255) NULL,
	csEscalateStateVal3 NVARCHAR(255) NULL,
	csEscalateStateVal4 NVARCHAR(255) NULL,
	CONSTRAINT pk_custSurvey PRIMARY KEY(csCaseId,csSfId,csSfVerId,csZlpUserId) ON ZL_APP_INDEX
) ON ZL_APP
GO





CREATE TABLE pfuser01.CustodianSurveyAnswers (
	csaCaseId	INT NOT NULL,
	csaSfId		INT NOT NULL,
	csaSfVerId		INT NOT NULL,
	csaZlpUserId 	INT NOT NULL,
	csaRunId		INT NOT NULL,
	csaQuesObjId	INT NOT NULL,
	csaDateCreate 	DATETIME NOT NULL,
	csaDateUpdate 	DATETIME NOT NULL,
	csaAnswer	NVARCHAR(1024)  NULL,
	csaSourceIP 	VARCHAR(64) NULL,
	csaDestIP   	VARCHAR(64) NULL,
	csaComments	NVARCHAR(1024)  NULL,
	CONSTRAINT pk_CustSurAns PRIMARY KEY(csaCaseId,csaSfId,csaSfVerId,csaZlpUserId,csaRunId,csaQuesObjId) ON ZL_APP_INDEX
) ON ZL_APP
GO


CREATE TABLE pfuser01.CustodianSurveyAction (
	csaCaseId	INT NOT NULL,
	csaSfId		INT NOT NULL,
	csaSfVerId		INT NOT NULL,
	csaZlpUserId INT NULL,
	csaRunId		INT NOT NULL,
	csaAction		INT NOT NULL,
	csaDate	 	DATETIME NOT NULL,
	csaComments	NVARCHAR(255)  NULL
) ON ZL_APP
GO
CREATE INDEX i1_CustSurAct ON pfuser01.CustodianSurveyAction(csaCaseId, csaSfId,csaSfVerId,csaRunId)  ON ZL_APP_INDEX
GO

CREATE TABLE pfuser01.CaseRedaction (
	craCaseId INT NOT NULL,	
	craCaseItemId INT NOT NULL,
	craCreateDate DATETIME NOT NULL,
	craLastUpdate DATETIME NOT NULL,
	craCreatorZlpUserId INT NOT NULL,
	craLastUpdateZlpUserId INT NOT NULL,
	craVaultItemId	VARCHAR(128) NULL,
	craVaultPwd 	VARBINARY(255) NULL,
	CONSTRAINT pk_CaseRedact PRIMARY KEY(craCaseId,craCaseItemId) ON ZL_CASEITEM_INDEX
) ON ZL_CASEITEM
GO

CREATE INDEX i1_CaseRedact ON pfuser01.CaseRedaction(craVaultItemId) ON ZL_CASEITEM_INDEX
GO



-- OPTIONAL
CREATE SEQUENCE pfuser01.CaseSchema_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.CaseSchema (
	-- IDENTITY
	csSchemaId BIGINT NOT NULL,
	csTenantId INT NOT NULL,
	csCaseId 	INT NOT NULL,
	csSchemaName			NVARCHAR(255) NOT NULL,
	csSchemaDispName			NVARCHAR(255) NOT NULL,
	CONSTRAINT pk_caseSchema PRIMARY KEY(csSchemaId) ON ZL_APP_INDEX,
	CONSTRAINT uk_caseSchema UNIQUE(csTenantId,csSchemaName) ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE TABLE pfuser01.CaseSchemaFields (
	csfSchemaId	INT NOT NULL,
	csfName			VARCHAR(128) NOT NULL,
	csfSeq	INT NOT NULL,
	csfDesc		NVARCHAR(255) NULL,
	csfType			VARCHAR(128) NOT NULL,
	csfInputType	VARCHAR(128) NOT NULL,
	csfInputParamVal1		NVARCHAR(255) NULL,
	csfInputParamVal2		NVARCHAR(255) NULL,
	csfInputParamVal3		NVARCHAR(255) NULL,
	csfFormula	NVARCHAR(255) NULL,
	csfMandatory	CHAR(1) NOT NULL,
	CONSTRAINT pk_caseSchFld PRIMARY KEY(csfSchemaId,csfName) ON ZL_APP_INDEX
) ON ZL_APP
GO


CREATE SEQUENCE pfuser01.CaseUserData_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.CaseUserData (
	cudId			BIGINT  NOT NULL,
	cudCaseId		INT NOT NULL,
	cudCaseItemId	INT  NOT NULL,
	cudSeqNumber	INT NOT NULL,
	cudNext			CHAR(1) NOT NULL,
	cudVal1			NVARCHAR(255) NULL,
	cudVal2			NVARCHAR(255) NULL,
	cudVal3			NVARCHAR(255) NULL,
	cudVal4			NVARCHAR(255) NULL,
	cudVal5			NVARCHAR(255) NULL,
	cudVal6			NVARCHAR(255) NULL,
	cudVal7			NVARCHAR(255) NULL,
	cudVal8			NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseUserData PRIMARY KEY (cudId,cudSeqNumber) ON ZL_CASEITEM_INDEX
) ON ZL_CASEITEM
GO

-- OPTIONAL
CREATE SEQUENCE pfuser01.ReviewPhase_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.ReviewPhase (
	-- IDENTITY
        rpId BIGINT NOT NULL,
        rpIdSeq INT NOT NULL,
        rpCaseId INT NOT NULL,
        rpName	NVARCHAR(255) NOT NULL,
        rpDesc	NVARCHAR(255) NULL,
 		rpFlags INT NOT NULL,
        rpCreateDate DATETIME NOT NULL,
	CONSTRAINT pk_RevPh PRIMARY KEY (rpId) ON ZL_APP_INDEX,
	CONSTRAINT uk_RevPh UNIQUE (rpCaseId,rpName) ON ZL_APP_INDEX,
	CONSTRAINT uk2_RevPh UNIQUE (rpCaseId,rpIdSeq) ON ZL_APP_INDEX
) ON ZL_APP
GO
-- Storage (initial 5M NEXT 5M MINEXTENTS 1 MAXEXTENTS 20 PCTINCREASE 33) PCTFREE 5


-- OPTIONAL
CREATE SEQUENCE pfuser01.ReviewBucket_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.ReviewBucket (
	-- IDENTITY
        rbId BIGINT NOT NULL,
        rbPhaseId INT NOT NULL,
        rbCaseId INT NOT NULL,
        rbState	INT NOT NULL,
        rbName	NVARCHAR(255) NOT NULL,
        rbDesc	NVARCHAR(255) NULL,
        rbFlags BIGINT NOT NULL,
        rbCreateDate DATETIME NOT NULL,
        rbUpdateDate DATETIME NOT NULL,
	CONSTRAINT pk_RevBucket PRIMARY KEY (rbId) ON ZL_APP_INDEX,
	CONSTRAINT uk_RevBucket UNIQUE (rbCaseId,rbName) ON ZL_APP_INDEX
) ON ZL_APP
GO
-- Storage (initial 5M NEXT 5M MINEXTENTS 1 MAXEXTENTS 20 PCTINCREASE 33) 


CREATE TABLE pfuser01.ReviewBucketItem (
	rbiCaseId INT NOT NULL,	
	rbiCaseItemId	INT NOT NULL,
	rbiBucketId	INT NOT NULL,
	rbiRunId INT NOT NULL,
	rbiAddDate DATETIME NOT NULL,
	rbiActionUpdate DATETIME NOT NULL,
	rbiState	INT NOT NULL,
	rbiZlpUserId INT NOT NULL,
	rbiActionFlags	BIGINT NOT NULL,
	rbiTagAction VARCHAR(255) NULL,
	rbiAutomatedAction VARCHAR(255) NULL,
	rbiMoved CHAR(1) NOT NULL,
	rbiNextPhase INT NULL,
	CONSTRAINT pk_ZRevBucItem PRIMARY KEY(rbiCaseId,rbiCaseItemId,rbiBucketId) ON ZL_CASEITEM_INDEX
)
ON ZL_CASEITEM
GO

CREATE INDEX i1_ZRevBucItem ON pfuser01.ReviewBucketItem(rbiBucketId,rbiMoved,rbiState) ON ZL_CASEITEM_INDEX
GO
CREATE INDEX i2_ZRevBucItem ON pfuser01.ReviewBucketItem(rbiCaseId,rbiMoved) ON ZL_CASEITEM_INDEX
GO


CREATE SEQUENCE pfuser01.RevBucImpRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.ReviewBucketImportRun (
	runId		INT NOT NULL,
	runBucketId 	INT NOT NULL,
	runPhaseId 	INT NOT NULL,
	runCaseId INT NOT NULL,
    runParamVal1		      NVARCHAR(255) NULL,
  	runParamVal2		      NVARCHAR(255) NULL,
   	runParamVal3		      NVARCHAR(255) NULL,
   	runParamVal4		      NVARCHAR(255) NULL,
   	runParamVal5		      NVARCHAR(255) NULL,
   	runParamVal6		      NVARCHAR(255) NULL,
	runParamVaultId		VARCHAR(128) NULL,
	runParamVaultPwd 	VARBINARY(255) NULL,
	runMachine		NVARCHAR(255) NULL,
	runDateStart	DATETIME NULL,
	runDateUpdate	DATETIME NULL,
	runDateEnd	DATETIME NULL,
	runItemFound 	INT NULL,
	runItemImported	INT NULL,
	runItemDuplicate INT NULL,
	runItemErrors	INT NULL,
	runStatusMsg	NVARCHAR(255) NULL,
	CONSTRAINT pk_RevBucImpRun PRIMARY KEY (runId)  ON ZL_APP_INDEX
) ON ZL_APP
GO
CREATE INDEX i1_RevBucImpRun ON pfuser01.ReviewBucketImportRun(runBucketId)  ON ZL_APP_INDEX
GO
CREATE INDEX i2_RevBucImpRun ON pfuser01.ReviewBucketImportRun(runCaseId,runPhaseId)  ON ZL_APP_INDEX
GO




CREATE TABLE pfuser01.CaseReviewer (
	revZlpUserid		INT NOT NULL,
	revCaseId	INT NOT NULL,
	revTenantId INT NOT NULL,
	revDate		DATETIME NOT NULL,
	revBucketIds	VARCHAR(255) NULL,
	CONSTRAINT pk_CaseReviewer PRIMARY KEY (revCaseId,revZlpUserId) ON ZL_APP_INDEX
) ON ZL_APP
GO



CREATE TABLE pfuser01.ConceptWordList (
	cwlCaseId		INT NOT NULL,
	cwlListId	INT NOT NULL,
	cwlScope	INT NOT NULL,
	cwlFlags		INT NOT NULL,
	cwlDesc		NVARCHAR(255),
	cwlTenantId INT NOT NULL,
	CONSTRAINT pk_ConceptWordList PRIMARY KEY (cwlCaseId,cwlListId) ON ZL_APP_INDEX
) ON ZL_APP
GO


-- Collections


CREATE SEQUENCE pfuser01.CustCollect_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.CustodianCollection (
		ccId	INT NOT NULL,
        ccZlpUserId INT NOT NULL,
        ccCustodianId INT NOT NULL,
        ccCaseId INT NOT NULL,
        ccSrcName NVARCHAR(255),
        ccSrcType VARCHAR(64),
        ccSrcDesc	NVARCHAR(255),
        ccProjectId	INT NOT NULL,
        ccPolicyId INT NOT NULL,
        ccCreateDate DATETIME NOT NULL,
        ccLastUpdate DATETIME NOT NULL,
        ccVal1			NVARCHAR(255) NULL,
		ccVal2			NVARCHAR(255) NULL,
		ccVal3			NVARCHAR(255) NULL,
		ccVal4			NVARCHAR(255) NULL,
		ccVal5			NVARCHAR(255) NULL,
		ccVal6			NVARCHAR(255) NULL,
		ccVal7			NVARCHAR(255) NULL,
		ccVal8			NVARCHAR(255) NULL,
	CONSTRAINT pk_CustColl PRIMARY KEY (ccId) ON ZL_APP_INDEX,
	CONSTRAINT uk_CustColl UNIQUE (ccZlpUserId,ccCaseId,ccSrcName) ON ZL_APP_INDEX,
	CONSTRAINT uk2_CustColl UNIQUE (ccProjectId) ON ZL_APP_INDEX
) ON ZL_APP
GO
-- Storage (initial 5M NEXT 5M MINEXTENTS 1 MAXEXTENTS 20 PCTINCREASE 33) PCTFREE 5

CREATE INDEX i1_CustColl ON pfuser01.CustodianCollection(ccCaseId,ccCustodianId)  ON ZL_APP_INDEX
GO




CREATE TABLE pfuser01.CustCollPackage (
	ccpCollId			INT NOT NULL,
	ccpCaseId			INT NOT NULL,
	ccpVaultId 			VARCHAR(128) NOT NULL,
	ccpEncPwd 	        VARBINARY(128) NULL,
	ccpFiles			INT NOT NULL,
	ccpFlags			INT NOT NULL,
	ccpDateCreate		DATETIME NOT NULL,
	ccpLastWrite		DATETIME NOT NULL,
	ccpDeleted		CHAR(1) NOT NULL,
	CONSTRAINT pk_CustCollPkg PRIMARY KEY (ccpVaultId) ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE INDEX i1_CustCollPkg ON pfuser01.CustCollPackage(ccpCollId)  ON ZL_APP_INDEX
GO


CREATE TABLE pfuser01.CcPackageAttach (
	attCollId			INT NOT NULL,
	attCaseId			INT NOT NULL,
	attPackageVaultId 			VARCHAR(128) NOT NULL,
	attVaultId			VARCHAR(128) NOT NULL,
	attEncPwd 	        VARBINARY(128) NULL,
	attDateCreate		DATETIME NOT NULL,
	CONSTRAINT pk_ccpAtt PRIMARY KEY (attVaultId) ON ZL_APP_INDEX 
) ON ZL_APP
GO

CREATE INDEX i1_ccpAtt ON pfuser01.CcPackageAttach(attCollId,attPackageVaultId)  ON ZL_APP_INDEX
GO

CREATE SEQUENCE pfuser01.CustCollectionRun_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.CustodianCollectionRun (
	ccrId			BIGINT NOT NULL,
	ccrCollId		INT NOT NULL,
	ccrCaseId		INT NOT NULL,
	ccrCustodianId	INT NOT NULL,
    ccrStartDate	DATETIME NOT NULL,
	ccrEndDate	DATETIME NULL,
    ccrUpdate	DATETIME NOT NULL,
    ccrFullCrawl	CHAR(1) NOT NULL,
    ccrExamined 	INT NULL,
    ccrFound 	INT NULL,
    ccrPrevFound INT NULL,
	ccrError        INT NULL,
	ccrPolicyIgnored	INT NULL,
	ccrDirError	INT NULL,
	ccrCrawlState 	NVARCHAR(255) NULL,
    ccrArchived	INT NULL,
    ccrPrevArchived INT NULL,
    ccrArchiveError	INT NULL,
	ccrStatusMessage	NVARCHAR(255) NULL,
	ccrLogVaultId	VARCHAR(128) NULL,
	ccrLogVaultPwd 	VARBINARY(255) NULL,
	CONSTRAINT pk_CustCollRuns PRIMARY KEY (ccrCollId,ccrId) ON ZL_TRANSIENT_INDEX
) ON ZL_TRANSIENT
GO
CREATE INDEX i1_custCollRuns ON pfuser01.CustodianCollectionRun(ccrStartDate) ON ZL_TRANSIENT_INDEX
GO
CREATE INDEX i2_custCollRuns ON pfuser01.CustodianCollectionRun(ccrCaseId,ccrCustodianId) ON ZL_TRANSIENT_INDEX
GO




CREATE TABLE pfuser01.GlobalCustodian (
	gcustZlpUserId	INT NOT NULL,
	gcustTenantId INT NOT NULL,
	gcustAddress 	NVARCHAR(255) NOT NULL,
	gcustFullName		NVARCHAR(255) NOT NULL,
	gcustCreateDate		DATETIME NOT NULL,
	gcustLastUpdate		DATETIME NOT NULL,
	gcustMisc1		NVARCHAR(255) NULL,
	CONSTRAINT pk_gcust PRIMARY KEY (gcustZlpUserId) ON ZL_APP_INDEX
--	CONSTRAINT fk_gcustZLPUser FOREIGN KEY (gcustZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE,
) ON ZL_APP
GO


CREATE TABLE pfuser01.GlobalCustodianAlias (	
	gcaAlias NVARCHAR(255) NOT NULL,
	gcaZlpUserId	INT NOT NULL,
	gcaTenantId	INT NOT NULL,
	gcaType	INT NOT NULL,
	gcaDate 	DATETIME NOT NULL,
	CONSTRAINT pk_gcustAlias PRIMARY KEY (gcaZlpUserId,gcaAlias) ON ZL_APP_INDEX
) ON ZL_APP
GO
CREATE INDEX i1_gcustAlias ON pfuser01.GlobalCustodianAlias(gcaTenantId) ON ZL_APP_INDEX
GO



CREATE TABLE pfuser01.CaseExport (
	ceExportTaskId	INT NOT NULL,
	ceCaseId	INT NOT NULL,
	ceStatus	INT NOT NULL,
	ceDate		DATETIME NOT NULL,
	ceTagType   INT NOT NULL,
    ceTagIds    VARCHAR(255) NULL,
	ceUpdate	DATETIME NOT NULL,
	CONSTRAINT pk_caseExport PRIMARY KEY (ceExportTaskId) ON ZL_APP_INDEX
) ON ZL_TRANSIENT
GO

CREATE INDEX i1_caseExport ON pfuser01.CaseExport(ceCaseId) ON ZL_APP_INDEX
GO


CREATE SEQUENCE pfuser01.CaseSearch_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.CaseSearch (
	csId		INT NOT NULL,
	csName		NVARCHAR(255) NOT NULL,
	csDisplayName   NVARCHAR(255) NOT NULL,
	csPurpose 	VARCHAR(32) NOT NULL,
	csType		VARCHAR(255) NOT NULL,
	csReservedQuery CHAR(1) NOT NULL,
	csCaseId 	INT NOT NULL,
	csTenantId	INT NOT NULL,
	csDesc		NVARCHAR(255) NULL,
	csDate 	DATETIME NOT NULL,
	csQueryVal1 NVARCHAR(255) NULL,
	csQueryVal2 NVARCHAR(255) NULL,
	csQueryVal3 NVARCHAR(255) NULL,
	csQueryVal4 NVARCHAR(255) NULL,
	csQueryVal5 NVARCHAR(255) NULL,
	csQueryVal6 NVARCHAR(255) NULL,
	csQueryVal7 NVARCHAR(255) NULL,
	csQueryVal8 NVARCHAR(255) NULL,
	csQueryVal9 NVARCHAR(255) NULL,
	csQueryVal10 NVARCHAR(255) NULL,
	csJSONVal1 NVARCHAR(255) NULL,
	csJSONVal2 NVARCHAR(255) NULL,
	csJSONVal3 NVARCHAR(255) NULL,
	csJSONVal4 NVARCHAR(255) NULL,
	csJSONVal5 NVARCHAR(255) NULL,
	csJSONVal6 NVARCHAR(255) NULL,
	csJSONVal7 NVARCHAR(255) NULL,
	csJSONVal8 NVARCHAR(255) NULL,
	csJSONVal9 NVARCHAR(255) NULL,
	csJSONVal10 NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseSearch PRIMARY KEY (csId)  ON ZL_APP_INDEX,
	CONSTRAINT uk_CaseSearch UNIQUE (csTenantId,csCaseId,csPurpose,csName)  ON ZL_APP_INDEX
) ON ZL_APP
GO




CREATE TABLE pfuser01.FedDocumentTransport (
	fdtRefId VARCHAR(64) NOT NULL,
	fdtRefType INT NOT NULL,
	fdtStoreId	INT NOT NULL,
	fdtDateCreate	DATETIME NOT NULL,
	fdtSize BIGINT NOT NULL,
	fdtMachine NVARCHAR(64) NULL,
	fdtState INT NOT NULL,
	fdtUpdate	DATETIME NOT NULL,
	fdtDateProcessed	DATETIME NULL,
	fdtRetry	INT NOT NULL,
	fdtRmId VARCHAR(255) NULL,
	fdtComment NVARCHAR(255) NULL,
	CONSTRAINT pk_FedDocTrans PRIMARY KEY (fdtStoreId,fdtRefType,fdtRefId) ON ZL_APP_INDEX 
) ON ZL_APP
GO

CREATE INDEX i1_FedDocTrans ON pfuser01.FedDocumentTransport(fdtStoreId,fdtState,fdtRetry) ON ZL_APP_INDEX
GO
CREATE INDEX i3_FedDocTrans ON pfuser01.FedDocumentTransport(fdtState,fdtRetry) ON ZL_APP_INDEX
GO


CREATE TABLE pfuser01.CaseInPlaceItem (
	itemCaseId	INT NOT NULL,
	itemUnid	VARCHAR(255) NOT NULL,
	itemRefId   VARCHAR(255) NULL,
	itemRefType INT NOT NULL,
	itemStoreId	INT NOT NULL,
	itemState	INT NOT NULL,
	itemDateCreate DATETIME NOT NULL,
	itemUpdate	DATETIME NOT NULL,
	itemDateProcessed	DATETIME NULL,
	itemApesArchiveRetry	INT  NULL,
	itemRmId VARCHAR(255) NULL,
	CONSTRAINT pk_CaseIPItem PRIMARY KEY (itemCaseId,itemRefType,itemStoreId,itemUnid) ON ZL_APP_INDEX
)ON ZL_APP
GO
	
CREATE INDEX i1_CaseIPItem ON pfuser01.CaseInPlaceItem(itemCaseId,itemUpdate) ON ZL_APP_INDEX
GO
CREATE INDEX i2_CaseIPItem ON pfuser01.CaseInPlaceItem(itemStoreId,itemUnid) ON ZL_APP_INDEX
GO

