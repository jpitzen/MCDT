
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
