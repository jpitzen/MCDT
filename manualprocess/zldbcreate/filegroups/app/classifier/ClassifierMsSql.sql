
CREATE TABLE pfuser01.ClassifierTenantConfig (
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
	CONSTRAINT pk_CTConfig PRIMARY KEY (ctcTenantId) ON ZL_APP_INDEX
) ON ZL_APP
GO



CREATE SEQUENCE pfuser01.Classifier_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser01.Classifier (
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
	CONSTRAINT pk_Classifier PRIMARY KEY (clId) ON ZL_APP_INDEX,
	CONSTRAINT uk3_Classifer UNIQUE (clTenantId,clName) ON ZL_APP_INDEX
) ON ZL_APP
GO




CREATE SEQUENCE pfuser01.Category_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.Category (
	catId			INT NOT NULL,
	catName			NVARCHAR(255) NOT NULL,
	catClId			INT NOT NULL,
	catDesc			NVARCHAR(255) NULL,
	catSeverity		INT NOT NULL,
	catThreshold		INT NOT NULL,
	CONSTRAINT pk_Category PRIMARY KEY (catId) ON ZL_APP_INDEX,
	CONSTRAINT uk_Category UNIQUE (catClId,catName) ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE INDEX i1_Category ON pfuser01.Category(catClId) ON ZL_APP_INDEX
GO


CREATE TABLE pfuser01.CategoryAction (
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
	CONSTRAINT pk_CategoryAction PRIMARY KEY (caType,caEntityType,caEntityId,caCatId,caDataDirection) ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE INDEX i1_CategoryAction ON pfuser01.CategoryAction(caClId) ON ZL_APP_INDEX
GO





CREATE SEQUENCE pfuser01.LexRule_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser01.LRule (
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
	CONSTRAINT pk_LRule PRIMARY KEY (lrId) ON ZL_APP_INDEX,
	CONSTRAINT uk_LRule UNIQUE (lrClId,lrName,lrLang) ON ZL_APP_INDEX
) ON ZL_APP
GO






CREATE SEQUENCE pfuser01.ClassifyReason_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.ClassifyReason (
	crId		INT NOT NULL,
	crClId		INT NOT NULL,
	crCategoryName	NVARCHAR(255) NULL,
	crName		NVARCHAR(128) NOT NULL,
	crVal1		NVARCHAR(255) NULL,
	crVal2		NVARCHAR(255) NULL,
	crVal3		NVARCHAR(255) NULL,
	crWeight	INT NOT NULL,
	CONSTRAINT pk_ClReason PRIMARY KEY (crId) ON ZL_APP_INDEX,
	CONSTRAINT uk_ClReason UNIQUE (crClId,crName) ON ZL_APP_INDEX
) ON ZL_APP
GO



CREATE SEQUENCE pfuser01.AdjunctRule_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser01.AdjunctRule (
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
	CONSTRAINT pk_AdjRule PRIMARY KEY (arId) ON ZL_APP_INDEX,
	CONSTRAINT uk1_AdjRule UNIQUE (arClId,arSubType,arObjId,arCatId) ON ZL_APP_INDEX,
	CONSTRAINT uk2_AdjRule UNIQUE (arClId,arName) ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE TABLE pfuser01.ClassifierAuditTrail (
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
) ON ZL_APP
GO

CREATE INDEX i1_CAT ON pfuser01.ClassifierAuditTrail(caDate) ON ZL_APP_INDEX
GO
CREATE INDEX i2_CAT ON pfuser01.ClassifierAuditTrail(caUser) ON ZL_APP_INDEX
GO
CREATE INDEX i3_CAT ON pfuser01.ClassifierAuditTrail(caDomainId) ON ZL_APP_INDEX
GO
CREATE INDEX i4_CAT ON pfuser01.ClassifierAuditTrail(caZlpUserId) ON ZL_APP_INDEX
GO

CREATE TABLE pfuser01.LexHits (
	lhRuleId	INT NOT NULL,
	lhDate		DATETIME NOT NULL,
	lhCount		INT NOT NULL,
	lhZLPMsgId	VARCHAR(255) NOT NULL,
	lhTracItemId	INT NULL,
	lhFeedback	INT NULL
) ON ZL_APP
GO

CREATE INDEX i1_Lexhits ON pfuser01.LexHits(lhDate) ON ZL_APP_INDEX
GO
CREATE INDEX i2_Lexhits ON pfuser01.LexHits(lhRuleId,lhDate) ON ZL_APP_INDEX
GO

CREATE TABLE pfuser01.LexHitsSummary (
	lhsRuleId	INT NOT NULL,
	lhsDateStart	DATETIME NOT NULL,
	lhsDateEnd	DATETIME NOT NULL,
	lhsMsgCount	INT NOT NULL,
	lhsTracItemCount	INT NOT NULL,
	lhsOccurrenceCount	INT NOT NULL,
	lhsWeightedFeedback	INT NULL
) ON ZL_APP
GO
CREATE INDEX i1_lhSummary ON pfuser01.LexHitsSummary(lhsDateStart,lhsDateEnd) ON ZL_APP_INDEX
GO
	CREATE INDEX i2_lhSummary ON pfuser01.LexHitsSummary(lhsRuleId) ON ZL_APP_INDEX
GO
	
CREATE SEQUENCE pfuser01.WordList_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser01.WordList (
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
	CONSTRAINT pk_WordList PRIMARY KEY (wlId) ON ZL_APP_INDEX,
    CONSTRAINT uk3_WordList UNIQUE (wlTenantId,wlName) ON ZL_APP_INDEX
) ON ZL_APP
GO
		


CREATE TABLE pfuser01.WordListEntry (
	entryWord NVARCHAR(255) NOT NULL,
	entryListId		INT NOT NULL,
	CONSTRAINT uk_WordListEntry PRIMARY KEY (entryListId,entryWord) ON ZL_APP_INDEX
) ON ZL_APP
GO


CREATE TABLE pfuser01.WordListHistory (
	hisListId		INT NOT NULL,
	hisAction	INT NOT NULL,
	hisWord		NVARCHAR(255) NOT NULL,
	hisDate	DATETIME NOT NULL
) ON ZL_APP
GO
CREATE INDEX i1_wordListHis ON pfuser01.WordListHistory(hisListId,hisDate) ON ZL_APP_INDEX
GO



CREATE SEQUENCE pfuser01.PreApprovedDocument_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.PreApprovedDocument (
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
	CONSTRAINT pk_preApprDoc PRIMARY KEY (pdId) ON ZL_APP_INDEX
) ON ZL_APP
GO
CREATE INDEX i1_preApprDoc ON pfuser01.PreApprovedDocument(pdEndDate) ON ZL_APP_INDEX
GO

