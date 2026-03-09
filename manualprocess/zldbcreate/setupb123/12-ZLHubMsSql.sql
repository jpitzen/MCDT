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
