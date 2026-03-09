CREATE TABLE pfuser.ZLDUAL (
id	INT NOT NULL,
CONSTRAINT pk_zldual PRIMARY KEY (id)
)
GO

INSERT INTO pfuser.ZLDUAL (id) VALUES (1)




CREATE TABLE pfuser.ArchiveStorageProject (
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
	CONSTRAINT pk_AstorProj PRIMARY KEY (aspProjId),
	CONSTRAINT uk3_AstorProj UNIQUE (aspTenantId,aspName)
--,
--	CONSTRAINT fk_AstorProjZLPUser FOREIGN KEY (aspZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_AstorProjAs FOREIGN KEY (aspAsId) REFERENCES pfuser.ArchiveServer(asId) ON DELETE CASCADE
)
GO
CREATE INDEX i1_AstorProj ON pfuser.ArchiveStorageProject(aspZlpUserId)
GO
	CREATE INDEX i2_AstorProj ON pfuser.ArchiveStorageProject(aspAsId)
GO
	


CREATE SEQUENCE pfuser.ArchivePointFolderSync_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser.ArchivePointFolderSync (
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
	CONSTRAINT pk_apfs PRIMARY KEY (apfsId),
--	CONSTRAINT fk_apfs FOREIGN KEY (apfsProjId) REFERENCES pfuser.ArchiveStorageProject(aspProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_apfsParent FOREIGN KEY (apfsParentId) REFERENCES pfuser.ArchivePointFolderSync(apfsId) ON DELETE CASCADE,
	CONSTRAINT uk_apfs UNIQUE (apfsProjId,apfsParentId,apfsName)
)
GO

CREATE TABLE pfuser.ArchivePointFolderProp (
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
	CONSTRAINT pk_ApFldrProp PRIMARY KEY (apfpProjId,apfpFsId,apfpSeqNumber)
)
GO




CREATE TABLE pfuser.ArchivePointEntrySync (
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
	CONSTRAINT pk2_apes PRIMARY KEY (apesProjId,apesUnid),
--	CONSTRAINT fk_apesProj FOREIGN KEY (apesProjId) REFERENCES pfuser.ArchiveStorageProject(aspProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_apesFldr FOREIGN KEY (apesFolderId) REFERENCES pfuser.ArchivePointFolderSync(apfsId) ON DELETE CASCADE,
--	CONSTRAINT fk_apesItem FOREIGN KEY (apesStorItemId) REFERENCES pfuser.StorageItem(storItemId) ON DELETE CASCADE,
	CONSTRAINT uk_apes UNIQUE (apesProjId,apesFolderId,apesName)
)
GO
CREATE INDEX i2_apes ON pfuser.ArchivePointEntrySync(apesStorItemId)
GO






CREATE TABLE pfuser.ArchivePointEntryAuditTrail (
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
GO


CREATE INDEX i1_APEudTrail ON pfuser.ArchivePointEntryAuditTrail(apeaDate)
GO
CREATE INDEX i2_APEudTrail ON pfuser.ArchivePointEntryAuditTrail(apeaProjId)
GO
CREATE INDEX i3_APEudTrail ON pfuser.ArchivePointEntryAuditTrail(apeaDomainId)
GO
CREATE INDEX i4_APEudTrail ON pfuser.ArchivePointEntryAuditTrail(apeaUnid)
GO
CREATE INDEX i5_APEudTrail ON pfuser.ArchivePointEntryAuditTrail(apeaFolderId)
GO







CREATE SEQUENCE pfuser.FileAgentRuns_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.FileAgentRuns (
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
--	CONSTRAINT fk_fasr FOREIGN KEY (fasrProjId) REFERENCES pfuser.ArchiveStorageProject(aspProjId) ON DELETE CASCADE
)
GO
CREATE INDEX i1_fasr ON pfuser.FileAgentRuns(fasrStartDate)
GO
CREATE INDEX i2_fasr ON pfuser.FileAgentRuns(fasrProjId,fasrStartDate)
GO



CREATE SEQUENCE pfuser.APUsage_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.ArchivePointUsage (
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
	CONSTRAINT pk_apUsage PRIMARY KEY (apuProjId)
)
GO
CREATE INDEX i1_apUsage ON pfuser.ArchivePointUsage(apuMailServerId)
GO

CREATE TABLE pfuser.ArchivePointUsageHistory (
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
	CONSTRAINT pk_apUsageHis PRIMARY KEY (apuProjId,apuIter)
)
GO
CREATE INDEX i1_apUsageHis ON pfuser.ArchivePointUsageHistory(apuMailServerId,apuIter)
GO


CREATE TABLE pfuser.ArchiveRepositoryInfo (	
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
	CONSTRAINT pk_ari PRIMARY KEY (ariAmsId,ariName)
)
GO

CREATE SEQUENCE pfuser.ArchiveStorageProjectCrawlState_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.ArchiveStorageProjectCrawlState (
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
	CONSTRAINT pk_aspc PRIMARY KEY (aspcId)
)
GO
CREATE INDEX i1_aspc ON pfuser.ArchiveStorageProjectCrawlState(aspcProjId)
GO
CREATE INDEX i2_aspc ON pfuser.ArchiveStorageProjectCrawlState(aspcProjId, aspcStatus)
GO
