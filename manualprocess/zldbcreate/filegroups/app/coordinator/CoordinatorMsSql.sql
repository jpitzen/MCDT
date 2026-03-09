

CREATE TABLE pfuser01.GlobalCoordCluster (
	gccProcessName 		VARCHAR(255) NOT NULL,
	gccProcessIp	 	VARCHAR(64) NOT NULL,
	gccClusterName 		VARCHAR(255) NOT NULL,
	gccWeight 		    INT NOT NULL,
	gccState 		    INT NOT NULL,
	gccCreateDate 		DATETIME NOT NULL,
	gccUpdateDate 		DATETIME NOT NULL,
	CONSTRAINT pk_GCC PRIMARY KEY (gccClusterName,gccProcessName) ON ZL_TRANSIENT_INDEX 
) ON ZL_TRANSIENT
GO


CREATE SEQUENCE pfuser01.GlobalCoordRuntime_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser01.GlobalCoordRuntime (
	gcrtClusterName 		VARCHAR(255) NOT NULL,
	gcrtLiveProcessName 	VARCHAR(255) NOT NULL,
	gcrtIterNumber 		    INT NOT NULL,
        gcrtUpdate 		        DATETIME NOT NULL,
	gcrtConnectionStrength	INT NOT NULL,
	CONSTRAINT pk_GCRT PRIMARY KEY (gcrtClusterName) ON ZL_TRANSIENT_INDEX 
) ON ZL_TRANSIENT
GO



CREATE SEQUENCE pfuser01.TaskDrivers_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser01.TaskDrivers (
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
	CONSTRAINT pk_TaskDrivers PRIMARY KEY (tdId) ON ZL_APP_INDEX,
	CONSTRAINT uk_TaskDrivers UNIQUE (tdName) 	ON ZL_APP_INDEX 
) ON  ZL_APP
GO


CREATE SEQUENCE pfuser01.TaskDriverRuns_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser01.TaskDriverRuns (
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
	CONSTRAINT pk_TaskDriverRuns PRIMARY KEY (tdrId) ON ZL_TRANSIENT_INDEX 
) ON  ZL_TRANSIENT
GO

CREATE INDEX i1_TaskDriverRuns ON pfuser01.TaskDriverRuns(tdrTdId) ON ZL_TRANSIENT_INDEX
GO

CREATE INDEX i2_TaskDriverRuns ON pfuser01.TaskDriverRuns(tdrLastUpdate) ON ZL_TRANSIENT_INDEX
GO



CREATE TABLE pfuser01.TaskStatus (
    tsTdrId 		INT NOT NULL,
    tsCreateDate 	DATETIME NOT NULL,
    tsState 		INT NOT NULL,
    tsIntVal 		INT NULL,
    tsVal1 			NVARCHAR(255) NULL,
    tsVal2 			NVARCHAR(255) NULL,
    tsVal3 			NVARCHAR(255) NULL
) ON ZL_TRANSIENT
GO

CREATE INDEX i1_TaskStatus ON pfuser01.TaskStatus(tsTdrId)  ON ZL_TRANSIENT_INDEX
GO

CREATE INDEX i2_TaskStatus ON pfuser01.TaskStatus(tsTdrId,tsIntVal) ON ZL_TRANSIENT_INDEX
GO

CREATE TABLE pfuser01.ReportVaultItem (
    rviInstanceName 	NVARCHAR(255) NOT NULL,
    rviTdrId   INT NOT NULL,
    rviName		NVARCHAR(255) NOT NULL,
    rviDate		DATETIME NOT NULL,
    rviExpiry  DATETIME NOT NULL,
    rviVaultId	VARCHAR(64) NOT NULL,
    rviEncPwd   VARBINARY(128) NULL,
	CONSTRAINT pk_RepVault PRIMARY KEY (rviInstanceName) ON ZL_APP_INDEX 
) ON ZL_APP
GO

CREATE INDEX i1_RepVault ON pfuser01.ReportVaultItem(rviTdrId)  ON ZL_APP_INDEX
GO
CREATE INDEX i2_RepVault ON pfuser01.ReportVaultItem(rviDate)  ON ZL_APP_INDEX
GO


-- OPTIONAL
CREATE SEQUENCE pfuser01.MigrationTask_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser01.MigrationTask (
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
	CONSTRAINT pk_MigTask PRIMARY KEY (migId) ON ZL_TRANSIENT_INDEX,
	CONSTRAINT uk2_MigTask UNIQUE (migTenantId,migInstanceName) 	ON ZL_APP_INDEX 
) ON ZL_TRANSIENT
GO
CREATE INDEX i1_MigTask ON pfuser01.MigrationTask(migStartDate) ON ZL_TRANSIENT_INDEX
GO
CREATE INDEX i2_MigTask ON pfuser01.MigrationTask(migType) ON ZL_TRANSIENT_INDEX
GO




CREATE SEQUENCE pfuser01.BackgroundTask_seq
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
NO CACHE
GO


CREATE TABLE pfuser01.BackgroundTask (
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
	CONSTRAINT pk_bgtTask PRIMARY KEY (bgtId) ON ZL_TRANSIENT_INDEX
) ON ZL_TRANSIENT
GO
CREATE INDEX i1_bgtTask ON pfuser01.BackgroundTask(bgtStartDate) ON ZL_TRANSIENT_INDEX
GO
CREATE INDEX i2_bgtTask ON pfuser01.BackgroundTask(bgtType,bgtStartDate) ON ZL_TRANSIENT_INDEX
GO



CREATE SEQUENCE pfuser01.FeedFileTask_sequence
INCREMENT BY 1
START WITH 1
NO MAXVALUE
NO CYCLE
CACHE 10
GO


CREATE TABLE pfuser01.FeedFileTask (
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
	CONSTRAINT pk_ffTask PRIMARY KEY (ffId) ON ZL_TRANSIENT_INDEX
) ON ZL_TRANSIENT
GO
CREATE INDEX i3_ffTask ON pfuser01.FeedFileTask(ffTenantId,ffStartDate) ON ZL_TRANSIENT_INDEX
GO
CREATE INDEX i2_ffTask ON pfuser01.FeedFileTask(ffType,ffStartDate) ON ZL_TRANSIENT_INDEX
GO

