TRUNCATE TABLE pfuser.ArchiveRepositoryInfo
TRUNCATE TABLE pfuser.ArchivePointUsageHistory
TRUNCATE TABLE pfuser.ArchivePointUsage
TRUNCATE TABLE pfuser.FileAgentRuns
TRUNCATE TABLE pfuser.ArchivePointEntryAuditTrail
TRUNCATE TABLE pfuser.ArchivePointEntrySync
TRUNCATE TABLE pfuser.ArchivePointFolderProp
TRUNCATE TABLE pfuser.ArchivePointFolderSync
TRUNCATE TABLE pfuser.ArchiveStorageProject
TRUNCATE TABLE pfuser.ArchiveStorageProjectCrawlState
-- OPTIONAL
TRUNCATE TABLE pfuser.ZLDUAL
INSERT INTO pfuser.ZLDUAL (id) VALUES (1)

