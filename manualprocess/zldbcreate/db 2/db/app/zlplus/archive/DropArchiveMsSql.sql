-- OPTIONAL
DROP SEQUENCE pfuser.ArchiveUserHistory_seq
DROP TABLE pfuser.ArchiveUserHistory
DROP TABLE pfuser.ArchiveUserInfo

DROP TABLE pfuser.ArchiveUserRuns
DROP SEQUENCE pfuser.ArchiveMailServerAgentRuns_seq
DROP TABLE pfuser.ArchiveMailServerAgentRuns
DROP TABLE pfuser.ArchiveMailServerAgent

DROP TABLE pfuser.RestoreSync
-- OPTIONAL
DROP SEQUENCE pfuser.RestoreTask_seq
DROP TABLE pfuser.RestoreTask
DROP TABLE pfuser.MailboxUsageHistory
DROP SEQUENCE pfuser.MboxUsage_seq
DROP TABLE pfuser.MailboxUsage

DROP TABLE pfuser.IMAPTransport
DROP TABLE pfuser.PublicFolderRoot
-- OPTIONAL
DROP SEQUENCE pfuser.ArchiveMailServer_seq
DROP TABLE pfuser.ArchiveMailServer
 
-- OPTIONAL
DROP SEQUENCE pfuser.ArchiveUserAliasHistory_seq
DROP TABLE pfuser.ArchiveUserAliasHistory
DROP TABLE pfuser.ArchiveUserAlias
-- OPTIONAL
DROP SEQUENCE pfuser.ArchiveServer_seq
DROP TABLE pfuser.ArchiveServer
 
DROP TABLE pfuser.ArchiveAuditTrail
-- OPTIONAL
DROP SEQUENCE pfuser.ImportTask_sequence
DROP TABLE pfuser.ImportTask
DROP TABLE pfuser.ExportTaskEntry
DROP SEQUENCE pfuser.ExportTask_seq
DROP TABLE pfuser.ExportTask

DROP TABLE pfuser.UserDiscovery
DROP TABLE pfuser.UserDiscoveryExclusion
DROP SEQUENCE pfuser.MailRetMan_seq
DROP TABLE pfuser.MailRetentionManager
DROP TABLE pfuser.MailRetentionUserRuns
DROP TABLE pfuser.MailPurgeRequest
DROP SEQUENCE pfuser.MailPurgTran_seq
DROP TABLE pfuser.MailPurgeTransaction
DROP TABLE pfuser.MailboxSync
DROP SEQUENCE pfuser.MailboxFolder_seq
DROP TABLE pfuser.MailboxFolder
DROP TABLE pfuser.MbSyncAuditTrail
DROP TABLE pfuser.MessageImport

DROP TABLE pfuser.LegacySystemAddress
DROP TABLE pfuser.LegacySystemFilePlan
DROP TABLE pfuser.LegacySystemLegalHold
DROP TABLE pfuser.LegacySystemHoldInfo
DROP SEQUENCE pfuser.LSMObject_seq
DROP TABLE pfuser.LsmObject
DROP TABLE pfuser.LegacySystemMessage
DROP TABLE pfuser.LSMImportProblem
-- OPTIONAL
DROP SEQUENCE pfuser.LegacySystem_seq
DROP TABLE pfuser.LegacySystem
DROP TABLE pfuser.LegacySourceReaderParam

DROP TABLE pfuser.MessageTransportProblem
DROP TABLE pfuser.DbArchive
DROP TABLE pfuser.ImportUserAlias
DROP TABLE pfuser.MailRetentionUserStats
DROP TABLE pfuser.MailRetentionUserStatsHistory
DROP TABLE pfuser.MailPurgeConfirmation

DROP SEQUENCE pfuser.SyncState_Sequence
DROP TABLE pfuser.SyncState

DROP TABLE pfuser.PersistentChatUserRuns
DROP TABLE pfuser.PersistentChatMessage

DROP TABLE pfuser.SlackTeam
DROP TABLE pfuser.SlackConversation
DROP TABLE pfuser.SlackMembership
DROP TABLE pfuser.SlackArchiveRuns

DROP SEQUENCE pfuser.PersistentChatSyncState_seq
DROP TABLE pfuser.PersistentChatSyncState
DROP SEQUENCE pfuser.SelectiveArchiveSearch_seq
DROP TABLE pfuser.SelectiveArchiveSearch
DROP SEQUENCE pfuser.SelectiveArchiveRuns_seq
DROP TABLE pfuser.SelectiveArchiveRuns
DROP SEQUENCE pfuser.SelectiveArchiveItems_seq
DROP TABLE pfuser.SelectiveArchiveItems

DROP TABLE pfuser.LSMStats
