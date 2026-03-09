USE master
GO

CREATE LOGIN pfuser WITH PASSWORD = 'pfpass@1234'
GO

CREATE USER pfuser FOR LOGIN pfuser
GO

