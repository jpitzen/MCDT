CREATE TABLE pfuser01.RemoteSearchHost (
	rshName VARCHAR(10) NOT NULL,
	rshUri VARCHAR(255) NOT NULL,
	rshAsId	INT NOT NULL,
	rshCreateDate DATETIME NULL,
	rshKeyVal1			NVARCHAR(255) NULL,
	rshKeyVal2			NVARCHAR(255) NULL,
	rshKeyVal3			NVARCHAR(255) NULL,
	rshKeyVal4			NVARCHAR(255) NULL,
	rshKeyVal5			NVARCHAR(255) NULL,
	rshKeyVal6			NVARCHAR(255) NULL,
	rshKeyVal7			NVARCHAR(255) NULL,
	rshKeyVal8			NVARCHAR(255) NULL,
	CONSTRAINT pk_RemoteSearchHost PRIMARY KEY (rshName) ON ZL_APP_INDEX
) ON ZL_APP
GO




CREATE TABLE pfuser01.EntitySearchStore (
	essId	 INT NOT NULL,
	essType VARCHAR(64) NOT NULL,
	essTenantId INT NOT NULL,
	essStoreName VARCHAR(255) NOT NULL,
	essFederated CHAR(1) NULL,
	essRshName   VARCHAR(10) NULL,
	essRshStoreName VARCHAR(255) NULL,
	CONSTRAINT pk_EntitySrchStor PRIMARY KEY (essId,essType) ON ZL_APP_INDEX 
--,
--	CONSTRAINT fk_EntitySrchStor FOREIGN KEY (essRshName) REFERENCES pfuser01.RemoteSearchHost(rshName) ON DELETE CASCADE
) ON ZL_APP
GO

CREATE INDEX i1_EntitySrchStor ON pfuser01.EntitySearchStore(essType) ON ZL_APP_INDEX
GO
CREATE INDEX i2_EntitySrchStor ON pfuser01.EntitySearchStore(essTenantId,essStoreName) ON ZL_APP_INDEX
GO

-- OPTIONAL
CREATE SEQUENCE pfuser01.FederationSecurity_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.FederationSecurity (
	-- IDENTITY
	fsId BIGINT NOT NULL,
	fsClientName VARCHAR(255) NOT NULL,
	fsKey	VARCHAR(255)  NULL,
	fsEnable CHAR(1) NULL,
	fsCreateDate DATETIME NULL,
	fsVal1			NVARCHAR(255) NULL,
	fsVal2			NVARCHAR(255) NULL,
	fsVal3			NVARCHAR(255) NULL,
	fsVal4			NVARCHAR(255) NULL,
	fsVal5			NVARCHAR(255) NULL,
	CONSTRAINT pk2_FedSecurity PRIMARY KEY (fsId) ON ZL_APP_INDEX,
	CONSTRAINT uk_FedSecurity UNIQUE (fsClientName) ON ZL_APP_INDEX
) ON ZL_APP
GO



-- OPTIONAL
CREATE SEQUENCE pfuser01.SearchStore_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.SearchStore (
	-- IDENTITY
	ssId			BIGINT NOT NULL,
	ssEssId			INT NOT NULL,
	ssEssType			VARCHAR(64) NOT NULL,
	ssAppId			INT NOT NULL,
	ssCreateDate	DATETIME NOT NULL,
	ssVal1			NVARCHAR(255) NULL,
	ssVal2			NVARCHAR(255) NULL,
	ssVal3			NVARCHAR(255) NULL,
	ssVal4			NVARCHAR(255) NULL,
	ssVal5			NVARCHAR(255) NULL,
	CONSTRAINT pk_SearchStore PRIMARY KEY (ssId) ON ZL_APP_INDEX,
--	CONSTRAINT fk_SearchStore FOREIGN KEY (ssEssId, ssEssType) REFERENCES pfuser01.EntitySearchStore(essId,essType) ON DELETE CASCADE,
	CONSTRAINT uk_SearchStore UNIQUE (ssEssId,ssEssType) ON ZL_APP_INDEX 
) ON ZL_APP
GO



CREATE SEQUENCE pfuser01.SearchInstance_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser01.SearchStoreInstance (
	ssiId			INT NOT NULL,
	ssiStoreId		INT NOT NULL,
	ssiPeriod	VARCHAR(64) NOT NULL,	
	ssiPeriodStart	DATETIME NOT NULL,
	ssiPeriodEnd	DATETIME NOT NULL,
	ssiPrefix		VARCHAR(10) NOT NULL,
	ssiCreateDate	DATETIME NOT NULL,
	ssiToMergeDate	DATETIME NULL,
 	ssiState		INT NULL,
 	ssiDocCount 	INT NULL,
	ssiOrigMasterId		INT NOT NULL,
	ssiPartitionTemp  CHAR(1) NOT NULL,
	ssiTempExclusiveProcess	NVARCHAR(255) NULL,
 	ssiDeleted	CHAR(1) NOT NULL,
	ssiVerified	CHAR(1) NULL,
	ssiVerifySig	VARCHAR(255) NULL,
	CONSTRAINT pk_SrchStorInst PRIMARY KEY (ssiId) ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_SrchStorInst FOREIGN KEY (ssiStoreId) REFERENCES pfuser01.SearchStore(ssId) ON DELETE CASCADE
) ON ZL_APP
GO

CREATE INDEX i3_SrchStorInst ON pfuser01.SearchStoreInstance(ssiStoreId,ssiPeriod,ssiPeriodStart) ON ZL_APP_INDEX
GO
CREATE INDEX i4_SrchStorInst ON pfuser01.SearchStoreInstance(ssiStoreId,ssiPeriod,ssiCreateDate) ON ZL_APP_INDEX
GO
CREATE INDEX i5_SrchStorInst ON pfuser01.SearchStoreInstance(ssiToMergeDate,ssiDeleted) ON ZL_APP_INDEX
GO

CREATE SEQUENCE pfuser01.InstanceDataFiles_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.InstanceDataFiles (
	idfId			INT NOT NULL,
	idfFileName		VARCHAR(255) NOT NULL,
	idfInstanceId	INT NOT NULL,
	idfFormat	VARCHAR(255) NULL,
	idfVaultId		VARCHAR(128) NOT NULL,
	idfDateCreate		DATETIME NOT NULL,
	idfDateUpdate		DATETIME NOT NULL,
	idfDeleted		CHAR(1) NOT NULL,
	CONSTRAINT pk_InstDataFiles PRIMARY KEY (idfId)
	ON ZL_APP_INDEX,
--	CONSTRAINT fk_InstDataFiles FOREIGN KEY (idfInstanceId) REFERENCES pfuser01.SearchStoreInstance(ssiId) ON DELETE CASCADE,
--	CONSTRAINT fk_InstDataFilesVa FOREIGN KEY (idfVaultId) REFERENCES pfuser01.VaultItem(viStId) ON DELETE CASCADE,
	CONSTRAINT uk_InstDataFiles UNIQUE (idfFileName,idfInstanceId) ON ZL_APP_INDEX 
) ON ZL_APP
GO

-- OPTIONAL
CREATE INDEX i1_InstDataFiles ON pfuser01.InstanceDataFiles(idfInstanceId) ON ZL_APP_INDEX
GO


CREATE TABLE pfuser01.InstanceMergeDetails (
	mdSsiId			INT NOT NULL,
	mdStoreId		INT NOT NULL,
	mdTempssiId		INT NOT NULL,
	mdMergeType		INT NOT NULL,
	mdState 		INT NOT NULL,
	mdRetry  		INT NULL,
	mdToMergeDate		DATETIME NOT NULL,
	mdDate			DATETIME NOT NULL,
	mdSegMergeJobId INT NULL,
	CONSTRAINT pk_InstMrgDet PRIMARY KEY (mdSsiId,mdTempssiId) ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_InstMrgDetStore FOREIGN KEY (mdStoreId) REFERENCES pfuser01.SearchStore(ssId) ON DELETE CASCADE,
--	CONSTRAINT fk_InstMrgDetInst FOREIGN KEY (mdSsiId) REFERENCES pfuser01.SearchStoreInstance(ssiId) ON DELETE CASCADE,
--	CONSTRAINT fk_InstMrgDetTemp FOREIGN KEY (mdTempssiId) REFERENCES pfuser01.SearchStoreInstance(ssiId) ON DELETE CASCADE
) ON ZL_APP
GO
CREATE INDEX i2_InstMrgDet ON pfuser01.InstanceMergeDetails(mdStoreId,mdState) ON ZL_APP_INDEX
GO
CREATE INDEX i3_InstMrgDet ON pfuser01.InstanceMergeDetails(mdSsiId,mdSegMergeJobId) ON ZL_APP_INDEX
GO







	

CREATE SEQUENCE pfuser01.InstanceSnapShot_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.InstanceSnapshot (
	snpId 	INT NOT NULL,
	snpSsiId	    INT NOT NULL,
	snpPeriodGen	VARCHAR(64) NOT NULL,	
	snpDateCreate 	DATETIME NOT NULL,
	snpDocCount INT NOT NULL,
	CONSTRAINT pk_instSnaps PRIMARY KEY (snpId) ON ZL_APP_INDEX,
--	CONSTRAINT fk_instSnaps FOREIGN KEY (snpSsiId) REFERENCES pfuser01.SearchStoreInstance(ssiId) ON DELETE CASCADE,
	CONSTRAINT uk_instSnaps UNIQUE (snpSsiId,snpPeriodGen) ON ZL_APP_INDEX
) ON ZL_APP
GO



CREATE TABLE pfuser01.InstanceSnapshotSegments (
	segSnpId 	INT NOT NULL,
	segName	    VARCHAR(64) NOT NULL,
	segIdfID	INT NOT NULL,
	segDocCount	INT NOT NULL,	
	CONSTRAINT pk_inSnSeg PRIMARY KEY (segSnpId,segName) ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_inSnSegInst FOREIGN KEY (segSnpId) REFERENCES pfuser01.InstanceSnapshot(snpId) ON DELETE CASCADE,
--	CONSTRAINT fk_inSnSegIdf FOREIGN KEY (segIdfID) REFERENCES pfuser01.InstanceDataFiles(idfId) ON DELETE CASCADE
)  ON ZL_APP
GO
-- OPTIONAL
CREATE INDEX i1_inSnSeg ON pfuser01.InstanceSnapshotSegments(segIdfID) ON ZL_APP_INDEX
GO


CREATE TABLE pfuser01.SegmentMergeDetails (
	smdSsiId			INT NOT NULL,
	smdSegName			 VARCHAR(64) NOT NULL,
	smdDocCount	INT NOT NULL,
	smdDate			DATETIME NOT NULL,
	smdTempType	INT NOT NULL,
	smdTempSegName	VARCHAR(64) NOT NULL,
	smdTempSsiId	INT NULL,
	smdCodec	NVARCHAR(255),
	smdVal1		NVARCHAR(255),
	smdVal2		NVARCHAR(255),
	smdVal3		NVARCHAR(255),
	smdVal4		NVARCHAR(255),
	CONSTRAINT pk_SegMrgDet PRIMARY KEY (smdSsiId,smdSegName,smdTempType,smdTempSegName) ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_SegMrgDet FOREIGN KEY (smdSsiId) REFERENCES pfuser01.SearchStoreInstance(ssiId) ON DELETE CASCADE
) ON ZL_APP
GO


CREATE SEQUENCE pfuser01.SegmentMergeJob_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.SegmentMergeJob (
  smjId INT NOT NULL,
  smjSsiId INT NOT NULL,
  smjStoreId INT NOT NULL,
  smjSegName VARCHAR(64) NOT NULL,
  smjType INT NOT NULL,
  smjCreateDate			DATETIME NOT NULL,
  smjState INT NOT NULL,
  smjTempVal1 NVARCHAR(255),
  smjTempVal2 NVARCHAR(255),
  smjTempVal3 NVARCHAR(255),
  smjTempVal4 NVARCHAR(255),
  smjDocCount	INT NULL,
  smjRetry		INT NULL,
  smjStartDate	DATETIME NULL,
  smjEndDate	DATETIME NULL,
  smjVaultId		VARCHAR(128) NULL,
  smjResultVal1 NVARCHAR(255),
  smjResultVal2 NVARCHAR(255),
  smjResultVal3 NVARCHAR(255),
  smjResultVal4 NVARCHAR(255),
  CONSTRAINT pk_SegMrgJob PRIMARY KEY (smjId) ON ZL_APP_INDEX,
  CONSTRAINT uk_SegMrgJob UNIQUE (smjSsiId,smjSegName) ON ZL_APP_INDEX
  ) ON ZL_APP
GO


	
CREATE TABLE pfuser01.SearchPartition (
	spStoreId	INT NOT NULL,
	spInstanceId	INT NOT NULL,
	spCreateDate	DATETIME NOT NULL,
	spClusterName	NVARCHAR(255) NOT NULL,
	spMachine	NVARCHAR(255) NULL,
	spProcessName	NVARCHAR(255) NOT NULL,
	spCacheTimeoutMin INT NULL,
	spReloadBeginTimeOffsetMin  INT NULL,
	spReloadEndTimeOffsetMin  INT NULL,
	CONSTRAINT pk_srchPart PRIMARY KEY (spStoreId, spInstanceId) ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_srchPartStore FOREIGN KEY (spStoreId) REFERENCES pfuser01.SearchStore(ssId) ON DELETE CASCADE,
--	CONSTRAINT fk_srchPartInst FOREIGN KEY (spInstanceId) REFERENCES pfuser01.SearchStoreInstance(ssiId) ON DELETE CASCADE
) ON ZL_APP
GO

CREATE TABLE pfuser01.IndexDocRetry (
	docPrimaryId	NVARCHAR(255) NOT NULL,
	docStoreId	INT NOT NULL,
	docSsiId	INT NOT NULL,
	docDateUpdate		DATETIME NOT NULL,
	docStatus	INT NULL,
	docNumTries	INT NOT NULL,	
	CONSTRAINT pk_idocr PRIMARY KEY (docPrimaryId,docSsiId) ON ZL_TRANSIENT_INDEX
--,
--	CONSTRAINT fk_idocrStore FOREIGN KEY (docStoreId) REFERENCES pfuser01.SearchStore(ssId) ON DELETE CASCADE,
--	CONSTRAINT fk_idocrInst FOREIGN KEY (docSsiId) REFERENCES pfuser01.SearchStoreInstance(ssiId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_idocrMsg FOREIGN KEY (docPrimaryId) REFERENCES pfuser01.ZLPMessage(MsgId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO

CREATE INDEX i2_idocr ON pfuser01.IndexDocRetry(docSsIid,docStatus,docDateUpdate) ON ZL_APP_INDEX
GO


CREATE TABLE pfuser01.IndexDocDelete (
	iddPrimaryId	NVARCHAR(255) NOT NULL,
	iddDuplicateOnly	CHAR(1) NOT NULL,
	iddStoreId	INT NOT NULL,
	iddInstanceId	INT NOT NULL,
	iddDate		DATETIME NOT NULL,
	CONSTRAINT pk_idd PRIMARY KEY (iddInstanceId,iddPrimaryId) ON ZL_TRANSIENT_INDEX
--,
--	CONSTRAINT fk_idd FOREIGN KEY (iddStoreId) REFERENCES pfuser01.SearchStore(ssId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO



CREATE SEQUENCE pfuser01.SearchEngineLoad_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.SearchEngineLoad (
	selId 	INT NOT NULL,
	selStoreId	INT NOT NULL,
	selInstanceId INT NOT NULL,
	selClusterName	NVARCHAR(255) NOT NULL,
	selMachine	NVARCHAR(255) NOT NULL,
	selLoadBeginDate DATETIME NULL,
	selLoadEndDate	DATETIME NULL,
	selDocCount BIGINT NULL,
	selVersion VARCHAR(64) NULL,
	selUnloadDate	DATETIME NULL,
	selUnloadLock	CHAR(1),
	selUnloadLockDate DATETIME NULL,
	selUnloadLockReason VARCHAR(255),
	selUnloadLockTimeout INT NULL,
        selLastUpdate DATETIME NULL,
	selFetchCount	INT NULL,
	selFetchDate 	DATETIME NULL,
   CONSTRAINT pk_srchEngLoad PRIMARY KEY (selId) ON ZL_TRANSIENT_INDEX
--,
--	CONSTRAINT fk_srchEngLoad FOREIGN KEY (selStoreId) REFERENCES pfuser01.SearchStore(ssId) ON DELETE CASCADE,
--	CONSTRAINT fk_srchEngLoad FOREIGN KEY (selInstanceId) REFERENCES pfuser01.SearchStoreInstance(ssiId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO




CREATE SEQUENCE pfuser01.BigDBStore_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.BigDBStore (
	bdsId			INT NOT NULL,
	bdsType			VARCHAR(64) NOT NULL,
	bdsRefId		INT NOT NULL,
	bdsRefStId		NVARCHAR(255) NOT NULL,
	bdsCreateDate	DATETIME NOT NULL,
	CONSTRAINT pk_BigDBStore PRIMARY KEY (bdsId) ON ZL_APP_INDEX,
	CONSTRAINT uk_BigDBStore UNIQUE (bdsType,bdsRefStId) ON ZL_APP_INDEX 
) ON ZL_APP
GO

CREATE INDEX i1_BigDBStore ON pfuser01.BigDBStore(bdsType,bdsRefId) ON ZL_APP_INDEX
GO



CREATE SEQUENCE pfuser01.BigDBSpace_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.BigDBSpace (
	spaceId			INT NOT NULL,
	spaceName		VARCHAR(255) NOT NULL,
	spaceDBId	INT NOT NULL,
	spaceVaultId	VARCHAR(128) NOT NULL,
	spaceFlags		BIGINT NOT NULL,
	spaceDateCreate	DATETIME NOT NULL,
	spaceDateUpdate	DATETIME NOT NULL,
	spaceDeleted	CHAR(1) NOT NULL,
	CONSTRAINT pk_BigDBSpace PRIMARY KEY (spaceId)	ON ZL_APP_INDEX,
	CONSTRAINT uk_BigDBSpace UNIQUE (spaceDBId,spaceName) ON ZL_APP_INDEX 
) ON ZL_APP
GO


CREATE TABLE pfuser01.BigDBParam (
	paramDBId		INT NOT NULL,
	paramSeqNumber		INT NOT NULL,
	paramNext		CHAR(1) NOT NULL,
	paramVal1		NVARCHAR(255) NULL,
	paramVal2		NVARCHAR(255) NULL,
	paramVal3		NVARCHAR(255) NULL,
	paramVal4		NVARCHAR(255) NULL,
	paramVal5		NVARCHAR(255) NULL,
	paramVal6		NVARCHAR(255) NULL,
	paramVal7		NVARCHAR(255) NULL,
	paramVal8		NVARCHAR(255) NULL,
	CONSTRAINT pk_bdbParam PRIMARY KEY (paramDBId,paramSeqNumber) ON ZL_APP_INDEX
) ON ZL_APP
GO


CREATE TABLE pfuser01.TextItemRetry (
	tiId		NVARCHAR(255) NOT NULL,
	tiType 		INT NOT NULL,
	tiTenant	INT NOT NULL,
	tiDate		DATETIME NOT NULL,
	tiDateUpdate DATETIME NOT NULL,
	tiStatus	INT NULL,
	tiNumTries	INT NOT NULL,	
	tiInfo		NVARCHAR(255) NULL,
	CONSTRAINT pk_textItemRetry PRIMARY KEY (tiId) ON ZL_TRANSIENT_INDEX
) ON ZL_TRANSIENT
GO


CREATE INDEX i1_TextItemRetry ON pfuser01.TextItemRetry(tiTenant,tiStatus,tiDate) ON ZL_TRANSIENT_INDEX
GO

