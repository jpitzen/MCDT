-- *************************************************************************************
-- FileName :AssentorMigration.sql
-- Features :
--
--
-- *************************************************************************************
-- *************************************************************************************

CREATE TABLE pfuser01.ZLAssentorMap (
	zlMsgId VARCHAR(255)  NOT NULL,
	araMsgId VARCHAR(255) NOT NULL,
	zlProcessedDate DATETIME NOT NULL,
	CONSTRAINT pk_ZLAssentMap PRIMARY KEY (ZlMsgId) ON ZL_TRACKER_INDEX 
) ON ZL_TRACKER
GO
CREATE INDEX i1_ZLAssentMap ON pfuser01.ZLAssentorMap(araMsgId) ON ZL_TRACKER_INDEX
GO


CREATE TABLE pfuser01.AssentorReviewAudit (
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
) ON ZL_TRACKER
GO



CREATE INDEX i1_AssRevAud ON pfuser01.AssentorReviewAudit(araSystemId,araMsgId,araStatus) ON ZL_TRACKER_INDEX
GO
CREATE INDEX i2_AssRevAud ON pfuser01.AssentorReviewAudit(araSystemId,araDoc2Id,araStatus) ON ZL_TRACKER_INDEX
GO


CREATE TABLE pfuser01.CenteraMigMessage(
	cmmClipId VARCHAR(255) NOT NULL,
        cmmMsgId VARCHAR(255) NOT NULL,
        cmmCreateDate DATETIME NOT NULL
) ON ZL_TRANSIENT
GO

CREATE INDEX i1_centMigMsg ON pfuser01.CenteraMigMessage(cmmClipId) ON ZL_TRANSIENT_INDEX
GO



--Legato 

CREATE TABLE pfuser01.EmxAddress (
	emxAddrId BIGINT NOT NULL,
	emxAddr  NVARCHAR(2000) NOT NULL,
	emxSystemId INT NOT NULL,
	CONSTRAINT  pk_emxAddr PRIMARY KEY (emxSystemId,emxAddrId) ON ZL_LEGACY_INDEX
) ON ZL_LEGACY
GO

