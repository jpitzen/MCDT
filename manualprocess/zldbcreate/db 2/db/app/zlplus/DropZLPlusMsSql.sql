DROP SEQUENCE pfuser.InPlaceMailItem_seq
DROP TABLE pfuser.InplaceMailItem
DROP TABLE pfuser.MTARecon
DROP TABLE pfuser.SharedMailboxPrivileges
-- OPTIONAL
DROP SEQUENCE pfuser.ZlpDomain_sequence
DROP TABLE pfuser.ZLPDomain
DROP TABLE pfuser.MTASIS
DROP TABLE pfuser.ZLPMessageStats
DROP TABLE pfuser.MTAStats
DROP TABLE pfuser.ZLPMessageSIS
DROP SEQUENCE pfuser.ZLPRecipientMailPolicy_seq
DROP TABLE pfuser.ZLPRecipientMailPolicy
DROP TABLE pfuser.ZLPClientMessageTrail
DROP SEQUENCE pfuser.ZLPClientMsgRecipient_sequence
DROP TABLE pfuser.ZLPClientMessageRecipient
DROP SEQUENCE pfuser.ZLPClientMsg_sequence
DROP TABLE pfuser.ZLPClientMessage
DROP TABLE pfuser.ZLPClientAccess


-- OPTIONAL
DROP SEQUENCE pfuser.MTAExecutionTranscript_seq
DROP TABLE pfuser.MTAExecutionTranscript
-- OPTIONAL
DROP SEQUENCE pfuser.MTATranscript_sequence
DROP TABLE pfuser.MTATranscript

DROP TABLE pfuser.Message
DROP SEQUENCE pfuser.RfsKey_sequence
DROP TABLE pfuser.RfsKey
DROP TABLE pfuser.ReceivedFileStore
-- OPTIONAL
DROP SEQUENCE pfuser.ZLPRecipientInfo_sequence
DROP TABLE pfuser.ZLPRecipientInfo
DROP SEQUENCE pfuser.ZLPReceivedMail_sequence
DROP TABLE pfuser.ZLPReceivedMail
DROP SEQUENCE pfuser.StagedAttachment_sequence
DROP TABLE pfuser.StagedAttachment
-- OPTIONAL
DROP SEQUENCE pfuser.Doc_sequence
DROP TABLE pfuser.Doc
DROP TABLE pfuser.ZLPAuditTrail
DROP TABLE pfuser.ZLPMessageSisHeader
DROP TABLE pfuser.ZLPMessageAttachment
DROP SEQUENCE pfuser.ZlpMessage_sequence
DROP TABLE pfuser.ZLPMessage
-- OPTIONAL
DROP SEQUENCE pfuser.ZlpFolder_sequence
DROP TABLE pfuser.ZLPFolder
DROP TABLE pfuser.TenantHost
DROP TABLE pfuser.ManagedEmailDomain
DROP TABLE pfuser.ZLHost
DROP TABLE pfuser.SecurityGroupMembership
DROP TABLE pfuser.SecurityGroup
DROP TABLE pfuser.ZLPUser
-- OPTIONAL
DROP SEQUENCE pfuser.ZlpAddress_sequence
DROP TABLE pfuser.ZLPAddress
DROP TABLE pfuser.TriggerAddress
DROP TABLE pfuser.ZLPUserPasswordSecurity
