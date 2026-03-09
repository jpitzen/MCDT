CREATE TABLE pfuser01.ZLDUAL (
id	INT NOT NULL,
CONSTRAINT pk_zldual PRIMARY KEY (id) ON ZL_APP_INDEX
) ON ZL_APP
GO

INSERT INTO pfuser01.ZLDUAL (id) VALUES (1)




CREATE TABLE pfuser01.ArchiveStorageProject (
	aspProjId		INT NOT NULL,
	aspMailServerId INT NOT NULL,
	aspZlpUserId		INT NOT NULL,
	aspType			INT NOT NULL,
	aspAsId			INT NOT NULL,
	aspTenantId INT NOT NULL,
	aspName			NVARCHAR(255) NOT NULL,
	aspDisplayName		NVARCHAR(255) NOT NULL,
	aspTransportKey		VARCHAR(255) NOT NULL,
	aspStoreInfo		NVARCHAR(255) NULL,
	aspCreateDate		DATETIME NOT NULL,
	aspLastUpdate		DATETIME NOT NULL,
	aspAllowVersioning CHAR(1) NOT NULL,
	aspVal1			NVARCHAR(255) NULL,
	aspVal2			NVARCHAR(255) NULL,
	aspVal3			NVARCHAR(255) NULL,
	aspVal4			NVARCHAR(255) NULL,
	aspVal5			NVARCHAR(255) NULL,
	aspVal6			NVARCHAR(255) NULL,
	aspVal7			NVARCHAR(255) NULL,
	aspVal8			NVARCHAR(255) NULL,
	CONSTRAINT pk_AstorProj PRIMARY KEY (aspProjId) ON ZL_APP_INDEX,
	CONSTRAINT uk3_AstorProj UNIQUE (aspTenantId,aspName) ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_AstorProjZLPUser FOREIGN KEY (aspZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_AstorProjAs FOREIGN KEY (aspAsId) REFERENCES pfuser01.ArchiveServer(asId) ON DELETE CASCADE
) ON ZL_APP
GO
CREATE INDEX i1_AstorProj ON pfuser01.ArchiveStorageProject(aspZlpUserId) ON ZL_APP_INDEX
GO
	CREATE INDEX i2_AstorProj ON pfuser01.ArchiveStorageProject(aspAsId) ON ZL_APP_INDEX
GO
	


CREATE SEQUENCE pfuser01.ArchivePointFolderSync_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser01.ArchivePointFolderSync (
	apfsId	INT NOT NULL,
	apfsProjId	INT NOT NULL,
	-- //MSSQL{[NVARCHAR2(255) NOT NULL~~NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL]}
	apfsName	NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL,
	apfsDisplayName NVARCHAR(255) NULL,
	apfsParentId	INT NOT NULL,
	apfsFlags	INT NOT NULL,
	apfsCreateDate	DATETIME NOT NULL,
	apfsLastUpdate	DATETIME NOT NULL,
	apfsSyncDate DATETIME NULL,
	apfsCommitDate	DATETIME NULL,
	apfsDeletedOnFileServer CHAR(1) NOT NULL,
	apfsCollectRunId	INT NULL,
	apfsCollectSuccRunId	INT NULL,
	apfsScanRunId	INT NULL,
	apfsScanSuccRunId	INT NULL,
	CONSTRAINT pk_apfs PRIMARY KEY (apfsId) ON ZL_ARCHIVEPOINT_INDEX,
--	CONSTRAINT fk_apfs FOREIGN KEY (apfsProjId) REFERENCES pfuser01.ArchiveStorageProject(aspProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_apfsParent FOREIGN KEY (apfsParentId) REFERENCES pfuser01.ArchivePointFolderSync(apfsId) ON DELETE CASCADE,
	CONSTRAINT uk_apfs UNIQUE (apfsProjId,apfsParentId,apfsName) ON ZL_ARCHIVEPOINT_INDEX
) ON ZL_ARCHIVEPOINT
GO

CREATE TABLE pfuser01.ArchivePointFolderProp (
	apfpFsId INT NOT NULL,
	apfpProjId INT NOT NULL,
	apfpSeqNumber		INT NOT NULL,
	apfpNext			CHAR(1) NOT NULL,
	apfpVal1			NVARCHAR(255) NULL,
	apfpVal2			NVARCHAR(255) NULL,
	apfpVal3			NVARCHAR(255) NULL,
	apfpVal4			NVARCHAR(255) NULL,
	apfpVal5			NVARCHAR(255) NULL,
	apfpVal6			NVARCHAR(255) NULL,
	apfpVal7			NVARCHAR(255) NULL,
	apfpVal8			NVARCHAR(255) NULL,
	CONSTRAINT pk_ApFldrProp PRIMARY KEY (apfpProjId,apfpFsId,apfpSeqNumber)  ON ZL_ARCHIVEPOINT_INDEX
) ON ZL_ARCHIVEPOINT
GO




CREATE TABLE pfuser01.ArchivePointEntrySync (
	apesProjId	INT NOT NULL,
	apesStorItemId	BIGINT NOT NULL,
	-- //MSSQL{[VARCHAR2(255) NOT NULL~~VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL]}
	apesUnid	VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL,
	apesFolderId	INT NOT NULL,
	-- //MSSQL{[NVARCHAR2(255) NOT NULL~~NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL]}
	apesName	NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL,
	apesDisplayName NVARCHAR(255) NULL,
	apesType	NVARCHAR(255) NULL,
	apesFlags	INT NOT NULL,
	apesFileCreateDate	DATETIME NOT NULL,
	apesFileLastUpdate	DATETIME NOT NULL,
	apesFileLastAccess	DATETIME NULL,
	apesCreateDate	DATETIME NOT NULL,
	apesUpdate	DATETIME NOT NULL,	
	apesSyncDate	DATETIME NULL,	
	apesLastIter	INT NOT NULL,
	apesLastAction	INT NOT NULL,
	-- //MSSQL{[VARCHAR2(255) NULL~~VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NULL]}
	apesDigest	VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NULL,
	apesDeletedOnFileServer CHAR(1) NOT NULL,
	apesSizeOrig	BIGINT NOT NULL,
	apesSizeCurrent	BIGINT NOT NULL,
	apesArchiveRetry	INT  NULL,
	apesStubRetry	INT  NULL,
	apesCategory    NVARCHAR(255) NULL,
	apesVal1	NVARCHAR(255) NULL,
	apesVal2	NVARCHAR(255) NULL,
	apesVal3	NVARCHAR(255) NULL,
	apesVal4	NVARCHAR(255) NULL,
	apesVal5	NVARCHAR(255) NULL,
	apesVal6	NVARCHAR(255) NULL,
	apesVal7	NVARCHAR(255) NULL,
	apesVal8	NVARCHAR(255) NULL,
	CONSTRAINT pk2_apes PRIMARY KEY (apesProjId,apesUnid) ON ZL_ARCHIVEPOINT_INDEX,
--	CONSTRAINT fk_apesProj FOREIGN KEY (apesProjId) REFERENCES pfuser01.ArchiveStorageProject(aspProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_apesFldr FOREIGN KEY (apesFolderId) REFERENCES pfuser01.ArchivePointFolderSync(apfsId) ON DELETE CASCADE,
--	CONSTRAINT fk_apesItem FOREIGN KEY (apesStorItemId) REFERENCES pfuser01.StorageItem(storItemId) ON DELETE CASCADE,
	CONSTRAINT uk_apes UNIQUE (apesProjId,apesFolderId,apesName) ON ZL_ARCHIVEPOINT_INDEX
) ON ZL_ARCHIVEPOINT
GO
CREATE INDEX i2_apes ON pfuser01.ArchivePointEntrySync(apesStorItemId) ON ZL_ARCHIVEPOINT_INDEX
GO






CREATE TABLE pfuser01.ArchivePointEntryAuditTrail (
	apeaAction	INT NOT NULL,
	apeaDate		DATETIME NOT NULL,	
	apeaUnid	VARCHAR(255) NULL,
	apeaFolderId	INT NOT NULL,
	apeaProjId	INT NOT NULL,
	apeaUser		NVARCHAR(255) NOT NULL,	
	apeaDomainId	INT NOT NULL,
	apeaTenantId INT NOT NULL,	
	apeaTxnId		VARCHAR(64) NOT NULL,
	apeaClearanceLevel	INT NOT NULL,
	apeaSourceIP 	VARCHAR(64) NULL,
	apeaDestIP   	VARCHAR(64) NULL,
	apeaAccessType 	VARCHAR(128) NULL,
	apeaZViteStId 	VARCHAR(255) NULL,
	apeaComments	NVARCHAR(255) NULL,
	apeaVal1 	NVARCHAR(255) NULL,
	apeaVal2 	NVARCHAR(255) NULL,
	apeaVal3 	NVARCHAR(255) NULL,
	apeaVal4 	NVARCHAR(255) NULL,
	apeaVal5 	NVARCHAR(255) NULL
)
ON ZL_ITEM
GO


CREATE INDEX i1_APEudTrail ON pfuser01.ArchivePointEntryAuditTrail(apeaDate) ON ZL_ITEM_INDEX
GO
CREATE INDEX i2_APEudTrail ON pfuser01.ArchivePointEntryAuditTrail(apeaProjId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i3_APEudTrail ON pfuser01.ArchivePointEntryAuditTrail(apeaDomainId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i4_APEudTrail ON pfuser01.ArchivePointEntryAuditTrail(apeaUnid) ON ZL_ITEM_INDEX
GO
CREATE INDEX i5_APEudTrail ON pfuser01.ArchivePointEntryAuditTrail(apeaFolderId) ON ZL_ITEM_INDEX
GO







CREATE SEQUENCE pfuser01.FileAgentRuns_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.FileAgentRuns (
	fasrId	INT NOT NULL,
	fasrProjId INT NOT NULL,
	fasrType		NVARCHAR(64) NOT NULL,
	fasrAgentRunId INT NULL,
        fasrStartDate	DATETIME NOT NULL,
	fasrEndDate	DATETIME NULL,
        fasrUpdate	DATETIME NOT NULL,
        fasrFound 	INT NULL,
        fasrExamined 	INT NULL,
        fasrArchiveInitiate INT NULL,
	fasrStubInitiate	INT NULL,
	fasrPrevArchived INT NULL,
	fasrPrevStubbed INT NULL,
	fasrDeleted 	INT NULL,
	fasrEdited	INT NULL,
	fasrCrawlState	NVARCHAR(255) NULL,
	fasrStatusMessage	NVARCHAR(255) NULL
--,
--	CONSTRAINT fk_fasr FOREIGN KEY (fasrProjId) REFERENCES pfuser01.ArchiveStorageProject(aspProjId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO
CREATE INDEX i1_fasr ON pfuser01.FileAgentRuns(fasrStartDate) ON ZL_TRANSIENT_INDEX
GO
CREATE INDEX i2_fasr ON pfuser01.FileAgentRuns(fasrProjId,fasrStartDate) ON ZL_TRANSIENT_INDEX
GO



CREATE SEQUENCE pfuser01.APUsage_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.ArchivePointUsage (
	apuProjId	INT NOT NULL,
	apuZlpUserId	INT NOT NULL,
	apuDate 	DATETIME NOT NULL,
	apuAsId		INT NOT NULL,
	apuTenantId INT NOT NULL,
	apuMailServerId	INT NOT NULL,
	apuIter		INT NOT NULL,
	apuDiscoveredCount INT NOT NULL,
	apuArchivedInitCount INT NOT NULL,
	apuArchivedCount INT NOT NULL,
	apuSyncIndexInitCount INT NOT NULL,
	apuSyncIndexCount INT NOT NULL,
	apuStubbedInitCount INT NOT NULL,
	apuStubbedCount INT NOT NULL,	
	apuRestoreCount INT NOT NULL,
	apuTotalCount INT NOT NULL,
	apuOrigSizeKB BIGINT NOT NULL,
	apuSizeChargedKB BIGINT NOT NULL,
	apuStubbedSizeKB BIGINT NOT NULL,
	apuZLItemCount	INT NOT NULL,
	apuZLItemSizeKB 	BIGINT NOT NULL,
	apuDeletedCount	INT NOT NULL,		
	apuRestubCount INT NOT NULL,	
	CONSTRAINT pk_apUsage PRIMARY KEY (apuProjId) ON ZL_ARCHIVEPOINT_INDEX
) ON ZL_ARCHIVEPOINT
GO
CREATE INDEX i1_apUsage ON pfuser01.ArchivePointUsage(apuMailServerId) ON ZL_ARCHIVEPOINT_INDEX
GO

CREATE TABLE pfuser01.ArchivePointUsageHistory (
	apuProjId	INT NOT NULL,
	apuZlpUserId	INT NOT NULL,
	apuDate 	DATETIME NOT NULL,
	apuAsId		INT NOT NULL,
	apuTenantId INT NOT NULL,
	apuMailServerId	INT NOT NULL,
	apuIter		INT NOT NULL,
	apuDiscoveredCount INT NOT NULL,
	apuArchivedInitCount INT NOT NULL,
	apuArchivedCount INT NOT NULL,
	apuSyncIndexInitCount INT NOT NULL,
	apuSyncIndexCount INT NOT NULL,
	apuStubbedInitCount INT NOT NULL,
	apuStubbedCount INT NOT NULL,	
	apuRestoreCount INT NOT NULL,
	apuTotalCount INT NOT NULL,
	apuOrigSizeKB BIGINT NOT NULL,
	apuSizeChargedKB BIGINT NOT NULL,
	apuStubbedSizeKB BIGINT NOT NULL,
	apuZLItemCount	INT NOT NULL,
	apuZLItemSizeKB 	BIGINT NOT NULL,
	apuDeletedCount	INT NOT NULL,		
	apuRestubCount INT NOT NULL,	
	CONSTRAINT pk_apUsageHis PRIMARY KEY (apuProjId,apuIter) ON ZL_ARCHIVEPOINT_INDEX
) ON ZL_ARCHIVEPOINT
GO
CREATE INDEX i1_apUsageHis ON pfuser01.ArchivePointUsageHistory(apuMailServerId,apuIter) ON ZL_ARCHIVEPOINT_INDEX
GO


CREATE TABLE pfuser01.ArchiveRepositoryInfo (	
	ariAmsId	INT NOT NULL,
	ariTenantId	INT NOT NULL,
	ariName	NVARCHAR(255) NOT NULL,
	ariAspId	INT NOT NULL,
	ariOwner	NVARCHAR(255) NULL,
	ariPwdHash	VARCHAR(255) NULL,
	ariCreateDate	DATETIME NOT NULL,
	ariUpdateDate	DATETIME NOT NULL,
	ariPropVal1	NVARCHAR(255) NULL,
	ariPropVal2	NVARCHAR(255) NULL,
	ariPropVal3	NVARCHAR(255) NULL,
	ariPropVal4	NVARCHAR(255) NULL,
	ariPropVal5	NVARCHAR(255) NULL,
	ariPropVal6	NVARCHAR(255) NULL,
	ariPropVal7	NVARCHAR(255) NULL,
	ariPropVal8	NVARCHAR(255) NULL,
	CONSTRAINT pk_ari PRIMARY KEY (ariAmsId,ariName) ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE SEQUENCE pfuser01.ArchiveStorageProjectCrawlState_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.ArchiveStorageProjectCrawlState (
	aspcId	            INT NOT NULL,
	aspcProjId           INT NOT NULL,
	aspcType		        VARCHAR(64) NOT NULL,
    aspcCreateDate	    DATETIME NOT NULL,
	aspcEndDate	        DATETIME NULL,
    aspcLastUpdate	    DATETIME NOT NULL,
	aspcNumRetry	        INT NULL,
	aspcStatus	        INT NOT NULL,
	aspcVal1 	        NVARCHAR(255) NULL,
	aspcVal2 	        NVARCHAR(255) NULL,
	aspcVal3 	        NVARCHAR(255) NULL,
	aspcVal4 	        NVARCHAR(255) NULL,
	CONSTRAINT pk_aspc PRIMARY KEY (aspcId) ON ZL_APP_INDEX
) ON ZL_TRANSIENT
GO
CREATE INDEX i1_aspc ON pfuser01.ArchiveStorageProjectCrawlState(aspcProjId) ON ZL_APP_INDEX
GO
CREATE INDEX i2_aspc ON pfuser01.ArchiveStorageProjectCrawlState(aspcProjId, aspcStatus) ON ZL_APP_INDEX
GO

