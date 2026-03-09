
-- Vault Application --

CREATE SEQUENCE pfuser.dsu_shName_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


-- OPTIONAL
CREATE SEQUENCE pfuser.dsu_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.DiskStorageUnit (
    -- IDENTITY
   dsuId                        BIGINT NOT NULL,
   dsuName                      NVARCHAR(32) NOT NULL,
   dsuShortName			NVARCHAR(32) NOT NULL,
   dsuUnitType		INT NOT NULL,
   dsuCreateDate                DATETIME NOT NULL,
   dsuAppId                     INT NULL,
   dsuModuleName                NVARCHAR(64) NULL,
   dsuComments                  NVARCHAR(255) NULL,
   dsuCreatorUserid             VARCHAR(64) NOT NULL,
   dsuType                      VARCHAR(32) NOT NULL,
   dsuEncryption			CHAR(1) NOT NULL,
   dsuCompression		CHAR(1) NOT NULL,
   dsuPartition			NVARCHAR(32) NULL,
   dsuEscrowDecrypt		CHAR(1) NOT NULL,
   dsuReplicateON		CHAR(1) NULL,
   dsuReplicateScheme		NVARCHAR(32) NULL,
   dsuReplicateIncremental	CHAR(1) NULL,
   dsuReplicateDeleteHours	INT NULL,
   dsuReplicateDate		DATETIME NULL,
   dsuReplicateNotes		NVARCHAR(128) NULL,
   dsuReplicateMask		INT NULL,
   dsuFAccessSuId	INT NOT NULL,
   dsuVal1                      NVARCHAR(255) NULL,
   dsuVal2                      NVARCHAR(255) NULL,
   dsuVal3                      NVARCHAR(255) NULL,
   dsuLastUpdate                DATETIME NOT NULL,
   CONSTRAINT pk_DSU PRIMARY KEY (dsuId),
   CONSTRAINT uk_DSU UNIQUE (dsuName),
   CONSTRAINT uk2_DSU UNIQUE (dsuShortName)
)
GO

CREATE INDEX i1_DSU ON pfuser.DiskStorageUnit(dsuAppId)
GO




CREATE SEQUENCE pfuser.dv_shName_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


 
-- OPTIONAL
CREATE SEQUENCE pfuser.dv_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.DiskVolume (
   -- IDENTITY
   dvId                         BIGINT NOT NULL,
   dvName                       NVARCHAR(32) NOT NULL,
   dvShortName			NVARCHAR(32) NOT NULL,
   dvDsuId			INT NOT NULL,
   dvCreateDate                 DATETIME NOT NULL,
   dvPath	                NVARCHAR(255) NOT NULL,
   dvLocalPath                  NVARCHAR(255) NULL,
   dvFailoverPath		NVARCHAR(255) NULL,
   dvSite			VARCHAR(32) NOT NULL,
   dvWidth                      INT NOT NULL,
   dvDepth                      INT NOT NULL,
   dvNumFiles                   INT NULL,
   dvUsedSize                   INT NULL,
   dvTotalSize                  INT NULL,
   dvStatDate                   DATETIME NULL,
   dvType                       INT NOT NULL,
   dvFlags			INT NOT NULL,
   dvLocalMachine		NVARCHAR(255) NULL,
   dvAddlInfoVal1               NVARCHAR(255) NULL,
   dvAddlInfoVal2               NVARCHAR(255) NULL,
   dvAddlInfoVal3               NVARCHAR(255) NULL,
   dvCreatorUserId              VARCHAR(64) NOT NULL,
   dvComments                   NVARCHAR(255) NULL,
   dvLastUpdate                 DATETIME NOT NULL,
   dvReplicateLocation  		NVARCHAR(255) NULL,
   dvReplicateState		INT  NULL,
   dvReplicateStateDate		DATETIME NULL,
   dvReplicateMask		INT NULL,
   CONSTRAINT pk_DiskVolume     PRIMARY KEY (dvId),
--   CONSTRAINT fk_DiskVolume     FOREIGN KEY (dvDsuId) REFERENCES pfuser.DiskStorageUnit(dsuId) ON DELETE CASCADE,
   CONSTRAINT uk_DiskVolume     UNIQUE (dvName),
   CONSTRAINT uk2_DiskVolume     UNIQUE (dvShortName)
)
GO



-- OPTIONAL
CREATE SEQUENCE pfuser.vi_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.VaultItem(
    -- IDENTITY
    viID                        BIGINT NOT NULL,
    viStId                      VARCHAR(128) NOT NULL,
    viType                      VARCHAR(32) NULL,
    viHeader                    VARBINARY(255) NULL,
    viLocation                  NVARCHAR(255) NULL,
    viLocation2                  NVARCHAR(255) NULL,
    viPwdHash                   VARBINARY(128) NULL,
    viEscrowInfo                VARBINARY(255) NULL,
    viCreator                   VARCHAR(128) NULL,
    viCreateDate                DATETIME NOT NULL,
    viAppId                     INT NOT NULL,
    viSize                      BIGINT NULL,
	viAppFlags                  INT  NULL,
    CONSTRAINT pk_VaultItem     PRIMARY KEY (viID),
--, 
    CONSTRAINT uk_VaultItem     UNIQUE (viStId)
--     
)
GO
-- STORAGE (INITIAL 250M NEXT 250M MINEXTENTS 1 MAXEXTENTS  30 PCTINCREASE 0) PCTFREE 5

CREATE INDEX i1_VaultItem ON pfuser.VaultItem(viCreateDate)
GO


CREATE TABLE pfuser.VaultContainerRefCount(
    vcrcDvId                      INT NOT NULL,
    vcrcLocation                  VARCHAR(255) NOT NULL,
    vcrcCreateDate                DATETIME NOT NULL,
    vcrcCount                     INT NOT NULL,
    vcrcVal1					  NVARCHAR(255) NULL,
    vcrcVal2					  NVARCHAR(255) NULL,
    vcrcVal3					  NVARCHAR(255) NULL,
    CONSTRAINT pk_VaultContRefCnt     PRIMARY KEY (vcrcLocation,vcrcDvId)
--     
--,
--    CONSTRAINT fk_VaultContRefCnt FOREIGN KEY (vcrcDvId) REFERENCES pfuser.DiskVolume(dvId) ON DELETE CASCADE
)
GO
-- STORAGE (INITIAL 25M NEXT 25M MINEXTENTS 1 MAXEXTENTS  30 PCTINCREASE 0) PCTFREE 5

CREATE INDEX i2_VCRC ON pfuser.VaultContainerRefCount(vcrcDvId,vcrcCreateDate)
GO




CREATE TABLE pfuser.VaultReplication(
	repDsuId        INT NOT NULL,	
   	repDvId		INT NOT NULL,
	repType		INT NOT NULL,
	repPartition	NVARCHAR(255) NOT NULL,
	repState	INT NOT NULL,
    repFilesCopied INT NOT NULL,
    repIterCount   INT NOT NULL,    
	repDate		DATETIME NOT NULL,
	repLastCopy	DATETIME NULL,
	repComment 	NVARCHAR(255) NULL,
	CONSTRAINT pk_VaultRep PRIMARY KEY (repDsuId,repDvId,repType,repPartition)
--,
--    CONSTRAINT fk_VaultRepDsuId FOREIGN KEY (repDsuId) REFERENCES pfuser.DiskStorageUnit(dsuId) ON DELETE CASCADE,
--    CONSTRAINT fk_VaultRepDvId FOREIGN KEY (repDvId) REFERENCES pfuser.DiskVolume(dvId) ON DELETE CASCADE,
--    CONSTRAINT fk_VaultRepType CHECK (repType IN (0, 1, 2))
)
GO
CREATE INDEX i1_vaultRep ON pfuser.VaultReplication(repDvId)
GO

   
CREATE TABLE pfuser.StorageContainerLog (
	sclDate                     DATETIME NOT NULL,
	sclType                     INT NOT NULL,
	sclUnitName                 VARCHAR(32) NULL,
	sclLocation                 VARCHAR(255) NULL,
    sclMessage                  NVARCHAR(255)
)
GO

CREATE INDEX i1_SCL ON pfuser.StorageContainerLog(sclDate)
GO

CREATE TABLE pfuser.AppStorageMap (
	asmApp		VARCHAR(255) NOT NULL,
	asmModule	VARCHAR(255) NOT NULL,
   	asmSubModule	VARCHAR(255) NOT NULL,
   	asmDsuId		INT NULL,
   	asmUpdate	DATETIME NOT NULL,
	CONSTRAINT pk_appStorMap	 PRIMARY KEY (asmApp,asmModule,asmSubModule)
--,
--    CONSTRAINT fk_appStorMap FOREIGN KEY (asmDsuId) REFERENCES pfuser.DiskStorageUnit(dsuId)
)
GO


CREATE TABLE pfuser.VaultItemStats (
	viStatDvId INT NOT NULL,
	viStatDsuId INT NOT NULL,
	viStatPeriodInfo VARCHAR(255) NOT NULL,
	viStatPeriodStartDate DATETIME NOT NULL,
	viStatChangeNumber INT NOT NULL,
	viStatAddCount   INT NOT NULL,
	viStatAddSize  BIGINT NOT NULL,
	viStatDelCount   INT NOT NULL,
	viStatDelSize  BIGINT NOT NULL,
	viStatCreateDate 	DATETIME NOT NULL,
	viStatUpdate	DATETIME NOT NULL,
	CONSTRAINT pk_ViStats PRIMARY KEY (viStatDvId,viStatPeriodInfo)
)
GO

CREATE INDEX i1_ViStats ON pfuser.VaultItemStats (viStatPeriodStartDate)
GO
CREATE INDEX i2_ViStats ON pfuser.VaultItemStats (viStatDsuId,viStatPeriodStartDate)
GO



-- OPTIONAL
CREATE SEQUENCE pfuser.ContentCollection_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.ContentCollection (
    -- IDENTITY
	ccId			BIGINT NOT NULL,
	ccVaultId		VARCHAR(128) NOT NULL,
	ccDateCreate		DATETIME NOT NULL,
	ccFlags			INT NOT NULL,
	ccSeq			INT NOT NULL,
	ccDeleted		CHAR(1) NOT NULL,
	ccMachine	NVARCHAR(255),	
	CONSTRAINT pk_ContColl PRIMARY KEY (ccId),
	CONSTRAINT uk_ContColl UNIQUE (ccVaultId)
)
GO


-- OPTIONAL
CREATE SEQUENCE pfuser.StorageZone_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.StorageZone (
 -- IDENTITY
	zoneId		BIGINT NOT NULL,
	zoneName	VARCHAR(128) NOT NULL,
	zoneDateCreate	DATETIME NOT NULL,
	zoneDesc	NVARCHAR(255) NULL,
	zoneIsolated	CHAR(1) NOT NULL,
	CONSTRAINT pk_StoreZone PRIMARY KEY (zoneId),
	CONSTRAINT uk_StoreZone UNIQUE (zoneName)
)
GO



CREATE SEQUENCE pfuser.cloudStore_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.CloudStore (
	storeId		INT NOT NULL,
	storeType	VARCHAR(255) NOT NULL,
	storeName	NVARCHAR(255) NOT NULL,
	storeCreateDate	DATETIME NOT NULL,
	storeLastUpdate DATETIME NOT NULL,
	storeVal1	NVARCHAR(255) NULL,
	storeVal2	NVARCHAR(255) NULL,
	storeVal3	NVARCHAR(255) NULL,
	storeVal4	NVARCHAR(255) NULL,
	storeVal5	NVARCHAR(255) NULL,
	storeVal6	NVARCHAR(255) NULL,
	storeVal7	NVARCHAR(255) NULL,
	storeVal8	NVARCHAR(255) NULL,
	CONSTRAINT pk_cloudStore PRIMARY KEY (storeId),
	CONSTRAINT uk_cloudStore UNIQUE (storeName)
)
GO

CREATE TABLE pfuser.ExternalWorm (
	ewId  VARCHAR(128) NOT NULL,
	ewTenantId INT NOT NULL,
	ewAppType	VARCHAR(64) NOT NULL,
	ewPeriod VARCHAR(64) NOT NULL,
	ewDateStart	DATETIME NOT NULL,
	ewDateEnd DATETIME NOT NULL,
	ewDate	DATETIME NOT NULL,
	ewStoreType	VARCHAR(64) NOT NULL,
	ewStoreId INT NOT NULL,
	ewSize	BIGINT NOT NULL,
	ewDigest	VARCHAR(255) NULL,
	ewStoreVal1 NVARCHAR(255) NULL,
	ewStoreVal2 NVARCHAR(255) NULL,
	ewStoreVal3 NVARCHAR(255) NULL,
	ewStoreVal4 NVARCHAR(255) NULL,
	ewStoreVal5 NVARCHAR(255) NULL,
	ewStoreVal6 NVARCHAR(255) NULL,
	ewStoreVal7 NVARCHAR(255) NULL,
	ewStoreVal8 NVARCHAR(255) NULL,
	CONSTRAINT pk_eworm PRIMARY KEY (ewId)
)
GO
