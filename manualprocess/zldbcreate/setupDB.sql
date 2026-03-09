-- Use master to create the login first
USE master;
GO
:r .\crUser.sql
GO

-- Switch to the application database (ZLDB)
USE ZLDB;
GO

-- Create database user
:r .\crDBUser.sql
GO

-- Run the table creation scripts
:r .\app\ZLSystemMSSql.sql
:r .\app\addrBook\addrBookMsSql.sql
:r .\app\classifier\ClassifierMsSql.sql
:r .\app\coordinator\coordinatorMsSql.sql
:r .\app\search\searchMsSql.sql
:r .\app\storage\storageMsSql.sql
:r .\app\storage\archive\ArchiveStorageMsSql.sql
:r .\app\storage\insight\InsightStorageMsSql.sql
:r .\app\tracker\trackerMsSql.sql
:r .\app\vault\vaultMsSql.sql
:r .\app\zlhub\ZLHubMsSql.sql
:r .\app\zlplus\zlplusMsSql.sql
:r .\app\zlplus\archive\ArchiveMsSql.sql
:r .\app\zVite\zViteMsSql.sql
:r .\app\caseMgmt\caseMgmtMsSql.sql
:r .\app\records\RecordsMsSql.sql
:r .\app\logEvent\logEventMsSql.sql
:r .\app\ucontext\UContextMsSql.sql
--:r .\app\zldocker\initContainerMsSql.sql
GO

-- Optional section for "misc"
-- To enable this, remove the comment markers and run with misc-specific logic
-- :r .\app\misc\AvIntegrationMsSql.sql
-- :r .\app\misc\AssentorMigMsSql.sql
