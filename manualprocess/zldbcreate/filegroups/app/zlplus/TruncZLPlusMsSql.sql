TRUNCATE TABLE pfuser01.InplaceMailItem
TRUNCATE TABLE pfuser01.MTARecon
TRUNCATE TABLE pfuser01.SharedMailboxPrivileges
TRUNCATE TABLE pfuser01.ZLPDomain
TRUNCATE TABLE pfuser01.MTASIS
TRUNCATE TABLE pfuser01.ZLPMessageStats
TRUNCATE TABLE pfuser01.MTAStats
TRUNCATE TABLE pfuser01.ZLPMessageSIS
TRUNCATE TABLE pfuser01.ZLPRecipientMailPolicy
TRUNCATE TABLE pfuser01.ZLPClientMessageTrail
TRUNCATE TABLE pfuser01.ZLPClientMessageRecipient
TRUNCATE TABLE pfuser01.ZLPClientMessage
TRUNCATE TABLE pfuser01.ZLPClientAccess
TRUNCATE TABLE pfuser01.MTAExecutionTranscript
TRUNCATE TABLE pfuser01.MTATranscript

-- OPTIONAL
TRUNCATE TABLE pfuser01.Message
INSERT INTO pfuser01.Message (valid) VALUES (1)
TRUNCATE TABLE pfuser01.RfsKey
TRUNCATE TABLE pfuser01.ReceivedFileStore
TRUNCATE TABLE pfuser01.ZLPRecipientInfo
TRUNCATE TABLE pfuser01.ZLPReceivedMail
TRUNCATE TABLE pfuser01.StagedAttachment
TRUNCATE TABLE pfuser01.Doc
TRUNCATE TABLE pfuser01.ZLPAuditTrail
TRUNCATE TABLE pfuser01.ZLPMessageSisHeader
TRUNCATE TABLE pfuser01.ZLPMessageAttachment
TRUNCATE TABLE pfuser01.ZLPMessage
TRUNCATE TABLE pfuser01.ZLPFolder
TRUNCATE TABLE pfuser01.TenantHost
TRUNCATE TABLE pfuser01.ManagedEmailDomain
TRUNCATE TABLE pfuser01.ZLHost
TRUNCATE TABLE pfuser01.SecurityGroupMembership
TRUNCATE TABLE pfuser01.SecurityGroup
TRUNCATE TABLE pfuser01.ZLPUser
TRUNCATE TABLE pfuser01.ZLPAddress
TRUNCATE TABLE pfuser01.TriggerAddress
TRUNCATE TABLE pfuser01.ZLPUserPasswordSecurity


