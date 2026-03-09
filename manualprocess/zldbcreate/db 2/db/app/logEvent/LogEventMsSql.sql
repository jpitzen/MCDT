-- *************************************************************************************
--	LogEvent
-- *************************************************************************************

CREATE SEQUENCE pfuser.LogEventStore_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.LogEventStore (
	logStoreId		INT NOT NULL,
	logStoreName 	 NVARCHAR(255) NOT NULL,
	logStoreDisplayName	        NVARCHAR(255) NOT NULL,
	logTenantId 	INT NOT NULL,
	logCreateDate	DATETIME NOT NULL,
	logStoreKey		VARCHAR(128) NOT NULL,
	CONSTRAINT pk_logEvStore PRIMARY KEY(logStoreId),
	CONSTRAINT uk_logEvStore UNIQUE (logTenantId,logStoreName)
)
GO
 

CREATE SEQUENCE pfuser.LogEventRepository_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.LogEventRepository (
        logRepId INT NOT NULL,
        logRepParentId INT NOT NULL,
        logRepStoreId INT NOT NULL,
        logRepName	NVARCHAR(255) NOT NULL,
        logRepDispName	NVARCHAR(255) NOT NULL,
        logRepDesc	NVARCHAR(255) NULL,
        logRepSchemaId INT NOT NULL,
        logRepFlags INT NOT NULL,
        logRepObjectId INT NOT NULL,
		logRepRetentionId INT NOT NULL,
        logRepCreateDate DATETIME NOT NULL,
        logRepUpdateDate DATETIME NOT NULL,
		logRepRecordDate DATETIME NOT NULL,
	CONSTRAINT pk_logRep PRIMARY KEY (logRepId),
	CONSTRAINT uk_logRep UNIQUE (logRepName,logRepParentId,logRepStoreId)
)
GO
-- Storage (initial 5M NEXT 5M MINEXTENTS 1 MAXEXTENTS 20 PCTINCREASE 33) PCTFREE 5

CREATE INDEX i1_logRep ON pfuser.LogEventRepository(logRepStoreId)
GO



CREATE SEQUENCE pfuser.LogEventObject_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.LogEventObject (
	logObjId		BIGINT  NOT NULL,
	logObjType		INT NOT NULL,
	logObjRefId		INT NOT NULL,
	logObjStoreId		INT NOT NULL,
	logObjSeqNumber		INT NOT NULL,
	logObjNext		CHAR(1) NOT NULL,
	logObjVal1		NVARCHAR(255) NULL,
	logObjVal2		NVARCHAR(255) NULL,
	logObjVal3		NVARCHAR(255) NULL,
	logObjVal4		NVARCHAR(255) NULL,
	logObjVal5		NVARCHAR(255) NULL,
	logObjVal6		NVARCHAR(255) NULL,
	logObjVal7		NVARCHAR(255) NULL,
	logObjVal8		NVARCHAR(255) NULL,
	CONSTRAINT pk_LogEventObject PRIMARY KEY (logObjId,logObjSeqNumber),
	CONSTRAINT uk_LogEventObject UNIQUE (logObjType, logObjRefId,logObjSeqNumber)
)
GO



CREATE SEQUENCE pfuser.LogEventSchema_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.LogEventSchema (
	logSchemaId INT NOT NULL,
	logSchemaStoreId 	INT NOT NULL,
	logSchemaName			VARCHAR(128) NOT NULL,
	logSchemaVersion		VARCHAR(128) NOT NULL,
	logSchemaObjectId 	INT NOT NULL,
	CONSTRAINT pk_logSchema PRIMARY KEY(logSchemaId),
	CONSTRAINT uk_logSchema UNIQUE(logSchemaStoreId,logSchemaName)
)
GO




CREATE SEQUENCE pfuser.LogEventFile_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.LogEventFile (
	logFileId	 BIGINT  NOT NULL,
	-- //MSSQL{[NVARCHAR2(255) NOT NULL~~NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL]}
	logFileName    NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL,
	logFileDisplayName NVARCHAR(255) NULL,
	logFileStoreId INT NOT NULL,
	logFileRepositoryId	INT NOT NULL,
	logFileSubject    NVARCHAR(255) NULL,
	logFileDate    DATETIME  NOT NULL,
	logFileProcessDate    DATETIME  NOT NULL,
	logFileMPNames    VARCHAR(255) NULL,
	logFileLocation NVARCHAR(255) NULL,
	logFileVaultId			VARCHAR(128) NULL,
	logFileSize 		BIGINT NULL,
	logFileRawSize 		BIGINT NULL,
	logFileLastUpdate    DATETIME  NOT NULL,
	logFileStatus  INT NOT NULL,
	logFileComment  NVARCHAR(255) NULL,
	CONSTRAINT pk_LogEvFile PRIMARY KEY(logFileId),
	CONSTRAINT uk_LogEvFile UNIQUE (logFileStoreId,logFileRepositoryId,logFileName)
)
GO

CREATE INDEX i1_logEvFile ON pfuser.LogEventFile(logFileStoreId,logFileStatus)
GO





CREATE TABLE pfuser.LogEventPrivileges (
	lepStoreId INT NOT NULL,
	lepRepositoryId INT NOT NULL,
   	lepEntityId 	INT NOT NULL,
	lepEntityType	INT NOT NULL,
	lepPrivName	VARCHAR(32) NOT NULL,
	lepRecursive	CHAR(1) NOT NULL,
	CONSTRAINT pk_LogEvPriv PRIMARY KEY (lepStoreId,lepRepositoryId,lepPrivName,lepEntityId,lepEntityType)
)
GO


CREATE TABLE pfuser.LogEventAuditTrail (
	laAction	INT NOT NULL,
	laDate		DATETIME NOT NULL,
	laRepId	INT NOT NULL,
	laStoreId	INT NOT NULL,
	laZlpUserId	INT NOT NULL,
	laUser		NVARCHAR(255) NOT NULL,
	laDomainId	INT NOT NULL,
	laTenantId 	INT NOT NULL,	
	laTxnId		VARCHAR(64) NOT NULL,
	laClearanceLevel	INT NOT NULL,
	laSourceIP 	VARCHAR(64) NULL,
	laDestIP   	VARCHAR(64) NULL,
	laAccessType 	VARCHAR(128) NULL,
	laComments	NVARCHAR(255) NULL,
	laVal1 	NVARCHAR(255) NULL,
	laVal2 	NVARCHAR(255) NULL,
	laVal3 	NVARCHAR(255) NULL,
	laVal4 	NVARCHAR(255) NULL,
	laVal5 	NVARCHAR(255) NULL
)
GO

CREATE INDEX i1_LogEvAudTrail ON pfuser.LogEventAuditTrail(laDate)
GO
CREATE INDEX i2_LogEvAudTrail ON pfuser.LogEventAuditTrail(laDomainId)
GO
CREATE INDEX i3_LogEvAudTrail ON pfuser.LogEventAuditTrail(laZlpUserId)
GO

CREATE TABLE pfuser.LogEventLegalhold (
	lholdRepId	INT NOT NULL,
	lholdTenantId	INT NOT NULL,
	lholdDate       DATETIME NOT NULL,
	lholdOwnerId 	INT NOT NULL,
	lholdOwnerAppId	INT NOT NULL,
	lholdOwnerAppRefId	BIGINT NOT NULL,
	lholdComments	NVARCHAR(255) NULL,
	CONSTRAINT pk_LogLegalHld PRIMARY KEY (lholdRepId,lholdOwnerAppId,lholdOwnerId)
)
GO

CREATE INDEX i1_LogLegalHld ON pfuser.LogEventLegalhold(lholdOwnerAppId,lholdOwnerId)
GO
