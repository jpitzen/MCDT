

CREATE SEQUENCE pfuser.AddrBook_Sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.AddrBook (
	abId			            INT NOT NULL,
	abAcctNo		            INT NULL,
	abName			            NVARCHAR(255) NOT NULL,
	abType			            VARCHAR(64) NOT NULL,
    	abUsageType		            VARCHAR(64) NOT NULL,
	abDesc 			            NVARCHAR(255) NULL,
	abVal1			            NVARCHAR(255) NULL,
	abVal2			            NVARCHAR(255) NULL,
	abVal3			            NVARCHAR(255) NULL,
	CONSTRAINT pk_AddrBook PRIMARY KEY (abId)
)
GO


CREATE INDEX i1_AddrBook ON pfuser.AddrBook(abAcctNo)
GO


-- OPTIONAL
CREATE SEQUENCE pfuser.ZipAddrEntry_Sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.ZipAddrEntry (
	-- IDENTITY
	AddrEntryId                 BIGINT NOT NULL,
	AddrEntryAddrBookId         INT NOT NULL,
	AddrEntryEmail              VARCHAR(255)  NULL,
	AddrEntryName               NVARCHAR(255) NULL,
	AddrEntryAlias              NVARCHAR(255) NOT NULL,
	AddrEntryPhone              NVARCHAR(64) NULL,
	AddrEntryType               INT NOT NULL,
    CONSTRAINT pk_ZipAddrEntry PRIMARY KEY (AddrEntryId),
    CONSTRAINT uk_ZipAddrEntry UNIQUE (AddrEntryAddrBookId,AddrEntryAlias)
)
GO


CREATE INDEX i1_ZipAddrEntry ON pfuser.ZipAddrEntry(AddrEntryAddrBookId)
GO


CREATE TABLE pfuser.ZipAddrListEntry (
	AddrListId                  INT NOT NULL,
	AddrEntryId                 INT NOT NULL,
    CONSTRAINT uk_ZipAddrList UNIQUE (AddrListId,AddrEntryId)
)
GO


CREATE INDEX i1_ZipAddrList ON pfuser.ZipAddrListEntry(AddrListId)
GO
