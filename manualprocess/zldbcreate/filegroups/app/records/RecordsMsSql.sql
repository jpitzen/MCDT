



-- *************************************************************************************
--	Records
-- *************************************************************************************


CREATE SEQUENCE pfuser01.RecordStore_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.RecordStore (
	recStoreId		INT NOT NULL,
	recStoreName 	 NVARCHAR(255) NOT NULL,
	recStoreDisplayName	        NVARCHAR(255) NOT NULL,
	recTenantId 	INT NOT NULL,
	recCreateDate	DATETIME NOT NULL,
	recStoreKey		VARCHAR(128) NOT NULL,
	recUserDataId	 BIGINT  NOT NULL,
	recDefaultSchema	VARCHAR(128) NULL,
	recDefaultNonElectProjId	INT NOT NULL,
	CONSTRAINT pk_RecStore PRIMARY KEY(recStoreId) ON ZL_APP_INDEX,
	CONSTRAINT uk_RecStore UNIQUE (recTenantId,recStoreName) ON ZL_APP_INDEX
) ON ZL_APP
GO


CREATE TABLE pfuser01.SupplementalMarkings (
	smId		INT NOT NULL,
	smStoreId 	INT NOT NULL,
	smName	        NVARCHAR(255) NOT NULL,
	smDisplayName   NVARCHAR(255) NOT NULL,
	smDesc			NVARCHAR(255) NULL,
	smCreateDate	DATETIME NOT NULL,
	CONSTRAINT pk_SupMark PRIMARY KEY(smStoreId,smId) ON ZL_APP_INDEX,
	CONSTRAINT uk_SupMark UNIQUE (smStoreId,smName) ON ZL_APP_INDEX
) ON ZL_APP
GO


CREATE SEQUENCE pfuser01.FilePlan_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.FilePlan (
        filePlanId INT NOT NULL,
        filePlanParentId INT NOT NULL,
        filePlanStoreId INT NOT NULL,
        filePlanCategoryId INT NOT NULL,
        filePlanName	NVARCHAR(255) NOT NULL,
        filePlanDispName	NVARCHAR(255) NOT NULL,
        filePlanPrefix NVARCHAR(64) NOT NULL,
        filePlanDesc	NVARCHAR(255) NULL,
        filePlanFldrType INT NOT NULL,
        filePlanFlags INT NOT NULL,
        filePlanRecFlags INT NOT NULL,
        filePlanCreateDate DATETIME NOT NULL,
        filePlanUpdateDate DATETIME NOT NULL,
        filePlanChangeNumber INT NOT NULL,
        filePlanFldrSize  BIGINT  NOT NULL,
        filePlanFldrCount INT NOT NULL,
        filePlanSubFolderScheme	NVARCHAR(255) NULL,
        filePlanLocation NVARCHAR(255) NULL,
        filePlanSupMark VARCHAR(255) NULL,
		filePlanClearance INT NULL,
       	filePlanSchema	INT NOT NULL,
       	filePlanRecordSchema INT NOT NULL,
        filePlanUserDataId	 BIGINT  NOT NULL,
        filePlanRetCodeId	INT NOT NULL,
        filePlanTriggerFormula	NVARCHAR(255) NULL,
        filePlanTriggerDate	DATETIME NULL,
        filePlanCutoffDate		DATETIME NULL,
        filePlanDispAuthority	NVARCHAR(255) NULL,
        filePlanPhaseId		INT  NOT NULL,
        filePlanPhaseDate DATETIME NULL,
        filePlanNextPhaseId	INT NOT NULL,
		filePlanNextPhaseExecDate DATETIME NULL,
		filePlanNextPhaseDecisionDate DATETIME NULL,
		filePlanNextPhaseAction	INT NULL,
		filePlanVitalReviewDate DATETIME NULL,
        filePlanVitalReviewZlpUserId INT NULL,
		filePlanVitalReviewAction INT NULL,
		filePlanVitalReviewNotes	NVARCHAR(255) NULL,
		filePlanNextVitalReviewDate DATETIME NULL,     
		filePlanLifeCycleRunId	INT NULL,
		filePlanLifeCycleRunDate 	DATETIME NULL,
		filePlanLegalHoldDate	DATETIME NULL,
		filePlanLegalHoldReason	NVARCHAR(255) NULL,
		filePlanSupercedeDate	 DATETIME NULL,
		filePlanTransferCode INT NULL,
		filePlanTransferStatus INT NULL,
		filePlanTransferExportId	INT NULL,
		filePlanTransferConfirmUserId	INT NULL,
	CONSTRAINT pk_FilePlan PRIMARY KEY (filePlanId) ON ZL_APP_INDEX,
	CONSTRAINT uk_FilePlan UNIQUE (filePlanName,filePlanParentId,filePlanStoreId) ON ZL_APP_INDEX,
	CONSTRAINT uk2_FilePlan UNIQUE (filePlanStoreId,filePlanPrefix) ON ZL_APP_INDEX
) ON ZL_APP
GO
-- Storage (initial 5M NEXT 5M MINEXTENTS 1 MAXEXTENTS 20 PCTINCREASE 33) PCTFREE 5

CREATE INDEX i2_FilePlan ON pfuser01.FilePlan(filePlanStoreId,filePlanCategoryId,filePlanFldrType) ON ZL_APP_INDEX
GO






CREATE SEQUENCE pfuser01.Record_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.Record (
	recId	 BIGINT  NOT NULL,
	recStoreId INT NOT NULL,
	recSubject    NVARCHAR(255) NULL,
	recFileDate    DATETIME  NOT NULL,
	recPublishDate    DATETIME  NOT NULL,
	recType INT NOT NULL,
	recSubType INT NOT NULL,
	recCategoryId	INT NOT NULL,
	recFolderId	INT NOT NULL,
	recRefItemId VARCHAR(128) NOT NULL,
	recRefItemParts VARCHAR(255)  NULL,
	recRefZlpUserId	VARCHAR(255) NULL,
	recRefDomainId	VARCHAR(255) NULL,
	recAuthor	NVARCHAR(255) NULL,
	recOriginOrg NVARCHAR(255) NULL,
	recSupMark  NVARCHAR(255) NULL,
	recMediaType	VARCHAR(128)  NULL,
	recFormat	VARCHAR(128)  NULL,
	recReceivedDate	DATETIME NULL,
	recAddressee	NVARCHAR(255) NULL,
	recOtherAddressee	NVARCHAR(255) NULL,
	recLocation NVARCHAR(255) NULL,
	recUserDataId	INT NOT NULL,
	recDeclareType	INT NOT NULL,
	recDeclareId	INT NOT NULL,
	recFlags 	INT NOT NULL,
	recLastUpdate    DATETIME  NOT NULL,
	recTriggerDate DATETIME NULL,
	recCutoffDate	DATETIME  NULL,
	recPhaseId		INT  NOT NULL,
	recPhaseDate DATETIME NULL,
	recNextPhaseId	INT NOT NULL,
	recNextPhaseExecDate DATETIME NULL,
	recNextPhaseDecisionDate DATETIME NULL,
	recNextPhaseAction	INT NULL,
	recVitalReviewDate DATETIME NULL,
	recVitalReviewZlpUserId INT NULL,
	recVitalReviewAction INT NULL,
	recVitalReviewNotes	NVARCHAR(255) NULL,
	recNextVitalReviewDate DATETIME NULL,	
	recLifeCycleRunId	INT NULL,
	recLifeCycleRunDate 	DATETIME NULL,
	recSupercedeDate	 DATETIME NULL,
	recParamVal1			NVARCHAR(255) NULL,
	recParamVal2			NVARCHAR(255) NULL,
	recParamVal3			NVARCHAR(255) NULL,
	recParamVal4			NVARCHAR(255) NULL,
	recTransferCode INT NULL,
	recTransferStatus INT NULL,
	recTransferExportId	INT NULL,
	recTransferConfirmZlpUserId	INT NULL,
	recDowngradeType INT NULL,
	recDowngradeEvent INT NULL,
	recDeclassifyType INT NULL,
	recDeclassifyEvent INT NULL,
	recClassificationRules NVARCHAR(255) NULL,
	recClassificationReasons NVARCHAR(255) NULL,
	recExemptions NVARCHAR(255) NULL,
	recInitialClearance INT NULL,
	recCurrentClearance INT NULL,
	recDowngradeClearance INT NULL,
	recDerivedFrom NVARCHAR(255) NULL,
	recClassifiedBy NVARCHAR(255) NULL,
	recAgency NVARCHAR(255) NULL,
	recDowngradeInst NVARCHAR(255) NULL,
	recDowngradeDate DATETIME NULL,
	recDeclassifyDate DATETIME NULL,
	CONSTRAINT pk_Record PRIMARY KEY(recId) ON ZL_RECORD_INDEX,
	CONSTRAINT uk_RecordRef UNIQUE (recStoreId,recCategoryId,recRefItemId,recRefItemParts) ON ZL_RECORD_INDEX
)
ON ZL_RECORD
GO


CREATE INDEX i1_Record ON pfuser01.Record(recStoreId,recFolderId) ON ZL_RECORD_INDEX
GO
CREATE INDEX i2_Record ON pfuser01.Record(recStoreId,recRefItemId,recRefItemParts) ON ZL_RECORD_INDEX
GO
CREATE INDEX i3_Record ON pfuser01.Record(recStoreId,recId) ON ZL_RECORD_INDEX
GO
CREATE INDEX i5_Record ON pfuser01.Record(recStoreId,recLastUpdate) ON ZL_RECORD_INDEX
GO





CREATE TABLE pfuser01.RecordAuditTrail (
	raAction	INT NOT NULL,
	raDate		DATETIME NOT NULL,
	raRecId	 BIGINT  NOT NULL,
	raRefItemId	VARCHAR(255) NULL,
	raFilePlanId	INT NOT NULL,
	raStoreId	INT NOT NULL,
	raZlpUserId	INT NOT NULL,
	raUser		NVARCHAR(255) NOT NULL,
	raDomainId	INT NOT NULL,
	raTenantId 	INT NOT NULL,	
	raTxnId		VARCHAR(64) NOT NULL,
	raClearanceLevel	INT NOT NULL,
	raSourceIP 	VARCHAR(64) NULL,
	raDestIP   	VARCHAR(64) NULL,
	raAccessType 	VARCHAR(128) NULL,
	raComments	NVARCHAR(255) NULL,
	raVal1 	NVARCHAR(255) NULL,
	raVal2 	NVARCHAR(255) NULL,
	raVal3 	NVARCHAR(255) NULL,
	raVal4 	NVARCHAR(255) NULL,
	raVal5 	NVARCHAR(255) NULL
--,
--	CONSTRAINT fk_CaseAudTrail FOREIGN KEY (caCaseId) REFERENCES pfuser01.CaseInfo(caseId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseAudTrailFldr FOREIGN KEY (caFolderId) REFERENCES pfuser01.CaseFolder(caseFldrId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseAudTrailItem FOREIGN KEY (caItemId) REFERENCES pfuser01.CaseItem(caseItemId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_CaseAudTrailDomain FOREIGN KEY (caDomainId) REFERENCES pfuser01.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseAudTrailZLPUser FOREIGN KEY (caZLPUser) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
ON ZL_ITEM
GO
-- //DB2{[PARTITION BY RANGE~~PARTITION  BY RANGE]}
-- //SYBASE{[PARTITION BY RANGE~~ON ITEMDATERANGE]}
-- //MSSQL{[PARTITION BY RANGE~~ON ITEMDATERANGE]}
-- //!ORACLE{[PARTITION BY RANGE(caDate)~~]}
-- PARTITION BY RANGE(caDate)
-- //MSSQL{[INTERVAL (NUMTOYMINTERVAL(1, 'YEAR'))~~]}
-- //DB2{[INTERVAL (NUMTOYMINTERVAL(1, 'YEAR'))~~(STARTING ('2000-01-01') ENDING ('2010-01-01') EVERY (1 YEARS))]}
-- //!ORACLE{[INTERVAL (NUMTOYMINTERVAL(1, 'YEAR'))~~]}
-- INTERVAL (NUMTOYMINTERVAL(1, 'YEAR')) -- Oracle 11g
-- ( -- remove comment and edit table space as necessary
-- PARTITION ZL_ITEM_0 VALUES LESS THAN (TO_DATE('01/01/2001', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_0,
-- PARTITION ZL_ITEM_1 VALUES LESS THAN (TO_DATE('01/01/2002', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_1,
-- PARTITION ZL_ITEM_2 VALUES LESS THAN (TO_DATE('01/01/2003', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_2,
-- PARTITION ZL_ITEM_3 VALUES LESS THAN (TO_DATE('01/01/2004', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_3,
-- PARTITION ZL_ITEM_4 VALUES LESS THAN (TO_DATE('01/01/2005', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_4,
-- PARTITION ZL_ITEM_5 VALUES LESS THAN (TO_DATE('01/01/2006', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_5,
-- PARTITION ZL_ITEM_6 VALUES LESS THAN (TO_DATE('01/01/2007', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_6,
-- PARTITION ZL_ITEM_7 VALUES LESS THAN (TO_DATE('01/01/2008', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_7,
-- PARTITION ZL_ITEM_8 VALUES LESS THAN (TO_DATE('01/01/2009', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_8,
-- PARTITION ZL_ITEM_9 VALUES LESS THAN (TO_DATE('01/01/2010', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_9
-- )

CREATE INDEX i1_RecAudTrail ON pfuser01.RecordAuditTrail(raDate) ON ZL_ITEM_INDEX
GO
CREATE INDEX i2_RecAudTrail ON pfuser01.RecordAuditTrail(raDomainId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i3_RecAudTrail ON pfuser01.RecordAuditTrail(raRecId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i4_RecAudTrail ON pfuser01.RecordAuditTrail(raRefItemId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i5_RecAudTrail ON pfuser01.RecordAuditTrail(raZlpUserId) ON ZL_ITEM_INDEX
GO






CREATE SEQUENCE pfuser01.RecUserData_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.RecordUserData (
	rudId			 BIGINT  NOT NULL,
	rudObjType		INT NOT NULL,
	rudObjId		 BIGINT  NOT NULL,
	rudStoreId		INT NOT NULL,
	rudSeqNumber		INT NOT NULL,
	rudNext			CHAR(1) NOT NULL,
	rudVal1			NVARCHAR(255) NULL,
	rudVal2			NVARCHAR(255) NULL,
	rudVal3			NVARCHAR(255) NULL,
	rudVal4			NVARCHAR(255) NULL,
	rudVal5			NVARCHAR(255) NULL,
	rudVal6			NVARCHAR(255) NULL,
	rudVal7			NVARCHAR(255) NULL,
	rudVal8			NVARCHAR(255) NULL,
	CONSTRAINT pk_RecUserData PRIMARY KEY (rudId,rudSeqNumber) ON ZL_RECORD_INDEX
--,
--	CONSTRAINT fk_CIAnnot FOREIGN KEY (ciaCaseId) REFERENCES pfuser01.CaseInfo(caseId) ON DELETE CASCADE,
--	CONSTRAINT fk_CIAnnotItem FOREIGN KEY (ciaItemId) REFERENCES pfuser01.CaseItem(caseItemId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_CIAnnot FOREIGN KEY (cupZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE
) ON ZL_RECORD
GO




-- OPTIONAL
CREATE SEQUENCE pfuser01.RecDataSource_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.RecordDataSource (
	-- IDENTITY
	srcId		BIGINT NOT NULL,
	srcParentId	INT NOT NULL,
	srcName		NVARCHAR(255) NOT NULL,
	srcStoreId 	INT NOT NULL,
	srcType	INT NOT NULL,
	srcSrchStoreId INT NOT NULL,
	srcSrchType 	VARCHAR(32),
	srcPurpose VARCHAR(32) NOT NULL,	
	srcPriority	INT NOT NULL,
	srcDateCreate	DATETIME NOT NULL,
	srcUpdate	DATETIME NOT NULL,
	srcItemFilePlanId	INT NOT NULL,
	srcVaultItemId	VARCHAR(128) NULL,
	srcVaultPwd 	VARBINARY(255) NULL,
	CONSTRAINT pk_RecDataSource PRIMARY KEY (srcId)  ON ZL_APP_INDEX,
--	CONSTRAINT fk_RecDataSource FOREIGN KEY (srcStoreId) REFERENCES pfuser01.RecordStore(recStoreId) ON DELETE CASCADE,
--	CONSTRAINT fk_RecDataSourceVa FOREIGN KEY (srcVaultItemId) REFERENCES pfuser01.VaultItem(viStId) ON DELETE CASCADE,
	CONSTRAINT uk_RecDataSource UNIQUE (srcStoreId,srcName) ON ZL_APP_INDEX
) ON ZL_APP
GO
CREATE INDEX i1_RecDataSource ON pfuser01.RecordDataSource(srcVaultItemId)  ON ZL_APP_INDEX
GO


CREATE SEQUENCE pfuser01.RecDataSourceRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.RecordDataSourceRuns (
	runId		INT NOT NULL,
	runSrcId		INT NOT NULL,
	runMethod		VARCHAR(32),
	runMachine		NVARCHAR(255),
	runDateStart	DATETIME NOT NULL,
	runDateUpdate	DATETIME NOT NULL,
	runDateEnd	DATETIME NULL,
	runItemFound	INT NOT NULL,
	runItemImported	INT NOT NULL,
	runItemMoved	INT NOT NULL,
	runItemDuplicates	INT NOT NULL,
	runItemErrors	INT NOT NULL,
	runItemInplaceSuccess INT NOT NULL,
	runItemInplaceNotFound INT NOT NULL,
	runitemInplaceError INT NOT NULL,
	runStatusMsg	NVARCHAR(255) NULL,
	runVaultItemId	VARCHAR(128) NULL,
	CONSTRAINT pk_RecDataSourceRuns PRIMARY KEY (runId)  ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_RecDataSourceRuns FOREIGN KEY (runSrcId) REFERENCES pfuser01.RecordDataSource(srcId) ON DELETE CASCADE
) ON ZL_APP
GO
CREATE INDEX i1_RecDataSourceRuns ON pfuser01.RecordDataSourceRuns(runSrcId)  ON ZL_APP_INDEX
GO


CREATE TABLE pfuser01.RecordDataSourceScheduledRuns (
	schedSrcId	INT NOT NULL,
	schedIntervalSec INT NOT NULL,
	schedDateStart	DATETIME NOT NULL,
	schedDateExpiry DATETIME NULL,
	schedIterations	INT NULL,
	CONSTRAINT pk_RecDataSourceScheduledRuns PRIMARY KEY (schedSrcId)  ON ZL_APP_INDEX
) ON ZL_APP
GO


-- OPTIONAL
CREATE SEQUENCE pfuser01.RecordSchema_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.RecordSchema (
	-- IDENTITY
	rsSchemaId BIGINT NOT NULL,
	rsStoreId 	INT NOT NULL,
	rsSchemaName			VARCHAR(128) NOT NULL,
	rsParentSchemaId INT NOT NULL,
	CONSTRAINT pk_recSchema PRIMARY KEY(rsSchemaId) ON ZL_APP_INDEX,
	CONSTRAINT uk_recSchema UNIQUE(rsStoreId,rsSchemaName) ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE TABLE pfuser01.RecordSchemaFields (
	rsfSchemaId	INT NOT NULL,
	rsfName			VARCHAR(128) NOT NULL,
	rsfSeq	INT NOT NULL,
	rsfDesc		NVARCHAR(255) NULL,
	rsfType			VARCHAR(128) NOT NULL,
	rsfInputType	VARCHAR(128) NOT NULL,
	rsfInputParamVal1		NVARCHAR(255) NULL,
	rsfInputParamVal2		NVARCHAR(255) NULL,
	rsfInputParamVal3		NVARCHAR(255) NULL,
	rsfFlags	INT NOT NULL,
	rsfFormula	NVARCHAR(255) NULL,
	rsfMandatory	CHAR(1) NOT NULL,
	CONSTRAINT pk2_recSchFld PRIMARY KEY(rsfSchemaId,rsfName) ON ZL_APP_INDEX
) ON ZL_APP
GO


-- OPTIONAL
CREATE SEQUENCE pfuser01.RetentionCode_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.RetentionCode (
	-- IDENTITY
	rcId 			BIGINT NOT NULL,
	rcStoreId		INT NOT NULL,
	rcName			NVARCHAR(255) NOT NULL,
	rcDisp			INT NOT NULL,
	rcDispInst		NVARCHAR(255) NULL,
	rcComment		NVARCHAR(255) NULL,
	rcFlag			INT NOT NULL,
	rcCutoff		VARCHAR(255) NULL,
	rcCycleDate		VARCHAR(255) NULL,
	rcVitalReviewPeriod	VARCHAR(64) NULL,
	rcDispVal1	 	NVARCHAR(255) NULL,
	rcDispVal2 		NVARCHAR(255) NULL,
	rcDispVal3 		NVARCHAR(255) NULL,
	rcDispVal4 		NVARCHAR(255) NULL,
	rcDispVal5 		NVARCHAR(255) NULL,
	rcDispVal6 		NVARCHAR(255) NULL,
	rcDispVal7 		NVARCHAR(255) NULL,
	rcDispVal8 		NVARCHAR(255) NULL,
	CONSTRAINT pk_rcode PRIMARY KEY(rcId) ON ZL_APP_INDEX,
	CONSTRAINT uk_rcode UNIQUE (rcStoreId,rcName) ON ZL_APP_INDEX	
) ON ZL_APP
GO

CREATE SEQUENCE pfuser01.LifeCycleRun_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO



CREATE TABLE pfuser01.LifeCycleRun (
	lcrId INT NOT NULL,
	lcrParentId INT NOT NULL,
	lcrZlpUserId	INT NOT NULL,
	lcrReferenceDate DATETIME NOT NULL,
	lcrStoreId INT NOT NULL,
	lcrFilePlanId INT NOT NULL,
	lcrTargetPhase INT NOT NULL,
	lcrFlags INT NOT NULL,
	lcrVaultItem VARCHAR(128) NULL,
	lcrVaultPwd 	VARBINARY(255) NULL,
	lcrStartDate DATETIME NULL,
	lcrEndDate DATETIME NULL,
	lcrMachine NVARCHAR(255) NULL,
	lcrStatus INT NOT NULL,
	lcrStatusMessage NVARCHAR(255) NULL,
	CONSTRAINT pk_LCRun PRIMARY KEY(lcrId) ON ZL_APP_INDEX
) ON ZL_APP
GO
	
	

CREATE TABLE pfuser01.LifeCycleRunEntry (
	entryRunId	INT NOT NULL,
	entryStoreId INT NOT NULL,
	entryRecEntity	INT NOT NULL,
	entryRecEntityId	INT NOT NULL,
	entryDate DATETIME NOT NULL,
	entryTriggerDate	DATETIME NULL,
    entryCutoffDate		DATETIME NULL,
    entryPhaseId		INT  NOT NULL,
	entryPhaseDate DATETIME NULL,
	entryNextPhaseId	INT NOT NULL,
	entryNextPhaseExecDate DATETIME NULL,
	entryNextPhaseDecisionDate DATETIME NULL,
	entryNextPhaseAction	INT NULL,
	entryNextVitalReviewDate DATETIME NULL,
	entryComment NVARCHAR(255) NULL,
	CONSTRAINT pk_LCRunEntry PRIMARY KEY(entryRunId,entryRecEntity,entryRecEntityId) ON ZL_APP_INDEX
) ON ZL_APP
GO







CREATE TABLE pfuser01.FilePlanPrivileges (
	fpStoreId INT NOT NULL,
	fpCategoryId 		INT NOT NULL,
	fpId 		INT NOT NULL,
   	fpEntityId 	INT NOT NULL,
	fpEntityType	INT NOT NULL,
	fpPrivName	VARCHAR(32) NOT NULL,
	fpRecursive	CHAR(1) NOT NULL,
	fpScopeType		      NVARCHAR(32) NULL,
    fpScope1		      VARCHAR(255) NULL,
    fpScope2		      VARCHAR(255) NULL,
    fpScope3		      VARCHAR(255) NULL,
	CONSTRAINT pk_FilePlanPriv PRIMARY KEY (fpStoreId,fpId,fpPrivName,fpEntityId,fpEntityType) ON ZL_APP_INDEX 
) ON ZL_APP
GO


CREATE INDEX i1_FilePlanPriv ON pfuser01.FilePlanPrivileges(fpEntityId,fpEntityType) ON ZL_APP_INDEX
GO


CREATE TABLE pfuser01.FilePlanCustomPrivileges (
	fcpStoreId INT NOT NULL,
	fcpPrivName	VARCHAR(32) NOT NULL,
	fcpPrivDispName	VARCHAR(32) NOT NULL,
	fcpVal	VARCHAR(255) NOT NULL,
	CONSTRAINT pk_RecCustomPriv PRIMARY KEY (fcpStoreId,fcpPrivName) ON ZL_APP_INDEX,
	CONSTRAINT uk_RecCustomPriv UNIQUE (fcpStoreId,fcpPrivDispName) ON ZL_APP_INDEX
) ON ZL_APP
GO


CREATE TABLE pfuser01.EntityMarking (
	emStoreId	INT NOT NULL,
	emEntityId 	INT NOT NULL,
	emEntityType	INT NOT NULL,
	emMarkingId VARCHAR(255) NOT NULL,
	CONSTRAINT pk_EntityMarking PRIMARY KEY (emStoreId,emEntityId,emEntityType) ON ZL_APP_INDEX 
) ON ZL_APP
GO
	






CREATE TABLE pfuser01.UserRecordDeclaration (
	urdZlpUserId	INT NOT NULL,
	urdSourceId	INT NOT NULL,
	-- //MSSQL{[VARCHAR2(255) NOT NULL~~VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL]}
	urdSyncUnid	VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL,
	urdSource	NVARCHAR(255) NOT NULL,
	urdSourceDetail	NVARCHAR(255) NULL,
	urdId VARCHAR(64) NULL,
	urdRecType INT NOT NULL,
	urdDeclareMethod INT NOT NULL,
	urdDeclareAction INT NOT NULL,
	urdDate DATETIME NOT NULL,
	urdRmId VARCHAR(128) NULL,
	urdStatus INT NOT NULL,
	urdRecordId INT NOT NULL,
	urdRecordDate DATETIME NULL,
	urdFolderId INT NOT NULL,
	urdCategoryId INT NOT NULL,
	urdLegalHolds NVARCHAR(255) NULL,
	urdSubject	NVARCHAR(255) NULL,
	urdName  NVARCHAR(255) NULL,
	urdVal1	NVARCHAR(255) NULL,
	urdVal2	NVARCHAR(255) NULL,
	urdVal3	NVARCHAR(255) NULL,
	urdVal4	NVARCHAR(255) NULL,
	CONSTRAINT pk_userRecDeclrn PRIMARY KEY (urdZlpUserId,urdSourceId,urdSyncUnid) ON ZL_ITEM_INDEX
) ON ZL_ITEM
GO

CREATE INDEX i1_userRecDeclrn ON pfuser01.UserRecordDeclaration(urdZlpUserId,urdDate) ON ZL_ITEM_INDEX
GO
CREATE INDEX i2_userRecDeclrn ON pfuser01.UserRecordDeclaration(urdId,urdRecType) ON ZL_ITEM_INDEX
GO


CREATE TABLE pfuser01.FieldValueFilter (
	fvfStoreId 	INT NOT NULL,
	fvfSchemaId	INT NOT NULL,
	fvfFieldName	VARCHAR(128) NOT NULL,
	fvfEntityType	INT NOT NULL,
   	fvfEntityId 	INT NOT NULL,
	fvfValues	NVARCHAR(255) NOT NULL,
	CONSTRAINT pk_FieldValFilter PRIMARY KEY (fvfStoreId,fvfSchemaId,fvfFieldName,fvfEntityType,fvfEntityId) ON ZL_APP_INDEX  
) ON ZL_APP
GO

-- OPTIONAL
CREATE SEQUENCE pfuser01.RecordRelationship_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.RecordRelationship (
-- IDENTITY
	relId 	BIGINT NOT NULL,
	relStoreId	INT NOT NULL,
	relType INT NOT NULL,
	relName	NVARCHAR(255) NOT NULL,
	relDisplayName	NVARCHAR(255) NOT NULL,
	CONSTRAINT pk_RecordRelationship PRIMARY KEY (relId) ON ZL_APP_INDEX,
	CONSTRAINT uk_RecordRelationship UNIQUE (relStoreId,relName) ON ZL_APP_INDEX
) ON ZL_APP
GO


CREATE TABLE pfuser01.RecordLink (
	linkLeftId BIGINT NOT NULL,
	linkRightId BIGINT NOT NULL,
	linkRelId	INT NOT NULL,
	linkStoreId INT NOT NULL,
	CONSTRAINT pk_RecordLink PRIMARY KEY (linkLeftId,linkRightId,linkRelId) ON ZL_RECORD_INDEX
) ON ZL_RECORD
GO

CREATE INDEX i1_RecordLink ON pfuser01.RecordLink(linkRightId) ON ZL_RECORD_INDEX
GO


CREATE SEQUENCE pfuser01.CategoryDispositionRun_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.CategoryDispositionRun (
	cdrId	BIGINT NOT NULL,
	cdrCategoryId INT NOT NULL,
	cdrStoreId INT NOT NULL,
	cdrDisp			INT NOT NULL,
    cdrCluster		NVARCHAR(64) NULL,
	cdrPID			NVARCHAR(64) NULL,
    cdrStartDate	DATETIME NOT NULL,
	cdrEndDate	DATETIME NULL,
    cdrUpdate	DATETIME NOT NULL,
    cdrCount INT NOT NULL,
    cdrTransCount  INT NOT NULL,   
	cdrStatusMessage	NVARCHAR(255) NULL,
	CONSTRAINT pk_CatDispRun PRIMARY KEY (cdrId,cdrCategoryId) ON ZL_ITEM_INDEX
) ON ZL_ITEM
GO



CREATE SEQUENCE pfuser01.CategoryDispositionTrans_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.CategoryDispositionTransaction (
	cdtId	BIGINT NOT NULL,
	cdtRunId		BIGINT NOT NULL,
	cdtCategoryId INT NOT NULL,
	cdtStoreId INT NOT NULL,
	cdtDisp			INT NOT NULL,
	cdtRecType	INT NOT NULL,
	cdtCount	INT NOT NULL,
	cdtError	INT NOT NULL,
    cdtCluster		NVARCHAR(64) NULL,
	cdtPID			NVARCHAR(64) NULL,
    cdtStartDate	DATETIME NOT NULL,
	cdtEndDate	DATETIME NULL,
    cdtUpdate	DATETIME NOT NULL,
	cdtVaultDeleteCount INT NOT NULL,
	cdtVaultPrimarySizeKB INT NOT NULL,
	cdtVaultSecondarySizeKB INT NOT NULL,
	cdtSISCount INT NOT NULL,
	cdtTranscriptVaultId VARCHAR(128) NULL,
	cdtStatusMessage	NVARCHAR(255) NULL,
	CONSTRAINT pk_CatDispTrans PRIMARY KEY (cdtId) ON ZL_ITEM_INDEX
) ON ZL_ITEM
GO
CREATE INDEX i1_CatDispTrans ON pfuser01.CategoryDispositionTransaction(cdtRunId) ON ZL_ITEM_INDEX
GO


CREATE TABLE pfuser01.RecordUserPreference (
	rupZlpUserId 		INT NOT NULL,
	rupVal1		NVARCHAR(255) NULL,
	rupVal2		NVARCHAR(255) NULL,
	rupVal3		NVARCHAR(255) NULL,
	rupVal4		NVARCHAR(255) NULL,
	rupVal5		NVARCHAR(255) NULL,
	rupVal6		NVARCHAR(255) NULL,
	rupVal7		NVARCHAR(255) NULL,
	rupVal8		NVARCHAR(255) NULL,	
	CONSTRAINT pk_RecUserPref PRIMARY KEY (rupZlpUserId)  ON ZL_APP_INDEX
) ON ZL_APP
GO


CREATE TABLE pfuser01.LifeCyclePhase (
	lcpStoreId	INT NOT NULL,
	lcpName	NVARCHAR(128) NOT NULL,
	lcpSeqNo	INT NOT NULL,
	lcpDesc		NVARCHAR(255) NULL,
	lcpFlags		INT NOT NULL,
	lcpInstructions	NVARCHAR(255) NULL,
	CONSTRAINT uk_Phase UNIQUE (lcpStoreId,lcpName) ON ZL_APP_INDEX
) ON ZL_APP
GO


CREATE TABLE pfuser01.DispositionAuthority (
	daStoreId	INT NOT NULL,
	daName	VARCHAR(128) NOT NULL,
	daDesc		NVARCHAR(255) NULL,
	CONSTRAINT uk_DispAuth UNIQUE (daStoreId,daName) ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE TABLE pfuser01.FilePlanFavorite (
	fpfStoreId	INT NOT NULL,
	fpfEntityType	INT NOT NULL,
   	fpfEntityId 	INT NOT NULL,
	fpfFilePlanId VARCHAR(255) NOT NULL,
	CONSTRAINT uk_filePlanFav UNIQUE (fpfStoreId,fpfEntityType,fpfEntityId) ON ZL_APP_INDEX
) ON ZL_APP
GO


CREATE SEQUENCE pfuser01.RecordSavedSearch_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.RecordSavedSearch (
	rssId		INT NOT NULL,
	rssParentId INT NOT NULL,
	rssName		NVARCHAR(255) NOT NULL,
	rssType		VARCHAR(255) NOT NULL,
	rssReservedQuery CHAR(1) NOT NULL,
	rssStoreId 	INT NOT NULL,
	rssTenantId	INT NOT NULL,
	rssDesc		NVARCHAR(255) NULL,
	rssDate 	DATETIME NOT NULL,
	rssQueryVal1 NVARCHAR(255) NULL,
	rssQueryVal2 NVARCHAR(255) NULL,
	rssQueryVal3 NVARCHAR(255) NULL,
	rssQueryVal4 NVARCHAR(255) NULL,
	rssQueryVal5 NVARCHAR(255) NULL,
	rssQueryVal6 NVARCHAR(255) NULL,
	rssQueryVal7 NVARCHAR(255) NULL,
	rssQueryVal8 NVARCHAR(255) NULL,
	rssQueryVal9 NVARCHAR(255) NULL,
	rssQueryVal10 NVARCHAR(255) NULL,
	rssJSONVal1 NVARCHAR(255) NULL,
	rssJSONVal2 NVARCHAR(255) NULL,
	rssJSONVal3 NVARCHAR(255) NULL,
	rssJSONVal4 NVARCHAR(255) NULL,
	rssJSONVal5 NVARCHAR(255) NULL,
	rssJSONVal6 NVARCHAR(255) NULL,
	rssJSONVal7 NVARCHAR(255) NULL,
	rssJSONVal8 NVARCHAR(255) NULL,
	rssJSONVal9 NVARCHAR(255) NULL,
	rssJSONVal10 NVARCHAR(255) NULL,
	CONSTRAINT pk_RecordSavedSearch PRIMARY KEY (rssId)  ON ZL_APP_INDEX,
	CONSTRAINT uk_RecordSavedSearch UNIQUE (rssTenantId,rssStoreId,rssParentId,rssName)  ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE TABLE pfuser01.EntityClearance (
	ecStoreId	INT NOT NULL,
	ecEntityId 	INT NOT NULL,
	ecEntityType	INT NOT NULL,
	ecClearance INT NOT NULL,
	CONSTRAINT pk_EntityClearance PRIMARY KEY (ecStoreId,ecEntityId,ecEntityType) ON ZL_APP_INDEX
--	CONSTRAINT fk_RecordStoreId FOREIGN KEY (rcStoreId) REFERENCES pfuser01.RecordStore(recStoreId) ON DELETE CASCADE
) ON ZL_APP
GO

CREATE SEQUENCE pfuser01.ClassificationGuide_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.ClassificationGuide (
	cgId			INT NOT NULL,
	cgStoreId 		INT NOT NULL,
	cgName 			NVARCHAR(64) NOT NULL,
	cgOrganization 	NVARCHAR(128) NULL,
	cgDesc 			NVARCHAR(512) NULL,
	cgCreateDate 	DATETIME NOT NULL,
	cgUpdateDate 	DATETIME NOT NULL,
	CONSTRAINT pk_ClassficationGuide PRIMARY KEY (cgId) ON ZL_APP_INDEX
-- 	CONSTRAINT fk_RecordStoreId FOREIGN KEY (cgStoreId) REFERENCES pfuser01.RecordStore(recStoreId) ON DELETE CASCADE
) ON ZL_APP
GO

CREATE SEQUENCE pfuser01.ClassifiedReason_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.ClassifiedReason (
	crId			INT NOT NULL,
	crStoreId 		INT NOT NULL,
	crCode 			NVARCHAR(32) NOT NULL,
	crType		 	INT NOT NULL,
	crDesc 			NVARCHAR(512) NULL,
	crCreateDate 	DATETIME NOT NULL,
	crUpdateDate 	DATETIME NOT NULL,
	crEventDate     DATETIME NULL,
	CONSTRAINT pk_ClassifiedReason PRIMARY KEY (crId) ON ZL_APP_INDEX
-- 	CONSTRAINT fk_RecordStoreId FOREIGN KEY (crStoreId) REFERENCES pfuser01.RecordStore(recStoreId) ON DELETE CASCADE
) ON ZL_APP
GO

CREATE SEQUENCE pfuser01.ClassificationRule_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.ClassificationRule (
	crId				INT NOT NULL,
	crStoreId 			INT NOT NULL,
	crGuideId           INT NOT NULL,
	crName 				NVARCHAR(255) NOT NULL,
	crTopic		 		NVARCHAR(255) NOT NULL,
	crClearance		 	INT NOT NULL,
	crReason		 	VARCHAR(64) NULL,
	crEvent				INT NOT NULL,
	crDeclassifyDate	DATETIME NULL,
	crExemption		 	VARCHAR(64) NULL,
	crMarking		 	VARCHAR(64) NULL,
	crRemark		 	NVARCHAR(255) NULL,
	crSetup 			NVARCHAR(255) NULL,
	crCreateDate 		DATETIME NOT NULL,
	crUpdateDate 		DATETIME NOT NULL,
	CONSTRAINT pk_ClassficationRule PRIMARY KEY (crId) ON ZL_APP_INDEX
-- 	CONSTRAINT fk_RecordStoreId FOREIGN KEY (crStoreId) REFERENCES pfuser01.RecordStore(recStoreId) ON DELETE CASCADE
-- 	CONSTRAINT fk_ClassificationGuideId FOREIGN KEY (crGuideId) REFERENCES pfuser01.ClassificationGuide(cgId) ON DELETE CASCADE
) ON ZL_APP
GO

