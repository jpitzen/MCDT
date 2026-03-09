

CREATE TABLE pfuser.GlobalCoordCluster (
	gccProcessName 		VARCHAR(255) NOT NULL,
	gccProcessIp	 	VARCHAR(64) NOT NULL,
	gccClusterName 		VARCHAR(255) NOT NULL,
	gccWeight 		    INT NOT NULL,
	gccState 		    INT NOT NULL,
	gccCreateDate 		DATETIME NOT NULL,
	gccUpdateDate 		DATETIME NOT NULL,
	CONSTRAINT pk_GCC PRIMARY KEY (gccClusterName,gccProcessName)
)
GO


CREATE SEQUENCE pfuser.GlobalCoordRuntime_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.GlobalCoordRuntime (
	gcrtClusterName 		VARCHAR(255) NOT NULL,
	gcrtLiveProcessName 	VARCHAR(255) NOT NULL,
	gcrtIterNumber 		    INT NOT NULL,
        gcrtUpdate 		        DATETIME NOT NULL,
	gcrtConnectionStrength	INT NOT NULL,
	CONSTRAINT pk_GCRT PRIMARY KEY (gcrtClusterName)
)
GO



CREATE SEQUENCE pfuser.TaskDrivers_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.TaskDrivers (
	tdId 			    INT NOT NULL,
	tdName 			    VARCHAR(255) NOT NULL,
	tdType 			    VARCHAR(255) NOT NULL,
	tdDisplayName 		    VARCHAR(255) NULL,
	tdCluster 		    VARCHAR(64) NULL,
	tdPrimaryMachine 	VARCHAR(255) NULL,
	tdRunOnMachineOnly 	CHAR(1) NULL,
	tdCreateDate 		DATETIME NOT NULL,
	tdLastUpdate 		DATETIME NOT NULL,
	tdScheduleInfoVal1 	NVARCHAR(255) NULL,
	tdScheduleInfoVal2 	NVARCHAR(255) NULL,
	tdScheduleInfoVal3 	NVARCHAR(255) NULL,
	tdVal1 			    NVARCHAR(255) NULL,
	tdVal2 			    NVARCHAR(255) NULL,
	tdVal3 			    NVARCHAR(255) NULL,
	CONSTRAINT pk_TaskDrivers PRIMARY KEY (tdId),
	CONSTRAINT uk_TaskDrivers UNIQUE (tdName)
)
GO


CREATE SEQUENCE pfuser.TaskDriverRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.TaskDriverRuns (
	tdrId 			    INT NOT NULL,
	tdrTdId 			INT NOT NULL,
	tdrMachine 		    VARCHAR(255) NOT NULL,
	tdrCluster 		    VARCHAR(64) NULL,
	tdrAlcId		VARCHAR(64) NULL,
	tdrPID			VARCHAR(64) NULL,
	tdrType		        VARCHAR(255) NULL,
	tdrStartDate 		DATETIME NOT NULL,
	tdrLastUpdate 		DATETIME NOT NULL,
	tdrNextRunDate 		DATETIME NULL,
	tdrStatus 		    INT NOT NULL,
	tdrVal1 			NVARCHAR(255) NULL,
	tdrVal2 			NVARCHAR(255) NULL,
	tdrVal3 			NVARCHAR(255) NULL,
	tdrVal4 			NVARCHAR(255) NULL,
	CONSTRAINT pk_TaskDriverRuns PRIMARY KEY (tdrId)
)
GO

CREATE INDEX i1_TaskDriverRuns ON pfuser.TaskDriverRuns(tdrTdId)
GO

CREATE INDEX i2_TaskDriverRuns ON pfuser.TaskDriverRuns(tdrLastUpdate)
GO



CREATE TABLE pfuser.TaskStatus (
    tsTdrId 		INT NOT NULL,
    tsCreateDate 	DATETIME NOT NULL,
    tsState 		INT NOT NULL,
    tsIntVal 		INT NULL,
    tsVal1 			NVARCHAR(255) NULL,
    tsVal2 			NVARCHAR(255) NULL,
    tsVal3 			NVARCHAR(255) NULL
)
GO

CREATE INDEX i1_TaskStatus ON pfuser.TaskStatus(tsTdrId)
GO

CREATE INDEX i2_TaskStatus ON pfuser.TaskStatus(tsTdrId,tsIntVal)
GO

CREATE TABLE pfuser.ReportVaultItem (
    rviInstanceName 	NVARCHAR(255) NOT NULL,
    rviTdrId   INT NOT NULL,
    rviName		NVARCHAR(255) NOT NULL,
    rviDate		DATETIME NOT NULL,
    rviExpiry  DATETIME NOT NULL,
    rviVaultId	VARCHAR(64) NOT NULL,
    rviEncPwd   VARBINARY(128) NULL,
	CONSTRAINT pk_RepVault PRIMARY KEY (rviInstanceName)
)
GO

CREATE INDEX i1_RepVault ON pfuser.ReportVaultItem(rviTdrId)
GO
CREATE INDEX i2_RepVault ON pfuser.ReportVaultItem(rviDate)
GO


-- OPTIONAL
CREATE SEQUENCE pfuser.MigrationTask_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.MigrationTask (
        -- IDENTITY
	migId	BIGINT NOT NULL,
	migTenantId INT NOT NULL,
 	migType NVARCHAR(255)  NOT NULL,
	migInstanceName NVARCHAR(255) NOT NULL,
	migPID NVARCHAR(255) NOT NULL,
    migStartDate	      DATETIME NOT NULL,
	migEndDate	DATETIME NULL,
    migUpdate	DATETIME NOT NULL,
    migSuccessCount INT NULL,
	migErrorCount	INT NULL,
 	migTotal	INT NULL,
	migMessage	NVARCHAR(255) NULL,
    migVal1	NVARCHAR(255) NULL,
	migVal2	NVARCHAR(255) NULL,
	CONSTRAINT pk_MigTask PRIMARY KEY (migId),
	CONSTRAINT uk2_MigTask UNIQUE (migTenantId,migInstanceName)
)
GO
CREATE INDEX i1_MigTask ON pfuser.MigrationTask(migStartDate)
GO
CREATE INDEX i2_MigTask ON pfuser.MigrationTask(migType)
GO




CREATE SEQUENCE pfuser.BackgroundTask_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser.BackgroundTask (
	bgtId	INT NOT NULL,
 	bgtType NVARCHAR(255)  NOT NULL,
	bgtSubType NVARCHAR(255) NULL,
	bgtCluster		NVARCHAR(64) NULL,
	bgtPID			NVARCHAR(64) NULL,
        bgtStartDate	DATETIME NOT NULL,
	bgtEndDate	DATETIME NULL,
        bgtUpdate	DATETIME NOT NULL,
        bgtIter  	INT NOT NULL,
        bgtRunState	INT NOT NULL,
        bgtReportVaultId VARCHAR(255) NULL,
        bgtStatusMessage	NVARCHAR(255) NULL,
	bgtVal1    NVARCHAR(255) NULL,
	bgtVal2	NVARCHAR(255) NULL,
	bgtVal3    NVARCHAR(255) NULL,
	bgtVal4	NVARCHAR(255) NULL,
	bgtVal5    NVARCHAR(255) NULL,
	CONSTRAINT pk_bgtTask PRIMARY KEY (bgtId)
)
GO
CREATE INDEX i1_bgtTask ON pfuser.BackgroundTask(bgtStartDate)
GO
CREATE INDEX i2_bgtTask ON pfuser.BackgroundTask(bgtType,bgtStartDate)
GO



CREATE SEQUENCE pfuser.FeedFileTask_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser.FeedFileTask (
	ffId	INT NOT NULL,
	ffTenantId INT NOT NULL,
 	ffType NVARCHAR(255)  NOT NULL,
	ffTdi	INT NOT NULL,
	ffFileName NVARCHAR(255) NOT NULL,
	ffPID NVARCHAR(255) NOT NULL,
    ffStartDate	DATETIME NOT NULL,
	ffEndDate	DATETIME NULL,
    ffUpdate	DATETIME NOT NULL,
	ffSuccess	CHAR(1) NOT NULL,
	ffMessage	NVARCHAR(255) NULL,
	ffErrorMsg	NVARCHAR(255) NULL,
	ffReportVaultId VARCHAR(255) NULL,
	CONSTRAINT pk_ffTask PRIMARY KEY (ffId)
)
GO
CREATE INDEX i3_ffTask ON pfuser.FeedFileTask(ffTenantId,ffStartDate)
GO
CREATE INDEX i2_ffTask ON pfuser.FeedFileTask(ffType,ffStartDate)
GO
