USE zldb

GO


CREATE SEQUENCE pfuser.tenant_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO




CREATE TABLE pfuser.ZLInstance (
	type INT NOT NULL,
	id VARCHAR(64) NOT NULL,
	CONSTRAINT pk_zlinstance PRIMARY KEY (type)
)
GO

	


CREATE TABLE pfuser.Tenant (
	tenId INT NOT NULL,
	tenName VARCHAR(64) NOT NULL,
	tenDisplayName NVARCHAR(255) NULL,
	tenRootDomainId INT NOT NULL,
	tenCreateDate DATETIME NOT NULL,
	tenLDAPInfo NVARCHAR(255) NULL,
    CONSTRAINT pk_Tenant PRIMARY KEY (tenId),
    CONSTRAINT uk_Tenant UNIQUE (tenName)
)
GO
	


CREATE SEQUENCE pfuser.za_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.ZipAccount (
    zaAcctNo                  INT NOT NULL,
    zaLang		      VARCHAR(10) NULL,
    zaAcctCreateDate          DATETIME NOT NULL,
    zaUserId                  VARCHAR(255) NOT NULL,
    zaDomainId		      INT NOT NULL,
    zaTenantId				INT NOT NULL,
    zaEncPwd               VARBINARY(255)  NULL,    
    zaLastLoginDate           DATETIME NULL,   
    zaAcctPrefTimeZone        NVARCHAR(32) NULL,
    zaAcctStatus              INT NOT NULL,
    zaPrimaryEmailAddress     VARCHAR(255) NULL,
    zaUserPersonalKey         VARBINARY(128) NULL,
    zaAcctLastModDate         DATETIME NOT NULL,
    zaAuditRecordLevel        INT NOT NULL,
    zaAuditClearanceLevel     INT NOT NULL,
    zaTitle                   NVARCHAR(255) NULL,
    zaFirstName               NVARCHAR(255) NULL,
    zaMiddleInit              CHAR(64) NULL,
    zaLastName                NVARCHAR(255) NULL,
    zaCompName                NVARCHAR(128) NULL,
    zaPasswordExpiryDate      DATETIME NULL,
    zaPasswordChangeDate      DATETIME NULL,
    zaAddressLine1            NVARCHAR(255) NULL,
    zaAddressLine2            NVARCHAR(255) NULL,
    zaCity                    NVARCHAR(128) NULL,
    zaState                   NVARCHAR(128) NULL,
    zaCountry                 NVARCHAR(128) NULL,
    zaZipCode                 NVARCHAR(64) NULL,
    zaContactEmailID          NVARCHAR(255) NULL,
    zaDepartment              NVARCHAR(128) NULL,
    zaHomephone               NVARCHAR(64) NULL,
    zaWorkphone               NVARCHAR(64) NULL,
    zaSSN                         NVARCHAR(64) NULL,
    CONSTRAINT pk_ZipAccount PRIMARY KEY (zaAcctNo),
    CONSTRAINT uk_zipAccount UNIQUE (zaUserId,zaDomainId)
)
GO
-- Storage (initial 100M next 50M minextents 1 PCTINCREASE 10 maxextents 30)



-- OPTIONAL
CREATE SEQUENCE pfuser.domainInfo_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO



CREATE TABLE pfuser.DomainInfo (
	-- IDENTITY
	diId BIGINT NOT NULL,
	diDomainName VARCHAR(255) NOT NULL,
    diParentId INT NOT NULL,
    diTenantId INT NOT NULL,
    diLanguage VARCHAR(10) NOT NULL,
    diTimeZone VARCHAR(32) NULL,
	diCreateDate DATETIME NOT NULL,
	diDeleted CHAR(1) NOT NULL,
	CONSTRAINT pk_DomainInfo PRIMARY KEY (diId),
	CONSTRAINT uk_DomainInfo UNIQUE(diDomainName)
)
GO
  


CREATE TABLE pfuser.UserSession (
    UsStId                  VARCHAR(64) NOT NULL,
    UsAccessId		VARCHAR(64) NULL,
    UsType		    INT NOT NULL,    
    UsAuthMethod	    VARCHAR(64) NOT NULL,
    UsAuthToken		    NVARCHAR(255) NULL,
    UsProcessId 	    VARCHAR(32) NOT NULL,
    UsAcctNo		    INT NOT NULL,
    UsDomainId			INT NOT NULL,
    UsTenantId			INT NOT NULL,
    UsCreateDate            DATETIME NOT NULL,
    UsLastTouchDate         DATETIME NOT NULL,
    UsInternalSecret	VARBINARY(64) NOT NULL,
    UsCSRF				VARCHAR(64) NOT NULL,
    UsState                 NVARCHAR(255) NULL,
    UsLang                  CHAR(2) NULL,
    UsProtocol		    VARCHAR(32) NULL,
    UsSourceIP		    NVARCHAR(255) NULL,
    UsUserAgent		    NVARCHAR(255) NULL,
    UsTimeout		    INT NOT NULL,
    CONSTRAINT pk_UserSession PRIMARY KEY (UsStId)
)
GO
-- Storage (initial 10M next 10M minextents 1 PCTINCREASE 15 maxextents 30)


CREATE INDEX i1_UserSession ON pfuser.UserSession(UsCreateDate)
GO



CREATE TABLE pfuser.AppLifeCycle (
    AlcId                   VARCHAR(64) NOT NULL,
    AlcMachine              VARCHAR(64) NOT NULL,
    AlcMachineIP            VARCHAR(64) NOT NULL,
    AlcAppId                VARCHAR(64) NOT NULL,
    AlcAppVersion           VARCHAR(255) NOT NULL,
    AlcStart                DATETIME NOT NULL,
    AlcLastUpdate           DATETIME NULL,
    AlcStatusId             INT NULL,
    AlcComment              NVARCHAR(255) NULL,
    AlcUserComment          NVARCHAR(255) NULL,
    AlcSite                 VARCHAR(32) NOT NULL,
     CONSTRAINT pk_AppLifeCycle PRIMARY KEY (AlcId)
)
GO



CREATE INDEX i1_AppLifeCycle ON pfuser.AppLifeCycle(AlcStart)
GO
CREATE INDEX i2_AppLifeCycle ON pfuser.AppLifeCycle(AlcLastUpdate)
GO




-- OPTIONAL
CREATE SEQUENCE pfuser.ParameterSet_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.ParameterSet (
	-- IDENTITY
	psId			BIGINT NOT NULL,
	psName			VARCHAR(128) NOT NULL,
	psDomainId		INT NOT NULL,
	psTenantId		INT NOT NULL,
	psLangId		VARCHAR(12) NULL,
	psCluster		VARCHAR(255) NULL,
	psMachine		VARCHAR(255) NULL,
	psCreateDate		DATETIME NOT NULL,
	CONSTRAINT pk_ParameterSet PRIMARY KEY (psId),
	CONSTRAINT uk_ParameterSet UNIQUE (PsName,psDomainId,psTenantId,psLangId,psCluster,psMachine)
)
GO



-- OPTIONAL
CREATE SEQUENCE pfuser.ParameterElement_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.ParameterElement (
	-- IDENTITY
	peId			BIGINT NOT NULL,
	peName			VARCHAR(128) NOT NULL,
	peType 			VARCHAR(128) NOT NULL,
	pePsId			INT NOT NULL,
	peLastUpdate		DATETIME NOT NULL,
	peVal1			NVARCHAR(255) NULL,
	peVal2			NVARCHAR(255) NULL,
	peVal3			NVARCHAR(255) NULL,
	peVal4			NVARCHAR(255) NULL,
	peVal5			NVARCHAR(255) NULL,
	CONSTRAINT pk_ParamElem PRIMARY KEY (peId),
	CONSTRAINT uk_ParamElem UNIQUE (pePsId,peName)
)
GO




CREATE TABLE pfuser.EventLog (
	evPID VARCHAR(64) NULL,
	evAlcId VARCHAR(64) NULL,
	evTransId	VARCHAR(64) NULL,
	evUser  VARCHAR(255) NULL,
	evDate	DATETIME NOT NULL,
	evType	INT NOT NULL,
	evTitle NVARCHAR(255) NULL,
	evDetailVal1 NVARCHAR(255) NULL,
	evDetailVal2 NVARCHAR(255) NULL,
	evDetailVal3 NVARCHAR(255) NULL,
	evDetailVal4 NVARCHAR(255) NULL
)
GO


CREATE INDEX i1_EventLog ON pfuser.EventLog(evAlcId)
GO
CREATE INDEX i2_EventLog ON pfuser.EventLog(evDate)
GO



CREATE TABLE pfuser.SystemAudit (
    saAction 	INT NOT NULL,
	saDate 		DATETIME NOT NULL,
	saZlpUserId	INT NOT NULL,
	saUser  	NVARCHAR(255) NULL,
	saDomainId	INT NOT NULL,
	saTenantId 	INT NOT NULL,
	saTxnId		VARCHAR(64) NOT NULL,
	saClearanceLevel	INT NOT NULL,
	saSourceIP 	VARCHAR(64) NULL,
	saDestIP   	VARCHAR(64) NULL,
	saAccessType VARCHAR(128) NULL,	
	saComment	NVARCHAR(255) NULL,
	saDetailVal1 NVARCHAR(255) NULL,
	saDetailVal2 NVARCHAR(255) NULL,
	saDetailVal3 NVARCHAR(255) NULL,
	saDetailVal4 NVARCHAR(255) NULL,
	saDetailVal5 NVARCHAR(255) NULL
)
GO


CREATE INDEX i3_SysAudit ON pfuser.SystemAudit(saUser)
GO
CREATE INDEX i2_SysAudit ON pfuser.SystemAudit(saDate)
GO
CREATE INDEX i4_SysAudit ON pfuser.SystemAudit(saZlpUserId)
GO


CREATE SEQUENCE pfuser.ProtectedKey_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.ProtectedKey (
	keyId		INT NOT NULL,
	keyName 	NVARCHAR(255) NOT NULL,
	keyType		NVARCHAR(128) NOT NULL,
	keyCreateDate	DATETIME NOT NULL,
	keyDataSize	INT NOT NULL,
	keyData1	VARBINARY(255) NULL,
	keyData2	VARBINARY(255) NULL,	
	keyData3	VARBINARY(255) NULL,
	keyData4	VARBINARY(255) NULL,
	keyData5	VARBINARY(255) NULL,
	keyData6	VARBINARY(255) NULL,
	keyData7	VARBINARY(255) NULL,	
	keyData8	VARBINARY(255) NULL,
	keyData9	VARBINARY(255) NULL,
	keyData10	VARBINARY(255) NULL,
	CONSTRAINT pk_ProtectedKey PRIMARY KEY(keyId),
	CONSTRAINT uk_ProtectedKey UNIQUE (keyName)
)
GO


-- OPTIONAL
CREATE SEQUENCE pfuser.ua_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.UserAuthentication (
    -- IDENTITY
    UaId		       BIGINT NOT NULL,
    UaAcctNo                INT NOT NULL,
    UaTenantId 			INT NOT NULL,
    UaAddress 		    VARCHAR(255) NULL,
    UaDate		    DATETIME NOT NULL, 
    UaType		    VARCHAR(32) NOT NULL,
    UaResource  	    VARCHAR(32) NOT NULL,
    UaAction		   INT NOT NULL,
    UaMessage		    NVARCHAR(255) NULL,
    UaProtocol		    NVARCHAR(32) NULL,
    UaIP		    NVARCHAR(64) NULL,
    UaUserAgent	NVARCHAR(255) NULL,
    CONSTRAINT pk_UserAuth PRIMARY KEY(UaId)
)
GO
-- Storage (initial 10M next 10M minextents 1 PCTINCREASE 15 maxextents 30)


CREATE INDEX i1_UserAuth ON pfuser.UserAuthentication(UaAcctNo)
GO
CREATE INDEX i2_UserAuth ON pfuser.UserAuthentication(UaAddress)
GO
CREATE INDEX i3_UserAuth ON pfuser.UserAuthentication(UaDate)
GO


CREATE TABLE pfuser.UserRoles (
    urAcctNo                  INT NOT NULL,
    urRoleId			      INT NOT NULL,
    urAppParam			      INT NOT NULL,
    urScopeType		      NVARCHAR(32) NULL,
    urScope1		      VARCHAR(255) NULL,
    urScope2		      VARCHAR(255) NULL,
    urScope3		      VARCHAR(255) NULL,
    CONSTRAINT uk_UserRoles UNIQUE(urAcctNo,urRoleId,urAppParam)
)
GO
CREATE INDEX i1_UserRoles ON pfuser.UserRoles(urAcctNo)
GO
CREATE INDEX i2_UserRoles ON pfuser.UserRoles(urRoleId)
GO


CREATE TABLE pfuser.SystemLock (
 	slName NVARCHAR(255)  NOT NULL,
 	slLocked	CHAR(1) NOT NULL,
	slCreateDate	DATETIME NOT NULL,
	slPID	NVARCHAR(255) NULL, 	
	slLockDate DATETIME NULL,
	slTouchDate DATETIME NULL,
 	slReleaseDate	DATETIME NULL,
	slTimeoutMs INT  NULL,
 	slPurpose	VARCHAR(255) NULL,
        slParam1	NVARCHAR(255) NULL,
	slParam2	NVARCHAR(255) NULL,
	CONSTRAINT pk_SystemLock PRIMARY KEY (slName)
)
GO
CREATE INDEX i1_SystemLock ON pfuser.SystemLock(slCreateDate)
GO



CREATE SEQUENCE pfuser.ZLPolicy_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO




CREATE TABLE pfuser.ZLPolicy (
	polId 		INT NOT NULL,
	polName		NVARCHAR(255) NOT NULL,
	polType 	NVARCHAR(64) NOT NULL,
	polTenantId	INT NOT NULL,
	polDesc		NVARCHAR(255) NULL,
	polCreateDate	DATETIME NOT NULL,
	CONSTRAINT pk_policy PRIMARY KEY (polId),
	CONSTRAINT uk2_policy UNIQUE (polType,polTenantId,polName)
)
GO

	



CREATE SEQUENCE pfuser.ZLPolicyRule_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO




CREATE TABLE pfuser.ZLPolicyRule (
	pruleId 		INT NOT NULL,
        prulePolicyId		INT NOT NULL,
	pruleShortName		NVARCHAR(64) NOT NULL,
	pruleDesc		NVARCHAR(255) NULL,
	pruleSeqNum		INT NOT NULL,
	pruleField1Name	VARCHAR(255) NULL,
	pruleField1Operator	VARCHAR(255) NULL,
	pruleField1Pattern	NVARCHAR(255) NULL,
	pruleField2Name		VARCHAR(255) NULL,
	pruleField2Operator	VARCHAR(255) NULL,
	pruleField2Pattern	NVARCHAR(255) NULL,
	pruleField3Name		VARCHAR(255) NULL,
	pruleField3Operator	VARCHAR(255) NULL,
	pruleField3Pattern	NVARCHAR(255) NULL,
	pruleField4Name		VARCHAR(255) NULL,
	pruleField4Operator	VARCHAR(255) NULL,
	pruleField4Pattern	NVARCHAR(255) NULL,
	pruleAction		VARCHAR(255) NULL,
	pruleActionVal1		NVARCHAR(255) NULL,
	pruleActionVal2		NVARCHAR(255) NULL,
	pruleActionVal3		NVARCHAR(255) NULL,
	CONSTRAINT pk_prule PRIMARY KEY (pruleId),
	CONSTRAINT uk1_prule UNIQUE (prulePolicyId, pruleShortName)
)
GO


CREATE TABLE pfuser.EntityObject (
	eoEntityType		INT NOT NULL,
	eoEntityId		INT NOT NULL,
	eoType		NVARCHAR(255) NOT NULL,
	eoRefId		INT NULL,
	eoRefName	NVARCHAR(255) NULL,
   	CONSTRAINT pk_EntObj PRIMARY KEY (eoEntityType, eoEntityId,eoType)
)
GO
CREATE INDEX i1_EntObj ON pfuser.EntityObject(eoEntityType, eoEntityId)
GO
	

CREATE SEQUENCE pfuser.ZLObject_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.ZLObject (
	zlObjId			INT NOT NULL,
	zlObjSeqNumber		INT NOT NULL,
	zlObjNext		CHAR(1) NOT NULL,
	zlObjType		VARCHAR(255) NOT NULL,
	zlObjName		NVARCHAR(255) NOT NULL,
	zlObjVal1			NVARCHAR(255) NULL,
	zlObjVal2			NVARCHAR(255) NULL,
	zlObjVal3			NVARCHAR(255) NULL,
	zlObjVal4			NVARCHAR(255) NULL,
	zlObjVal5			NVARCHAR(255) NULL,
   	CONSTRAINT pk_zlObject PRIMARY KEY (zlObjId,zlObjSeqNumber),
	CONSTRAINT uk_zlObject UNIQUE (zlObjType, zlObjName,zlObjSeqNumber)
)
GO


CREATE SEQUENCE pfuser.customRole_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


-- OPTIONAL
CREATE SEQUENCE pfuser.retentionPeriod_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.RetentionPeriod (
	-- IDENTITY
	rpId 		BIGINT NOT NULL,
	rpName		NVARCHAR(255) NOT NULL,
	rpDisplayName	NVARCHAR(255) NOT NULL,
	rpPriority	INT NOT NULL,
	rpMinRetainDays	INT NULL,
	rpRetainDays	INT NULL,
	CONSTRAINT pk_RetPeriod PRIMARY KEY (rpId),
	CONSTRAINT uk_RetPeriod UNIQUE (rpName)
)
GO

CREATE TABLE pfuser.RetentionPeriodPrivileges (
	rppRetPeriodId 		INT NOT NULL,
   	rppEntityId 	INT NOT NULL,
	rppEntityType	INT NOT NULL,
	CONSTRAINT pk_RetPeriodPriv PRIMARY KEY (rppRetPeriodId,rppEntityId,rppEntityType)
)
GO


CREATE SEQUENCE pfuser.PmTag_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.PmTag (	
	tagTenantId	INT NOT NULL,
	tagId		INT NOT NULL,
	tagParentId	INT NOT NULL,
	tagName 	NVARCHAR(255) NOT NULL,
	tagDisplayName NVARCHAR(255) NOT NULL,
	tagFlags	BIGINT NOT NULL,
	tagRetentionId	INT NOT NULL,
	tagDesc 	NVARCHAR(255) NULL,
	CONSTRAINT pk_Tag PRIMARY KEY (tagId),
	CONSTRAINT uk_Tag UNIQUE (tagTenantId,tagName)
)
GO


CREATE TABLE pfuser.ZLTempParam (
	zltpID			VARCHAR(255) NOT NULL,
	zltpType		VARCHAR(255) NOT NULL,
	zltpDate		DATETIME NOT NULL,
	zltpUserSession		VARCHAR(255) NOT NULL,
	zltpSeqNumber		INT NOT NULL,
	zltpNext			CHAR(1) NOT NULL,
	zltpVal1			NVARCHAR(255) NULL,
	zltpVal2			NVARCHAR(255) NULL,
	zltpVal3			NVARCHAR(255) NULL,
	zltpVal4			NVARCHAR(255) NULL,
	zltpVal5			NVARCHAR(255) NULL,
	zltpVal6			NVARCHAR(255) NULL,
	zltpVal7			NVARCHAR(255) NULL,
	zltpVal8			NVARCHAR(255) NULL,
	zltpVal9			NVARCHAR(255) NULL,
	zltpVal10			NVARCHAR(255) NULL,
   	CONSTRAINT pk_zltmpParam PRIMARY KEY (zltpId,zltpSeqNumber)
)
GO
CREATE INDEX i1_zltmpParam ON pfuser.ZLTempParam(zltpDate)
GO


CREATE TABLE pfuser.UserSearch (
	usZlpUserId		INT NOT NULL,
	usSrchType		INT NOT NULL,
	usAppId			INT NOT NULL,
	usCaseId		INT NOT NULL,
	usDate			DATETIME NOT NULL,
	usZlTpId		NVARCHAR(255) NOT NULL,
   	CONSTRAINT pk_us PRIMARY KEY (usZlTpId)
)
GO
CREATE INDEX i1_us ON pfuser.UserSearch(usZlpUserId,usSrchType,usAppId,usCaseId)
GO
CREATE INDEX i2_us ON pfuser.UserSearch(usDate)
GO

CREATE TABLE pfuser.SavedUserSearch (
	susZlpUserId		INT NOT NULL,
	susAppId			INT NOT NULL,
	susName NVARCHAR(255) NOT NULL,
	susSrchType		INT NOT NULL,
	susReferenceId		INT NOT NULL,
	susDate			DATETIME NOT NULL,
	susLastUpdate	DATETIME NOT NULL,
   	CONSTRAINT pk_savedUsrSrch PRIMARY KEY (susZlpUserId,susAppId,susName)
)
GO

CREATE TABLE pfuser.UserTagContext (
	utcTagId		INT NOT NULL,
	utcZlpUserId		INT NOT NULL,
	utcAppId		INT NOT NULL,
	utcAppRefId		INT NOT NULL,
	utcAppRefItemId		VARCHAR(128) NOT NULL,
	utcRefItemId		VARCHAR(128) NOT NULL,
	utcDateCreate		DATETIME NOT NULL,
	utcDateUpdate		DATETIME NOT NULL,
	utcVal1			NVARCHAR(255) NULL,
	utcVal2			NVARCHAR(255) NULL,
	utcVal3			NVARCHAR(255) NULL,
	utcVal4			NVARCHAR(255) NULL,
	utcVal5			NVARCHAR(255) NULL,
	utcVal6			NVARCHAR(255) NULL,
	utcVal7			NVARCHAR(255) NULL,
	utcVal8			NVARCHAR(255) NULL,
	utcVal9			NVARCHAR(255) NULL,
	utcVal10		NVARCHAR(255) NULL
)
GO

CREATE TABLE pfuser.LegalHold (
	lholdRefItemId  VARCHAR(128) NOT NULL,
	lholdType	INT NOT NULL,
	lholdRefItemParentId INT NOT NULL,
	lholdRefItemDomainId INT NOT NULL,
	lholdTenantId	INT NOT NULL,
	lholdDate       DATETIME NOT NULL,
	lholdLastUpdate       DATETIME NULL,
	lholdOwnerId 	INT NOT NULL,
	lholdOwnerAppId	INT NOT NULL,
	lholdOwnerAppRefId	BIGINT NOT NULL,
	lholdAppGroupId	INT NOT NULL,
	lholdAuditZlpUserId INT NOT NULL,
	lholdAuditDomainId INT NOT NULL,
	lholdSrcIds  VARCHAR(255) NULL,
	lholdRunIds  VARCHAR(255) NULL,
	lholdComments	NVARCHAR(255) NULL,
	CONSTRAINT pk_LegalHold PRIMARY KEY (lholdRefItemId,lholdType,lholdOwnerAppId,lholdOwnerId,lholdOwnerAppRefId)
)
GO
CREATE INDEX i2_LegalHold ON pfuser.LegalHold(lholdTenantId,lholdDate)
GO
CREATE INDEX i3_LegalHold ON pfuser.LegalHold(lholdOwnerAppId,lholdOwnerId,lholdLastUpdate)
GO

			

CREATE TABLE pfuser.Site (
	siteName	VARCHAR(32) NOT NULL,
	siteDisplayName	VARCHAR(32) NOT NULL,
	siteDateCreate DATETIME NOT NULL,
	siteDesc	NVARCHAR(255) NULL,
	siteX		INT NOT NULL,
	siteY		INT NOT NULL,
	CONSTRAINT pk_site PRIMARY KEY (siteName)
)
GO


CREATE TABLE pfuser.SiteMachine (
	smSiteName	VARCHAR(32) NOT NULL,
	smPID	VARCHAR(32) NOT NULL,
	smDateCreate DATETIME NOT NULL,
	smLastUpdate	DATETIME NOT NULL,
	smIP	VARCHAR(64) NOT NULL,
	smAlcId     VARCHAR(64) NULL,
	CONSTRAINT pk_siteMac PRIMARY KEY (smPID)
)
GO


CREATE SEQUENCE pfuser.WorkflowTask_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.WorkflowTask (
	wftId INT NOT NULL,
	wftTaskId INT NOT NULL,
	wftTaskType NVARCHAR(64) NOT NULL,
	wftCreateDate DATETIME NOT NULL,
	wftCreatorPid NVARCHAR(64) NOT NULL,
	wftDate DATETIME NOT NULL,
	wftOp NVARCHAR(255) NOT NULL,
	wftOpParamVal1 	NVARCHAR(255) NULL,
	wftOpParamVal2 	NVARCHAR(255) NULL,
	wftOpParamVal3 	NVARCHAR(255) NULL,
	wftOpParamVal4 	NVARCHAR(255) NULL,
	wftOpParamVal5 	NVARCHAR(255) NULL,
	wftStatus INT NOT NULL,
	wftNumTries INT NOT NULL,
	wftScheduled CHAR(1) NOT NULL,
	wftNextProcessTime DATETIME NULL,
	wftRunPid NVARCHAR(64) NULL,
	wftRunStart DATETIME NULL,
	wftRunEnd DATETIME NULL,
	wftComments NVARCHAR(255) NULL,
	CONSTRAINT pk_WorkflowTask PRIMARY KEY (wftId)
)
GO
-- Storage (initial 50M NEXT 50M MINEXTENTS 1 MAXEXTENTS 40 PCTINCREASE 0) PCTFREE 5

CREATE INDEX i1_WorkflowTask ON pfuser.WorkflowTask(wftScheduled,wftStatus,wftNumTries,wftDate)
GO
CREATE INDEX i2_WorkflowTask ON pfuser.WorkflowTask(wftDate)
GO
CREATE INDEX i3_WorkflowTask ON pfuser.WorkflowTask(wftTaskType,wftTaskId)
GO


CREATE TABLE pfuser.OAuthConsumer (
	consumerKey	NVARCHAR(255) NOT NULL,
	consumerSecret	NVARCHAR(255) NOT NULL,
	consumerName	NVARCHAR(255) NOT NULL,
	consumerTenantId	INT NOT NULL,
	consumerCbURL	NVARCHAR(255) NULL,
	consumerCreateDate	DATETIME NOT NULL,
	consumerUpdate	DATETIME NOT NULL,
	consumerVal1	NVARCHAR(255) NULL,
	consumerVal2	NVARCHAR(255) NULL,
	consumerVal3	NVARCHAR(255) NULL,
	consumerVal4	NVARCHAR(255) NULL,
	consumerVal5	NVARCHAR(255) NULL,
	consumerVal6	NVARCHAR(255) NULL,
	consumerVal7	NVARCHAR(255) NULL,
	consumerVal8	NVARCHAR(255) NULL,
    CONSTRAINT pk_OAuthConsumer PRIMARY KEY (consumerTenantId,consumerName),
    CONSTRAINT uk_OAuthConsumer UNIQUE (consumerKey)
)
GO

CREATE TABLE pfuser.OAuthAccessor (
	accConsumerKey	NVARCHAR(255) NOT NULL,
	accReqToken NVARCHAR(255) NOT NULL,
	accReqSecret NVARCHAR(255) NOT NULL,
	accRealm NVARCHAR(255) NULL, 
	accDate DATETIME NOT NULL,
	accZlpUserId	INT NULL,
	accAuthDetail NVARCHAR(255) NULL,
	accAuthDate DATETIME NULL,
	accAccessToken NVARCHAR(255) NULL,
	accAccessSecret NVARCHAR(255) NULL,
	accAccessDate DATETIME NULL,
    CONSTRAINT pk_OAuthAcc PRIMARY KEY (accReqToken)
)
GO
CREATE INDEX i1_OAuthAcc ON pfuser.OAuthAccessor(accAccessToken)
GO
CREATE INDEX i2_OAuthAcc ON pfuser.OAuthAccessor(accZlpUserId)
GO
CREATE INDEX i3_OAuthAcc ON pfuser.OAuthAccessor(accDate)
GO
CREATE INDEX i4_OAuthAcc ON pfuser.OAuthAccessor(accConsumerKey)
GO


CREATE TABLE pfuser.TLSCertificate (
	tlsPurpose	NVARCHAR(255) NOT NULL,
	tlsCreateDate DATETIME NULL,
	tlsRefId	INT NOT NULL,
	tlsRefName	NVARCHAR(255) NOT NULL,
   	CONSTRAINT pk_tlsCert PRIMARY KEY (tlsPurpose)
)
GO

CREATE SEQUENCE pfuser.CloudCredentials_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.CloudCredentials (
	credId		INT NOT NULL,
	credTenId INT NOT NULL,
	credType	VARCHAR(255) NOT NULL,
	credName	NVARCHAR(255) NOT NULL,
	credSeqNumber		INT NOT NULL,
    credNext		CHAR(1) NOT NULL,
	credCreateDate	DATETIME NOT NULL,
	credLastUpdate DATETIME NOT NULL,
	credVal1	NVARCHAR(255) NULL,
	credVal2	NVARCHAR(255) NULL,
	credVal3	NVARCHAR(255) NULL,
	credVal4	NVARCHAR(255) NULL,
	credVal5	NVARCHAR(255) NULL,
	credVal6	NVARCHAR(255) NULL,
	credVal7	NVARCHAR(255) NULL,
	credVal8	NVARCHAR(255) NULL,
	CONSTRAINT pk_cloudCred PRIMARY KEY (credId, credSeqNumber),
	CONSTRAINT uk_cloudCred UNIQUE (credTenId, credName, credSeqNumber)
)
GO

CREATE INDEX i1_CloudCred ON pfuser.CloudCredentials(credTenId, credType)
GO


-- OPTIONAL
CREATE SEQUENCE pfuser.ZLNotifyEvent_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.ZLNotifyEvent (
	-- IDENTITY
	neId	BIGINT NOT NULL,
	neAppId	INT NOT NULL,
	neScope1	INT NOT NULL,
	neScope2 	INT NOT NULL,
	neScope3	INT NOT NULL,
	neName	NVARCHAR(255) NOT NULL,
	neDesc	NVARCHAR(255) NULL,
	neCreateDate	DATETIME NOT NULL,
	neVal1	NVARCHAR(255) NULL,
	neVal2	NVARCHAR(255) NULL,
	neVal3	NVARCHAR(255) NULL,
	neVal4	NVARCHAR(255) NULL,
	neNotifyType	INT NOT NULL,
	neNotifyVal1	NVARCHAR(255) NULL,
	neNotifyVal2	NVARCHAR(255) NULL,
	neNotifyVal3	NVARCHAR(255) NULL,
	neNotifyVal4	NVARCHAR(255) NULL,
	CONSTRAINT pk_NotifyEve PRIMARY KEY (neId),
	CONSTRAINT uk_NotifyEve UNIQUE (neAppId,neScope1,neScope2,neScope3,neName)
)
GO
	
CREATE TABLE pfuser.ZLNotifyMessage (
	nmsgTeId INT NOT NULL,
	nmsgDate DATETIME NOT NULL,
	nmsgSubject NVARCHAR(255) NULL,
	nmsgDetailsVal1	NVARCHAR(255) NULL,
	nmsgDetailsVal2	NVARCHAR(255) NULL,
	nmsgDetailsVal3	NVARCHAR(255) NULL,
	nmsgDetailsVal4	NVARCHAR(255) NULL,
	nmsgDetailsVal5	NVARCHAR(255) NULL,
	nmsgDetailsVal6	NVARCHAR(255) NULL,
	nmsgDetailsVal7	NVARCHAR(255) NULL,
	nmsgDetailsVal8	NVARCHAR(255) NULL
)
GO


	
-- OPTIONAL
CREATE SEQUENCE pfuser.UserSchema_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.UserSchema (
	-- IDENTITY
	usSchemaId BIGINT NOT NULL,
	usTenantId INT NOT NULL,
	usOwnerId	INT NOT NULL,	
	usOwnerAppId		INT NOT NULL,
	usSchemaName			NVARCHAR(255) NOT NULL,
	usParentSchemaId INT NOT NULL,
	CONSTRAINT pk_userSchema PRIMARY KEY(usSchemaId),
	CONSTRAINT uk_userSchema UNIQUE(usTenantId,usOwnerId,usOwnerAppId,usSchemaName)
)
GO

CREATE TABLE pfuser.UserSchemaFields (
	usfSchemaId	INT NOT NULL,
	usfName			VARCHAR(128) NOT NULL,
	usfSeq	INT NOT NULL,
	usfDesc		NVARCHAR(255) NULL,
	usfType			VARCHAR(128) NOT NULL,
	usfInputType	VARCHAR(128) NOT NULL,
	usfInputParamVal1		NVARCHAR(255) NULL,
	usfInputParamVal2		NVARCHAR(255) NULL,
	usfInputParamVal3		NVARCHAR(255) NULL,
	usfFlags	BIGINT NOT NULL,
	usfFormula	NVARCHAR(255) NULL,
	usfMandatory	CHAR(1) NOT NULL,
	CONSTRAINT pk_userSchFld PRIMARY KEY(usfSchemaId,usfName)
)
GO



-- OPTIONAL
CREATE SEQUENCE pfuser.NamedLegalHold_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.NamedLegalHold (
	-- IDENTITY
	lhId	BIGINT NOT NULL,	
	lhName	NVARCHAR(255) NOT NULL,
	lhDisplayName	NVARCHAR(255) NOT NULL,
	lhTenantId			INT NOT NULL,	
	lhCreateDate       DATETIME NOT NULL,
	lhComments	NVARCHAR(255) NULL,
	CONSTRAINT pk_NamedLhold PRIMARY KEY (lhId),
	CONSTRAINT uk_NamedLhold UNIQUE (lhTenantId,lhName)
)
GO


CREATE TABLE pfuser.NamedLegalHoldPrivileges (
	lhId 		INT NOT NULL,
   	lhEntityId 	INT NOT NULL,
	lhEntityType	INT NOT NULL,
	lhTenantId INT NOT NULL,
	lhPrivName	VARCHAR(32) NOT NULL,
	lhRecursive	CHAR(1) NOT NULL,
	CONSTRAINT pk_NamedLholdPriv PRIMARY KEY (lhId,lhPrivName,lhEntityId,lhEntityType)
)
GO

CREATE INDEX i1_NamedLholdPriv ON pfuser.NamedLegalHoldPrivileges(lhTenantId,lhEntityId,lhEntityType)
GO

-- OPTIONAL
CREATE SEQUENCE pfuser.label_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO



CREATE TABLE pfuser.Label (
	-- IDENTITY
	labId 		BIGINT NOT NULL,
	labName 	NVARCHAR(255) NOT NULL,
	labDisplayName 	NVARCHAR(255) NOT NULL,
	labParentId	INT NOT NULL,
	labEntityType 	    INT NOT NULL,
	labEntityId         INT NOT NULL,
   	labType 	INT NOT NULL,
	labDesc	NVARCHAR(255) NULL,
	labCreateDate	DATETIME NOT NULL,
	CONSTRAINT pk_Label PRIMARY KEY (labId),
	CONSTRAINT uk_Label UNIQUE (labEntityType,labEntityId,labParentId,labName)
)
GO


CREATE TABLE pfuser.LabelItem (
	liRefItemId  VARCHAR(128) NOT NULL,
	liRefItemType	INT NOT NULL,
	liLabelId         INT NOT NULL,
	liLabelType			INT NOT NULL,
	liRefItemParentId INT NOT NULL,
	liRefItemDomainId INT NOT NULL,
	liTenantId         INT NOT NULL,
	liDate	DATETIME NOT NULL,
	liComments	 NVARCHAR(255) NULL,
	CONSTRAINT pk_LabelItem PRIMARY KEY (liRefItemId,liRefItemType,liLabelId)
)
GO


CREATE INDEX i1_LabelItem ON pfuser.LabelItem(liDate)
GO


CREATE SEQUENCE pfuser.ApprovalRequest_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.ApprovalRequest (
	areqId BIGINT NOT NULL,
	areqZlpUserId INT NOT NULL,
	areqTenantId INT NOT NULL,
	areqAppId INT NOT NULL,
	areqType VARCHAR(255) NOT NULL,
	areqRefId INT NOT NULL,
	areqParentRefId INT NOT NULL,
	areqChildRefId INT NOT NULL,
	areqRefDomainId INT NOT NULL,
	areqData	NVARCHAR(255) NOT NULL,
	areqDate	DATETIME NOT NULL,
	areqState INT NOT NULL,
	areqApprovalId INT NOT  NULL,
	areqVal1 NVARCHAR(255) NULL,
	areqVal2 NVARCHAR(255) NULL,
	areqVal3 NVARCHAR(255) NULL,
	areqVal4 NVARCHAR(255) NULL,
	areqVal5 NVARCHAR(255) NULL,
	CONSTRAINT pk_ApprReq PRIMARY KEY (areqId)
)
GO


CREATE INDEX i1_ApprReq ON pfuser.ApprovalRequest(areqTenantId,areqAppId,areqType)
GO
CREATE INDEX i2_ApprReq ON pfuser.ApprovalRequest(areqTenantId,areqState,areqAppId,areqType)
GO




CREATE SEQUENCE pfuser.Approval_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.Approval (
	apprId BIGINT NOT NULL,
	apprTenantId INT NOT NULL,
	apprAppId INT NOT NULL,
	apprType VARCHAR(255) NOT NULL,
	apprRefId INT NOT NULL,
	apprParentRefId INT NOT NULL,
	apprChildRefId INT NOT NULL,
	apprRefDomainId INT NOT NULL,
	apprData	NVARCHAR(255) NOT NULL,
	apprDate	DATETIME NOT NULL,
	apprZlpUserId INT NOT NULL,
	apprDomainId INT NOT NULL,
	apprSourceIP 	VARCHAR(64) NULL,
	apprDestIP 	VARCHAR(64) NULL,
	apprAccessType VARCHAR(128) NULL,	
	apprComment	NVARCHAR(255) NULL,
	apprDetailVal1 NVARCHAR(255) NULL,
	apprDetailVal2 NVARCHAR(255) NULL,
	apprDetailVal3 NVARCHAR(255) NULL,
	apprDetailVal4 NVARCHAR(255) NULL,
	apprDetailVal5 NVARCHAR(255) NULL,
	CONSTRAINT pk_Approval PRIMARY KEY (apprId)
)
GO


CREATE INDEX i1_Approval ON pfuser.Approval(apprTenantId,apprAppId,apprType)
GO
CREATE INDEX i2_Approval ON pfuser.Approval(apprZlpUserId,apprDate)
GO







CREATE SEQUENCE pfuser.EscChain_Sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.EscalationChain (
	ecId BIGINT NOT NULL,
	ecTenantId INT NOT NULL,
	ecAppId INT NOT NULL,
	ecName  NVARCHAR(255) NOT NULL,
	ecDesc	NVARCHAR(255) NOT NULL,
	ecVal1 NVARCHAR(255) NULL,
	ecVal2 NVARCHAR(255) NULL,
	ecVal3 NVARCHAR(255) NULL,
	ecVal4 NVARCHAR(255) NULL,
	ecVal5 NVARCHAR(255) NULL,
	ecVal6 NVARCHAR(255) NULL,
	ecDate	DATETIME NOT NULL,
	CONSTRAINT pk_EscChain PRIMARY KEY (ecId)
)
GO

CREATE INDEX i1_EscChain ON pfuser.EscalationChain(ecTenantId,ecAppId)
GO

CREATE TABLE pfuser.EscalationEntry (
	eeEcId BIGINT NOT NULL,
	eeLevel INT NOT NULL,
	eeRoleId INT NOT NULL,
	eeZlpUserId INT NOT NULL,
	eeDate	DATETIME NOT NULL,
	CONSTRAINT pk_EscEntry PRIMARY KEY (eeEcId,eeLevel,eeRoleId,eeZlpUserId)
)
GO




CREATE SEQUENCE pfuser.RestSearchReq_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.RestrictedSearchRequest (
	rsrId		INT NOT NULL,
	rsrName		NVARCHAR(255) NOT NULL,
	rsrTenantId 	INT NOT NULL,
	rsrZlpUserId	INT NOT NULL,
	rsrNotes	NVARCHAR(255) NULL,
	rsrAssignee	INT NULL,
	rsrDateCreate	DATETIME NOT NULL,
	rsrDateUpdate	DATETIME NOT NULL,
	rsrDateExpiry 	DATETIME NULL,
	rsrVaultItemId	VARCHAR(128) NULL,
	rsrVaultPwd 	VARBINARY(255) NULL,
	rsrStatus	INT NOT NULL,
	rsrComments	NVARCHAR(255) NULL,
	CONSTRAINT pk_RestSrchReq PRIMARY KEY (rsrId),
	CONSTRAINT uk_RestSrchReq UNIQUE (rsrTenantId,rsrName)
)
GO

CREATE INDEX i1_RestSrchReq ON pfuser.RestrictedSearchRequest(rsrZlpUserId)
GO
CREATE INDEX i2_RestSrchReq ON pfuser.RestrictedSearchRequest(rsrVaultItemId)
GO



CREATE TABLE pfuser.ShortUrl (
	suStId VARCHAR(255) NOT NULL,
	suFnName VARCHAR(255) NOT NULL,
	suUser  VARCHAR(255) NULL,
	suCreateDate	DATETIME NOT NULL,
	suExpiryDate	DATETIME NULL,
	suZlTpId	VARCHAR(255) NULL,
	suParamVal1	NVARCHAR(255) NULL,
	suParamVal2	NVARCHAR(255) NULL,
	suParamVal3	NVARCHAR(255) NULL,
	suParamVal4	NVARCHAR(255) NULL,
	suParamVal5	NVARCHAR(255) NULL,
	CONSTRAINT pk_ShortUrl PRIMARY KEY (suStId)
)
GO


CREATE TABLE pfuser.SystemRepeat (
	srStId   VARCHAR(64) NOT NULL,
 	srName	 NVARCHAR(255)  NOT NULL,
 	srZlpUserId	INT NOT NULL,
	srPID	NVARCHAR(255) NULL,
	srStartDate	DATETIME NOT NULL,
	srEndDate	DATETIME NULL, 	
    srParam1	NVARCHAR(255) NULL,
	srParam2	NVARCHAR(255) NULL,
	srParam3	NVARCHAR(255) NULL,
	srParam4	NVARCHAR(255) NULL,
	CONSTRAINT pk_SystemRepeat PRIMARY KEY (srStId)
)
GO
CREATE INDEX i1_SystemRepeat ON pfuser.SystemRepeat(srName)
GO
CREATE INDEX i2_SystemRepeat ON pfuser.SystemRepeat(srStartDate)
GO



CREATE SEQUENCE pfuser.TQueue_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO




CREATE TABLE pfuser.TQueue (
	tqId INT  NOT NULL,
	tqTenantId INT NOT NULL,
	tqName VARCHAR(255)  NOT NULL,
	tqCreateDate DATETIME NOT NULL,
	tqParamVal1 NVARCHAR(255) NULL,
	tqParamVal2 NVARCHAR(255) NULL,
	tqParamVal3 NVARCHAR(255) NULL,
	tqParamVal4 NVARCHAR(255) NULL,
	tqParamVal5 NVARCHAR(255) NULL,
	tqParamVal6 NVARCHAR(255) NULL,
	tqParamVal7 NVARCHAR(255) NULL,
	tqParamVal8 NVARCHAR(255) NULL,
	CONSTRAINT pk_TQueue PRIMARY KEY (tqId),
	CONSTRAINT uk_TQueue UNIQUE (tqTenantId,tqName)
)
GO




CREATE SEQUENCE pfuser.TQueueMsg_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.TQueueMsg (
	tqmId BIGINT  NOT NULL,
	tqmQueueId INT  NOT NULL,
	tqmExtId INT NULL,
	tqmExtId2 VARCHAR(255) NULL,
	tqmDate DATETIME NOT NULL,
	tqmPID	 VARCHAR(64) NULL,
  tqmFlags	BIGINT NOT NULL,
  tqmSourceIP 	VARCHAR(64) NULL,
	tqmDestIP   	VARCHAR(64) NULL,
	tqmAccessType VARCHAR(128) NULL,
	tqmUserAgent VARCHAR(255) NULL,	
	tqmParamVal1 NVARCHAR(255) NULL,
	tqmParamVal2 NVARCHAR(255) NULL,
	tqmParamVal3 NVARCHAR(255) NULL,
	tqmParamVal4 NVARCHAR(255) NULL,
	tqmParamVal5 NVARCHAR(255) NULL,
	tqmParamVal6 NVARCHAR(255) NULL,
	tqmParamVal7 NVARCHAR(255) NULL,
	tqmParamVal8 NVARCHAR(255) NULL,
	CONSTRAINT pk_tqMsg PRIMARY KEY (tqmId)
)
GO


CREATE INDEX i1_tqMsg ON pfuser.TQueueMsg(tqmQueueId,tqmExtId)
GO



CREATE TABLE pfuser.TQueueObject (
	tqoMsgId		INT NOT NULL,
	tqoSeqNumber	INT NOT NULL,
	tqoNext		CHAR(1) NOT NULL,
	tqoVal1		NVARCHAR(255) NULL,
	tqoVal2		NVARCHAR(255) NULL,
	tqoVal3		NVARCHAR(255) NULL,
	tqoVal4		NVARCHAR(255) NULL,
	tqoVal5		NVARCHAR(255) NULL,
	tqoVal6		NVARCHAR(255) NULL,
	tqoVal7		NVARCHAR(255) NULL,
	tqoVal8		NVARCHAR(255) NULL,
	tqoVal9		NVARCHAR(255) NULL,
	tqoVal10		NVARCHAR(255) NULL,
	tqoVal11		NVARCHAR(255) NULL,
	tqoVal12		NVARCHAR(255) NULL,
	tqoVal13		NVARCHAR(255) NULL,
	tqoVal14		NVARCHAR(255) NULL,
	tqoVal15		NVARCHAR(255) NULL,
	tqoVal16		NVARCHAR(255) NULL,
   	CONSTRAINT pk_tqobj PRIMARY KEY (tqoMsgId,tqoSeqNumber)
)
GO




CREATE TABLE pfuser.UserActivity (
	uaZlpUserId INT NOT NULL,
	uaAppId INT NOT NULL,
	uaAction INT NOT NULL,
	uaRefId BIGINT NULL,
	uaDate	DATETIME NOT NULL,
	uaPID	VARCHAR(255) NULL,
	uaDetailVal1 NVARCHAR(255) NULL,
	uaDetailVal2 NVARCHAR(255) NULL,
	uaDetailVal3 NVARCHAR(255) NULL,
	uaDetailVal4 NVARCHAR(255) NULL,
	uaDetailVal5 NVARCHAR(255) NULL,
	uaDetailVal6 NVARCHAR(255) NULL,
	uaDetailVal7 NVARCHAR(255) NULL,
	uaDetailVal8 NVARCHAR(255) NULL
)
GO

CREATE INDEX i1_userAct ON pfuser.UserActivity(uaZlpUserId,uaAppId,uaAction,uaDate)
GO



CREATE TABLE pfuser.UserRVite (
    urvId             VARCHAR(64) NOT NULL, 
    urvTenantId				  INT NOT NULL,
    urvZLPUserId				  INT NOT NULL,
    urvOwner                  NVARCHAR(255) NOT NULL,
    urvSender                 NVARCHAR(255) NULL,
    urvResourceType	          VARCHAR(32) NOT NULL,
    urvResourceId           NVARCHAR(255) NOT NULL,
    urvDate			DATETIME NOT NULL,
    urvExpiryDate	DATETIME NOT NULL,
    urvAccessType	      VARCHAR(64) NOT NULL,
    urvAccessInfo	      VARCHAR(255) NULL,
    urvState		INT NOT NULL,
    urvVal1                   NVARCHAR(255) NULL,
    urvVal2                   NVARCHAR(255) NULL,
    urvVal3                   NVARCHAR(255) NULL,
    urvVal4                   NVARCHAR(255) NULL,
    urvVal5                   NVARCHAR(255) NULL,
    urvVal6                   NVARCHAR(255) NULL,
    urvVal7                   NVARCHAR(255) NULL,
    urvVal8                   NVARCHAR(255) NULL,
    urvVal9                   NVARCHAR(255) NULL,
    urvVal10                   NVARCHAR(255) NULL,
    urvVal11                   NVARCHAR(255) NULL,
    urvVal12                   NVARCHAR(255) NULL,
    CONSTRAINT pk_UserRVite PRIMARY KEY (urvId)
)
GO
-- STORAGE (INITIAL 25M NEXT 250M MINEXTENTS 1 MAXEXTENTS 30 PCTINCREASE 0) PCTFREE 5

CREATE INDEX i1_UserRVite ON pfuser.UserRVite(urvTenantId,urvResourceType,urvZLPUserId)
GO
CREATE INDEX i2_UserRVite ON pfuser.UserRVite(urvZLPUserId,urvResourceType,urvState)
GO





CREATE TABLE pfuser.RetentionProcess (
	rpTenantId INT NOT NULL,
	rpType INT NOT NULL,
	rpEntityId INT NOT NULL,
	rpBigDB	INT NOT NULL,
	rpDate	DATETIME NOT NULL,
	rpUpdate	DATETIME NOT NULL,
	rpFlags	BIGINT NOT NULL,
	rpPurgeBigDB	INT NOT NULL,
	rpVal1                   NVARCHAR(255) NULL,
    rpVal2                   NVARCHAR(255) NULL,
    rpVal3                   NVARCHAR(255) NULL,
    rpVal4                   NVARCHAR(255) NULL,
    rpVal5                   NVARCHAR(255) NULL,
    rpVal6                   NVARCHAR(255) NULL,
    rpVal7                   NVARCHAR(255) NULL,
    rpVal8                   NVARCHAR(255) NULL,
    rpVal9                   NVARCHAR(255) NULL,
    rpVal10                   NVARCHAR(255) NULL,
	CONSTRAINT pk_RetProcess PRIMARY KEY (rpTenantId,rpType,rpEntityId)
)
GO
	
	
	
CREATE TABLE pfuser.RetentionProcessHistory (
	rpHistoryDate DATETIME NOT NULL,
	rpTenantId INT NOT NULL,
	rpEntityId INT NOT NULL,
	rpType INT NOT NULL,
	rpBigDB	INT NOT NULL,
	rpDate	DATETIME NOT NULL,
	rpUpdate	DATETIME NOT NULL,
	rpFlags	BIGINT NOT NULL,
	rpPurgeBigDB	INT NOT NULL,
	rpVal1                   NVARCHAR(255) NULL,
    rpVal2                   NVARCHAR(255) NULL,
    rpVal3                   NVARCHAR(255) NULL,
    rpVal4                   NVARCHAR(255) NULL,
    rpVal5                   NVARCHAR(255) NULL,
    rpVal6                   NVARCHAR(255) NULL,
    rpVal7                   NVARCHAR(255) NULL,
    rpVal8                   NVARCHAR(255) NULL,
    rpVal9                   NVARCHAR(255) NULL,
    rpVal10                   NVARCHAR(255) NULL
)
GO

CREATE INDEX i1_RetProcHis ON pfuser.RetentionProcessHistory(rpTenantId,rpType,rpEntityId,rpHistoryDate)
GO


CREATE SEQUENCE pfuser.RetentionTask_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser.RetentionTask (
	rtId	INT NOT NULL,
	rtTenantId INT NOT NULL,
	rtType	INT NOT NULL,
	rtEntityId INT NOT NULL,
	rtBigDB	INT NOT NULL,
 	rtTaskType VARCHAR(32)  NOT NULL,
	rtBatch VARCHAR(128) NOT NULL,
	rtApprovalReqId	INT NOT NULL,
	rtApprovalId	INT NOT NULL,
	rtPID NVARCHAR(255) NOT NULL,
	rtCreateDate	DATETIME NOT NULL,
    rtStartDate	DATETIME NULL,
	rtEndDate	DATETIME NULL,
    rtUpdate	DATETIME NOT NULL,
    rtStatus INT NOT NULL,
    rtSuccessCount INT NULL,
	rtErrorCount	INT NULL,
	rtMessage	NVARCHAR(255) NULL,
    rtVal1	NVARCHAR(255) NULL,
	rtVal2	NVARCHAR(255) NULL,
	rtVal3	NVARCHAR(255) NULL,
	rtVal4	NVARCHAR(255) NULL,
	CONSTRAINT pk_RetentionTask PRIMARY KEY (rtId),
	CONSTRAINT uk_RetentionTask UNIQUE (rtTenantId,rtType,rtEntityId,rtBigDB,rtTaskType,rtBatch)
)
GO
CREATE INDEX i1_RetentionTask ON pfuser.RetentionTask(rtTenantId,rtType,rtEntityId,rtBigDB,rtTaskType,rtStatus)
GO


CREATE TABLE pfuser.PurgeDoc (
	DocId                       NVARCHAR(255) NOT NULL,
	DocType						INT NOT NULL,
	DocTenantId					INT NOT NULL,
	DocPurgeBigDB				INT NOT NULL,
	DocRetTaskId				INT NOT NULL,
	DocPurgeBatchId				VARCHAR(255) NOT NULL,
	DocPurgeDate				DATETIME NOT NULL,
	DocPurgeFlags				BIGINT NOT NULL,
	DocStatus					INT NOT NULL,
	DocPID						VARCHAR(255) NULL,
	DocComment                  NVARCHAR(255) NULL,
	DocVal1						NVARCHAR(255) NULL,
	DocVal2						NVARCHAR(255) NULL,
	DocVal3						NVARCHAR(255) NULL,
	DocVal4						NVARCHAR(255) NULL,
	CONSTRAINT pk_PurgeDoc PRIMARY KEY (DocId,DocType,DocRetTaskId)
)
GO

CREATE INDEX i1_PurgeDoc ON pfuser.PurgeDoc(DocTenantId,DocPurgeBigDB,DocRetTaskId)
GO
