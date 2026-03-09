-- Initialize basic authentication data for ZL application
USE zldb;
GO

-- Insert domain
INSERT INTO pfuser.DomainInfo (diId, diDomainName) 
VALUES (1, 'yourdomain.com');
GO

-- Insert tenant
INSERT INTO pfuser.Tenant (tenId, tenName, tenDisplayName, tenRootDomainId, tenCreateDate) 
VALUES (1, 'default', 'Default Tenant', 1, GETDATE());
GO

-- Insert superadmin user (password is 'superadmin' - this should be hashed properly in production)
INSERT INTO pfuser.ZipAccount (
    zaAcctNo, zaLang, zaAcctCreateDate, zaUserId, zaDomainId, zaTenantId, 
    zaEncPwd, zaAcctStatus, zaAcctLastModDate, zaAuditRecordLevel, zaAuditClearanceLevel,
    zaFirstName, zaLastName
) VALUES (
    1, 'en', GETDATE(), 'superadmin', 1, 1, 
    CONVERT(VARBINARY(255), 'superadmin'), 1, GETDATE(), 100, 100,
    'Super', 'Admin'
);
GO

-- Verify the data was inserted
SELECT 'DomainInfo:' as TableName, COUNT(*) as Count FROM pfuser.DomainInfo
UNION ALL
SELECT 'Tenant:', COUNT(*) FROM pfuser.Tenant
UNION ALL
SELECT 'ZipAccount:', COUNT(*) FROM pfuser.ZipAccount;
GO