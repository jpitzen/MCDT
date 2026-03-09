





CREATE TABLE pfuser01.ZLAV3MigVaultItem (
        viStId              VARCHAR(255) NOT NULL,
	viDate		DATETIME NOT NULL,
	viChangeNumber INT NOT NULL,
	viMsgCount		INT NOT NULL,
	viPendingCount		INT NOT NULL,
        viDone CHAR(1) NULL,
        CONSTRAINT pk_zlav3 PRIMARY KEY (viStId) ON ZL_TRANSIENT           
) ON ZL_TRANSIENT
GO


CREATE INDEX i1_zlav3 ON pfuser01.ZLAV3MigVaultItem(viDone) ON ZL_TRANSIENT
GO

