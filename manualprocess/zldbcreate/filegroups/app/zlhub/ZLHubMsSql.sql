-- *************************************************************************************
-- FileName :ZLHubOra.sql
-- Features :
--
--
-- *************************************************************************************
-- *************************************************************************************


CREATE TABLE pfuser01.MessageTransport (
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
	CONSTRAINT pk_MsgTrans PRIMARY KEY (mtMsgId) ON ZL_HUB_INDEX 
--,
--	CONSTRAINT fk_MsgTrans FOREIGN KEY (mtMsgId) REFERENCES pfuser01.ZLPMessage(MsgId) ON DELETE CASCADE
--,
--	CONSTRAINT fk_MsgTransVa FOREIGN KEY (mtVaultId) REFERENCES pfuser01.VaultItem(viStId) ON DELETE CASCADE
) ON ZL_HUB
GO


CREATE INDEX i1_MsgTrans ON pfuser01.MessageTransport(mtState,mtDate) ON ZL_HUB_INDEX
GO
CREATE INDEX i2_MsgTrans ON pfuser01.MessageTransport(mtDate) ON ZL_HUB_INDEX
GO

--------------------------------------


CREATE TABLE pfuser01.MsgTransportConfirmation (
	mtcMsgId VARCHAR(64) NOT NULL,
	mtcInstall VARCHAR(64) NOT NULL,
	mtcDate	DATETIME NOT NULL,
	CONSTRAINT pk_MsgTrConf PRIMARY KEY (mtcMsgId) ON ZL_TRANSIENT_INDEX 
--,
--	CONSTRAINT fk_MsgTrConf FOREIGN KEY (mtMsgId) REFERENCES pfuser01.ZLPMessage(MsgId) ON DELETE CASCADE
) ON ZL_TRANSIENT
GO


CREATE INDEX i1_MsgTrConf ON pfuser01.MsgTransportConfirmation(mtcInstall) ON ZL_TRANSIENT_INDEX
GO



CREATE SEQUENCE pfuser01.ProfileTransport_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.ProfileTransport (
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
	CONSTRAINT pk_PrTrans PRIMARY KEY (ptId) ON ZL_HUB_INDEX 
--,
--	CONSTRAINT fk_PrTrans FOREIGN KEY (ptEntityId) REFERENCES pfuser01.EntityObject(eoEntityId) ON DELETE CASCADE
) ON ZL_HUB
GO

CREATE INDEX i1_PrTrans ON pfuser01.ProfileTransport(ptState,ptId) ON ZL_HUB_INDEX
GO

