-- ============================================================================
-- Update diskvolume localpath to match dvpath
-- ============================================================================
-- Purpose: Set localpath equal to dvpath for all disk volumes
--          This ensures the application writes files to the EFS-mounted path
--          (/var/ZipLip/Vault/...) instead of the container-local path
--          (/zlvault/Archive_Vault/ZLVault/...)
--
-- Database: ZLDB
-- Date: December 13, 2025
-- ============================================================================

USE ZLDB;
GO

-- First, view current state (before update)
PRINT 'Current diskvolume paths BEFORE update:';
PRINT '=========================================';

SELECT 
    dvid,
    dvname,
    dvpath,
    localpath,
    CASE 
        WHEN dvpath = localpath THEN 'MATCH'
        WHEN localpath IS NULL THEN 'NULL'
        ELSE 'MISMATCH'
    END AS path_status
FROM diskvolume
ORDER BY dvid;
GO

-- Update localpath to match dvpath for all rows where they differ
PRINT '';
PRINT 'Updating localpath to match dvpath...';
PRINT '======================================';

UPDATE diskvolume
SET localpath = dvpath
WHERE localpath <> dvpath 
   OR localpath IS NULL;

PRINT 'Rows updated: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
GO

-- Verify the update (after)
PRINT '';
PRINT 'Current diskvolume paths AFTER update:';
PRINT '=======================================';

SELECT 
    dvid,
    dvname,
    dvpath,
    localpath,
    CASE 
        WHEN dvpath = localpath THEN 'MATCH'
        WHEN localpath IS NULL THEN 'NULL'
        ELSE 'MISMATCH'
    END AS path_status
FROM diskvolume
ORDER BY dvid;
GO

-- ============================================================================
-- IMPORTANT: After running this script, restart the application pods:
--   kubectl rollout restart deployment zlserver zlui
-- ============================================================================
