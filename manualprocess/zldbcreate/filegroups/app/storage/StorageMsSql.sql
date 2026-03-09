



-- *************************************************************************************
--	StorageProject
-- *************************************************************************************

-- OPTIONAL
CREATE SEQUENCE pfuser01.StorageProject_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.StorageProject (
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
	CONSTRAINT pk_StorProj PRIMARY KEY(StorProjId) ON ZL_APP_INDEX,
	CONSTRAINT uk_StorProj UNIQUE (StorProjTenantId,StorProjName) ON ZL_APP_INDEX
--,CONSTRAINT fk_StorProjDomain FOREIGN KEY (StorProjDomainId) REFERENCES pfuser01.StorageDomainInfo(sdiId) ON DELETE CASCADE,
--	CONSTRAINT fk_StorProjAcctNo FOREIGN KEY (storProjOwnerAcctNo) REFERENCES pfuser01.ZipAccount(zaAcctNo) ON DELETE CASCADE
) ON ZL_APP
GO

CREATE INDEX i1_StorProj ON pfuser01.StorageProject(StorProjDomainId)  ON ZL_APP_INDEX
GO
CREATE INDEX i2_StorProj ON pfuser01.StorageProject(storProjOwnerAcctNo)  ON ZL_APP_INDEX
GO


CREATE TABLE pfuser01.StorageProjectPrivileges (
	sppProjId INT NOT NULL,
        sppPrivilegeFlags INT NOT NULL,
        sppProjAdminPriv CHAR(1) NOT NULL,
        sppEntityId INT NOT NULL,
	sppEntityType INT NOT NULL,
	CONSTRAINT uk_SPP UNIQUE (sppProjId,sppEntityId,sppEntityType) ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_SPP FOREIGN KEY (sppProjId) REFERENCES pfuser01.StorageProject(StorProjId) ON DELETE CASCADE
) ON ZL_APP
GO

CREATE INDEX i1_SPP ON pfuser01.StorageProjectPrivileges(sppProjId)  ON ZL_APP_INDEX
GO
CREATE INDEX i2_SPP  ON pfuser01.StorageProjectPrivileges(sppEntityType,sppEntityId) ON ZL_APP_INDEX
GO




CREATE SEQUENCE pfuser01.StorageFolder_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 5
GO


CREATE TABLE pfuser01.StorageFolder (
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
	CONSTRAINT pk_StorFoldr PRIMARY KEY (storFldrId) ON ZL_ITEM_INDEX,
	CONSTRAINT uk2_StorFoldr UNIQUE (storFldrProjId,storFldrParentId,storFldrName) ON ZL_ITEM_INDEX
--,CONSTRAINT fk_StorFoldrProj FOREIGN KEY (storFldrProjId) REFERENCES pfuser01.StorageProject(StorProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_StorFoldrParent FOREIGN KEY (storFldrParentId) REFERENCES pfuser01.StorageFolder(storFldrId) ON DELETE CASCADE,
) ON ZL_ITEM
GO
-- Storage (initial 5M NEXT 5M MINEXTENTS 1 MAXEXTENTS 20 PCTINCREASE 33) 




CREATE TABLE pfuser01.StorageFolderProp (
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
	CONSTRAINT pk_SFldrProp PRIMARY KEY (sfpProjId,sfpFldrId,sfpSeqNumber)  ON ZL_ITEM_INDEX
) ON ZL_ITEM
GO




CREATE SEQUENCE pfuser01.StorageItem_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.StorageItem (
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
	CONSTRAINT pk_StorItem PRIMARY KEY(storItemId) ON ZL_STORAGE_INDEX,
	CONSTRAINT uk_StorItem UNIQUE (storItemProjId,storItemFldrId,storItemName) ON ZL_STORAGE_INDEX
--,
--	CONSTRAINT fk_StorItemProj FOREIGN KEY (storItemProjId) REFERENCES pfuser01.StorageProject(StorProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_StorItemFldr FOREIGN KEY (storItemFldrId) REFERENCES pfuser01.StorageFolder(storFldrId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_StorItemVault FOREIGN KEY (storItemVaultItemId) REFERENCES pfuser01.VaultItem(viStId) ON DELETE CASCADE
)
ON ZL_STORAGE
GO
-- STORAGE (INITIAL 125M NEXT 250M MINEXTENTS 1 MAXEXTENTS 30 PCTINCREASE 0)


CREATE INDEX i1_StorItem ON pfuser01.StorageItem(storItemProjId,storItemFldrId) ON ZL_STORAGE_INDEX
GO
CREATE INDEX i2_StorItem ON pfuser01.StorageItem(storItemVaultItemId) ON ZL_STORAGE_INDEX
GO


CREATE INDEX i5_StorItem ON pfuser01.StorageItem(storItemProjId,storItemExpiryDate) ON ZL_STORAGE_INDEX
GO
CREATE INDEX i7_StorItem ON pfuser01.StorageItem(storItemRetentionId,storItemCreateDate,storItemLegalHold,storItemId) ON ZL_STORAGE_INDEX
GO
CREATE INDEX i8_StorItem ON pfuser01.StorageItem(storItemProcessDate) ON ZL_STORAGE_INDEX
GO
CREATE INDEX i9_StorItem ON pfuser01.StorageItem(storItemProjId,storItemRecCatId) ON ZL_STORAGE_INDEX
GO


CREATE SEQUENCE pfuser01.StorageItemVersion_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser01.StorageItemVersion (
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
	CONSTRAINT pk_SIV PRIMARY KEY (sivStorItemId,sivVersion) ON ZL_STORAGE_INDEX
--,
--	CONSTRAINT fk_SIVProj FOREIGN KEY (sivProjId) REFERENCES pfuser01.StorageProject(StorProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_SIVItem FOREIGN KEY (sivStorItemId) REFERENCES pfuser01.StorageItem(storItemId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_SIVVault FOREIGN KEY (sivVaultItemId) REFERENCES pfuser01.VaultItem(viStId) ON DELETE CASCADE
) ON ZL_STORAGE
GO

CREATE INDEX i1_StorItemVersion ON pfuser01.StorageItemVersion(sivVaultItemId) ON ZL_STORAGE_INDEX
GO

CREATE INDEX i2_StorItemVersion ON pfuser01.StorageItemVersion(sivProjId,sivRecCatId) ON ZL_STORAGE_INDEX
GO
CREATE INDEX i3_StorItemVersion ON pfuser01.StorageItemVersion(sivDateProcessOrig) ON ZL_STORAGE_INDEX
GO


CREATE TABLE pfuser01.StorageItemPart (
  	sipVersion BIGINT NOT NULL,
	sipStorItemId	BIGINT NOT NULL,
	sipProjId 	INT NOT NULL,
	sipVaultId                     VARCHAR(64) NOT NULL,
	sipEncMsgPwd                VARBINARY(128) NULL,
	sipSize                       INT  NOT NULL,
	CONSTRAINT pk_StorageItemPart PRIMARY KEY (sipProjId,sipStorItemId,sipVersion,sipVaultId) ON ZL_STORAGE_INDEX
) ON ZL_STORAGE
GO
CREATE INDEX i1_StorItemPart ON pfuser01.StorageItemPart(sipVaultId) ON ZL_STORAGE_INDEX
GO
 




CREATE TABLE pfuser01.StorageItemSisHeader (
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
	CONSTRAINT pk_SishPriv PRIMARY KEY (sishProjId,sishItemId,sishItemVersionId,sishSeqNumber)  ON ZL_ITEM_INDEX
) ON ZL_ITEM
GO



CREATE TABLE pfuser01.StorageAuditTrail (
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
--	CONSTRAINT fk_SATProj FOREIGN KEY (satProjId) REFERENCES pfuser01.StorageProject(StorProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_SATFldr FOREIGN KEY (satFolderId) REFERENCES pfuser01.StorageFolder(storFldrId) ON DELETE CASCADE,
--	CONSTRAINT fk_SATItem FOREIGN KEY (satItemId) REFERENCES pfuser01.StorageItem(storItemId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_SATDomain FOREIGN KEY (satDomainId) REFERENCES pfuser01.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_SATAcctNo FOREIGN KEY (satAcctNo) REFERENCES pfuser01.ZipAccount(zaAcctNo) ON DELETE CASCADE
) ON ZL_ITEM
GO

CREATE INDEX i1_SAT ON pfuser01.StorageAuditTrail(satProjId,satDate) ON ZL_ITEM_INDEX
GO

CREATE INDEX i2_SAT ON pfuser01.StorageAuditTrail(satProjId,satFolderId) ON ZL_ITEM_INDEX
GO

--CREATE INDEX i5_SAT ON pfuser01.StorageAuditTrail(satDomainId,satDate) ON ZL_ITEM_INDEX
GO

CREATE INDEX i9_SAT ON pfuser01.StorageAuditTrail(satProjId,satItemId,satItemVersion) ON ZL_ITEM_INDEX
GO
CREATE INDEX i8_SAT ON pfuser01.StorageAuditTrail(satProjId,satZlpUserId) ON ZL_ITEM_INDEX
GO

-- OPTIONAL



CREATE TABLE pfuser01.StorageUserSubscription (
	susAcctNo 		INT NOT NULL,
	susProjId		INT NOT NULL,
	susDate			DATETIME NOT NULL,
	CONSTRAINT pk_SuserSub PRIMARY KEY (susAcctNo,susProjId)  ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_SuserSubProj FOREIGN KEY (susProjId) REFERENCES pfuser01.StorageProject(StorProjId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_SuserSubAcctNo FOREIGN KEY (susAcctNo) REFERENCES pfuser01.ZipAccount(zaAcctNo) ON DELETE CASCADE
) ON ZL_APP
GO


CREATE SEQUENCE pfuser01.StorViolTranscript_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser01.StorageViolationTranscript (
	storViolTransId		INT NOT NULL,
	storViolTransProjectId	INT NOT NULL,
	storViolTransFlagOld 	INT NOT NULL,
        	storViolTransFlagNew 	INT NOT NULL,
        	storViolTransDate 		DATETIME NOT NULL,
        	storViolTransComment 	NVARCHAR(255) NULL,
	CONSTRAINT pk_StorViolTrans PRIMARY KEY (storViolTransId) ON ZL_TRANSIENT_INDEX 
--,
--	CONSTRAINT fk_StorViolTrans FOREIGN KEY (storViolTransProjectId) REFERENCES pfuser01.StorageProject(StorProjId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO

CREATE INDEX i1_StorViolTrans ON pfuser01.StorageViolationTranscript(storViolTransProjectId) ON ZL_TRANSIENT_INDEX
GO


CREATE INDEX i2_StorViolTrans ON pfuser01.StorageViolationTranscript(storViolTransDate) ON ZL_TRANSIENT_INDEX
GO




CREATE TABLE pfuser01.StorageViolation (
	storViolProjectId		INT NOT NULL,
	storViolTranscriptId	INT NOT NULL,
	CONSTRAINT pk_StorViol PRIMARY KEY (storViolProjectId) ON ZL_TRANSIENT_INDEX 
--,
--	CONSTRAINT fk_StorViolProj FOREIGN KEY (storViolProjectId) REFERENCES pfuser01.StorageProject(StorProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_StorViolTranscr FOREIGN KEY (storViolTranscriptId) REFERENCES pfuser01.StorageViolationTranscript(storViolTransId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO

CREATE INDEX i1_StorViol ON pfuser01.StorageViolation(storViolTranscriptId) ON ZL_TRANSIENT_INDEX
GO



CREATE TABLE pfuser01.FileSingleInstanceDigest (
	fsidVaultId	VARCHAR(128) NOT NULL,
	fsidCreator     VARCHAR(128) NOT NULL,
	fsidDate	DATETIME NOT NULL,
 	fsidDigest	VARCHAR(64) NOT NULL,
	fsidRawDigest	VARCHAR(64) NULL,
	CONSTRAINT pk_fsid PRIMARY KEY (fsidVaultId) ON ZL_FILE_SIS_INDEX
--,
--	CONSTRAINT fk_fsid FOREIGN KEY (fsidVaultId) REFERENCES pfuser01.VaultItem(viStId) ON DELETE CASCADE
)
ON ZL_FILE_SIS
GO

CREATE INDEX i1_fsid ON pfuser01.FileSingleInstanceDigest(fsidDate) ON ZL_FILE_SIS_INDEX
GO
CREATE INDEX i2_fsid ON pfuser01.FileSingleInstanceDigest(fsidDigest,fsidCreator) ON ZL_FILE_SIS_INDEX
GO



CREATE TABLE pfuser01.StorageItemStats (
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
	CONSTRAINT pk_StorItemStats PRIMARY KEY (itemStatProjectId,itemStatPeriodInfo) ON ZL_STATS_INDEX
--,
--	CONSTRAINT fk_StorItemStatsProj FOREIGN KEY (itemStatProjectId) REFERENCES pfuser01.StorageProject(StorProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_StorItemDomain FOREIGN KEY (itemStatDomainId) REFERENCES pfuser01.StorageDomainInfo(sdiId) ON DELETE CASCADE
) ON ZL_STATS
GO

CREATE INDEX i1_StorItemStats ON pfuser01.StorageItemStats (itemStatPeriodStartDate) ON ZL_STATS_INDEX
GO
CREATE INDEX i2_StorItemStats ON pfuser01.StorageItemStats (itemStatDomainId,itemStatPeriodStartDate) ON ZL_STATS_INDEX
GO

-- OPTIONAL
CREATE SEQUENCE pfuser01.StorItemRelationship_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.StorageItemRelationship (
	-- IDENTITY
	sirId 	BIGINT NOT NULL,
	sirProjectId	INT NOT NULL,
	sirType INT NOT NULL,
	sirName	NVARCHAR(255) NOT NULL,
	sirDisplayName	NVARCHAR(255) NOT NULL,
	CONSTRAINT pk_siRelation PRIMARY KEY (sirId) ON ZL_APP_INDEX,
	CONSTRAINT uk_siRelation UNIQUE (sirProjectId,sirName) ON ZL_APP_INDEX
) ON ZL_APP
GO


CREATE TABLE pfuser01.StorageItemLink (
	linkLeftId BIGINT NOT NULL,
	linkLeftVersion BIGINT NOT NULL,
	linkRightId BIGINT NOT NULL,
	linkRightVersion BIGINT NOT NULL,
	linkRelId	INT NOT NULL,
	linkProjectId INT NOT NULL,
	CONSTRAINT pk_StorItemLink PRIMARY KEY (linkLeftId,linkLeftVersion,linkRightId,linkRightVersion,linkRelId) ON ZL_ITEM_INDEX
) ON ZL_ITEM
GO

CREATE INDEX i1_StorItemLink ON pfuser01.StorageItemLink(linkRightId,linkRightVersion) ON ZL_ITEM_INDEX
GO


CREATE SEQUENCE pfuser01.InPlaceFileItem_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.InPlaceFileItem (
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
    -- //PGSQL{[ipfItemCategory NVARCHAR(255) NULL~~ipfItemCategory INT\x5B\x5D NULL]}
    ipfItemCategory NVARCHAR(255) NULL,
    ipfItemLifecycleTagId INT NULL,
    ipfItemTriggerDate DATETIME NULL,
    ipfItemExpiryDate DATETIME NULL,
    ipfItemDispFlags BIGINT NULL,
    ipfItemSize  BIGINT NOT NULL,
    ipfItemDeleted CHAR(1) NOT NULL,
    ipfItemNeedsReprocess CHAR(1) NOT NULL,
	CONSTRAINT pk_ipf PRIMARY KEY(ipfItemProjId,ipfItemUnid) ON ZL_STORAGE_INDEX,
	CONSTRAINT uk_ipf UNIQUE (ipfItemUid) ON ZL_STORAGE_INDEX,
	CONSTRAINT uk2_ipf UNIQUE (ipfItemProjId,ipfItemFolderId,ipfItemName,ipfItemDeleted) ON ZL_STORAGE_INDEX
)
ON ZL_STORAGE
GO
-- CREATE INDEX i1_ipf ON pfuser01.InPlaceFileItem(ipfItemProjId) ON ZL_STORAGE_INDEX
GO
-- CREATE INDEX i2_ipf ON pfuser01.InPlaceFileItem(ipfItemUid) TABLE-SPACE ZL_STORAGE_INDEX
CREATE INDEX i3_ipf ON pfuser01.InPlaceFileItem(ipfItemDispFlags,ipfItemExpiryDate) ON ZL_STORAGE_INDEX
GOCREATE INDEX i4_ipf ON pfuser01.InPlaceFileItem(ipfItemLifecycleTagId) ON ZL_STORAGE_INDEX
GO
-- //PGSQL{[pfuser01.InPlaceFileItem(ipfItemCategory)~~pfuser01.InPlaceFileItem USING GIN (ipfItemCategory)]}
CREATE INDEX i5_ipf ON pfuser01.InPlaceFileItem(ipfItemCategory) ON ZL_STORAGE_INDEX
GO


-- Table: InPlaceFolderStats
CREATE SEQUENCE pfuser01.InPlaceFolderStats_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.InPlaceFolderStats (
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
	CONSTRAINT pk_ipfs PRIMARY KEY (ipfsId, ipfsSeqNumber) ON ZL_ARCHIVEPOINT_INDEX,
    CONSTRAINT uk_ipfs UNIQUE (ipfsSeqNumber, ipfsProjId, ipfsFldrId) ON ZL_ARCHIVEPOINT_INDEX
) ON ZL_ARCHIVEPOINT
GO

-- end of Table: InPlaceFolderStats

CREATE TABLE pfuser01.InPlaceFileAuditTrail (
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
) ON ZL_APP
GO

CREATE INDEX i1_InplaceFileAudit ON pfuser01.InPlaceFileAuditTrail(inplacefileaDate) ON ZL_APP_INDEX
GO
CREATE INDEX i2_InplaceFileAudit ON pfuser01.InPlaceFileAuditTrail(inplacefileaProjId) ON ZL_APP_INDEX
GO
CREATE INDEX i3_InplaceFileAudit ON pfuser01.InPlaceFileAuditTrail(inplacefileaProjId, inplacefileaDirId, inplacefileaName) ON ZL_APP_INDEX
GO
CREATE INDEX i4_InplaceFileAudit ON pfuser01.InPlaceFileAuditTrail(inplacefileaAction) ON ZL_APP_INDEX
GO
CREATE INDEX i5_InplaceFileAudit ON pfuser01.InPlaceFileAuditTrail(inplacefileaZlpUserId) ON ZL_APP_INDEX
GO


-- Create a sequence for generating ipfdrId
CREATE SEQUENCE pfuser01.InPlaceFileDispRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

-- Table: InPlaceFileDispositionRuns
CREATE TABLE pfuser01.InPlaceFileDispositionRuns (
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
    CONSTRAINT pk_InPlaceFileDispositionRuns PRIMARY KEY (ipfdrId) ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE INDEX i1_ipfdr ON pfuser01.InPlaceFileDispositionRuns(ipfdrProjId) ON ZL_APP_INDEX
GO
CREATE INDEX i2_ipfdr ON pfuser01.InPlaceFileDispositionRuns(ipfdrProjId, ipfdrTaskType) ON ZL_APP_INDEX
GO
CREATE INDEX i3_ipfdr ON pfuser01.InPlaceFileDispositionRuns(ipfdrProjId, ipfdrTaskType, ipfdrRunType) ON ZL_APP_INDEX
GO
CREATE INDEX i4_ipfdr ON pfuser01.InPlaceFileDispositionRuns(ipfdrProjId, ipfdrTaskType, ipfdrStatus) ON ZL_APP_INDEX
GO

--end table InPlaceFileDispositionRuns

-- Table: InPlaceFileScheduledRuns
CREATE TABLE pfuser01.InPlaceFileScheduledRuns (
    ipfsrProjId                     INT NOT NULL,
    ipfsrTaskType                   NVARCHAR(255) NOT NULL,
    ipfsrInterval                   NVARCHAR(255) NOT NULL,
    ipfsrDateStart                  DATETIME NOT NULL,
    ipfsrDateExpiry                 DATETIME NULL,
    ipfsrIterations                 INT NULL,
    CONSTRAINT pk_InPlaceFileScheduledRuns PRIMARY KEY (ipfsrProjId, ipfsrTaskType) ON ZL_APP_INDEX
) ON ZL_APP
GO

--end table InPlaceFileScheduledRuns

--Table: InPlaceTag
CREATE SEQUENCE pfuser01.InPlaceTag_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.InPlaceTag (
    tagId		     INT NOT NULL,
	tagContextId     INT NOT NULL,
	tagParentId      INT NOT NULL,
	tagName		     NVARCHAR(255) NOT NULL,
	tagDisplayName   NVARCHAR(255) NULL,
	tagFlags         INT NOT NULL,
	tagType          NVARCHAR(255) NOT NULL,
	tagSubType       NVARCHAR(255) NULL,
	tagDesc          NVARCHAR(255) NULL,
	tagCreateDate    DATETIME NOT NULL,
	tagLastUpdateDate DATETIME NOT NULL,
	tagTenantId      INT NOT NULL,
	tagDeleted       CHAR(1) NOT NULL,
	CONSTRAINT pk_InPlaceTag PRIMARY KEY (tagId) ON ZL_APP_INDEX,
	CONSTRAINT uk_InPlaceTag UNIQUE (tagContextId,tagName,tagType) ON ZL_APP_INDEX
)
ON ZL_APP
GO

CREATE TABLE pfuser01.InPlaceFileItemStaticTag (
	ipfItemUid	BIGINT NOT NULL,
	ipfItemProjId	INT NOT NULL,   -- denormalize to avoid join with InPlaceFileItem
    -- //PGSQL{[ipfItemCategory INT NOT NULL~~ipfItemCategory INT\x5B\x5D NOT NULL]}
    ipfItemCategory INT NOT NULL,
	CONSTRAINT pk_ipfTag PRIMARY KEY(ipfItemUid,ipfItemCategory) ON ZL_STORAGE_INDEX
--	CONSTRAINT fk_ipfTagUid FOREIGN KEY (ipfItemUid) REFERENCES pfuser01.InPlaceFileItem(ipfItemUid) ON DELETE CASCADE,
--	CONSTRAINT fk_ipfTagCategory FOREIGN KEY (ipfItemCategory) REFERENCES pfuser01.InPlaceTag(tagId) ON DELETE CASCADE
)
-- PARTITION(ipfItemUid) -- div 1024*1024*1024 for block
-- PARTITION(ipfItemCategory) -- mod 10 for search
ON ZL_STORAGE
GO
-- suggest bitmap, but test for conflict
CREATE INDEX i1_ipfTag ON pfuser01.InPlaceFileItemStaticTag(ipfItemProjId) ON ZL_STORAGE_INDEX
GO
-- //PGSQL{[pfuser01.InPlaceFileItemStaticTag(ipfItemCategory)~~pfuser01.InPlaceFileItemStaticTag USING GIN (ipfItemCategory)]}
CREATE INDEX i2_ipfTag ON pfuser01.InPlaceFileItemStaticTag(ipfItemCategory) ON ZL_STORAGE_INDEX
GO

--end table InPlaceTag

-- Table: UserGeoTags
CREATE TABLE pfuser01.UserGeoTags (
    ugtAcctNo           INT NOT NULL,
    ugtTagId            INT NOT NULL,
    ugtRegionName       NVARCHAR(32) NULL,
    ugtCreateDate       DATETIME NULL,
    CONSTRAINT uk_GeoTag UNIQUE (ugtAcctNo, ugtTagId) ON ZL_APP_INDEX
) ON ZL_APP
GO

--end table UserGeoTags

--Table: InPlaceStaticTagLexiconMap
CREATE TABLE pfuser01.InPlaceStaticTagLexiconMap (
    ipslCatId            INT NOT NULL,
    ipslCatClId		     INT NOT NULL,
	ipslTagId            INT NOT NULL,
	CONSTRAINT pk_inPlaceStaticTagLexiconMap PRIMARY KEY (ipslCatId) ON ZL_APP_INDEX
)
ON ZL_APP
GO

CREATE INDEX i1_ipsl ON pfuser01.InPlaceStaticTagLexiconMap (ipslCatClId) ON ZL_APP_INDEX
GO

