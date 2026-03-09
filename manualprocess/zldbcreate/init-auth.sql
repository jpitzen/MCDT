-- Insert superadmin domain
INSERT INTO pfuser.DomainInfo (diId, diDomainName, diParentId, diTenantId, diLanguage, diTimeZone, diCreateDate, diDeleted)
VALUES (1, 'default', -1, 1, 'en', 'UTC', GETDATE(), 0);

-- Insert superadmin tenant
INSERT INTO pfuser.Tenant (tenId, tenName, tenDisplayName, tenRootDomainId, tenCreateDate, tenLDAPInfo)
VALUES (1, 'SuperAdmin', 'Super Admin Tenant', 1, GETDATE(), NULL);

-- Insert superadmin user
INSERT INTO pfuser.ZipAccount (zaAcctNo, zaUserId, zaDomainId, zaTenantId, zaEncPwd, zaPrimaryEmailAddress, zaFirstName, zaLastName, zaAcctStatus, zaAcctCreateDate, zaAcctLastModDate)
VALUES (1, 'superadmin', 1, 1, CONVERT(VARBINARY(MAX), '$2a$10$encryptedpassword'), 'superadmin@zl.com', 'Super', 'Admin', 1, GETDATE(), GETDATE());