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
