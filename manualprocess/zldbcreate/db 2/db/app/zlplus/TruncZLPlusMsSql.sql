TRUNCATE TABLE pfuser.InplaceMailItem
TRUNCATE TABLE pfuser.MTARecon
TRUNCATE TABLE pfuser.SharedMailboxPrivileges
TRUNCATE TABLE pfuser.ZLPDomain
TRUNCATE TABLE pfuser.MTASIS
TRUNCATE TABLE pfuser.ZLPMessageStats
TRUNCATE TABLE pfuser.MTAStats
TRUNCATE TABLE pfuser.ZLPMessageSIS
TRUNCATE TABLE pfuser.ZLPRecipientMailPolicy
TRUNCATE TABLE pfuser.ZLPClientMessageTrail
TRUNCATE TABLE pfuser.ZLPClientMessageRecipient
TRUNCATE TABLE pfuser.ZLPClientMessage
TRUNCATE TABLE pfuser.ZLPClientAccess
TRUNCATE TABLE pfuser.MTAExecutionTranscript
TRUNCATE TABLE pfuser.MTATranscript

-- OPTIONAL
TRUNCATE TABLE pfuser.Message
INSERT INTO pfuser.Message (valid) VALUES (1)
TRUNCATE TABLE pfuser.RfsKey
TRUNCATE TABLE pfuser.ReceivedFileStore
TRUNCATE TABLE pfuser.ZLPRecipientInfo
TRUNCATE TABLE pfuser.ZLPReceivedMail
TRUNCATE TABLE pfuser.StagedAttachment
TRUNCATE TABLE pfuser.Doc
TRUNCATE TABLE pfuser.ZLPAuditTrail
TRUNCATE TABLE pfuser.ZLPMessageSisHeader
TRUNCATE TABLE pfuser.ZLPMessageAttachment
TRUNCATE TABLE pfuser.ZLPMessage
TRUNCATE TABLE pfuser.ZLPFolder
TRUNCATE TABLE pfuser.TenantHost
TRUNCATE TABLE pfuser.ManagedEmailDomain
TRUNCATE TABLE pfuser.ZLHost
TRUNCATE TABLE pfuser.SecurityGroupMembership
TRUNCATE TABLE pfuser.SecurityGroup
TRUNCATE TABLE pfuser.ZLPUser
TRUNCATE TABLE pfuser.ZLPAddress
TRUNCATE TABLE pfuser.TriggerAddress
TRUNCATE TABLE pfuser.ZLPUserPasswordSecurity

