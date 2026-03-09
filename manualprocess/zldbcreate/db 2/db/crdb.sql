CREATE DATABASE zldbeksdemo
ON PRIMARY
LOG ON
GO

-- ALTER DATABASE zldbeksdemo MODIFY FILEGROUP ZL_MISC DEFAULT
-- GO

-- default string comparisons to case-insensitive for the database
ALTER DATABASE zldbeksdemo COLLATE SQL_Latin1_General_CP1_CI_AS
GO

-- If you want string comparisons to be case-sensitive for the database
-- ALTER DATABASE zldbeksdemo COLLATE SQL_Latin1_General_CP1_CS_AS
-- GO

USE zldbeksdemo
GO