-- *************************************************************************************
-- FileName :ArchiveOra.sql
-- Features :
--
--
-- *************************************************************************************
-- *************************************************************************************



-- OPTIONAL
CREATE SEQUENCE pfuser01.ArchiveServer_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.ArchiveServer (
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
	CONSTRAINT pk_ArServer PRIMARY KEY (asId) ON ZL_APP_INDEX,
--	CONSTRAINT fk_ArServerDomain FOREIGN KEY (asDomainId) REFERENCES pfuser01.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_ArServerJDomain FOREIGN KEY (asJournalDomainId) REFERENCES pfuser01.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_ArServerZLPUser FOREIGN KEY (asJournalPrimaryZLPUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE,
	CONSTRAINT uk_ArServerName UNIQUE (asTenantId,asServerName) ON ZL_APP_INDEX,
	CONSTRAINT uk_ArServerDomain UNIQUE (asDomainId) ON ZL_APP_INDEX,
	CONSTRAINT uk_ArServerJDomain UNIQUE (asJournalDomainId) ON ZL_APP_INDEX
) ON ZL_APP
GO



-- OPTIONAL
CREATE SEQUENCE pfuser01.ArchiveMailServer_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.ArchiveMailServer (
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
	CONSTRAINT pk_Ams PRIMARY KEY (amsId) ON ZL_APP_INDEX,
	CONSTRAINT uk_Ams UNIQUE (amsTenantId,amsServerName) ON ZL_APP_INDEX
) ON ZL_APP
GO


CREATE TABLE pfuser01.PublicFolderRoot (
	pfrMailServerId				INT NOT NULL,
	pfrRoot		NVARCHAR(1024) NOT NULL
--,
--	CONSTRAINT pk_pfr PRIMARY KEY (pfrMailServerId,pfrRoot) ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_pfr FOREIGN KEY (pfrMailServerId) REFERENCES pfuser01.ArchiveMailServer(amsId) ON DELETE CASCADE
) ON ZL_APP
GO



CREATE TABLE pfuser01.ArchiveUserInfo (
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
	CONSTRAINT pk_Aui PRIMARY KEY (auiZlpUserId) ON ZL_APP_INDEX,
--	CONSTRAINT fk_AuiAs FOREIGN KEY (auiAsId) REFERENCES pfuser01.ArchiveServer(asId) ON DELETE CASCADE,
--	CONSTRAINT fk_AuiAms FOREIGN KEY (auiAmsId) REFERENCES pfuser01.ArchiveMailServer(amsId) ON DELETE SET NULL,
--	CONSTRAINT fk_AuiZLPUser FOREIGN KEY (auiZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE,
	CONSTRAINT uk2_Aui UNIQUE (auiTenantId,auiOwner) ON ZL_APP_INDEX,
 	-- CONSTRAINT ukExtRef_Aui UNIQUE (auiExtRef) ON ZL_APP_INDEX,
 	CONSTRAINT ukAddr2_Aui UNIQUE (auiTenantId,auiAddress) ON ZL_APP_INDEX
) ON ZL_APP
GO
CREATE INDEX i1_Aui ON pfuser01.ArchiveUserInfo(auiAsId) ON ZL_APP_INDEX
GO
	CREATE INDEX i2_Aui ON pfuser01.ArchiveUserInfo(auiAmsId) ON ZL_APP_INDEX
GO
	CREATE INDEX i3_Aui ON pfuser01.ArchiveUserInfo(auiFullName) ON ZL_APP_INDEX
GO
	CREATE INDEX i4_Aui ON pfuser01.ArchiveUserInfo(auiMailStoreInfo) ON ZL_APP_INDEX
GO
			CREATE INDEX i5_Aui ON pfuser01.ArchiveUserInfo(auiExtRef) ON ZL_APP_INDEX
GO
CREATE INDEX i6_Aui ON pfuser01.ArchiveUserInfo(auiCreateDate) ON ZL_APP_INDEX
GO

	
CREATE TABLE pfuser01.ArchiveUserAlias (	
	auaAlias NVARCHAR(255) NOT NULL,
	auaZlpUserId	INT NOT NULL,
	auaAsId			INT NOT NULL,
	auaTenantId INT NOT NULL,
	auaType	INT NOT NULL,
	auaDate 	DATETIME NOT NULL,
	CONSTRAINT pk2_aua PRIMARY KEY (auaTenantId,auaAlias) ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_auaAs FOREIGN KEY (auaAsId) REFERENCES pfuser01.ArchiveServer(asId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_auaZLPUser FOREIGN KEY (auaZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE
) ON ZL_APP
GO
CREATE INDEX i1_Aua ON pfuser01.ArchiveUserAlias(auaZlpUserId) ON ZL_APP_INDEX
GO
	


-- OPTIONAL
CREATE SEQUENCE pfuser01.ArchiveUserHistory_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.ArchiveUserHistory (
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
	CONSTRAINT pk_Auh PRIMARY KEY (auhId) ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_AuhAs FOREIGN KEY (auhAsId) REFERENCES pfuser01.ArchiveServer(asId) ON DELETE CASCADE,
--	CONSTRAINT fk_AuhAms FOREIGN KEY (auhAmsId) REFERENCES pfuser01.ArchiveMailServer(amsId) ON DELETE SET NULL
--,
--	CONSTRAINT fk_AuhZLPUser FOREIGN KEY (auhZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_AuhModZLPUser FOREIGN KEY (auhModifyingZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE
) ON ZL_APP
GO
CREATE INDEX i1_Auh ON pfuser01.ArchiveUserHistory(auhZlpUserId) ON ZL_APP_INDEX
GO
	CREATE INDEX i2_Auh ON pfuser01.ArchiveUserHistory(auhDate) ON ZL_APP_INDEX
GO
		

-- OPTIONAL
CREATE SEQUENCE pfuser01.ArchiveUserAliasHistory_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO
	
CREATE TABLE pfuser01.ArchiveUserAliasHistory (	
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
	CONSTRAINT pk_Auah PRIMARY KEY (auahId) ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_AuahAs FOREIGN KEY (auahAsId) REFERENCES pfuser01.ArchiveServer(asId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_AuahZLPUser FOREIGN KEY (auahZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_AuahModZLPUser FOREIGN KEY (auahModifyingZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE
) ON ZL_APP
GO
CREATE INDEX i1_Auah ON pfuser01.ArchiveUserAliasHistory(auahZlpUserId) ON ZL_APP_INDEX
GO
	CREATE INDEX i2_Auah ON pfuser01.ArchiveUserAliasHistory(auahAlias) ON ZL_APP_INDEX
GO
	CREATE INDEX i3_Auah ON pfuser01.ArchiveUserAliasHistory(auahDate) ON ZL_APP_INDEX
GO
	



CREATE TABLE pfuser01.ArchiveAuditTrail (
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
--	CONSTRAINT fk_aatDomain FOREIGN KEY (aatDomainId) REFERENCES pfuser01.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_aatMsg FOREIGN KEY (aatMsgId) REFERENCES pfuser01.ZLPMessage(MsgId) ON DELETE CASCADE,
--	CONSTRAINT fk_aatZLPUser FOREIGN KEY (aatZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE
) ON ZL_ITEM
GO

CREATE INDEX i1_AAT ON pfuser01.ArchiveAuditTrail(aatDate) ON ZL_ITEM_INDEX
GO
CREATE INDEX i2_AAT ON pfuser01.ArchiveAuditTrail(aatUser,aatDate) ON ZL_ITEM_INDEX
GO
CREATE INDEX i3_AAT ON pfuser01.ArchiveAuditTrail(aatDomainId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i4_AAT ON pfuser01.ArchiveAuditTrail(aatZlpUserId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i5_AAT ON pfuser01.ArchiveAuditTrail(aatMsgId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i6_AAT ON pfuser01.ArchiveAuditTrail(aatOwnerZlpUserId) ON ZL_ITEM_INDEX
GO




-- OPTIONAL
CREATE SEQUENCE pfuser01.ImportTask_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.ImportTask (
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
	CONSTRAINT pk_impTask PRIMARY KEY (impId) ON ZL_TRANSIENT_INDEX,
	CONSTRAINT uk2_impTask UNIQUE (impTenantId,impInstanceName) 	ON ZL_APP_INDEX 
) ON ZL_TRANSIENT
GO
CREATE INDEX i1_impTask ON pfuser01.ImportTask(impStartDate) ON ZL_TRANSIENT_INDEX
GO
CREATE INDEX i2_impTask ON pfuser01.ImportTask(impType,impDate) ON ZL_TRANSIENT_INDEX
GO




CREATE SEQUENCE pfuser01.ExportTask_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.ExportTask (
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
	CONSTRAINT pk_expTask PRIMARY KEY (expId) ON ZL_TRANSIENT_INDEX
--,
--	CONSTRAINT fk_expTaskParent FOREIGN KEY (expParentId) REFERENCES pfuser01.ExportTask(expId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_expTaskVa FOREIGN KEY (expVaultId) REFERENCES pfuser01.VaultItem(viStId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO
CREATE INDEX i3_expTask ON pfuser01.ExportTask(expTenantId,expStartDate) ON ZL_TRANSIENT_INDEX
GO
CREATE INDEX i2_expTask ON pfuser01.ExportTask(expUser) ON ZL_TRANSIENT_INDEX
GO




CREATE TABLE pfuser01.ExportTaskEntry (
	entryExpId	INT NOT NULL,
	entryItemId	INT NOT NULL,
	entryItemStId  	VARCHAR(255)  NULL,
	entryItemDigest	VARCHAR(255)  NULL,
	entryItemSize	INT NOT NULL,
	entryBatch	NVARCHAR(255) NULL,
	entryStatus	INT NOT NULL,
	entryRetry	INT NULL,	
	entryUpdate	DATETIME NOT NULL
) ON ZL_TRANSIENT
GO
CREATE INDEX i2_ExpTaskEnt ON pfuser01.ExportTaskEntry(entryExpId,entryItemStId) ON ZL_TRANSIENT_INDEX
GO



CREATE TABLE pfuser01.ArchiveMailServerAgent (
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
	CONSTRAINT pk_amsAgent PRIMARY KEY (amsaAmsId,amsaAgentName) ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_amsAgentAms FOREIGN KEY (amsaAmsId) REFERENCES pfuser01.ArchiveMailServer(amsId) ON DELETE CASCADE
) ON ZL_APP
GO
CREATE INDEX i1_amsAgent ON pfuser01.ArchiveMailServerAgent(amsaAmsId) ON ZL_APP_INDEX
GO
	CREATE INDEX i2_amsAgent ON pfuser01.ArchiveMailServerAgent(amsaIterStartDate) ON ZL_APP_INDEX
GO

CREATE SEQUENCE pfuser01.ArchiveMailServerAgentRuns_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.ArchiveMailServerAgentRuns (
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
	CONSTRAINT pk_amsaRuns PRIMARY KEY (amsarId) ON ZL_TRANSIENT_INDEX
--,
--	CONSTRAINT fk_amsaRunsAms FOREIGN KEY (amsarAmsId) REFERENCES pfuser01.ArchiveMailServer(amsId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO
CREATE INDEX i1_amsaRuns ON pfuser01.ArchiveMailServerAgentRuns(amsarStartDate) ON ZL_TRANSIENT_INDEX
GO
CREATE INDEX i2_amsaRuns ON pfuser01.ArchiveMailServerAgentRuns(amsarAmsId,amsarAgentName) ON ZL_TRANSIENT_INDEX
GO



CREATE TABLE pfuser01.ArchiveUserRuns (
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
	CONSTRAINT pk_aurRuns PRIMARY KEY (aurZlpUserId,aurAmsarId) ON ZL_TRANSIENT_INDEX
--,
--	CONSTRAINT fk_aurRunsAms FOREIGN KEY (aurAmsId) REFERENCES pfuser01.ArchiveMailServer(amsId) ON DELETE CASCADE,
--	CONSTRAINT fk_aurRunsAmsar FOREIGN KEY (aurAmsarId) REFERENCES pfuser01.ArchiveMailServerAgentRuns(amsarId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_aurZLPUser FOREIGN KEY (aurZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO
CREATE INDEX i1_aurRuns ON pfuser01.ArchiveUserRuns(aurStartDate) ON ZL_TRANSIENT_INDEX
GO
CREATE INDEX i2_aurRuns ON pfuser01.ArchiveUserRuns(aurAmsId) ON ZL_TRANSIENT_INDEX
GO
CREATE INDEX i3_aurRuns ON pfuser01.ArchiveUserRuns(aurAmsarId) ON ZL_TRANSIENT_INDEX
GO


CREATE TABLE pfuser01.IMAPTransport (
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
	CONSTRAINT pk_imapTransport PRIMARY KEY (itFolderName) ON ZL_TRANSIENT_INDEX
--,
--	CONSTRAINT fk_imapTransport FOREIGN KEY (itAmsId) REFERENCES pfuser01.ArchiveMailServer(amsId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_imapTransportVa FOREIGN KEY (itVaultId) REFERENCES pfuser01.VaultItem(viStId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO

CREATE INDEX i1_imapTransport ON pfuser01.IMAPTransport(itStartDate) ON ZL_TRANSIENT_INDEX
GO
CREATE INDEX i2_imapTransport ON pfuser01.IMAPTransport(itAmsId) ON ZL_TRANSIENT_INDEX
GO





CREATE TABLE pfuser01.UserDiscovery (
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
	CONSTRAINT pk2_usrDisc PRIMARY KEY (udTenantId,udName) ON ZL_APP_INDEX
) ON ZL_APP
GO




CREATE TABLE pfuser01.UserDiscoveryExclusion (
	udeUdName NVARCHAR(64) NOT NULL,
	udeFieldName		NVARCHAR(64) NOT NULL,
	udeFieldValue		NVARCHAR(255) NOT NULL,
	udeDate		DATETIME NOT NULL,
	CONSTRAINT pk_ude PRIMARY KEY (udeUdName,udeFieldName,udeFieldValue) ON ZL_APP_INDEX
) ON ZL_APP
GO
CREATE INDEX i1_ude ON pfuser01.UserDiscoveryExclusion(udeUdName) ON ZL_APP_INDEX
GO
	



CREATE SEQUENCE pfuser01.MailRetMan_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.MailRetentionManager (
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
	CONSTRAINT pk_mrm PRIMARY KEY (mrmId) ON ZL_TRANSIENT_INDEX
) ON ZL_TRANSIENT
GO
CREATE INDEX i1_mrm ON pfuser01.MailRetentionManager(mrmTenantId,mrmStartDate) ON ZL_TRANSIENT_INDEX
GO


CREATE TABLE pfuser01.MailRetentionUserRuns (
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
	CONSTRAINT pk_mrur PRIMARY KEY (mrurId,mrurZlpUserId) ON ZL_TRANSIENT_INDEX
--,
--	CONSTRAINT fk_mrurDomain FOREIGN KEY (mrurDomainId) REFERENCES pfuser01.DomainInfo(diId) ON DELETE CASCADE,
--	CONSTRAINT fk_mrurZLPUser FOREIGN KEY (mrurZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO



CREATE SEQUENCE pfuser01.MailPurgTran_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.MailPurgeTransaction (
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
	CONSTRAINT pk_mpt PRIMARY KEY (mptId) ON ZL_TRANSIENT_INDEX
--,
--	CONSTRAINT fk_mpt FOREIGN KEY (mptmrurId) REFERENCES pfuser01.MailRetentionUserRuns(mrurId) ON DELETE CASCADE,
--,
--	CONSTRAINT fk_mptZLPUser FOREIGN KEY (mptZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_mptVa FOREIGN KEY (mptTranscriptVaultId) REFERENCES pfuser01.VaultItem(viStId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO
CREATE INDEX i1_mpt ON pfuser01.MailPurgeTransaction(mptmrurId) ON ZL_TRANSIENT_INDEX
GO


CREATE TABLE pfuser01.MailPurgeRequest (
	purgeMsgId                       VARCHAR(64) NOT NULL,
	purgeMsgUserId	                    INT NOT NULL,
	purgeMsgTenantId		INT NOT NULL,
	purgeMsgDate			    DATETIME NOT NULL,
	purgeMsgDateCreate	            DATETIME NOT NULL,
	purgeMsgDateUpdate                  DATETIME NOT NULL,
	purgeMsgStatus		    	    INT NOT NULL,	
	purgeMsgRunId	                    INT NOT NULL,
	purgeMsgReason			    NVARCHAR(255) NULL,
	CONSTRAINT pk_MailPurgeRequest PRIMARY KEY (purgeMsgId) ON ZL_TRANSIENT_INDEX
)ON ZL_TRANSIENT
GO

CREATE INDEX i1_MailPurgeRequest ON pfuser01.MailPurgeRequest(purgeMsgTenantId,purgeMsgStatus,purgeMsgDate) ON ZL_TRANSIENT_INDEX
GO





CREATE SEQUENCE pfuser01.MailboxFolder_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO



CREATE TABLE pfuser01.MailboxFolder (
	mbfId	INT NOT NULL,
	mbfZlpUserId	INT NOT NULL,
	-- //MSSQL{[NVARCHAR2(255) NOT NULL~~NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL]}
	mbfName	NVARCHAR(255) COLLATE Latin1_General_BIN NOT NULL,
	mbfDisplayName	NVARCHAR(255) NOT NULL,
	mbfParentId	INT NOT NULL,
	mbfCreateDate	DATETIME NOT NULL,
	mbfLastUpdate	DATETIME NOT NULL,
	CONSTRAINT pk_mbf PRIMARY KEY (mbfId) ON ZL_MAILBOX_INDEX,
--	CONSTRAINT fk_mbfZLPUser FOREIGN KEY (mbfZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_mbfParent FOREIGN KEY (mbfParentId) REFERENCES pfuser01.MailboxFolder(mbfId) ON DELETE CASCADE,
--	CONSTRAINT fk_mbfZLPFolder FOREIGN KEY (mbfId,mbfZlpUserId) REFERENCES pfuser01.ZLPFolder(fldrId,fldrZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_mbfZLPFolder FOREIGN KEY (mbfId) REFERENCES pfuser01.ZLPFolder(fldrId) ON DELETE CASCADE,
	CONSTRAINT uk_mbf UNIQUE (mbfZlpUserId,mbfParentId,mbfName) ON ZL_APP_INDEX
) ON ZL_MAILBOX
GO








CREATE TABLE pfuser01.MailboxSync (
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
	CONSTRAINT pk_mbSync PRIMARY KEY (mbSyncZlMsgId) ON ZL_MAILBOX_INDEX,
--	CONSTRAINT fk_mbSyncZLPUser FOREIGN KEY (mbSyncZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_mbSyncFolder FOREIGN KEY (mbSyncFolderId) REFERENCES pfuser01.MailboxFolder(mbfId) ON DELETE CASCADE,
--	CONSTRAINT fk_mbSyncMsg FOREIGN KEY (mbSyncZlMsgId) REFERENCES pfuser01.ZLPMessage(MsgId) ON DELETE CASCADE,
	CONSTRAINT uk_mbSync UNIQUE (mbSyncZlpUserId,mbSyncUnid) ON ZL_MAILBOX_INDEX
)
ON ZL_MAILBOX
GO

-- CREATE INDEX i1_mbSync ON pfuser01.MailboxSync(mbSyncZlpUserId,mbSyncDeletedOnMailServer) ON ZL_MAILBOX_INDEX
GO
CREATE INDEX i2_mbSync ON pfuser01.MailboxSync(mbSyncZlpUserId,mbSyncFullScanOnly) ON ZL_MAILBOX_INDEX
GO



CREATE TABLE pfuser01.MbSyncAuditTrail (
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
ON ZL_ITEM
GO


CREATE INDEX i1_MbSyncAudTrail ON pfuser01.MbSyncAuditTrail(mbsaDate) ON ZL_ITEM_INDEX
GO
CREATE INDEX i2_MbSyncAudTrail ON pfuser01.MbSyncAuditTrail(mbsaDomainId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i3_MbSyncAudTrail ON pfuser01.MbSyncAuditTrail(mbsaZlpUserId) ON ZL_ITEM_INDEX
GO
CREATE INDEX i4_MbSyncAudTrail ON pfuser01.MbSyncAuditTrail(mbsaMsgId) ON ZL_ITEM_INDEX
GO



CREATE TABLE pfuser01.MessageImport (
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
	CONSTRAINT pk_msgImp PRIMARY KEY (miSystemId,miId) ON ZL_TRANSIENT_INDEX
) ON ZL_TRANSIENT
GO
CREATE INDEX i2_msgImp ON pfuser01.MessageImport(miSystemId,miLocation) ON ZL_TRANSIENT_INDEX
GO
CREATE INDEX i3_msgImp ON pfuser01.MessageImport(miSystemId,miBatchId,miStatus) ON ZL_TRANSIENT_INDEX
GO

-- OPTIONAL
CREATE SEQUENCE pfuser01.LegacySystem_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.LegacySystem (
	-- IDENTITY
	legSysId BIGINT NOT NULL,
	legSysName VARCHAR(255) NOT NULL,
	legSysType VARCHAR(255) NOT NULL,
	legSysCreateDate DATETIME NOT NULL,
	legSysTenantId INT NOT NULL,
	legSysAsId INT NOT NULL,
	CONSTRAINT pk_legSys PRIMARY KEY (legSysId) ON ZL_APP_INDEX,
	CONSTRAINT uk_legSys UNIQUE (legSysTenantId,legSysName) ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE TABLE pfuser01.LegacySystemMessage (
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
	CONSTRAINT pk_legSysMsg PRIMARY KEY (lsmSysId,lsmId) ON ZL_LEGACY_INDEX
) ON ZL_LEGACY
GO

CREATE INDEX i1_legSysMsg ON pfuser01.LegacySystemMessage(lsmSysId,lsmStatus) ON ZL_LEGACY_INDEX
GO
CREATE INDEX i2_legSysMsg ON pfuser01.LegacySystemMessage(lsmSysId,lsmLocation) ON ZL_LEGACY_INDEX
GO
CREATE INDEX i3_legSysMsg ON pfuser01.LegacySystemMessage(lsmSysId,lsmExtId) ON ZL_LEGACY_INDEX
GO

CREATE TABLE pfuser01.LSMStats (
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
	CONSTRAINT pk_LSMStats PRIMARY KEY (lsmsSysId,lsmsPeriodInfo,lsmsPID) ON ZL_LEGACY_INDEX
) ON ZL_LEGACY
GO

CREATE INDEX i1_LSMStats ON pfuser01.LSMStats(lsmsSysId,lsmsPeriodStartDate,lsmsPID) ON ZL_LEGACY_INDEX
GO

CREATE SEQUENCE pfuser01.LSMObject_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 1000
GO

CREATE TABLE pfuser01.LSMImportProblem (
	lipSysId INT NOT NULL,
	lipMiId VARCHAR(255) NOT NULL,
	lipLsmId VARCHAR(255) NOT NULL,
	lipAttempt VARCHAR(240) NOT NULL,
	lipStatus VARCHAR(255) NOT NULL,
	lipAttemptDate DATETIME NOT NULL,
	lipAttemptMachine VARCHAR(64) NOT NULL,
	lipAttemptComment NVARCHAR(255) NULL
) ON  ZL_LEGACY
GO

CREATE INDEX i1_lsmprob ON pfuser01.LSMImportProblem (lipSysId,lipMiId) ON ZL_LEGACY_INDEX
GO




CREATE TABLE pfuser01.LsmObject (
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
   	CONSTRAINT pk_lsmObj PRIMARY KEY (lsmoId,lsmoSeqNumber) ON ZL_LEGACY
)ON ZL_LEGACY
GO

CREATE TABLE pfuser01.LegacySourceReaderParam (
	lsrSysId INT  NOT NULL,
	lsrId VARCHAR(255) NOT NULL,
    	lsrFlags INT NOT NULL,
	lsrPID	 VARCHAR(64) NULL,
	lsrParamVal1 NVARCHAR(255) NOT NULL,
	lsrParamVal2 NVARCHAR(255) NULL,
	lsrParamVal3 NVARCHAR(255) NULL,
	lsrParamVal4 NVARCHAR(255) NULL,
	lsrParamVal5 NVARCHAR(255) NULL
) ON ZL_LEGACY
GO

CREATE INDEX i1_lsrParam ON pfuser01.LegacySourceReaderParam(lsrSysId,lsrId) ON ZL_LEGACY_INDEX
GO


CREATE TABLE pfuser01.LegacySystemHoldInfo (
	lshiSystemId INT NOT NULL,
	lshiExtHoldInfo  VARCHAR(255) NOT NULL,
	lshiHoldInfo  VARCHAR(255) NOT NULL,
	lshiComment VARCHAR(255) NULL,
	CONSTRAINT pk_legSysHldI PRIMARY KEY (lshiSystemId,lshiExtHoldInfo) ON ZL_APP_INDEX
)ON ZL_APP
GO

CREATE TABLE pfuser01.LegacySystemLegalHold (
	lslhSystemId INT NOT NULL,
    lslhMsgExtId INT NULL,
    lslhMsgId VARCHAR(240) NULL,
	lslhExtHoldInfo VARCHAR(255) NOT NULL,
	lslhPartition INT NOT NULL,
    lslhDateProcessed DATETIME NOT NULL,
    lslhStatus INT NOT NULL,
	lslhComment	VARCHAR(255) NULL
) ON ZL_LEGACY
GO



CREATE INDEX i1_legSysLhold ON pfuser01.LegacySystemLegalHold(lslhSystemId,lslhExtHoldInfo,lslhPartition) ON ZL_LEGACY_INDEX
GO
CREATE INDEX i2_legSysLhold ON pfuser01.LegacySystemLegalHold(lslhSystemId,lslhMsgExtId,lslhExtHoldInfo) ON ZL_LEGACY_INDEX
GO
--CREATE INDEX pfuser01.i3_legSysLhold ON pfuser01.LegacySystemLegalHold(lslhSystemId,lslhMsgId,lslhHoldInfo) ON ZL_LEGACY_INDEX
GO

CREATE TABLE pfuser01.LegacySystemFilePlan (
	lsfpSystemId INT NOT NULL,
	lsfpExtId INT NOT NULL,
	lsfpExtCategoryId INT NOT NULL,
	lsfpExtParentId INT NOT NULL,
        lsfpZlFilePlanId INT NOT NULL,
        lsfpParamVal1 VARCHAR(255) NULL,
	lsfpParamVal2 VARCHAR(255) NULL,
	lsfpParamVal3 VARCHAR(255) NULL,
	CONSTRAINT pk_legSysFplan PRIMARY KEY (lsfpSystemId,lsfpExtId,lsfpExtCategoryId,lsfpExtParentId) ON ZL_LEGACY_INDEX,
	CONSTRAINT uk_legSysFplan UNIQUE (lsfpZlFilePlanId) ON ZL_LEGACY_INDEX
) ON ZL_APP
GO
CREATE TABLE pfuser01.LegacySystemAddress (
	lsaSysId INT  NOT NULL,
	lsaAddrId BIGINT NOT NULL,
	lsaParamVal1 NVARCHAR(255) NOT NULL,
	lsaParamVal2 NVARCHAR(255) NULL,
	lsaParamVal3 NVARCHAR(255) NULL,
	lsaParamVal4 NVARCHAR(255) NULL,
	CONSTRAINT pk_legSysAddr PRIMARY KEY (lsaSysId,lsaAddrId) ON ZL_LEGACY_INDEX
) ON ZL_LEGACY
GO

CREATE SEQUENCE pfuser01.MboxUsage_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.MailboxUsage (
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
	CONSTRAINT pk_mbUsage PRIMARY KEY (mbuZlpUserId) ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_mbUsageAs FOREIGN KEY (mbuAsId) REFERENCES pfuser01.ArchiveServer(asId) ON DELETE CASCADE,
--	CONSTRAINT fk_mbUsageAms FOREIGN KEY (mbuMailServerId) REFERENCES pfuser01.ArchiveMailServer(amsId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_mbUsageZLPUser FOREIGN KEY (mbuZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE
) ON ZL_APP
GO
CREATE INDEX i1_mbUsage ON pfuser01.MailboxUsage(mbuAsId) ON ZL_APP_INDEX
GO

CREATE TABLE pfuser01.MailboxUsageHistory (
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
	CONSTRAINT pk_mbUsageHis PRIMARY KEY (mbuZlpUserId,mbuIter) ON ZL_APP_INDEX
--,
--	CONSTRAINT fk_mbUsageHisAs FOREIGN KEY (mbuAsId) REFERENCES pfuser01.ArchiveServer(asId) ON DELETE CASCADE,
--	CONSTRAINT fk_mbUsageHisAms FOREIGN KEY (mbuMailServerId) REFERENCES pfuser01.ArchiveMailServer(amsId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_mbUsageHisUser FOREIGN KEY (mbuZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE
) ON ZL_APP
GO
CREATE INDEX i1_mbUsageHis ON pfuser01.MailboxUsageHistory(mbuAsId,mbuIter) ON ZL_APP_INDEX
GO



-- OPTIONAL
CREATE SEQUENCE pfuser01.RestoreTask_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.RestoreTask (
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
	CONSTRAINT pk_rtask PRIMARY KEY (rtId) ON ZL_APP_INDEX,
--	CONSTRAINT fk_rtask FOREIGN KEY (rtVaultId) REFERENCES pfuser01.VaultItem(viStId) ON DELETE CASCADE,
	CONSTRAINT uk_rtask UNIQUE (rtName) ON ZL_APP_INDEX
) ON ZL_APP
GO


CREATE TABLE pfuser01.RestoreSync (
	rSyncTaskId	INT NOT NULL,
	rSyncZlpUserId	INT NOT NULL,
	rSyncZlMsgId	VARCHAR(64) NOT NULL,
	rSyncAmFlags	INT NOT NULL,
	rSyncStubMethod	INT NOT  NULL,
	rSyncForm		NVARCHAR(255) NULL,
	rSyncSize	INT NOT NULL,
	rSyncRetry	INT NULL,	
	rSyncUpdate	DATETIME NOT NULL,
	CONSTRAINT pk_rSync PRIMARY KEY (rSyncTaskId,rSyncZlpUserId,rSyncZlMsgId) ON ZL_TRANSIENT_INDEX
--,
--	CONSTRAINT fk_rSync FOREIGN KEY (rSyncTaskId) REFERENCES pfuser01.RestoreTask(rtId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_rSyncZLPUser FOREIGN KEY (rSyncZlpUserId) REFERENCES pfuser01.ZLPUser(ZlpUserId) ON DELETE CASCADE,
--	CONSTRAINT fk_rSyncMsg FOREIGN KEY (rSyncZlMsgId) REFERENCES pfuser01.ZLPMessage(MsgId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO



CREATE TABLE pfuser01.MessageTransportProblem (
	-- //MSSQL{[VARCHAR2(255) NOT NULL~~VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL]}
	mtpUnid       VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL,
        mtpMsgId      VARCHAR(255) NULL,
	mtpForm		NVARCHAR(255) NULL,
	mtpDate		DATETIME NOT NULL,
        mtpType VARCHAR(64) NULL,
        mtpMachine  VARCHAR(64) NOT NULL
--,
--	CONSTRAINT fk_mtpMsg FOREIGN KEY (mtpMsgId) REFERENCES pfuser01.ZLPMessage(MsgId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO
CREATE INDEX i1_MsgTranPr ON pfuser01.MessageTransportProblem(mtpUnid) ON ZL_TRANSIENT_INDEX
GO

CREATE TABLE pfuser01.DbArchive (
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
	CONSTRAINT pk_DbArchive PRIMARY KEY (dbArchiveName) ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE INDEX i1_DbArchive ON pfuser01.DbArchive(dbArchiveType) ON ZL_APP_INDEX
GO



CREATE TABLE pfuser01.ImportUserAlias (	
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
	CONSTRAINT pk_ImpUserAlias PRIMARY KEY (iuaTenantId,iuaAlias,iuaImportType) ON ZL_APP_INDEX
) ON ZL_APP
GO
CREATE INDEX i1_ImpUserAlias ON pfuser01.ImportUserAlias(iuaZlpUserId) ON ZL_APP_INDEX
GO
	

CREATE TABLE pfuser01.MailRetentionUserStats (
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
	CONSTRAINT pk_MrusUser	PRIMARY KEY (mrusZlpUserId) ON ZL_TRANSIENT_INDEX
) ON ZL_TRANSIENT
GO

CREATE INDEX i1_MrusUser ON pfuser01.MailRetentionUserStats(mrusZlpUserId, mrusDate) ON ZL_TRANSIENT_INDEX
GO



CREATE TABLE pfuser01.MailRetentionUserStatsHistory (
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
) ON ZL_TRANSIENT
GO

CREATE INDEX i1_MrusUserHis ON pfuser01.MailRetentionUserStatsHistory(mrusZlpUserId, mrusDate) ON ZL_TRANSIENT_INDEX
GO


CREATE TABLE pfuser01.MailPurgeConfirmation (
	mpcTenantId		INT NOT NULL,
	mpcMsgId		VARCHAR(64) NOT NULL,
	mpcPurgeDate	DATETIME NOT NULL,
	mpcPID			NVARCHAR(128) NULL,
	CONSTRAINT pk_mpc	PRIMARY KEY (mpcMsgId) ON ZL_TRANSIENT_INDEX
) ON ZL_TRANSIENT
GO

CREATE INDEX i1_mpc ON pfuser01.MailPurgeConfirmation(mpcTenantId,mpcPurgeDate) ON ZL_TRANSIENT_INDEX
GO

CREATE SEQUENCE pfuser01.SyncState_Sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.SyncState (
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
	CONSTRAINT pk_syncState PRIMARY KEY (ssId, ssSeqNumber)	ON ZL_APP_INDEX,
	CONSTRAINT uk_syncState UNIQUE (ssTenId, ssType, ssEntityType, ssEntityId, ssSeqNumber)	ON ZL_APP_INDEX
) ON ZL_APP
GO

CREATE TABLE pfuser01.PersistentChatUserRuns (
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
	CONSTRAINT pk_pcuRuns PRIMARY KEY (pcurZlpUserId,pcurAmsarId) ON ZL_TRANSIENT_INDEX
) ON ZL_TRANSIENT
GO
CREATE INDEX i1_pcuRuns ON pfuser01.PersistentChatUserRuns(pcurStartDate) ON ZL_TRANSIENT_INDEX
GO
CREATE INDEX i2_pcuRuns ON pfuser01.PersistentChatUserRuns(pcurAmsarId) ON ZL_TRANSIENT_INDEX
GO

CREATE TABLE pfuser01.PersistentChatMessage (
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
	CONSTRAINT uk_pcm1 UNIQUE (pcmId,pcmOwnerId) ON ZL_TRANSIENT_INDEX
) ON ZL_TRANSIENT
GO
CREATE INDEX i1_pcMessage ON pfuser01.PersistentChatMessage(pcmImportRunId) ON ZL_TRANSIENT_INDEX
GO

CREATE TABLE pfuser01.SlackTeam (
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
	CONSTRAINT pk_slackTeam PRIMARY KEY (teamId) ON ZL_TRANSIENT_INDEX
--	CONSTRAINT fk_TenantId FOREIGN KEY (teamTenantId) REFERENCES pfuser01.Tenant(tenId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO

CREATE TABLE pfuser01.SlackConversation (
    conversationId NVARCHAR(32) NOT NULL,
    conversationTenantId INT NOT NULL,
	conversationTeamId NVARCHAR(32) NULL,
	conversationName NVARCHAR(512) NOT NULL,
	conversationFlag BIGINT NOT NULL,
	conversationCreated DATETIME NOT NULL,
	conversationUpdated DATETIME NOT NULL,
	CONSTRAINT pk_Channel PRIMARY KEY (conversationId) ON ZL_TRANSIENT_INDEX
--	CONSTRAINT fk_TenantId FOREIGN KEY (conversationTenantId) REFERENCES pfuser01.Tenant(tenId) ON DELETE CASCADE
--	CONSTRAINT fk_TeamId FOREIGN KEY (conversationTeamId) REFERENCES pfuser01.SlackTeam(teamId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO
CREATE INDEX i1_SlackConversation ON pfuser01.SlackConversation(conversationTeamId) ON ZL_TRANSIENT_INDEX
GO

CREATE TABLE pfuser01.SlackMembership (
	smTenantId INT NOT NULL,
	smTeamId NVARCHAR(32) NOT NULL,
	smConversationId NVARCHAR(32) NOT NULL,
	smUserId NVARCHAR(32) NOT NULL,
	smCreated DATETIME NOT NULL,
	CONSTRAINT pk_SlackMembership PRIMARY KEY (smConversationId,smUserId) ON ZL_TRANSIENT_INDEX
--	CONSTRAINT fk_TenantId FOREIGN KEY (smTenantId) REFERENCES pfuser01.Tenant(tenId) ON DELETE CASCADE
--	CONSTRAINT fk_TeamId FOREIGN KEY (smTeamId) REFERENCES pfuser01.SlackTeam(teamId) ON DELETE CASCADE
--	CONSTRAINT fk_ConversationId FOREIGN KEY (smConversationId) REFERENCES pfuser01.SlackConversation(conversationId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO

CREATE TABLE pfuser01.SlackArchiveRuns (
	sarTenantId INT NOT NULL,
	sarAmsarId INT NOT NULL,
	sarConversationId NVARCHAR(32) NOT NULL,
	sarStartDate DATETIME NOT NULL,
	sarEndDate DATETIME NULL,
	sarOffset NVARCHAR(32) NULL,
	sarStatus INT NULL,
	CONSTRAINT pk_SlackArchiveRuns PRIMARY KEY (sarAmsarId,sarConversationId) ON ZL_TRANSIENT_INDEX
--	CONSTRAINT fk_TenantId FOREIGN KEY (sarTenantId) REFERENCES pfuser01.Tenant(tenId) ON DELETE CASCADE
--	CONSTRAINT fk_Amsar FOREIGN KEY (sarAmsarId) REFERENCES pfuser01.ArchiveMailServerAgentRuns(amsarId) ON DELETE CASCADE
--	CONSTRAINT fk_ConversationId FOREIGN KEY (sarConversationId) REFERENCES pfuser01.SlackConversation(conversationId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO

CREATE INDEX i1_SlackArchiveRuns ON pfuser01.SlackArchiveRuns(sarConversationId) ON ZL_TRANSIENT_INDEX
GO

CREATE SEQUENCE pfuser01.PersistentChatSyncState_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.PersistentChatSyncState (
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
	CONSTRAINT pk_PersistentChatSyncState PRIMARY KEY (pcssChannelId, pcssTenId) ON ZL_APP_INDEX
--	CONSTRAINT fk_TenantId FOREIGN KEY (pcssTenId) REFERENCES pfuser01.Tenant(tenId) ON DELETE CASCADE
--	CONSTRAINT fk_AgentRunId FOREIGN KEY (pcssAgentRunId) REFERENCES pfuser01.PersistentChatUserRuns(pcurAmsId) ON DELETE CASCADE
) ON ZL_APP
GO

CREATE SEQUENCE pfuser01.SelectiveArchiveSearch_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.SelectiveArchiveSearch (
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
    CONSTRAINT pk_SelectiveArchiveSearch PRIMARY KEY (sasId) ON ZL_APP_INDEX
--  CONSTRAINT fk_TenantId FOREIGN KEY (sasTenantId) REFERENCES pfuser01.Tenant(tenId) ON DELETE CASCADE
--  CONSTRAINT fk_ucdsId FOREIGN KEY (sasUContextDataSourceId) REFERENCES pfuser01.UContextDataSource(ucdsId) ON DELETE CASCADE
--  CONSTRAINT fk_WorkspaceId FOREIGN KEY (sasWorkspaceId) REFERENCES pfuser01.UContext(contextId) ON DELETE CASCADE
) ON ZL_APP
GO

CREATE SEQUENCE pfuser01.SelectiveArchiveRuns_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.SelectiveArchiveRuns (
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
    CONSTRAINT pk_SelectiveArchiveRuns PRIMARY KEY (runId) ON ZL_APP_INDEX
--  CONSTRAINT fk_SearchId FOREIGN KEY (runSASearchId) REFERENCES pfuser01.SelectiveArchiveSearch(sasId) ON DELETE CASCADE
) ON ZL_APP
GO

CREATE INDEX i1_SelectiveArchiveRuns ON pfuser01.SelectiveArchiveRuns(runSASearchId) ON ZL_APP_INDEX
GO

CREATE SEQUENCE pfuser01.SelectiveArchiveItems_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser01.SelectiveArchiveItems (
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
    CONSTRAINT pk_SelectiveArchiveItems PRIMARY KEY (itemId) ON ZL_APP_INDEX
--  CONSTRAINT fk_SearchId FOREIGN KEY (itemSASearchId) REFERENCES pfuser01.SelectiveArchiveSearch(sasId) ON DELETE CASCADE
) ON ZL_APP
GO

CREATE INDEX i1_SelectiveArchiveItems ON pfuser01.SelectiveArchiveItems(itemInplaceRefId,itemSASearchId,itemStatus,itemRetryCount) ON ZL_APP_INDEX
GO

