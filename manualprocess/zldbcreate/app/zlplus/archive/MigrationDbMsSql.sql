CREATE TABLE pfuser.MigrationInfo (
    miProjId INT NOT NULL,
    miFolderCount INT NOT NULL,
    miFileCount BIGINT NOT NULL,
    miProjTagCount INT NOT NULL,
    miAppliedTagCount INT NOT NULL,
    miNewTagCount INT NOT NULL,
    miTaggedFileCount BIGINT NOT NULL,
    miAppliedRecordCount INT NOT NULL,
    miMarkedAsRecordFileCount BIGINT NOT NULL,
    miMigrationStatus INT NOT NULL,
    miStartTime DATETIME NOT NULL,
    miLastUpdate DATETIME NULL,
    miEndTime DATETIME NULL,

    CONSTRAINT pk_MI PRIMARY KEY (miProjId)
)
GO

CREATE TABLE pfuser.MigrationFailureEntry (
    mfeProjId	INT NOT NULL,
    mfeFteParentId	INT NOT NULL,
    mfeFteDocHit	INT NOT NULL,
    mfeApfsId INT NULL,
    mfeApesUnid	VARCHAR(255) NULL,
    mfeIpfItemUnid	VARCHAR(255) NULL,
    -- //PGSQL{[mfeIpfMissingStaticTag INT NULL~~ipfItemCategory INT\x5B\x5D NULL]}
    mfeIpfMissingStaticTag	NVARCHAR(512) NULL,
    mfeIterCount INT NULL,
    CONSTRAINT pk_mfe PRIMARY KEY (mfeprojId,mfeFteParentId,mfeFteDocHit)
)
GO
