



-- *************************************************************************************
--	StorageProject
-- *************************************************************************************

-- OPTIONAL
CREATE SEQUENCE pfuser.StorageProject_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.StorageProject (
	-- IDENTITY
	StorProjId		BIGINT NOT NULL,
	storProjOwnerAcctNo	INT NOT NULL,
	StorProjDomainId	INT NOT NULL,
	StorProjTenantId INT NOT NULL,
	StorProjName	        NVARCHAR(255) NOT NULL,
	StorProjDisplayName	NVARCHAR(255) NOT NULL,
	StorProjType	INT NOT NULL,
	StorProjDefaultLanguage VARCHAR(10) NULL,
	StorProjAllowVersioning CHAR(1) NOT NULL,
	StorProjFlags 	INT NOT NULL,
	StorProjPrivilegeFlags	     INT NOT NULL,
	StorProjDeleted 	CHAR(1) NOT NULL,
	StorProjKey 	VARBINARY(128) NULL,
	CONSTRAINT pk_StorProj PRIMARY KEY(StorProjId),
	CONSTRAINT uk_StorProj UNIQUE (StorProjTenantId,StorProjName)
--,CONSTRAINT fk_StorProjDomain FOREIGN KEY (StorProjDomainId) REFERENCES pfuser.StorageDomainInfo(sdiId) ON DELETE CASCADE,
--	CONSTRAINT fk_StorProjAcctNo FOREIGN KEY (storProjOwnerAcctNo) REFERENCES pfuser.ZipAccount(zaAcctNo) ON DELETE CASCADE
)
GO

CREATE INDEX i1_StorProj ON pfuser.StorageProject(StorProjDomainId)
GO
CREATE INDEX i2_StorProj ON pfuser.StorageProject(storProjOwnerAcctNo)
GO


CREATE TABLE pfuser.StorageProjectPrivileges (
	sppProjId INT NOT NULL,
        sppPrivilegeFlags INT NOT NULL,
        sppProjAdminPriv CHAR(1) NOT NULL,
        sppEntityId INT NOT NULL,
	sppEntityType INT NOT NULL,
	CONSTRAINT uk_SPP UNIQUE (sppProjId,sppEntityId,sppEntityType)
--,
--	CONSTRAINT fk_SPP FOREIGN KEY (sppProjId) REFERENCES pfuser.StorageProject(StorProjId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_SPP ON pfuser.StorageProjectPrivileges(sppProjId)
GO
CREATE INDEX i2_SPP  ON pfuser.StorageProjectPrivileges(sppEntityType,sppEntityId)
GO




CREATE SEQUENCE pfuser.StorageFolder_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 5
GO


CREATE TABLE pfuser.StorageFolder (
        storFldrId INT NOT NULL,
        storFldrParentId INT NOT NULL,
        storFldrProjId INT NOT NULL,
	-- //MSSQL{[NVARCHAR2(255) NOT NULL~~NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL]}
        storFldrName	NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL,
        storFldrDisplayName NVARCHAR(255) NULL,
        storFldrDesc	NVARCHAR(255) NULL,
        storFldrType INT NOT NULL,
        storFldrSize  BIGINT NOT NULL,
        storFldrCount INT NOT NULL,
        storFldrCreateDate DATETIME NOT NULL,
        storFldrUpdateDate DATETIME NOT NULL,
        storFldrShared CHAR(1) NOT NULL,
		storFldrChangeNumber INT NOT NULL,
		storFldrVersionSize  BIGINT NOT NULL,
	CONSTRAINT pk_StorFoldr PRIMARY KEY (storFldrId),
	CONSTRAINT uk2_StorFoldr UNIQUE (storFldrProjId,storFldrParentId,storFldrName)
--,CONSTRAINT fk_StorFoldrProj FOREIGN KEY (storFldrProjId) REFERENCES pfuser.StorageProject(StorProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_StorFoldrParent FOREIGN KEY (storFldrParentId) REFERENCES pfuser.StorageFolder(storFldrId) ON DELETE CASCADE,
)
GO
-- Storage (initial 5M NEXT 5M MINEXTENTS 1 MAXEXTENTS 20 PCTINCREASE 33) 




CREATE TABLE pfuser.StorageFolderProp (
	sfpFldrId INT NOT NULL,
	sfpProjId INT NOT NULL,
	sfpSeqNumber		INT NOT NULL,
	sfpNext			CHAR(1) NOT NULL,
	sfpVal1			NVARCHAR(255) NULL,
	sfpVal2			NVARCHAR(255) NULL,
	sfpVal3			NVARCHAR(255) NULL,
	sfpVal4			NVARCHAR(255) NULL,
	sfpVal5			NVARCHAR(255) NULL,
	sfpVal6			NVARCHAR(255) NULL,
	sfpVal7			NVARCHAR(255) NULL,
	sfpVal8			NVARCHAR(255) NULL,
	CONSTRAINT pk_SFldrProp PRIMARY KEY (sfpProjId,sfpFldrId,sfpSeqNumber)
)
GO




CREATE SEQUENCE pfuser.StorageItem_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.StorageItem (
	storItemId	BIGINT NOT NULL,
	storItemVersion	BIGINT NOT NULL,
	storItemProjId INT NOT NULL,
    storItemUser VARCHAR(255) NULL,
	storItemFldrId INT NOT NULL,
	-- //MSSQL{[NVARCHAR2(255) NOT NULL~~NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL]}
    storItemName    NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL,
    storItemDisplayName NVARCHAR(255) NULL,
    storItemSize 	BIGINT NOT NULL,
    storItemChargedSize 	BIGINT NOT NULL,
	storItemVersionSize 	BIGINT NOT NULL,
    storItemType	INT NOT NULL,
    storItemFlags   INT NOT NULL,
    storItemCreateDate    DATETIME  NOT NULL,
	storItemProcessDate    DATETIME NOT NULL,
    storItemLastUpdate    DATETIME NOT NULL,
    storItemFileLastModified DATETIME NULL,
    storItemFileLastAccessed DATETIME NULL,
    storItemVaultItemId VARCHAR(128) NULL,
    storItemNotes   NVARCHAR(255) NULL,
	storItemCategory NVARCHAR(255) NULL,
 	storItemHashValue VARBINARY(32) NULL,
    storItemDeleted CHAR(1) NOT NULL,
    storItemEncPwd  VARBINARY(128) NULL,
    storItemLock   CHAR(1) NOT NULL,
    storItemLockingUser NVARCHAR(255) NULL,
    storItemMimeType NVARCHAR(128) NULL,
	storItemIsDownloadable CHAR(1) NOT NULL,
	storItemState INT NULL,
	storItemViewCount INT NOT NULL,
	storItemRetentionId INT NULL,
	storItemExpiryDate DATETIME NULL,
	storItemLegalHold	CHAR(1) NULL,
	storItemRecId			INT NULL,
	storItemRecCatId			INT NULL,
	storItemVersionLabel	NVARCHAR(255) NULL,
	storItemVersionMeta	NVARCHAR(255) NULL,
	storItemSource                   VARCHAR(255) NULL,
	CONSTRAINT pk_StorItem PRIMARY KEY(storItemId),
	CONSTRAINT uk_StorItem UNIQUE (storItemProjId,storItemFldrId,storItemName)
--,
--	CONSTRAINT fk_StorItemProj FOREIGN KEY (storItemProjId) REFERENCES pfuser.StorageProject(StorProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_StorItemFldr FOREIGN KEY (storItemFldrId) REFERENCES pfuser.StorageFolder(storFldrId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_StorItemVault FOREIGN KEY (storItemVaultItemId) REFERENCES pfuser.VaultItem(viStId) ON DELETE CASCADE
)
GO
-- STORAGE (INITIAL 125M NEXT 250M MINEXTENTS 1 MAXEXTENTS 30 PCTINCREASE 0)


CREATE INDEX i1_StorItem ON pfuser.StorageItem(storItemProjId,storItemFldrId)
GO
CREATE INDEX i2_StorItem ON pfuser.StorageItem(storItemVaultItemId)
GO


CREATE INDEX i5_StorItem ON pfuser.StorageItem(storItemProjId,storItemExpiryDate)
GO
CREATE INDEX i7_StorItem ON pfuser.StorageItem(storItemRetentionId,storItemCreateDate,storItemLegalHold,storItemId)
GO
CREATE INDEX i8_StorItem ON pfuser.StorageItem(storItemProcessDate)
GO
CREATE INDEX i9_StorItem ON pfuser.StorageItem(storItemProjId,storItemRecCatId)
GO


CREATE SEQUENCE pfuser.StorageItemVersion_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser.StorageItemVersion (
    sivVersion BIGINT NOT NULL,
	sivStorItemId	BIGINT NOT NULL,
	sivProjId 	INT NOT NULL,
    sivUser VARCHAR(255) NULL,
    sivNotes NVARCHAR(255) NULL,
	sivCategory NVARCHAR(255) NULL,
	sivFlags INT NOT NULL,
    sivDate DATETIME NOT NULL,
    sivDateProcess DATETIME NOT NULL,
    sivDateProcessOrig DATETIME NOT NULL,
    sivFileLastModified DATETIME NULL,
    sivFileLastAccessed DATETIME NULL,
    sivSize 	BIGINT NULL,
	sivChargedSize 	BIGINT NULL,
	sivVaultItemId VARCHAR(128) NULL,
 	sivHashValue VARBINARY(32) NULL,
	sivEncPwd VARBINARY(128) NULL,
    sivMimeType VARCHAR(128) NULL,
	sivRecId			INT NULL,
	sivRecCatId			INT NULL,
	sivVersionLabel	NVARCHAR(255) NULL,
	sivVersionMeta	NVARCHAR(255) NULL,
	sivSource       VARCHAR(255) NULL,
	CONSTRAINT pk_SIV PRIMARY KEY (sivStorItemId,sivVersion)
--,
--	CONSTRAINT fk_SIVProj FOREIGN KEY (sivProjId) REFERENCES pfuser.StorageProject(StorProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_SIVItem FOREIGN KEY (sivStorItemId) REFERENCES pfuser.StorageItem(storItemId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_SIVVault FOREIGN KEY (sivVaultItemId) REFERENCES pfuser.VaultItem(viStId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_StorItemVersion ON pfuser.StorageItemVersion(sivVaultItemId)
GO

CREATE INDEX i2_StorItemVersion ON pfuser.StorageItemVersion(sivProjId,sivRecCatId)
GO
CREATE INDEX i3_StorItemVersion ON pfuser.StorageItemVersion(sivDateProcessOrig)
GO


CREATE TABLE pfuser.StorageItemPart (
  	sipVersion BIGINT NOT NULL,
	sipStorItemId	BIGINT NOT NULL,
	sipProjId 	INT NOT NULL,
	sipVaultId                     VARCHAR(64) NOT NULL,
	sipEncMsgPwd                VARBINARY(128) NULL,
	sipSize                       INT  NOT NULL,
	CONSTRAINT pk_StorageItemPart PRIMARY KEY (sipProjId,sipStorItemId,sipVersion,sipVaultId)
)
GO
CREATE INDEX i1_StorItemPart ON pfuser.StorageItemPart(sipVaultId)
GO
 




CREATE TABLE pfuser.StorageItemSisHeader (
	sishItemId BIGINT NOT NULL,
	sishItemVersionId BIGINT NOT NULL,
	sishProjId INT NOT NULL,
	sishSeqNumber		INT NOT NULL,
	sishNext			CHAR(1) NOT NULL,
	sishVal1			NVARCHAR(255) NULL,
	sishVal2			NVARCHAR(255) NULL,
	sishVal3			NVARCHAR(255) NULL,
	sishVal4			NVARCHAR(255) NULL,
	sishVal5			NVARCHAR(255) NULL,
	sishVal6			NVARCHAR(255) NULL,
	sishVal7			NVARCHAR(255) NULL,
	sishVal8			NVARCHAR(255) NULL,
	CONSTRAINT pk_SishPriv PRIMARY KEY (sishProjId,sishItemId,sishItemVersionId,sishSeqNumber)
)
GO



CREATE TABLE pfuser.StorageAuditTrail (
	satAction INT NOT NULL,	
	satDate DATETIME NOT NULL,
	satItemId BIGINT NULL,
	satItemVersion BIGINT NULL,
	satFolderId INT NULL,
	satProjId INT NOT NULL,
	satProjDomainId INT NULL,
	satZlpUserId    INT NOT NULL,
	satUser NVARCHAR(255) NOT NULL,
	satDomainId	INT NOT NULL,
	satTenantId INT NOT NULL,
	satTxnId		VARCHAR(64) NOT NULL,
	satClearanceLevel	INT NOT NULL,
	satSourceIP VARCHAR(64) NULL,
	satDestIP   VARCHAR(64) NULL,
	satAccessType VARCHAR(128) NULL,
	satZViteStId VARCHAR(64) NULL,
	satComments NVARCHAR(255) NULL,    
	satVal1 		NVARCHAR(255) NULL,
	satVal2 		NVARCHAR(255) NULL,
	satVal3 		NVARCHAR(255) NULL,
	satVal4 		NVARCHAR(255) NULL,
	satVal5 		NVARCHAR(255) NULL
--,
--	CONSTRAINT fk_SATProj FOREIGN KEY (satProjId) REFERENCES pfuser.StorageProject(StorProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_SATFldr FOREIGN KEY (satFolderId) REFERENCES pfuser.StorageFolder(storFldrId) ON DELETE CASCADE,
--	CONSTRAINT fk_SATItem FOREIGN KEY (satItemId) REFERENCES pfuser.StorageItem(storItemId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_SATDomain FOREIGN KEY (satDomainId) REFERENCES pfuser.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_SATAcctNo FOREIGN KEY (satAcctNo) REFERENCES pfuser.ZipAccount(zaAcctNo) ON DELETE CASCADE
)
GO

CREATE INDEX i1_SAT ON pfuser.StorageAuditTrail(satProjId,satDate)
GO

CREATE INDEX i2_SAT ON pfuser.StorageAuditTrail(satProjId,satFolderId)
GO

--CREATE INDEX i5_SAT ON pfuser.StorageAuditTrail(satDomainId,satDate)
GO

CREATE INDEX i9_SAT ON pfuser.StorageAuditTrail(satProjId,satItemId,satItemVersion)
GO

CREATE INDEX i8_SAT ON pfuser.StorageAuditTrail(satProjId,satZlpUserId)
GO

-- OPTIONAL



CREATE TABLE pfuser.StorageUserSubscription (
	susAcctNo 		INT NOT NULL,
	susProjId		INT NOT NULL,
	susDate			DATETIME NOT NULL,
	CONSTRAINT pk_SuserSub PRIMARY KEY (susAcctNo,susProjId)
--,
--	CONSTRAINT fk_SuserSubProj FOREIGN KEY (susProjId) REFERENCES pfuser.StorageProject(StorProjId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_SuserSubAcctNo FOREIGN KEY (susAcctNo) REFERENCES pfuser.ZipAccount(zaAcctNo) ON DELETE CASCADE
)
GO


CREATE SEQUENCE pfuser.StorViolTranscript_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.StorageViolationTranscript (
	storViolTransId		INT NOT NULL,
	storViolTransProjectId	INT NOT NULL,
	storViolTransFlagOld 	INT NOT NULL,
        	storViolTransFlagNew 	INT NOT NULL,
        	storViolTransDate 		DATETIME NOT NULL,
        	storViolTransComment 	NVARCHAR(255) NULL,
	CONSTRAINT pk_StorViolTrans PRIMARY KEY (storViolTransId)
--,
--	CONSTRAINT fk_StorViolTrans FOREIGN KEY (storViolTransProjectId) REFERENCES pfuser.StorageProject(StorProjId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_StorViolTrans ON pfuser.StorageViolationTranscript(storViolTransProjectId)
GO


CREATE INDEX i2_StorViolTrans ON pfuser.StorageViolationTranscript(storViolTransDate)
GO




CREATE TABLE pfuser.StorageViolation (
	storViolProjectId		INT NOT NULL,
	storViolTranscriptId	INT NOT NULL,
	CONSTRAINT pk_StorViol PRIMARY KEY (storViolProjectId)
--,
--	CONSTRAINT fk_StorViolProj FOREIGN KEY (storViolProjectId) REFERENCES pfuser.StorageProject(StorProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_StorViolTranscr FOREIGN KEY (storViolTranscriptId) REFERENCES pfuser.StorageViolationTranscript(storViolTransId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_StorViol ON pfuser.StorageViolation(storViolTranscriptId)
GO



CREATE TABLE pfuser.FileSingleInstanceDigest (
	fsidVaultId	VARCHAR(128) NOT NULL,
	fsidCreator     VARCHAR(128) NOT NULL,
	fsidDate	DATETIME NOT NULL,
 	fsidDigest	VARCHAR(64) NOT NULL,
	fsidRawDigest	VARCHAR(64) NULL,
	CONSTRAINT pk_fsid PRIMARY KEY (fsidVaultId)
--,
--	CONSTRAINT fk_fsid FOREIGN KEY (fsidVaultId) REFERENCES pfuser.VaultItem(viStId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_fsid ON pfuser.FileSingleInstanceDigest(fsidDate)
GO
CREATE INDEX i2_fsid ON pfuser.FileSingleInstanceDigest(fsidDigest,fsidCreator)
GO



CREATE TABLE pfuser.StorageItemStats (
	itemStatProjectId INT NOT NULL,
	itemStatDomainId INT NOT NULL,
	itemStatTenantId INT NOT NULL,
	itemStatPeriodInfo VARCHAR(255) NOT NULL,
	itemStatPeriodStartDate DATETIME NOT NULL,
	itemStatChangeNumber INT NOT NULL,
	itemStatAddCount   INT NOT NULL,
	itemStatAddSize  BIGINT NOT NULL,
	itemStatAddSizeCharged  BIGINT NOT NULL,
	itemStatDelCount   INT NOT NULL,
	itemStatDelSize  BIGINT NOT NULL,
	itemStatDelSizeCharged  BIGINT NOT NULL,
	itemStatCreateDate 	DATETIME NOT NULL,
	itemStatUpdate	DATETIME NOT NULL,
	CONSTRAINT pk_StorItemStats PRIMARY KEY (itemStatProjectId,itemStatPeriodInfo)
--,
--	CONSTRAINT fk_StorItemStatsProj FOREIGN KEY (itemStatProjectId) REFERENCES pfuser.StorageProject(StorProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_StorItemDomain FOREIGN KEY (itemStatDomainId) REFERENCES pfuser.StorageDomainInfo(sdiId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_StorItemStats ON pfuser.StorageItemStats (itemStatPeriodStartDate)
GO
CREATE INDEX i2_StorItemStats ON pfuser.StorageItemStats (itemStatDomainId,itemStatPeriodStartDate)
GO

-- OPTIONAL
CREATE SEQUENCE pfuser.StorItemRelationship_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.StorageItemRelationship (
	-- IDENTITY
	sirId 	BIGINT NOT NULL,
	sirProjectId	INT NOT NULL,
	sirType INT NOT NULL,
	sirName	NVARCHAR(255) NOT NULL,
	sirDisplayName	NVARCHAR(255) NOT NULL,
	CONSTRAINT pk_siRelation PRIMARY KEY (sirId),
	CONSTRAINT uk_siRelation UNIQUE (sirProjectId,sirName)
)
GO


CREATE TABLE pfuser.StorageItemLink (
	linkLeftId BIGINT NOT NULL,
	linkLeftVersion BIGINT NOT NULL,
	linkRightId BIGINT NOT NULL,
	linkRightVersion BIGINT NOT NULL,
	linkRelId	INT NOT NULL,
	linkProjectId INT NOT NULL,
	CONSTRAINT pk_StorItemLink PRIMARY KEY (linkLeftId,linkLeftVersion,linkRightId,linkRightVersion,linkRelId)
)
GO

CREATE INDEX i1_StorItemLink ON pfuser.StorageItemLink(linkRightId,linkRightVersion)
GO


CREATE SEQUENCE pfuser.InPlaceFileItem_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.InPlaceFileItem (
	ipfItemUid	BIGINT NOT NULL,
	ipfItemProjId	INT NOT NULL,
	ipfItemProjOwnerId	INT NOT NULL,
	ipfItemUnid VARCHAR(255) NOT NULL,
    ipfItemFolderId INT NOT NULL,
    ipfItemName    NVARCHAR(255) NOT NULL,
    ipfItemDisplayName NVARCHAR(255) NULL,
    ipfItemType	INT NOT NULL,
    ipfItemFlags   INT NOT NULL,
    ipfItemCreateDate    DATETIME  NOT NULL,
    ipfItemProcessDate    DATETIME NOT NULL,
    ipfItemLastUpdate    DATETIME NOT NULL,
    ipfItemLastModified DATETIME NULL,
    ipfItemLastAccessed DATETIME NULL,
    ipfItemVaultItemId VARCHAR(128) NULL,
    ipfItemEncPwd  VARBINARY(128) NULL,
    ipfItemDigest	VARCHAR(255) NULL,
    ipfItemRecCatId INT NULL,
    ipfItemTriggerDate DATETIME NULL,
    ipfItemExpiryDate DATETIME NULL,
    ipfItemDispFlags BIGINT NULL,
    ipfItemSize  BIGINT NOT NULL,
    ipfItemDeleted CHAR(1) NOT NULL,
    ipfItemNeedsReprocess CHAR(1) NOT NULL,
	CONSTRAINT pk_ipf PRIMARY KEY(ipfItemProjId,ipfItemUnid),
	CONSTRAINT uk_ipf UNIQUE (ipfItemUid),
	CONSTRAINT uk2_ipf UNIQUE (ipfItemProjId,ipfItemFolderId,ipfItemName,ipfItemDeleted)
)
GO
-- CREATE INDEX i1_ipf ON pfuser.InPlaceFileItem(ipfItemProjId) TABLE-SPACE ZL_STORAGE_INDEX
-- CREATE INDEX i2_ipf ON pfuser.InPlaceFileItem(ipfItemUid) TABLE-SPACE ZL_STORAGE_INDEX
CREATE INDEX i3_ipf ON pfuser.InPlaceFileItem(ipfItemDispFlags,ipfItemExpiryDate)
GO
CREATE INDEX i4_ipf ON pfuser.InPlaceFileItem(ipfItemRecCatId)
GO


-- Table: InPlaceFolderStats
CREATE SEQUENCE pfuser.InPlaceFolderStats_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.InPlaceFolderStats (
    ipfsId                  INT NOT NULL,
    ipfsSeqNumber		    INT NOT NULL,
    ipfsNext		        CHAR(1) NOT NULL,
    ipfsProjId              INT NOT NULL,
    ipfsFldrId              INT NOT NULL,
    ipfsUpdateDate          DATETIME NOT NULL,
    ipfsFldrStatsVal1       VARCHAR(255) NULL,
    ipfsFldrStatsVal2       VARCHAR(255) NULL,
    ipfsFldrStatsVal3       VARCHAR(255) NULL,
    ipfsFldrStatsVal4       VARCHAR(255) NULL,
    ipfsFldrStatsVal5       VARCHAR(255) NULL,
    ipfsFldrStatsVal6       VARCHAR(255) NULL,
    ipfsFldrStatsVal7       VARCHAR(255) NULL,
    ipfsFldrStatsVal8       VARCHAR(255) NULL,
	CONSTRAINT pk_ipfs PRIMARY KEY (ipfsId, ipfsSeqNumber),
    CONSTRAINT uk_ipfs UNIQUE (ipfsSeqNumber, ipfsProjId, ipfsFldrId)
)
GO

-- end of Table: InPlaceFolderStats

-- Table: InPlaceTagStats
CREATE SEQUENCE pfuser.InPlaceTagStats_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.InPlaceTagStats (
    iptsId                  INT NOT NULL,
    iptsSeqNumber		    INT NOT NULL,
    iptsNext		        CHAR(1) NOT NULL,
    iptsProjId              INT NOT NULL,
    iptsFldrId              INT NOT NULL,
    iptsUpdateDate          DATETIME NOT NULL,
    iptsTagStatsVal1        VARCHAR(255) NULL,
    iptsTagStatsVal2        VARCHAR(255) NULL,
    iptsTagStatsVal3        VARCHAR(255) NULL,
    iptsTagStatsVal4        VARCHAR(255) NULL,
    iptsTagStatsVal5        VARCHAR(255) NULL,
    iptsTagStatsVal6        VARCHAR(255) NULL,
    iptsTagStatsVal7        VARCHAR(255) NULL,
    iptsTagStatsVal8        VARCHAR(255) NULL,
	CONSTRAINT pk_ipts PRIMARY KEY (iptsId, iptsSeqNumber),
    CONSTRAINT uk_ipts UNIQUE (iptsSeqNumber, iptsProjId, iptsFldrId)
)
GO
-- end of Table: InPlaceTagStats

-- Table: InPlaceIngestDisposeStats
CREATE TABLE pfuser.InPlaceIngestDisposeStats (
    ipidsProjId                 INT NOT NULL,
    ipidsMonth                  DATETIME NOT NULL,
    ipidsUpdateDate             DATETIME NOT NULL,
    ipidsTotalIngest            BIGINT NULL,
    ipidsLastIngest             BIGINT NULL,
    ipidsTotalDispose           BIGINT NULL,
    ipidsTotalIngestCount       INT NULL,
    ipidsLastIngestCount        INT NULL,
    ipidsTotalDisposeCount      INT NULL,
	CONSTRAINT pk_ipids PRIMARY KEY (ipidsProjId,ipidsMonth)
)
GO
-- end of Table: InPlaceIngestDisposeStats

CREATE TABLE pfuser.InPlaceFileAuditTrail (
    inplacefileaAction         INT NOT NULL,
    inplacefileaDate           DATETIME NOT NULL,
    inplacefileaTenantId       INT NOT NULL,
    inplacefileaProjId         INT NOT NULL,
    inplacefileaDirId          INT NOT NULL,
    inplacefileaName           NVARCHAR(255) NULL,
    inplacefileaDisplayName    NVARCHAR(255) NULL,
    inplacefileaZlpUserId      INT NOT NULL,
    inplacefileaUser           NVARCHAR(255) NOT NULL,
    inplacefileaDomainId       INT NOT NULL,
    inplacefileaProjDomainId   INT NOT NULL,
    inplacefileaTxnId          VARCHAR(64) NOT NULL,
    inplacefileaClearanceLevel INT NOT NULL,
    inplacefileaSourceIP       VARCHAR(64) NULL,
    inplacefileaDestIP         VARCHAR(64) NULL,
    inplacefileaAccessType     VARCHAR(128) NULL,
    inplacefileaComments       NVARCHAR(255) NULL,
    inplacefileaVal1           NVARCHAR(255) NULL,
    inplacefileaVal2           NVARCHAR(255) NULL,
    inplacefileaVal3           NVARCHAR(255) NULL,
    inplacefileaVal4           NVARCHAR(255) NULL,
    inplacefileaVal5           NVARCHAR(255) NULL
)
GO

CREATE INDEX i1_InplaceFileAudit ON pfuser.InPlaceFileAuditTrail(inplacefileaDate)
GO
CREATE INDEX i2_InplaceFileAudit ON pfuser.InPlaceFileAuditTrail(inplacefileaProjId)
GO
CREATE INDEX i3_InplaceFileAudit ON pfuser.InPlaceFileAuditTrail(inplacefileaProjId, inplacefileaDirId, inplacefileaName)
GO
CREATE INDEX i4_InplaceFileAudit ON pfuser.InPlaceFileAuditTrail(inplacefileaAction)
GO
CREATE INDEX i5_InplaceFileAudit ON pfuser.InPlaceFileAuditTrail(inplacefileaZlpUserId)
GO


-- Create a sequence for generating ipfdrId
CREATE SEQUENCE pfuser.InPlaceFileDispRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

-- Table: InPlaceFileDispositionRuns
CREATE TABLE pfuser.InPlaceFileDispositionRuns (
    ipfdrId							INT NOT NULL, 
    ipfdrProjId 					INT NOT NULL,
    ipfdrTaskType 					NVARCHAR(255) NOT NULL,
    ipfdrRunType                    VARCHAR(64) NOT NULL,
    ipfdrApprovalRequestId 			INT NOT NULL,
    ipfdrPeriodEndDate 				DATETIME NOT NULL,
	ipfdrRpBdbId					INT NOT NULL,
    ipfdrPID 						NVARCHAR(255) NOT NULL,
    ipfdrStartDate 					DATETIME NOT NULL,
    ipfdrUpdateDate 				DATETIME NOT NULL,
    ipfdrEndDate 					DATETIME NULL,
    ipfdrStatus 					INT NOT NULL,
    ipfdrStatusMsg 					NVARCHAR(255) NULL,
    ipfdrVal1 						NVARCHAR(255) NULL,
    ipfdrVal2 						NVARCHAR(255) NULL,
    ipfdrVal3 						NVARCHAR(255) NULL,
    ipfdrVal4 						NVARCHAR(255) NULL,
    ipfdrVal5 						NVARCHAR(255) NULL,
    CONSTRAINT pk_InPlaceFileDispositionRuns PRIMARY KEY (ipfdrId)
)
GO

CREATE INDEX i1_ipfdr ON pfuser.InPlaceFileDispositionRuns(ipfdrProjId)
GO
CREATE INDEX i2_ipfdr ON pfuser.InPlaceFileDispositionRuns(ipfdrProjId, ipfdrTaskType)
GO
CREATE INDEX i3_ipfdr ON pfuser.InPlaceFileDispositionRuns(ipfdrProjId, ipfdrTaskType, ipfdrRunType)
GO
CREATE INDEX i4_ipfdr ON pfuser.InPlaceFileDispositionRuns(ipfdrProjId, ipfdrTaskType, ipfdrStatus)
GO

--end table InPlaceFileDispositionRuns

-- Table: InPlaceFileScheduledRuns
CREATE TABLE pfuser.InPlaceFileScheduledRuns (
    ipfsrProjId                     INT NOT NULL,
    ipfsrTaskType                   NVARCHAR(255) NOT NULL,
    ipfsrInterval                   NVARCHAR(255) NOT NULL,
    ipfsrDateStart                  DATETIME NOT NULL,
    ipfsrDateExpiry                 DATETIME NULL,
    ipfsrIterations                 INT NULL,
    CONSTRAINT pk_InPlaceFileScheduledRuns PRIMARY KEY (ipfsrProjId, ipfsrTaskType)
)
GO

--end table InPlaceFileScheduledRuns

--Table: InPlaceTag
CREATE SEQUENCE pfuser.InPlaceTag_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.InPlaceTag (
    tagId		     INT NOT NULL,
	tagContextId     INT NOT NULL,
	tagParentId      INT NOT NULL,
	tagName		     NVARCHAR(255) NOT NULL,
	tagDisplayName   NVARCHAR(255) NULL,
	tagFlags         INT NOT NULL,
	tagType          NVARCHAR(255) NOT NULL,
	tagDesc          NVARCHAR(255) NULL,
	tagCreateDate    DATETIME NOT NULL,
	tagLastUpdateDate DATETIME NOT NULL,
	tagTenantId      INT NOT NULL,
	tagDeleted       CHAR(1) NOT NULL,
	CONSTRAINT pk_InPlaceTag PRIMARY KEY (tagId),
	CONSTRAINT uk_InPlaceTag UNIQUE (tagContextId,tagName,tagType)
)
GO

--adding index for InPlaceTag table
CREATE INDEX i1_ipTag ON pfuser.InPlaceTag(tagTenantId, tagDeleted)
GO

CREATE TABLE pfuser.InPlaceFileItemStaticTag (
	ipfItemUid	BIGINT NOT NULL,
	ipfItemProjId	INT NOT NULL,   -- denormalize to avoid join with InPlaceFileItem
    -- //PGSQL{[ipfItemCategory INT NOT NULL~~ipfItemCategory INT\x5B\x5D NOT NULL]}
    ipfItemCategory INT NOT NULL,
	CONSTRAINT pk_ipfTag PRIMARY KEY(ipfItemUid,ipfItemCategory)
--	CONSTRAINT fk_ipfTagUid FOREIGN KEY (ipfItemUid) REFERENCES pfuser.InPlaceFileItem(ipfItemUid) ON DELETE CASCADE,
--	CONSTRAINT fk_ipfTagCategory FOREIGN KEY (ipfItemCategory) REFERENCES pfuser.InPlaceTag(tagId) ON DELETE CASCADE
)
-- PARTITION(ipfItemUid) -- div 1024*1024*1024 for block
-- PARTITION(ipfItemCategory) -- mod 10 for search
GO
-- suggest bitmap, but test for conflict
CREATE INDEX i1_ipfTag ON pfuser.InPlaceFileItemStaticTag(ipfItemProjId)
GO
-- //PGSQL{[pfuser.InPlaceFileItemStaticTag(ipfItemCategory)~~pfuser.InPlaceFileItemStaticTag USING GIN (ipfItemCategory)]}
CREATE INDEX i2_ipfTag ON pfuser.InPlaceFileItemStaticTag(ipfItemCategory)
GO

--end table InPlaceTag

-- Table: UserGeoTags
CREATE TABLE pfuser.UserGeoTags (
    ugtAcctNo           INT NOT NULL,
    ugtTagId            INT NOT NULL,
    ugtRegionName       NVARCHAR(32) NULL,
    ugtCreateDate       DATETIME NULL,
    CONSTRAINT uk_GeoTag UNIQUE (ugtAcctNo, ugtTagId)
)
GO

--end table UserGeoTags

--Table: InPlaceStaticTagLexiconMap
CREATE TABLE pfuser.InPlaceStaticTagLexiconMap (
    ipslCatId            INT NOT NULL,
    ipslCatClId		     INT NOT NULL,
	ipslTagId            INT NOT NULL,
	CONSTRAINT pk_inPlaceStaticTagLexiconMap PRIMARY KEY (ipslCatId)
)
GO

CREATE INDEX i1_ipsl ON pfuser.InPlaceStaticTagLexiconMap (ipslCatClId)
GO

--end table InPlaceStaticTagLexiconMap

--Creating sequence for RecategorizationTask
CREATE SEQUENCE pfuser.RecategorizationTask_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

--Table: RecategorizationTask
CREATE TABLE pfuser.RecategorizationTask (
    rtTaskId                      INT NOT NULL,
    rtAppId                       INT NOT NULL,
    rtContextId                   INT NOT NULL,
    rtTaskAction                  NVARCHAR(128) NOT NULL,
    rtTotalItemCount              INT NULL,
    rtSuccessItemCount            INT NULL,
    rtNotProcessedItemCount       INT NULL,
    rtFailedItemCount             INT NULL,
    rtSourceType                  NVARCHAR(128) NOT NULL,
    rtTaskStatus                  INT NOT NULL,
    rtTranscriptVaultId           NVARCHAR(128) NULL,
    rtStartDate                   DATETIME NOT NULL,
    rtEndDate                     DATETIME NULL,
    rtLastUpdate                  DATETIME NULL,
    rtVal1                        NVARCHAR(255) NULL,
    rtVal2                        NVARCHAR(255) NULL,
    rtVal3                        NVARCHAR(255) NULL,
    rtVal4                        NVARCHAR(255) NULL,
    rtVal5                        NVARCHAR(255) NULL,
    CONSTRAINT pk_RecategorizationTask PRIMARY KEY (rtTaskId)
)
GO

CREATE INDEX i1_rt ON pfuser.RecategorizationTask(rtContextId)
GO
