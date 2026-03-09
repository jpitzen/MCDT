
-- OPTIONAL
CREATE SEQUENCE pfuser01.ZViteInfo_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO

CREATE TABLE pfuser01.ZViteInfo (
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
    CONSTRAINT pk_ZViteINfo PRIMARY KEY (zviId) ON ZL_ITEM_INDEX,
    CONSTRAINT uk_ZViteINfo UNIQUE (zviExternalId) ON ZL_ITEM_INDEX 
) ON ZL_ITEM
GO
-- STORAGE (INITIAL 25M NEXT 250M MINEXTENTS 1 MAXEXTENTS 30 PCTINCREASE 0) PCTFREE 5

CREATE INDEX i1_ZViteInfo ON pfuser01.ZViteInfo(zviResourceId) ON ZL_ITEM_INDEX
GO

CREATE INDEX i2_ZViteInfo ON pfuser01.ZViteInfo(zviAccessId) ON ZL_ITEM_INDEX
GO


-- OPTIONAL
CREATE SEQUENCE pfuser01.ZViteAccess_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser01.ZViteAccess (
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
    CONSTRAINT pk_ZVA PRIMARY KEY (zvaId) ON ZL_ITEM_INDEX, 
    CONSTRAINT uk_ZVA UNIQUE (zvaStId) ON ZL_ITEM_INDEX
) ON ZL_ITEM
GO
-- STORAGE (INITIAL 25M NEXT 250M MINEXTENTS 1 MAXEXTENTS 30 PCTINCREASE 0) PCTFREE 5

CREATE INDEX i1_ZVA ON pfuser01.ZViteAccess(zvaEndDate) ON ZL_ITEM_INDEX
GO


CREATE TABLE pfuser01.ZViteAuditTrail (
    zvatInfoId                INT NOT NULL,
    zvatAction   	      INT NOT NULL,
    zvatDate		      DATETIME NOT NULL,
    zvatSubResourceId	      VARCHAR(255) NULL,
    zvatComment		      NVARCHAR(255) NULL
) ON ZL_ITEM
GO
-- STORAGE (INITIAL 25M NEXT 250M MINEXTENTS 1 MAXEXTENTS 30 PCTINCREASE 0) PCTFREE 5

CREATE INDEX i1_ZVAT ON pfuser01.ZViteAuditTrail(zvatInfoId) ON ZL_ITEM_INDEX
GO


CREATE SEQUENCE pfuser01.PartnerRegApproval_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO



CREATE TABLE pfuser01.PartnerRegApproval (
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
    CONSTRAINT pk_PRPA PRIMARY KEY (prpaId) ON ZL_APP_INDEX,
    CONSTRAINT uk_PRPA UNIQUE (prpaEntityType,prpaEntity) ON ZL_APP_INDEX 
) ON ZL_APP
GO

CREATE INDEX i3_PRPA ON pfuser01.PartnerRegApproval(prpaExpiryDate) ON ZL_APP_INDEX
GO
CREATE INDEX i4_PRPA ON pfuser01.PartnerRegApproval(prpaTenantId) ON ZL_APP_INDEX
GO





-- ***************************
--	PartRegRequests
-- ***************************

CREATE SEQUENCE pfuser01.PartnerRegRequests_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser01.PartnerRegRequests (
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
    CONSTRAINT pk_PartRegReq PRIMARY KEY (prrId) ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE INDEX i1_PartRegReq ON pfuser01.PartnerRegRequests(prrEmailAddress) ON ZL_APP_INDEX
GO



CREATE SEQUENCE pfuser01.ZLShareItem_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser01.ZLShareItem (
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
    CONSTRAINT pk_ShareItem PRIMARY KEY (siUid) ON ZL_ITEM_INDEX
) ON ZL_ITEM
GO


CREATE INDEX i2_ShareItem ON pfuser01.ZLShareItem(siZlpUserId,siAuthType) ON ZL_ITEM_INDEX
GO

