-- OPTIONAL
DROP SEQUENCE pfuser01.ArchiveUserHistory_seq
DROP TABLE pfuser01.ArchiveUserHistory
DROP TABLE pfuser01.ArchiveUserInfo

DROP TABLE pfuser01.ArchiveUserRuns
DROP SEQUENCE pfuser01.ArchiveMailServerAgentRuns_seq
DROP TABLE pfuser01.ArchiveMailServerAgentRuns
DROP TABLE pfuser01.ArchiveMailServerAgent

DROP TABLE pfuser01.RestoreSync
-- OPTIONAL
DROP SEQUENCE pfuser01.RestoreTask_seq
DROP TABLE pfuser01.RestoreTask
DROP TABLE pfuser01.MailboxUsageHistory
DROP SEQUENCE pfuser01.MboxUsage_seq
DROP TABLE pfuser01.MailboxUsage

DROP TABLE pfuser01.IMAPTransport
DROP TABLE pfuser01.PublicFolderRoot
-- OPTIONAL
DROP SEQUENCE pfuser01.ArchiveMailServer_seq
DROP TABLE pfuser01.ArchiveMailServer
 
-- OPTIONAL
DROP SEQUENCE pfuser01.ArchiveUserAliasHistory_seq
DROP TABLE pfuser01.ArchiveUserAliasHistory
DROP TABLE pfuser01.ArchiveUserAlias
-- OPTIONAL
DROP SEQUENCE pfuser01.ArchiveServer_seq
DROP TABLE pfuser01.ArchiveServer
 
DROP TABLE pfuser01.ArchiveAuditTrail
-- OPTIONAL
DROP SEQUENCE pfuser01.ImportTask_sequence
DROP TABLE pfuser01.ImportTask
DROP TABLE pfuser01.ExportTaskEntry
DROP SEQUENCE pfuser01.ExportTask_seq
DROP TABLE pfuser01.ExportTask

DROP TABLE pfuser01.UserDiscovery
DROP TABLE pfuser01.UserDiscoveryExclusion
DROP SEQUENCE pfuser01.MailRetMan_seq
DROP TABLE pfuser01.MailRetentionManager
DROP TABLE pfuser01.MailRetentionUserRuns
DROP TABLE pfuser01.MailPurgeRequest
DROP SEQUENCE pfuser01.MailPurgTran_seq
DROP TABLE pfuser01.MailPurgeTransaction
DROP TABLE pfuser01.MailboxSync
DROP SEQUENCE pfuser01.MailboxFolder_seq
DROP TABLE pfuser01.MailboxFolder
DROP TABLE pfuser01.MbSyncAuditTrail
DROP TABLE pfuser01.MessageImport

DROP TABLE pfuser01.LegacySystemAddress
DROP TABLE pfuser01.LegacySystemFilePlan
DROP TABLE pfuser01.LegacySystemLegalHold
DROP TABLE pfuser01.LegacySystemHoldInfo
DROP SEQUENCE pfuser01.LSMObject_seq
DROP TABLE pfuser01.LsmObject
DROP TABLE pfuser01.LegacySystemMessage
DROP TABLE pfuser01.LSMImportProblem
-- OPTIONAL
DROP SEQUENCE pfuser01.LegacySystem_seq
DROP TABLE pfuser01.LegacySystem
DROP TABLE pfuser01.LegacySourceReaderParam

DROP TABLE pfuser01.MessageTransportProblem
DROP TABLE pfuser01.DbArchive
DROP TABLE pfuser01.ImportUserAlias
DROP TABLE pfuser01.MailRetentionUserStats
DROP TABLE pfuser01.MailRetentionUserStatsHistory
DROP TABLE pfuser01.MailPurgeConfirmation

DROP SEQUENCE pfuser01.SyncState_Sequence
DROP TABLE pfuser01.SyncState

DROP TABLE pfuser01.PersistentChatUserRuns
DROP TABLE pfuser01.PersistentChatMessage

DROP TABLE pfuser01.SlackTeam
DROP TABLE pfuser01.SlackConversation
DROP TABLE pfuser01.SlackMembership
DROP TABLE pfuser01.SlackArchiveRuns

DROP SEQUENCE pfuser01.PersistentChatSyncState_seq
DROP TABLE pfuser01.PersistentChatSyncState
DROP SEQUENCE pfuser01.SelectiveArchiveSearch_seq
DROP TABLE pfuser01.SelectiveArchiveSearch
DROP SEQUENCE pfuser01.SelectiveArchiveRuns_seq
DROP TABLE pfuser01.SelectiveArchiveRuns
DROP SEQUENCE pfuser01.SelectiveArchiveItems_seq
DROP TABLE pfuser01.SelectiveArchiveItems

DROP TABLE pfuser01.LSMStats

