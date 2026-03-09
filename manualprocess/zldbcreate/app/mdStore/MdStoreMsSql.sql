-- Table: MetaDataStoreVaultItem

CREATE SEQUENCE pfuser.MetaDataStoreItem_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO

CREATE TABLE pfuser.MetaDataStoreItem (
	mdsItemUid			BIGINT NOT NULL,
	mdsItemEntityId		INT NOT NULL,
	-- //MSSQL{[VARCHAR2(255) NOT NULL~~VARCHAR(255) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL]}
	mdsMsgType	INT NOT NULL,
	mdsItemDateProcessed	DATETIME NOT NULL,
	mdsItemVaultId		VARCHAR(128) NOT NULL,
	mdsItemEncMsgPwd		VARBINARY(128) NULL,
	mdsItemUnId	VARCHAR(255) NOT NULL,
	mdsItemType	INT NOT NULL,
	mdsItemFlags INT NOT NULL,
	mdsItemVersion VARCHAR(32) NOT NULL,
	CONSTRAINT pk_MdsItem PRIMARY KEY (mdsItemUid),
	CONSTRAINT uk2_MdsItem UNIQUE (mdsItemVaultId),
	CONSTRAINT uk3_MdsItem UNIQUE (mdsItemEntityId, mdsItemUnId, mdsItemType)
)
GO
