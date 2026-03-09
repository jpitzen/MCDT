-- *************************************************************************************
-- FileName :AssentorMigration.sql
-- Features :
--
--
-- *************************************************************************************
-- *************************************************************************************

CREATE TABLE pfuser.ZLAssentorMap (
	zlMsgId VARCHAR(255)  NOT NULL,
	araMsgId VARCHAR(255) NOT NULL,
	zlProcessedDate DATETIME NOT NULL,
	CONSTRAINT pk_ZLAssentMap PRIMARY KEY (ZlMsgId)
)
GO
CREATE INDEX i1_ZLAssentMap ON pfuser.ZLAssentorMap(araMsgId)
GO


CREATE TABLE pfuser.AssentorReviewAudit (
	araSystemId INT NOT NULL,
	araMsgId VARCHAR(255) NOT NULL,
        araDoc2Id INT NOT NULL,
	araDate DATETIME NOT NULL,
	araActionType VARCHAR(255) NULL,
	araAction     VARCHAR(255) NULL,
	araEmployee	VARCHAR(255) NULL,
	araActionCode BIGINT NULL,
	araId1 INT NULL,
	araMachine VARCHAR(255) NULL,
        araInstanceName VARCHAR(255) NULL,
        araDateProcessed DATETIME NOT NULL,
        araStatus INT NOT NULL,
	araCommentVal1	VARCHAR(255) NULL,
	araCommentVal2	VARCHAR(255) NULL,
	araCommentVal3	VARCHAR(255) NULL
)
GO



CREATE INDEX i1_AssRevAud ON pfuser.AssentorReviewAudit(araSystemId,araMsgId,araStatus)
GO
CREATE INDEX i2_AssRevAud ON pfuser.AssentorReviewAudit(araSystemId,araDoc2Id,araStatus)
GO


CREATE TABLE pfuser.CenteraMigMessage(
	cmmClipId VARCHAR(255) NOT NULL,
        cmmMsgId VARCHAR(255) NOT NULL,
        cmmCreateDate DATETIME NOT NULL
)
GO

CREATE INDEX i1_centMigMsg ON pfuser.CenteraMigMessage(cmmClipId)
GO



--Legato 

CREATE TABLE pfuser.EmxAddress (
	emxAddrId BIGINT NOT NULL,
	emxAddr  NVARCHAR(2000) NOT NULL,
	emxSystemId INT NOT NULL,
	CONSTRAINT  pk_emxAddr PRIMARY KEY (emxSystemId,emxAddrId)
)
GO
