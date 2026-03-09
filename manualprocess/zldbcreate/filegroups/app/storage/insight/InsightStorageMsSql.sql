--Use by content insight
GO

CREATE SEQUENCE pfuser01.FileTag_Sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
CREATE TABLE pfuser01.FileTag (
	tagId 			INT NOT NULL,
	tagProjId		INT NOT NULL,
	tagParentId		INT NOT NULL,
	tagName			NVARCHAR(255) NOT NULL,
	tagDisplayName			NVARCHAR(255) NULL,
	tagFlags		BIGINT NOT NULL,
	tagDesc			NVARCHAR(255) NULL,
	tagCreateDate	DATETIME NOT NULL,
	CONSTRAINT pk_FileTag PRIMARY KEY (tagId) ON ZL_APP_INDEX,
	CONSTRAINT uk_FileTag UNIQUE (tagProjId,tagName) ON ZL_APP_INDEX
) ON ZL_APP
GO


CREATE TABLE pfuser01.FileTagAction (
	ftaProjId		INT NOT NULL,
	ftaTagId		INT NOT NULL,
	ftaActionTagId		INT NOT NULL,
	ftaCreateDate	DATETIME NOT NULL,
	ftaZlpUserId	INT NOT NULL,
	ftaVal1 NVARCHAR(255) NULL,
	ftaVal2 NVARCHAR(255) NULL,
	ftaVal3 NVARCHAR(255) NULL,
	ftaVal4 NVARCHAR(255) NULL,
	ftaVal5 NVARCHAR(255) NULL,
	ftaVal6 NVARCHAR(255) NULL,
	ftaVal7 NVARCHAR(255) NULL,
	ftaVal8 NVARCHAR(255) NULL,
	CONSTRAINT pk_FileTagAction PRIMARY KEY (ftaTagId) ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE INDEX i1_FileTagAction ON pfuser01.FileTagAction(ftaProjId,ftaActionTagId)  ON ZL_APP_INDEX
GO




CREATE SEQUENCE pfuser01.FileTreeDataCollect_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.FileTreeDataCollect (
	collectId		INT NOT NULL,
	collectName		NVARCHAR(255) NOT NULL,
	collectProjId 	INT NOT NULL,
	collectScanVersion		BIGINT NOT NULL,
	collectType 	INT NOT NULL,
	collectPurpose VARCHAR(32) NOT NULL,
	collectDateCreate	DATETIME NOT NULL,
	collectUpdate	DATETIME NOT NULL,
	collectStatus	INT NOT NULL,
	CONSTRAINT pk_FTDataColl PRIMARY KEY (collectId)  ON ZL_APP_INDEX,
	CONSTRAINT uk_FTDtaColl UNIQUE (collectProjId,collectName) ON ZL_APP_INDEX
) ON ZL_APP
GO


CREATE SEQUENCE pfuser01.FileTreeSearch_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.FileTreeSearch (
	ftsId		INT NOT NULL,
	ftsName		NVARCHAR(255) NOT NULL,
	ftsProjId 	INT NOT NULL,
	ftsTenantId	INT NOT NULL,
	ftsDesc		NVARCHAR(255) NULL,
	ftsDate 	DATETIME NOT NULL,
	ftsQueryVal1 NVARCHAR(255) NULL,
	ftsQueryVal2 NVARCHAR(255) NULL,
	ftsQueryVal3 NVARCHAR(255) NULL,
	ftsQueryVal4 NVARCHAR(255) NULL,
	ftsQueryVal5 NVARCHAR(255) NULL,
	ftsQueryVal6 NVARCHAR(255) NULL,
	ftsQueryVal7 NVARCHAR(255) NULL,
	ftsQueryVal8 NVARCHAR(255) NULL,
	ftsQueryVal9 NVARCHAR(255) NULL,
	ftsQueryVal10 NVARCHAR(255) NULL,
	ftsJSONVal1 NVARCHAR(255) NULL,
	ftsJSONVal2 NVARCHAR(255) NULL,
	ftsJSONVal3 NVARCHAR(255) NULL,
	ftsJSONVal4 NVARCHAR(255) NULL,
	ftsJSONVal5 NVARCHAR(255) NULL,
	ftsJSONVal6 NVARCHAR(255) NULL,
	ftsJSONVal7 NVARCHAR(255) NULL,
	ftsJSONVal8 NVARCHAR(255) NULL,
	ftsJSONVal9 NVARCHAR(255) NULL,
	ftsJSONVal10 NVARCHAR(255) NULL,
	CONSTRAINT pk_FTSearch PRIMARY KEY (ftsId)  ON ZL_APP_INDEX,
	CONSTRAINT uk_FTSearch UNIQUE (ftsTenantId,ftsProjId,ftsName)  ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE TABLE pfuser01.FileTreeEntry (
	fteProjId	INT NOT NULL,
	fteDirId	INT NOT NULL,
	-- //MSSQL{[NVARCHAR2(255) NOT NULL~~NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL]}
	fteName	NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL,
	fteFlags	INT NOT NULL,
	fteFileCreateDate	DATETIME NOT NULL,
	fteFileLastModified	DATETIME NOT NULL,
	fteUpdate	DATETIME NOT NULL,	
	fteSyncDate	DATETIME NULL,	
	-- //MSSQL{[VARCHAR2(255) NULL~~VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NULL]}
	fteDigest	VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NULL,
	fteSize	BIGINT NOT NULL,
	fteTagIds    NVARCHAR(255) NULL,
	fteRetType	INT NOT NULL,
	fteRetId	INT NOT NULL,
	fteOutOfSync CHAR(1) DEFAULT 'N' NOT NULL,
    fteOutOfSyncDetectedDate DATETIME NULL,
	fteFileKey  NVARCHAR(255) NULL,
	fteVal1	    NVARCHAR(255) NULL,
	fteVal2		NVARCHAR(255) NULL,
	fteVal3		NVARCHAR(255) NULL,
	fteVal4		NVARCHAR(255) NULL,
	fteVal5		NVARCHAR(255) NULL,
	fteVal6		NVARCHAR(255) NULL,
	fteVal7		NVARCHAR(255) NULL,
	fteVal8		NVARCHAR(255) NULL,
	CONSTRAINT pk_fte PRIMARY KEY (fteProjId,fteDirId,fteName) ON ZL_ARCHIVEPOINT_INDEX
) ON ZL_ARCHIVEPOINT
GO

CREATE TABLE pfuser01.FileTreeEntrySyncAction (
	ftesaProjId        INT NOT NULL,
	ftesaDirId         INT NOT NULL,
	ftesaName          NVARCHAR(255) NOT NULL,
	ftesaCrawlVersion  NVARCHAR(255) NOT NULL,
	ftesaOldDirId      INT NOT NULL,
	ftesaOldName       NVARCHAR(255) NOT NULL,
    ftesaSyncDate      DATETIME NOT NULL,
	ftesaFileKey       NVARCHAR(255) NOT NULL,
	ftesaAction        INT NOT NULL,
	ftesaTagIds        NVARCHAR(255) NULL,
    ftesaRetId         INT NOT NULL,
    ftesaVal1	       NVARCHAR(255) NULL,
    ftesaVal2	       NVARCHAR(255) NULL,
    ftesaVal3		   NVARCHAR(255) NULL,
    ftesaVal4		   NVARCHAR(255) NULL,
    ftesaVal5		   NVARCHAR(255) NULL,
    ftesaVal6		   NVARCHAR(255) NULL,
    ftesaVal7		   NVARCHAR(255) NULL,
    ftesaVal8		   NVARCHAR(255) NULL
) ON ZL_ARCHIVEPOINT
GO

CREATE INDEX i1_FileTreeEntrySyncAction ON pfuser01.FileTreeEntrySyncAction(ftesaProjId)  ON ZL_ARCHIVEPOINT_INDEX
GO

CREATE TABLE pfuser01.FileTreePrivileges (
	ftpProjId INT NOT NULL,
	ftpFolderId INT NOT NULL,
	ftpZlpUserId INT NOT NULL,
	ftpPrivFlags BIGINT NOT NULL,
	ftpRecursive CHAR(1) NOT NULL,
	ftpExpiryDate	DATETIME NULL,
	CONSTRAINT pk_ftp UNIQUE (ftpProjId,ftpFolderId, ftpZlpUserId) ON ZL_APP_INDEX
) ON ZL_APP
GO



CREATE TABLE pfuser01.FileTreeRemediation (
	ftrProjId INT NOT NULL,
	ftrDirId	INT NOT NULL,
	-- //MSSQL{[NVARCHAR2(255) NOT NULL~~NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL]}
	ftrName	NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL,
	ftrSize BIGINT NOT NULL,
	ftrLastModified DATETIME NOT NULL,
	ftrRunId INT NOT NULL,
	ftrCrawlVersion  NVARCHAR(255) NOT NULL,
	ftrTagIds  NVARCHAR(255) NULL,
	ftrDATE DATETIME NOT NULL,
	ftrAction  NVARCHAR(255) NOT NULL,
	ftrPID 	NVARCHAR(255) NULL,
	ftrSuccess CHAR(1) NOT NULL,
	ftrMessage NVARCHAR(255) NULL,
	ftrLocation NVARCHAR(255) NULL,
	CONSTRAINT pk_ftRemediate UNIQUE (ftrProjId,ftrDirId,ftrName,ftrRunId) ON ZL_TRANSIENT_INDEX
) ON ZL_TRANSIENT
GO



CREATE SEQUENCE pfuser01.FTRemediationRuns_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.FileTreeRemediationRuns (
	ftrrProjId INT NOT NULL,
	ftrrId INT NOT NULL,
	ftrrCrawlVersion  NVARCHAR(255) NOT NULL,
	ftrrStatus INT NOT NULL,
	ftrrDateStart  DATETIME NOT NULL,
	ftrrUPDATE  DATETIME NOT NULL,
	ftrrDateEnd  DATETIME NULL,
	ftrrPID	NVARCHAR(255),
	ftrrArchiveCount INT NOT NULL,
	ftrrRemediateCount INT NOT NULL,
	ftrrMessage NVARCHAR(255) NULL,
	ftrrTagIds VARCHAR(512) NULL,
	CONSTRAINT pk_ftRemediateRun UNIQUE (ftrrProjId,ftrrId) ON ZL_APP_INDEX
)ON ZL_APP
GO
		

CREATE SEQUENCE pfuser01.FileTreeDashboard_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.FileTreeDashboard (
	ftdId			INT NOT NULL,
	ftdTenantId		INT NOT NULL,
	ftdZlpUserId	INT NOT NULL,
	ftdStatus		INT NOT NULL,
	ftdName			NVARCHAR(255) NOT NULL,
	ftdParamVal1 	NVARCHAR(255) NULL,
	ftdParamVal2 	NVARCHAR(255) NULL,
	ftdParamVal3 	NVARCHAR(255) NULL,
	ftdParamVal4 	NVARCHAR(255) NULL,
	ftdParamVal5 	NVARCHAR(255) NULL,
	ftdParamVal6 	NVARCHAR(255) NULL,
	ftdParamVal7 	NVARCHAR(255) NULL,
	ftdParamVal8 	NVARCHAR(255) NULL,
	CONSTRAINT pk_FileTreeDashboard PRIMARY KEY (ftdId) ON ZL_APP_INDEX,
	CONSTRAINT uk_FileTreeDashboard UNIQUE (ftdZlpUserId,ftdName) ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE INDEX i1_fileTreeDash ON pfuser01.FileTreeDashboard(ftdTenantId) ON ZL_APP_INDEX
GO
CREATE INDEX i2_fileTreeDash ON pfuser01.FileTreeDashboard(ftdZlpUserId) ON ZL_APP_INDEX
GO
CREATE INDEX i3_fileTreeDash ON pfuser01.FileTreeDashboard(ftdZlpUserId,ftdStatus) ON ZL_APP_INDEX
GO
	
CREATE TABLE pfuser01.FileTreeAuditTrail (
	ftaAction			INT NOT NULL,
	ftaDate				DATETIME NOT NULL,
	ftaTenantId 		INT NOT NULL,
	ftaProjId			INT NOT NULL,
	ftaDirId			INT NOT NULL,
	ftaName				NVARCHAR(255) NULL,
	ftaDisplayName		NVARCHAR(255) NULL,
	ftaZlpUserId		INT NOT NULL,
	ftaUser				NVARCHAR(255) NOT NULL,
	ftaDomainId			INT NOT NULL,	
	ftaProjDomainId		INT NOT NULL,
	ftaTxnId			VARCHAR(64) NOT NULL,
	ftaClearanceLevel	INT NOT NULL,
	ftaSourceIP 		VARCHAR(64) NULL,
	ftaDestIP   		VARCHAR(64) NULL,
	ftaAccessType 		VARCHAR(128) NULL,
	ftaComments			NVARCHAR(255) NULL,
	ftaVal1 			NVARCHAR(255) NULL,
	ftaVal2 			NVARCHAR(255) NULL,
	ftaVal3 			NVARCHAR(255) NULL,
	ftaVal4 			NVARCHAR(255) NULL,
	ftaVal5 			NVARCHAR(255) NULL
) ON ZL_APP
GO

CREATE INDEX i1_FileTreeAudit ON pfuser01.FileTreeAuditTrail(ftaDate) ON ZL_APP_INDEX
GO
CREATE INDEX i2_FileTreeAudit ON pfuser01.FileTreeAuditTrail(ftaProjId) ON ZL_APP_INDEX
GO
CREATE INDEX i3_FileTreeAudit ON pfuser01.FileTreeAuditTrail(ftaProjId,ftaDirId,ftaName) ON ZL_APP_INDEX
GO
CREATE INDEX i4_FileTreeAudit ON pfuser01.FileTreeAuditTrail(ftaAction) ON ZL_APP_INDEX
GO
CREATE INDEX i5_FileTreeAudit ON pfuser01.FileTreeAuditTrail(ftaZlpUserId) ON ZL_APP_INDEX
GO

CREATE TABLE pfuser01.FileTreeScheduledRuns (
	ftsrProjId	INT NOT NULL,
	ftsrTaskType NVARCHAR(255) NOT NULL,
	ftsrInterval NVARCHAR(255) NOT NULL,
	ftsrDateStart	DATETIME NOT NULL,
	ftsrDateExpiry DATETIME NULL,
	ftsrIterations	INT NULL,
	CONSTRAINT pk_FTScheduledRuns PRIMARY KEY (ftsrProjId, ftsrTaskType)  ON ZL_APP_INDEX
) ON ZL_APP
GO
	
CREATE INDEX i1_FTScheduledRuns ON pfuser01.FileTreeScheduledRuns(ftsrTaskType) ON ZL_APP_INDEX
GO

CREATE SEQUENCE pfuser01.FTDispositionRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.FileTreeDispositionRuns (
	ftdrId			INT NOT NULL,
	ftdrProjId		INT NOT NULL,
	ftdrTaskType	NVARCHAR(255) NOT NULL,
	ftdrApprovalRequestId	INT NOT NULL,
	ftdrPeriodEndDate	DATETIME NOT NULL,
	ftdrRpBdbId		INT NOT NULL,
	ftdrPID			NVARCHAR(255) NOT NULL,
	ftdrStartDate	DATETIME NOT NULL,
	ftdrUpdateDate	DATETIME NOT NULL,
	ftdrEndDate		DATETIME NULL,
	ftdrStatus		INT NOT NULL,
	ftdrStatusMsg	NVARCHAR(255) NULL,
	ftdrVal1		NVARCHAR(255) NULL,
	ftdrVal2		NVARCHAR(255) NULL,
	ftdrVal3		NVARCHAR(255) NULL,
	ftdrVal4		NVARCHAR(255) NULL,
	ftdrVal5		NVARCHAR(255) NULL,
	CONSTRAINT pk_FTDispRuns PRIMARY KEY (ftdrId)  ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE INDEX i1_FTDispRuns ON pfuser01.FileTreeDispositionRuns(ftdrProjId, ftdrTaskType) ON ZL_APP_INDEX
GO
CREATE INDEX i2_FTDispRuns ON pfuser01.FileTreeDispositionRuns(ftdrTaskType, ftdrStatus) ON ZL_APP_INDEX
GO

