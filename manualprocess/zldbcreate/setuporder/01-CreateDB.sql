---Create Database

CREATE DATABASE ZLDB


-- Use master to create the login first
USE master
GO

CREATE LOGIN pfuser WITH PASSWORD = 'Passw0rd2024'
GO


-- Create database user
CREATE USER pfuser FOR LOGIN pfuser
GO

CREATE USER pfuser FROM LOGIN pfuser
GO

EXEC sp_addrolemember 'db_owner', 'pfuser'
GO

CREATE SCHEMA pfuser
GO

ALTER USER pfuser WITH DEFAULT_SCHEMA = pfuser
GO

