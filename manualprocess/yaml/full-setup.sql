


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


CREATE SEQUENCE pfuser.AddrBook_Sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.AddrBook (
	abId			            INT NOT NULL,
	abAcctNo		            INT NULL,
	abName			            NVARCHAR(255) NOT NULL,
	abType			            VARCHAR(64) NOT NULL,
    	abUsageType		            VARCHAR(64) NOT NULL,
	abDesc 			            NVARCHAR(255) NULL,
	abVal1			            NVARCHAR(255) NULL,
	abVal2			            NVARCHAR(255) NULL,
	abVal3			            NVARCHAR(255) NULL,
	CONSTRAINT pk_AddrBook PRIMARY KEY (abId)
)
GO


CREATE INDEX i1_AddrBook ON pfuser.AddrBook(abAcctNo)
GO


-- OPTIONAL
CREATE SEQUENCE pfuser.ZipAddrEntry_Sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.ZipAddrEntry (
	-- IDENTITY
	AddrEntryId                 BIGINT NOT NULL,
	AddrEntryAddrBookId         INT NOT NULL,
	AddrEntryEmail              VARCHAR(255)  NULL,
	AddrEntryName               NVARCHAR(255) NULL,
	AddrEntryAlias              NVARCHAR(255) NOT NULL,
	AddrEntryPhone              NVARCHAR(64) NULL,
	AddrEntryType               INT NOT NULL,
    CONSTRAINT pk_ZipAddrEntry PRIMARY KEY (AddrEntryId),
    CONSTRAINT uk_ZipAddrEntry UNIQUE (AddrEntryAddrBookId,AddrEntryAlias)
)
GO


CREATE INDEX i1_ZipAddrEntry ON pfuser.ZipAddrEntry(AddrEntryAddrBookId)
GO


CREATE TABLE pfuser.ZipAddrListEntry (
	AddrListId                  INT NOT NULL,
	AddrEntryId                 INT NOT NULL,
    CONSTRAINT uk_ZipAddrList UNIQUE (AddrListId,AddrEntryId)
)
GO


CREATE INDEX i1_ZipAddrList ON pfuser.ZipAddrListEntry(AddrListId)
GO

CREATE TABLE pfuser.ClassifierTenantConfig (
	ctcTenantId	INT NOT NULL,
	ctcCreateDate DATETIME NOT NULL,
	ctcLastUpdate DATETIME NOT NULL,
	ctcZlObjId	INT NOT NULL,
	ctcVal1		NVARCHAR(255) NULL,
	ctcVal2		NVARCHAR(255) NULL,
	ctcVal3		NVARCHAR(255) NULL,
	ctcVal4		NVARCHAR(255) NULL,
	ctcVal5		NVARCHAR(255) NULL,
	ctcVal6		NVARCHAR(255) NULL,
	ctcVal7		NVARCHAR(255) NULL,
	ctcVal8		NVARCHAR(255) NULL,
	CONSTRAINT pk_CTConfig PRIMARY KEY (ctcTenantId)
)
GO



CREATE SEQUENCE pfuser.Classifier_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser.Classifier (
	clId			INT NOT NULL,
	clName			NVARCHAR(255) NOT NULL,
	clType 			NVARCHAR(64) NOT NULL,
	clDomainId		INT NOT NULL,
	clTenantId 		INT NOT NULL,
	clParentId		INT NOT NULL,
	clWfStatus		INT NOT NULL,
	clApprReqId		INT NOT NULL,
	clLastApprId	INT NOT NULL,
	clPurposeFlag		INT NULL,	
	clDesc			NVARCHAR(255) NULL,
	clVersion		NVARCHAR(64) NULL,
	clDateCreate		DATETIME NOT NULL,
	clLastUpdate		DATETIME NOT NULL,
	clChangeNumber		INT NOT NULL,
	clVal1			NVARCHAR(255) NULL,
	clVal2			NVARCHAR(255) NULL,
	clVal3			NVARCHAR(255) NULL,
	clVal4			NVARCHAR(255) NULL,
	clVal5			NVARCHAR(255) NULL,
	CONSTRAINT pk_Classifier PRIMARY KEY (clId),
	CONSTRAINT uk3_Classifer UNIQUE (clTenantId,clName)
)
GO




CREATE SEQUENCE pfuser.Category_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.Category (
	catId			INT NOT NULL,
	catName			NVARCHAR(255) NOT NULL,
	catClId			INT NOT NULL,
	catDesc			NVARCHAR(255) NULL,
	catSeverity		INT NOT NULL,
	catThreshold		INT NOT NULL,
	CONSTRAINT pk_Category PRIMARY KEY (catId),
	CONSTRAINT uk_Category UNIQUE (catClId,catName)
)
GO

CREATE INDEX i1_Category ON pfuser.Category(catClId)
GO


CREATE TABLE pfuser.CategoryAction (
	caName			NVARCHAR(255) NOT NULL,
	caType			NVARCHAR(64) NOT NULL,
        -- Default 99 for entity type
	caEntityType		INT NOT NULL,
        caEntityId		INT NOT NULL,
	caCatId			INT NOT NULL,
	caClId			INT NOT NULL,
	caDataFlags		INT NOT NULL,
	caOn			CHAR(1) NULL,
	caDataDirection		CHAR(1) NOT NULL,
	caParam			NVARCHAR(255) NULL,
	CONSTRAINT pk_CategoryAction PRIMARY KEY (caType,caEntityType,caEntityId,caCatId,caDataDirection)
)
GO

CREATE INDEX i1_CategoryAction ON pfuser.CategoryAction(caClId)
GO





CREATE SEQUENCE pfuser.LexRule_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser.LRule (
	lrId			INT NOT NULL,
	lrName			NVARCHAR(255) NOT NULL,
	lrType			NVARCHAR(32) NOT NULL,
	lrLang			NVARCHAR(32) NOT NULL,
	lrDesc			NVARCHAR(255) NULL,
	lrClId			INT NOT NULL,
	lrDataType		NVARCHAR(64) NULL,
	lrFieldScope		NVARCHAR(255) NULL,
	lrFieldSubScope		NVARCHAR(255) NULL,
	lrCatId			INT NOT NULL,
	lrWeight		INT NOT NULL,
	lrFlag			INT NOT NULL,
	lrActive		CHAR(1) NOT NULL,
	lrDateCreate		DATETIME NOT NULL,
	lrLastUpdate		DATETIME NOT NULL,
	lrVal1			NVARCHAR(255) NULL,
 	lrVal2			NVARCHAR(255) NULL,
 	lrVal3			NVARCHAR(255) NULL,
 	lrVal4			NVARCHAR(255) NULL,
 	lrVal5			NVARCHAR(255) NULL,
 	lrVal6			NVARCHAR(255) NULL,
 	lrVal7			NVARCHAR(255) NULL,
 	lrVal8			NVARCHAR(255) NULL,
 	lrVal9			NVARCHAR(255) NULL,
 	lrVal10			NVARCHAR(255) NULL,
 	lrVal11			NVARCHAR(255) NULL,
 	lrVal12			NVARCHAR(255) NULL,
 	lrVal13			NVARCHAR(255) NULL,
 	lrVal14			NVARCHAR(255) NULL,
 	lrVal15			NVARCHAR(255) NULL,
 	lrVal16			NVARCHAR(255) NULL,
	CONSTRAINT pk_LRule PRIMARY KEY (lrId),
	CONSTRAINT uk_LRule UNIQUE (lrClId,lrName,lrLang)
)
GO






CREATE SEQUENCE pfuser.ClassifyReason_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.ClassifyReason (
	crId		INT NOT NULL,
	crClId		INT NOT NULL,
	crCategoryName	NVARCHAR(255) NULL,
	crName		NVARCHAR(128) NOT NULL,
	crVal1		NVARCHAR(255) NULL,
	crVal2		NVARCHAR(255) NULL,
	crVal3		NVARCHAR(255) NULL,
	crWeight	INT NOT NULL,
	CONSTRAINT pk_ClReason PRIMARY KEY (crId),
	CONSTRAINT uk_ClReason UNIQUE (crClId,crName)
)
GO



CREATE SEQUENCE pfuser.AdjunctRule_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser.AdjunctRule (
	arId			INT NOT NULL,
	arClId			INT NOT NULL,
	arSubType	INT NOT NULL,
	arName			NVARCHAR(255) NOT NULL,
	arObjId		INT NOT NULL,
	arCatId			INT NOT NULL,
	arDateCreate		DATETIME NOT NULL,
	arLastUpdate	DATETIME NOT NULL,
	arVal1		NVARCHAR(255) NULL,
	arVal2		NVARCHAR(255) NULL,
	arVal3		NVARCHAR(255) NULL,
	arVal4		NVARCHAR(255) NULL,
	arVal5		NVARCHAR(255) NULL,
	arVal6		NVARCHAR(255) NULL,
	CONSTRAINT pk_AdjRule PRIMARY KEY (arId),
	CONSTRAINT uk1_AdjRule UNIQUE (arClId,arSubType,arObjId,arCatId),
	CONSTRAINT uk2_AdjRule UNIQUE (arClId,arName)
)
GO

CREATE TABLE pfuser.ClassifierAuditTrail (
	caAction	INT NOT NULL,
	caDate		DATETIME NOT NULL,	
	caClId		INT NULL,
	caCatId		INT NULL,
	caRuleId	INT NULL,
	caPhraseId	INT NULL,
        caZlpUserId     INT NOT NULL,
	caUser		NVARCHAR(255) NOT NULL,
	caDomainId	INT NOT NULL,
	caTenantId 	INT NOT NULL,	
	caTxnId		VARCHAR(64) NOT NULL,
	caClearanceLevel	INT NOT NULL,
	caSourceIP 	VARCHAR(64) NULL,
	caDestIP   	VARCHAR(64) NULL,
	caAccessType 	VARCHAR(128) NULL,
	caComments	NVARCHAR(255) NULL,
	caVal1		NVARCHAR(255) NULL,
	caVal2		NVARCHAR(255) NULL,
	caVal3		NVARCHAR(255) NULL,
	caVal4		NVARCHAR(255) NULL,
	caVal5		NVARCHAR(255) NULL
)
GO

CREATE INDEX i1_CAT ON pfuser.ClassifierAuditTrail(caDate)
GO
CREATE INDEX i2_CAT ON pfuser.ClassifierAuditTrail(caUser)
GO
CREATE INDEX i3_CAT ON pfuser.ClassifierAuditTrail(caDomainId)
GO
CREATE INDEX i4_CAT ON pfuser.ClassifierAuditTrail(caZlpUserId)
GO

CREATE TABLE pfuser.LexHits (
	lhRuleId	INT NOT NULL,
	lhDate		DATETIME NOT NULL,
	lhCount		INT NOT NULL,
	lhZLPMsgId	VARCHAR(255) NOT NULL,
	lhTracItemId	INT NULL,
	lhFeedback	INT NULL
)
GO

CREATE INDEX i1_Lexhits ON pfuser.LexHits(lhDate)
GO
CREATE INDEX i2_Lexhits ON pfuser.LexHits(lhRuleId,lhDate)
GO

CREATE TABLE pfuser.LexHitsSummary (
	lhsRuleId	INT NOT NULL,
	lhsDateStart	DATETIME NOT NULL,
	lhsDateEnd	DATETIME NOT NULL,
	lhsMsgCount	INT NOT NULL,
	lhsTracItemCount	INT NOT NULL,
	lhsOccurrenceCount	INT NOT NULL,
	lhsWeightedFeedback	INT NULL
)
GO
CREATE INDEX i1_lhSummary ON pfuser.LexHitsSummary(lhsDateStart,lhsDateEnd)
GO
	CREATE INDEX i2_lhSummary ON pfuser.LexHitsSummary(lhsRuleId)
GO
	
CREATE SEQUENCE pfuser.WordList_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser.WordList (
	wlId		INT NOT NULL,
	wlName		NVARCHAR(255) NOT NULL,
	wlTenantId 		INT NOT NULL,
	wlParentId 		INT NOT NULL,
	wlDesc		NVARCHAR(255) NOT NULL,
	wlFlags		INT NOT NULL,
	wlClassifier	CHAR(1) NULL,
	wlHighlighter	CHAR(1) NULL,
	wlChangeNumber INT NOT NULL,
	wlApprReqId	INT NOT NULL,
	wlLastApprId	INT NOT NULL,
	wlCreateDate DATETIME NOT NULL,
	wlLastUpdate DATETIME NOT NULL,
	CONSTRAINT pk_WordList PRIMARY KEY (wlId),
    CONSTRAINT uk3_WordList UNIQUE (wlTenantId,wlName)
)
GO
		


CREATE TABLE pfuser.WordListEntry (
	entryWord NVARCHAR(255) NOT NULL,
	entryListId		INT NOT NULL,
	CONSTRAINT uk_WordListEntry PRIMARY KEY (entryListId,entryWord)
)
GO


CREATE TABLE pfuser.WordListHistory (
	hisListId		INT NOT NULL,
	hisAction	INT NOT NULL,
	hisWord		NVARCHAR(255) NOT NULL,
	hisDate	DATETIME NOT NULL
)
GO
CREATE INDEX i1_wordListHis ON pfuser.WordListHistory(hisListId,hisDate)
GO



CREATE SEQUENCE pfuser.PreApprovedDocument_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.PreApprovedDocument (
	pdId		INT NOT NULL,
	pdName		NVARCHAR(255) NOT NULL,
	pdTenantId	INT NOT NULL,
	pdDesc		NVARCHAR(255) NOT NULL,
	pdDigest	NVARCHAR(255) NOT NULL,
	pdEntityType	INT NOT NULL,
	pdEntityId	INT NOT NULL,
	pdCreateDate DATETIME NOT NULL,
	pdLastUpdate DATETIME NOT NULL,
	pdStartDate DATETIME NOT NULL,
	pdEndDate DATETIME NOT NULL,
	CONSTRAINT pk_preApprDoc PRIMARY KEY (pdId)
)
GO
CREATE INDEX i1_preApprDoc ON pfuser.PreApprovedDocument(pdEndDate)
GO


CREATE TABLE pfuser.GlobalCoordCluster (
	gccProcessName 		VARCHAR(255) NOT NULL,
	gccProcessIp	 	VARCHAR(64) NOT NULL,
	gccClusterName 		VARCHAR(255) NOT NULL,
	gccWeight 		    INT NOT NULL,
	gccState 		    INT NOT NULL,
	gccCreateDate 		DATETIME NOT NULL,
	gccUpdateDate 		DATETIME NOT NULL,
	CONSTRAINT pk_GCC PRIMARY KEY (gccClusterName,gccProcessName)
)
GO


CREATE SEQUENCE pfuser.GlobalCoordRuntime_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.GlobalCoordRuntime (
	gcrtClusterName 		VARCHAR(255) NOT NULL,
	gcrtLiveProcessName 	VARCHAR(255) NOT NULL,
	gcrtIterNumber 		    INT NOT NULL,
        gcrtUpdate 		        DATETIME NOT NULL,
	gcrtConnectionStrength	INT NOT NULL,
	CONSTRAINT pk_GCRT PRIMARY KEY (gcrtClusterName)
)
GO



CREATE SEQUENCE pfuser.TaskDrivers_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.TaskDrivers (
	tdId 			    INT NOT NULL,
	tdName 			    VARCHAR(255) NOT NULL,
	tdType 			    VARCHAR(255) NOT NULL,
	tdDisplayName 		    VARCHAR(255) NULL,
	tdCluster 		    VARCHAR(64) NULL,
	tdPrimaryMachine 	VARCHAR(255) NULL,
	tdRunOnMachineOnly 	CHAR(1) NULL,
	tdCreateDate 		DATETIME NOT NULL,
	tdLastUpdate 		DATETIME NOT NULL,
	tdScheduleInfoVal1 	NVARCHAR(255) NULL,
	tdScheduleInfoVal2 	NVARCHAR(255) NULL,
	tdScheduleInfoVal3 	NVARCHAR(255) NULL,
	tdVal1 			    NVARCHAR(255) NULL,
	tdVal2 			    NVARCHAR(255) NULL,
	tdVal3 			    NVARCHAR(255) NULL,
	CONSTRAINT pk_TaskDrivers PRIMARY KEY (tdId),
	CONSTRAINT uk_TaskDrivers UNIQUE (tdName)
)
GO


CREATE SEQUENCE pfuser.TaskDriverRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.TaskDriverRuns (
	tdrId 			    INT NOT NULL,
	tdrTdId 			INT NOT NULL,
	tdrMachine 		    VARCHAR(255) NOT NULL,
	tdrCluster 		    VARCHAR(64) NULL,
	tdrAlcId		VARCHAR(64) NULL,
	tdrPID			VARCHAR(64) NULL,
	tdrType		        VARCHAR(255) NULL,
	tdrStartDate 		DATETIME NOT NULL,
	tdrLastUpdate 		DATETIME NOT NULL,
	tdrNextRunDate 		DATETIME NULL,
	tdrStatus 		    INT NOT NULL,
	tdrVal1 			NVARCHAR(255) NULL,
	tdrVal2 			NVARCHAR(255) NULL,
	tdrVal3 			NVARCHAR(255) NULL,
	tdrVal4 			NVARCHAR(255) NULL,
	CONSTRAINT pk_TaskDriverRuns PRIMARY KEY (tdrId)
)
GO

CREATE INDEX i1_TaskDriverRuns ON pfuser.TaskDriverRuns(tdrTdId)
GO

CREATE INDEX i2_TaskDriverRuns ON pfuser.TaskDriverRuns(tdrLastUpdate)
GO



CREATE TABLE pfuser.TaskStatus (
    tsTdrId 		INT NOT NULL,
    tsCreateDate 	DATETIME NOT NULL,
    tsState 		INT NOT NULL,
    tsIntVal 		INT NULL,
    tsVal1 			NVARCHAR(255) NULL,
    tsVal2 			NVARCHAR(255) NULL,
    tsVal3 			NVARCHAR(255) NULL
)
GO

CREATE INDEX i1_TaskStatus ON pfuser.TaskStatus(tsTdrId)
GO

CREATE INDEX i2_TaskStatus ON pfuser.TaskStatus(tsTdrId,tsIntVal)
GO

CREATE TABLE pfuser.ReportVaultItem (
    rviInstanceName 	NVARCHAR(255) NOT NULL,
    rviTdrId   INT NOT NULL,
    rviName		NVARCHAR(255) NOT NULL,
    rviDate		DATETIME NOT NULL,
    rviExpiry  DATETIME NOT NULL,
    rviVaultId	VARCHAR(64) NOT NULL,
    rviEncPwd   VARBINARY(128) NULL,
	CONSTRAINT pk_RepVault PRIMARY KEY (rviInstanceName)
)
GO

CREATE INDEX i1_RepVault ON pfuser.ReportVaultItem(rviTdrId)
GO
CREATE INDEX i2_RepVault ON pfuser.ReportVaultItem(rviDate)
GO


-- OPTIONAL
CREATE SEQUENCE pfuser.MigrationTask_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.MigrationTask (
        -- IDENTITY
	migId	BIGINT NOT NULL,
	migTenantId INT NOT NULL,
 	migType NVARCHAR(255)  NOT NULL,
	migInstanceName NVARCHAR(255) NOT NULL,
	migPID NVARCHAR(255) NOT NULL,
    migStartDate	      DATETIME NOT NULL,
	migEndDate	DATETIME NULL,
    migUpdate	DATETIME NOT NULL,
    migSuccessCount INT NULL,
	migErrorCount	INT NULL,
 	migTotal	INT NULL,
	migMessage	NVARCHAR(255) NULL,
    migVal1	NVARCHAR(255) NULL,
	migVal2	NVARCHAR(255) NULL,
	CONSTRAINT pk_MigTask PRIMARY KEY (migId),
	CONSTRAINT uk2_MigTask UNIQUE (migTenantId,migInstanceName)
)
GO
CREATE INDEX i1_MigTask ON pfuser.MigrationTask(migStartDate)
GO
CREATE INDEX i2_MigTask ON pfuser.MigrationTask(migType)
GO




CREATE SEQUENCE pfuser.BackgroundTask_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.BackgroundTask (
	bgtId	INT NOT NULL,
 	bgtType NVARCHAR(255)  NOT NULL,
	bgtSubType NVARCHAR(255) NULL,
	bgtCluster		NVARCHAR(64) NULL,
	bgtPID			NVARCHAR(64) NULL,
        bgtStartDate	DATETIME NOT NULL,
	bgtEndDate	DATETIME NULL,
        bgtUpdate	DATETIME NOT NULL,
        bgtIter  	INT NOT NULL,
        bgtRunState	INT NOT NULL,
        bgtReportVaultId VARCHAR(255) NULL,
        bgtStatusMessage	NVARCHAR(255) NULL,
	bgtVal1    NVARCHAR(255) NULL,
	bgtVal2	NVARCHAR(255) NULL,
	bgtVal3    NVARCHAR(255) NULL,
	bgtVal4	NVARCHAR(255) NULL,
	bgtVal5    NVARCHAR(255) NULL,
	CONSTRAINT pk_bgtTask PRIMARY KEY (bgtId)
)
GO
CREATE INDEX i1_bgtTask ON pfuser.BackgroundTask(bgtStartDate)
GO
CREATE INDEX i2_bgtTask ON pfuser.BackgroundTask(bgtType,bgtStartDate)
GO



CREATE SEQUENCE pfuser.FeedFileTask_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.FeedFileTask (
	ffId	INT NOT NULL,
	ffTenantId INT NOT NULL,
 	ffType NVARCHAR(255)  NOT NULL,
	ffTdi	INT NOT NULL,
	ffFileName NVARCHAR(255) NOT NULL,
	ffPID NVARCHAR(255) NOT NULL,
    ffStartDate	DATETIME NOT NULL,
	ffEndDate	DATETIME NULL,
    ffUpdate	DATETIME NOT NULL,
	ffSuccess	CHAR(1) NOT NULL,
	ffMessage	NVARCHAR(255) NULL,
	ffErrorMsg	NVARCHAR(255) NULL,
	ffReportVaultId VARCHAR(255) NULL,
	CONSTRAINT pk_ffTask PRIMARY KEY (ffId)
)
GO
CREATE INDEX i3_ffTask ON pfuser.FeedFileTask(ffTenantId,ffStartDate)
GO
CREATE INDEX i2_ffTask ON pfuser.FeedFileTask(ffType,ffStartDate)
GO
CREATE TABLE pfuser.RemoteSearchHost (
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
	CONSTRAINT pk_RemoteSearchHost PRIMARY KEY (rshName)
)
GO




CREATE TABLE pfuser.EntitySearchStore (
	essId	 INT NOT NULL,
	essType VARCHAR(64) NOT NULL,
	essTenantId INT NOT NULL,
	essStoreName VARCHAR(255) NOT NULL,
	essFederated CHAR(1) NULL,
	essRshName   VARCHAR(10) NULL,
	essRshStoreName VARCHAR(255) NULL,
	CONSTRAINT pk_EntitySrchStor PRIMARY KEY (essId,essType)
--,
--	CONSTRAINT fk_EntitySrchStor FOREIGN KEY (essRshName) REFERENCES pfuser.RemoteSearchHost(rshName) ON DELETE CASCADE
)
GO

CREATE INDEX i1_EntitySrchStor ON pfuser.EntitySearchStore(essType)
GO
CREATE INDEX i2_EntitySrchStor ON pfuser.EntitySearchStore(essTenantId,essStoreName)
GO

-- OPTIONAL
CREATE SEQUENCE pfuser.FederationSecurity_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.FederationSecurity (
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
	CONSTRAINT pk2_FedSecurity PRIMARY KEY (fsId),
	CONSTRAINT uk_FedSecurity UNIQUE (fsClientName)
)
GO



-- OPTIONAL
CREATE SEQUENCE pfuser.SearchStore_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.SearchStore (
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
	CONSTRAINT pk_SearchStore PRIMARY KEY (ssId),
--	CONSTRAINT fk_SearchStore FOREIGN KEY (ssEssId, ssEssType) REFERENCES pfuser.EntitySearchStore(essId,essType) ON DELETE CASCADE,
	CONSTRAINT uk_SearchStore UNIQUE (ssEssId,ssEssType)
)
GO



CREATE SEQUENCE pfuser.SearchInstance_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser.SearchStoreInstance (
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
	CONSTRAINT pk_SrchStorInst PRIMARY KEY (ssiId)
--,
--	CONSTRAINT fk_SrchStorInst FOREIGN KEY (ssiStoreId) REFERENCES pfuser.SearchStore(ssId) ON DELETE CASCADE
)
GO

CREATE INDEX i3_SrchStorInst ON pfuser.SearchStoreInstance(ssiStoreId,ssiPeriod,ssiPeriodStart)
GO
CREATE INDEX i4_SrchStorInst ON pfuser.SearchStoreInstance(ssiStoreId,ssiPeriod,ssiCreateDate)
GO
CREATE INDEX i5_SrchStorInst ON pfuser.SearchStoreInstance(ssiToMergeDate,ssiDeleted)
GO

CREATE SEQUENCE pfuser.InstanceDataFiles_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.InstanceDataFiles (
	idfId			INT NOT NULL,
	idfFileName		VARCHAR(255) NOT NULL,
	idfInstanceId	INT NOT NULL,
	idfFormat	VARCHAR(255) NULL,
	idfVaultId		VARCHAR(128) NOT NULL,
	idfDateCreate		DATETIME NOT NULL,
	idfDateUpdate		DATETIME NOT NULL,
	idfDeleted		CHAR(1) NOT NULL,
	CONSTRAINT pk_InstDataFiles PRIMARY KEY (idfId)
,
--	CONSTRAINT fk_InstDataFiles FOREIGN KEY (idfInstanceId) REFERENCES pfuser.SearchStoreInstance(ssiId) ON DELETE CASCADE,
--	CONSTRAINT fk_InstDataFilesVa FOREIGN KEY (idfVaultId) REFERENCES pfuser.VaultItem(viStId) ON DELETE CASCADE,
	CONSTRAINT uk_InstDataFiles UNIQUE (idfFileName,idfInstanceId)
)
GO

-- OPTIONAL
CREATE INDEX i1_InstDataFiles ON pfuser.InstanceDataFiles(idfInstanceId)
GO


CREATE TABLE pfuser.InstanceMergeDetails (
	mdSsiId			INT NOT NULL,
	mdStoreId		INT NOT NULL,
	mdTempssiId		INT NOT NULL,
	mdMergeType		INT NOT NULL,
	mdState 		INT NOT NULL,
	mdRetry  		INT NULL,
	mdToMergeDate		DATETIME NOT NULL,
	mdDate			DATETIME NOT NULL,
	mdSegMergeJobId INT NULL,
	CONSTRAINT pk_InstMrgDet PRIMARY KEY (mdSsiId,mdTempssiId)
--,
--	CONSTRAINT fk_InstMrgDetStore FOREIGN KEY (mdStoreId) REFERENCES pfuser.SearchStore(ssId) ON DELETE CASCADE,
--	CONSTRAINT fk_InstMrgDetInst FOREIGN KEY (mdSsiId) REFERENCES pfuser.SearchStoreInstance(ssiId) ON DELETE CASCADE,
--	CONSTRAINT fk_InstMrgDetTemp FOREIGN KEY (mdTempssiId) REFERENCES pfuser.SearchStoreInstance(ssiId) ON DELETE CASCADE
)
GO
CREATE INDEX i2_InstMrgDet ON pfuser.InstanceMergeDetails(mdStoreId,mdState)
GO
CREATE INDEX i3_InstMrgDet ON pfuser.InstanceMergeDetails(mdSsiId,mdSegMergeJobId)
GO







	

CREATE SEQUENCE pfuser.InstanceSnapShot_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.InstanceSnapshot (
	snpId 	INT NOT NULL,
	snpSsiId	    INT NOT NULL,
	snpPeriodGen	VARCHAR(64) NOT NULL,	
	snpDateCreate 	DATETIME NOT NULL,
	snpDocCount INT NOT NULL,
	CONSTRAINT pk_instSnaps PRIMARY KEY (snpId),
--	CONSTRAINT fk_instSnaps FOREIGN KEY (snpSsiId) REFERENCES pfuser.SearchStoreInstance(ssiId) ON DELETE CASCADE,
	CONSTRAINT uk_instSnaps UNIQUE (snpSsiId,snpPeriodGen)
)
GO



CREATE TABLE pfuser.InstanceSnapshotSegments (
	segSnpId 	INT NOT NULL,
	segName	    VARCHAR(64) NOT NULL,
	segIdfID	INT NOT NULL,
	segDocCount	INT NOT NULL,	
	CONSTRAINT pk_inSnSeg PRIMARY KEY (segSnpId,segName)
--,
--	CONSTRAINT fk_inSnSegInst FOREIGN KEY (segSnpId) REFERENCES pfuser.InstanceSnapshot(snpId) ON DELETE CASCADE,
--	CONSTRAINT fk_inSnSegIdf FOREIGN KEY (segIdfID) REFERENCES pfuser.InstanceDataFiles(idfId) ON DELETE CASCADE
)
GO
-- OPTIONAL
CREATE INDEX i1_inSnSeg ON pfuser.InstanceSnapshotSegments(segIdfID)
GO


CREATE TABLE pfuser.SegmentMergeDetails (
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
	CONSTRAINT pk_SegMrgDet PRIMARY KEY (smdSsiId,smdSegName,smdTempType,smdTempSegName)
--,
--	CONSTRAINT fk_SegMrgDet FOREIGN KEY (smdSsiId) REFERENCES pfuser.SearchStoreInstance(ssiId) ON DELETE CASCADE
)
GO


CREATE SEQUENCE pfuser.SegmentMergeJob_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.SegmentMergeJob (
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
  CONSTRAINT pk_SegMrgJob PRIMARY KEY (smjId),
  CONSTRAINT uk_SegMrgJob UNIQUE (smjSsiId,smjSegName)
  )
GO


	
CREATE TABLE pfuser.SearchPartition (
	spStoreId	INT NOT NULL,
	spInstanceId	INT NOT NULL,
	spCreateDate	DATETIME NOT NULL,
	spClusterName	NVARCHAR(255) NOT NULL,
	spMachine	NVARCHAR(255) NULL,
	spProcessName	NVARCHAR(255) NOT NULL,
	spCacheTimeoutMin INT NULL,
	spReloadBeginTimeOffsetMin  INT NULL,
	spReloadEndTimeOffsetMin  INT NULL,
	CONSTRAINT pk_srchPart PRIMARY KEY (spStoreId, spInstanceId)
--,
--	CONSTRAINT fk_srchPartStore FOREIGN KEY (spStoreId) REFERENCES pfuser.SearchStore(ssId) ON DELETE CASCADE,
--	CONSTRAINT fk_srchPartInst FOREIGN KEY (spInstanceId) REFERENCES pfuser.SearchStoreInstance(ssiId) ON DELETE CASCADE
)
GO

CREATE TABLE pfuser.IndexDocRetry (
	docPrimaryId	NVARCHAR(255) NOT NULL,
	docStoreId	INT NOT NULL,
	docSsiId	INT NOT NULL,
	docDateUpdate		DATETIME NOT NULL,
	docStatus	INT NULL,
	docNumTries	INT NOT NULL,	
	CONSTRAINT pk_idocr PRIMARY KEY (docPrimaryId,docSsiId)
--,
--	CONSTRAINT fk_idocrStore FOREIGN KEY (docStoreId) REFERENCES pfuser.SearchStore(ssId) ON DELETE CASCADE,
--	CONSTRAINT fk_idocrInst FOREIGN KEY (docSsiId) REFERENCES pfuser.SearchStoreInstance(ssiId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_idocrMsg FOREIGN KEY (docPrimaryId) REFERENCES pfuser.ZLPMessage(MsgId) ON DELETE CASCADE
)
GO

CREATE INDEX i2_idocr ON pfuser.IndexDocRetry(docSsIid,docStatus,docDateUpdate)
GO


CREATE TABLE pfuser.IndexDocDelete (
	iddPrimaryId	NVARCHAR(255) NOT NULL,
	iddDuplicateOnly	CHAR(1) NOT NULL,
	iddStoreId	INT NOT NULL,
	iddInstanceId	INT NOT NULL,
	iddDate		DATETIME NOT NULL,
	CONSTRAINT pk_idd PRIMARY KEY (iddInstanceId,iddPrimaryId)
--,
--	CONSTRAINT fk_idd FOREIGN KEY (iddStoreId) REFERENCES pfuser.SearchStore(ssId) ON DELETE CASCADE
)
GO



CREATE SEQUENCE pfuser.SearchEngineLoad_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.SearchEngineLoad (
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
   CONSTRAINT pk_srchEngLoad PRIMARY KEY (selId)
--,
--	CONSTRAINT fk_srchEngLoad FOREIGN KEY (selStoreId) REFERENCES pfuser.SearchStore(ssId) ON DELETE CASCADE,
--	CONSTRAINT fk_srchEngLoad FOREIGN KEY (selInstanceId) REFERENCES pfuser.SearchStoreInstance(ssiId) ON DELETE CASCADE
)
GO




CREATE SEQUENCE pfuser.BigDBStore_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.BigDBStore (
	bdsId			INT NOT NULL,
	bdsType			VARCHAR(64) NOT NULL,
	bdsRefId		INT NOT NULL,
	bdsRefStId		NVARCHAR(255) NOT NULL,
	bdsCreateDate	DATETIME NOT NULL,
	CONSTRAINT pk_BigDBStore PRIMARY KEY (bdsId),
	CONSTRAINT uk_BigDBStore UNIQUE (bdsType,bdsRefStId)
)
GO

CREATE INDEX i1_BigDBStore ON pfuser.BigDBStore(bdsType,bdsRefId)
GO



CREATE SEQUENCE pfuser.BigDBSpace_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.BigDBSpace (
	spaceId			INT NOT NULL,
	spaceName		VARCHAR(255) NOT NULL,
	spaceDBId	INT NOT NULL,
	spaceVaultId	VARCHAR(128) NOT NULL,
	spaceFlags		BIGINT NOT NULL,
	spaceDateCreate	DATETIME NOT NULL,
	spaceDateUpdate	DATETIME NOT NULL,
	spaceDeleted	CHAR(1) NOT NULL,
	CONSTRAINT pk_BigDBSpace PRIMARY KEY (spaceId),
	CONSTRAINT uk_BigDBSpace UNIQUE (spaceDBId,spaceName)
)
GO


CREATE TABLE pfuser.BigDBParam (
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
	CONSTRAINT pk_bdbParam PRIMARY KEY (paramDBId,paramSeqNumber)
)
GO


CREATE TABLE pfuser.TextItemRetry (
	tiId		NVARCHAR(255) NOT NULL,
	tiType 		INT NOT NULL,
	tiTenant	INT NOT NULL,
	tiDate		DATETIME NOT NULL,
	tiDateUpdate DATETIME NOT NULL,
	tiStatus	INT NULL,
	tiNumTries	INT NOT NULL,	
	tiInfo		NVARCHAR(255) NULL,
	CONSTRAINT pk_textItemRetry PRIMARY KEY (tiId)
)
GO


CREATE INDEX i1_TextItemRetry ON pfuser.TextItemRetry(tiTenant,tiStatus,tiDate)
GO




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
    -- //PGSQL{[ipfItemStaticTag INT NOT NULL~~ipfItemStaticTag INT\x5B\x5D NOT NULL]}
    ipfItemStaticTag INT NOT NULL,
	CONSTRAINT pk_ipfTag PRIMARY KEY(ipfItemUid,ipfItemStaticTag)
--	CONSTRAINT fk_ipfTagUid FOREIGN KEY (ipfItemUid) REFERENCES pfuser.InPlaceFileItem(ipfItemUid) ON DELETE CASCADE,
--	CONSTRAINT fk_ipfTagStaticTag FOREIGN KEY (ipfItemStaticTag) REFERENCES pfuser.InPlaceTag(tagId) ON DELETE CASCADE
)
-- PARTITION(ipfItemUid) -- div 1024*1024*1024 for block
-- PARTITION(ipfItemStaticTag) -- mod 10 for search
GO
-- suggest bitmap, but test for conflict
CREATE INDEX i1_ipfTag ON pfuser.InPlaceFileItemStaticTag(ipfItemProjId)
GO
-- //PGSQL{[pfuser.InPlaceFileItemStaticTag(ipfItemStaticTag)~~pfuser.InPlaceFileItemStaticTag USING GIN (ipfItemStaticTag)]}
CREATE INDEX i2_ipfTag ON pfuser.InPlaceFileItemStaticTag(ipfItemStaticTag)
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
--Use by content insight
GO

CREATE SEQUENCE pfuser.FileTag_Sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE

CREATE TABLE pfuser.FileTag (
	tagId 			INT NOT NULL,
	tagProjId		INT NOT NULL,
	tagParentId		INT NOT NULL,
	tagName			NVARCHAR(255) NOT NULL,
	tagDisplayName			NVARCHAR(255) NULL,
	tagFlags		BIGINT NOT NULL,
	tagDesc			NVARCHAR(255) NULL,
	tagCreateDate	DATETIME NOT NULL,
	CONSTRAINT pk_FileTag PRIMARY KEY (tagId),
	CONSTRAINT uk_FileTag UNIQUE (tagProjId,tagName)
)
GO


CREATE TABLE pfuser.FileTagAction (
	ftaProjId		INT NOT NULL,
	ftaTagId		INT NOT NULL,
	ftaActionTagId		INT NOT NULL,
	ftaCreateDate	DATETIME NOT NULL,
	ftaZlpUserId	INT NOT NULL,
	ftaVal1 NVARCHAR(255) NULL,
	ftaVal2 NVARCHAR(255) NULL,
	ftaVal3 NVARCHAR(255) NULL,
	ftaVal4 NVARCHAR(255) NULL,
	ftaVal5 NVARCHAR(255) NULL,
	ftaVal6 NVARCHAR(255) NULL,
	ftaVal7 NVARCHAR(255) NULL,
	ftaVal8 NVARCHAR(255) NULL,
	CONSTRAINT pk_FileTagAction PRIMARY KEY (ftaTagId)
)
GO

CREATE INDEX i1_FileTagAction ON pfuser.FileTagAction(ftaProjId,ftaActionTagId)
GO




CREATE SEQUENCE pfuser.FileTreeDataCollect_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.FileTreeDataCollect (
	collectId		INT NOT NULL,
	collectName		NVARCHAR(255) NOT NULL,
	collectProjId 	INT NOT NULL,
	collectScanVersion		BIGINT NOT NULL,
	collectType 	INT NOT NULL,
	collectPurpose VARCHAR(32) NOT NULL,
	collectDateCreate	DATETIME NOT NULL,
	collectUpdate	DATETIME NOT NULL,
	collectStatus	INT NOT NULL,
	CONSTRAINT pk_FTDataColl PRIMARY KEY (collectId),
	CONSTRAINT uk_FTDtaColl UNIQUE (collectProjId,collectName)
)
GO


CREATE SEQUENCE pfuser.FileTreeSearch_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.FileTreeSearch (
	ftsId		INT NOT NULL,
	ftsName		NVARCHAR(255) NOT NULL,
	ftsProjId 	INT NOT NULL,
	ftsTenantId	INT NOT NULL,
	ftsDesc		NVARCHAR(255) NULL,
	ftsDate 	DATETIME NOT NULL,
	ftsQueryVal1 NVARCHAR(255) NULL,
	ftsQueryVal2 NVARCHAR(255) NULL,
	ftsQueryVal3 NVARCHAR(255) NULL,
	ftsQueryVal4 NVARCHAR(255) NULL,
	ftsQueryVal5 NVARCHAR(255) NULL,
	ftsQueryVal6 NVARCHAR(255) NULL,
	ftsQueryVal7 NVARCHAR(255) NULL,
	ftsQueryVal8 NVARCHAR(255) NULL,
	ftsQueryVal9 NVARCHAR(255) NULL,
	ftsQueryVal10 NVARCHAR(255) NULL,
	ftsJSONVal1 NVARCHAR(255) NULL,
	ftsJSONVal2 NVARCHAR(255) NULL,
	ftsJSONVal3 NVARCHAR(255) NULL,
	ftsJSONVal4 NVARCHAR(255) NULL,
	ftsJSONVal5 NVARCHAR(255) NULL,
	ftsJSONVal6 NVARCHAR(255) NULL,
	ftsJSONVal7 NVARCHAR(255) NULL,
	ftsJSONVal8 NVARCHAR(255) NULL,
	ftsJSONVal9 NVARCHAR(255) NULL,
	ftsJSONVal10 NVARCHAR(255) NULL,
	CONSTRAINT pk_FTSearch PRIMARY KEY (ftsId),
	CONSTRAINT uk_FTSearch UNIQUE (ftsTenantId,ftsProjId,ftsName)
)
GO

CREATE TABLE pfuser.FileTreeEntry (
	fteProjId	INT NOT NULL,
	fteDirId	INT NOT NULL,
	-- //MSSQL{[NVARCHAR2(255) NOT NULL~~NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL]}
	fteName	NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL,
	fteFlags	INT NOT NULL,
	fteFileCreateDate	DATETIME NOT NULL,
	fteFileLastModified	DATETIME NOT NULL,
	fteUpdate	DATETIME NOT NULL,	
	fteSyncDate	DATETIME NULL,	
	-- //MSSQL{[VARCHAR2(255) NULL~~VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NULL]}
	fteDigest	VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NULL,
	fteSize	BIGINT NOT NULL,
	fteTagIds    NVARCHAR(255) NULL,
	fteRetType	INT NOT NULL,
	fteRetId	INT NOT NULL,
	fteOutOfSync CHAR(1) DEFAULT 'N' NOT NULL,
    fteOutOfSyncDetectedDate DATETIME NULL,
	fteFileKey  NVARCHAR(255) NULL,
	fteVal1	    NVARCHAR(255) NULL,
	fteVal2		NVARCHAR(255) NULL,
	fteVal3		NVARCHAR(255) NULL,
	fteVal4		NVARCHAR(255) NULL,
	fteVal5		NVARCHAR(255) NULL,
	fteVal6		NVARCHAR(255) NULL,
	fteVal7		NVARCHAR(255) NULL,
	fteVal8		NVARCHAR(255) NULL,
	CONSTRAINT pk_fte PRIMARY KEY (fteProjId,fteDirId,fteName)
)
GO

CREATE TABLE pfuser.FileTreeEntrySyncAction (
	ftesaProjId        INT NOT NULL,
	ftesaDirId         INT NOT NULL,
	ftesaName          NVARCHAR(255) NOT NULL,
	ftesaCrawlVersion  NVARCHAR(255) NOT NULL,
	ftesaOldDirId      INT NOT NULL,
	ftesaOldName       NVARCHAR(255) NOT NULL,
    ftesaSyncDate      DATETIME NOT NULL,
	ftesaFileKey       NVARCHAR(255) NOT NULL,
	ftesaAction        INT NOT NULL,
	ftesaTagIds        NVARCHAR(255) NULL,
    ftesaRetId         INT NOT NULL,
    ftesaVal1	       NVARCHAR(255) NULL,
    ftesaVal2	       NVARCHAR(255) NULL,
    ftesaVal3		   NVARCHAR(255) NULL,
    ftesaVal4		   NVARCHAR(255) NULL,
    ftesaVal5		   NVARCHAR(255) NULL,
    ftesaVal6		   NVARCHAR(255) NULL,
    ftesaVal7		   NVARCHAR(255) NULL,
    ftesaVal8		   NVARCHAR(255) NULL
)
GO

CREATE INDEX i1_FileTreeEntrySyncAction ON pfuser.FileTreeEntrySyncAction(ftesaProjId)
GO

CREATE TABLE pfuser.FileTreePrivileges (
	ftpProjId INT NOT NULL,
	ftpFolderId INT NOT NULL,
	ftpZlpUserId INT NOT NULL,
	ftpPrivFlags BIGINT NOT NULL,
	ftpRecursive CHAR(1) NOT NULL,
	ftpExpiryDate	DATETIME NULL,
	CONSTRAINT pk_ftp UNIQUE (ftpProjId,ftpFolderId, ftpZlpUserId)
)
GO



CREATE TABLE pfuser.FileTreeRemediation (
	ftrProjId INT NOT NULL,
	ftrDirId	INT NOT NULL,
	-- //MSSQL{[NVARCHAR2(255) NOT NULL~~NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL]}
	ftrName	NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL,
	ftrSize BIGINT NOT NULL,
	ftrLastModified DATETIME NOT NULL,
	ftrRunId INT NOT NULL,
	ftrCrawlVersion  NVARCHAR(255) NOT NULL,
	ftrTagIds  NVARCHAR(255) NULL,
	ftrDATE DATETIME NOT NULL,
	ftrAction  NVARCHAR(255) NOT NULL,
	ftrPID 	NVARCHAR(255) NULL,
	ftrSuccess CHAR(1) NOT NULL,
	ftrMessage NVARCHAR(255) NULL,
	ftrLocation NVARCHAR(255) NULL,
	CONSTRAINT pk_ftRemediate UNIQUE (ftrProjId,ftrDirId,ftrName,ftrRunId)
)
GO



CREATE SEQUENCE pfuser.FTRemediationRuns_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.FileTreeRemediationRuns (
	ftrrProjId INT NOT NULL,
	ftrrId INT NOT NULL,
	ftrrCrawlVersion  NVARCHAR(255) NOT NULL,
	ftrrStatus INT NOT NULL,
	ftrrDateStart  DATETIME NOT NULL,
	ftrrUPDATE  DATETIME NOT NULL,
	ftrrDateEnd  DATETIME NULL,
	ftrrPID	NVARCHAR(255),
	ftrrArchiveCount INT NOT NULL,
	ftrrRemediateCount INT NOT NULL,
	ftrrMessage NVARCHAR(255) NULL,
	ftrrTagIds VARCHAR(512) NULL,
	CONSTRAINT pk_ftRemediateRun UNIQUE (ftrrProjId,ftrrId)
)
GO
		

CREATE SEQUENCE pfuser.FileTreeDashboard_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.FileTreeDashboard (
	ftdId			INT NOT NULL,
	ftdTenantId		INT NOT NULL,
	ftdZlpUserId	INT NOT NULL,
	ftdStatus		INT NOT NULL,
	ftdName			NVARCHAR(255) NOT NULL,
	ftdParamVal1 	NVARCHAR(255) NULL,
	ftdParamVal2 	NVARCHAR(255) NULL,
	ftdParamVal3 	NVARCHAR(255) NULL,
	ftdParamVal4 	NVARCHAR(255) NULL,
	ftdParamVal5 	NVARCHAR(255) NULL,
	ftdParamVal6 	NVARCHAR(255) NULL,
	ftdParamVal7 	NVARCHAR(255) NULL,
	ftdParamVal8 	NVARCHAR(255) NULL,
	CONSTRAINT pk_FileTreeDashboard PRIMARY KEY (ftdId),
	CONSTRAINT uk_FileTreeDashboard UNIQUE (ftdZlpUserId,ftdName)
)
GO

CREATE INDEX i1_fileTreeDash ON pfuser.FileTreeDashboard(ftdTenantId)
GO
CREATE INDEX i2_fileTreeDash ON pfuser.FileTreeDashboard(ftdZlpUserId)
GO
CREATE INDEX i3_fileTreeDash ON pfuser.FileTreeDashboard(ftdZlpUserId,ftdStatus)
GO
	
CREATE TABLE pfuser.FileTreeAuditTrail (
	ftaAction			INT NOT NULL,
	ftaDate				DATETIME NOT NULL,
	ftaTenantId 		INT NOT NULL,
	ftaProjId			INT NOT NULL,
	ftaDirId			INT NOT NULL,
	ftaName				NVARCHAR(255) NULL,
	ftaDisplayName		NVARCHAR(255) NULL,
	ftaZlpUserId		INT NOT NULL,
	ftaUser				NVARCHAR(255) NOT NULL,
	ftaDomainId			INT NOT NULL,	
	ftaProjDomainId		INT NOT NULL,
	ftaTxnId			VARCHAR(64) NOT NULL,
	ftaClearanceLevel	INT NOT NULL,
	ftaSourceIP 		VARCHAR(64) NULL,
	ftaDestIP   		VARCHAR(64) NULL,
	ftaAccessType 		VARCHAR(128) NULL,
	ftaComments			NVARCHAR(255) NULL,
	ftaVal1 			NVARCHAR(255) NULL,
	ftaVal2 			NVARCHAR(255) NULL,
	ftaVal3 			NVARCHAR(255) NULL,
	ftaVal4 			NVARCHAR(255) NULL,
	ftaVal5 			NVARCHAR(255) NULL
)
GO

CREATE INDEX i1_FileTreeAudit ON pfuser.FileTreeAuditTrail(ftaDate)
GO
CREATE INDEX i2_FileTreeAudit ON pfuser.FileTreeAuditTrail(ftaProjId)
GO
CREATE INDEX i3_FileTreeAudit ON pfuser.FileTreeAuditTrail(ftaProjId,ftaDirId,ftaName)
GO
CREATE INDEX i4_FileTreeAudit ON pfuser.FileTreeAuditTrail(ftaAction)
GO
CREATE INDEX i5_FileTreeAudit ON pfuser.FileTreeAuditTrail(ftaZlpUserId)
GO

CREATE TABLE pfuser.FileTreeScheduledRuns (
	ftsrProjId	INT NOT NULL,
	ftsrTaskType NVARCHAR(255) NOT NULL,
	ftsrInterval NVARCHAR(255) NOT NULL,
	ftsrDateStart	DATETIME NOT NULL,
	ftsrDateExpiry DATETIME NULL,
	ftsrIterations	INT NULL,
	CONSTRAINT pk_FTScheduledRuns PRIMARY KEY (ftsrProjId, ftsrTaskType)
)
GO
	
CREATE INDEX i1_FTScheduledRuns ON pfuser.FileTreeScheduledRuns(ftsrTaskType)
GO

CREATE SEQUENCE pfuser.FTDispositionRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.FileTreeDispositionRuns (
	ftdrId			INT NOT NULL,
	ftdrProjId		INT NOT NULL,
	ftdrTaskType	NVARCHAR(255) NOT NULL,
	ftdrApprovalRequestId	INT NOT NULL,
	ftdrPeriodEndDate	DATETIME NOT NULL,
	ftdrRpBdbId		INT NOT NULL,
	ftdrPID			NVARCHAR(255) NOT NULL,
	ftdrStartDate	DATETIME NOT NULL,
	ftdrUpdateDate	DATETIME NOT NULL,
	ftdrEndDate		DATETIME NULL,
	ftdrStatus		INT NOT NULL,
	ftdrStatusMsg	NVARCHAR(255) NULL,
	ftdrVal1		NVARCHAR(255) NULL,
	ftdrVal2		NVARCHAR(255) NULL,
	ftdrVal3		NVARCHAR(255) NULL,
	ftdrVal4		NVARCHAR(255) NULL,
	ftdrVal5		NVARCHAR(255) NULL,
	CONSTRAINT pk_FTDispRuns PRIMARY KEY (ftdrId)
)
GO

CREATE INDEX i1_FTDispRuns ON pfuser.FileTreeDispositionRuns(ftdrProjId, ftdrTaskType)
GO
CREATE INDEX i2_FTDispRuns ON pfuser.FileTreeDispositionRuns(ftdrTaskType, ftdrStatus)
GO





-- OPTIONAL
CREATE SEQUENCE pfuser.TrackerProject_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.TrackerProject (
	-- IDENTITY
	tracProjId		BIGINT NOT NULL,
	tracProjDomainId	INT NOT NULL,
	tracProjTenantId	INT NOT NULL,
	tracProjZLPUserId	INT NOT NULL,
	tracProjName	      NVARCHAR(255) NOT NULL,
	tracProjDisplayName	NVARCHAR(255) NOT NULL,
	tracProjPrivilegeFlags	     INT NOT NULL,
	tracProjKey 	NVARCHAR(255) NULL,
	tracProjDeleted 	CHAR(1) NOT NULL,
	CONSTRAINT pk_TrackerProject PRIMARY KEY (tracProjId),
--	CONSTRAINT fk_TracProjDomain FOREIGN KEY (tracProjDomainId) REFERENCES pfuser.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_TracProjZLPUser FOREIGN KEY (tracProjZLPUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
	CONSTRAINT uk_TrackerProject UNIQUE (tracProjName)
)
GO

CREATE INDEX i1_TrackerProject ON pfuser.TrackerProject(tracProjDomainId)
GO



CREATE TABLE pfuser.TrackerProjectPrivileges (
	tppProjId 		INT NOT NULL,
   	tppEntityId 	INT NOT NULL,
	tppEntityType	INT NOT NULL,
   	tppPrivilegeFlags 	INT NOT NULL,
--	CONSTRAINT fk_TracProjPriv FOREIGN KEY (tppProjId) REFERENCES pfuser.TrackerProject(tracProjId) ON DELETE CASCADE,
	CONSTRAINT uk_TracProjPriv UNIQUE (tppProjId,tppEntityType,tppEntityId)
)
GO

CREATE INDEX i1_TracProjPriv ON pfuser.TrackerProjectPrivileges(tppProjId)
GO

CREATE INDEX i2_TracProjPriv ON pfuser.TrackerProjectPrivileges(tppEntityType,tppEntityId)
GO



CREATE TABLE pfuser.TrackerEntity (
	teId 		INT NOT NULL,
	teType 		INT NOT NULL,
	teFlags		INT NOT NULL,
	teVal1		NVARCHAR(255) NULL,
	teVal2		NVARCHAR(255) NULL,
	teVal3		NVARCHAR(255) NULL,
	teVal4		NVARCHAR(255) NULL,	
	CONSTRAINT pk_TrackerEntity PRIMARY KEY  (teId,teType)
)
GO



CREATE SEQUENCE pfuser.TiPartition_seq
INCREMENT BY 1
START WITH 2
NO MAXVALUE
NO CYCLE
CACHE 10
GO






CREATE TABLE pfuser.TiPartition (
	tipId		INT NOT NULL,
	tipName		NVARCHAR(255) NOT NULL,
	tipTenantId INT NOT NULL,
	tipDateStart DATETIME NOT NULL,
	tipDateEnd   DATETIME,
	tipDomainIds VARCHAR(255) NULL,
	tipCreateDate DATETIME NOT NULL,
	tipNotes	NVARCHAR(255) NULL,
	tipMPLastItemId	INT NULL,
	tipSyncDate	DATETIME NULL,
	tipVal1	NVARCHAR(255) NULL,
	tipVal2	NVARCHAR(255) NULL,
	tipVal3	NVARCHAR(255) NULL,
	tipVal4	NVARCHAR(255) NULL,
	tipVal5	NVARCHAR(255) NULL,
	CONSTRAINT pk_TiPart PRIMARY KEY (tipTenantId,tipId),
	CONSTRAINT uk_TiPart UNIQUE (tipTenantId,tipName)
)
GO



CREATE SEQUENCE pfuser.TrackerItem_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO






CREATE TABLE pfuser.TracItem (
	tracItemId	BIGINT NOT NULL,
	tracItemProjId INT NOT NULL,
	tracItemTenantId INT NOT NULL,
	tracItemParentId BIGINT NULL,
	tracItemPartId	INT NOT NULL,
    tracItemCreator VARCHAR(255) NULL,
    tracItemLastUpdateUser  VARCHAR(255) NULL,
	tracItemAssignee VARCHAR(255) NULL,
	tracItemZLPUserIds VARCHAR(255) NULL,
	tracItemZLPUserIdTruncated CHAR(1) NULL,
    tracItemSubject NVARCHAR(255) NULL,
    tracItemSize 	INT NOT NULL,
    tracItemType	INT NOT NULL,
    tracItemStatus   INT,
	tracItemReviewerZLPUserId INT NULL,
	tracItemReviewDate DATETIME NULL,
    tracItemPriority   INT,
    tracItemNotify   INT,
	tracItemFlags	BIGINT NULL,
	tracItemDisableBulk CHAR(1) NULL,
	tracItemRefItemId    NVARCHAR(255) NULL,
	tracItemCatSeverity	INT,
    tracItemCreateDate    DATETIME  NOT NULL,
    tracItemLastUpdate    DATETIME  NOT NULL,
    tracItemProcessDate    DATETIME NOT NULL,
    tracItemExpectedCompleteDate    DATETIME NULL,
    tracItemVaultItemId VARCHAR(128) NULL,
    tracItemDeleted CHAR(1) NOT NULL,
    tracItemEncPwd  VARBINARY(128) NULL,
	tracItemLang  VARCHAR(10) NULL,
	tracItemFlagged CHAR(1) NOT NULL,
	tracItemEscalation	INT NOT NULL,
	tracItemVal1	NVARCHAR(255) NULL,
	tracItemVal2	NVARCHAR(255) NULL,
	tracItemVal3	NVARCHAR(255) NULL,
	CONSTRAINT pk_TracItem PRIMARY KEY (tracItemTenantId,tracItemId)
--,
--	CONSTRAINT fk_TracItemProj FOREIGN KEY (tracItemProjId) REFERENCES pfuser.TrackerProject(tracProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_TrackerItemVa FOREIGN KEY (tracItemVaultItemId) REFERENCES pfuser.VaultItem(viStId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_TracItem ON pfuser.TracItem(tracItemVaultItemId)
GO

CREATE INDEX i2_TracItem ON pfuser.TracItem(tracItemRefItemId)
GO

CREATE INDEX i3_TracItem ON pfuser.TracItem(tracItemTenantId,tracItemStatus,tracItemProjId,tracItemType,tracItemCreateDate,tracItemDeleted,tracItemId)
GO

CREATE INDEX i4_TracItem ON pfuser.TracItem(tracItemProjId,tracItemCreateDate)
GO

 

CREATE INDEX i6_TracItem ON pfuser.TracItem(tracItemTenantId,tracItemCreateDate)
GO

CREATE INDEX i7_TracItem ON pfuser.TracItem(tracItemTenantId,tracItemPartId,tracItemId)
GO

CREATE INDEX i8_TracItem ON pfuser.TracItem(tracItemTenantId,tracItemPartId,tracItemLastUpdate)
GO




-- MSSQL 2008
-- ALTER TABLE pfuser.TracItem SET (LOCK_ESCALATION = DISABLE)
-- GO



CREATE TABLE pfuser.TracItemDelete (
	tidId	BIGINT NOT NULL,
	tidProjId INT NOT NULL,
	tidTenantId INT NOT NULL,
	tidPartId	INT NOT NULL,
    tidDate    DATETIME  NOT NULL,
	CONSTRAINT pk_TracItemDel PRIMARY KEY (tidTenantId,tidId)
)
GO
CREATE INDEX i1_TracItemDel ON pfuser.TracItemDelete(tidTenantId,tidPartId,tidId)
GO



CREATE TABLE pfuser.TrackerAuditTrail (
	taAction	INT NOT NULL,
	taDate		DATETIME NOT NULL,	
	taItemId	BIGINT NOT NULL,	
	taRefItemId	VARCHAR(255) NULL,
	taFolderId	INT NOT NULL,
	taProjectId	INT NOT NULL,
	taZlpUserId	INT NOT NULL,
	taUser		NVARCHAR(255) NOT NULL,	
	taDomainId	INT NOT NULL,
	taTenantId INT NOT NULL,	
	taTxnId		VARCHAR(64) NOT NULL,
	taClearanceLevel	INT NOT NULL,
	taSourceIP 	VARCHAR(64) NULL,
	taDestIP   	VARCHAR(64) NULL,
	taAccessType 	VARCHAR(128) NULL,
	taZViteStId 	VARCHAR(255) NULL,
	taComments	NVARCHAR(255) NULL,
	taVal1 	NVARCHAR(255) NULL,
	taVal2 	NVARCHAR(255) NULL,
	taVal3 	NVARCHAR(255) NULL,
	taVal4 	NVARCHAR(255) NULL,
	taVal5 	NVARCHAR(255) NULL
--,
--	CONSTRAINT fk_TracAudProj FOREIGN KEY (taProjectId) REFERENCES pfuser.TrackerProject(tracProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_TracAudFldr FOREIGN KEY (taFolderId) REFERENCES pfuser.TrackerFolder(tracFldrId) ON DELETE CASCADE,
--	CONSTRAINT fk_TracAudItem FOREIGN KEY (taItemId) REFERENCES pfuser.TracItem(tracItemId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_TracAudDomain FOREIGN KEY (taDomainId) REFERENCES pfuser.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_TracAudZLPUser FOREIGN KEY (taZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_TracAudTrail ON pfuser.TrackerAuditTrail(taDate)
GO
CREATE INDEX i2_TracAudTrail ON pfuser.TrackerAuditTrail(taDomainId)
GO
CREATE INDEX i3_TracAudTrail ON pfuser.TrackerAuditTrail(taItemId)
GO
CREATE INDEX i4_TracAudTrail ON pfuser.TrackerAuditTrail(taRefItemId)
GO
CREATE INDEX i5_TracAudTrail ON pfuser.TrackerAuditTrail(taZlpUserId)
GO



CREATE TABLE pfuser.UserMailComplianceStat (
	umcsZlpUserId INT NOT NULL,
	umcsAsId INT NOT NULL,
	umcsTenantId INT NOT NULL,
	umcsReviewAsId INT NOT NULL,
	umcsAltReviewAsIds VARCHAR(255) NULL,
	umcsPolVal1 	NVARCHAR(255) NULL,
	umcsPolVal2 	NVARCHAR(255) NULL,
	umcsPeriod	NVARCHAR(255) NOT NULL, 
	umcsPeriodInfo	NVARCHAR(255) NOT NULL, 
	umcsPeriodStartDate DATETIME NOT NULL,
	umcsPeriodEndDate DATETIME NOT NULL, 
	umcsCreateDate DATETIME NOT NULL,
	umcsLastUpdate DATETIME NOT NULL,
	umcsChangeNumber INT NOT NULL,
	umcsTotal	INT NOT NULL,
	umcsFlaggedTotal INT NOT NULL,
	umcsPreReview	INT NOT NULL,
	umcsPostReview	INT NOT NULL,
	umcsRandomPreReview INT NOT NULL,
	umcsRandomPostReview INT NOT NULL,
	umcsFlaggedBackFill	INT NOT NULL,
	umcsRandomBackFill	INT NOT NULL,
	umcsForcePostReview	INT NOT NULL,
	umcsTargetedReview	INT NOT NULL,
	umcsComplianceOff INT NOT NULL,
	umcsTiCount INT NOT NULL,
	umcsTiApprovedCount INT NOT NULL,
	umcsTiBulkApprovedCount INT NOT NULL,
	umcsTiRejectCount INT NOT NULL,
	umcsTiBulkRejectCount INT NOT NULL,
	umcsTiBulkReleaseCount INT NOT NULL,
	umcsBackFillRunCount INT NOT NULL,
	umcsBackFillLastRunDate DATETIME NULL,
	umcsBackFillMessage NVARCHAR(255) NULL,
	CONSTRAINT pk_umcs UNIQUE (umcsZlpUserId,umcsPeriodInfo)
--,
--	CONSTRAINT fk_umcsAs FOREIGN KEY (umcsAsId) REFERENCES pfuser.ArchiveServer(asId) ON DELETE CASCADE,
--	CONSTRAINT fk_umcsReviewAs FOREIGN KEY (umcsReviewAsId) REFERENCES pfuser.ArchiveServer(asId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_umcsZLPUser FOREIGN KEY (umcsZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_umcs ON pfuser.UserMailComplianceStat(umcsZlpUserId,umcsPeriod,umcsPeriodStartDate)
GO
CREATE INDEX i2_umcs ON pfuser.UserMailComplianceStat(umcsAsId,umcsPeriod,umcsPeriodStartDate)
GO
CREATE INDEX i4_umcs ON pfuser.UserMailComplianceStat(umcsReviewAsId,umcsPeriod,umcsPeriodStartDate)
GO
CREATE INDEX i5_umcs ON pfuser.UserMailComplianceStat(umcsTenantId,umcsPeriodStartDate)
GO


CREATE TABLE pfuser.DeptMailComplianceStat (
	dmcsTenantId INT NOT NULL,
	dmcsReviewAsId INT NOT NULL,
	dmcsPolVal1 	NVARCHAR(255) NULL,
	dmcsPolVal2 	NVARCHAR(255) NULL,
	dmcsPeriod	NVARCHAR(255) NOT NULL, 
	dmcsPeriodInfo	NVARCHAR(255) NOT NULL, 
	dmcsPeriodStartDate DATETIME NOT NULL,
	dmcsPeriodEndDate DATETIME NOT NULL, 
	dmcsCreateDate DATETIME NOT NULL,
	dmcsLastUpdate DATETIME NOT NULL,
	dmcsChangeNumber INT NOT NULL,
	dmcsTotal	INT NOT NULL,
	dmcsFlaggedTotal INT NOT NULL,
	dmcsPreReview	INT NOT NULL,
	dmcsPostReview	INT NOT NULL,
	dmcsRandomPreReview INT NOT NULL,
	dmcsRandomPostReview INT NOT NULL,
	dmcsFlaggedBackFill	INT NOT NULL,
	dmcsRandomBackFill	INT NOT NULL,
	dmcsForcePostReview	INT NOT NULL,
	dmcsTargetedReview 	INT NOT NULL,
	dmcsComplianceOff INT NOT NULL,
	dmcsTiCount INT NOT NULL,
	dmcsTiApprovedCount INT NOT NULL,
	dmcsTiBulkApprovedCount INT NOT NULL,
	dmcsTiRejectCount INT NOT NULL,
	dmcsTiBulkRejectCount INT NOT NULL,
	dmcsTiBulkReleaseCount INT NOT NULL,
	dmcsBackFillRunCount INT NOT NULL,
	dmcsBackFillLastRunDate DATETIME NULL,
	dmcsBackFillMessage NVARCHAR(255) NULL,
	CONSTRAINT pk_dmcs UNIQUE (dmcsReviewAsId,dmcsPeriodInfo)
--,
--	CONSTRAINT fk_dmcsReviewAs FOREIGN KEY (dmcsReviewAsId) REFERENCES pfuser.ArchiveServer(asId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_dmcs ON pfuser.DeptMailComplianceStat(dmcsReviewAsId,dmcsPeriod,dmcsPeriodStartDate)
GO
CREATE INDEX i2_dmcs ON pfuser.DeptMailComplianceStat(dmcsTenantId,dmcsPeriodStartDate)
GO


CREATE TABLE pfuser.ComplianceMail (
	cmMsgId	   VARCHAR(255) NOT NULL,
	cmZlpUserId INT NOT NULL,
	cmMailType NVARCHAR(64) NOT NULL,
	cmDirection CHAR(1) NULL,
	cmOn CHAR(1) NULL,
	cmAsId INT NOT NULL,
	cmReviewAsId INT NOT NULL,
	cmTrackerItemId BIGINT NULL,
	cmFlagged CHAR(1)  NULL,
	cmPreReview	CHAR(1) NOT NULL,
	cmPostReview	CHAR(1) NOT NULL,
	cmRandomPreReview CHAR(1) NOT NULL,
	cmRandomPostReview CHAR(1) NOT NULL,
	cmBackFill CHAR(1) NOT NULL,
	cmForcePostReview CHAR(1)  NULL,
	cmTargetedReview CHAR(1)  NULL,
	cmComplianceOff CHAR(1) NOT NULL,
	cmComplianceOffReason NVARCHAR(64) NULL,	
	cmComplianceFlag INT NOT NULL,
	cmDate 	DATETIME NOT NULL,
	cmReviewerZLPUserId INT NULL,
	cmReviewDate DATETIME NULL,
	cmReviewAction INT NULL,
	cmLastUpdate DATETIME NOT NULL,
        CONSTRAINT pk_compMail PRIMARY KEY (cmMsgId,cmZlpUserId)
--,
--	CONSTRAINT fk_compMailItem FOREIGN KEY (cmTrackerItemId) REFERENCES pfuser.TrackerItem(tracItemId) ON DELETE CASCADE,
--	CONSTRAINT fk_compMailAs FOREIGN KEY (cmAsId) REFERENCES pfuser.ArchiveServer(asId) ON DELETE CASCADE,
--	CONSTRAINT fk_compMailRevAs FOREIGN KEY (cmReviewAsId) REFERENCES pfuser.ArchiveServer(asId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_compMailZLPUser FOREIGN KEY (cmZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_compMailMsg FOREIGN KEY (cmMsgId) REFERENCES pfuser.ZLPMessage(MsgId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_compMail ON pfuser.ComplianceMail(cmLastUpdate)
GO
CREATE INDEX i2_compMail ON pfuser.ComplianceMail(cmZlpUserId,cmDate)
GO
CREATE INDEX i3_compMail ON pfuser.ComplianceMail(cmAsId,cmDate)
GO
CREATE INDEX i4_compMail ON pfuser.ComplianceMail(cmReviewAsId,cmDate)
GO
CREATE INDEX i5_compMail ON pfuser.ComplianceMail(cmReviewAsId,cmReviewDate)
GO
 
CREATE INDEX i6_compMail ON pfuser.ComplianceMail(cmTrackerItemId)
GO

-- MSSQL 2008
-- ALTER TABLE pfuser.ComplianceMail SET (LOCK_ESCALATION = DISABLE)
-- GO



CREATE TABLE pfuser.DepartmentReviewStat (
	drsAsId INT NOT NULL,
	drsPeriod	NVARCHAR(255) NOT NULL, 
	drsPeriodInfo	NVARCHAR(255) NOT NULL, 
	drsPeriodStartDate DATETIME NOT NULL,
	drsPeriodEndDate DATETIME NOT NULL, 
	drsLastUpdate DATETIME NOT NULL,
	drsTotal	INT NOT NULL,
	drsPreReview	INT NOT NULL,
	drsPostReview	INT NOT NULL,
	drsRandomPreReview INT NOT NULL,
	drsRandomPostReview INT NOT NULL,
	drsBackFill	INT NOT NULL,
	drsComplianceOff INT NOT NULL,
	drsPendingReviewFlagged INT NOT NULL,
	drsApprovedFlagged 	INT NOT NULL,
	drsRejectedFlagged	INT NOT NULL,
	drsPartialApprovedFlagged INT NOT NULL,
	drsBulkApprovedFlagged INT NOT NULL,
	drsBulkRejectedFlagged 	INT NOT NULL,
	drsPendingReviewRandom INT NOT NULL,
	drsApprovedRandom 	INT NOT NULL,
	drsRejectedRandom	INT NOT NULL,
	drsBulkApprovedRandom INT NOT NULL,
	drsBulkRejectedRandom 	INT NOT NULL,
        drsOldPendingReviewFlagged INT NOT NULL,
	drsOldApprovedFlagged 	INT NOT NULL,
	drsOldRejectedFlagged	INT NOT NULL,
	drsOldPartialApprovedFlagged INT NOT NULL,
	drsOldBulkApprovedFlagged INT NOT NULL,
	drsOldBulkRejectedFlagged 	INT NOT NULL,
	drsOldPendingReviewRandom INT NOT NULL,
	drsOldApprovedRandom 	INT NOT NULL,
	drsOldRejectedRandom	INT NOT NULL,
	drsOldBulkApprovedRandom INT NOT NULL,
	drsOldBulkRejectedRandom 	INT NOT NULL,  
        drsRPI		REAL NOT NULL,
	CONSTRAINT pk_DeptRevSt UNIQUE (drsAsId,drsPeriodInfo)
--,
--	CONSTRAINT fk_DeptRevStAs FOREIGN KEY (drsAsId) REFERENCES pfuser.ArchiveServer(asId) ON DELETE CASCADE
)
GO
CREATE INDEX i1_DeptRevSt ON pfuser.DepartmentReviewStat(drsAsId,drsPeriodStartDate)
GO


CREATE TABLE pfuser.TrackerItemStats (
	tisProjId INT NOT NULL,
	tisDate DATETIME NOT NULL,
	tis0	INT NOT NULL,
	tis1	INT NOT NULL,
	tis2	INT NOT NULL,
	tis3	INT NOT NULL,
	tis4	INT NOT NULL,
	tis5	INT NOT NULL,
	tis6	INT NOT NULL,
	tis7	INT NOT NULL,
	tis8	INT NOT NULL,
	tis9	INT NOT NULL,
	CONSTRAINT pk_TiStat  PRIMARY KEY (tisProjId)
--,
--	CONSTRAINT fk_TiStatProj FOREIGN KEY (tisProjId) REFERENCES pfuser.TrackerProject(tracProjId) ON DELETE CASCADE
)
GO


CREATE TABLE pfuser.LexAnal (
	laMsgId		VARCHAR(64) NOT NULL,
	laEntityType	INT NULL,
	laEntityId	INT NULL,
	laSeqNumber		INT NOT NULL,
	laNext			CHAR(1) NOT NULL,
	laDate			DATETIME NOT NULL,
	laVal1			NVARCHAR(255) NULL,
	laVal2			NVARCHAR(255) NULL,
	laVal3			NVARCHAR(255) NULL,
	laVal4			NVARCHAR(255) NULL,
	laVal5			NVARCHAR(255) NULL,
	laVal6			NVARCHAR(255) NULL,
	laVal7			NVARCHAR(255) NULL,
	laVal8			NVARCHAR(255) NULL,
	CONSTRAINT pk_lexAnal PRIMARY KEY (laMsgId,laSeqNumber)
--,
--	CONSTRAINT fk_lexAnalMsg FOREIGN KEY (laMsgId) REFERENCES pfuser.ZLPMessage(MsgId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_lexAnal ON pfuser.LexAnal(laDate)
GO
CREATE INDEX i2_lexAnal ON pfuser.LexAnal(laEntityType,laEntityId)
GO


CREATE TABLE pfuser.DeptBackFillRun (
	dbfrBgtId		INT NOT NULL,
        dbfrZlpUserId           INT NOT NULL,
	dbfrReviewAsId		INT NOT NULL,
	dbfrDateStart		DATETIME NULL,
	dbfrUpdate		DATETIME NULL,
	dbfrDateEnd		DATETIME NULL,
	dbfrPID			NVARCHAR(64),
	dbfrMsgVal1			NVARCHAR(255),
	dbfrMsgVal2			NVARCHAR(255),
	dbfrMsgVal3			NVARCHAR(255),
	dbfrMsgVal4			NVARCHAR(255),
	CONSTRAINT pk_DeptBfr PRIMARY KEY (dbfrBgtId,dbfrReviewAsId,dbfrZlpUserId)
--,
--	CONSTRAINT fk_DeptBfrRevAs FOREIGN KEY (dbfrReviewAsId) REFERENCES pfuser.ArchiveServer(asId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_DeptBfrZLPUser FOREIGN KEY (dbfrZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO


-- OPTIONAL
CREATE SEQUENCE pfuser.CannedResponse_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser.CannedResponse (
	-- IDENTITY
	crId		BIGINT NOT NULL,
	crName		NVARCHAR(255) NOT NULL,
	crDesc		NVARCHAR(255) NOT NULL,
	crEntityType	INT NOT NULL,
	crEntityId	INT NOT NULL,
	crCreateDate DATETIME NOT NULL,
	crLastUpdate DATETIME NOT NULL,
	crZlObjId	INT NOT NULL,
	CONSTRAINT pk_canResp PRIMARY KEY (crId),
        CONSTRAINT uk_canResp UNIQUE (crName,crEntityType,crEntityId)
)
GO
CREATE INDEX i1_canResp ON pfuser.CannedResponse(crEntityType,crEntityId)
GO
		
CREATE SEQUENCE pfuser.TrackerSavedSearch_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.TrackerSavedSearch (
	tssId		INT NOT NULL,
	tssTenantId	INT NOT NULL,
	tssPartId	INT NOT NULL,
	tssZlpUserId	INT NOT NULL,
	tssName		NVARCHAR(255) NOT NULL,
	tssType		VARCHAR(255) NOT NULL,
	tssDesc		NVARCHAR(255) NULL,
	tssDate 	DATETIME NOT NULL,
	tssDatePerformed DATETIME NOT NULL,
	tssQueryVal1 NVARCHAR(255) NULL,
	tssQueryVal2 NVARCHAR(255) NULL,
	tssQueryVal3 NVARCHAR(255) NULL,
	tssQueryVal4 NVARCHAR(255) NULL,
	tssQueryVal5 NVARCHAR(255) NULL,
	tssQueryVal6 NVARCHAR(255) NULL,
	tssQueryVal7 NVARCHAR(255) NULL,
	tssQueryVal8 NVARCHAR(255) NULL,
	tssQueryVal9 NVARCHAR(255) NULL,
	tssQueryVal10 NVARCHAR(255) NULL,
	tssJSONVal1 NVARCHAR(255) NULL,
	tssJSONVal2 NVARCHAR(255) NULL,
	tssJSONVal3 NVARCHAR(255) NULL,
	tssJSONVal4 NVARCHAR(255) NULL,
	tssJSONVal5 NVARCHAR(255) NULL,
	tssJSONVal6 NVARCHAR(255) NULL,
	tssJSONVal7 NVARCHAR(255) NULL,
	tssJSONVal8 NVARCHAR(255) NULL,
	tssJSONVal9 NVARCHAR(255) NULL,
	tssJSONVal10 NVARCHAR(255) NULL,
	CONSTRAINT pk_TracSearch PRIMARY KEY (tssId),
	CONSTRAINT uk_TracSearch UNIQUE (tssTenantId,tssPartId,tssZlpUserId, tssName)
)
GO

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
-- *************************************************************************************
-- FileName :ZLHubOra.sql
-- Features :
--
--
-- *************************************************************************************
-- *************************************************************************************


CREATE TABLE pfuser.MessageTransport (
	mtMsgId VARCHAR(64) NOT NULL,
	mtType INT NOT NULL,
	mtDate	DATETIME NOT NULL,
	mtMachine NVARCHAR(64) NULL,
	mtState INT NOT NULL,
	mtUpDate	DATETIME NOT NULL,
	mtTransferDate	DATETIME NULL,
	mtRetry	INT NOT NULL,
	mtVaultId VARCHAR(255) NULL,
	mtComment NVARCHAR(255) NULL,
	CONSTRAINT pk_MsgTrans PRIMARY KEY (mtMsgId)
--,
--	CONSTRAINT fk_MsgTrans FOREIGN KEY (mtMsgId) REFERENCES pfuser.ZLPMessage(MsgId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_MsgTransVa FOREIGN KEY (mtVaultId) REFERENCES pfuser.VaultItem(viStId) ON DELETE CASCADE
)
GO


CREATE INDEX i1_MsgTrans ON pfuser.MessageTransport(mtState,mtDate)
GO
CREATE INDEX i2_MsgTrans ON pfuser.MessageTransport(mtDate)
GO

--------------------------------------


CREATE TABLE pfuser.MsgTransportConfirmation (
	mtcMsgId VARCHAR(64) NOT NULL,
	mtcInstall VARCHAR(64) NOT NULL,
	mtcDate	DATETIME NOT NULL,
	CONSTRAINT pk_MsgTrConf PRIMARY KEY (mtcMsgId)
--,
--	CONSTRAINT fk_MsgTrConf FOREIGN KEY (mtMsgId) REFERENCES pfuser.ZLPMessage(MsgId) ON DELETE CASCADE
)
GO


CREATE INDEX i1_MsgTrConf ON pfuser.MsgTransportConfirmation(mtcInstall)
GO



CREATE SEQUENCE pfuser.ProfileTransport_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.ProfileTransport (
	ptId INT NOT NULL,
	ptEntityId INT NOT NULL,
	ptChangeType INT NOT NULL,
	ptConflictRetry CHAR(1) NOT NULL,
	ptDate	DATETIME NOT NULL,
	ptMachine NVARCHAR(64) NULL,
	ptState INT NOT NULL,
	ptUpdate	DATETIME NOT NULL,
	ptVal1 NVARCHAR(255) NULL,
	ptVal2 NVARCHAR(255) NULL,
	ptVal3 NVARCHAR(255)  NULL,
	ptComment NVARCHAR(255) NULL,
	CONSTRAINT pk_PrTrans PRIMARY KEY (ptId)
--,
--	CONSTRAINT fk_PrTrans FOREIGN KEY (ptEntityId) REFERENCES pfuser.EntityObject(eoEntityId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_PrTrans ON pfuser.ProfileTransport(ptState,ptId)
GO
-- FileName :zlplusOra.sql
-- Features :
--
--
-- *************************************************************************************
-- *************************************************************************************




-- *************************************************************************************
--	ZLPUSER
-- *************************************************************************************



CREATE TABLE pfuser.ZLPUser (
	ZlpUserId		INT NOT NULL,
	ZlpUserAcctNo		INT NOT NULL,
    ZlpUserDomainId 	INT NOT NULL,
    ZlpUserTenantId	INT NOT NULL,
	ZlpUserAddress		VARCHAR(255) NOT NULL,
	ZlpUserCaseAddress	NVARCHAR(255) NOT NULL,
	ZlpUserReplyTo		NVARCHAR(255) NOT NULL,
	ZlpUserFrom		NVARCHAR(255) NULL,
	ZlpUserFlags		INT NOT NULL,
	ZlpUserAddressBookId	INT NULL,
	ZlpUserDeleted		CHAR(1) NOT NULL,
	ZlpUser2FKey 		VARBINARY(128) NULL,
	CONSTRAINT pk_ZLPUser PRIMARY KEY (ZlpUserId),
--	CONSTRAINT fk_ZLPUserDomain FOREIGN KEY (ZlpUserDomainId) REFERENCES pfuser.ZLPDomainInfo(zdDomainId) ON DELETE CASCADE,
--	CONSTRAINT fk_ZLPUserAcctNo FOREIGN KEY (ZlpUserAcctNo) REFERENCES pfuser.ZipAccount(zaAcctNo) ON DELETE CASCADE,
	CONSTRAINT uk_ZLPUser UNIQUE (ZlpUserAddress)
)
GO
-- Storage (initial 100M next 50M minextents 1 PCTINCREASE 0 maxextents 40)

CREATE INDEX i1_ZLPUser ON pfuser.ZLPUser(ZlpUserAcctNo)
GO
CREATE INDEX i2_ZLPUser ON pfuser.ZLPUser(ZlpUserDomainId)
GO


CREATE TABLE pfuser.ZLPUserPasswordSecurity (
	zlpSecZlpUserId		INT NOT NULL,
	zlpSecCreateDate	DATETIME NOT NULL,
	zlpSecLastUpdate	DATETIME NOT NULL,
	zlpSecQVal1		NVARCHAR(512) NULL,
	zlpSecQVal2		NVARCHAR(512) NULL,
	zlpSecQVal3		NVARCHAR(512) NULL,
	zlpSecQVal4		NVARCHAR(512) NULL,
	zlpSecAVal1		NVARCHAR(512) NULL,
	zlpSecAVal2		NVARCHAR(512) NULL,
	zlpSecAVal3		NVARCHAR(512) NULL,
	zlpSecAVal4		NVARCHAR(512) NULL,
	CONSTRAINT pk_ZLPUserPwdSec PRIMARY KEY (zlpSecZlpUserId)
)
GO


CREATE TABLE pfuser.SecurityGroup (
	sgZlpUserId		INT NOT NULL,
	sgTenantId		INT NOT NULL,
	sgCreateDate	DATETIME NOT NULL,
	sgUserDeleted	CHAR(1) NULL,
	sgLastUpdate	DATETIME NOT NULL,
	CONSTRAINT pk_SecGroup PRIMARY KEY (sgZlpUserId)
)
GO
	
CREATE TABLE pfuser.SecurityGroupMembership (
	sgmZlpUserId	INT NOT NULL,
	sgmTenantId		INT NOT NULL,
	sgmLastUpdate	DATETIME NOT NULL,
	sgmFlags 		INT NOT NULL,	
	sgmGroupVal1	NVARCHAR(512) NULL,
	sgmGroupVal2	NVARCHAR(512) NULL,
	sgmGroupVal3	NVARCHAR(512) NULL,
	sgmGroupVal4	NVARCHAR(512) NULL,
	sgmGroupVal5	NVARCHAR(512) NULL,
	sgmGroupVal6	NVARCHAR(512) NULL,
	sgmGroupVal7	NVARCHAR(512) NULL,
	sgmGroupVal8	NVARCHAR(512) NULL,
	sgmGroupVal9	NVARCHAR(512) NULL,
	sgmGroupVal10	NVARCHAR(512) NULL,
	sgmGroupVal11	NVARCHAR(512) NULL,
	sgmGroupVal12	NVARCHAR(512) NULL,
	CONSTRAINT pk_SecGroupMem PRIMARY KEY (sgmZlpUserId)
)
GO
	

-- EXTRELAY, INRELAY_XCHG1, INRELAY_XCHG2,...
-- OUTBOUNDSOURCE
CREATE TABLE pfuser.ZLHost (
  	hostSetName VARCHAR(64) NOT NULL,
	hostSetDisplayName	NVARCHAR(255) NOT NULL,
	hostName	VARCHAR(64) NOT NULL,
	hostPort	INT NOT NULL,
	hostFlags INT NOT NULL,
    hostEnabled CHAR(1) NOT NULL,
	hostDesc	NVARCHAR(255) NULL,
	hostCreateDate DATETIME NOT NULL,
	hostLastUpdate DATETIME NOT NULL,
	CONSTRAINT pk_host PRIMARY KEY (hostSetName,hostName,hostPort)
)
GO



CREATE TABLE pfuser.ManagedEmailDomain (
	medTenantId	INT NOT NULL,
	medDomainName VARCHAR(255) NOT NULL,
	medType INT NOT NULL,
	medHostSetName VARCHAR(255) NULL,
	medOrder INT NOT NULL,
	CONSTRAINT pk2_MED PRIMARY KEY (medTenantId,medDomainName)
)
GO



CREATE TABLE pfuser.TenantHost (
  	tenHostPattern VARCHAR(255) NOT NULL,
	tenHostTenantId	INT NOT NULL,
	tenPriority INT NOT NULL,
	tenHostFlags INT NOT NULL,
	tenHostCreateDate DATETIME NOT NULL,
	tenHostLastUpdate DATETIME NOT NULL,
	CONSTRAINT pk_tenHost PRIMARY KEY (tenHostPattern,tenHostTenantId)
)
GO

-- OPTIONAL
CREATE SEQUENCE pfuser.ZlpFolder_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.ZLPFolder (
	-- IDENTITY
	fldrId BIGINT NOT NULL,
	fldrParentId INT NOT NULL,
	fldrZLPUserId INT NOT NULL,
	-- //MSSQL{[NVARCHAR2(255) NOT NULL~~NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL]}
	fldrName NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL,
	fldrNameExternal NVARCHAR(255) NOT NULL,
	fldrDesc NVARCHAR(255) NULL,
	fldrType INT NOT NULL,
	fldrFlags INT NOT NULL,
	fldrSize BIGINT,
	fldrMsgCount INT NULL,
	fldrMsgUnread INT NULL,
	fldrChangeNumber INT NOT NULL,
	fldrUpdateTime DATETIME NOT NULL,
	CONSTRAINT pk_zlpfolder PRIMARY KEY (fldrId,fldrZLPUserId), 
--	CONSTRAINT pk_zlpfolder PRIMARY KEY (fldrId), 
--	CONSTRAINT fk_zlpfolderZLPUser FOREIGN KEY (fldrZLPUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_zlpfolderParent FOREIGN KEY (fldrParentId) REFERENCES pfuser.ZLPFolder(fldrId) ON DELETE CASCADE,
	CONSTRAINT uk_zlpfolder UNIQUE (fldrZLPUserId,fldrParentId,fldrName)
)
GO
-- Storage (initial 75M NEXT 5M MINEXTENTS 1 MAXEXTENTS 20 PCTINCREASE 33) PCTFREE 5

CREATE INDEX i1_ZLPFolder ON pfuser.ZLPFolder(fldrZLPUserId)
GO




CREATE SEQUENCE pfuser.ZlpMessage_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO

CREATE TABLE pfuser.ZLPMessage (
	MsgUid			    BIGINT NOT NULL,
	MsgZlpUserId		    INT NOT NULL,
	MsgId                       VARCHAR(64) NOT NULL,
	MsgFolderId                 INT NOT NULL,
	MsgIsRead                   CHAR(1) NOT NULL,
	MsgDeleted          	    CHAR(1) NOT NULL,
	MsgSenderAuthenticated      CHAR(1) NOT NULL,
	MsgEncMsgPwd                VARBINARY(128) NULL,
	MsgType                     INT NOT NULL,
	MsgLanguage                 VARCHAR(10) NULL,
	MsgFrom                     NVARCHAR(255) NULL,
	MsgRecipient         	    NVARCHAR(255) NULL,
	MsgSubject                  NVARCHAR(255) NULL,
	MsgCategory		    NVARCHAR(255) NULL,
	MsgUserTags  		    NVARCHAR(255) NULL,
	MsgDateProcessed            DATETIME NOT NULL,
	MsgDateCreate               DATETIME NOT NULL,
	MsgDateSent		    DATETIME NOT NULL,
    MsgDateExpiry		    DATETIME NULL,
	MsgVaultItemId              VARCHAR(128) NOT NULL,
	MsgRmId VARCHAR(128) NULL,
	MsgSize                     INT NOT NULL,
	MsgSizeCharged              INT NOT NULL,
    MsgSource                   VARCHAR(255) NULL,
	MsgStoreFormatType          VARCHAR(8) NULL,
	MsgFlags                    INT NOT NULL,
	MsgFlags2                    INT NULL,
	MsgUpdateTime    	    DATETIME NOT NULL,
	MsgRetentionId              INT NULL,
	MsgRecId				INT NULL,
	MsgRecCatId			INT NULL,
	CONSTRAINT pk_ZlpMessage PRIMARY KEY (MsgId)
-- 
--,
--	CONSTRAINT fk_ZlpMsgZLPUser FOREIGN KEY (MsgZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_ZlpMsgFolder FOREIGN KEY (MsgFolderId) REFERENCES pfuser.ZLPFolder(fldrId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_ZlpMessageVa FOREIGN KEY (MsgVaultItemId) REFERENCES pfuser.VaultItem(viStId) ON DELETE CASCADE
)
GO
-- STORAGE (INITIAL 250M NEXT 250M MINEXTENTS 1 MAXEXTENTS 40 PCTINCREASE 0)


CREATE INDEX i1_ZLPMessage ON pfuser.ZLPMessage(MsgZlpUserId,MsgFolderId)
GO
-- Storage (initial 10M NEXT 10M MINEXTENTS 1 MAXEXTENTS 40 PCTINCREASE 10) PCTFREE 5


CREATE INDEX i2_ZLPMessage ON pfuser.ZLPMessage(MsgVaultItemId)
GO
-- Storage (initial 10M NEXT 10M MINEXTENTS 1 MAXEXTENTS 40 PCTINCREASE 10) PCTFREE 5

CREATE INDEX i3_ZLPMessage ON pfuser.ZLPMessage(MsgZlpUserId,MsgDateCreate,MsgRetentionId)
GO
-- Storage (initial 10M NEXT 10M MINEXTENTS 1 MAXEXTENTS 40 PCTINCREASE 10) PCTFREE 5

CREATE INDEX i4_ZLPMessage ON pfuser.ZLPMessage(MsgZlpUserId,MsgDateExpiry)
GO
-- Storage (initial 10M NEXT 10M MINEXTENTS 1 MAXEXTENTS 40 PCTINCREASE 10) PCTFREE 5

CREATE INDEX i5_ZLPMessage ON pfuser.ZLPMessage(MsgDateProcessed)
GO
-- Storage (initial 10M NEXT 10M MINEXTENTS 1 MAXEXTENTS 40 PCTINCREASE 10) PCTFREE 5

CREATE INDEX i6_ZLPMessage ON pfuser.ZLPMessage(MsgId,MsgZlpUserId)
GO
-- Storage (initial 10M NEXT 10M MINEXTENTS 1 MAXEXTENTS 40 PCTINCREASE 10) PCTFREE 5

CREATE INDEX i7_ZLPMessage ON pfuser.ZLPMessage(MsgZlpUserId,MsgRecCatId)
GO

CREATE INDEX i8_ZLPMessage ON pfuser.ZLPMessage(MsgZlpUserId,MsgUpdateTime)
GO

CREATE TABLE pfuser.ZLPMessageAttachment (
	maMsgId                       VARCHAR(64) NOT NULL,
	maVaultId                     VARCHAR(64) NOT NULL,
	maEncMsgPwd                VARBINARY(128) NULL,
	maSize                       INT  NOT NULL,
	maCreateDate				 DATETIME NULL,
	CONSTRAINT pk_msgAttach PRIMARY KEY (maMsgId,maVaultId)
--,
--	CONSTRAINT fk_msgAttach FOREIGN KEY (maMsgId) REFERENCES pfuser.ZLPMessage(MsgId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_msgAttachVa FOREIGN KEY (maVaultId) REFERENCES pfuser.VaultItem(viStId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_ZLPMsgAtt ON pfuser.ZLPMessageAttachment(maVaultId)
GO
-- Storage (initial 10M NEXT 10M MINEXTENTS 1 MAXEXTENTS 40 PCTINCREASE 10) 




CREATE TABLE pfuser.ZLPMessageSisHeader (
	sisMsgId		VARCHAR(64) NOT NULL,
	sisSeqNumber		INT NOT NULL,
	sisNext			CHAR(1) NOT NULL,
	sisVal1			NVARCHAR(255) NULL,
	sisVal2			NVARCHAR(255) NULL,
	sisVal3			NVARCHAR(255) NULL,
	sisVal4			NVARCHAR(255) NULL,
	sisVal5			NVARCHAR(255) NULL,
	sisVal6			NVARCHAR(255) NULL,
	sisVal7			NVARCHAR(255) NULL,
	sisVal8			NVARCHAR(255) NULL,
	CONSTRAINT pk_MsgSisHdr PRIMARY KEY (sisMsgId,sisSeqNumber)
--,
--	CONSTRAINT fk_MsgSisHdr FOREIGN KEY (sisMsgId) REFERENCES pfuser.ZLPMessage(MsgId) ON DELETE CASCADE
)
GO





-- OPTIONAL
CREATE SEQUENCE pfuser.Doc_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO



CREATE TABLE pfuser.Doc (
	-- IDENTITY
	docId BIGINT NOT NULL,
	docRef VARCHAR(64) NOT NULL,
        docVaultItemId VARCHAR(128) NULL,
	docName NVARCHAR(255) NOT NULL,
	docDate DATETIME NOT NULL,
	docSize INT NOT NULL, 
	docType NVARCHAR(255) NULL,
	CONSTRAINT pk_Doc PRIMARY KEY (docId)
--,
--	CONSTRAINT fk_DocVa FOREIGN KEY (docVaultItemId) REFERENCES pfuser.VaultItem(viStId) ON DELETE CASCADE
)
GO


CREATE INDEX i1_Doc ON pfuser.Doc(docRef)
GO
CREATE INDEX i2_Doc ON pfuser.Doc(docVaultItemId)
GO

CREATE SEQUENCE pfuser.StagedAttachment_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO



CREATE TABLE pfuser.StagedAttachment (
	attachId INT NOT NULL,
	attachStId NVARCHAR(128) NOT NULL,
	attachMessageRef NVARCHAR(128) NOT NULL,
	attachVaultItemId NVARCHAR(64) NULL,
	attachName NVARCHAR(255) NOT NULL,
    	attachSize INT NOT NULL, 
	attachMimeType NVARCHAR(255) NULL,
	attachMessageType INT NOT NULL,
	attachPwd VARBINARY(255) NULL,
	attachDate DATETIME NOT NULL,
	attachExpiry DATETIME NULL,
	CONSTRAINT pk_Attach PRIMARY KEY (attachId)
--,
--	CONSTRAINT fk_Attach FOREIGN KEY (attachMessageRef) REFERENCES pfuser.ZLPMessage(MsgId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_AttachVa FOREIGN KEY (attachVaultItemId) REFERENCES pfuser.VaultItem(viStId) ON DELETE CASCADE
)
GO


CREATE INDEX i1_Attach ON pfuser.StagedAttachment(attachMessageRef)
GO

CREATE INDEX i2_Attach ON pfuser.StagedAttachment(attachExpiry)
GO




CREATE SEQUENCE pfuser.ZLPReceivedMail_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.ZLPReceivedMail (
 	rmId INT NOT NULL,
	rmStId VARCHAR(128) NOT NULL,
	rmTenantId INT NOT NULL,
	rmLocation VARCHAR(128) NOT NULL,
	rmEncPwd VARBINARY(128) NULL,
    rmStoreType INT NOT NULL,
	rmMsgType INT NULL,
	rmSourceDirection	CHAR(1) NULL,
    rmSourceType INT NULL,
    rmSourceInfo VARCHAR(255) NULL,
	rmReceivedTime DATETIME NULL,
        rmFrom  NVARCHAR(255) NULL,
	rmAuthenticatedUser VARCHAR(255) NULL,
	rmNextProcessTime DATETIME NULL,
	rmStatus INT NOT NULL,
	rmStateInfo NVARCHAR(255) NULL,
	rmComments NVARCHAR(255) NULL,
	rmFlags INT NOT NULL,
	rmSize INT NULL,
	rmParentId INT NOT NULL,
	rmNumTries INT NULL,
	CONSTRAINT pk_ReceivedMail PRIMARY KEY (rmId),
	CONSTRAINT uk_ReceivedMail UNIQUE (rmStId)
)
GO
-- Storage (initial 50M NEXT 50M MINEXTENTS 1 MAXEXTENTS 40 PCTINCREASE 0) PCTFREE 5


CREATE INDEX i1_ZLPReceivedMail ON pfuser.ZLPReceivedMail(rmNextProcessTime,rmStatus)
GO


CREATE INDEX i2_ZLPReceivedMail ON pfuser.ZLPReceivedMail(rmSourceType,rmStatus)
GO

CREATE INDEX i3_ZLPReceivedMail ON pfuser.ZLPReceivedMail(rmReceivedTime)
GO



-- OPTIONAL
CREATE SEQUENCE pfuser.ZLPRecipientInfo_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO



CREATE TABLE pfuser.ZLPRecipientInfo (
	-- IDENTITY
	riId BIGINT NOT NULL,
	riParentId INT NULL,
        riUid BIGINT NULL,
	riRmId INT NOT NULL,
	riRecipient VARCHAR(255) NOT NULL,
	riMsgType INT NOT NULL,
	riFolderId INT NOT NULL,
        riStateInfo VARBINARY(255) NULL,
	riLastProcessedTime DATETIME NULL,
	riNumTries INT NOT NULL,
        riStatus INT NULL,
        riAction INT NULL,
	riFlags INT NOT NULL,
        riComment NVARCHAR(255) NULL,
	CONSTRAINT pk_RI PRIMARY KEY (riId)
--,
--	CONSTRAINT fk_RIRm FOREIGN KEY (riRmId) REFERENCES pfuser.ZLPReceivedMail(rmId) ON DELETE CASCADE
)
GO
-- Storage (initial 50M NEXT 50M MINEXTENTS 1 MAXEXTENTS 40 PCTINCREASE 0) PCTFREE 15


CREATE INDEX i1_RI ON pfuser.ZLPRecipientInfo(riRmId)
GO

CREATE INDEX i2_RI ON pfuser.ZLPRecipientInfo(riRmId,riRecipient)
GO


CREATE TABLE pfuser.ReceivedFileStore (
	rfsName	NVARCHAR(128) NOT NULL,
	rfsDisplayName NVARCHAR(128) NOT NULL,
	rfsPath	NVARCHAR(255) NOT NULL,
	rfsLocalPath NVARCHAR(255) NULL,
	rfsDefault CHAR(1) NOT NULL,
	rfsActive  CHAR(1) NOT NULL,
	rfsCreateUser	NVARCHAR(255) NULL,
	rfsCreateDate DATETIME NOT NULL,
	rfsLastUpdate DATETIME NOT NULL,
	rfsLocalMachineName NVARCHAR(255) NULL,
	rfsCluster   NVARCHAR(255) NULL,
	rfsUseDone CHAR(1) NOT NULL,
	rfsStatsMachine	NVARCHAR(255) NULL,
	rfsStatsDate	DATETIME NULL,
	rfsQueueCount	INT NULL,
	rfsProcessCount	INT NULL,
	rfsDoneCount	INT NULL,
	rfsDeadCount	INT NULL,
	rfsStateVal1	NVARCHAR(255) NULL,
	rfsStateVal2	NVARCHAR(255) NULL,
	rfsStateVal3	NVARCHAR(255) NULL,
	rfsStateVal4	NVARCHAR(255) NULL,
	rfsStateVal5	NVARCHAR(255) NULL,
	CONSTRAINT pk_RFS PRIMARY KEY (rfsName)
)
GO
	


CREATE SEQUENCE pfuser.RfsKey_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO

CREATE TABLE pfuser.RfsKey (
	keyId	BIGINT NOT NULL,
	keyDate	DATETIME NOT NULL,
	keyPeriod VARCHAR(255) NOT NULL,
	keyPeriodSeqId INT NOT NULL,
	keyEnc 		VARBINARY(128) NULL,
	keyProps	NVARCHAR(255) NULL,
	CONSTRAINT pk_RfsKey PRIMARY KEY (keyId),
	CONSTRAINT uk_RfsKey UNIQUE (keyPeriod,keyPeriodSeqId)
)
GO


CREATE TABLE pfuser.Message (
        valid INT 
)
GO

INSERT INTO pfuser.Message (valid) VALUES (1)


-- OPTIONAL
CREATE SEQUENCE pfuser.MTATranscript_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.MTATranscript (
	-- IDENTITY
	mtatId BIGINT NOT NULL,
   	mtatType INT NOT NULL,
	mtatDate DATETIME NOT NULL,
	mtatRmId VARCHAR(128) NOT NULL,
	mtatQueue NVARCHAR(128) NULL,
	mtatMsgIdPrev VARCHAR(255) NULL,
	mtatJournalMsgId VARCHAR(255) NULL,
	mtatJournalDate DATETIME NULL,
	mtatFrom NVARCHAR(255) NULL,
	mtatTo NVARCHAR(255) NULL,
	mtatSubject NVARCHAR(255) NULL,
	mtatSourceIp VARCHAR(255) NULL,
	mtatSource  VARCHAR(255) NULL,
	mtatSourceMisc NVARCHAR(255) NULL,
	mtatMachine NVARCHAR(64) NULL,
	mtatTenantId INT NOT NULL,
	mtatSourceType INT NULL,	
	mtatSize INT NULL,
	mtatComment NVARCHAR(255) NULL,
	mtatRelayDate DATETIME NULL,
	mtatRelayIP NVARCHAR(255) NULL,
        mtatRelayRetryCount INT NOT NULL,
        mtatRelayDone 	CHAR(1)  NOT NULL,
	mtatRelayMsg	NVARCHAR(255) NULL,
        mtatRelayTime	INT NULL,
        mtatAttempt INT NOT NULL,
        mtatAttemptMachine NVARCHAR(64) NULL,
        mtatAttemptDate	DATETIME NULL,
	CONSTRAINT pk_MTATranscript PRIMARY KEY (mtatId),
--	CONSTRAINT fk_MTATranscript FOREIGN KEY (mtatRmId) REFERENCES pfuser.ZLPReceivedMail(rmStId) ON DELETE CASCADE
	CONSTRAINT uk_MTATranscript UNIQUE (mtatRmId)
)
GO
-- Storage (initial 50M NEXT 50M MINEXTENTS 1 MAXEXTENTS 40 PCTINCREASE 0) PCTFREE 5


CREATE INDEX i4_MTATranscript ON pfuser.MTATranscript(mtatDate)
GO


-- OPTIONAL
CREATE SEQUENCE pfuser.MTAExecutionTranscript_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.MTAExecutionTranscript (
	-- IDENTITY
	mexId BIGINT NOT NULL,
	mexDate DATETIME NOT NULL,
	mexRmId INT NOT NULL,
	mexRiRmId INT NOT NULL,
	mexMachine NVARCHAR(64) NULL,
	mexStatus INT NOT NULL,
	mexAction INT NOT NULL,
	mexComment NVARCHAR(255) NULL,
	CONSTRAINT pk_MTAExecTrans PRIMARY KEY (mexId)
)
GO
-- Storage (initial 10M NEXT 10M MINEXTENTS 1 MAXEXTENTS 40 PCTINCREASE 10) PCTFREE 5

CREATE INDEX i1_MTAExecTrans ON pfuser.MTAExecutionTranscript(mexRmId)
GO
	
CREATE INDEX i2_MTAExecTrans ON pfuser.MTAExecutionTranscript(mexDate)
GO





CREATE TABLE pfuser.ZLPClientAccess (
	zcaKeyId            NVARCHAR(128) NOT NULL,
	zcaZlpUserId        INT NOT NULL,
	zcaClientId         NVARCHAR(255) NOT NULL,
	zcaKeyType	        INT NOT NULL,
	zcaKey1             VARBINARY(255) NULL,
	zcaKey2     	    VARBINARY(255) NULL,
	zcaKey3     	    VARBINARY(255) NULL,
	zcaKey4     	    VARBINARY(255) NULL,
	zcaExpiryDate       DATETIME NULL,
	zcaCreateDate       DATETIME NOT NULL,
	zcaDateLastAccess   DATETIME NULL,
	CONSTRAINT pk_ZLPClientAccess PRIMARY KEY (zcaKeyId)
--,
--	CONSTRAINT fk_ZLPClientAccess FOREIGN KEY (zcaZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_ZLPClientAccess ON pfuser.ZLPClientAccess(zcaZlpUserId) 
GO

CREATE INDEX i2_ZLPClientAccess ON pfuser.ZLPClientAccess(zcaClientId) 
GO

CREATE SEQUENCE pfuser.ZLPClientMsg_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.ZLPClientMessage (
	cmsgUid		     INT NOT NULL,
	cmsgId                      VARCHAR(64) NOT NULL,
	cmsgSenderZlpUserId            INT NOT NULL,
	cmsgSenderKeyId            NVARCHAR(128) NOT NULL,
	cmsgType                   INT NOT NULL,
	cmsgLanguage             NVARCHAR(10) NULL,
	cmsgFrom                   NVARCHAR(255) NULL,
	cmsgSubject                NVARCHAR(255) NULL,
	cmsgDateCreate            DATETIME NOT NULL,
	cmsgSize                     INT NOT NULL,
	cmsgMailFlags                    INT NOT NULL,
	cmsgControlFlags 		INT NOT NULL,
	cmsgDateAccessStart         DATETIME NULL,	
	cmsgDateAccessEnd	         DATETIME NULL,	
	cmsgDeleted                CHAR(1) NOT NULL,
	CONSTRAINT pk_CMsg PRIMARY KEY (cmsgUid),
--	CONSTRAINT fk_CMsgZLPUser FOREIGN KEY (cmsgSenderZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
	CONSTRAINT uk_CMsg UNIQUE (cmsgId)
)
GO

CREATE INDEX i1_CMsg ON pfuser.ZLPClientMessage(cmsgSenderZlpUserId) 
GO


CREATE SEQUENCE pfuser.ZLPClientMsgRecipient_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO

CREATE TABLE pfuser.ZLPClientMessageRecipient (
	cmrId 		INT NOT NULL,
	cmrCmsgUid 	INT NOT NULL,
	cmrRecipientZLPUserid       INT NOT NULL,
	cmrRecipient                NVARCHAR(255) NULL,
	cmrRead                  CHAR(1) NOT NULL,
	cmrRevoked                CHAR(1) NOT NULL,
	cmrControlFlags 		INT NOT NULL,
	cmrDateAccessStart       DATETIME NULL,	
	cmrDateAccessEnd         DATETIME NULL,	
	CONSTRAINT pk_Cmr PRIMARY KEY (cmrId)
--,
--	CONSTRAINT fk_CmrZLPUser FOREIGN KEY (cmrRecipientZLPUserid) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_CmrCmsgUid FOREIGN KEY (cmrCmsgUid) REFERENCES pfuser.ZLPClientMessage(cmsgUid) ON DELETE CASCADE
)
GO



CREATE TABLE pfuser.ZLPClientMessageTrail (
	cmtCmsgUid          NVARCHAR(64) NOT NULL,
	cmtCmrId      	INT NOT NULL,
	cmtUser             VARCHAR(64) NOT NULL,
	cmtAction           INT NOT NULL,
	cmtDate          	DATETIME NOT NULL,
	cmtSourceIP       	VARCHAR(128) NULL,
	cmtAccessType  VARCHAR(128) NULL,
	cmtComments      NVARCHAR(255) NULL
--,
--	CONSTRAINT fk_cmtCmsgUid FOREIGN KEY (cmtCmsgUid) REFERENCES pfuser.ZLPClientMessage(cmsgUid) ON DELETE CASCADE,
--	CONSTRAINT fk_cmtCmr FOREIGN KEY (cmtCmrId) REFERENCES pfuser.ZLPClientMessageRecipient(cmrId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_Cmt ON pfuser.ZLPClientMessageTrail(cmtCmsgUid) 
GO
CREATE INDEX i2_Cmt ON pfuser.ZLPClientMessageTrail(cmtDate) 
GO


CREATE SEQUENCE pfuser.ZLPRecipientMailPolicy_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO

CREATE TABLE pfuser.ZLPRecipientMailPolicy (
	zmpId 		        INT NOT NULL,
	zmpEntityType 	    INT NOT NULL,
	zmpEntityId         INT NOT NULL,
	zmpLevel            INT NOT NULL,
	zmpVal1             NVARCHAR(255) NULL,
	zmpVal2             NVARCHAR(255) NULL,
	zmpVal3             NVARCHAR(255) NULL,
	zmpVal4             NVARCHAR(255) NULL,
	CONSTRAINT pk_ZLPRcptPolicy PRIMARY KEY (zmpId),
	CONSTRAINT uk_ZLPRcptPolicy UNIQUE (zmpEntityType,zmpEntityId,zmpLevel)
)
GO





CREATE TABLE pfuser.ZLPMessageSIS (
	msisVaultId	VARCHAR(128) NOT NULL,
	msisFlags	INT NOT NULL,
	msisDate	DATETIME NOT NULL,
 	msisBasicHdr	VARCHAR(64) NOT NULL,
 	msisMsgIdHdr	VARCHAR(64) NULL,
 	msisEnvelopeHdr	VARCHAR(64) NULL,
	msisBody 	VARCHAR(64) NULL,
	msisAttach1	VARCHAR(64) NULL,
	msisAttach2	VARCHAR(64) NULL,
	msisAttachRest 	VARCHAR(64) NULL,
	msisOther	VARCHAR(64) NULL,
	msisPrefix	VARCHAR(128) NULL,
	CONSTRAINT pk_Msis PRIMARY KEY (msisVaultId)
--,
--	CONSTRAINT fk_MsisVa FOREIGN KEY (msisVaultId) REFERENCES pfuser.VaultItem(viStId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_Msis ON pfuser.ZLPMessageSIS(msisDate)
GO
CREATE INDEX i2_Msis ON pfuser.ZLPMessageSIS(msisBasicHdr,msisBody,msisAttach1)
GO


CREATE TABLE pfuser.MTAStats (
	mtasTenantId	INT NOT NULL,
	mtasPeriodInfo VARCHAR(255) NOT NULL,
	mtasPeriodStartDate DATETIME NOT NULL,
	mtasMsgType VARCHAR(255) NOT NULL,
	mtasJournal CHAR(1) NOT NULL,
	mtasChangeNumber INT NOT NULL,
	mtasRawDataDeleted CHAR(1) NOT NULL,
	mtasCount   INT NOT NULL,
	mtasSize  BIGINT NOT NULL,
	mtasJournaledCount INT NOT NULL,
	mtasJournalNotReqCount INT NOT NULL,
	mtasAvgTimeToJournal REAL NOT NULL,
	mtasStats VARCHAR(255) NULL,
	mtasCreateDate 	DATETIME NOT NULL,
	mtasUpdate	DATETIME NOT NULL,
	mtasInplaceCount INT NOT NULL,
	CONSTRAINT pk2_MtaStats PRIMARY KEY (mtasTenantId,mtasPeriodInfo,mtasMsgType)
)
GO
-- Storage (initial 50M NEXT 50M MINEXTENTS 1 MAXEXTENTS 40 PCTINCREASE 0) PCTFREE 5

CREATE INDEX i2_MtaStats ON pfuser.MTAStats(mtasTenantId,mtasPeriodStartDate)
GO

CREATE TABLE pfuser.ZLPMessageStats (
	msgStatZlpUserId INT NOT NULL,
	msgStatDomainId INT NOT NULL,
	msgStatPeriodInfo VARCHAR(255) NOT NULL,
	msgStatPeriodStartDate DATETIME NOT NULL,
	msgStatChangeNumber INT NOT NULL,
	msgStatAddCount   INT NOT NULL,
	msgStatAddSize  BIGINT NOT NULL,
	msgStatAddSizeCharged  BIGINT NOT NULL,
	msgStatDelCount   INT NOT NULL,
	msgStatDelSize  BIGINT NOT NULL,
	msgStatDelSizeCharged  BIGINT NOT NULL,
	msgStatCreateDate 	DATETIME NOT NULL,
	msgStatUpdate	DATETIME NOT NULL,
	CONSTRAINT pk_MsgStats PRIMARY KEY (msgStatZlpUserId,msgStatPeriodInfo)
--,
--	CONSTRAINT fk_MsgStatsDomain FOREIGN KEY (msgStatDomainId) REFERENCES pfuser.ZLPDomainInfo(zdDomainId) ON DELETE CASCADE,
--	CONSTRAINT fk_MsgStatsZLPUser FOREIGN KEY (msgStatZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_MsgStats ON pfuser.ZLPMessageStats (msgStatPeriodStartDate)
GO
CREATE INDEX i2_MsgStats ON pfuser.ZLPMessageStats (msgStatDomainId,msgStatPeriodStartDate)
GO



CREATE TABLE pfuser.MTASIS (
	mtaSisId	VARCHAR(128) NOT NULL,
	mtaSisType	INT NOT NULL,
	mtaSisDate	DATETIME NOT NULL,
 	mtaSisContent	VARCHAR(64) NOT NULL,
 	mtaSisEnvelope	VARCHAR(64) NULL,
	CONSTRAINT pk_MtaSis PRIMARY KEY (mtaSisId)
--
)
GO

CREATE INDEX i1_MtaSis ON pfuser.MTASIS (mtaSisContent,mtaSisEnvelope)
GO
CREATE INDEX i2_MtaSis ON pfuser.MTASIS (mtaSisDate)
GO


CREATE TABLE pfuser.SharedMailboxPrivileges (
	smpTenantId INT NOT NULL,
	smpOwnerZlpUserId INT NOT NULL,
	smpEntityType INT NOT NULL,
	smpEntityId INT NOT NULL,
    smpPrivilegeFlags INT NOT NULL,
	CONSTRAINT uk_SMP UNIQUE (smpOwnerZlpUserId,smpEntityType,smpEntityId)
)
GO
CREATE INDEX i1_SMP  ON pfuser.SharedMailboxPrivileges(smpEntityType,smpEntityId)
GO

-- OPTIONAL
CREATE SEQUENCE pfuser.ZlpDomain_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO

CREATE TABLE pfuser.ZLPDomain (
	-- IDENTITY
	domId			    BIGINT NOT NULL,
	domName		    	NVARCHAR(255) NOT NULL,
	domDisplayName      NVARCHAR(255) NULL,
	CONSTRAINT pk_ZlpDom PRIMARY KEY (domId),
	CONSTRAINT uk_ZlpDom UNIQUE (domName)
)
GO

-- OPTIONAL
CREATE SEQUENCE pfuser.ZlpAddress_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO

CREATE TABLE pfuser.ZLPAddress (
	-- IDENTITY
	addrId			    BIGINT NOT NULL,
	addrAddress		    NVARCHAR(255) NOT NULL,
	addrName                    NVARCHAR(255) NULL,
	CONSTRAINT pk_ZlpAddr PRIMARY KEY (addrId),
	CONSTRAINT uk_ZlpAddr UNIQUE (addrAddress)
)
GO


CREATE TABLE pfuser.ZLPAuditTrail (
	zlpaAction	INT NOT NULL,
	zlpaDate		DATETIME NOT NULL,	
	zlpaMsgId	VARCHAR(255) NULL,
	zlpaFolderId	INT NOT NULL,
	zlpaMsgZlpUserId	INT NOT NULL,
	zlpaMsgDomainId	INT NOT NULL,
	zlpaMsgType INT NOT NULL,
	zlpaZlpUserId	INT NOT NULL,
	zlpaUser		NVARCHAR(255) NOT NULL,	
	zlpaDomainId	INT NOT NULL,
	zlpaTenantId INT NOT NULL,	
	zlpaTxnId		VARCHAR(64) NOT NULL,
	zlpaClearanceLevel	INT NOT NULL,
	zlpaSourceIP 	VARCHAR(64) NULL,
	zlpaDestIP   	VARCHAR(64) NULL,
	zlpaAccessType 	VARCHAR(128) NULL,
	zlpaZViteStId 	VARCHAR(255) NULL,
	zlpaComments	NVARCHAR(255) NULL,
	zlpaVal1 	NVARCHAR(255) NULL,
	zlpaVal2 	NVARCHAR(255) NULL,
	zlpaVal3 	NVARCHAR(255) NULL,
	zlpaVal4 	NVARCHAR(255) NULL,
	zlpaVal5 	NVARCHAR(255) NULL
--,
--	CONSTRAINT fk_TracAudProj FOREIGN KEY (taProjectId) REFERENCES pfuser.TrackerProject(tracProjId) ON DELETE CASCADE,
--	CONSTRAINT fk_TracAudFldr FOREIGN KEY (taFolderId) REFERENCES pfuser.TrackerFolder(tracFldrId) ON DELETE CASCADE,
--	CONSTRAINT fk_TracAudItem FOREIGN KEY (taItemId) REFERENCES pfuser.TrackerItem(tracItemId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_TracAudDomain FOREIGN KEY (taDomainId) REFERENCES pfuser.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_TracAudZLPUser FOREIGN KEY (taZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO


CREATE INDEX i1_ZLPAudTrail ON pfuser.ZLPAuditTrail(zlpaDate)
GO
CREATE INDEX i2_ZLPAudTrail ON pfuser.ZLPAuditTrail(zlpaDomainId)
GO
CREATE INDEX i3_ZLPAudTrail ON pfuser.ZLPAuditTrail(zlpaZlpUserId)
GO
CREATE INDEX i4_ZLPAudTrail ON pfuser.ZLPAuditTrail(zlpaMsgId)
GO

CREATE TABLE pfuser.TriggerAddress (
	trigTenantId	INT NOT NULL,
	trigAddress		    VARCHAR(255) NOT NULL,
	trigType 		    VARCHAR(255) NOT NULL,
	trigVal1 	NVARCHAR(255) NULL,
	trigVal2 	NVARCHAR(255) NULL,
	CONSTRAINT pk_trigAddr PRIMARY KEY (trigAddress)
)
GO

CREATE TABLE pfuser.MTARecon (
	mtarRmId VARCHAR(128) NOT NULL,
	mtarTenantId INT NOT NULL,
   	mtarType INT NOT NULL,
	mtarDate DATETIME NOT NULL,
	mtarSentDate DATETIME NOT NULL,
	mtarRmDate DATETIME NOT NULL,
	mtarSize	BIGINT NOT NULL,
	mtarSig	 VARCHAR(255) NOT NULL,
	mtarVal1 	NVARCHAR(255) NULL,
	mtarVal2 	NVARCHAR(255) NULL,
	mtarVal3 	NVARCHAR(255) NULL,
	mtarVal4 	NVARCHAR(255) NULL,
	mtarVal5 	NVARCHAR(255) NULL,
	mtarVal6 	NVARCHAR(255) NULL,
	mtarVal7 	NVARCHAR(255) NULL,
	mtarVal8 	NVARCHAR(255) NULL,
	mtarVal9 	NVARCHAR(255) NULL,
	mtarVal10 	NVARCHAR(255) NULL,
	mtarVal11 	NVARCHAR(255) NULL,
	mtarVal12 	NVARCHAR(255) NULL,
	mtarVal13 	NVARCHAR(255) NULL,
	mtarVal14 	NVARCHAR(255) NULL,
	mtarVal15 	NVARCHAR(255) NULL,
	mtarVal16 	NVARCHAR(255) NULL,
	mtarVal17 	NVARCHAR(255) NULL,
	mtarVal18 	NVARCHAR(255) NULL,
	mtarVal19 	NVARCHAR(255) NULL,
	CONSTRAINT pk_MTARecon PRIMARY KEY (mtarRmId)
)
GO
-- Storage (initial 50M NEXT 50M MINEXTENTS 1 MAXEXTENTS 40 PCTINCREASE 0) PCTFREE 5
CREATE INDEX i2_MTARecon ON pfuser.MTARecon(mtarTenantId,mtarDate)
GO

-- Table: InPlaceMailItem
CREATE SEQUENCE pfuser.InPlaceMailItem_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.InPlaceMailItem (
	ipmItemUid			            BIGINT NOT NULL,
	ipmItemZlpUserId		        INT NOT NULL,
	ipmItemId                       VARCHAR(64) NOT NULL,
	ipmItemFolderId                 INT NOT NULL,
	ipmItemDeleted          	    CHAR(1) NOT NULL,
	ipmItemSenderAuthenticated      CHAR(1) NOT NULL,
	ipmItemEncMsgPwd                VARBINARY(128) NULL,
	ipmItemType                     INT NOT NULL,
	ipmItemLanguage                 VARCHAR(10) NULL,
	ipmItemFrom                     NVARCHAR(255) NULL,
	ipmItemRecipient         	    NVARCHAR(255) NULL,
	ipmItemCc                       NVARCHAR(255) NULL,
    ipmItemBcc         	            NVARCHAR(255) NULL,
	ipmItemSubject                  NVARCHAR(255) NULL,
	ipmItemCategory		            NVARCHAR(255) NULL,
	ipmItemDateProcessed            DATETIME NOT NULL,
	ipmItemDateCreate               DATETIME NOT NULL,
	ipmItemDateSent		            DATETIME NOT NULL,
    ipmItemDateExpiry		        DATETIME NULL,
	ipmItemVaultItemId              VARCHAR(128) NOT NULL,
	ipmItemRmId                     VARCHAR(128) NULL,
	ipmItemSize                     INT NOT NULL,
    ipmItemSourceId                 VARCHAR(255) NULL,
	ipmItemFlags                    INT NOT NULL,
	ipmItemFlags2                   INT NOT NULL,
	ipmItemUpdateTime    	        DATETIME NOT NULL,
	ipmItemRetentionId              INT NULL,
	CONSTRAINT pk_InPlaceMailItem PRIMARY KEY (ipmItemId)
)
GO

CREATE INDEX i1_InPlaceMailItem ON pfuser.InPlaceMailItem(ipmItemZlpUserId,ipmItemFolderId)
GO

CREATE INDEX i2_InPlaceMailItem ON pfuser.InPlaceMailItem(ipmItemVaultItemId)
GO

CREATE INDEX i3_InPlaceMailItem ON pfuser.InPlaceMailItem(ipmItemZlpUserId,ipmItemDateCreate,ipmItemRetentionId)
GO

CREATE INDEX i4_InPlaceMailItem ON pfuser.InPlaceMailItem(ipmItemDateProcessed)
GO

CREATE INDEX i5_InPlaceMailItem ON pfuser.InPlaceMailItem(ipmItemId,ipmItemZlpUserId)
GO
-- *************************************************************************************
-- FileName :ArchiveOra.sql
-- Features :
--
--
-- *************************************************************************************
-- *************************************************************************************



-- OPTIONAL
CREATE SEQUENCE pfuser.ArchiveServer_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.ArchiveServer (
	-- IDENTITY
	asId				BIGINT NOT NULL,
	asServerName		NVARCHAR(255) NOT NULL,
	asServerDisplayName	NVARCHAR(255) NOT NULL,
	asDomainId		INT NOT NULL,
	asJournalDomainId INT NOT NULL,
	asJournalPrimaryZLPUserId INT NOT NULL,
	asTenantId INT NOT NULL,
	asClassifierName	NVARCHAR(128) NULL,
	asTracProjId		INT NULL,
	asReviewEscalation VARCHAR(255) NULL,
	asCreateDate		DATETIME NOT NULL,
	asLastUpdate		DATETIME NOT NULL,
	asFlags			INT NOT NULL,		
	asExtRef			NVARCHAR(255) NULL,
	asTags			NVARCHAR(255) NULL,			
	asMisc1			NVARCHAR(255) NULL,
	asMisc2			NVARCHAR(255) NULL,
	CONSTRAINT pk_ArServer PRIMARY KEY (asId),
--	CONSTRAINT fk_ArServerDomain FOREIGN KEY (asDomainId) REFERENCES pfuser.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_ArServerJDomain FOREIGN KEY (asJournalDomainId) REFERENCES pfuser.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_ArServerZLPUser FOREIGN KEY (asJournalPrimaryZLPUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
	CONSTRAINT uk_ArServerName UNIQUE (asTenantId,asServerName),
	CONSTRAINT uk_ArServerDomain UNIQUE (asDomainId),
	CONSTRAINT uk_ArServerJDomain UNIQUE (asJournalDomainId)
)
GO



-- OPTIONAL
CREATE SEQUENCE pfuser.ArchiveMailServer_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.ArchiveMailServer (
	-- IDENTITY
	amsId				BIGINT NOT NULL,
	amsServerName		NVARCHAR(255) NOT NULL,
	amsTenantId INT NOT NULL,
	amsServerGroup	NVARCHAR(255) NOT NULL,
	amsServerType	VARCHAR(64) NOT NULL,
	amsServerSubType	VARCHAR(64) NULL,
	amsServerURL		NVARCHAR(255) NULL,
	amsDiscoveryName 	NVARCHAR(64) NULL,
	amsCreateDate		DATETIME NOT NULL,
	amsVal1		NVARCHAR(255) NULL,
	amsVal2		NVARCHAR(255) NULL,
	amsVal3			NVARCHAR(255) NULL,
	CONSTRAINT pk_Ams PRIMARY KEY (amsId),
	CONSTRAINT uk_Ams UNIQUE (amsTenantId,amsServerName)
)
GO


CREATE TABLE pfuser.PublicFolderRoot (
	pfrMailServerId				INT NOT NULL,
	pfrRoot		NVARCHAR(1024) NOT NULL
--,
--	CONSTRAINT pk_pfr PRIMARY KEY (pfrMailServerId,pfrRoot)
--,
--	CONSTRAINT fk_pfr FOREIGN KEY (pfrMailServerId) REFERENCES pfuser.ArchiveMailServer(amsId) ON DELETE CASCADE
)
GO



CREATE TABLE pfuser.ArchiveUserInfo (
	auiZlpUserId		INT NOT NULL,
	auiType			INT NOT NULL,
	auiAsId			INT NOT NULL,
	auiTenantId 	INT NOT NULL,
   	auiAmsId		INT NULL,
	auiOwner		NVARCHAR(255) NOT NULL,
    auiExtRef	NVARCHAR(255) NULL,
    auiTags		NVARCHAR(255) NULL,
    auiRetTags NVARCHAR(255) NULL,
    auiAltReviewAsIds VARCHAR(255) NULL,
	auiAddress 	NVARCHAR(255) NOT NULL,
	auiSyncExclude		CHAR(1) NOT NULL,
	auiArchive		CHAR(1) NOT NULL,
	auiJournal		CHAR(1) NOT NULL,
	auiFullName		NVARCHAR(255) NOT NULL,
	auiMailStoreInfo	NVARCHAR(1024) NULL,
	auiQuotaKB		INT NOT NULL,
	auiUsedKB		INT NOT NULL,
	auiCreateDate		DATETIME NOT NULL,
	auiLastUpdate		DATETIME NOT NULL,
	auiConnectUserId	NVARCHAR(255) NULL,
	auiConnectPwdEnc VARBINARY(255) NULL,
	auiFlags		INT NOT NULL,
	auiHireDate   DATETIME NOT NULL,
	auiTerminated CHAR(1) NOT NULL,
	auiTerminateDate DATETIME NULL,
	auiReviewAsId		INT NULL,
	auiIter	INT  NOT NULL,
	auiIterStartDate	DATETIME NULL,
    auiIterLastUpdate	DATETIME NULL,
	auiIterEndDate	DATETIME NULL,
	auiArchiveBeginDate	DATETIME NULL,
	auiFullScanStartDate	DATETIME NULL,
	auiFullScanEndDate	DATETIME NULL,
	auiMisc1		NVARCHAR(255) NULL,
	auiMisc2		NVARCHAR(255) NULL,
	auiRunVal1		NVARCHAR(255) NULL,
	auiRunVal2		NVARCHAR(255) NULL,
	CONSTRAINT pk_Aui PRIMARY KEY (auiZlpUserId),
--	CONSTRAINT fk_AuiAs FOREIGN KEY (auiAsId) REFERENCES pfuser.ArchiveServer(asId) ON DELETE CASCADE,
--	CONSTRAINT fk_AuiAms FOREIGN KEY (auiAmsId) REFERENCES pfuser.ArchiveMailServer(amsId) ON DELETE SET NULL,
--	CONSTRAINT fk_AuiZLPUser FOREIGN KEY (auiZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
	CONSTRAINT uk2_Aui UNIQUE (auiTenantId,auiOwner),
 	-- CONSTRAINT ukExtRef_Aui UNIQUE (auiExtRef),
 	CONSTRAINT ukAddr2_Aui UNIQUE (auiTenantId,auiAddress)
)
GO
CREATE INDEX i1_Aui ON pfuser.ArchiveUserInfo(auiAsId)
GO
	CREATE INDEX i2_Aui ON pfuser.ArchiveUserInfo(auiAmsId)
GO
	CREATE INDEX i3_Aui ON pfuser.ArchiveUserInfo(auiFullName)
GO
	CREATE INDEX i4_Aui ON pfuser.ArchiveUserInfo(auiMailStoreInfo)
GO
			CREATE INDEX i5_Aui ON pfuser.ArchiveUserInfo(auiExtRef)
GO
CREATE INDEX i6_Aui ON pfuser.ArchiveUserInfo(auiCreateDate)
GO

	
CREATE TABLE pfuser.ArchiveUserAlias (	
	auaAlias NVARCHAR(255) NOT NULL,
	auaZlpUserId	INT NOT NULL,
	auaAsId			INT NOT NULL,
	auaTenantId INT NOT NULL,
	auaType	INT NOT NULL,
	auaDate 	DATETIME NOT NULL,
	CONSTRAINT pk2_aua PRIMARY KEY (auaTenantId,auaAlias)
--,
--	CONSTRAINT fk_auaAs FOREIGN KEY (auaAsId) REFERENCES pfuser.ArchiveServer(asId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_auaZLPUser FOREIGN KEY (auaZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO
CREATE INDEX i1_Aua ON pfuser.ArchiveUserAlias(auaZlpUserId)
GO
	


-- OPTIONAL
CREATE SEQUENCE pfuser.ArchiveUserHistory_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.ArchiveUserHistory (
	-- IDENTITY
	auhId			BIGINT NOT NULL,
	auhZlpUserId		INT NOT NULL,
	auhUserType		INT NOT NULL,
	auhAsId			INT NOT NULL,
	auhTenantId		INT NOT NULL,
       	auhAmsId		INT NULL,
	auhOwner		NVARCHAR(255) NOT NULL,
	auhExtRef		NVARCHAR(255) NULL,
	auhTags		NVARCHAR(255) NULL,
    auhRetTags NVARCHAR(255) NULL,
    auhAltReviewAsIds VARCHAR(255) NULL,
	auhAddress 		NVARCHAR(255) NOT NULL,
	auhArchive		CHAR(1) NOT NULL,
	auhJournal		CHAR(1) NOT NULL,
	auhFlags			INT NOT NULL,
	-- NOT NULL
	auhFullName		NVARCHAR(255),
	auhDate			DATETIME NOT NULL,
	auhHireDate   		DATETIME NOT NULL,
	auhTerminated 		CHAR(1) NOT NULL,
	auhTerminateDate 		DATETIME NULL,
	auhReviewAsId		INT NULL,
	auhChangeType 		INT NOT NULL,
	auhModifyingZlpUserId	INT NOT NULL,
	auhMisc1		NVARCHAR(255) NULL,
	auhMisc2		NVARCHAR(255) NULL,
	CONSTRAINT pk_Auh PRIMARY KEY (auhId)
--,
--	CONSTRAINT fk_AuhAs FOREIGN KEY (auhAsId) REFERENCES pfuser.ArchiveServer(asId) ON DELETE CASCADE,
--	CONSTRAINT fk_AuhAms FOREIGN KEY (auhAmsId) REFERENCES pfuser.ArchiveMailServer(amsId) ON DELETE SET NULL
--,
--	CONSTRAINT fk_AuhZLPUser FOREIGN KEY (auhZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_AuhModZLPUser FOREIGN KEY (auhModifyingZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO
CREATE INDEX i1_Auh ON pfuser.ArchiveUserHistory(auhZlpUserId)
GO
	CREATE INDEX i2_Auh ON pfuser.ArchiveUserHistory(auhDate)
GO
		

-- OPTIONAL
CREATE SEQUENCE pfuser.ArchiveUserAliasHistory_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO
	
CREATE TABLE pfuser.ArchiveUserAliasHistory (	
	-- IDENTITY	
	auahId		BIGINT NOT NULL,
	auahZlpUserId	INT NOT NULL,
	auahAlias 	NVARCHAR(255) NOT NULL,
	auahAsId		INT NOT NULL,
	auahTenantId INT NOT NULL,
	auahType	INT NOT NULL,
	auahDate 	DATETIME NOT NULL,
	auahChangeType  INT NOT NULL,
	auahModifyingZlpUserId	INT NOT NULL,
	CONSTRAINT pk_Auah PRIMARY KEY (auahId)
--,
--	CONSTRAINT fk_AuahAs FOREIGN KEY (auahAsId) REFERENCES pfuser.ArchiveServer(asId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_AuahZLPUser FOREIGN KEY (auahZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_AuahModZLPUser FOREIGN KEY (auahModifyingZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO
CREATE INDEX i1_Auah ON pfuser.ArchiveUserAliasHistory(auahZlpUserId)
GO
	CREATE INDEX i2_Auah ON pfuser.ArchiveUserAliasHistory(auahAlias)
GO
	CREATE INDEX i3_Auah ON pfuser.ArchiveUserAliasHistory(auahDate)
GO
	



CREATE TABLE pfuser.ArchiveAuditTrail (
	aatAction 	INT NOT NULL,
	aatDate 	DATETIME NOT NULL,
    aatMsgId	VARCHAR(64) NULL,	
	aatZlpUserId	INT NOT NULL,
	aatOwnerZlpUserId	INT NULL,
	aatUser 	NVARCHAR(255) NOT NULL,
	aatDomainId	INT NOT NULL,
	aatTenantId INT NOT NULL,
	aatTxnId		VARCHAR(64) NOT NULL,
	aatClearanceLevel	INT NOT NULL,
	aatSourceIP 	VARCHAR(64) NULL,
	aatDestIP 	VARCHAR(64) NULL,
	aatAccessType	VARCHAR(32) NULL,
	aatComments 	NVARCHAR(255) NULL,
	aatVal1 		NVARCHAR(255) NULL,
	aatVal2 		NVARCHAR(255) NULL,
	aatVal3 		NVARCHAR(255) NULL,
	aatVal4 		NVARCHAR(255) NULL,
	aatVal5 		NVARCHAR(255) NULL
--,
--	CONSTRAINT fk_aatDomain FOREIGN KEY (aatDomainId) REFERENCES pfuser.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_aatMsg FOREIGN KEY (aatMsgId) REFERENCES pfuser.ZLPMessage(MsgId) ON DELETE CASCADE,
--	CONSTRAINT fk_aatZLPUser FOREIGN KEY (aatZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_AAT ON pfuser.ArchiveAuditTrail(aatDate)
GO
CREATE INDEX i2_AAT ON pfuser.ArchiveAuditTrail(aatUser,aatDate)
GO
CREATE INDEX i3_AAT ON pfuser.ArchiveAuditTrail(aatDomainId)
GO
CREATE INDEX i4_AAT ON pfuser.ArchiveAuditTrail(aatZlpUserId)
GO
CREATE INDEX i5_AAT ON pfuser.ArchiveAuditTrail(aatMsgId)
GO
CREATE INDEX i6_AAT ON pfuser.ArchiveAuditTrail(aatOwnerZlpUserId)
GO




-- OPTIONAL
CREATE SEQUENCE pfuser.ImportTask_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.ImportTask (
        -- IDENTITY
	impId	BIGINT NOT NULL,
	impTenantId INT NOT NULL,
 	impType NVARCHAR(255)  NOT NULL,
	impSubType NVARCHAR(255) NULL,
    impDate  DATETIME NOT NULL,
	impIter	INT NOT NULL,
	impInstanceName NVARCHAR(255) NOT NULL,
    impStartDate	DATETIME NOT NULL,
	impEndDate	DATETIME NULL,
    impUpdate	DATETIME NOT NULL,
    impSuccessCount INT NULL,
	impErrorCount	INT NULL,
 	impTotal	INT NULL,
	impMessage	NVARCHAR(255) NULL,
    impVal1	NVARCHAR(255) NULL,
	impVal2	NVARCHAR(255) NULL,
	CONSTRAINT pk_impTask PRIMARY KEY (impId),
	CONSTRAINT uk2_impTask UNIQUE (impTenantId,impInstanceName)
)
GO
CREATE INDEX i1_impTask ON pfuser.ImportTask(impStartDate)
GO
CREATE INDEX i2_impTask ON pfuser.ImportTask(impType,impDate)
GO




CREATE SEQUENCE pfuser.ExportTask_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.ExportTask (
	expId	INT NOT NULL,
	expParentId INT NOT NULL,
	expInstanceId INT NOT NULL,
	expTenantId INT NOT NULL,
	expAppId INT NOT NULL,
 	expType NVARCHAR(255)  NOT NULL,
	expSubType NVARCHAR(255) NULL,
    expStartDate	DATETIME NOT NULL,
	expEndDate	DATETIME NULL,
    expUpdate	DATETIME NOT NULL,
    expApprReqId INT NOT NULL,
    expLastApprId INT NOT NULL,
    expFound 	INT NULL,
    expSuccessCount INT NULL,
	expErrorCount	INT NULL,
 	expDupCount	INT NULL,
 	expNearDupCount INT NULL,
 	expPrevExported	INT NULL,
 	expPrevExcess	INT NULL,
    expSizeKB	 	INT NULL,
	expVaultId	VARCHAR(64) NULL,
	expVaultPwd 	VARBINARY(255) NULL,
	expQueryVal1    NVARCHAR(255) NULL,
	expQueryVal2	NVARCHAR(255) NULL,
	expQueryVal3    NVARCHAR(255) NULL,
	expQueryVal4	NVARCHAR(255) NULL,
	expQueryVal5    NVARCHAR(255) NULL,
	expZlpUserId INT NOT NULL,
    expUser		NVARCHAR(255) NULL,
    expNotifyUser	NVARCHAR(255) NULL,
	expLocation	NVARCHAR(255) NULL,
	expStatusMessage	NVARCHAR(255) NULL,
	expMachine	NVARCHAR(255) NULL,
	CONSTRAINT pk_expTask PRIMARY KEY (expId)
--,
--	CONSTRAINT fk_expTaskParent FOREIGN KEY (expParentId) REFERENCES pfuser.ExportTask(expId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_expTaskVa FOREIGN KEY (expVaultId) REFERENCES pfuser.VaultItem(viStId) ON DELETE CASCADE
)
GO
CREATE INDEX i3_expTask ON pfuser.ExportTask(expTenantId,expStartDate)
GO
CREATE INDEX i2_expTask ON pfuser.ExportTask(expUser)
GO




CREATE TABLE pfuser.ExportTaskEntry (
	entryExpId	INT NOT NULL,
	entryItemId	INT NOT NULL,
	entryItemStId  	VARCHAR(255)  NULL,
	entryItemDigest	VARCHAR(255)  NULL,
	entryItemSize	INT NOT NULL,
	entryBatch	NVARCHAR(255) NULL,
	entryStatus	INT NOT NULL,
	entryRetry	INT NULL,	
	entryUpdate	DATETIME NOT NULL
)
GO
CREATE INDEX i2_ExpTaskEnt ON pfuser.ExportTaskEntry(entryExpId,entryItemStId)
GO



CREATE TABLE pfuser.ArchiveMailServerAgent (
	amsaAmsId		INT NOT NULL,
	amsaAgentName		NVARCHAR(64) NOT NULL,
	amsaAgentType		NVARCHAR(64) NOT NULL,
	amsaMask		INT NOT NULL,
	amsaVal1			NVARCHAR(255) NULL,
	amsaVal2			NVARCHAR(255) NULL,
	amsaVal3			NVARCHAR(255) NULL,
	amsaUseSystemDefault	CHAR(1) NOT NULL,
	amsaMaxOfficeHourRate INT NULL,
	amsaMaxNonOfficeHourRate INT NULL,
	amsaRunIntervalSec	INT NULL,
	amsaIter				INT NULL,
	amsaIterStartDate	DATETIME NULL,
	amsaIterLastUpdate	DATETIME NULL,
	amsaIterEndDate		DATETIME NULL,
	CONSTRAINT pk_amsAgent PRIMARY KEY (amsaAmsId,amsaAgentName)
--,
--	CONSTRAINT fk_amsAgentAms FOREIGN KEY (amsaAmsId) REFERENCES pfuser.ArchiveMailServer(amsId) ON DELETE CASCADE
)
GO
CREATE INDEX i1_amsAgent ON pfuser.ArchiveMailServerAgent(amsaAmsId)
GO
	CREATE INDEX i2_amsAgent ON pfuser.ArchiveMailServerAgent(amsaIterStartDate)
GO

CREATE SEQUENCE pfuser.ArchiveMailServerAgentRuns_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.ArchiveMailServerAgentRuns (
	amsarId	INT NOT NULL,
	amsarAmsId		INT NOT NULL,
	amsarAgentName		NVARCHAR(64) NOT NULL,
	amsarAgentType		NVARCHAR(64) NOT NULL,
        amsarCluster		NVARCHAR(64) NULL,
	amsarPID			NVARCHAR(64) NULL,
        amsarStartDate	DATETIME NOT NULL,
	amsarEndDate	DATETIME NULL,
        amsarUpdate	DATETIME NOT NULL,
        amsarFound 	INT NULL,
        amsarSuccessCount INT NULL,
	amsarErrorCount	INT NULL,
	amsarStatusMessage	NVARCHAR(255) NULL,
	CONSTRAINT pk_amsaRuns PRIMARY KEY (amsarId)
--,
--	CONSTRAINT fk_amsaRunsAms FOREIGN KEY (amsarAmsId) REFERENCES pfuser.ArchiveMailServer(amsId) ON DELETE CASCADE
)
GO
CREATE INDEX i1_amsaRuns ON pfuser.ArchiveMailServerAgentRuns(amsarStartDate)
GO
CREATE INDEX i2_amsaRuns ON pfuser.ArchiveMailServerAgentRuns(amsarAmsId,amsarAgentName)
GO



CREATE TABLE pfuser.ArchiveUserRuns (
	aurZlpUserId		INT NOT NULL,
	aurAmsId			INT NOT NULL,
	aurAmsarId		INT NOT NULL,
        aurStartDate	DATETIME NOT NULL,
	aurEndDate	DATETIME NULL,
        aurUpdate	DATETIME NOT NULL,
	aurFullExam     CHAR(1) NOT NULL,
        aurArchiveExamined 	INT NULL,
        aurStubExamined 	INT NULL,
        aurArchiveInitiate INT NULL,
	aurStubInitiate	INT NULL,
	aurDeleted 	INT NULL,
	aurArchived	INT NULL,
	aurStubbed	INT NULL,
	aurError        INT NULL,
	aurStatusMessage	NVARCHAR(255) NULL,
	CONSTRAINT pk_aurRuns PRIMARY KEY (aurZlpUserId,aurAmsarId)
--,
--	CONSTRAINT fk_aurRunsAms FOREIGN KEY (aurAmsId) REFERENCES pfuser.ArchiveMailServer(amsId) ON DELETE CASCADE,
--	CONSTRAINT fk_aurRunsAmsar FOREIGN KEY (aurAmsarId) REFERENCES pfuser.ArchiveMailServerAgentRuns(amsarId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_aurZLPUser FOREIGN KEY (aurZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO
CREATE INDEX i1_aurRuns ON pfuser.ArchiveUserRuns(aurStartDate)
GO
CREATE INDEX i2_aurRuns ON pfuser.ArchiveUserRuns(aurAmsId)
GO
CREATE INDEX i3_aurRuns ON pfuser.ArchiveUserRuns(aurAmsarId)
GO


CREATE TABLE pfuser.IMAPTransport (
	itAmsId			INT NOT NULL,
	itIMAPUser	NVARCHAR(255) NOT NULL,
	itOperation	NVARCHAR(32) NULL,
	itFolderName	NVARCHAR(255) NOT NULL,
	itVaultId   VARCHAR(128) NULL,
        itEncPwd NVARCHAR(255) NULL,
        itStartDate	DATETIME NOT NULL,
	itEndDate	DATETIME NULL,
        itUpdate	DATETIME NOT NULL,
	itIter		INT NOT NULL,
        itMsgCount 	INT NULL,
        itSuccessCount INT NULL,
	itErrorCount	INT NULL,
	itStatusMessage	NVARCHAR(255) NULL,
	CONSTRAINT pk_imapTransport PRIMARY KEY (itFolderName)
--,
--	CONSTRAINT fk_imapTransport FOREIGN KEY (itAmsId) REFERENCES pfuser.ArchiveMailServer(amsId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_imapTransportVa FOREIGN KEY (itVaultId) REFERENCES pfuser.VaultItem(viStId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_imapTransport ON pfuser.IMAPTransport(itStartDate)
GO
CREATE INDEX i2_imapTransport ON pfuser.IMAPTransport(itAmsId)
GO





CREATE TABLE pfuser.UserDiscovery (
	udName				NVARCHAR(255) NOT NULL,
	udType				NVARCHAR(64) NOT NULL,
	udTenantId			INT NOT NULL,
	udServer			NVARCHAR(255) NULL,
	udQuery				NVARCHAR(255) NULL,
	udZlObjId			INT NULL,
	udVal1				NVARCHAR(255) NULL,
	udVal2				NVARCHAR(255) NULL,
	udVal3				NVARCHAR(255) NULL,
	udVal4				NVARCHAR(255) NULL,
	udVal5				NVARCHAR(255) NULL,
	udVal6				NVARCHAR(255) NULL,
	udVal7				NVARCHAR(255) NULL,
	udVal8				NVARCHAR(255) NULL,
	CONSTRAINT pk2_usrDisc PRIMARY KEY (udTenantId,udName)
)
GO




CREATE TABLE pfuser.UserDiscoveryExclusion (
	udeUdName NVARCHAR(64) NOT NULL,
	udeFieldName		NVARCHAR(64) NOT NULL,
	udeFieldValue		NVARCHAR(255) NOT NULL,
	udeDate		DATETIME NOT NULL,
	CONSTRAINT pk_ude PRIMARY KEY (udeUdName,udeFieldName,udeFieldValue)
)
GO
CREATE INDEX i1_ude ON pfuser.UserDiscoveryExclusion(udeUdName)
GO
	



CREATE SEQUENCE pfuser.MailRetMan_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.MailRetentionManager (
	mrmId	INT NOT NULL,
	mrmTenantId INT NOT NULL,
    mrmCluster		NVARCHAR(64) NULL,
	mrmPID			NVARCHAR(64) NULL,
        mrmStartDate	DATETIME NOT NULL,
	mrmEndDate	DATETIME NULL,
        mrmUpdate	DATETIME NOT NULL,
	mrmDomainCount	INT NOT NULL,
	mrmUserCount	INT NOT NULL,
	mrmSuspended	CHAR(1) NOT NULL,
	mrmSuspendDate	DATETIME NULL,
	mrmStatusMessage	NVARCHAR(255) NULL,
	CONSTRAINT pk_mrm PRIMARY KEY (mrmId)
)
GO
CREATE INDEX i1_mrm ON pfuser.MailRetentionManager(mrmTenantId,mrmStartDate)
GO


CREATE TABLE pfuser.MailRetentionUserRuns (
	mrurId	INT NOT NULL,
	mrurZlpUserId 	INT NOT NULL,
	mrurDomainId	INT NOT NULL,
        mrurCluster		NVARCHAR(64) NULL,
	mrurPID			NVARCHAR(64) NULL,
        mrurStartDate	DATETIME NOT NULL,
	mrurEndDate	DATETIME NULL,
        mrurUpdate	DATETIME NOT NULL,
        mrurPeriodExpireCount INT NOT NULL,
        mrurDateExpireCount INT NOT NULL,
        mrurFlaggedCount INT NOT NULL,
	mrurLegalHoldCount INT NOT NULL,
	mrurFullExam CHAR(1) NOT NULL,
	mrurStatusMessage	NVARCHAR(255) NULL,
	CONSTRAINT pk_mrur PRIMARY KEY (mrurId,mrurZlpUserId)
--,
--	CONSTRAINT fk_mrurDomain FOREIGN KEY (mrurDomainId) REFERENCES pfuser.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_mrurZLPUser FOREIGN KEY (mrurZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO



CREATE SEQUENCE pfuser.MailPurgTran_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.MailPurgeTransaction (
	mptId	INT NOT NULL,
	mptmrurId		INT NOT NULL,
        mptZlpUserId		INT NOT NULL,	
	mptMsgCount	INT NOT NULL,
        mptCluster		NVARCHAR(64) NULL,
	mptPID			NVARCHAR(64) NULL,
        mptStartDate	DATETIME NOT NULL,
	mptEndDate	DATETIME NULL,
        mptUpdate	DATETIME NOT NULL,
	mptVaultDeleteCount INT NOT NULL,
	mptVaultPrimarySizeKB INT NOT NULL,
	mptVaultSecondarySizeKB INT NOT NULL,
	mptSISCount INT NOT NULL,
	mptMessageFlagged INT NOT NULL,
	mptTranscriptVaultId VARCHAR(128) NULL,
	mptStatusMessage	NVARCHAR(255) NULL,
	CONSTRAINT pk_mpt PRIMARY KEY (mptId)
--,
--	CONSTRAINT fk_mpt FOREIGN KEY (mptmrurId) REFERENCES pfuser.MailRetentionUserRuns(mrurId) ON DELETE CASCADE,
--,
--	CONSTRAINT fk_mptZLPUser FOREIGN KEY (mptZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_mptVa FOREIGN KEY (mptTranscriptVaultId) REFERENCES pfuser.VaultItem(viStId) ON DELETE CASCADE
)
GO
CREATE INDEX i1_mpt ON pfuser.MailPurgeTransaction(mptmrurId)
GO


CREATE TABLE pfuser.MailPurgeRequest (
	purgeMsgId                       VARCHAR(64) NOT NULL,
	purgeMsgUserId	                    INT NOT NULL,
	purgeMsgTenantId		INT NOT NULL,
	purgeMsgDate			    DATETIME NOT NULL,
	purgeMsgDateCreate	            DATETIME NOT NULL,
	purgeMsgDateUpdate                  DATETIME NOT NULL,
	purgeMsgStatus		    	    INT NOT NULL,	
	purgeMsgRunId	                    INT NOT NULL,
	purgeMsgReason			    NVARCHAR(255) NULL,
	CONSTRAINT pk_MailPurgeRequest PRIMARY KEY (purgeMsgId)
)
GO

CREATE INDEX i1_MailPurgeRequest ON pfuser.MailPurgeRequest(purgeMsgTenantId,purgeMsgStatus,purgeMsgDate)
GO





CREATE SEQUENCE pfuser.MailboxFolder_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser.MailboxFolder (
	mbfId	INT NOT NULL,
	mbfZlpUserId	INT NOT NULL,
	-- //MSSQL{[NVARCHAR2(255) NOT NULL~~NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL]}
	mbfName	NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL,
	mbfDisplayName	NVARCHAR(255) NOT NULL,
	mbfParentId	INT NOT NULL,
	mbfCreateDate	DATETIME NOT NULL,
	mbfLastUpdate	DATETIME NOT NULL,
	CONSTRAINT pk_mbf PRIMARY KEY (mbfId),
--	CONSTRAINT fk_mbfZLPUser FOREIGN KEY (mbfZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_mbfParent FOREIGN KEY (mbfParentId) REFERENCES pfuser.MailboxFolder(mbfId) ON DELETE CASCADE,
--	CONSTRAINT fk_mbfZLPFolder FOREIGN KEY (mbfId,mbfZlpUserId) REFERENCES pfuser.ZLPFolder(fldrId,fldrZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_mbfZLPFolder FOREIGN KEY (mbfId) REFERENCES pfuser.ZLPFolder(fldrId) ON DELETE CASCADE,
	CONSTRAINT uk_mbf UNIQUE (mbfZlpUserId,mbfParentId,mbfName)
)
GO








CREATE TABLE pfuser.MailboxSync (
	mbSyncZlpUserId	INT NOT NULL,
	mbSyncZlMsgId	VARCHAR(64) NOT NULL,
	-- //MSSQL{[VARCHAR2(255) NOT NULL~~VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL]}
	mbSyncUnid	VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL,
	mbSyncFolderId	INT NOT NULL,
	mbSyncAmFlags	INT NOT NULL,
	mbSyncAmState	INT NOT NULL,
	mbSyncStubMethod	INT NOT  NULL,
	mbSyncMsgDate	DATETIME NOT NULL,
	mbSyncCreateDate	DATETIME NOT NULL,
	mbSyncUpdate	DATETIME NOT NULL,
	mbSyncIndexDate DATETIME NULL,
	mbSyncExpiryDate DATETIME NULL,
	mbSyncLastIter	INT NOT NULL,
	mbSyncLastAction	INT NOT NULL,
	mbSyncDeletedOnMailServer CHAR(1) NOT NULL,
	mbSyncForm		NVARCHAR(255) NULL,
	mbSyncEncrypted CHAR(1) NOT NULL,
	mbSyncSizeOrig	INT NOT NULL,
	mbSyncSizeCurrent	INT NOT NULL,
	mbSyncSizeCharged	INT NOT NULL,
	mbSyncRetry	INT NULL,
	mbSyncFullScanOnly	CHAR(1) NULL,
	mbSyncCategory    NVARCHAR(255) NULL,
	mbSyncRetentionId   INT NULL,
	mbSyncVal1	NVARCHAR(255) NULL,
	mbSyncVal2	NVARCHAR(255) NULL,
	mbSyncVal3	NVARCHAR(255) NULL,
	mbSyncVal4	NVARCHAR(255) NULL,
	CONSTRAINT pk_mbSync PRIMARY KEY (mbSyncZlMsgId),
--	CONSTRAINT fk_mbSyncZLPUser FOREIGN KEY (mbSyncZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_mbSyncFolder FOREIGN KEY (mbSyncFolderId) REFERENCES pfuser.MailboxFolder(mbfId) ON DELETE CASCADE,
--	CONSTRAINT fk_mbSyncMsg FOREIGN KEY (mbSyncZlMsgId) REFERENCES pfuser.ZLPMessage(MsgId) ON DELETE CASCADE,
	CONSTRAINT uk_mbSync UNIQUE (mbSyncZlpUserId,mbSyncUnid)
)
GO

-- CREATE INDEX i1_mbSync ON pfuser.MailboxSync(mbSyncZlpUserId,mbSyncDeletedOnMailServer)
GO
CREATE INDEX i2_mbSync ON pfuser.MailboxSync(mbSyncZlpUserId,mbSyncFullScanOnly)
GO




CREATE TABLE pfuser.MbSyncAuditTrail (
	mbsaAction	INT NOT NULL,
	mbsaDate		DATETIME NOT NULL,	
	mbsaMsgId	VARCHAR(255) NULL,
	mbsaFolderId	INT NOT NULL,
	mbsaZlpUserId	INT NOT NULL,
	mbsaUser		NVARCHAR(255) NOT NULL,	
	mbsaDomainId	INT NOT NULL,
	mbsaTenantId INT NOT NULL,	
	mbsaTxnId		VARCHAR(64) NOT NULL,
	mbsaClearanceLevel	INT NOT NULL,
	mbsaSourceIP 	VARCHAR(64) NULL,
	mbsaDestIP   	VARCHAR(64) NULL,
	mbsaAccessType 	VARCHAR(128) NULL,
	mbsaZViteStId 	VARCHAR(255) NULL,
	mbsaComments	NVARCHAR(255) NULL,
	mbsaVal1 	NVARCHAR(255) NULL,
	mbsaVal2 	NVARCHAR(255) NULL,
	mbsaVal3 	NVARCHAR(255) NULL,
	mbsaVal4 	NVARCHAR(255) NULL,
	mbsaVal5 	NVARCHAR(255) NULL
)
GO


CREATE INDEX i1_MbSyncAudTrail ON pfuser.MbSyncAuditTrail(mbsaDate)
GO
CREATE INDEX i2_MbSyncAudTrail ON pfuser.MbSyncAuditTrail(mbsaDomainId)
GO
CREATE INDEX i3_MbSyncAudTrail ON pfuser.MbSyncAuditTrail(mbsaZlpUserId)
GO
CREATE INDEX i4_MbSyncAudTrail ON pfuser.MbSyncAuditTrail(mbsaMsgId)
GO



CREATE TABLE pfuser.MessageImport (
	miId	VARCHAR(255) NOT NULL,
	miSystemId INT NOT NULL,
	miTenantId INT NOT NULL,
	miLocation	VARCHAR(255) NULL,
	miBatchId VARCHAR(255) NOT NULL,
	miType VARCHAR(255) NOT NULL,
	miCreateDate DATETIME NOT NULL,
	miUpdate DATETIME NOT NULL,
	miIteration INT NOT NULL,
	miStatus INT NOT NULL,	
	miMachine VARCHAR(255) NULL,
	miComment NVARCHAR(255) NULL,
	miCountExpected INT NULL,
	miSuccess INT NULL,
	miError INT NULL,
	CONSTRAINT pk_msgImp PRIMARY KEY (miSystemId,miId)
)
GO
CREATE INDEX i2_msgImp ON pfuser.MessageImport(miSystemId,miLocation)
GO
CREATE INDEX i3_msgImp ON pfuser.MessageImport(miSystemId,miBatchId,miStatus)
GO

-- OPTIONAL
CREATE SEQUENCE pfuser.LegacySystem_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.LegacySystem (
	-- IDENTITY
	legSysId BIGINT NOT NULL,
	legSysName VARCHAR(255) NOT NULL,
	legSysType VARCHAR(255) NOT NULL,
	legSysCreateDate DATETIME NOT NULL,
	legSysTenantId INT NOT NULL,
	legSysAsId INT NOT NULL,
	CONSTRAINT pk_legSys PRIMARY KEY (legSysId),
	CONSTRAINT uk_legSys UNIQUE (legSysTenantId,legSysName)
)
GO

CREATE TABLE pfuser.LegacySystemMessage (
	lsmSysId INT  NOT NULL,
	lsmExtId INT NULL,
	lsmExtId2 VARCHAR(255) NULL,
	lsmId VARCHAR(240) NOT NULL,
	lsmLocation VARCHAR(255) NULL, 
	lsmSisRmID VARCHAR(255) NULL,
	lsmZlpMsgId VARCHAR(64) NULL,
	lsmPID	 VARCHAR(64) NULL,
    	lsmStatus INT NOT NULL,
    	lsmFlags INT NOT NULL,
	lsmExtFlags INT NULL,
	lsmExtMsgSize BIGINT NULL,
	lsmExtMsgDate DATETIME NULL,
    	lsmCreateDate DATETIME NOT NULL,
	lsmUpdate DATETIME NOT NULL,
	lsmComment NVARCHAR(255) NULL, 
	lsmParamVal1 NVARCHAR(255) NULL,
	lsmParamVal2 NVARCHAR(255) NULL,
	lsmParamVal3 NVARCHAR(255) NULL,
	lsmParamVal4 NVARCHAR(255) NULL,
	lsmParamVal5 NVARCHAR(255) NULL,
	CONSTRAINT pk_legSysMsg PRIMARY KEY (lsmSysId,lsmId)
)
GO

CREATE INDEX i1_legSysMsg ON pfuser.LegacySystemMessage(lsmSysId,lsmStatus)
GO
CREATE INDEX i2_legSysMsg ON pfuser.LegacySystemMessage(lsmSysId,lsmLocation)
GO
CREATE INDEX i3_legSysMsg ON pfuser.LegacySystemMessage(lsmSysId,lsmExtId)
GO

CREATE TABLE pfuser.LSMStats (
	lsmsSysId				INT NOT NULL,
	lsmsType				VARCHAR(255) NOT NULL,
	lsmsPeriodInfo			VARCHAR(255) NOT NULL,
	lsmsPeriodStartDate		DATETIME NOT NULL,
	lsmsPID					VARCHAR(64) NOT NULL,
	lsmsCount				INT NOT NULL,
	lsmsRetryCount			INT NOT NULL,
	lsmsSuccessCount		INT NOT NULL,
	lsmsErrorCount			INT NOT NULL,
	lsmsFatalCount			INT NOT NULL,
	lsmsSize				BIGINT NOT NULL,
	lsmsCreateDate			DATETIME NOT NULL,
	lsmsUpdate				DATETIME NOT NULL,
	CONSTRAINT pk_LSMStats PRIMARY KEY (lsmsSysId,lsmsPeriodInfo,lsmsPID)
)
GO

CREATE INDEX i1_LSMStats ON pfuser.LSMStats(lsmsSysId,lsmsPeriodStartDate,lsmsPID)
GO

CREATE SEQUENCE pfuser.LSMObject_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 1000
GO

CREATE TABLE pfuser.LSMImportProblem (
	lipSysId INT NOT NULL,
	lipMiId VARCHAR(255) NOT NULL,
	lipLsmId VARCHAR(255) NOT NULL,
	lipAttempt VARCHAR(240) NOT NULL,
	lipStatus VARCHAR(255) NOT NULL,
	lipAttemptDate DATETIME NOT NULL,
	lipAttemptMachine VARCHAR(64) NOT NULL,
	lipAttemptComment NVARCHAR(255) NULL
)
GO

CREATE INDEX i1_lsmprob ON pfuser.LSMImportProblem (lipSysId,lipMiId)
GO




CREATE TABLE pfuser.LsmObject (
	lsmoId			INT NOT NULL,
	lsmoSeqNumber	INT NOT NULL,
	lsmoNext		CHAR(1) NOT NULL,
	lsmoSysId		INT NOT NULL,
	lsmoLsmId		VARCHAR(255) NULL,  
	lsmoVal1		NVARCHAR(255) NULL,
	lsmoVal2		NVARCHAR(255) NULL,
	lsmoVal3		NVARCHAR(255) NULL,
	lsmoVal4		NVARCHAR(255) NULL,
	lsmoVal5		NVARCHAR(255) NULL,
	lsmoVal6		NVARCHAR(255) NULL,
	lsmoVal7		NVARCHAR(255) NULL,
	lsmoVal8		NVARCHAR(255) NULL,
   	CONSTRAINT pk_lsmObj PRIMARY KEY (lsmoId,lsmoSeqNumber)
)
GO

CREATE TABLE pfuser.LegacySourceReaderParam (
	lsrSysId INT  NOT NULL,
	lsrId VARCHAR(255) NOT NULL,
    	lsrFlags INT NOT NULL,
	lsrPID	 VARCHAR(64) NULL,
	lsrParamVal1 NVARCHAR(255) NOT NULL,
	lsrParamVal2 NVARCHAR(255) NULL,
	lsrParamVal3 NVARCHAR(255) NULL,
	lsrParamVal4 NVARCHAR(255) NULL,
	lsrParamVal5 NVARCHAR(255) NULL
)
GO

CREATE INDEX i1_lsrParam ON pfuser.LegacySourceReaderParam(lsrSysId,lsrId)
GO


CREATE TABLE pfuser.LegacySystemHoldInfo (
	lshiSystemId INT NOT NULL,
	lshiExtHoldInfo  VARCHAR(255) NOT NULL,
	lshiHoldInfo  VARCHAR(255) NOT NULL,
	lshiComment VARCHAR(255) NULL,
	CONSTRAINT pk_legSysHldI PRIMARY KEY (lshiSystemId,lshiExtHoldInfo)
)
GO

CREATE TABLE pfuser.LegacySystemLegalHold (
	lslhSystemId INT NOT NULL,
    lslhMsgExtId INT NULL,
    lslhMsgId VARCHAR(240) NULL,
	lslhExtHoldInfo VARCHAR(255) NOT NULL,
	lslhPartition INT NOT NULL,
    lslhDateProcessed DATETIME NOT NULL,
    lslhStatus INT NOT NULL,
	lslhComment	VARCHAR(255) NULL
)
GO



CREATE INDEX i1_legSysLhold ON pfuser.LegacySystemLegalHold(lslhSystemId,lslhExtHoldInfo,lslhPartition)
GO
CREATE INDEX i2_legSysLhold ON pfuser.LegacySystemLegalHold(lslhSystemId,lslhMsgExtId,lslhExtHoldInfo)
GO
--CREATE INDEX pfuser.i3_legSysLhold ON pfuser.LegacySystemLegalHold(lslhSystemId,lslhMsgId,lslhHoldInfo)
GO

CREATE TABLE pfuser.LegacySystemFilePlan (
	lsfpSystemId INT NOT NULL,
	lsfpExtId INT NOT NULL,
	lsfpExtCategoryId INT NOT NULL,
	lsfpExtParentId INT NOT NULL,
        lsfpZlFilePlanId INT NOT NULL,
        lsfpParamVal1 VARCHAR(255) NULL,
	lsfpParamVal2 VARCHAR(255) NULL,
	lsfpParamVal3 VARCHAR(255) NULL,
	CONSTRAINT pk_legSysFplan PRIMARY KEY (lsfpSystemId,lsfpExtId,lsfpExtCategoryId,lsfpExtParentId),
	CONSTRAINT uk_legSysFplan UNIQUE (lsfpZlFilePlanId)
)
GO

CREATE TABLE pfuser.LegacySystemAddress (
	lsaSysId INT  NOT NULL,
	lsaAddrId BIGINT NOT NULL,
	lsaParamVal1 NVARCHAR(255) NOT NULL,
	lsaParamVal2 NVARCHAR(255) NULL,
	lsaParamVal3 NVARCHAR(255) NULL,
	lsaParamVal4 NVARCHAR(255) NULL,
	CONSTRAINT pk_legSysAddr PRIMARY KEY (lsaSysId,lsaAddrId)
)
GO

CREATE SEQUENCE pfuser.MboxUsage_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.MailboxUsage (
	mbuZlpUserId	INT NOT NULL,
	mbuDate 	DATETIME NOT NULL,
	mbuAsId		INT NOT NULL,
	mbuMailServerId	INT NOT NULL,
	mbuTenantId INT NOT NULL,
	mbuIter		INT NOT NULL,
	mbuDiscoveredCount INT NOT NULL,
	mbuArchivedCount INT NOT NULL,
	mbuStubbedCount INT NOT NULL,
	mbuStubUnchangedCount INT NOT NULL,
	mbuRestoreCount INT NOT NULL,
	mbuOrigSizeKB INT NOT NULL,
	mbuSizeChargedKB INT NOT NULL,
	mbuStubbedSizeKB INT NOT NULL,
	mbuZLMsgCount	INT NOT NULL,
	mbuZLMsgSizeKB 	INT NOT NULL,
	mbuDeletedCount	INT NOT NULL,		
	mbuRestubCount INT NOT NULL,
	mbuConflictCount INT NULL,
	mbuConflictSizeKB INT NULL,
	CONSTRAINT pk_mbUsage PRIMARY KEY (mbuZlpUserId)
--,
--	CONSTRAINT fk_mbUsageAs FOREIGN KEY (mbuAsId) REFERENCES pfuser.ArchiveServer(asId) ON DELETE CASCADE,
--	CONSTRAINT fk_mbUsageAms FOREIGN KEY (mbuMailServerId) REFERENCES pfuser.ArchiveMailServer(amsId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_mbUsageZLPUser FOREIGN KEY (mbuZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO
CREATE INDEX i1_mbUsage ON pfuser.MailboxUsage(mbuAsId)
GO

CREATE TABLE pfuser.MailboxUsageHistory (
	mbuZlpUserId	INT NOT NULL,
	mbuDate 	DATETIME NOT NULL,
	mbuAsId		INT NOT NULL,
	mbuTenantId INT NOT NULL,
	mbuMailServerId INT NOT NULL,
	mbuIter		INT NOT NULL,
	mbuDiscoveredCount INT NOT NULL,
	mbuArchivedCount INT NOT NULL,
	mbuStubbedCount INT NOT NULL,
	mbuStubUnchangedCount INT NOT NULL,
	mbuRestoreCount INT NOT NULL,
	mbuOrigSizeKB INT NOT NULL,
	mbuSizeChargedKB INT NOT NULL,
	mbuStubbedSizeKB INT NOT NULL,
	mbuZLMsgCount	INT NOT NULL,
	mbuZLMsgSizeKB 	INT NOT NULL,
	mbuDeletedCount	INT NOT NULL,
	mbuRestubCount INT NOT NULL,
	mbuConflictCount INT NULL,
	mbuConflictSizeKB INT NULL,
	CONSTRAINT pk_mbUsageHis PRIMARY KEY (mbuZlpUserId,mbuIter)
--,
--	CONSTRAINT fk_mbUsageHisAs FOREIGN KEY (mbuAsId) REFERENCES pfuser.ArchiveServer(asId) ON DELETE CASCADE,
--	CONSTRAINT fk_mbUsageHisAms FOREIGN KEY (mbuMailServerId) REFERENCES pfuser.ArchiveMailServer(amsId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_mbUsageHisUser FOREIGN KEY (mbuZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO
CREATE INDEX i1_mbUsageHis ON pfuser.MailboxUsageHistory(mbuAsId,mbuIter)
GO



-- OPTIONAL
CREATE SEQUENCE pfuser.RestoreTask_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.RestoreTask (
	-- IDENTITY
	rtId	BIGINT NOT NULL,	
	rtName	NVARCHAR(255) NOT NULL,
	rtType  	VARCHAR(64) NOT NULL,
	rtCreateDate	DATETIME NOT NULL,
	rtVaultId	VARCHAR(128) NULL,
	rtVaultPwd 	VARBINARY(255) NULL,
	rtScheduledDate DATETIME NULL,
	rtIterStartDate	DATETIME NULL,
	rtIterEndDate	DATETIME NULL,
	rtPID		VARCHAR(64) NULL,
	rtIntervalSec INT NOT NULL,
	rtExpiryDate DATETIME NULL,
	CONSTRAINT pk_rtask PRIMARY KEY (rtId),
--	CONSTRAINT fk_rtask FOREIGN KEY (rtVaultId) REFERENCES pfuser.VaultItem(viStId) ON DELETE CASCADE,
	CONSTRAINT uk_rtask UNIQUE (rtName)
)
GO


CREATE TABLE pfuser.RestoreSync (
	rSyncTaskId	INT NOT NULL,
	rSyncZlpUserId	INT NOT NULL,
	rSyncZlMsgId	VARCHAR(64) NOT NULL,
	rSyncAmFlags	INT NOT NULL,
	rSyncStubMethod	INT NOT  NULL,
	rSyncForm		NVARCHAR(255) NULL,
	rSyncSize	INT NOT NULL,
	rSyncRetry	INT NULL,	
	rSyncUpdate	DATETIME NOT NULL,
	CONSTRAINT pk_rSync PRIMARY KEY (rSyncTaskId,rSyncZlpUserId,rSyncZlMsgId)
--,
--	CONSTRAINT fk_rSync FOREIGN KEY (rSyncTaskId) REFERENCES pfuser.RestoreTask(rtId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_rSyncZLPUser FOREIGN KEY (rSyncZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_rSyncMsg FOREIGN KEY (rSyncZlMsgId) REFERENCES pfuser.ZLPMessage(MsgId) ON DELETE CASCADE
)
GO



CREATE TABLE pfuser.MessageTransportProblem (
	-- //MSSQL{[VARCHAR2(255) NOT NULL~~VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL]}
	mtpUnid       VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL,
        mtpMsgId      VARCHAR(255) NULL,
	mtpForm		NVARCHAR(255) NULL,
	mtpDate		DATETIME NOT NULL,
        mtpType VARCHAR(64) NULL,
        mtpMachine  VARCHAR(64) NOT NULL
--,
--	CONSTRAINT fk_mtpMsg FOREIGN KEY (mtpMsgId) REFERENCES pfuser.ZLPMessage(MsgId) ON DELETE CASCADE
)
GO
CREATE INDEX i1_MsgTranPr ON pfuser.MessageTransportProblem(mtpUnid)
GO

CREATE TABLE pfuser.DbArchive (
	dbArchiveName		NVARCHAR(255) NOT NULL,
	dbArchiveType VARCHAR(64) NOT NULL,
	dbArchiveUrl  NVARCHAR(255) NULL,
	dbArchiveUserId	NVARCHAR(255) NULL,	
	dbArchivePwd	NVARCHAR(255) NULL,
	dbArchiveDbName	NVARCHAR(255) NULL,
	dbArchiveOpVal1 		NVARCHAR(255) NULL,
	dbArchiveOpVal2 		NVARCHAR(255) NULL,
	dbArchiveOpVal3 		NVARCHAR(255) NULL,
	dbArchiveVal1 		NVARCHAR(255) NULL,
	dbArchiveVal2 		NVARCHAR(255) NULL,
	CONSTRAINT pk_DbArchive PRIMARY KEY (dbArchiveName)
)
GO

CREATE INDEX i1_DbArchive ON pfuser.DbArchive(dbArchiveType)
GO



CREATE TABLE pfuser.ImportUserAlias (	
	iuaAlias NVARCHAR(255) NOT NULL,
	iuaFullName NVARCHAR(255) NULL,
	iuaZlpUserId	INT NOT NULL,
	iuaAsId			INT NOT NULL,
	iuaTenantId INT NOT NULL,
	iuaImportType	NVARCHAR(32) NOT NULL,
	iuaDate 	DATETIME NOT NULL,
	iuaParamVal1	NVARCHAR(255) NULL,
	iuaParamVal2	NVARCHAR(255) NULL,
	iuaParamVal3	NVARCHAR(255) NULL,
	CONSTRAINT pk_ImpUserAlias PRIMARY KEY (iuaTenantId,iuaAlias,iuaImportType)
)
GO
CREATE INDEX i1_ImpUserAlias ON pfuser.ImportUserAlias(iuaZlpUserId)
GO
	

CREATE TABLE pfuser.MailRetentionUserStats (
	mrusZlpUserId	INT NOT NULL,
	mrusDomainId	INT NOT NULL,
	mrusTenantId	INT NOT NULL,
	mrusPID			NVARCHAR(128) NULL,
    mrusDate	DATETIME NOT NULL,
	mrusMinMsgDate	DATETIME NULL,
	mrusMaxMsgDate	DATETIME NULL,
	mrusTotal	INT NULL,
	mrusTotalSizeKB	BIGINT NULL,
	mrusRetExpired	INT NULL,
	mrusRetExpiredSizeKB	BIGINT NULL,
	mrusToPurge	INT NULL,
	mrusToPurgeSizeKB	BIGINT NULL,
	mrusStubbed	INT NULL,
	mrusLegalHold	INT NULL,
	mrusRecords	INT NULL,
	mrusPurgeInit	INT NULL,
	mrusLegalHoldReleased	INT NULL,
	mrusVal1	NVARCHAR(255) NULL,
	mrusVal2	NVARCHAR(255) NULL,
	mrusVal3	NVARCHAR(255) NULL,
	mrusVal4	NVARCHAR(255) NULL,
	mrusVal5	NVARCHAR(255) NULL,
	CONSTRAINT pk_MrusUser	PRIMARY KEY (mrusZlpUserId)
)
GO

CREATE INDEX i1_MrusUser ON pfuser.MailRetentionUserStats(mrusZlpUserId, mrusDate)
GO



CREATE TABLE pfuser.MailRetentionUserStatsHistory (
	mrusZlpUserId	INT NOT NULL,
	mrusDomainId	INT NOT NULL,
	mrusTenantId	INT NOT NULL,
	mrusPID			NVARCHAR(128) NULL,
    mrusDate	DATETIME NOT NULL,
	mrusMinMsgDate	DATETIME NULL,
	mrusMaxMsgDate	DATETIME NULL,
	mrusTotal	INT NULL,
	mrusTotalSizeKB	BIGINT NULL,
	mrusRetExpired	INT NULL,
	mrusRetExpiredSizeKB	BIGINT NULL,
	mrusToPurge	INT NULL,
	mrusToPurgeSizeKB	BIGINT NULL,
	mrusStubbed	INT NULL,
	mrusLegalHold	INT NULL,
	mrusRecords	INT NULL,
	mrusPurgeInit	INT NULL,
	mrusLegalHoldReleased INT NULL,
	mrusVal1	NVARCHAR(255) NULL,
	mrusVal2	NVARCHAR(255) NULL,
	mrusVal3	NVARCHAR(255) NULL,
	mrusVal4	NVARCHAR(255) NULL,
	mrusVal5	NVARCHAR(255) NULL
)
GO

CREATE INDEX i1_MrusUserHis ON pfuser.MailRetentionUserStatsHistory(mrusZlpUserId, mrusDate)
GO


CREATE TABLE pfuser.MailPurgeConfirmation (
	mpcTenantId		INT NOT NULL,
	mpcMsgId		VARCHAR(64) NOT NULL,
	mpcPurgeDate	DATETIME NOT NULL,
	mpcPID			NVARCHAR(128) NULL,
	CONSTRAINT pk_mpc	PRIMARY KEY (mpcMsgId)
)
GO

CREATE INDEX i1_mpc ON pfuser.MailPurgeConfirmation(mpcTenantId,mpcPurgeDate)
GO

CREATE SEQUENCE pfuser.SyncState_Sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.SyncState (
	ssId		INT NOT NULL,
	ssTenId INT NOT NULL,
	ssType	VARCHAR(255) NOT NULL,
	ssEntityType INT NOT NULL,
	ssEntityId  INT NOT NULL,
	ssSeqNumber		INT NOT NULL,
    ssNext		CHAR(1) NOT NULL,
	ssLastUpdate DATETIME NOT NULL,
	ssVal1	NVARCHAR(255) NULL,
	ssVal2	NVARCHAR(255) NULL,
	ssVal3	NVARCHAR(255) NULL,
	ssVal4	NVARCHAR(255) NULL,
	ssVal5	NVARCHAR(255) NULL,
	ssVal6	NVARCHAR(255) NULL,
	ssVal7	NVARCHAR(255) NULL,
	ssVal8	NVARCHAR(255) NULL,
	CONSTRAINT pk_syncState PRIMARY KEY (ssId, ssSeqNumber),
	CONSTRAINT uk_syncState UNIQUE (ssTenId, ssType, ssEntityType, ssEntityId, ssSeqNumber)
)
GO

CREATE TABLE pfuser.PersistentChatUserRuns (
	pcurZlpUserId		INT NOT NULL,
	pcurAmsId			INT NOT NULL,
	pcurAmsarId		INT NOT NULL,
    pcurStartDate	DATETIME NOT NULL,
	pcurEndDate	DATETIME NULL,
    pcurUpdate	DATETIME NOT NULL,
    pcurTotal    INT NULL,
    pcurThreads  INT NULL,
    pcurDeleted  INT NULL,
    pcurError    INT NULL,
    pcurStatus   INT NOT NULL,
    pcurMessage  NVARCHAR(255) NULL,
	CONSTRAINT pk_pcuRuns PRIMARY KEY (pcurZlpUserId,pcurAmsarId)
)
GO
CREATE INDEX i1_pcuRuns ON pfuser.PersistentChatUserRuns(pcurStartDate)
GO
CREATE INDEX i2_pcuRuns ON pfuser.PersistentChatUserRuns(pcurAmsarId)
GO

CREATE TABLE pfuser.PersistentChatMessage (
    -- //MSSQL{[VARCHAR2(255) NOT NULL~~VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL]}
	pcmId	VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL,
	pcmParentId	VARCHAR(255) NULL,
	pcmOwnerId  INT NOT NULL,
	pcmDate DATETIME NULL,
	pcmProcessedDate DATETIME NULL,
	pcmUpdate   DATETIME NOT NULL,
	pcmSource VARCHAR(255) NULL,
	pcmZlMsgId	VARCHAR(64) NULL,
	pcmImportRunId  INT NULL,
	pcmParamVal1			NVARCHAR(255) NULL,
	pcmParamVal2			NVARCHAR(255) NULL,
	pcmParamVal3			NVARCHAR(255) NULL,
	pcmParamVal4			NVARCHAR(255) NULL,
	pcmParamVal5			NVARCHAR(255) NULL,
	CONSTRAINT uk_pcm1 UNIQUE (pcmId,pcmOwnerId)
)
GO
CREATE INDEX i1_pcMessage ON pfuser.PersistentChatMessage(pcmImportRunId)
GO

CREATE TABLE pfuser.SlackTeam (
	teamTenantId INT NOT NULL,
	teamId NVARCHAR(32) NOT NULL,
	teamName NVARCHAR(255) NOT NULL,
	teamDomain NVARCHAR(128) NULL,
	teamEmailDomain NVARCHAR(128) NULL,
	teamEnterpriseId NVARCHAR(32) NULL,
	teamCreated DATETIME NULL,
	teamUpdated DATETIME NULL,
	teamVal1 NVARCHAR(255) NULL,
	teamVal2 NVARCHAR(255) NULL,
	teamVal3 NVARCHAR(255) NULL,
	teamVal4 NVARCHAR(255) NULL,
	CONSTRAINT pk_slackTeam PRIMARY KEY (teamId)
--	CONSTRAINT fk_TenantId FOREIGN KEY (teamTenantId) REFERENCES pfuser.Tenant(tenId) ON DELETE CASCADE
)
GO

CREATE TABLE pfuser.SlackConversation (
    conversationId NVARCHAR(32) NOT NULL,
    conversationTenantId INT NOT NULL,
	conversationTeamId NVARCHAR(32) NULL,
	conversationName NVARCHAR(512) NOT NULL,
	conversationFlag BIGINT NOT NULL,
	conversationCreated DATETIME NOT NULL,
	conversationUpdated DATETIME NOT NULL,
	CONSTRAINT pk_Channel PRIMARY KEY (conversationId)
--	CONSTRAINT fk_TenantId FOREIGN KEY (conversationTenantId) REFERENCES pfuser.Tenant(tenId) ON DELETE CASCADE
--	CONSTRAINT fk_TeamId FOREIGN KEY (conversationTeamId) REFERENCES pfuser.SlackTeam(teamId) ON DELETE CASCADE
)
GO
CREATE INDEX i1_SlackConversation ON pfuser.SlackConversation(conversationTeamId)
GO

CREATE TABLE pfuser.SlackMembership (
	smTenantId INT NOT NULL,
	smTeamId NVARCHAR(32) NOT NULL,
	smConversationId NVARCHAR(32) NOT NULL,
	smUserId NVARCHAR(32) NOT NULL,
	smCreated DATETIME NOT NULL,
	CONSTRAINT pk_SlackMembership PRIMARY KEY (smConversationId,smUserId)
--	CONSTRAINT fk_TenantId FOREIGN KEY (smTenantId) REFERENCES pfuser.Tenant(tenId) ON DELETE CASCADE
--	CONSTRAINT fk_TeamId FOREIGN KEY (smTeamId) REFERENCES pfuser.SlackTeam(teamId) ON DELETE CASCADE
--	CONSTRAINT fk_ConversationId FOREIGN KEY (smConversationId) REFERENCES pfuser.SlackConversation(conversationId) ON DELETE CASCADE
)
GO

CREATE TABLE pfuser.SlackArchiveRuns (
	sarTenantId INT NOT NULL,
	sarAmsarId INT NOT NULL,
	sarConversationId NVARCHAR(32) NOT NULL,
	sarStartDate DATETIME NOT NULL,
	sarEndDate DATETIME NULL,
	sarOffset NVARCHAR(32) NULL,
	sarStatus INT NULL,
	CONSTRAINT pk_SlackArchiveRuns PRIMARY KEY (sarAmsarId,sarConversationId)
--	CONSTRAINT fk_TenantId FOREIGN KEY (sarTenantId) REFERENCES pfuser.Tenant(tenId) ON DELETE CASCADE
--	CONSTRAINT fk_Amsar FOREIGN KEY (sarAmsarId) REFERENCES pfuser.ArchiveMailServerAgentRuns(amsarId) ON DELETE CASCADE
--	CONSTRAINT fk_ConversationId FOREIGN KEY (sarConversationId) REFERENCES pfuser.SlackConversation(conversationId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_SlackArchiveRuns ON pfuser.SlackArchiveRuns(sarConversationId)
GO

CREATE SEQUENCE pfuser.PersistentChatSyncState_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.PersistentChatSyncState (
	pcssTenId INT NOT NULL,
	pcssType INT NOT NULL,
	pcssTeamId VARCHAR(255),
	pcssChannelId VARCHAR(255) NOT NULL,
	pcssDateLastUpdate DATETIME NOT NULL,
    pcssDateLastMessage	DATETIME NOT NULL,
    pcssTimestampLastMessage VARCHAR(255) NOT NULL,
	pcssStatus INT NOT NULL,
	pcssAgentRunId INT NOT NULL,
	pcssToken1	NVARCHAR(255) NULL,
	pcssToken2  NVARCHAR(255) NULL,
	pcssToken3	NVARCHAR(255) NULL,
	pcssToken4	NVARCHAR(255) NULL,
	pcssToken5	NVARCHAR(255) NULL,
	pcssToken6	NVARCHAR(255) NULL,
	pcssToken7	NVARCHAR(255) NULL,
	pcssToken8	NVARCHAR(255) NULL,
	CONSTRAINT pk_PersistentChatSyncState PRIMARY KEY (pcssChannelId, pcssTenId)
--	CONSTRAINT fk_TenantId FOREIGN KEY (pcssTenId) REFERENCES pfuser.Tenant(tenId) ON DELETE CASCADE
--	CONSTRAINT fk_AgentRunId FOREIGN KEY (pcssAgentRunId) REFERENCES pfuser.PersistentChatUserRuns(pcurAmsId) ON DELETE CASCADE
)
GO

CREATE SEQUENCE pfuser.SelectiveArchiveSearch_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.SelectiveArchiveSearch (
    sasId INT NOT NULL,
    sasTenantId INT NOT NULL,
    sasWorkspaceId INT NOT NULL,
    sasUContextDataSourceId INT NOT NULL,
    sasCaseDataSourceId INT NOT NULL,
    sasSearchName NVARCHAR(255) NOT NULL,
    sasCreatedDate DATETIME NOT NULL,
    sasLastUpdateDate DATETIME NOT NULL,
    sasStatus INT NOT NULL,
    sasFoundInSearch INT,
    sasDownloadedCount INT,
    sasPreservedCount INT,
    CONSTRAINT pk_SelectiveArchiveSearch PRIMARY KEY (sasId)
--  CONSTRAINT fk_TenantId FOREIGN KEY (sasTenantId) REFERENCES pfuser.Tenant(tenId) ON DELETE CASCADE
--  CONSTRAINT fk_ucdsId FOREIGN KEY (sasUContextDataSourceId) REFERENCES pfuser.UContextDataSource(ucdsId) ON DELETE CASCADE
--  CONSTRAINT fk_WorkspaceId FOREIGN KEY (sasWorkspaceId) REFERENCES pfuser.UContext(contextId) ON DELETE CASCADE
)
GO

CREATE SEQUENCE pfuser.SelectiveArchiveRuns_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.SelectiveArchiveRuns (
    runId INT NOT NULL,
    runSASearchId INT NOT NULL,
    runStartTime DATETIME NOT NULL,
    runEndTime DATETIME,
    runLastUpdate DATETIME NOT NULL,
    runFoundInSearch INT,
    runItemsDownloaded INT,
    runFailed INT,
    runClusterName NVARCHAR(64),
    runStatusMsg NVARCHAR(255),
    CONSTRAINT pk_SelectiveArchiveRuns PRIMARY KEY (runId)
--  CONSTRAINT fk_SearchId FOREIGN KEY (runSASearchId) REFERENCES pfuser.SelectiveArchiveSearch(sasId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_SelectiveArchiveRuns ON pfuser.SelectiveArchiveRuns(runSASearchId)
GO

CREATE SEQUENCE pfuser.SelectiveArchiveItems_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.SelectiveArchiveItems (
    itemId BIGINT NOT NULL,
    itemSASearchId INT NOT NULL,
    itemInplaceRefId VARCHAR(255) NOT NULL,
    itemRefId VARCHAR(255),
    itemItemType INT NOT NULL,
    itemEntityType INT NOT NULL,
    itemSourceItemId VARCHAR(255),
    itemCreatedDate DATETIME NOT NULL,
    itemLastUpdateDate DATETIME NOT NULL,
    itemStatus INT NOT NULL,
    itemRetryCount INT NOT NULL,
    itemPropVal1 NVARCHAR(255),
    itemPropVal2 NVARCHAR(255),
    itemPropVal3 NVARCHAR(255),
    itemPropVal4 NVARCHAR(255),
    CONSTRAINT pk_SelectiveArchiveItems PRIMARY KEY (itemId)
--  CONSTRAINT fk_SearchId FOREIGN KEY (itemSASearchId) REFERENCES pfuser.SelectiveArchiveSearch(sasId) ON DELETE CASCADE
)
GO

CREATE INDEX i1_SelectiveArchiveItems ON pfuser.SelectiveArchiveItems(itemInplaceRefId,itemSASearchId,itemStatus,itemRetryCount)
GO

CREATE SEQUENCE pfuser.legacyChatSyncState_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.legacyChatSyncState (
    lcssTenantId INT NOT NULL,
    lcssType INT NOT NULL,
	lcssChatId VARCHAR(255) NOT NULL,
	lcssZlpUserId INT NOT NULL,
	lcssCredName VARCHAR(255) NOT NULL,
	lcssCreatedDateTime DATETIME,
    lcssLastModifiedDateTime DATETIME,
    lcssCrawlStartDateTime DATETIME NOT NULL,
    lcssCrawlEndDateTime DATETIME NOT NULL,
    lcssLastCrawlDateTime DATETIME,
	lcssStatus INT NOT NULL,
	lcssRetry INT NOT NULL,
	lcssVal1	NVARCHAR(255) NULL,
	lcssVal2	NVARCHAR(255) NULL,
	lcssVal3	NVARCHAR(255) NULL,
	lcssVal4	NVARCHAR(255) NULL,
	lcssVal5	NVARCHAR(255) NULL,
	lcssVal6	NVARCHAR(255) NULL,
	lcssVal7	NVARCHAR(255) NULL,
	lcssVal8	NVARCHAR(255) NULL,
	CONSTRAINT pk_legacyChatSyncState PRIMARY KEY (lcssCrawlStartDateTime, lcssChatId, lcssTenantId)
)
GO

-- OPTIONAL
CREATE SEQUENCE pfuser.ZViteInfo_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO

CREATE TABLE pfuser.ZViteInfo (
    -- IDENTITY
    zviId                     BIGINT NOT NULL,
    zviExternalId             VARCHAR(64) NOT NULL, 
    zviTenantId				  INT NOT NULL,
    zviOwner                  NVARCHAR(255) NOT NULL,
    zviSender                 NVARCHAR(255) NULL,
    zviResourceType	          VARCHAR(32) NOT NULL,
    zviResourceSubType	      VARCHAR(32) NULL,
    zviResourceId             NVARCHAR(255) NOT NULL,
    zviResourceLang             VARCHAR(10) NULL,
    zviAccessType	      VARCHAR(32) NOT NULL,
    zviAccessId	              INT NULL,
    zviFlag		      INT NOT NULL,
    zviDeleted	              CHAR(1) NOT NULL,
    zviVal1                   NVARCHAR(255) NULL,
    zviVal2		      NVARCHAR(255) NULL,
    zviVal3		      NVARCHAR(255) NULL,
    CONSTRAINT pk_ZViteINfo PRIMARY KEY (zviId),
    CONSTRAINT uk_ZViteINfo UNIQUE (zviExternalId)
)
GO
-- STORAGE (INITIAL 25M NEXT 250M MINEXTENTS 1 MAXEXTENTS 30 PCTINCREASE 0) PCTFREE 5

CREATE INDEX i1_ZViteInfo ON pfuser.ZViteInfo(zviResourceId)
GO

CREATE INDEX i2_ZViteInfo ON pfuser.ZViteInfo(zviAccessId)
GO


-- OPTIONAL
CREATE SEQUENCE pfuser.ZViteAccess_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.ZViteAccess (
    -- IDENTITY
    zvaId                     BIGINT NOT NULL,
    zvaStId		      VARCHAR(64) NOT NULL,
    zvaAccessType	      VARCHAR(32) NOT NULL,
    zvaStatus			  INT NOT NULL,
    zvaStatusModDate	 DATETIME  NOT NULL,
    zvaUser	              VARCHAR(255) NULL,
    zvaHashedPwd              VARBINARY(32) NULL,    
    zvaPwdHint                NVARCHAR(255) NULL,
    zvaCreateDate             DATETIME NOT NULL,
    zvaStartDate              DATETIME NOT NULL,
    zvaEndDate                DATETIME NULL,
    zvaVal1		      NVARCHAR(255) NULL,
    zvaVal2		      NVARCHAR(255) NULL,
    CONSTRAINT pk_ZVA PRIMARY KEY (zvaId), 
    CONSTRAINT uk_ZVA UNIQUE (zvaStId)
)
GO
-- STORAGE (INITIAL 25M NEXT 250M MINEXTENTS 1 MAXEXTENTS 30 PCTINCREASE 0) PCTFREE 5

CREATE INDEX i1_ZVA ON pfuser.ZViteAccess(zvaEndDate)
GO


CREATE TABLE pfuser.ZViteAuditTrail (
    zvatInfoId                INT NOT NULL,
    zvatAction   	      INT NOT NULL,
    zvatDate		      DATETIME NOT NULL,
    zvatSubResourceId	      VARCHAR(255) NULL,
    zvatComment		      NVARCHAR(255) NULL
)
GO
-- STORAGE (INITIAL 25M NEXT 250M MINEXTENTS 1 MAXEXTENTS 30 PCTINCREASE 0) PCTFREE 5

CREATE INDEX i1_ZVAT ON pfuser.ZViteAuditTrail(zvatInfoId)
GO


CREATE SEQUENCE pfuser.PartnerRegApproval_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO



CREATE TABLE pfuser.PartnerRegApproval (
    prpaId			INT NOT NULL,
    prpaEntityType		INT NOT NULL,
    prpaEntity  		VARCHAR(255) NOT NULL,
    prpaDomainId 		INT NOT NULL,
    prpaTenantId 		INT NOT NULL,
    prpaApproval  		INT NOT NULL,
    prpaAuthType		INT NOT NULL,
    prpaAuthInfo		VARBINARY(255) NULL,
    prpaAdminZlpUserId  INT  NULL,
    prpaCreateDate		DATETIME NOT NULL,
    prpaExpiryDate		DATETIME NULL,
    prpaRequestId		INT NULL,
    prpaRequestCount	INT NULL,
    prpaLastUpdate		DATETIME NOT NULL,
    CONSTRAINT pk_PRPA PRIMARY KEY (prpaId),
    CONSTRAINT uk_PRPA UNIQUE (prpaEntityType,prpaEntity)
)
GO

CREATE INDEX i3_PRPA ON pfuser.PartnerRegApproval(prpaExpiryDate)
GO
CREATE INDEX i4_PRPA ON pfuser.PartnerRegApproval(prpaTenantId)
GO





-- ***************************
--	PartRegRequests
-- ***************************

CREATE SEQUENCE pfuser.PartnerRegRequests_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.PartnerRegRequests (
    prrId                   	INT NOT NULL,
    prrEmailAddress         	VARCHAR(255) NOT NULL,
    prrState                	INT NOT NULL,
    prrLanguage		NVARCHAR(10) NULL,
    prrDomainId             	INT NOT NULL,
    prrTenantId		INT NOT NULL,
    prrAuthInfo		VARCHAR(255) NULL,
    prrAdminZlpUserId	INT NULL,
    prrCreateDate            	DATETIME NOT NULL,
    prrComments              	NVARCHAR(255) NULL,
    prrLastUpdate            	DATETIME NOT NULL,
    prrRetryDate	  	DATETIME NULL,
    prrSourceIP 	NVARCHAR(64) NULL,
    prrVal1	NVARCHAR(255) NULL,
    prrVal2	NVARCHAR(255) NULL,
    prrVal3	NVARCHAR(255) NULL,
    prrVal4	NVARCHAR(255) NULL,
    CONSTRAINT pk_PartRegReq PRIMARY KEY (prrId)
)
GO

CREATE INDEX i1_PartRegReq ON pfuser.PartnerRegRequests(prrEmailAddress)
GO



CREATE SEQUENCE pfuser.ZLShareItem_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.ZLShareItem (
	siUid		INT NOT NULL,
	siZlpUserId           INT NOT NULL,
	siType                	INT NOT NULL,
	siAuthType           INT NOT NULL,
	siLanguage          	NVARCHAR(10) NULL,
	siFrom                	NVARCHAR(255) NULL,
	siTo                   	NVARCHAR(255) NULL,
	siSubject            	NVARCHAR(255) NULL,
	siDateCreate       	DATETIME NOT NULL,
	siFlags 		INT NOT NULL,
	siDateAccessStart DATETIME NULL,
	siDateAccessEnd	DATETIME NULL,
	siReference          NVARCHAR(255) NULL,
    CONSTRAINT pk_ShareItem PRIMARY KEY (siUid)
)
GO


CREATE INDEX i2_ShareItem ON pfuser.ZLShareItem(siZlpUserId,siAuthType)
GO




-- *************************************************************************************
--	Case 
-- *************************************************************************************


CREATE SEQUENCE pfuser.Case_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.CaseInfo (
	caseId		INT NOT NULL,
	caseOwnerZlpUserId INT NOT NULL,
	caseJournalDomainId	INT NOT NULL,
	caseTenantId INT NOT NULL,
	caseName	        NVARCHAR(255) NOT NULL,
	caseDisplayName	        NVARCHAR(255) NOT NULL,
	caseKey 	NVARCHAR(255) NULL,
	caseJurisdiction NVARCHAR(255) NULL,
	caseDockNumber	 NVARCHAR(255) NULL,
	caseCreatorZlpUserId INT NOT NULL,
	caseInAttyZlpUserId INT  NULL,
	caseInParaLegal	 INT  NULL,
	caseOutCounsel  NVARCHAR(255) NULL,
	caseITZlpUserId INT NULL,
	caseState	INT NOT NULL,
	caseFlags	INT NOT NULL,
	caseCategory INT NOT NULL,
	casePurgeDate	DATETIME NULL,
	caseCreateDate	DATETIME NOT NULL,
	caseFileDate	DATETIME NOT NULL,
	caseLastUpdate	DATETIME NOT NULL,
	caseDeleted 	CHAR(1) NOT NULL,
	caseSchemaId	INT NOT NULL,
	caseItemSchemaId	INT NOT NULL,
	caseUserDataId	INT NOT NULL,
	caseNotesVal1	NVARCHAR(255) NULL,
	caseNotesVal2	NVARCHAR(255) NULL,
	caseNotesVal3	NVARCHAR(255) NULL,
	caseNotesVal4	NVARCHAR(255) NULL,
	caseParamVal1	NVARCHAR(255) NULL,
	caseParamVal2	NVARCHAR(255) NULL,
	caseParamVal3	NVARCHAR(255) NULL,
	caseExcludeTagIds	VARCHAR(255) NULL, 
	caseBulkRcptCount	INT NOT NULL, 
	caseLegalHoldSyncDate	DATETIME NULL,
	caseItemSyncDate	DATETIME NULL,
	CONSTRAINT pk_CaseInfo PRIMARY KEY(caseId),
--	CONSTRAINT fk_CaseInfoJDomain FOREIGN KEY (caseJournalDomainId) REFERENCES pfuser.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseInfoZLPUser FOREIGN KEY (caseOwnerZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
	CONSTRAINT uk2_CaseInfo UNIQUE (caseTenantId,caseName)
)
GO
CREATE INDEX i1_CaseInfo ON pfuser.CaseInfo(caseJournalDomainId)
GO




CREATE TABLE pfuser.CasePrivileges (
	cpCaseId INT NOT NULL,
        cpPrivilegeFlags INT NOT NULL,
        cpEntityId INT NOT NULL,
	cpEntityType INT NOT NULL,
--	CONSTRAINT fk_CasePriv FOREIGN KEY (cpCaseId) REFERENCES pfuser.CaseInfo(caseId) ON DELETE CASCADE,
	CONSTRAINT uk_CasePriv UNIQUE (cpCaseId,cpEntityId,cpEntityType)
)
GO

CREATE INDEX i1_CasePriv ON pfuser.CasePrivileges(cpCaseId)
GO
CREATE INDEX i2_CasePriv  ON pfuser.CasePrivileges(cpEntityId,cpEntityType)
GO


CREATE TABLE pfuser.CaseUserPreference (
	cupZlpUserId 		INT NOT NULL,
	cupFlags			INT NOT NULL,
	cupVal1		NVARCHAR(255) NULL,
	cupVal2		NVARCHAR(255) NULL,
	cupVal3		NVARCHAR(255) NULL,
	cupVal4		NVARCHAR(255) NULL,	
	CONSTRAINT pk_CaseUser PRIMARY KEY (cupZlpUserId)
--,
--	CONSTRAINT fk_CaseUser FOREIGN KEY (cupZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO


CREATE TABLE pfuser.CaseUserSubscription (
	cusAcctNo 		INT NOT NULL,
	cusCaseId		INT NOT NULL,
	cusDate			DATETIME NOT NULL,
	CONSTRAINT pk_CaseUsSub PRIMARY KEY (cusAcctNo,cusCaseId)
--,
--	CONSTRAINT fk_CaseUserSub FOREIGN KEY (cupCaseId) REFERENCES pfuser.CaseInfo(caseId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_CaseUserAcct FOREIGN KEY (cupAcctNo) REFERENCES pfuser.ZipAccount(zaAcctNo) ON DELETE CASCADE
)
GO



-- OPTIONAL
CREATE SEQUENCE pfuser.CaseDataSource_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.CaseDataSource (
	-- IDENTITY
	srcId		BIGINT NOT NULL,
	srcParentId	INT NOT NULL,
	srcName		NVARCHAR(255) NOT NULL,
	srcDisplayName		NVARCHAR(255) NULL,
	srcCaseId 	INT NOT NULL,
	srcSrchStoreId INT NOT NULL,
	srcPurpose VARCHAR(32) NOT NULL,
	srcType		VARCHAR(32),
	srcDateCreate	DATETIME NOT NULL,
	srcUpdate	DATETIME NOT NULL,
	srcVaultItemId	VARCHAR(128) NULL,
	srcVaultPwd 	VARBINARY(255) NULL,
	srcDeleted	CHAR(1) NOT NULL,
	srcFedFlag INT NULL,
	srcFedParamVal1 NVARCHAR(255) NULL,
	srcFedParamVal2 NVARCHAR(255) NULL,
	srcFedParamVal3 NVARCHAR(255) NULL,
	srcFedParamVal4 NVARCHAR(255) NULL,
	srcFedParamVal5 NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseDataSource PRIMARY KEY (srcId),
	CONSTRAINT uk_CaseDataSource UNIQUE (srcCaseId,srcName)
)
GO
CREATE INDEX i1_CaseDataSource ON pfuser.CaseDataSource(srcVaultItemId)
GO


CREATE SEQUENCE pfuser.CaseDataSourceRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.CaseDataSourceRuns (
	runId		INT NOT NULL,
	runSrcId		INT NOT NULL,
	runCaseId 	INT NOT NULL,
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
	runItemNotFound	INT NULL,
	runIItemErrors	INT NULL,
	runImportStatusMsg NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseDataSrcRuns PRIMARY KEY (runId)
)
GO
CREATE INDEX i1_CaseDataSrcRuns ON pfuser.CaseDataSourceRuns(runCaseId,runSrcId)
GO


CREATE TABLE pfuser.CaseDataSourceScheduledRuns (
	schedSrcId	INT NOT NULL,
	schedIntervalSec INT NOT NULL,
	schedDateStart	DATETIME NOT NULL,
	schedDateExpiry DATETIME NULL,
	schedIterations	INT NULL,
	CONSTRAINT pk_CaseDataSourceScheduledRuns PRIMARY KEY (schedSrcId)
)
GO









CREATE TABLE pfuser.CaseItem (
	caseItemCaseId INT NOT NULL,	
	caseItemId	INT NOT NULL,
	caseItemType	INT NOT NULL,
	caseItemSrcIds  VARCHAR(255) NULL,
	caseItemRunIds  VARCHAR(255) NULL,
    caseItemRefItemId VARCHAR(128) NOT NULL,
    caseItemSize 	BIGINT NOT NULL,
	caseItemFlags   INT NOT NULL,
    caseItemTagType INT NOT NULL,
    caseItemTagIds VARCHAR(255) NULL,
	caseItemExpTagIds VARCHAR(255) NULL,
	caseItemCreateDate    DATETIME  NOT NULL,
	caseItemProcessDate    DATETIME  NOT NULL,
    caseItemLastUpdate    DATETIME  NOT NULL,
	caseItemUserDataId	INT NOT NULL,
	caseItemParamVal1			NVARCHAR(255) NULL,
	caseItemParamVal2			NVARCHAR(255) NULL,
	caseItemParamVal3			NVARCHAR(255) NULL,
	caseItemParamVal4			NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseItem PRIMARY KEY(caseItemCaseId,caseItemId),
	CONSTRAINT uk_CaseItem UNIQUE (caseItemCaseId,caseItemRefItemId)
--,
--	CONSTRAINT fk_CaseItem FOREIGN KEY (caseItemCaseId) REFERENCES pfuser.CaseInfo(caseId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseItemSrc FOREIGN KEY (caseItemSrcId) REFERENCES pfuser.CaseDataSource(srcId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseItemRun FOREIGN KEY (caseItemRunId) REFERENCES pfuser.CaseDataSourceRuns(runId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseItemFldr FOREIGN KEY (caseItemFldrId) REFERENCES pfuser.CaseFolder(caseFldrId) ON DELETE CASCADE
)
GO
-- STORAGE (INITIAL 125M NEXT 250M MINEXTENTS 1 MAXEXTENTS 30 PCTINCREASE 0)
CREATE INDEX i1_CaseItem ON pfuser.CaseItem(caseItemRefItemId)
GO
CREATE INDEX i2_CaseItem ON pfuser.CaseItem(caseItemCaseId,caseItemLastUpdate)
GO



CREATE TABLE pfuser.CaseItemProperty (
	cipCaseId INT NOT NULL,	
	cipCaseItemId			INT NOT NULL,
	cipType				NVARCHAR(32) NOT NULL,
	cipDate			DATETIME NOT NULL,
	cipVal1			NVARCHAR(255) NULL,
	cipVal2			NVARCHAR(255) NULL,
	cipVal3			NVARCHAR(255) NULL,
	cipVal4			NVARCHAR(255) NULL,
	cipVal5			NVARCHAR(255) NULL,
	cipVal6			NVARCHAR(255) NULL,
	cipVal7			NVARCHAR(255) NULL,
	cipVal8			NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseItemProp PRIMARY KEY (cipCaseId,cipCaseItemId,cipType)
)
GO



CREATE TABLE pfuser.CaseAuditTrail (
	caAction	INT NOT NULL,
	caDate		DATETIME NOT NULL,
	caItemId	BIGINT NOT NULL,
	caRefItemId	VARCHAR(255) NULL,
	caCaseId	INT NOT NULL,
	caCaseDomainId	INT NOT NULL,
	caZlpUserId	INT NOT NULL,
	caUser		NVARCHAR(255) NOT NULL,
	caDomainId	INT NOT NULL,
	caTenantId 	INT NOT NULL,	
	caTxnId		VARCHAR(64) NOT NULL,
	caClearanceLevel	INT NOT NULL,
	caSourceIP 	VARCHAR(64) NULL,
	caDestIP   	VARCHAR(64) NULL,
	caAccessType 	VARCHAR(128) NULL,
	caZViteStId 	VARCHAR(255) NULL,
	caComments	NVARCHAR(255) NULL,
	caVal1 	NVARCHAR(255) NULL,
	caVal2 	NVARCHAR(255) NULL,
	caVal3 	NVARCHAR(255) NULL,
	caVal4 	NVARCHAR(255) NULL,
	caVal5 	NVARCHAR(255) NULL
)
GO

CREATE INDEX i1_CaseAudit ON pfuser.CaseAuditTrail(caDate)
GO
CREATE INDEX i2_CaseAudit ON pfuser.CaseAuditTrail(caDomainId)
GO
CREATE INDEX i3_CaseAudit ON pfuser.CaseAuditTrail(caItemId)
GO
CREATE INDEX i4_CaseAudit ON pfuser.CaseAuditTrail(caRefItemId)
GO
CREATE INDEX i5_CaseAudit ON pfuser.CaseAuditTrail(caZlpUserId)
GO







CREATE SEQUENCE pfuser.Custodian_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.Custodian (
	custId		INT NOT NULL,
	custCaseId	INT NOT NULL,
	custTenantId INT NOT NULL,
	custType			INT NOT NULL,
	custAddress 	NVARCHAR(255) NOT NULL,
	custZlpUserId	INT NOT NULL,
	custTerminated	CHAR(1) NOT NULL,
	custFullName		NVARCHAR(255) NOT NULL,
	custCreateDate		DATETIME NOT NULL,
	custLastUpdate		DATETIME NOT NULL,
	custExtRef	NVARCHAR(255) NULL,
	custMisc1		NVARCHAR(255) NULL,
	CONSTRAINT pk_Custodian PRIMARY KEY (custId),
--	CONSTRAINT fk_Custodian FOREIGN KEY (custCaseId) REFERENCES pfuser.CaseInfo(caseId) ON DELETE CASCADE,
--	CONSTRAINT fk_CustodianZLPUser FOREIGN KEY (custZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
 	CONSTRAINT uk_Custodian UNIQUE (custCaseId,custAddress)
)
GO
CREATE INDEX i1_custodian ON pfuser.Custodian(custZlpUserId)
GO

CREATE TABLE pfuser.CustodianAlias (	
	caAlias NVARCHAR(255) NOT NULL,
	caCustId	INT NOT NULL,
	caCaseId		INT NOT NULL,
	caType	INT NOT NULL,
	caDate 	DATETIME NOT NULL,
	CONSTRAINT pk_custAlias PRIMARY KEY (caCustId,caAlias)
--,
--	CONSTRAINT fk_custAlias FOREIGN KEY (caCaseId) REFERENCES pfuser.CaseInfo(caseId) ON DELETE CASCADE,
--	CONSTRAINT fk_custAliasCust FOREIGN KEY (caCustId) REFERENCES pfuser.Custodian(custId) ON DELETE CASCADE,
)
GO
CREATE INDEX i1_custAlias ON pfuser.CustodianAlias(caCaseId)
GO
	

CREATE SEQUENCE pfuser.CaseTag_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.CaseTag (	
	tagId		INT NOT NULL,
	tagParentId	INT NOT NULL,
	tagCaseId	INT NOT NULL,
	tagName 	NVARCHAR(255) NOT NULL,
	tagDisplayName NVARCHAR(255) NOT NULL,
	tagFlags BIGINT NOT NULL,
	tagDesc 	NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseTag PRIMARY KEY (tagId),
	CONSTRAINT uk_caseTag UNIQUE (tagCaseId,tagName)
--,
--	CONSTRAINT fk_CaseTag FOREIGN KEY (tagCaseId) REFERENCES pfuser.CaseInfo(caseId) ON DELETE CASCADE,
)
GO
	





CREATE SEQUENCE pfuser.CustodianLegalHold_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.CustodianLegalHold (
	clhId INT NOT NULL,
	clhTenantId INT NOT NULL,
	clhCaseId	INT NOT NULL,
	clhCustId	INT NOT NULL,
	clhZlpUserId	INT NOT NULL,
	clhDataSrcId	INT NOT NULL,
	clhSrchStoreId INT NOT NULL,
	clhCreateDate	DATETIME NOT NULL,
	clhSrchQueryBeginDate	DATETIME NULL,
	clhSrchQueryEndDate	DATETIME NULL,
	clhFuture	CHAR(1) NOT NULL,
	clhEndDate	DATETIME NULL,
	clhDeleted	CHAR(1) NOT NULL,
	clhNotesVal1 NVARCHAR(255) NULL,
	clhNotesVal2	NVARCHAR(255) NULL,
	clhNotesVal3 NVARCHAR(255) NULL,
	clhNotesVal4	NVARCHAR(255) NULL,
	CONSTRAINT pk_custLegalHold PRIMARY KEY (clhId),
	CONSTRAINT uk_custLegalHold UNIQUE (clhCaseId,clhCustId, clhSrchStoreId)
)
GO
CREATE INDEX i1_custLegalHold ON pfuser.CustodianLegalHold(clhZlpUserId,clhCaseId,clhFuture)
GO
CREATE INDEX i2_custLegalHold ON pfuser.CustodianLegalHold(clhCaseId,clhCustId)
GO



CREATE SEQUENCE pfuser.CaseTask_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.CaseTask (
	taskId	INT NOT NULL,
	taskType	INT NOT NULL,
	taskReferenceId VARCHAR(255) NULL,
	taskData  NVARCHAR(255) NULL,
	taskParentTaskId 	INT NOT NULL,
	taskDomainId INT NOT NULL,
	taskTenantId INT NOT NULL,
	taskSubject NVARCHAR(255) NULL,
    taskCreator VARCHAR(255) NULL,
	taskStatus   INT NOT NULL,
	taskZLPUserId INT NULL,
    taskPriority   INT NOT NULL,
	taskFlags	INT NULL,
	taskCaseId    INT NOT NULL,
    taskCreateDate    DATETIME NOT NULL,
    taskLastUpdate    DATETIME NOT NULL,
   	taskCompleteDate    DATETIME NULL,
	CONSTRAINT pk_CaseTask PRIMARY KEY (taskId)
)
GO
CREATE INDEX i1_CaseTask ON pfuser.CaseTask(taskStatus,taskDomainId,taskType,taskCreateDate)
GO
CREATE INDEX i2_CaseTask ON pfuser.CaseTask(taskParentTaskId)
GO
CREATE INDEX i3_CaseTask ON pfuser.CaseTask(taskType,taskReferenceId)
GO
CREATE INDEX i4_CaseTask ON pfuser.CaseTask(taskCaseId,taskStatus,taskCreateDate)
GO

CREATE TABLE pfuser.CaseTaskEntity (
	teTaskId	INT NOT NULL,
	teEntityType INT NOT NULL,
	teEntityId INT NOT NULL,
	teEntityStatus	INT NOT NULL,
	CONSTRAINT uk_caseTaskEntity UNIQUE (teTaskId,teEntityType,teEntityId)
)
GO

CREATE SEQUENCE pfuser.ZlCaseObject_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.ZlCaseObject (
	zlcoId			INT NOT NULL,
	zlcoSeqNumber		INT NOT NULL,
	zlcoNext		CHAR(1) NOT NULL,
	zlcoCaseId		INT NOT NULL,
	zlcoName		NVARCHAR(255) NULL,
	zlcoVal1		NVARCHAR(255) NULL,
	zlcoVal2		NVARCHAR(255) NULL,
	zlcoVal3		NVARCHAR(255) NULL,
	zlcoVal4		NVARCHAR(255) NULL,
	zlcoVal5		NVARCHAR(255) NULL,
   	CONSTRAINT pk_zlcObj PRIMARY KEY (zlcoId,zlcoSeqNumber)
)
GO
CREATE INDEX i1_zlcObj ON pfuser.ZlCaseObject(zlcoCaseId)
GO



CREATE SEQUENCE pfuser.CaseTaskAnnot_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.CaseTaskAnnotation (
	ctaId			INT NOT NULL,
	ctaType			INT NOT NULL,
	ctaTaskId		INT NOT NULL,
	ctaCaseId INT NOT NULL,
	ctaDate			DATETIME NOT NULL,
	ctaZlpUserId		INT NOT NULL,
	ctaSeqNumber		INT NOT NULL,
	ctaNext			CHAR(1) NOT NULL,
	ctaVal1			NVARCHAR(255) NULL,
	ctaVal2			NVARCHAR(255) NULL,
	ctaVal3			NVARCHAR(255) NULL,
	ctaVal4			NVARCHAR(255) NULL,
	ctaVal5			NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseTaskAnnot PRIMARY KEY (ctaId,ctaSeqNumber)
)
GO



CREATE SEQUENCE pfuser.InvRequest_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.InvestigationRequest (
	irId		INT NOT NULL,
	irName		NVARCHAR(255) NOT NULL,
	irOwnerZlpUserId	INT NOT NULL,
	irDomainId INT NOT NULL,
	irTenantId INT NOT NULL,
	irStatus	INT NOT NULL,
	irPriority INT NOT NULL,
	irReason	NVARCHAR(255) NULL,
	irDateCreate	DATETIME NOT NULL,
	irDateUpdate	DATETIME NOT NULL,
	irVaultItemId	VARCHAR(128) NULL,
	irVaultPwd 	VARBINARY(255) NULL,
	irCaseId INT NULL,
	CONSTRAINT pk_InvReq PRIMARY KEY (irId),
	CONSTRAINT uk_InvReq UNIQUE (irOwnerZlpUserId,irName)
)
GO

CREATE INDEX i1_InvReq ON pfuser.InvestigationRequest(irVaultItemId)
GO



CREATE SEQUENCE pfuser.CaseTaskAuditTrail_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO




CREATE TABLE pfuser.CaseTaskAuditTrail (
	ctaId		INT NOT NULL,
	ctaDate		DATETIME NOT NULL,
	ctaAction		INT NOT NULL,
	ctaZlpUserId	INT NOT NULL,
	ctaUser		NVARCHAR(255) NOT NULL,
	ctaTaskId	INT NOT NULL,
	ctaDomainId	INT NOT NULL,
	ctaTenantId INT NOT NULL,
	ctaCaseId	INT NOT NULL,
	ctaTaskDomainId	INT NOT NULL,
	ctaTaskType	INT NOT NULL,
	ctaRefItemId	VARCHAR(255) NULL,
	ctaTxnId		VARCHAR(64) NOT NULL,
	ctaClearanceLevel	INT NOT NULL,
	ctaSourceIP 	VARCHAR(64) NULL,
	ctaDestIP   	VARCHAR(64) NULL,
	ctaAccessType 	VARCHAR(128) NULL,
	ctaZViteStId 	VARCHAR(255) NULL,
	ctaComments	NVARCHAR(255) NULL,
	ctaVal1 	NVARCHAR(255) NULL,
	ctaVal2 	NVARCHAR(255) NULL,
	ctaVal3 	NVARCHAR(255) NULL,
	ctaVal4 	NVARCHAR(255) NULL,
	ctaVal5 	NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseTaskAudTrail PRIMARY KEY(ctaId)
)
GO


CREATE INDEX i1_CaseTaskAudTrail ON pfuser.CaseTaskAuditTrail(ctaDate)
GO
CREATE INDEX i2_CaseTaskAudTrail ON pfuser.CaseTaskAuditTrail(ctaDomainId)
GO
CREATE INDEX i3_CaseTaskAudTrail ON pfuser.CaseTaskAuditTrail(ctaCaseId)
GO
CREATE INDEX i4_CaseTaskAudTrail ON pfuser.CaseTaskAuditTrail(ctaTaskType,ctaRefItemId)
GO
CREATE INDEX i5_CaseTaskAudTrail ON pfuser.CaseTaskAuditTrail(ctaZlpUserId)
GO
CREATE INDEX i6_CaseTaskAudTrail ON pfuser.CaseTaskAuditTrail(ctaTaskId)
GO




CREATE SEQUENCE pfuser.SurveyForm_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.SurveyForm (
	sfId		INT NOT NULL,
	sfIdVersion		INT NOT NULL,
	sfCaseId	INT NOT NULL,
	sfTenantId 	INT NOT NULL,
	sfZlpUserId	INT NOT NULL,
	sfType 	NVARCHAR(255) NOT NULL,
	sfName		NVARCHAR(255) NOT NULL,
	sfDisplayName	NVARCHAR(255) NOT NULL,
	sfDateCreate	DATETIME NOT NULL,
	sfLastUpdate	DATETIME NOT NULL,
	sfReleaseDate	DATETIME NULL,
	sfFlags	INT NOT NULL,
	sfStatus	INT NOT NULL,
	sfApprovalId	INT NOT NULL,
	sfRemindParam NVARCHAR(255) NULL,
	sfRecur	CHAR(1)  NOT NULL,
	sfRecurParam	NVARCHAR(255) NULL,
	sfRandomize	CHAR(1)  NULL,
	sfDuration		INT  NOT NULL,
	sfCurrentRunId	INT NULL,
	sfAttachVaultId	VARCHAR(128) NULL,
	sfAttachVaultPwd 	VARBINARY(255) NULL,
	sfReleaseAttachVaultId	VARCHAR(128) NULL,
	sfReleaseAttachVaultPwd 	VARBINARY(255) NULL,
	CONSTRAINT pk_surForm PRIMARY KEY(sfId),
	CONSTRAINT uk2_surForm UNIQUE(sfCaseId,sfName,sfTenantId)
)
GO
CREATE INDEX i1_surForm ON pfuser.SurveyForm(sfAttachVaultId)
GO
CREATE INDEX i2_surForm ON pfuser.SurveyForm(sfReleaseAttachVaultId)
GO


CREATE SEQUENCE pfuser.SurveyFormVersion_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser.SurveyFormVersion (
	sfvId		INT NOT NULL,
	sfvFormId		INT NOT NULL,
	sfvCaseId	INT NOT NULL,
	sfvTenantId 	INT NOT NULL,
	sfvZlpUserId	INT NOT NULL,
	sfvDateCreate	DATETIME NOT NULL,
	sfvLastUpdate	DATETIME NOT NULL,
	sfvFlags	INT NOT NULL,
	sfvStatus	INT NOT NULL,
	sfvApprovalId	INT NOT NULL,
	sfvRandomize	CHAR(1)  NULL,
	sfvDuration		INT  NOT NULL,
	sfvAttachVaultId	VARCHAR(128) NULL,
	sfvAttachVaultPwd 	VARBINARY(255) NULL,
	sfvReleaseAttachVaultId	VARCHAR(128) NULL,
	sfvReleaseAttachVaultPwd 	VARBINARY(255) NULL,
	CONSTRAINT pk_surFormVer PRIMARY KEY(sfvFormId,sfvId)
)
GO
CREATE INDEX i1_surFormVer ON pfuser.SurveyFormVersion(sfvAttachVaultId)
GO
CREATE INDEX i2_surFormVer ON pfuser.SurveyFormVersion(sfvReleaseAttachVaultId)
GO






CREATE TABLE pfuser.SurveyFormObject (
	 objId		INT NOT NULL,
	 objSfId	INT NOT NULL,
	 objSfVerId	INT NOT NULL,
	 objCaseId	INT NOT NULL,
	objType		INT NOT NULL,
 	objGroupId	INT NOT NULL,
	objQuesNo	INT NOT NULL,
	CONSTRAINT uk_surFormObj UNIQUE(objSfId,objSfVerId,objId)
)
GO

CREATE INDEX i1_surFormObj ON pfuser.SurveyFormObject(objCaseId)
GO




CREATE TABLE pfuser.CustodianSurvey (
	csCaseId	INT NOT NULL,
	csSfId		INT NOT NULL,
	csSfVerId		INT NOT NULL,
	csZlpUserId 	INT NOT NULL,
	csApprovalId 	INT NOT NULL,
	csDateCreate 	DATETIME NOT NULL,
	csDateUpdate 	DATETIME NOT NULL,
	csDateExpiry	DATETIME NULL,
	csStartDate 	DATETIME NULL,
	csEndDate	DATETIME NULL,
	csFlags INT NOT NULL,
	csStatus	INT NOT NULL,
	csFeedback	NVARCHAR(255) NULL,
	csAuthMethod	INT NOT NULL,
	csPassword 	NVARCHAR(255) NULL,
	csEscalateStateVal1 NVARCHAR(255) NULL,
	csEscalateStateVal2 NVARCHAR(255) NULL,
	csEscalateStateVal3 NVARCHAR(255) NULL,
	csEscalateStateVal4 NVARCHAR(255) NULL,
	CONSTRAINT pk_custSurvey PRIMARY KEY(csCaseId,csSfId,csSfVerId,csZlpUserId)
)
GO





CREATE TABLE pfuser.CustodianSurveyAnswers (
	csaCaseId	INT NOT NULL,
	csaSfId		INT NOT NULL,
	csaSfVerId		INT NOT NULL,
	csaZlpUserId 	INT NOT NULL,
	csaRunId		INT NOT NULL,
	csaQuesObjId	INT NOT NULL,
	csaDateCreate 	DATETIME NOT NULL,
	csaDateUpdate 	DATETIME NOT NULL,
	csaAnswer	NVARCHAR(1024)  NULL,
	csaSourceIP 	VARCHAR(64) NULL,
	csaDestIP   	VARCHAR(64) NULL,
	csaComments	NVARCHAR(1024)  NULL,
	CONSTRAINT pk_CustSurAns PRIMARY KEY(csaCaseId,csaSfId,csaSfVerId,csaZlpUserId,csaRunId,csaQuesObjId)
)
GO


CREATE TABLE pfuser.CustodianSurveyAction (
	csaCaseId	INT NOT NULL,
	csaSfId		INT NOT NULL,
	csaSfVerId		INT NOT NULL,
	csaZlpUserId INT NULL,
	csaRunId		INT NOT NULL,
	csaAction		INT NOT NULL,
	csaDate	 	DATETIME NOT NULL,
	csaComments	NVARCHAR(255)  NULL
)
GO
CREATE INDEX i1_CustSurAct ON pfuser.CustodianSurveyAction(csaCaseId, csaSfId,csaSfVerId,csaRunId)
GO

CREATE TABLE pfuser.CaseRedaction (
	craCaseId INT NOT NULL,	
	craCaseItemId INT NOT NULL,
	craCreateDate DATETIME NOT NULL,
	craLastUpdate DATETIME NOT NULL,
	craCreatorZlpUserId INT NOT NULL,
	craLastUpdateZlpUserId INT NOT NULL,
	craVaultItemId	VARCHAR(128) NULL,
	craVaultPwd 	VARBINARY(255) NULL,
	CONSTRAINT pk_CaseRedact PRIMARY KEY(craCaseId,craCaseItemId)
)
GO

CREATE INDEX i1_CaseRedact ON pfuser.CaseRedaction(craVaultItemId)
GO



-- OPTIONAL
CREATE SEQUENCE pfuser.CaseSchema_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.CaseSchema (
	-- IDENTITY
	csSchemaId BIGINT NOT NULL,
	csTenantId INT NOT NULL,
	csCaseId 	INT NOT NULL,
	csSchemaName			NVARCHAR(255) NOT NULL,
	csSchemaDispName			NVARCHAR(255) NOT NULL,
	CONSTRAINT pk_caseSchema PRIMARY KEY(csSchemaId),
	CONSTRAINT uk_caseSchema UNIQUE(csTenantId,csSchemaName)
)
GO

CREATE TABLE pfuser.CaseSchemaFields (
	csfSchemaId	INT NOT NULL,
	csfName			VARCHAR(128) NOT NULL,
	csfSeq	INT NOT NULL,
	csfDesc		NVARCHAR(255) NULL,
	csfType			VARCHAR(128) NOT NULL,
	csfInputType	VARCHAR(128) NOT NULL,
	csfInputParamVal1		NVARCHAR(255) NULL,
	csfInputParamVal2		NVARCHAR(255) NULL,
	csfInputParamVal3		NVARCHAR(255) NULL,
	csfFormula	NVARCHAR(255) NULL,
	csfMandatory	CHAR(1) NOT NULL,
	CONSTRAINT pk_caseSchFld PRIMARY KEY(csfSchemaId,csfName)
)
GO


CREATE SEQUENCE pfuser.CaseUserData_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.CaseUserData (
	cudId			BIGINT  NOT NULL,
	cudCaseId		INT NOT NULL,
	cudCaseItemId	INT  NOT NULL,
	cudSeqNumber	INT NOT NULL,
	cudNext			CHAR(1) NOT NULL,
	cudVal1			NVARCHAR(255) NULL,
	cudVal2			NVARCHAR(255) NULL,
	cudVal3			NVARCHAR(255) NULL,
	cudVal4			NVARCHAR(255) NULL,
	cudVal5			NVARCHAR(255) NULL,
	cudVal6			NVARCHAR(255) NULL,
	cudVal7			NVARCHAR(255) NULL,
	cudVal8			NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseUserData PRIMARY KEY (cudId,cudSeqNumber)
)
GO

-- OPTIONAL
CREATE SEQUENCE pfuser.ReviewPhase_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.ReviewPhase (
	-- IDENTITY
        rpId BIGINT NOT NULL,
        rpIdSeq INT NOT NULL,
        rpCaseId INT NOT NULL,
        rpName	NVARCHAR(255) NOT NULL,
        rpDesc	NVARCHAR(255) NULL,
 		rpFlags INT NOT NULL,
        rpCreateDate DATETIME NOT NULL,
	CONSTRAINT pk_RevPh PRIMARY KEY (rpId),
	CONSTRAINT uk_RevPh UNIQUE (rpCaseId,rpName),
	CONSTRAINT uk2_RevPh UNIQUE (rpCaseId,rpIdSeq)
)
GO
-- Storage (initial 5M NEXT 5M MINEXTENTS 1 MAXEXTENTS 20 PCTINCREASE 33) PCTFREE 5


-- OPTIONAL
CREATE SEQUENCE pfuser.ReviewBucket_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.ReviewBucket (
	-- IDENTITY
        rbId BIGINT NOT NULL,
        rbPhaseId INT NOT NULL,
        rbCaseId INT NOT NULL,
        rbState	INT NOT NULL,
        rbName	NVARCHAR(255) NOT NULL,
        rbDesc	NVARCHAR(255) NULL,
        rbFlags BIGINT NOT NULL,
        rbCreateDate DATETIME NOT NULL,
        rbUpdateDate DATETIME NOT NULL,
	CONSTRAINT pk_RevBucket PRIMARY KEY (rbId),
	CONSTRAINT uk_RevBucket UNIQUE (rbCaseId,rbName)
)
GO
-- Storage (initial 5M NEXT 5M MINEXTENTS 1 MAXEXTENTS 20 PCTINCREASE 33) 


CREATE TABLE pfuser.ReviewBucketItem (
	rbiCaseId INT NOT NULL,	
	rbiCaseItemId	INT NOT NULL,
	rbiBucketId	INT NOT NULL,
	rbiRunId INT NOT NULL,
	rbiAddDate DATETIME NOT NULL,
	rbiActionUpdate DATETIME NOT NULL,
	rbiState	INT NOT NULL,
	rbiZlpUserId INT NOT NULL,
	rbiActionFlags	BIGINT NOT NULL,
	rbiTagAction VARCHAR(255) NULL,
	rbiAutomatedAction VARCHAR(255) NULL,
	rbiMoved CHAR(1) NOT NULL,
	rbiNextPhase INT NULL,
	CONSTRAINT pk_ZRevBucItem PRIMARY KEY(rbiCaseId,rbiCaseItemId,rbiBucketId)
)
GO

CREATE INDEX i1_ZRevBucItem ON pfuser.ReviewBucketItem(rbiBucketId,rbiMoved,rbiState)
GO
CREATE INDEX i2_ZRevBucItem ON pfuser.ReviewBucketItem(rbiCaseId,rbiMoved)
GO


CREATE SEQUENCE pfuser.RevBucImpRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.ReviewBucketImportRun (
	runId		INT NOT NULL,
	runBucketId 	INT NOT NULL,
	runPhaseId 	INT NOT NULL,
	runCaseId INT NOT NULL,
    runParamVal1		      NVARCHAR(255) NULL,
  	runParamVal2		      NVARCHAR(255) NULL,
   	runParamVal3		      NVARCHAR(255) NULL,
   	runParamVal4		      NVARCHAR(255) NULL,
   	runParamVal5		      NVARCHAR(255) NULL,
   	runParamVal6		      NVARCHAR(255) NULL,
	runParamVaultId		VARCHAR(128) NULL,
	runParamVaultPwd 	VARBINARY(255) NULL,
	runMachine		NVARCHAR(255) NULL,
	runDateStart	DATETIME NULL,
	runDateUpdate	DATETIME NULL,
	runDateEnd	DATETIME NULL,
	runItemFound 	INT NULL,
	runItemImported	INT NULL,
	runItemDuplicate INT NULL,
	runItemErrors	INT NULL,
	runStatusMsg	NVARCHAR(255) NULL,
	CONSTRAINT pk_RevBucImpRun PRIMARY KEY (runId)
)
GO
CREATE INDEX i1_RevBucImpRun ON pfuser.ReviewBucketImportRun(runBucketId)
GO
CREATE INDEX i2_RevBucImpRun ON pfuser.ReviewBucketImportRun(runCaseId,runPhaseId)
GO




CREATE TABLE pfuser.CaseReviewer (
	revZlpUserid		INT NOT NULL,
	revCaseId	INT NOT NULL,
	revTenantId INT NOT NULL,
	revDate		DATETIME NOT NULL,
	revBucketIds	VARCHAR(255) NULL,
	CONSTRAINT pk_CaseReviewer PRIMARY KEY (revCaseId,revZlpUserId)
)
GO



CREATE TABLE pfuser.ConceptWordList (
	cwlCaseId		INT NOT NULL,
	cwlListId	INT NOT NULL,
	cwlScope	INT NOT NULL,
	cwlFlags		INT NOT NULL,
	cwlDesc		NVARCHAR(255),
	cwlTenantId INT NOT NULL,
	CONSTRAINT pk_ConceptWordList PRIMARY KEY (cwlCaseId,cwlListId)
)
GO


-- Collections


CREATE SEQUENCE pfuser.CustCollect_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.CustodianCollection (
		ccId	INT NOT NULL,
        ccZlpUserId INT NOT NULL,
        ccCustodianId INT NOT NULL,
        ccCaseId INT NOT NULL,
        ccSrcName NVARCHAR(255),
        ccSrcType VARCHAR(64),
        ccSrcDesc	NVARCHAR(255),
        ccProjectId	INT NOT NULL,
        ccPolicyId INT NOT NULL,
        ccCreateDate DATETIME NOT NULL,
        ccLastUpdate DATETIME NOT NULL,
        ccVal1			NVARCHAR(255) NULL,
		ccVal2			NVARCHAR(255) NULL,
		ccVal3			NVARCHAR(255) NULL,
		ccVal4			NVARCHAR(255) NULL,
		ccVal5			NVARCHAR(255) NULL,
		ccVal6			NVARCHAR(255) NULL,
		ccVal7			NVARCHAR(255) NULL,
		ccVal8			NVARCHAR(255) NULL,
	CONSTRAINT pk_CustColl PRIMARY KEY (ccId),
	CONSTRAINT uk_CustColl UNIQUE (ccZlpUserId,ccCaseId,ccSrcName),
	CONSTRAINT uk2_CustColl UNIQUE (ccProjectId)
)
GO
-- Storage (initial 5M NEXT 5M MINEXTENTS 1 MAXEXTENTS 20 PCTINCREASE 33) PCTFREE 5

CREATE INDEX i1_CustColl ON pfuser.CustodianCollection(ccCaseId,ccCustodianId)
GO




CREATE TABLE pfuser.CustCollPackage (
	ccpCollId			INT NOT NULL,
	ccpCaseId			INT NOT NULL,
	ccpVaultId 			VARCHAR(128) NOT NULL,
	ccpEncPwd 	        VARBINARY(128) NULL,
	ccpFiles			INT NOT NULL,
	ccpFlags			INT NOT NULL,
	ccpDateCreate		DATETIME NOT NULL,
	ccpLastWrite		DATETIME NOT NULL,
	ccpDeleted		CHAR(1) NOT NULL,
	CONSTRAINT pk_CustCollPkg PRIMARY KEY (ccpVaultId)
)
GO

CREATE INDEX i1_CustCollPkg ON pfuser.CustCollPackage(ccpCollId)
GO


CREATE TABLE pfuser.CcPackageAttach (
	attCollId			INT NOT NULL,
	attCaseId			INT NOT NULL,
	attPackageVaultId 			VARCHAR(128) NOT NULL,
	attVaultId			VARCHAR(128) NOT NULL,
	attEncPwd 	        VARBINARY(128) NULL,
	attDateCreate		DATETIME NOT NULL,
	CONSTRAINT pk_ccpAtt PRIMARY KEY (attVaultId)
)
GO

CREATE INDEX i1_ccpAtt ON pfuser.CcPackageAttach(attCollId,attPackageVaultId)
GO

CREATE SEQUENCE pfuser.CustCollectionRun_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.CustodianCollectionRun (
	ccrId			BIGINT NOT NULL,
	ccrCollId		INT NOT NULL,
	ccrCaseId		INT NOT NULL,
	ccrCustodianId	INT NOT NULL,
    ccrStartDate	DATETIME NOT NULL,
	ccrEndDate	DATETIME NULL,
    ccrUpdate	DATETIME NOT NULL,
    ccrFullCrawl	CHAR(1) NOT NULL,
    ccrExamined 	INT NULL,
    ccrFound 	INT NULL,
    ccrPrevFound INT NULL,
	ccrError        INT NULL,
	ccrPolicyIgnored	INT NULL,
	ccrDirError	INT NULL,
	ccrCrawlState 	NVARCHAR(255) NULL,
    ccrArchived	INT NULL,
    ccrPrevArchived INT NULL,
    ccrArchiveError	INT NULL,
	ccrStatusMessage	NVARCHAR(255) NULL,
	ccrLogVaultId	VARCHAR(128) NULL,
	ccrLogVaultPwd 	VARBINARY(255) NULL,
	CONSTRAINT pk_CustCollRuns PRIMARY KEY (ccrCollId,ccrId)
)
GO
CREATE INDEX i1_custCollRuns ON pfuser.CustodianCollectionRun(ccrStartDate)
GO
CREATE INDEX i2_custCollRuns ON pfuser.CustodianCollectionRun(ccrCaseId,ccrCustodianId)
GO




CREATE TABLE pfuser.GlobalCustodian (
	gcustZlpUserId	INT NOT NULL,
	gcustTenantId INT NOT NULL,
	gcustAddress 	NVARCHAR(255) NOT NULL,
	gcustFullName		NVARCHAR(255) NOT NULL,
	gcustCreateDate		DATETIME NOT NULL,
	gcustLastUpdate		DATETIME NOT NULL,
	gcustMisc1		NVARCHAR(255) NULL,
	CONSTRAINT pk_gcust PRIMARY KEY (gcustZlpUserId)
--	CONSTRAINT fk_gcustZLPUser FOREIGN KEY (gcustZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE,
)
GO


CREATE TABLE pfuser.GlobalCustodianAlias (	
	gcaAlias NVARCHAR(255) NOT NULL,
	gcaZlpUserId	INT NOT NULL,
	gcaTenantId	INT NOT NULL,
	gcaType	INT NOT NULL,
	gcaDate 	DATETIME NOT NULL,
	CONSTRAINT pk_gcustAlias PRIMARY KEY (gcaZlpUserId,gcaAlias)
)
GO
CREATE INDEX i1_gcustAlias ON pfuser.GlobalCustodianAlias(gcaTenantId)
GO



CREATE TABLE pfuser.CaseExport (
	ceExportTaskId	INT NOT NULL,
	ceCaseId	INT NOT NULL,
	ceStatus	INT NOT NULL,
	ceDate		DATETIME NOT NULL,
	ceTagType   INT NOT NULL,
    ceTagIds    VARCHAR(255) NULL,
	ceUpdate	DATETIME NOT NULL,
	CONSTRAINT pk_caseExport PRIMARY KEY (ceExportTaskId)
)
GO

CREATE INDEX i1_caseExport ON pfuser.CaseExport(ceCaseId)
GO


CREATE SEQUENCE pfuser.CaseSearch_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.CaseSearch (
	csId		INT NOT NULL,
	csName		NVARCHAR(255) NOT NULL,
	csDisplayName   NVARCHAR(255) NOT NULL,
	csPurpose 	VARCHAR(32) NOT NULL,
	csType		VARCHAR(255) NOT NULL,
	csReservedQuery CHAR(1) NOT NULL,
	csCaseId 	INT NOT NULL,
	csTenantId	INT NOT NULL,
	csDesc		NVARCHAR(255) NULL,
	csDate 	DATETIME NOT NULL,
	csQueryVal1 NVARCHAR(255) NULL,
	csQueryVal2 NVARCHAR(255) NULL,
	csQueryVal3 NVARCHAR(255) NULL,
	csQueryVal4 NVARCHAR(255) NULL,
	csQueryVal5 NVARCHAR(255) NULL,
	csQueryVal6 NVARCHAR(255) NULL,
	csQueryVal7 NVARCHAR(255) NULL,
	csQueryVal8 NVARCHAR(255) NULL,
	csQueryVal9 NVARCHAR(255) NULL,
	csQueryVal10 NVARCHAR(255) NULL,
	csJSONVal1 NVARCHAR(255) NULL,
	csJSONVal2 NVARCHAR(255) NULL,
	csJSONVal3 NVARCHAR(255) NULL,
	csJSONVal4 NVARCHAR(255) NULL,
	csJSONVal5 NVARCHAR(255) NULL,
	csJSONVal6 NVARCHAR(255) NULL,
	csJSONVal7 NVARCHAR(255) NULL,
	csJSONVal8 NVARCHAR(255) NULL,
	csJSONVal9 NVARCHAR(255) NULL,
	csJSONVal10 NVARCHAR(255) NULL,
	CONSTRAINT pk_CaseSearch PRIMARY KEY (csId),
	CONSTRAINT uk_CaseSearch UNIQUE (csTenantId,csCaseId,csPurpose,csName)
)
GO




CREATE TABLE pfuser.FedDocumentTransport (
	fdtRefId VARCHAR(64) NOT NULL,
	fdtRefType INT NOT NULL,
	fdtStoreId	INT NOT NULL,
	fdtDateCreate	DATETIME NOT NULL,
	fdtSize BIGINT NOT NULL,
	fdtMachine NVARCHAR(64) NULL,
	fdtState INT NOT NULL,
	fdtUpdate	DATETIME NOT NULL,
	fdtDateProcessed	DATETIME NULL,
	fdtRetry	INT NOT NULL,
	fdtRmId VARCHAR(255) NULL,
	fdtComment NVARCHAR(255) NULL,
	CONSTRAINT pk_FedDocTrans PRIMARY KEY (fdtStoreId,fdtRefType,fdtRefId)
)
GO

CREATE INDEX i1_FedDocTrans ON pfuser.FedDocumentTransport(fdtStoreId,fdtState,fdtRetry)
GO
CREATE INDEX i3_FedDocTrans ON pfuser.FedDocumentTransport(fdtState,fdtRetry)
GO


CREATE TABLE pfuser.CaseInPlaceItem (
	itemCaseId	INT NOT NULL,
	itemUnid	VARCHAR(255) NOT NULL,
	itemRefId   VARCHAR(255) NULL,
	itemRefType INT NOT NULL,
	itemStoreId	INT NOT NULL,
	itemState	INT NOT NULL,
	itemDateCreate DATETIME NOT NULL,
	itemUpdate	DATETIME NOT NULL,
	itemDateProcessed	DATETIME NULL,
	itemApesArchiveRetry	INT  NULL,
	itemRmId VARCHAR(255) NULL,
	CONSTRAINT pk_CaseIPItem PRIMARY KEY (itemCaseId,itemRefType,itemStoreId,itemUnid)
)
GO
	
CREATE INDEX i1_CaseIPItem ON pfuser.CaseInPlaceItem(itemCaseId,itemUpdate)
GO
CREATE INDEX i2_CaseIPItem ON pfuser.CaseInPlaceItem(itemStoreId,itemUnid)
GO




-- *************************************************************************************
--	Records
-- *************************************************************************************


CREATE SEQUENCE pfuser.RecordStore_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.RecordStore (
	recStoreId		INT NOT NULL,
	recStoreName 	 NVARCHAR(255) NOT NULL,
	recStoreDisplayName	        NVARCHAR(255) NOT NULL,
	recTenantId 	INT NOT NULL,
	recCreateDate	DATETIME NOT NULL,
	recStoreKey		VARCHAR(128) NOT NULL,
	recUserDataId	 BIGINT  NOT NULL,
	recDefaultSchema	VARCHAR(128) NULL,
	recDefaultNonElectProjId	INT NOT NULL,
	CONSTRAINT pk_RecStore PRIMARY KEY(recStoreId),
	CONSTRAINT uk_RecStore UNIQUE (recTenantId,recStoreName)
)
GO


CREATE TABLE pfuser.SupplementalMarkings (
	smId		INT NOT NULL,
	smStoreId 	INT NOT NULL,
	smName	        NVARCHAR(255) NOT NULL,
	smDisplayName   NVARCHAR(255) NOT NULL,
	smDesc			NVARCHAR(255) NULL,
	smCreateDate	DATETIME NOT NULL,
	CONSTRAINT pk_SupMark PRIMARY KEY(smStoreId,smId),
	CONSTRAINT uk_SupMark UNIQUE (smStoreId,smName)
)
GO


CREATE SEQUENCE pfuser.FilePlan_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.FilePlan (
        filePlanId INT NOT NULL,
        filePlanParentId INT NOT NULL,
        filePlanStoreId INT NOT NULL,
        filePlanCategoryId INT NOT NULL,
        filePlanName	NVARCHAR(255) NOT NULL,
        filePlanDispName	NVARCHAR(255) NOT NULL,
        filePlanPrefix NVARCHAR(64) NOT NULL,
        filePlanDesc	NVARCHAR(255) NULL,
        filePlanFldrType INT NOT NULL,
        filePlanFlags INT NOT NULL,
        filePlanRecFlags INT NOT NULL,
        filePlanCreateDate DATETIME NOT NULL,
        filePlanUpdateDate DATETIME NOT NULL,
        filePlanChangeNumber INT NOT NULL,
        filePlanFldrSize  BIGINT  NOT NULL,
        filePlanFldrCount INT NOT NULL,
        filePlanSubFolderScheme	NVARCHAR(255) NULL,
        filePlanLocation NVARCHAR(255) NULL,
        filePlanSupMark VARCHAR(255) NULL,
		filePlanClearance INT NULL,
       	filePlanSchema	INT NOT NULL,
       	filePlanRecordSchema INT NOT NULL,
        filePlanUserDataId	 BIGINT  NOT NULL,
        filePlanRetCodeId	INT NOT NULL,
        filePlanTriggerFormula	NVARCHAR(255) NULL,
        filePlanTriggerDate	DATETIME NULL,
        filePlanCutoffDate		DATETIME NULL,
        filePlanDispAuthority	NVARCHAR(255) NULL,
        filePlanPhaseId		INT  NOT NULL,
        filePlanPhaseDate DATETIME NULL,
        filePlanNextPhaseId	INT NOT NULL,
		filePlanNextPhaseExecDate DATETIME NULL,
		filePlanNextPhaseDecisionDate DATETIME NULL,
		filePlanNextPhaseAction	INT NULL,
		filePlanVitalReviewDate DATETIME NULL,
        filePlanVitalReviewZlpUserId INT NULL,
		filePlanVitalReviewAction INT NULL,
		filePlanVitalReviewNotes	NVARCHAR(255) NULL,
		filePlanNextVitalReviewDate DATETIME NULL,     
		filePlanLifeCycleRunId	INT NULL,
		filePlanLifeCycleRunDate 	DATETIME NULL,
		filePlanLegalHoldDate	DATETIME NULL,
		filePlanLegalHoldReason	NVARCHAR(255) NULL,
		filePlanSupercedeDate	 DATETIME NULL,
		filePlanTransferCode INT NULL,
		filePlanTransferStatus INT NULL,
		filePlanTransferExportId	INT NULL,
		filePlanTransferConfirmUserId	INT NULL,
	CONSTRAINT pk_FilePlan PRIMARY KEY (filePlanId),
	CONSTRAINT uk_FilePlan UNIQUE (filePlanName,filePlanParentId,filePlanStoreId),
	CONSTRAINT uk2_FilePlan UNIQUE (filePlanStoreId,filePlanPrefix)
)
GO
-- Storage (initial 5M NEXT 5M MINEXTENTS 1 MAXEXTENTS 20 PCTINCREASE 33) PCTFREE 5

CREATE INDEX i2_FilePlan ON pfuser.FilePlan(filePlanStoreId,filePlanCategoryId,filePlanFldrType)
GO






CREATE SEQUENCE pfuser.Record_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.Record (
	recId	 BIGINT  NOT NULL,
	recStoreId INT NOT NULL,
	recSubject    NVARCHAR(255) NULL,
	recFileDate    DATETIME  NOT NULL,
	recPublishDate    DATETIME  NOT NULL,
	recType INT NOT NULL,
	recSubType INT NOT NULL,
	recCategoryId	INT NOT NULL,
	recFolderId	INT NOT NULL,
	recRefItemId VARCHAR(128) NOT NULL,
	recRefItemParts VARCHAR(255)  NULL,
	recRefZlpUserId	VARCHAR(255) NULL,
	recRefDomainId	VARCHAR(255) NULL,
	recAuthor	NVARCHAR(255) NULL,
	recOriginOrg NVARCHAR(255) NULL,
	recSupMark  NVARCHAR(255) NULL,
	recMediaType	VARCHAR(128)  NULL,
	recFormat	VARCHAR(128)  NULL,
	recReceivedDate	DATETIME NULL,
	recAddressee	NVARCHAR(255) NULL,
	recOtherAddressee	NVARCHAR(255) NULL,
	recLocation NVARCHAR(255) NULL,
	recUserDataId	INT NOT NULL,
	recDeclareType	INT NOT NULL,
	recDeclareId	INT NOT NULL,
	recFlags 	INT NOT NULL,
	recLastUpdate    DATETIME  NOT NULL,
	recTriggerDate DATETIME NULL,
	recCutoffDate	DATETIME  NULL,
	recPhaseId		INT  NOT NULL,
	recPhaseDate DATETIME NULL,
	recNextPhaseId	INT NOT NULL,
	recNextPhaseExecDate DATETIME NULL,
	recNextPhaseDecisionDate DATETIME NULL,
	recNextPhaseAction	INT NULL,
	recVitalReviewDate DATETIME NULL,
	recVitalReviewZlpUserId INT NULL,
	recVitalReviewAction INT NULL,
	recVitalReviewNotes	NVARCHAR(255) NULL,
	recNextVitalReviewDate DATETIME NULL,	
	recLifeCycleRunId	INT NULL,
	recLifeCycleRunDate 	DATETIME NULL,
	recSupercedeDate	 DATETIME NULL,
	recParamVal1			NVARCHAR(255) NULL,
	recParamVal2			NVARCHAR(255) NULL,
	recParamVal3			NVARCHAR(255) NULL,
	recParamVal4			NVARCHAR(255) NULL,
	recTransferCode INT NULL,
	recTransferStatus INT NULL,
	recTransferExportId	INT NULL,
	recTransferConfirmZlpUserId	INT NULL,
	recDowngradeType INT NULL,
	recDowngradeEvent INT NULL,
	recDeclassifyType INT NULL,
	recDeclassifyEvent INT NULL,
	recClassificationRules NVARCHAR(255) NULL,
	recClassificationReasons NVARCHAR(255) NULL,
	recExemptions NVARCHAR(255) NULL,
	recInitialClearance INT NULL,
	recCurrentClearance INT NULL,
	recDowngradeClearance INT NULL,
	recDerivedFrom NVARCHAR(255) NULL,
	recClassifiedBy NVARCHAR(255) NULL,
	recAgency NVARCHAR(255) NULL,
	recDowngradeInst NVARCHAR(255) NULL,
	recDowngradeDate DATETIME NULL,
	recDeclassifyDate DATETIME NULL,
	CONSTRAINT pk_Record PRIMARY KEY(recId),
	CONSTRAINT uk_RecordRef UNIQUE (recStoreId,recCategoryId,recRefItemId,recRefItemParts)
)
GO


CREATE INDEX i1_Record ON pfuser.Record(recStoreId,recFolderId)
GO
CREATE INDEX i2_Record ON pfuser.Record(recStoreId,recRefItemId,recRefItemParts)
GO
CREATE INDEX i3_Record ON pfuser.Record(recStoreId,recId)
GO
CREATE INDEX i5_Record ON pfuser.Record(recStoreId,recLastUpdate)
GO





CREATE TABLE pfuser.RecordAuditTrail (
	raAction	INT NOT NULL,
	raDate		DATETIME NOT NULL,
	raRecId	 BIGINT  NOT NULL,
	raRefItemId	VARCHAR(255) NULL,
	raFilePlanId	INT NOT NULL,
	raStoreId	INT NOT NULL,
	raZlpUserId	INT NOT NULL,
	raUser		NVARCHAR(255) NOT NULL,
	raDomainId	INT NOT NULL,
	raTenantId 	INT NOT NULL,	
	raTxnId		VARCHAR(64) NOT NULL,
	raClearanceLevel	INT NOT NULL,
	raSourceIP 	VARCHAR(64) NULL,
	raDestIP   	VARCHAR(64) NULL,
	raAccessType 	VARCHAR(128) NULL,
	raComments	NVARCHAR(255) NULL,
	raVal1 	NVARCHAR(255) NULL,
	raVal2 	NVARCHAR(255) NULL,
	raVal3 	NVARCHAR(255) NULL,
	raVal4 	NVARCHAR(255) NULL,
	raVal5 	NVARCHAR(255) NULL
--,
--	CONSTRAINT fk_CaseAudTrail FOREIGN KEY (caCaseId) REFERENCES pfuser.CaseInfo(caseId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseAudTrailFldr FOREIGN KEY (caFolderId) REFERENCES pfuser.CaseFolder(caseFldrId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseAudTrailItem FOREIGN KEY (caItemId) REFERENCES pfuser.CaseItem(caseItemId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_CaseAudTrailDomain FOREIGN KEY (caDomainId) REFERENCES pfuser.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_CaseAudTrailZLPUser FOREIGN KEY (caZLPUser) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO
-- //DB2{[PARTITION BY RANGE~~PARTITION  BY RANGE]}
-- //SYBASE{[PARTITION BY RANGE~~ON ITEMDATERANGE]}
-- //MSSQL{[PARTITION BY RANGE~~ON ITEMDATERANGE]}
-- //!ORACLE{[PARTITION BY RANGE(caDate)~~]}
-- PARTITION BY RANGE(caDate)
-- //MSSQL{[INTERVAL (NUMTOYMINTERVAL(1, 'YEAR'))~~]}
-- //DB2{[INTERVAL (NUMTOYMINTERVAL(1, 'YEAR'))~~(STARTING ('2000-01-01') ENDING ('2010-01-01') EVERY (1 YEARS))]}
-- //!ORACLE{[INTERVAL (NUMTOYMINTERVAL(1, 'YEAR'))~~]}
-- INTERVAL (NUMTOYMINTERVAL(1, 'YEAR')) -- Oracle 11g
-- ( -- remove comment and edit table space as necessary
-- PARTITION ZL_ITEM_0 VALUES LESS THAN (TO_DATE('01/01/2001', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_0,
-- PARTITION ZL_ITEM_1 VALUES LESS THAN (TO_DATE('01/01/2002', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_1,
-- PARTITION ZL_ITEM_2 VALUES LESS THAN (TO_DATE('01/01/2003', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_2,
-- PARTITION ZL_ITEM_3 VALUES LESS THAN (TO_DATE('01/01/2004', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_3,
-- PARTITION ZL_ITEM_4 VALUES LESS THAN (TO_DATE('01/01/2005', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_4,
-- PARTITION ZL_ITEM_5 VALUES LESS THAN (TO_DATE('01/01/2006', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_5,
-- PARTITION ZL_ITEM_6 VALUES LESS THAN (TO_DATE('01/01/2007', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_6,
-- PARTITION ZL_ITEM_7 VALUES LESS THAN (TO_DATE('01/01/2008', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_7,
-- PARTITION ZL_ITEM_8 VALUES LESS THAN (TO_DATE('01/01/2009', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_8,
-- PARTITION ZL_ITEM_9 VALUES LESS THAN (TO_DATE('01/01/2010', 'MM/DD/YYYY')) TABLE_SPACE ZL_ITEM_9
-- )

CREATE INDEX i1_RecAudTrail ON pfuser.RecordAuditTrail(raDate)
GO
CREATE INDEX i2_RecAudTrail ON pfuser.RecordAuditTrail(raDomainId)
GO
CREATE INDEX i3_RecAudTrail ON pfuser.RecordAuditTrail(raRecId)
GO
CREATE INDEX i4_RecAudTrail ON pfuser.RecordAuditTrail(raRefItemId)
GO
CREATE INDEX i5_RecAudTrail ON pfuser.RecordAuditTrail(raZlpUserId)
GO






CREATE SEQUENCE pfuser.RecUserData_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.RecordUserData (
	rudId			 BIGINT  NOT NULL,
	rudObjType		INT NOT NULL,
	rudObjId		 BIGINT  NOT NULL,
	rudStoreId		INT NOT NULL,
	rudSeqNumber		INT NOT NULL,
	rudNext			CHAR(1) NOT NULL,
	rudVal1			NVARCHAR(255) NULL,
	rudVal2			NVARCHAR(255) NULL,
	rudVal3			NVARCHAR(255) NULL,
	rudVal4			NVARCHAR(255) NULL,
	rudVal5			NVARCHAR(255) NULL,
	rudVal6			NVARCHAR(255) NULL,
	rudVal7			NVARCHAR(255) NULL,
	rudVal8			NVARCHAR(255) NULL,
	CONSTRAINT pk_RecUserData PRIMARY KEY (rudId,rudSeqNumber)
--,
--	CONSTRAINT fk_CIAnnot FOREIGN KEY (ciaCaseId) REFERENCES pfuser.CaseInfo(caseId) ON DELETE CASCADE,
--	CONSTRAINT fk_CIAnnotItem FOREIGN KEY (ciaItemId) REFERENCES pfuser.CaseItem(caseItemId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_CIAnnot FOREIGN KEY (cupZlpUserId) REFERENCES pfuser.ZLPUser(ZlpUserId) ON DELETE CASCADE
)
GO




-- OPTIONAL
CREATE SEQUENCE pfuser.RecDataSource_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.RecordDataSource (
	-- IDENTITY
	srcId		BIGINT NOT NULL,
	srcParentId	INT NOT NULL,
	srcName		NVARCHAR(255) NOT NULL,
	srcStoreId 	INT NOT NULL,
	srcType	INT NOT NULL,
	srcSrchStoreId INT NOT NULL,
	srcSrchType 	VARCHAR(32),
	srcPurpose VARCHAR(32) NOT NULL,	
	srcPriority	INT NOT NULL,
	srcDateCreate	DATETIME NOT NULL,
	srcUpdate	DATETIME NOT NULL,
	srcItemFilePlanId	INT NOT NULL,
	srcVaultItemId	VARCHAR(128) NULL,
	srcVaultPwd 	VARBINARY(255) NULL,
	CONSTRAINT pk_RecDataSource PRIMARY KEY (srcId),
--	CONSTRAINT fk_RecDataSource FOREIGN KEY (srcStoreId) REFERENCES pfuser.RecordStore(recStoreId) ON DELETE CASCADE,
--	CONSTRAINT fk_RecDataSourceVa FOREIGN KEY (srcVaultItemId) REFERENCES pfuser.VaultItem(viStId) ON DELETE CASCADE,
	CONSTRAINT uk_RecDataSource UNIQUE (srcStoreId,srcName)
)
GO
CREATE INDEX i1_RecDataSource ON pfuser.RecordDataSource(srcVaultItemId)
GO


CREATE SEQUENCE pfuser.RecDataSourceRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.RecordDataSourceRuns (
	runId		INT NOT NULL,
	runSrcId		INT NOT NULL,
	runMethod		VARCHAR(32),
	runMachine		NVARCHAR(255),
	runDateStart	DATETIME NOT NULL,
	runDateUpdate	DATETIME NOT NULL,
	runDateEnd	DATETIME NULL,
	runItemFound	INT NOT NULL,
	runItemImported	INT NOT NULL,
	runItemMoved	INT NOT NULL,
	runItemDuplicates	INT NOT NULL,
	runItemErrors	INT NOT NULL,
	runItemInplaceSuccess INT NOT NULL,
	runItemInplaceNotFound INT NOT NULL,
	runitemInplaceError INT NOT NULL,
	runStatusMsg	NVARCHAR(255) NULL,
	runVaultItemId	VARCHAR(128) NULL,
	CONSTRAINT pk_RecDataSourceRuns PRIMARY KEY (runId)
--,
--	CONSTRAINT fk_RecDataSourceRuns FOREIGN KEY (runSrcId) REFERENCES pfuser.RecordDataSource(srcId) ON DELETE CASCADE
)
GO
CREATE INDEX i1_RecDataSourceRuns ON pfuser.RecordDataSourceRuns(runSrcId)
GO


CREATE TABLE pfuser.RecordDataSourceScheduledRuns (
	schedSrcId	INT NOT NULL,
	schedIntervalSec INT NOT NULL,
	schedDateStart	DATETIME NOT NULL,
	schedDateExpiry DATETIME NULL,
	schedIterations	INT NULL,
	CONSTRAINT pk_RecDataSourceScheduledRuns PRIMARY KEY (schedSrcId)
)
GO


-- OPTIONAL
CREATE SEQUENCE pfuser.RecordSchema_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.RecordSchema (
	-- IDENTITY
	rsSchemaId BIGINT NOT NULL,
	rsStoreId 	INT NOT NULL,
	rsSchemaName			VARCHAR(128) NOT NULL,
	rsParentSchemaId INT NOT NULL,
	CONSTRAINT pk_recSchema PRIMARY KEY(rsSchemaId),
	CONSTRAINT uk_recSchema UNIQUE(rsStoreId,rsSchemaName)
)
GO

CREATE TABLE pfuser.RecordSchemaFields (
	rsfSchemaId	INT NOT NULL,
	rsfName			VARCHAR(128) NOT NULL,
	rsfSeq	INT NOT NULL,
	rsfDesc		NVARCHAR(255) NULL,
	rsfType			VARCHAR(128) NOT NULL,
	rsfInputType	VARCHAR(128) NOT NULL,
	rsfInputParamVal1		NVARCHAR(255) NULL,
	rsfInputParamVal2		NVARCHAR(255) NULL,
	rsfInputParamVal3		NVARCHAR(255) NULL,
	rsfFlags	INT NOT NULL,
	rsfFormula	NVARCHAR(255) NULL,
	rsfMandatory	CHAR(1) NOT NULL,
	CONSTRAINT pk2_recSchFld PRIMARY KEY(rsfSchemaId,rsfName)
)
GO


-- OPTIONAL
CREATE SEQUENCE pfuser.RetentionCode_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.RetentionCode (
	-- IDENTITY
	rcId 			BIGINT NOT NULL,
	rcStoreId		INT NOT NULL,
	rcName			NVARCHAR(255) NOT NULL,
	rcDisp			INT NOT NULL,
	rcDispInst		NVARCHAR(255) NULL,
	rcComment		NVARCHAR(255) NULL,
	rcFlag			INT NOT NULL,
	rcCutoff		VARCHAR(255) NULL,
	rcCycleDate		VARCHAR(255) NULL,
	rcVitalReviewPeriod	VARCHAR(64) NULL,
	rcDispVal1	 	NVARCHAR(255) NULL,
	rcDispVal2 		NVARCHAR(255) NULL,
	rcDispVal3 		NVARCHAR(255) NULL,
	rcDispVal4 		NVARCHAR(255) NULL,
	rcDispVal5 		NVARCHAR(255) NULL,
	rcDispVal6 		NVARCHAR(255) NULL,
	rcDispVal7 		NVARCHAR(255) NULL,
	rcDispVal8 		NVARCHAR(255) NULL,
	CONSTRAINT pk_rcode PRIMARY KEY(rcId),
	CONSTRAINT uk_rcode UNIQUE (rcStoreId,rcName)
)
GO

CREATE SEQUENCE pfuser.LifeCycleRun_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO



CREATE TABLE pfuser.LifeCycleRun (
	lcrId INT NOT NULL,
	lcrParentId INT NOT NULL,
	lcrZlpUserId	INT NOT NULL,
	lcrReferenceDate DATETIME NOT NULL,
	lcrStoreId INT NOT NULL,
	lcrFilePlanId INT NOT NULL,
	lcrTargetPhase INT NOT NULL,
	lcrFlags INT NOT NULL,
	lcrVaultItem VARCHAR(128) NULL,
	lcrVaultPwd 	VARBINARY(255) NULL,
	lcrStartDate DATETIME NULL,
	lcrEndDate DATETIME NULL,
	lcrMachine NVARCHAR(255) NULL,
	lcrStatus INT NOT NULL,
	lcrStatusMessage NVARCHAR(255) NULL,
	CONSTRAINT pk_LCRun PRIMARY KEY(lcrId)
)
GO
	
	

CREATE TABLE pfuser.LifeCycleRunEntry (
	entryRunId	INT NOT NULL,
	entryStoreId INT NOT NULL,
	entryRecEntity	INT NOT NULL,
	entryRecEntityId	INT NOT NULL,
	entryDate DATETIME NOT NULL,
	entryTriggerDate	DATETIME NULL,
    entryCutoffDate		DATETIME NULL,
    entryPhaseId		INT  NOT NULL,
	entryPhaseDate DATETIME NULL,
	entryNextPhaseId	INT NOT NULL,
	entryNextPhaseExecDate DATETIME NULL,
	entryNextPhaseDecisionDate DATETIME NULL,
	entryNextPhaseAction	INT NULL,
	entryNextVitalReviewDate DATETIME NULL,
	entryComment NVARCHAR(255) NULL,
	CONSTRAINT pk_LCRunEntry PRIMARY KEY(entryRunId,entryRecEntity,entryRecEntityId)
)
GO







CREATE TABLE pfuser.FilePlanPrivileges (
	fpStoreId INT NOT NULL,
	fpCategoryId 		INT NOT NULL,
	fpId 		INT NOT NULL,
   	fpEntityId 	INT NOT NULL,
	fpEntityType	INT NOT NULL,
	fpPrivName	VARCHAR(32) NOT NULL,
	fpRecursive	CHAR(1) NOT NULL,
	fpScopeType		      NVARCHAR(32) NULL,
    fpScope1		      VARCHAR(255) NULL,
    fpScope2		      VARCHAR(255) NULL,
    fpScope3		      VARCHAR(255) NULL,
	CONSTRAINT pk_FilePlanPriv PRIMARY KEY (fpStoreId,fpId,fpPrivName,fpEntityId,fpEntityType)
)
GO


CREATE INDEX i1_FilePlanPriv ON pfuser.FilePlanPrivileges(fpEntityId,fpEntityType)
GO


CREATE TABLE pfuser.FilePlanCustomPrivileges (
	fcpStoreId INT NOT NULL,
	fcpPrivName	VARCHAR(32) NOT NULL,
	fcpPrivDispName	VARCHAR(32) NOT NULL,
	fcpVal	VARCHAR(255) NOT NULL,
	CONSTRAINT pk_RecCustomPriv PRIMARY KEY (fcpStoreId,fcpPrivName),
	CONSTRAINT uk_RecCustomPriv UNIQUE (fcpStoreId,fcpPrivDispName)
)
GO


CREATE TABLE pfuser.EntityMarking (
	emStoreId	INT NOT NULL,
	emEntityId 	INT NOT NULL,
	emEntityType	INT NOT NULL,
	emMarkingId VARCHAR(255) NOT NULL,
	CONSTRAINT pk_EntityMarking PRIMARY KEY (emStoreId,emEntityId,emEntityType)
)
GO
	






CREATE TABLE pfuser.UserRecordDeclaration (
	urdZlpUserId	INT NOT NULL,
	urdSourceId	INT NOT NULL,
	-- //MSSQL{[VARCHAR2(255) NOT NULL~~VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL]}
	urdSyncUnid	VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL,
	urdSource	NVARCHAR(255) NOT NULL,
	urdSourceDetail	NVARCHAR(255) NULL,
	urdId VARCHAR(64) NULL,
	urdRecType INT NOT NULL,
	urdDeclareMethod INT NOT NULL,
	urdDeclareAction INT NOT NULL,
	urdDate DATETIME NOT NULL,
	urdRmId VARCHAR(128) NULL,
	urdStatus INT NOT NULL,
	urdRecordId INT NOT NULL,
	urdRecordDate DATETIME NULL,
	urdFolderId INT NOT NULL,
	urdCategoryId INT NOT NULL,
	urdLegalHolds NVARCHAR(255) NULL,
	urdSubject	NVARCHAR(255) NULL,
	urdName  NVARCHAR(255) NULL,
	urdVal1	NVARCHAR(255) NULL,
	urdVal2	NVARCHAR(255) NULL,
	urdVal3	NVARCHAR(255) NULL,
	urdVal4	NVARCHAR(255) NULL,
	CONSTRAINT pk_userRecDeclrn PRIMARY KEY (urdZlpUserId,urdSourceId,urdSyncUnid)
)
GO

CREATE INDEX i1_userRecDeclrn ON pfuser.UserRecordDeclaration(urdZlpUserId,urdDate)
GO
CREATE INDEX i2_userRecDeclrn ON pfuser.UserRecordDeclaration(urdId,urdRecType)
GO


CREATE TABLE pfuser.FieldValueFilter (
	fvfStoreId 	INT NOT NULL,
	fvfSchemaId	INT NOT NULL,
	fvfFieldName	VARCHAR(128) NOT NULL,
	fvfEntityType	INT NOT NULL,
   	fvfEntityId 	INT NOT NULL,
	fvfValues	NVARCHAR(255) NOT NULL,
	CONSTRAINT pk_FieldValFilter PRIMARY KEY (fvfStoreId,fvfSchemaId,fvfFieldName,fvfEntityType,fvfEntityId)
)
GO

-- OPTIONAL
CREATE SEQUENCE pfuser.RecordRelationship_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.RecordRelationship (
-- IDENTITY
	relId 	BIGINT NOT NULL,
	relStoreId	INT NOT NULL,
	relType INT NOT NULL,
	relName	NVARCHAR(255) NOT NULL,
	relDisplayName	NVARCHAR(255) NOT NULL,
	CONSTRAINT pk_RecordRelationship PRIMARY KEY (relId),
	CONSTRAINT uk_RecordRelationship UNIQUE (relStoreId,relName)
)
GO


CREATE TABLE pfuser.RecordLink (
	linkLeftId BIGINT NOT NULL,
	linkRightId BIGINT NOT NULL,
	linkRelId	INT NOT NULL,
	linkStoreId INT NOT NULL,
	CONSTRAINT pk_RecordLink PRIMARY KEY (linkLeftId,linkRightId,linkRelId)
)
GO

CREATE INDEX i1_RecordLink ON pfuser.RecordLink(linkRightId)
GO


CREATE SEQUENCE pfuser.CategoryDispositionRun_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.CategoryDispositionRun (
	cdrId	BIGINT NOT NULL,
	cdrCategoryId INT NOT NULL,
	cdrStoreId INT NOT NULL,
	cdrDisp			INT NOT NULL,
    cdrCluster		NVARCHAR(64) NULL,
	cdrPID			NVARCHAR(64) NULL,
    cdrStartDate	DATETIME NOT NULL,
	cdrEndDate	DATETIME NULL,
    cdrUpdate	DATETIME NOT NULL,
    cdrCount INT NOT NULL,
    cdrTransCount  INT NOT NULL,   
	cdrStatusMessage	NVARCHAR(255) NULL,
	CONSTRAINT pk_CatDispRun PRIMARY KEY (cdrId,cdrCategoryId)
)
GO



CREATE SEQUENCE pfuser.CategoryDispositionTrans_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.CategoryDispositionTransaction (
	cdtId	BIGINT NOT NULL,
	cdtRunId		BIGINT NOT NULL,
	cdtCategoryId INT NOT NULL,
	cdtStoreId INT NOT NULL,
	cdtDisp			INT NOT NULL,
	cdtRecType	INT NOT NULL,
	cdtCount	INT NOT NULL,
	cdtError	INT NOT NULL,
    cdtCluster		NVARCHAR(64) NULL,
	cdtPID			NVARCHAR(64) NULL,
    cdtStartDate	DATETIME NOT NULL,
	cdtEndDate	DATETIME NULL,
    cdtUpdate	DATETIME NOT NULL,
	cdtVaultDeleteCount INT NOT NULL,
	cdtVaultPrimarySizeKB INT NOT NULL,
	cdtVaultSecondarySizeKB INT NOT NULL,
	cdtSISCount INT NOT NULL,
	cdtTranscriptVaultId VARCHAR(128) NULL,
	cdtStatusMessage	NVARCHAR(255) NULL,
	CONSTRAINT pk_CatDispTrans PRIMARY KEY (cdtId)
)
GO
CREATE INDEX i1_CatDispTrans ON pfuser.CategoryDispositionTransaction(cdtRunId)
GO


CREATE TABLE pfuser.RecordUserPreference (
	rupZlpUserId 		INT NOT NULL,
	rupVal1		NVARCHAR(255) NULL,
	rupVal2		NVARCHAR(255) NULL,
	rupVal3		NVARCHAR(255) NULL,
	rupVal4		NVARCHAR(255) NULL,
	rupVal5		NVARCHAR(255) NULL,
	rupVal6		NVARCHAR(255) NULL,
	rupVal7		NVARCHAR(255) NULL,
	rupVal8		NVARCHAR(255) NULL,	
	CONSTRAINT pk_RecUserPref PRIMARY KEY (rupZlpUserId)
)
GO


CREATE TABLE pfuser.LifeCyclePhase (
	lcpStoreId	INT NOT NULL,
	lcpName	NVARCHAR(128) NOT NULL,
	lcpSeqNo	INT NOT NULL,
	lcpDesc		NVARCHAR(255) NULL,
	lcpFlags		INT NOT NULL,
	lcpInstructions	NVARCHAR(255) NULL,
	CONSTRAINT uk_Phase UNIQUE (lcpStoreId,lcpName)
)
GO


CREATE TABLE pfuser.DispositionAuthority (
	daStoreId	INT NOT NULL,
	daName	VARCHAR(128) NOT NULL,
	daDesc		NVARCHAR(255) NULL,
	CONSTRAINT uk_DispAuth UNIQUE (daStoreId,daName)
)
GO

CREATE TABLE pfuser.FilePlanFavorite (
	fpfStoreId	INT NOT NULL,
	fpfEntityType	INT NOT NULL,
   	fpfEntityId 	INT NOT NULL,
	fpfFilePlanId VARCHAR(255) NOT NULL,
	CONSTRAINT uk_filePlanFav UNIQUE (fpfStoreId,fpfEntityType,fpfEntityId)
)
GO


CREATE SEQUENCE pfuser.RecordSavedSearch_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.RecordSavedSearch (
	rssId		INT NOT NULL,
	rssParentId INT NOT NULL,
	rssName		NVARCHAR(255) NOT NULL,
	rssType		VARCHAR(255) NOT NULL,
	rssReservedQuery CHAR(1) NOT NULL,
	rssStoreId 	INT NOT NULL,
	rssTenantId	INT NOT NULL,
	rssDesc		NVARCHAR(255) NULL,
	rssDate 	DATETIME NOT NULL,
	rssQueryVal1 NVARCHAR(255) NULL,
	rssQueryVal2 NVARCHAR(255) NULL,
	rssQueryVal3 NVARCHAR(255) NULL,
	rssQueryVal4 NVARCHAR(255) NULL,
	rssQueryVal5 NVARCHAR(255) NULL,
	rssQueryVal6 NVARCHAR(255) NULL,
	rssQueryVal7 NVARCHAR(255) NULL,
	rssQueryVal8 NVARCHAR(255) NULL,
	rssQueryVal9 NVARCHAR(255) NULL,
	rssQueryVal10 NVARCHAR(255) NULL,
	rssJSONVal1 NVARCHAR(255) NULL,
	rssJSONVal2 NVARCHAR(255) NULL,
	rssJSONVal3 NVARCHAR(255) NULL,
	rssJSONVal4 NVARCHAR(255) NULL,
	rssJSONVal5 NVARCHAR(255) NULL,
	rssJSONVal6 NVARCHAR(255) NULL,
	rssJSONVal7 NVARCHAR(255) NULL,
	rssJSONVal8 NVARCHAR(255) NULL,
	rssJSONVal9 NVARCHAR(255) NULL,
	rssJSONVal10 NVARCHAR(255) NULL,
	CONSTRAINT pk_RecordSavedSearch PRIMARY KEY (rssId),
	CONSTRAINT uk_RecordSavedSearch UNIQUE (rssTenantId,rssStoreId,rssParentId,rssName)
)
GO

CREATE TABLE pfuser.EntityClearance (
	ecStoreId	INT NOT NULL,
	ecEntityId 	INT NOT NULL,
	ecEntityType	INT NOT NULL,
	ecClearance INT NOT NULL,
	CONSTRAINT pk_EntityClearance PRIMARY KEY (ecStoreId,ecEntityId,ecEntityType)
--	CONSTRAINT fk_RecordStoreId FOREIGN KEY (rcStoreId) REFERENCES pfuser.RecordStore(recStoreId) ON DELETE CASCADE
)
GO

CREATE SEQUENCE pfuser.ClassificationGuide_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.ClassificationGuide (
	cgId			INT NOT NULL,
	cgStoreId 		INT NOT NULL,
	cgName 			NVARCHAR(64) NOT NULL,
	cgOrganization 	NVARCHAR(128) NULL,
	cgDesc 			NVARCHAR(512) NULL,
	cgCreateDate 	DATETIME NOT NULL,
	cgUpdateDate 	DATETIME NOT NULL,
	CONSTRAINT pk_ClassficationGuide PRIMARY KEY (cgId)
-- 	CONSTRAINT fk_RecordStoreId FOREIGN KEY (cgStoreId) REFERENCES pfuser.RecordStore(recStoreId) ON DELETE CASCADE
)
GO

CREATE SEQUENCE pfuser.ClassifiedReason_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.ClassifiedReason (
	crId			INT NOT NULL,
	crStoreId 		INT NOT NULL,
	crCode 			NVARCHAR(32) NOT NULL,
	crType		 	INT NOT NULL,
	crDesc 			NVARCHAR(512) NULL,
	crCreateDate 	DATETIME NOT NULL,
	crUpdateDate 	DATETIME NOT NULL,
	crEventDate     DATETIME NULL,
	CONSTRAINT pk_ClassifiedReason PRIMARY KEY (crId)
-- 	CONSTRAINT fk_RecordStoreId FOREIGN KEY (crStoreId) REFERENCES pfuser.RecordStore(recStoreId) ON DELETE CASCADE
)
GO

CREATE SEQUENCE pfuser.ClassificationRule_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.ClassificationRule (
	crId				INT NOT NULL,
	crStoreId 			INT NOT NULL,
	crGuideId           INT NOT NULL,
	crName 				NVARCHAR(255) NOT NULL,
	crTopic		 		NVARCHAR(255) NOT NULL,
	crClearance		 	INT NOT NULL,
	crReason		 	VARCHAR(64) NULL,
	crEvent				INT NOT NULL,
	crDeclassifyDate	DATETIME NULL,
	crExemption		 	VARCHAR(64) NULL,
	crMarking		 	VARCHAR(64) NULL,
	crRemark		 	NVARCHAR(255) NULL,
	crSetup 			NVARCHAR(255) NULL,
	crCreateDate 		DATETIME NOT NULL,
	crUpdateDate 		DATETIME NOT NULL,
	CONSTRAINT pk_ClassficationRule PRIMARY KEY (crId)
-- 	CONSTRAINT fk_RecordStoreId FOREIGN KEY (crStoreId) REFERENCES pfuser.RecordStore(recStoreId) ON DELETE CASCADE
-- 	CONSTRAINT fk_ClassificationGuideId FOREIGN KEY (crGuideId) REFERENCES pfuser.ClassificationGuide(cgId) ON DELETE CASCADE
)
GO
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
USE ZLDB

GO

--Table: ZLUserPolicy
CREATE SEQUENCE pfuser.ZLUserPolicy_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO

GO

CREATE TABLE pfuser.ZLUserPolicy (
	upolId 		    INT NOT NULL,
	upolProjId      INT NOT NULL,
	upolName		NVARCHAR(255) NOT NULL,
	upolType 	    NVARCHAR(64) NOT NULL,
	upolTenantId	INT NOT NULL,
	upolDesc		NVARCHAR(255) NULL,
	upolCreateDate	DATETIME NOT NULL,
	CONSTRAINT pk_upolicy PRIMARY KEY (upolId),
	CONSTRAINT uk2_upolicy UNIQUE (upolType,upolTenantId,upolName)
)
GO
CREATE INDEX i1_upolicy ON pfuser.ZLUserPolicy(upolProjId)
GO

--End Table: ZLUserPolicy

--Table: ZLUserPolicyRule
CREATE SEQUENCE pfuser.ZLUserPolicyRule_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO

GO

CREATE TABLE pfuser.ZLUserPolicyRule (
    upruleId                 INT NOT NULL,
    uprulePolicyId           INT NOT NULL,
    upruleShortName          NVARCHAR(64) NOT NULL,
    upruleDesc               NVARCHAR(255) NULL,
    upruleSeqNum             INT NOT NULL,
    upruleField1Name         VARCHAR(255) NULL,
    upruleField1Operator     VARCHAR(255) NULL,
    upruleField1Pattern      NVARCHAR(255) NULL,
    upruleField2Name         VARCHAR(255) NULL,
    upruleField2Operator     VARCHAR(255) NULL,
    upruleField2Pattern      NVARCHAR(255) NULL,
    upruleField3Name         VARCHAR(255) NULL,
    upruleField3Operator     VARCHAR(255) NULL,
    upruleField3Pattern      NVARCHAR(255) NULL,
    upruleField4Name         VARCHAR(255) NULL,
    upruleField4Operator     VARCHAR(255) NULL,
    upruleField4Pattern      NVARCHAR(255) NULL,
    upruleAction             VARCHAR(255) NULL,
    upruleActionVal1         NVARCHAR(255) NULL,
    upruleActionVal2         NVARCHAR(255) NULL,
    upruleActionVal3         NVARCHAR(255) NULL,
    CONSTRAINT pk_uprule PRIMARY KEY (upruleId),
    CONSTRAINT uk1_uprule UNIQUE (uprulePolicyId, upruleShortName)
)
GO
--End Table: ZLUserPolicyRule

-- Table: CaseWorkspacePreservation
CREATE TABLE pfuser.CaseWorkspacePreservation (
    cwpCaseId INT NOT NULL,
    cwpCaseDataSourceId INT NOT NULL,
    cwpWorkspaceId INT NOT NULL,
    cwpGovernanceResultId INT NOT NULL,
    cwpTenantId INT NOT NULL,
    cwpDateCreate DATETIME NOT NULL,
    CONSTRAINT PK_CaseWorkspacePreservation PRIMARY KEY (cwpCaseId, cwpCaseDataSourceId, cwpWorkspaceId)
)
GO

CREATE INDEX i1_CaseWorkspacePreservation ON pfuser.CaseWorkspacePreservation(cwpCaseId)
GO
CREATE INDEX i2_CaseWorkspacePreservation ON pfuser.CaseWorkspacePreservation(cwpWorkspaceId)
GO

--end table CaseWorkspacePreservation
--Table: RecategorizationTask
ALTER TABLE pfuser.RecategorizationTask
ADD 
    rtTagType       VARCHAR(128) NULL,
    rtParentTaskId  INT NULL,
    rtRetryCount    INT NULL,
    rtUserName      NVARCHAR(255) NULL
GO

--UPDATE
UPDATE pfuser.RecategorizationTask
SET rtParentTaskId=-1
GO

UPDATE pfuser.RecategorizationTask
SET rtRetryCount=0
GO

--ALTER COLUMN
ALTER TABLE pfuser.RecategorizationTask
ALTER COLUMN rtParentTaskId INT NOT NULL
GO

--ALTER COLUMN
ALTER TABLE pfuser.RecategorizationTask
ALTER COLUMN rtRetryCount INT NOT NULL
GO
--End Table: RecategorizationTask
ALTER TABLE pfuser.RecordSchema
DROP CONSTRAINT uk_recSchema
GO

-- Change the data type nullability for Oracle:
ALTER TABLE pfuser.RecordSchema
ALTER COLUMN rsSchemaName VARCHAR(128) NULL
GO

ALTER TABLE pfuser.RecordSchema
ALTER COLUMN rsSchemaName NVARCHAR(255) NOT NULL
GO

ALTER TABLE pfuser.RecordSchema
ADD CONSTRAINT uk_recSchema UNIQUE(rsStoreId,rsSchemaName)
GO

ALTER TABLE pfuser.RecordSchemaFields
DROP CONSTRAINT pk2_recSchFld
GO

-- Change the data type nullability for Oracle:
ALTER TABLE pfuser.RecordSchemaFields
ALTER COLUMN rsfName VARCHAR(128) NULL
GO

ALTER TABLE pfuser.RecordSchemaFields
ALTER COLUMN rsfName NVARCHAR(255) NOT NULL
GO

ALTER TABLE pfuser.RecordSchemaFields
ADD CONSTRAINT pk2_recSchFld PRIMARY KEY(rsfSchemaId,rsfName)
GO
-- Table: SearchStore

--add ssHasDeleted column

ALTER TABLE pfuser.SearchStore
ADD ssHasDeleted CHAR(1) NULL
GO

UPDATE pfuser.SearchStore
SET ssHasDeleted = 'N'
GO

ALTER TABLE pfuser.SearchStore
ALTER COLUMN ssHasDeleted CHAR(1) NOT NULL
GO

-- end of Table: SearchStore

-- Create a sequence for generating isId
CREATE SEQUENCE pfuser.IndexStore_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

-- Table: IndexStore
CREATE TABLE pfuser.IndexStore (
    isId                INT NOT NULL,
	isRefId		        INT NOT NULL,
	isContextType		VARCHAR(32) NOT NULL,
	isItemType          VARCHAR(32) NULL,
	isVault             VARCHAR(128) NULL,
	isCreateDate	    DATETIME NOT NULL,
	isRefStId		    VARCHAR(255) NOT NULL,
	CONSTRAINT pk_IndexStore PRIMARY KEY (isId),
    CONSTRAINT uk_IndexStore UNIQUE (isRefId,isContextType)
)
GO
--end table IndexStore
ALTER TABLE pfuser.SelectiveArchiveSearch
ADD sasSourceContextType VARCHAR(255) NULL
GO

UPDATE pfuser.SelectiveArchiveSearch
SET sasSourceContextType = ''
GO

ALTER TABLE pfuser.SelectiveArchiveSearch
ALTER COLUMN sasSourceContextType VARCHAR(255) NOT NULL
GO

-- Table: UserLicense
CREATE SEQUENCE pfuser.UserLicense_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.UserLicense (
    ulId INT NOT NULL,
    ulDate DATETIME,
    ulActiveUserCount INT,
    ulTerminatedUserCount INT,
    ulActiveMailingListCount INT,
    ulTerminatedMailingListCount INT,
    ulTenantId INT NOT NULL,
    ulUserWithoutDataCount INT,
    ulMailingListWithoutDataCount INT,
    CONSTRAINT PK_UserLicense PRIMARY KEY (ulId)
)
GO

--end table UserLicense
CREATE INDEX i1_ul_UserLicenseDate ON pfuser.UserLicense (ulDate)
GO
--Table: Workspace
CREATE SEQUENCE pfuser.Workspace_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.Workspace (
    wsId INT NOT NULL,
    wsTenantId INT NOT NULL,
    wsName NVARCHAR(255) NOT NULL,
    wsDesc NVARCHAR(255) NULL,
    wsType INT NOT NULL,
    wsMode INT NOT NULL,
    wsCreateDate DATETIME NOT NULL,
    wsLastAccessedDate DATETIME NOT NULL,
    wsSearchStoreType INT NOT NULL,
    CONSTRAINT pk_Workspace PRIMARY KEY (wsId),
    CONSTRAINT uk_Workspace UNIQUE (wsTenantId,wsName)
)
GO

CREATE INDEX i1_Workspace ON pfuser.Workspace(wsMode)
GO
CREATE INDEX i2_Workspace ON pfuser.Workspace(wsType)
GO
--end table Workspace

sp_rename 'pfuser.Workspace.wsSearchStoreType','wsSearchType','COLUMN'
GO

-- Table WorkspaceDataSource

-- Creating Sequence for WorkspaceDataSource

CREATE SEQUENCE pfuser.WorkspaceDataSource_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

-- Creating Table WorkspaceDataSource

CREATE TABLE pfuser.WorkspaceDataSource (
	-- IDENTITY
	wsdsId		BIGINT NOT NULL,
	wsdsName		NVARCHAR(255) NOT NULL,
	wsdsWorkspaceId 	INT NOT NULL,
	wsdsSrchStoreId INT NOT NULL,
	wsdsPurpose VARCHAR(32) NOT NULL,
	wsdsType		VARCHAR(32),
	wsdsDateCreate	DATETIME NOT NULL,
	wsdsDateUpdate	DATETIME NOT NULL,
	wsdsVaultItemId	VARCHAR(128) NULL,
	wsdsVaultPwd 	VARBINARY(255) NULL,
	wsdsLastExportedDate DATETIME NULL,
	wsdsItemCount BIGINT NOT NULL,
	CONSTRAINT pk_WorkspaceDataSource PRIMARY KEY (wsdsId),
	CONSTRAINT uk_WorkspaceDataSource UNIQUE (wsdsWorkspaceId, wsdsName)
)
GO

CREATE INDEX i1_WorkspaceDataSource ON pfuser.WorkspaceDataSource(wsdsVaultItemId)
GO


CREATE SEQUENCE pfuser.WorkspaceDataSourceRun_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.WorkspaceDataSourceRun (
    wsdsrId INT NOT NULL,
    wsdsrContextId INT NOT NULL,
    wsdsrSrcId INT NOT NULL,
    wsdsrSearchItemCount INT NOT NULL,
    wsdsrSearchStartDate DATETIME NULL,
    wsdsrSearchEndDate DATETIME NULL,
    wsdsrSearchUpdateDate DATETIME NULL,
    wsdsrSearchPID NVARCHAR(64) NOT NULL,
    wsdsrStatus INT NOT NULL,
    wsdsrSearchStatusMsg NVARCHAR(255) NULL,
    wsdsrVaultId VARCHAR(128) NULL,
    wsdsrEncPwd VARBINARY(128) NULL,
    wsdsrImportStartDate DATETIME NULL,
    wsdsrImportUpdateDate DATETIME NULL,
    wsdsrImportEndDate DATETIME NULL,
    wsdsrImportNewItems INT NULL,
    wsdsrImportExistingItems INT NULL,
    wsdsrImportErrors INT NULL,
    wsdsrImportStatusMsg NVARCHAR(255) NULL,
    CONSTRAINT pk_WorkspaceDataSourceRun PRIMARY KEY (wsdsrId)
)
GO
CREATE INDEX i1_WorkspaceDataSourceRun ON pfuser.WorkspaceDataSourceRun(wsdsrContextId,wsdsrSrcId)
GO

--Begin Table WorkspaceDataSourceIndexRuns
CREATE SEQUENCE pfuser.WorkspaceDataSourceIndexRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.WorkspaceDataSourceIndexRuns (
    wsirId INT NOT NULL,
    wsirWorkspaceId INT NOT NULL,
    wsirSrcId INT NOT NULL,
    wsirType VARCHAR(32),
    wsirCreateDate DATETIME NOT NULL,
    wsirSearchDate DATETIME NOT NULL,
    wsirSearchCount INT NOT NULL,
    wsirStartDate DATETIME NULL,
    wsirUpdateDate DATETIME NULL,
    wsirEndDate DATETIME NULL,
    wsirNewCount INT NOT NULL,
    wsirTotalCount INT NOT NULL,
    wsirPID VARCHAR(32) NOT NULL,
    wsirStatus INT NOT NULL,
    wsirStatusMsg VARCHAR(255) NULL,
    CONSTRAINT pk_WorkspaceDataSourceIndexRuns PRIMARY KEY (wsirId)
)
GO
CREATE INDEX i1_WorkspaceDataSourceIndexRuns ON pfuser.WorkspaceDataSourceIndexRuns(wsirWorkspaceId,wsirSrcId)
GO
--End Table WorkspaceDataSourceIndexRuns

--Table: WorkspaceItemData
CREATE TABLE pfuser.WorkspaceItemData (
    wsiId INT NOT NULL,
    wsiContextId    INT NOT NULL,
    wsiType     INT NOT NULL,
    wsiRefId    VARCHAR(128) NOT NULL,
    wsiFlags    INT NOT NULL,
    wsiCreateDate   DATETIME NOT NULL,
    wsiLastUpdate   DATETIME NOT NULL,
    wsiSrcIds    VARCHAR(255) NULL,
    wsiSrcRunIds VARCHAR(255) NULL,
    CONSTRAINT pk_wsi PRIMARY KEY (wsiContextId,wsiId),
    CONSTRAINT uk_wsi UNIQUE (wsiContextId,wsiRefId)
)
GO
--end table WorkspaceItemData

--start table WorkspaceItemSequence
CREATE TABLE pfuser.WorkspaceItemSequence (
    wsSeqWorkspaceId INT NOT NULL,
    wsSeqLast INT NOT NULL,
    wsSeqCreateDate DATETIME NOT NULL,
    wsSeqLastUpdateDate DATETIME NOT NULL,
    CONSTRAINT pk_wsSeq PRIMARY KEY (wsSeqWorkspaceId)
)
GO
--end table WorkspaceItemSequence

CREATE TABLE pfuser.WorkspaceAuditTrail (
	wsaAction INT NOT NULL,
	wsaDate DATETIME NOT NULL,
	wsaItemId BIGINT NOT NULL,
	wsaRefItemId VARCHAR(255) NULL,
	wsaWorkspaceId INT NOT NULL,
	wsaZlpUserId INT NOT NULL,
	wsaUser NVARCHAR(255) NOT NULL,
	wsaDomainId INT NOT NULL,
	wsaTenantId INT NOT NULL,
	wsaTxnId VARCHAR(64) NOT NULL,
	wsaClearanceLevel INT NOT NULL,
	wsaSourceIP VARCHAR(64) NULL,
	wsaDestIP VARCHAR(64) NULL,
	wsaAccessType VARCHAR(128) NULL,
	wsaZViteStId VARCHAR(255) NULL,
	wsaComments NVARCHAR(255) NULL,
	wsaVal1 NVARCHAR(255) NULL,
	wsaVal2 NVARCHAR(255) NULL,
	wsaVal3 NVARCHAR(255) NULL,
	wsaVal4 NVARCHAR(255) NULL,
	wsaVal5 NVARCHAR(255) NULL
)
GO

CREATE INDEX i1_WorkspaceAudit ON pfuser.WorkspaceAuditTrail(wsaDate)
GO
CREATE INDEX i2_WorkspaceAudit ON pfuser.WorkspaceAuditTrail(wsaDomainId)
GO
CREATE INDEX i3_WorkspaceAudit ON pfuser.WorkspaceAuditTrail(wsaItemId)
GO
CREATE INDEX i4_WorkspaceAudit ON pfuser.WorkspaceAuditTrail(wsaRefItemId)
GO
CREATE INDEX i5_WorkspaceAudit ON pfuser.WorkspaceAuditTrail(wsaZlpUserId)
GO

--Table WorkspaceGovernanceResult

CREATE SEQUENCE pfuser.WorkspaceGovernanceResult_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.WorkspaceGovernanceResult (
	wsgrId		INT NOT NULL,
	wsgrName		NVARCHAR(255) NOT NULL,
	wsgrWorkspaceId 	INT NOT NULL,
	wsgrSrchStoreId INT NOT NULL,
	wsgrPurpose VARCHAR(32) NOT NULL,
	wsgrType		VARCHAR(32),
	wsgrDateCreate	DATETIME NOT NULL,
	wsgrDateUpdate	DATETIME NOT NULL,
	wsgrVaultItemId	VARCHAR(128) NULL,
	wsgrVaultPwd 	VARBINARY(255) NULL,
	CONSTRAINT pk_WorkspaceGovernanceResult PRIMARY KEY (wsgrId),
	CONSTRAINT uk_WorkspaceGovernanceResult UNIQUE (wsgrWorkspaceId,wsgrName)
)
GO

--End Table WorkspaceGovernanceResult

--Table WorkspaceGovernanceResultRun

CREATE SEQUENCE pfuser.WorkspaceGovernanceResultRun_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.WorkspaceGovernanceResultRun (
    wsgrrId INT NOT NULL,
    wsgrrWorkspaceId INT NOT NULL,
    wsgrrSearchId INT NOT NULL,
    wsgrrSearchItemCount INT NOT NULL,
    wsgrrSearchStartDate DATETIME NULL,
    wsgrrSearchEndDate DATETIME NULL,
    wsgrrSearchUpdateDate DATETIME NULL,
    wsgrrPID NVARCHAR(64) NOT NULL,
    wsgrrStatus INT NOT NULL,
    wsgrrStatusMsg NVARCHAR(255) NULL,
    wsgrrVaultId VARCHAR(128) NULL,
    wsgrrEncPwd VARBINARY(128) NULL,
    CONSTRAINT pk_WorkspaceGovernanceResultRun PRIMARY KEY (wsgrrId)
)
GO
CREATE INDEX i1_WorkspaceGovernanceResultRun ON pfuser.WorkspaceGovernanceResultRun(wsgrrWorkspaceId,wsgrrSearchId)
GO

--End Table WorkspaceGovernanceResultRun

--start table Workspace
ALTER TABLE pfuser.Workspace
ADD wsVaultItemId VARCHAR(128) NULL
GO
--end table Workspace

-- 20251022 start table Workspace
ALTER TABLE pfuser.Workspace
ADD wsLastKnownCount BIGINT NULL
GO
