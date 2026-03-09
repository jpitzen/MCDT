DROP TABLE pfuser.TaskStatus

DROP TABLE pfuser.TaskDriverRuns
DROP SEQUENCE pfuser.TaskDriverRuns_sequence

DROP TABLE pfuser.TaskDrivers
DROP SEQUENCE pfuser.TaskDrivers_sequence

DROP TABLE pfuser.GlobalCoordRuntime
DROP SEQUENCE pfuser.GlobalCoordRuntime_sequence

DROP TABLE pfuser.GlobalCoordCluster
-- OPTIONAL
DROP SEQUENCE pfuser.MigrationTask_sequence
DROP TABLE pfuser.ReportVaultItem
DROP TABLE pfuser.MigrationTask
DROP TABLE pfuser.BackgroundTask
DROP SEQUENCE pfuser.BackgroundTask_seq
DROP SEQUENCE pfuser.FeedFileTask_sequence
DROP TABLE pfuser.FeedFileTask
