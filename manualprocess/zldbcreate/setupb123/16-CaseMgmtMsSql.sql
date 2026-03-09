



-- *************************************************************************************
--	Case 
-- *************************************************************************************


CREATE SEQUENCE pfuser.Case_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.CaseInfo (
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
	CONSTRAINT pk_CaseInfo PRIMARY KEY(caseId),
--	CONSTRAINT fk_CaseInfoJDomain FOREIGN KEY (caseJournalDomainId) REFERENCES pfuser.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseInfoZLPUser FOREIGN KEY (caseOwnerZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
	CONSTRAINT uk2_CaseInfo UNIQUE (caseTenantId,caseName)
)
GO
CREATE INDEX i1_CaseInfo ON pfuser.CaseInfo(caseJournalDomainId)
GO




CREATE TABLE pfuser.CasePrivileges (
	cpCaseId INT NOT NULL,
        cpPrivilegeFlags INT NOT NULL,
        cpEntityId INT NOT NULL,
	cpEntityType INT NOT NULL,
--	CONSTRAINT fk_CasePriv FOREIGN KEY (cpCaseId) REFERENCES pfuser.CaseInfo(caseId) ON DELETE CASCADE,
	CONSTRAINT uk_CasePriv UNIQUE (cpCaseId,cpEntityId,cpEntityType)
)
GO

CREATE INDEX i1_CasePriv ON pfuser.CasePrivileges(cpCaseId)
GO
CREATE INDEX i2_CasePriv  ON pfuser.CasePrivileges(cpEntityId,cpEntityType)
GO


CREATE TABLE pfuser.CaseUserPreference (
	cupZlpUserId 		INT NOT NULL,
	cupFlags			INT NOT NULL,
	cupVal1		NVARCHAR(255) NULL,
	cupVal2		NVARCHAR(255) NULL,
	cupVal3		NVARCHAR(255) NULL,
	cupVal4		NVARCHAR(255) NULL,	
	CONSTRAINT pk_CaseUser PRIMARY KEY (cupZlpUserId)
--,
--	CONSTRAINT fk_CaseUser FOREIGN KEY (cupZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO


CREATE TABLE pfuser.CaseUserSubscription (
	cusAcctNo 		INT NOT NULL,
	cusCaseId		INT NOT NULL,
	cusDate			DATETIME NOT NULL,
	CONSTRAINT pk_CaseUsSub PRIMARY KEY (cusAcctNo,cusCaseId)
--,
--	CONSTRAINT fk_CaseUserSub FOREIGN KEY (cupCaseId) REFERENCES pfuser.CaseInfo(caseId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_CaseUserAcct FOREIGN KEY (cupAcctNo) REFERENCES pfuser.ZipAccount(zaAcctNo) ON DELETE CASCADE
)
GO



-- OPTIONAL
CREATE SEQUENCE pfuser.CaseDataSource_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.CaseDataSource (
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
	CONSTRAINT pk_CaseDataSource PRIMARY KEY (srcId),
	CONSTRAINT uk_CaseDataSource UNIQUE (srcCaseId,srcName)
)
GO
CREATE INDEX i1_CaseDataSource ON pfuser.CaseDataSource(srcVaultItemId)
GO


CREATE SEQUENCE pfuser.CaseDataSourceRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.CaseDataSourceRuns (
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
	CONSTRAINT pk_CaseDataSrcRuns PRIMARY KEY (runId)
)
GO
CREATE INDEX i1_CaseDataSrcRuns ON pfuser.CaseDataSourceRuns(runCaseId,runSrcId)
GO


CREATE TABLE pfuser.CaseDataSourceScheduledRuns (
	schedSrcId	INT NOT NULL,
	schedIntervalSec INT NOT NULL,
	schedDateStart	DATETIME NOT NULL,
	schedDateExpiry DATETIME NULL,
	schedIterations	INT NULL,
	CONSTRAINT pk_CaseDataSourceScheduledRuns PRIMARY KEY (schedSrcId)
)
GO









CREATE TABLE pfuser.CaseItem (
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
	CONSTRAINT pk_CaseItem PRIMARY KEY(caseItemCaseId,caseItemId),
	CONSTRAINT uk_CaseItem UNIQUE (caseItemCaseId,caseItemRefItemId)
--,
--	CONSTRAINT fk_CaseItem FOREIGN KEY (caseItemCaseId) REFERENCES pfuser.CaseInfo(caseId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseItemSrc FOREIGN KEY (caseItemSrcId) REFERENCES pfuser.CaseDataSource(srcId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseItemRun FOREIGN KEY (caseItemRunId) REFERENCES pfuser.CaseDataSourceRuns(runId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseItemFldr FOREIGN KEY (caseItemFldrId) REFERENCES pfuser.CaseFolder(caseFldrId) ON DELETE CASCADE
)
GO
-- STORAGE (INITIAL 125M NEXT 250M MINEXTENTS 1 MAXEXTENTS 30 PCTINCREASE 0)
CREATE INDEX i1_CaseItem ON pfuser.CaseItem(caseItemRefItemId)
GO
CREATE INDEX i2_CaseItem ON pfuser.CaseItem(caseItemCaseId,caseItemLastUpdate)
GO



CREATE TABLE pfuser.CaseItemProperty (
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
	CONSTRAINT pk_CaseItemProp PRIMARY KEY (cipCaseId,cipCaseItemId,cipType)
)
GO



CREATE TABLE pfuser.CaseAuditTrail (
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
GO

CREATE INDEX i1_CaseAudit ON pfuser.CaseAuditTrail(caDate)
GO
CREATE INDEX i2_CaseAudit ON pfuser.CaseAuditTrail(caDomainId)
GO
CREATE INDEX i3_CaseAudit ON pfuser.CaseAuditTrail(caItemId)
GO
CREATE INDEX i4_CaseAudit ON pfuser.CaseAuditTrail(caRefItemId)
GO
CREATE INDEX i5_CaseAudit ON pfuser.CaseAuditTrail(caZlpUserId)
GO







CREATE SEQUENCE pfuser.Custodian_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.Custodian (
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
	CONSTRAINT pk_Custodian PRIMARY KEY (custId),
--	CONSTRAINT fk_Custodian FOREIGN KEY (custCaseId) REFERENCES pfuser.CaseInfo(caseId) ON DELETE CASCADE,
--	CONSTRAINT fk_CustodianZLPUser FOREIGN KEY (custZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
 	CONSTRAINT uk_Custodian UNIQUE (custCaseId,custAddress)
)
GO
CREATE INDEX i1_custodian ON pfuser.Custodian(custZlpUserId)
GO

CREATE TABLE pfuser.CustodianAlias (	
	caAlias NVARCHAR(255) NOT NULL,
	caCustId	INT NOT NULL,
	caCaseId		INT NOT NULL,
	caType	INT NOT NULL,
	caDate 	DATETIME NOT NULL,
	CONSTRAINT pk_custAlias PRIMARY KEY (caCustId,caAlias)
--,
--	CONSTRAINT fk_custAlias FOREIGN KEY (caCaseId) REFERENCES pfuser.CaseInfo(caseId) ON DELETE CASCADE,
--	CONSTRAINT fk_custAliasCust FOREIGN KEY (caCustId) REFERENCES pfuser.Custodian(custId) ON DELETE CASCADE,
)
GO
CREATE INDEX i1_custAlias ON pfuser.CustodianAlias(caCaseId)
GO
	

CREATE SEQUENCE pfuser.CaseTag_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.CaseTag (	
	tagId		INT NOT NULL,
	tagParentId	INT NOT NULL,
	tagCaseId	INT NOT NULL,
	tagName 	NVARCHAR(255) NOT NULL,
	tagDisplayName NVARCHAR(255) NOT NULL,
	tagFlags BIGINT NOT NULL,
	tagDesc 	NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseTag PRIMARY KEY (tagId),
	CONSTRAINT uk_caseTag UNIQUE (tagCaseId,tagName)
--,
--	CONSTRAINT fk_CaseTag FOREIGN KEY (tagCaseId) REFERENCES pfuser.CaseInfo(caseId) ON DELETE CASCADE,
)
GO
	





CREATE SEQUENCE pfuser.CustodianLegalHold_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.CustodianLegalHold (
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
	CONSTRAINT pk_custLegalHold PRIMARY KEY (clhId),
	CONSTRAINT uk_custLegalHold UNIQUE (clhCaseId,clhCustId, clhSrchStoreId)
)
GO
CREATE INDEX i1_custLegalHold ON pfuser.CustodianLegalHold(clhZlpUserId,clhCaseId,clhFuture)
GO
CREATE INDEX i2_custLegalHold ON pfuser.CustodianLegalHold(clhCaseId,clhCustId)
GO



CREATE SEQUENCE pfuser.CaseTask_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.CaseTask (
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
	CONSTRAINT pk_CaseTask PRIMARY KEY (taskId)
)
GO
CREATE INDEX i1_CaseTask ON pfuser.CaseTask(taskStatus,taskDomainId,taskType,taskCreateDate)
GO
CREATE INDEX i2_CaseTask ON pfuser.CaseTask(taskParentTaskId)
GO
CREATE INDEX i3_CaseTask ON pfuser.CaseTask(taskType,taskReferenceId)
GO
CREATE INDEX i4_CaseTask ON pfuser.CaseTask(taskCaseId,taskStatus,taskCreateDate)
GO

CREATE TABLE pfuser.CaseTaskEntity (
	teTaskId	INT NOT NULL,
	teEntityType INT NOT NULL,
	teEntityId INT NOT NULL,
	teEntityStatus	INT NOT NULL,
	CONSTRAINT uk_caseTaskEntity UNIQUE (teTaskId,teEntityType,teEntityId)
)
GO

CREATE SEQUENCE pfuser.ZlCaseObject_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.ZlCaseObject (
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
   	CONSTRAINT pk_zlcObj PRIMARY KEY (zlcoId,zlcoSeqNumber)
)
GO
CREATE INDEX i1_zlcObj ON pfuser.ZlCaseObject(zlcoCaseId)
GO



CREATE SEQUENCE pfuser.CaseTaskAnnot_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.CaseTaskAnnotation (
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
	CONSTRAINT pk_CaseTaskAnnot PRIMARY KEY (ctaId,ctaSeqNumber)
)
GO



CREATE SEQUENCE pfuser.InvRequest_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.InvestigationRequest (
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
	CONSTRAINT pk_InvReq PRIMARY KEY (irId),
	CONSTRAINT uk_InvReq UNIQUE (irOwnerZlpUserId,irName)
)
GO

CREATE INDEX i1_InvReq ON pfuser.InvestigationRequest(irVaultItemId)
GO



CREATE SEQUENCE pfuser.CaseTaskAuditTrail_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO




CREATE TABLE pfuser.CaseTaskAuditTrail (
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
	CONSTRAINT pk_CaseTaskAudTrail PRIMARY KEY(ctaId)
)
GO


CREATE INDEX i1_CaseTaskAudTrail ON pfuser.CaseTaskAuditTrail(ctaDate)
GO
CREATE INDEX i2_CaseTaskAudTrail ON pfuser.CaseTaskAuditTrail(ctaDomainId)
GO
CREATE INDEX i3_CaseTaskAudTrail ON pfuser.CaseTaskAuditTrail(ctaCaseId)
GO
CREATE INDEX i4_CaseTaskAudTrail ON pfuser.CaseTaskAuditTrail(ctaTaskType,ctaRefItemId)
GO
CREATE INDEX i5_CaseTaskAudTrail ON pfuser.CaseTaskAuditTrail(ctaZlpUserId)
GO
CREATE INDEX i6_CaseTaskAudTrail ON pfuser.CaseTaskAuditTrail(ctaTaskId)
GO




CREATE SEQUENCE pfuser.SurveyForm_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.SurveyForm (
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
	CONSTRAINT pk_surForm PRIMARY KEY(sfId),
	CONSTRAINT uk2_surForm UNIQUE(sfCaseId,sfName,sfTenantId)
)
GO
CREATE INDEX i1_surForm ON pfuser.SurveyForm(sfAttachVaultId)
GO
CREATE INDEX i2_surForm ON pfuser.SurveyForm(sfReleaseAttachVaultId)
GO


CREATE SEQUENCE pfuser.SurveyFormVersion_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser.SurveyFormVersion (
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
	CONSTRAINT pk_surFormVer PRIMARY KEY(sfvFormId,sfvId)
)
GO
CREATE INDEX i1_surFormVer ON pfuser.SurveyFormVersion(sfvAttachVaultId)
GO
CREATE INDEX i2_surFormVer ON pfuser.SurveyFormVersion(sfvReleaseAttachVaultId)
GO






CREATE TABLE pfuser.SurveyFormObject (
	 objId		INT NOT NULL,
	 objSfId	INT NOT NULL,
	 objSfVerId	INT NOT NULL,
	 objCaseId	INT NOT NULL,
	objType		INT NOT NULL,
 	objGroupId	INT NOT NULL,
	objQuesNo	INT NOT NULL,
	CONSTRAINT uk_surFormObj UNIQUE(objSfId,objSfVerId,objId)
)
GO

CREATE INDEX i1_surFormObj ON pfuser.SurveyFormObject(objCaseId)
GO




CREATE TABLE pfuser.CustodianSurvey (
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
	CONSTRAINT pk_custSurvey PRIMARY KEY(csCaseId,csSfId,csSfVerId,csZlpUserId)
)
GO





CREATE TABLE pfuser.CustodianSurveyAnswers (
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
	CONSTRAINT pk_CustSurAns PRIMARY KEY(csaCaseId,csaSfId,csaSfVerId,csaZlpUserId,csaRunId,csaQuesObjId)
)
GO


CREATE TABLE pfuser.CustodianSurveyAction (
	csaCaseId	INT NOT NULL,
	csaSfId		INT NOT NULL,
	csaSfVerId		INT NOT NULL,
	csaZlpUserId INT NULL,
	csaRunId		INT NOT NULL,
	csaAction		INT NOT NULL,
	csaDate	 	DATETIME NOT NULL,
	csaComments	NVARCHAR(255)  NULL
)
GO
CREATE INDEX i1_CustSurAct ON pfuser.CustodianSurveyAction(csaCaseId, csaSfId,csaSfVerId,csaRunId)
GO

CREATE TABLE pfuser.CaseRedaction (
	craCaseId INT NOT NULL,	
	craCaseItemId INT NOT NULL,
	craCreateDate DATETIME NOT NULL,
	craLastUpdate DATETIME NOT NULL,
	craCreatorZlpUserId INT NOT NULL,
	craLastUpdateZlpUserId INT NOT NULL,
	craVaultItemId	VARCHAR(128) NULL,
	craVaultPwd 	VARBINARY(255) NULL,
	CONSTRAINT pk_CaseRedact PRIMARY KEY(craCaseId,craCaseItemId)
)
GO

CREATE INDEX i1_CaseRedact ON pfuser.CaseRedaction(craVaultItemId)
GO



-- OPTIONAL
CREATE SEQUENCE pfuser.CaseSchema_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.CaseSchema (
	-- IDENTITY
	csSchemaId BIGINT NOT NULL,
	csTenantId INT NOT NULL,
	csCaseId 	INT NOT NULL,
	csSchemaName			NVARCHAR(255) NOT NULL,
	csSchemaDispName			NVARCHAR(255) NOT NULL,
	CONSTRAINT pk_caseSchema PRIMARY KEY(csSchemaId),
	CONSTRAINT uk_caseSchema UNIQUE(csTenantId,csSchemaName)
)
GO

CREATE TABLE pfuser.CaseSchemaFields (
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
	CONSTRAINT pk_caseSchFld PRIMARY KEY(csfSchemaId,csfName)
)
GO


CREATE SEQUENCE pfuser.CaseUserData_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.CaseUserData (
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
	CONSTRAINT pk_CaseUserData PRIMARY KEY (cudId,cudSeqNumber)
)
GO

-- OPTIONAL
CREATE SEQUENCE pfuser.ReviewPhase_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.ReviewPhase (
	-- IDENTITY
        rpId BIGINT NOT NULL,
        rpIdSeq INT NOT NULL,
        rpCaseId INT NOT NULL,
        rpName	NVARCHAR(255) NOT NULL,
        rpDesc	NVARCHAR(255) NULL,
 		rpFlags INT NOT NULL,
        rpCreateDate DATETIME NOT NULL,
	CONSTRAINT pk_RevPh PRIMARY KEY (rpId),
	CONSTRAINT uk_RevPh UNIQUE (rpCaseId,rpName),
	CONSTRAINT uk2_RevPh UNIQUE (rpCaseId,rpIdSeq)
)
GO
-- Storage (initial 5M NEXT 5M MINEXTENTS 1 MAXEXTENTS 20 PCTINCREASE 33) PCTFREE 5


-- OPTIONAL
CREATE SEQUENCE pfuser.ReviewBucket_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.ReviewBucket (
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
	CONSTRAINT pk_RevBucket PRIMARY KEY (rbId),
	CONSTRAINT uk_RevBucket UNIQUE (rbCaseId,rbName)
)
GO
-- Storage (initial 5M NEXT 5M MINEXTENTS 1 MAXEXTENTS 20 PCTINCREASE 33) 


CREATE TABLE pfuser.ReviewBucketItem (
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
	CONSTRAINT pk_ZRevBucItem PRIMARY KEY(rbiCaseId,rbiCaseItemId,rbiBucketId)
)
GO

CREATE INDEX i1_ZRevBucItem ON pfuser.ReviewBucketItem(rbiBucketId,rbiMoved,rbiState)
GO
CREATE INDEX i2_ZRevBucItem ON pfuser.ReviewBucketItem(rbiCaseId,rbiMoved)
GO


CREATE SEQUENCE pfuser.RevBucImpRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.ReviewBucketImportRun (
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
	CONSTRAINT pk_RevBucImpRun PRIMARY KEY (runId)
)
GO
CREATE INDEX i1_RevBucImpRun ON pfuser.ReviewBucketImportRun(runBucketId)
GO
CREATE INDEX i2_RevBucImpRun ON pfuser.ReviewBucketImportRun(runCaseId,runPhaseId)
GO




CREATE TABLE pfuser.CaseReviewer (
	revZlpUserid		INT NOT NULL,
	revCaseId	INT NOT NULL,
	revTenantId INT NOT NULL,
	revDate		DATETIME NOT NULL,
	revBucketIds	VARCHAR(255) NULL,
	CONSTRAINT pk_CaseReviewer PRIMARY KEY (revCaseId,revZlpUserId)
)
GO



CREATE TABLE pfuser.ConceptWordList (
	cwlCaseId		INT NOT NULL,
	cwlListId	INT NOT NULL,
	cwlScope	INT NOT NULL,
	cwlFlags		INT NOT NULL,
	cwlDesc		NVARCHAR(255),
	cwlTenantId INT NOT NULL,
	CONSTRAINT pk_ConceptWordList PRIMARY KEY (cwlCaseId,cwlListId)
)
GO


-- Collections


CREATE SEQUENCE pfuser.CustCollect_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.CustodianCollection (
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
	CONSTRAINT pk_CustColl PRIMARY KEY (ccId),
	CONSTRAINT uk_CustColl UNIQUE (ccZlpUserId,ccCaseId,ccSrcName),
	CONSTRAINT uk2_CustColl UNIQUE (ccProjectId)
)
GO
-- Storage (initial 5M NEXT 5M MINEXTENTS 1 MAXEXTENTS 20 PCTINCREASE 33) PCTFREE 5

CREATE INDEX i1_CustColl ON pfuser.CustodianCollection(ccCaseId,ccCustodianId)
GO




CREATE TABLE pfuser.CustCollPackage (
	ccpCollId			INT NOT NULL,
	ccpCaseId			INT NOT NULL,
	ccpVaultId 			VARCHAR(128) NOT NULL,
	ccpEncPwd 	        VARBINARY(128) NULL,
	ccpFiles			INT NOT NULL,
	ccpFlags			INT NOT NULL,
	ccpDateCreate		DATETIME NOT NULL,
	ccpLastWrite		DATETIME NOT NULL,
	ccpDeleted		CHAR(1) NOT NULL,
	CONSTRAINT pk_CustCollPkg PRIMARY KEY (ccpVaultId)
)
GO

CREATE INDEX i1_CustCollPkg ON pfuser.CustCollPackage(ccpCollId)
GO


CREATE TABLE pfuser.CcPackageAttach (
	attCollId			INT NOT NULL,
	attCaseId			INT NOT NULL,
	attPackageVaultId 			VARCHAR(128) NOT NULL,
	attVaultId			VARCHAR(128) NOT NULL,
	attEncPwd 	        VARBINARY(128) NULL,
	attDateCreate		DATETIME NOT NULL,
	CONSTRAINT pk_ccpAtt PRIMARY KEY (attVaultId)
)
GO

CREATE INDEX i1_ccpAtt ON pfuser.CcPackageAttach(attCollId,attPackageVaultId)
GO

CREATE SEQUENCE pfuser.CustCollectionRun_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.CustodianCollectionRun (
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
	CONSTRAINT pk_CustCollRuns PRIMARY KEY (ccrCollId,ccrId)
)
GO
CREATE INDEX i1_custCollRuns ON pfuser.CustodianCollectionRun(ccrStartDate)
GO
CREATE INDEX i2_custCollRuns ON pfuser.CustodianCollectionRun(ccrCaseId,ccrCustodianId)
GO




CREATE TABLE pfuser.GlobalCustodian (
	gcustZlpUserId	INT NOT NULL,
	gcustTenantId INT NOT NULL,
	gcustAddress 	NVARCHAR(255) NOT NULL,
	gcustFullName		NVARCHAR(255) NOT NULL,
	gcustCreateDate		DATETIME NOT NULL,
	gcustLastUpdate		DATETIME NOT NULL,
	gcustMisc1		NVARCHAR(255) NULL,
	CONSTRAINT pk_gcust PRIMARY KEY (gcustZlpUserId)
--	CONSTRAINT fk_gcustZLPUser FOREIGN KEY (gcustZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
)
GO


CREATE TABLE pfuser.GlobalCustodianAlias (	
	gcaAlias NVARCHAR(255) NOT NULL,
	gcaZlpUserId	INT NOT NULL,
	gcaTenantId	INT NOT NULL,
	gcaType	INT NOT NULL,
	gcaDate 	DATETIME NOT NULL,
	CONSTRAINT pk_gcustAlias PRIMARY KEY (gcaZlpUserId,gcaAlias)
)
GO
CREATE INDEX i1_gcustAlias ON pfuser.GlobalCustodianAlias(gcaTenantId)
GO



CREATE TABLE pfuser.CaseExport (
	ceExportTaskId	INT NOT NULL,
	ceCaseId	INT NOT NULL,
	ceStatus	INT NOT NULL,
	ceDate		DATETIME NOT NULL,
	ceTagType   INT NOT NULL,
    ceTagIds    VARCHAR(255) NULL,
	ceUpdate	DATETIME NOT NULL,
	CONSTRAINT pk_caseExport PRIMARY KEY (ceExportTaskId)
)
GO

CREATE INDEX i1_caseExport ON pfuser.CaseExport(ceCaseId)
GO


CREATE SEQUENCE pfuser.CaseSearch_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.CaseSearch (
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
	CONSTRAINT pk_CaseSearch PRIMARY KEY (csId),
	CONSTRAINT uk_CaseSearch UNIQUE (csTenantId,csCaseId,csPurpose,csName)
)
GO




CREATE TABLE pfuser.FedDocumentTransport (
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
	CONSTRAINT pk_FedDocTrans PRIMARY KEY (fdtStoreId,fdtRefType,fdtRefId)
)
GO

CREATE INDEX i1_FedDocTrans ON pfuser.FedDocumentTransport(fdtStoreId,fdtState,fdtRetry)
GO
CREATE INDEX i3_FedDocTrans ON pfuser.FedDocumentTransport(fdtState,fdtRetry)
GO


CREATE TABLE pfuser.CaseInPlaceItem (
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
	CONSTRAINT pk_CaseIPItem PRIMARY KEY (itemCaseId,itemRefType,itemStoreId,itemUnid)
)
GO
	
CREATE INDEX i1_CaseIPItem ON pfuser.CaseInPlaceItem(itemCaseId,itemUpdate)
GO
CREATE INDEX i2_CaseIPItem ON pfuser.CaseInPlaceItem(itemStoreId,itemUnid)
GO
