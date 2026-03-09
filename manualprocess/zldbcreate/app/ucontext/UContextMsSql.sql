
CREATE SEQUENCE pfuser.UContext_Sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.UContext (
	contextId INT NOT NULL,	
	contextTenantId INT NOT NULL,
	contextName NVARCHAR(255) NOT NULL,
	contextDesc NVARCHAR(255) NULL,
	contextCreateDate DATETIME NOT NULL,
    contextLastAccessedDate DATETIME NOT NULL,
    contextType NVARCHAR(255) NOT NULL,
    contextMode NVARCHAR(64) NULL,
    contextSearchStoreType INT NULL,
	contextVaultId VARCHAR(128) NULL,
	contextCaseId INT NULL,
	CONSTRAINT pk_UContext PRIMARY KEY (contextId),
	CONSTRAINT uk_UContext UNIQUE (contextTenantId,contextName)
)
GO
CREATE INDEX i1_UContext ON pfuser.UContext(contextCaseId)
GO




CREATE SEQUENCE pfuser.UTag_Sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.UTag (
	tagId 			INT NOT NULL,
	tagContextId		INT NOT NULL,
	tagParentId		INT NOT NULL,
	tagName			NVARCHAR(255) NOT NULL,
	tagDisplayName			NVARCHAR(255) NULL,
	tagFlags		BIGINT NOT NULL,
	tagDesc			NVARCHAR(255) NULL,
	tagCreateDate	DATETIME NOT NULL,
	CONSTRAINT pk_UTag PRIMARY KEY (tagId),
	CONSTRAINT uk_UTag UNIQUE (tagContextId,tagName)
)
GO
	










-- OPTIONAL
CREATE SEQUENCE pfuser.UContextDataSource_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.UContextDataSource (
	-- IDENTITY
	ucdsId		BIGINT NOT NULL,
	ucdsName		NVARCHAR(255) NOT NULL,
	ucdsContextId 	INT NOT NULL,
	ucdsSrchStoreId INT NOT NULL,
	ucdsPurpose VARCHAR(32) NOT NULL,
	ucdsType		VARCHAR(32),
	ucdsDateCreate	DATETIME NOT NULL,
	ucdsUpdate	DATETIME NOT NULL,
	ucdsVaultItemId	VARCHAR(128) NULL,
	ucdsVaultPwd 	VARBINARY(255) NULL,
	ucdsLastExportedDate DATETIME NULL,
	ucdsCaseSrcId	INT NOT NULL,
	CONSTRAINT pk_UContextDataSource PRIMARY KEY (ucdsId),
	CONSTRAINT uk_UContextDataSource UNIQUE (ucdsContextId,ucdsName)
)
GO
CREATE INDEX i1_UContextDataSource ON pfuser.UContextDataSource(ucdsVaultItemId)
GO



CREATE SEQUENCE pfuser.UCtxDataSrcRuns_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.UContextDataSourceRuns (
	runId		INT NOT NULL,
	runSrcId		INT NOT NULL,
	runContextId 	INT NOT NULL,
	runSrchPID		NVARCHAR(255),
	runStatus	INT NOT NULL,
	runSrchStart	DATETIME NOT NULL,
	runSrchUpdate	DATETIME NOT NULL,
	runSrchEnd	DATETIME NULL,
	runSrchItemFound	INT NOT NULL,
	runSrchStatusMsg NVARCHAR(255) NULL,
	runImportPID		NVARCHAR(255),
	runImportStart	DATETIME NULL,
	runImportUpdate	DATETIME NULL,
	runImportEnd	DATETIME NULL,
	runItemNew	INT NULL,
	runItemNewRef	INT NULL,
	runItemPrev	INT NULL,
	runIItemErrors	INT NULL,
	runImportStatusMsg NVARCHAR(255) NULL,
	CONSTRAINT pk_UCtxDSRuns PRIMARY KEY (runId)
)
GO
CREATE INDEX i1_UCtxDSRuns ON pfuser.UContextDataSourceRuns(runContextId,runSrcId)
GO

CREATE TABLE pfuser.UCItem (
	uciContextId	INT NOT NULL,
	uciId	INT NOT NULL,
	uciFlags	INT NOT NULL,
	uciCreateDate	DATETIME NOT NULL,
	uciLastUpdate	DATETIME NOT NULL,	
	uciSyncDate	DATETIME NULL,	
	uciTagIds    NVARCHAR(255) NULL,
	uciVal1	    NVARCHAR(255) NULL,
	uciVal2		NVARCHAR(255) NULL,
	uciVal3		NVARCHAR(255) NULL,
	uciVal4		NVARCHAR(255) NULL,
	uciVal5		NVARCHAR(255) NULL,
	uciVal6		NVARCHAR(255) NULL,
	uciVal7		NVARCHAR(255) NULL,
	uciVal8		NVARCHAR(255) NULL,
	CONSTRAINT pk_ucItem PRIMARY KEY (uciContextId,uciId)
)
GO


CREATE SEQUENCE pfuser.UContextSearch_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.UContextSearch (
	ucsId		INT NOT NULL,
	ucsParentId INT NOT NULL,
	ucsName		NVARCHAR(255) NOT NULL,
	ucsType		VARCHAR(255) NOT NULL,
	ucsReservedQuery CHAR(1) NOT NULL,
	ucsContextId 	INT NOT NULL,
	ucsTenantId	INT NOT NULL,
	ucsDesc		NVARCHAR(255) NULL,
	ucsDate 	DATETIME NOT NULL,
	ucsQueryVal1 NVARCHAR(255) NULL,
	ucsQueryVal2 NVARCHAR(255) NULL,
	ucsQueryVal3 NVARCHAR(255) NULL,
	ucsQueryVal4 NVARCHAR(255) NULL,
	ucsQueryVal5 NVARCHAR(255) NULL,
	ucsQueryVal6 NVARCHAR(255) NULL,
	ucsQueryVal7 NVARCHAR(255) NULL,
	ucsQueryVal8 NVARCHAR(255) NULL,
	ucsQueryVal9 NVARCHAR(255) NULL,
	ucsQueryVal10 NVARCHAR(255) NULL,
	ucsJSONVal1 NVARCHAR(255) NULL,
	ucsJSONVal2 NVARCHAR(255) NULL,
	ucsJSONVal3 NVARCHAR(255) NULL,
	ucsJSONVal4 NVARCHAR(255) NULL,
	ucsJSONVal5 NVARCHAR(255) NULL,
	ucsJSONVal6 NVARCHAR(255) NULL,
	ucsJSONVal7 NVARCHAR(255) NULL,
	ucsJSONVal8 NVARCHAR(255) NULL,
	ucsJSONVal9 NVARCHAR(255) NULL,
	ucsJSONVal10 NVARCHAR(255) NULL,
	CONSTRAINT pk_UContextSearch PRIMARY KEY (ucsId),
	CONSTRAINT uk_UContextSearch UNIQUE (ucsTenantId,ucsContextId,ucsParentId,ucsName)
)
GO


CREATE TABLE pfuser.UContextAuditTrail (
	ucaAction INT NOT NULL,
	ucaDate DATETIME NOT NULL,
	ucaItemId BIGINT NOT NULL,
	ucaRefItemId VARCHAR(255) NULL,
	ucaContextId INT NOT NULL,
	ucaZlpUserId INT NOT NULL,
	ucaUser NVARCHAR(255) NOT NULL,
	ucaDomainId INT NOT NULL,
	ucaTenantId INT NOT NULL,
	ucaTxnId VARCHAR(64) NOT NULL,
	ucaClearanceLevel INT NOT NULL,
	ucaSourceIP VARCHAR(64) NULL,
	ucaDestIP VARCHAR(64) NULL,
	ucaAccessType VARCHAR(128) NULL,
	ucaZViteStId VARCHAR(255) NULL,
	ucaComments NVARCHAR(255) NULL,
	ucaVal1 NVARCHAR(255) NULL,
	ucaVal2 NVARCHAR(255) NULL,
	ucaVal3 NVARCHAR(255) NULL,
	ucaVal4 NVARCHAR(255) NULL,
	ucaVal5 NVARCHAR(255) NULL
)
GO

CREATE INDEX i1_ContextAudit ON pfuser.UContextAuditTrail(ucaDate)
GO
CREATE INDEX i2_ContextAudit ON pfuser.UContextAuditTrail(ucaDomainId)
GO
CREATE INDEX i3_ContextAudit ON pfuser.UContextAuditTrail(ucaItemId)
GO
CREATE INDEX i4_ContextAudit ON pfuser.UContextAuditTrail(ucaRefItemId)
GO
CREATE INDEX i5_ContextAudit ON pfuser.UContextAuditTrail(ucaZlpUserId)
GO

CREATE SEQUENCE pfuser.UContextDataSourceIndexRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.UContextDataSourceIndexRuns (
    ucirId INT NOT NULL,
    ucirContextId INT NOT NULL,
    ucirSrcId INT NOT NULL,
    ucirType VARCHAR(32),
    ucirCreateDate DATETIME NOT NULL,
    ucirSearchDate DATETIME NOT NULL,
    ucirSearchCount INT NOT NULL,
    ucirStartDate DATETIME NULL,
    ucirEndDate DATETIME NULL,
    ucirUpdate DATETIME NULL,
    ucirNewCount INT NOT NULL,
    ucirTotalCount INT NOT NULL,
    ucirPID VARCHAR(32) NOT NULL,
    ucirStatus INT NOT NULL,
    ucirStatusMsg VARCHAR(255) NULL,
    CONSTRAINT pk_UContextDataSourceIndexRuns PRIMARY KEY (ucirId)
)
GO
CREATE INDEX i1_UContextDataSourceIndexRuns ON pfuser.UContextDataSourceIndexRuns(ucirContextId,ucirSrcId)
GO


CREATE SEQUENCE pfuser.UContextLiteSearch_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.UContextLiteSearch (
	-- IDENTITY
	uclsId		BIGINT NOT NULL,
	uclsName		NVARCHAR(255) NOT NULL,
	uclsContextId 	INT NOT NULL,
	uclsSrchStoreId INT NOT NULL,
	uclsPurpose VARCHAR(32) NOT NULL,
	uclsType		VARCHAR(32),
	uclsDateCreate	DATETIME NOT NULL,
	uclsUpdate	DATETIME NOT NULL,
	uclsVaultItemId	VARCHAR(128) NULL,
	uclsVaultPwd 	VARBINARY(255) NULL,
	CONSTRAINT pk_UContextLiteSearch PRIMARY KEY (uclsId),
	CONSTRAINT uk_UContextLiteSearch UNIQUE (uclsContextId,uclsName)
)
GO
CREATE INDEX i1_uk_UContextLiteSearch ON pfuser.UContextLiteSearch(uclsVaultItemId)
GO


CREATE SEQUENCE pfuser.UContextLiteSearchRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.UContextLiteSearchRuns (
	runId		INT NOT NULL,
	runSearchId		INT NOT NULL,
	runContextId 	INT NOT NULL,
	runSrchPID		NVARCHAR(255),
	runStatus	INT NOT NULL,
	runSrchStart	DATETIME NOT NULL,
	runSrchUpdate	DATETIME NOT NULL,
	runSrchEnd	DATETIME NULL,
	runSrchItemFound	INT NOT NULL,
	runSrchStatusMsg NVARCHAR(255) NULL,
	runVaultId VARCHAR(128) NULL,
    runVaultPwd 	VARBINARY(255) NULL,
	CONSTRAINT pk_UContextLiteSearchRuns PRIMARY KEY (runId)
)
GO
CREATE INDEX i1_UContextLiteSearchRuns ON pfuser.UContextLiteSearchRuns(runContextId,runSearchId)
GO
