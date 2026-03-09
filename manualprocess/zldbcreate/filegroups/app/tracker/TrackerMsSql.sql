




-- OPTIONAL
CREATE SEQUENCE pfuser01.TrackerProject_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.TrackerProject (
	-- IDENTITY
	tracProjId		BIGINT NOT NULL,
	tracProjDomainId	INT NOT NULL,
	tracProjTenantId	INT NOT NULL,
	tracProjZLPUserId	INT NOT NULL,
	tracProjName	      NVARCHAR(255) NOT NULL,
	tracProjDisplayName	NVARCHAR(255) NOT NULL,
	tracProjPrivilegeFlags	     INT NOT NULL,
	tracProjKey 	NVARCHAR(255) NULL,
	tracProjDeleted 	CHAR(1) NOT NULL,
	CONSTRAINT pk_TrackerProject PRIMARY KEY (tracProjId) ON ZL_APP_INDEX,
--	CONSTRAINT fk_TracProjDomain FOREIGN KEY (tracProjDomainId) REFERENCES pfuser01.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_TracProjZLPUser FOREIGN KEY (tracProjZLPUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE,
	CONSTRAINT uk_TrackerProject UNIQUE (tracProjName) ON ZL_APP_INDEX 
) ON ZL_APP
GO

CREATE INDEX i1_TrackerProject ON pfuser01.TrackerProject(tracProjDomainId) ON ZL_APP_INDEX
GO



CREATE TABLE pfuser01.TrackerProjectPrivileges (
	tppProjId 		INT NOT NULL,
   	tppEntityId 	INT NOT NULL,
	tppEntityType	INT NOT NULL,
   	tppPrivilegeFlags 	INT NOT NULL,
--	CONSTRAINT fk_TracProjPriv FOREIGN KEY (tppProjId) REFERENCES pfuser01.TrackerProject(tracProjId) ON DELETE CASCADE,
	CONSTRAINT uk_TracProjPriv UNIQUE (tppProjId,tppEntityType,tppEntityId) ON ZL_APP_INDEX 
) ON ZL_APP
GO

CREATE INDEX i1_TracProjPriv ON pfuser01.TrackerProjectPrivileges(tppProjId) ON ZL_APP_INDEX
GO

CREATE INDEX i2_TracProjPriv ON pfuser01.TrackerProjectPrivileges(tppEntityType,tppEntityId) ON ZL_APP_INDEX
GO



CREATE TABLE pfuser01.TrackerEntity (
	teId 		INT NOT NULL,
	teType 		INT NOT NULL,
	teFlags		INT NOT NULL,
	teVal1		NVARCHAR(255) NULL,
	teVal2		NVARCHAR(255) NULL,
	teVal3		NVARCHAR(255) NULL,
	teVal4		NVARCHAR(255) NULL,	
	CONSTRAINT pk_TrackerEntity PRIMARY KEY  (teId,teType) ON ZL_APP_INDEX
) ON ZL_APP
GO



CREATE SEQUENCE pfuser01.TiPartition_seq
INCREMENT BY 1
START WITH 2
NO MAXVALUE
NO CYCLE
CACHE 10
GO






CREATE TABLE pfuser01.TiPartition (
	tipId		INT NOT NULL,
	tipName		NVARCHAR(255) NOT NULL,
	tipTenantId INT NOT NULL,
	tipDateStart DATETIME NOT NULL,
	tipDateEnd   DATETIME,
	tipDomainIds VARCHAR(255) NULL,
	tipCreateDate DATETIME NOT NULL,
	tipNotes	NVARCHAR(255) NULL,
	tipMPLastItemId	INT NULL,
	tipSyncDate	DATETIME NULL,
	tipVal1	NVARCHAR(255) NULL,
	tipVal2	NVARCHAR(255) NULL,
	tipVal3	NVARCHAR(255) NULL,
	tipVal4	NVARCHAR(255) NULL,
	tipVal5	NVARCHAR(255) NULL,
	CONSTRAINT pk_TiPart PRIMARY KEY (tipTenantId,tipId) ON ZL_APP_INDEX,
	CONSTRAINT uk_TiPart UNIQUE (tipTenantId,tipName) ON ZL_APP_INDEX
) ON ZL_APP
GO



CREATE SEQUENCE pfuser01.TrackerItem_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO






CREATE TABLE pfuser01.TracItem (
	tracItemId	BIGINT NOT NULL,
	tracItemProjId INT NOT NULL,
	tracItemTenantId INT NOT NULL,
	tracItemParentId BIGINT NULL,
	tracItemPartId	INT NOT NULL,
    tracItemCreator VARCHAR(255) NULL,
    tracItemLastUpdateUser  VARCHAR(255) NULL,
	tracItemAssignee VARCHAR(255) NULL,
	tracItemZLPUserIds VARCHAR(255) NULL,
	tracItemZLPUserIdTruncated CHAR(1) NULL,
    tracItemSubject NVARCHAR(255) NULL,
    tracItemSize 	INT NOT NULL,
    tracItemType	INT NOT NULL,
    tracItemStatus   INT,
	tracItemReviewerZLPUserId INT NULL,
	tracItemReviewDate DATETIME NULL,
    tracItemPriority   INT,
    tracItemNotify   INT,
	tracItemFlags	BIGINT NULL,
	tracItemDisableBulk CHAR(1) NULL,
	tracItemRefItemId    NVARCHAR(255) NULL,
	tracItemCatSeverity	INT,
    tracItemCreateDate    DATETIME  NOT NULL,
    tracItemLastUpdate    DATETIME  NOT NULL,
    tracItemProcessDate    DATETIME NOT NULL,
    tracItemExpectedCompleteDate    DATETIME NULL,
    tracItemVaultItemId VARCHAR(128) NULL,
    tracItemDeleted CHAR(1) NOT NULL,
    tracItemEncPwd  VARBINARY(128) NULL,
	tracItemLang  VARCHAR(10) NULL,
	tracItemFlagged CHAR(1) NOT NULL,
	tracItemEscalation	INT NOT NULL,
	tracItemVal1	NVARCHAR(255) NULL,
	tracItemVal2	NVARCHAR(255) NULL,
	tracItemVal3	NVARCHAR(255) NULL,
	CONSTRAINT pk_TracItem PRIMARY KEY (tracItemTenantId,tracItemId) ON ZL_TRACKER_INDEX 
--,
--	CONSTRAINT fk_TracItemProj FOREIGN KEY (tracItemProjId) REFERENCES pfuser01.TrackerProject(tracProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_TrackerItemVa FOREIGN KEY (tracItemVaultItemId) REFERENCES pfuser01.VaultItem(viStId) ON DELETE CASCADE
)
ON ZL_TRACKER
GO

CREATE INDEX i1_TracItem ON pfuser01.TracItem(tracItemVaultItemId) ON ZL_TRACKER_INDEX
GO

CREATE INDEX i2_TracItem ON pfuser01.TracItem(tracItemRefItemId) ON ZL_TRACKER_INDEX
GO

CREATE INDEX i3_TracItem ON pfuser01.TracItem(tracItemTenantId,tracItemStatus,tracItemProjId,tracItemType,tracItemCreateDate,tracItemDeleted,tracItemId) ON ZL_TRACKER_INDEX
GO

CREATE INDEX i4_TracItem ON pfuser01.TracItem(tracItemProjId,tracItemCreateDate) ON ZL_TRACKER_INDEX
GO

 

CREATE INDEX i6_TracItem ON pfuser01.TracItem(tracItemTenantId,tracItemCreateDate) ON ZL_TRACKER_INDEX
GO

CREATE INDEX i7_TracItem ON pfuser01.TracItem(tracItemTenantId,tracItemPartId,tracItemId) ON ZL_TRACKER_INDEX
GO

CREATE INDEX i8_TracItem ON pfuser01.TracItem(tracItemTenantId,tracItemPartId,tracItemLastUpdate) ON ZL_TRACKER_INDEX
GO




-- MSSQL 2008
-- ALTER TABLE pfuser01.TracItem SET (LOCK_ESCALATION = DISABLE)
-- GO



CREATE TABLE pfuser01.TracItemDelete (
	tidId	BIGINT NOT NULL,
	tidProjId INT NOT NULL,
	tidTenantId INT NOT NULL,
	tidPartId	INT NOT NULL,
    tidDate    DATETIME  NOT NULL,
	CONSTRAINT pk_TracItemDel PRIMARY KEY (tidTenantId,tidId) ON ZL_TRANSIENT_INDEX 
)
ON ZL_TRANSIENT
GO
CREATE INDEX i1_TracItemDel ON pfuser01.TracItemDelete(tidTenantId,tidPartId,tidId) ON ZL_TRANSIENT_INDEX
GO



CREATE TABLE pfuser01.TrackerAuditTrail (
	taAction	INT NOT NULL,
	taDate		DATETIME NOT NULL,	
	taItemId	BIGINT NOT NULL,	
	taRefItemId	VARCHAR(255) NULL,
	taFolderId	INT NOT NULL,
	taProjectId	INT NOT NULL,
	taZlpUserId	INT NOT NULL,
	taUser		NVARCHAR(255) NOT NULL,	
	taDomainId	INT NOT NULL,
	taTenantId INT NOT NULL,	
	taTxnId		VARCHAR(64) NOT NULL,
	taClearanceLevel	INT NOT NULL,
	taSourceIP 	VARCHAR(64) NULL,
	taDestIP   	VARCHAR(64) NULL,
	taAccessType 	VARCHAR(128) NULL,
	taZViteStId 	VARCHAR(255) NULL,
	taComments	NVARCHAR(255) NULL,
	taVal1 	NVARCHAR(255) NULL,
	taVal2 	NVARCHAR(255) NULL,
	taVal3 	NVARCHAR(255) NULL,
	taVal4 	NVARCHAR(255) NULL,
	taVal5 	NVARCHAR(255) NULL
--,
--	CONSTRAINT fk_TracAudProj FOREIGN KEY (taProjectId) REFERENCES pfuser01.TrackerProject(tracProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_TracAudFldr FOREIGN KEY (taFolderId) REFERENCES pfuser01.TrackerFolder(tracFldrId) ON DELETE CASCADE,
--	CONSTRAINT fk_TracAudItem FOREIGN KEY (taItemId) REFERENCES pfuser01.TracItem(tracItemId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_TracAudDomain FOREIGN KEY (taDomainId) REFERENCES pfuser01.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_TracAudZLPUser FOREIGN KEY (taZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
ON ZL_ITEM
GO

CREATE INDEX i1_TracAudTrail ON pfuser01.TrackerAuditTrail(taDate) ON ZL_ITEM_INDEX
GO
CREATE INDEX i2_TracAudTrail ON pfuser01.TrackerAuditTrail(taDomainId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i3_TracAudTrail ON pfuser01.TrackerAuditTrail(taItemId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i4_TracAudTrail ON pfuser01.TrackerAuditTrail(taRefItemId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i5_TracAudTrail ON pfuser01.TrackerAuditTrail(taZlpUserId) ON ZL_ITEM_INDEX
GO



CREATE TABLE pfuser01.UserMailComplianceStat (
	umcsZlpUserId INT NOT NULL,
	umcsAsId INT NOT NULL,
	umcsTenantId INT NOT NULL,
	umcsReviewAsId INT NOT NULL,
	umcsAltReviewAsIds VARCHAR(255) NULL,
	umcsPolVal1 	NVARCHAR(255) NULL,
	umcsPolVal2 	NVARCHAR(255) NULL,
	umcsPeriod	NVARCHAR(255) NOT NULL, 
	umcsPeriodInfo	NVARCHAR(255) NOT NULL, 
	umcsPeriodStartDate DATETIME NOT NULL,
	umcsPeriodEndDate DATETIME NOT NULL, 
	umcsCreateDate DATETIME NOT NULL,
	umcsLastUpdate DATETIME NOT NULL,
	umcsChangeNumber INT NOT NULL,
	umcsTotal	INT NOT NULL,
	umcsFlaggedTotal INT NOT NULL,
	umcsPreReview	INT NOT NULL,
	umcsPostReview	INT NOT NULL,
	umcsRandomPreReview INT NOT NULL,
	umcsRandomPostReview INT NOT NULL,
	umcsFlaggedBackFill	INT NOT NULL,
	umcsRandomBackFill	INT NOT NULL,
	umcsForcePostReview	INT NOT NULL,
	umcsTargetedReview	INT NOT NULL,
	umcsComplianceOff INT NOT NULL,
	umcsTiCount INT NOT NULL,
	umcsTiApprovedCount INT NOT NULL,
	umcsTiBulkApprovedCount INT NOT NULL,
	umcsTiRejectCount INT NOT NULL,
	umcsTiBulkRejectCount INT NOT NULL,
	umcsTiBulkReleaseCount INT NOT NULL,
	umcsBackFillRunCount INT NOT NULL,
	umcsBackFillLastRunDate DATETIME NULL,
	umcsBackFillMessage NVARCHAR(255) NULL,
	CONSTRAINT pk_umcs UNIQUE (umcsZlpUserId,umcsPeriodInfo) ON ZL_COMPMAIL_INDEX
--,
--	CONSTRAINT fk_umcsAs FOREIGN KEY (umcsAsId) REFERENCES pfuser01.ArchiveServer(asId) ON DELETE CASCADE,
--	CONSTRAINT fk_umcsReviewAs FOREIGN KEY (umcsReviewAsId) REFERENCES pfuser01.ArchiveServer(asId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_umcsZLPUser FOREIGN KEY (umcsZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE
) ON ZL_COMPMAIL
GO

CREATE INDEX i1_umcs ON pfuser01.UserMailComplianceStat(umcsZlpUserId,umcsPeriod,umcsPeriodStartDate) ON ZL_COMPMAIL_INDEX
GO
CREATE INDEX i2_umcs ON pfuser01.UserMailComplianceStat(umcsAsId,umcsPeriod,umcsPeriodStartDate) ON ZL_COMPMAIL_INDEX
GO
CREATE INDEX i4_umcs ON pfuser01.UserMailComplianceStat(umcsReviewAsId,umcsPeriod,umcsPeriodStartDate) ON ZL_COMPMAIL_INDEX
GO
CREATE INDEX i5_umcs ON pfuser01.UserMailComplianceStat(umcsTenantId,umcsPeriodStartDate) ON ZL_COMPMAIL_INDEX
GO


CREATE TABLE pfuser01.DeptMailComplianceStat (
	dmcsTenantId INT NOT NULL,
	dmcsReviewAsId INT NOT NULL,
	dmcsPolVal1 	NVARCHAR(255) NULL,
	dmcsPolVal2 	NVARCHAR(255) NULL,
	dmcsPeriod	NVARCHAR(255) NOT NULL, 
	dmcsPeriodInfo	NVARCHAR(255) NOT NULL, 
	dmcsPeriodStartDate DATETIME NOT NULL,
	dmcsPeriodEndDate DATETIME NOT NULL, 
	dmcsCreateDate DATETIME NOT NULL,
	dmcsLastUpdate DATETIME NOT NULL,
	dmcsChangeNumber INT NOT NULL,
	dmcsTotal	INT NOT NULL,
	dmcsFlaggedTotal INT NOT NULL,
	dmcsPreReview	INT NOT NULL,
	dmcsPostReview	INT NOT NULL,
	dmcsRandomPreReview INT NOT NULL,
	dmcsRandomPostReview INT NOT NULL,
	dmcsFlaggedBackFill	INT NOT NULL,
	dmcsRandomBackFill	INT NOT NULL,
	dmcsForcePostReview	INT NOT NULL,
	dmcsTargetedReview 	INT NOT NULL,
	dmcsComplianceOff INT NOT NULL,
	dmcsTiCount INT NOT NULL,
	dmcsTiApprovedCount INT NOT NULL,
	dmcsTiBulkApprovedCount INT NOT NULL,
	dmcsTiRejectCount INT NOT NULL,
	dmcsTiBulkRejectCount INT NOT NULL,
	dmcsTiBulkReleaseCount INT NOT NULL,
	dmcsBackFillRunCount INT NOT NULL,
	dmcsBackFillLastRunDate DATETIME NULL,
	dmcsBackFillMessage NVARCHAR(255) NULL,
	CONSTRAINT pk_dmcs UNIQUE (dmcsReviewAsId,dmcsPeriodInfo) ON ZL_COMPMAIL_INDEX
--,
--	CONSTRAINT fk_dmcsReviewAs FOREIGN KEY (dmcsReviewAsId) REFERENCES pfuser01.ArchiveServer(asId) ON DELETE CASCADE
) ON ZL_COMPMAIL
GO

CREATE INDEX i1_dmcs ON pfuser01.DeptMailComplianceStat(dmcsReviewAsId,dmcsPeriod,dmcsPeriodStartDate) ON ZL_COMPMAIL_INDEX
GO
CREATE INDEX i2_dmcs ON pfuser01.DeptMailComplianceStat(dmcsTenantId,dmcsPeriodStartDate) ON ZL_COMPMAIL_INDEX
GO


CREATE TABLE pfuser01.ComplianceMail (
	cmMsgId	   VARCHAR(255) NOT NULL,
	cmZlpUserId INT NOT NULL,
	cmMailType NVARCHAR(64) NOT NULL,
	cmDirection CHAR(1) NULL,
	cmOn CHAR(1) NULL,
	cmAsId INT NOT NULL,
	cmReviewAsId INT NOT NULL,
	cmTrackerItemId BIGINT NULL,
	cmFlagged CHAR(1)  NULL,
	cmPreReview	CHAR(1) NOT NULL,
	cmPostReview	CHAR(1) NOT NULL,
	cmRandomPreReview CHAR(1) NOT NULL,
	cmRandomPostReview CHAR(1) NOT NULL,
	cmBackFill CHAR(1) NOT NULL,
	cmForcePostReview CHAR(1)  NULL,
	cmTargetedReview CHAR(1)  NULL,
	cmComplianceOff CHAR(1) NOT NULL,
	cmComplianceOffReason NVARCHAR(64) NULL,	
	cmComplianceFlag INT NOT NULL,
	cmDate 	DATETIME NOT NULL,
	cmReviewerZLPUserId INT NULL,
	cmReviewDate DATETIME NULL,
	cmReviewAction INT NULL,
	cmLastUpdate DATETIME NOT NULL,
        CONSTRAINT pk_compMail PRIMARY KEY (cmMsgId,cmZlpUserId) ON ZL_COMPMAIL_INDEX
--,
--	CONSTRAINT fk_compMailItem FOREIGN KEY (cmTrackerItemId) REFERENCES pfuser01.TrackerItem(tracItemId) ON DELETE CASCADE,
--	CONSTRAINT fk_compMailAs FOREIGN KEY (cmAsId) REFERENCES pfuser01.ArchiveServer(asId) ON DELETE CASCADE,
--	CONSTRAINT fk_compMailRevAs FOREIGN KEY (cmReviewAsId) REFERENCES pfuser01.ArchiveServer(asId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_compMailZLPUser FOREIGN KEY (cmZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_compMailMsg FOREIGN KEY (cmMsgId) REFERENCES pfuser01.ZLPMessage(MsgId) ON DELETE CASCADE
)
ON ZL_COMPMAIL
GO

CREATE INDEX i1_compMail ON pfuser01.ComplianceMail(cmLastUpdate) ON ZL_COMPMAIL_INDEX
GO
CREATE INDEX i2_compMail ON pfuser01.ComplianceMail(cmZlpUserId,cmDate) ON ZL_COMPMAIL_INDEX
GO
CREATE INDEX i3_compMail ON pfuser01.ComplianceMail(cmAsId,cmDate) ON ZL_COMPMAIL_INDEX
GO
CREATE INDEX i4_compMail ON pfuser01.ComplianceMail(cmReviewAsId,cmDate) ON ZL_COMPMAIL_INDEX
GO
CREATE INDEX i5_compMail ON pfuser01.ComplianceMail(cmReviewAsId,cmReviewDate) ON ZL_COMPMAIL_INDEX
GO
 
CREATE INDEX i6_compMail ON pfuser01.ComplianceMail(cmTrackerItemId) ON ZL_COMPMAIL_INDEX
GO

-- MSSQL 2008
-- ALTER TABLE pfuser01.ComplianceMail SET (LOCK_ESCALATION = DISABLE)
-- GO



CREATE TABLE pfuser01.DepartmentReviewStat (
	drsAsId INT NOT NULL,
	drsPeriod	NVARCHAR(255) NOT NULL, 
	drsPeriodInfo	NVARCHAR(255) NOT NULL, 
	drsPeriodStartDate DATETIME NOT NULL,
	drsPeriodEndDate DATETIME NOT NULL, 
	drsLastUpdate DATETIME NOT NULL,
	drsTotal	INT NOT NULL,
	drsPreReview	INT NOT NULL,
	drsPostReview	INT NOT NULL,
	drsRandomPreReview INT NOT NULL,
	drsRandomPostReview INT NOT NULL,
	drsBackFill	INT NOT NULL,
	drsComplianceOff INT NOT NULL,
	drsPendingReviewFlagged INT NOT NULL,
	drsApprovedFlagged 	INT NOT NULL,
	drsRejectedFlagged	INT NOT NULL,
	drsPartialApprovedFlagged INT NOT NULL,
	drsBulkApprovedFlagged INT NOT NULL,
	drsBulkRejectedFlagged 	INT NOT NULL,
	drsPendingReviewRandom INT NOT NULL,
	drsApprovedRandom 	INT NOT NULL,
	drsRejectedRandom	INT NOT NULL,
	drsBulkApprovedRandom INT NOT NULL,
	drsBulkRejectedRandom 	INT NOT NULL,
        drsOldPendingReviewFlagged INT NOT NULL,
	drsOldApprovedFlagged 	INT NOT NULL,
	drsOldRejectedFlagged	INT NOT NULL,
	drsOldPartialApprovedFlagged INT NOT NULL,
	drsOldBulkApprovedFlagged INT NOT NULL,
	drsOldBulkRejectedFlagged 	INT NOT NULL,
	drsOldPendingReviewRandom INT NOT NULL,
	drsOldApprovedRandom 	INT NOT NULL,
	drsOldRejectedRandom	INT NOT NULL,
	drsOldBulkApprovedRandom INT NOT NULL,
	drsOldBulkRejectedRandom 	INT NOT NULL,  
        drsRPI		REAL NOT NULL,
	CONSTRAINT pk_DeptRevSt UNIQUE (drsAsId,drsPeriodInfo) ON ZL_COMPMAIL_INDEX
--,
--	CONSTRAINT fk_DeptRevStAs FOREIGN KEY (drsAsId) REFERENCES pfuser01.ArchiveServer(asId) ON DELETE CASCADE
) ON ZL_COMPMAIL
GO
CREATE INDEX i1_DeptRevSt ON pfuser01.DepartmentReviewStat(drsAsId,drsPeriodStartDate) ON ZL_COMPMAIL_INDEX
GO


CREATE TABLE pfuser01.TrackerItemStats (
	tisProjId INT NOT NULL,
	tisDate DATETIME NOT NULL,
	tis0	INT NOT NULL,
	tis1	INT NOT NULL,
	tis2	INT NOT NULL,
	tis3	INT NOT NULL,
	tis4	INT NOT NULL,
	tis5	INT NOT NULL,
	tis6	INT NOT NULL,
	tis7	INT NOT NULL,
	tis8	INT NOT NULL,
	tis9	INT NOT NULL,
	CONSTRAINT pk_TiStat  PRIMARY KEY (tisProjId) ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_TiStatProj FOREIGN KEY (tisProjId) REFERENCES pfuser01.TrackerProject(tracProjId) ON DELETE CASCADE
) ON ZL_APP
GO


CREATE TABLE pfuser01.LexAnal (
	laMsgId		VARCHAR(64) NOT NULL,
	laEntityType	INT NULL,
	laEntityId	INT NULL,
	laSeqNumber		INT NOT NULL,
	laNext			CHAR(1) NOT NULL,
	laDate			DATETIME NOT NULL,
	laVal1			NVARCHAR(255) NULL,
	laVal2			NVARCHAR(255) NULL,
	laVal3			NVARCHAR(255) NULL,
	laVal4			NVARCHAR(255) NULL,
	laVal5			NVARCHAR(255) NULL,
	laVal6			NVARCHAR(255) NULL,
	laVal7			NVARCHAR(255) NULL,
	laVal8			NVARCHAR(255) NULL,
	CONSTRAINT pk_lexAnal PRIMARY KEY (laMsgId,laSeqNumber)  ON ZL_ITEM_INDEX
--,
--	CONSTRAINT fk_lexAnalMsg FOREIGN KEY (laMsgId) REFERENCES pfuser01.ZLPMessage(MsgId) ON DELETE CASCADE
) ON ZL_ITEM
GO

CREATE INDEX i1_lexAnal ON pfuser01.LexAnal(laDate) ON ZL_ITEM_INDEX
GO
CREATE INDEX i2_lexAnal ON pfuser01.LexAnal(laEntityType,laEntityId) ON ZL_ITEM_INDEX
GO


CREATE TABLE pfuser01.DeptBackFillRun (
	dbfrBgtId		INT NOT NULL,
        dbfrZlpUserId           INT NOT NULL,
	dbfrReviewAsId		INT NOT NULL,
	dbfrDateStart		DATETIME NULL,
	dbfrUpdate		DATETIME NULL,
	dbfrDateEnd		DATETIME NULL,
	dbfrPID			NVARCHAR(64),
	dbfrMsgVal1			NVARCHAR(255),
	dbfrMsgVal2			NVARCHAR(255),
	dbfrMsgVal3			NVARCHAR(255),
	dbfrMsgVal4			NVARCHAR(255),
	CONSTRAINT pk_DeptBfr PRIMARY KEY (dbfrBgtId,dbfrReviewAsId,dbfrZlpUserId)  ON ZL_TRANSIENT_INDEX
--,
--	CONSTRAINT fk_DeptBfrRevAs FOREIGN KEY (dbfrReviewAsId) REFERENCES pfuser01.ArchiveServer(asId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_DeptBfrZLPUser FOREIGN KEY (dbfrZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO


-- OPTIONAL
CREATE SEQUENCE pfuser01.CannedResponse_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser01.CannedResponse (
	-- IDENTITY
	crId		BIGINT NOT NULL,
	crName		NVARCHAR(255) NOT NULL,
	crDesc		NVARCHAR(255) NOT NULL,
	crEntityType	INT NOT NULL,
	crEntityId	INT NOT NULL,
	crCreateDate DATETIME NOT NULL,
	crLastUpdate DATETIME NOT NULL,
	crZlObjId	INT NOT NULL,
	CONSTRAINT pk_canResp PRIMARY KEY (crId) ON ZL_APP_INDEX,
        CONSTRAINT uk_canResp UNIQUE (crName,crEntityType,crEntityId) ON ZL_APP_INDEX
) ON ZL_APP
GO
CREATE INDEX i1_canResp ON pfuser01.CannedResponse(crEntityType,crEntityId) ON ZL_APP_INDEX
GO
		
CREATE SEQUENCE pfuser01.TrackerSavedSearch_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.TrackerSavedSearch (
	tssId		INT NOT NULL,
	tssTenantId	INT NOT NULL,
	tssPartId	INT NOT NULL,
	tssZlpUserId	INT NOT NULL,
	tssName		NVARCHAR(255) NOT NULL,
	tssType		VARCHAR(255) NOT NULL,
	tssDesc		NVARCHAR(255) NULL,
	tssDate 	DATETIME NOT NULL,
	tssDatePerformed DATETIME NOT NULL,
	tssQueryVal1 NVARCHAR(255) NULL,
	tssQueryVal2 NVARCHAR(255) NULL,
	tssQueryVal3 NVARCHAR(255) NULL,
	tssQueryVal4 NVARCHAR(255) NULL,
	tssQueryVal5 NVARCHAR(255) NULL,
	tssQueryVal6 NVARCHAR(255) NULL,
	tssQueryVal7 NVARCHAR(255) NULL,
	tssQueryVal8 NVARCHAR(255) NULL,
	tssQueryVal9 NVARCHAR(255) NULL,
	tssQueryVal10 NVARCHAR(255) NULL,
	tssJSONVal1 NVARCHAR(255) NULL,
	tssJSONVal2 NVARCHAR(255) NULL,
	tssJSONVal3 NVARCHAR(255) NULL,
	tssJSONVal4 NVARCHAR(255) NULL,
	tssJSONVal5 NVARCHAR(255) NULL,
	tssJSONVal6 NVARCHAR(255) NULL,
	tssJSONVal7 NVARCHAR(255) NULL,
	tssJSONVal8 NVARCHAR(255) NULL,
	tssJSONVal9 NVARCHAR(255) NULL,
	tssJSONVal10 NVARCHAR(255) NULL,
	CONSTRAINT pk_TracSearch PRIMARY KEY (tssId)  ON ZL_APP_INDEX,
	CONSTRAINT uk_TracSearch UNIQUE (tssTenantId,tssPartId,tssZlpUserId, tssName)  ON ZL_APP_INDEX
) ON ZL_APP
GO

