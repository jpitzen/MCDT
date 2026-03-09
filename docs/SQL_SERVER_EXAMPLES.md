# SQL Server Script Examples

## Basic Table Creation

```sql
-- Create table with IF NOT EXISTS check
IF OBJECT_ID('users', 'U') IS NULL
BEGIN
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(50) NOT NULL UNIQUE,
        email NVARCHAR(100) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
END
GO

-- Create related table
IF OBJECT_ID('posts', 'U') IS NULL
BEGIN
    CREATE TABLE posts (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        title NVARCHAR(200) NOT NULL,
        content NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_posts_users FOREIGN KEY (user_id) 
            REFERENCES users(id) ON DELETE CASCADE
    );
END
GO
```

## Indexes

```sql
-- Create indexes with existence check
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_users_email' AND object_id = OBJECT_ID('users'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_users_email ON users(email);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_posts_user_id' AND object_id = OBJECT_ID('posts'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_posts_user_id ON posts(user_id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_posts_created_at' AND object_id = OBJECT_ID('posts'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_posts_created_at ON posts(created_at DESC);
END
GO
```

## Alter Table (Add Columns)

```sql
-- Add columns if they don't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'profile_image_url')
BEGIN
    ALTER TABLE users ADD profile_image_url NVARCHAR(500) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'bio')
BEGIN
    ALTER TABLE users ADD bio NVARCHAR(MAX) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'is_active')
BEGIN
    ALTER TABLE users ADD is_active BIT NOT NULL DEFAULT 1;
END
GO
```

## Stored Procedures

```sql
-- Drop and recreate stored procedure
IF OBJECT_ID('sp_GetUserPosts', 'P') IS NOT NULL
BEGIN
    DROP PROCEDURE sp_GetUserPosts;
END
GO

CREATE PROCEDURE sp_GetUserPosts
    @user_id INT,
    @limit INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP (@limit)
        p.id,
        p.title,
        p.content,
        p.created_at,
        u.username
    FROM posts p
    INNER JOIN users u ON p.user_id = u.id
    WHERE p.user_id = @user_id
    ORDER BY p.created_at DESC;
END
GO
```

## Views

```sql
-- Drop and recreate view
IF OBJECT_ID('vw_UserPostCount', 'V') IS NOT NULL
BEGIN
    DROP VIEW vw_UserPostCount;
END
GO

CREATE VIEW vw_UserPostCount AS
SELECT 
    u.id,
    u.username,
    u.email,
    COUNT(p.id) AS post_count,
    MAX(p.created_at) AS last_post_date
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
GROUP BY u.id, u.username, u.email;
GO
```

## Triggers

```sql
-- Drop and recreate trigger
IF OBJECT_ID('tr_users_updated_at', 'TR') IS NOT NULL
BEGIN
    DROP TRIGGER tr_users_updated_at;
END
GO

CREATE TRIGGER tr_users_updated_at
ON users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE users
    SET updated_at = GETDATE()
    FROM users u
    INNER JOIN inserted i ON u.id = i.id;
END
GO
```

## Data Migration

```sql
-- Insert sample data (idempotent)
IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin')
BEGIN
    INSERT INTO users (username, email, password_hash)
    VALUES ('admin', 'admin@example.com', 'hashed_password_here');
END
GO

-- Bulk insert with merge
MERGE users AS target
USING (VALUES
    ('user1', 'user1@example.com', 'hash1'),
    ('user2', 'user2@example.com', 'hash2'),
    ('user3', 'user3@example.com', 'hash3')
) AS source (username, email, password_hash)
ON target.username = source.username
WHEN NOT MATCHED THEN
    INSERT (username, email, password_hash)
    VALUES (source.username, source.email, source.password_hash);
GO
```

## Full Text Search

```sql
-- Create full-text catalog and index
IF NOT EXISTS (SELECT * FROM sys.fulltext_catalogs WHERE name = 'ftCatalog')
BEGIN
    CREATE FULLTEXT CATALOG ftCatalog AS DEFAULT;
END
GO

IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('posts'))
BEGIN
    CREATE FULLTEXT INDEX ON posts(title, content)
    KEY INDEX PK__posts__3213E83F (id)
    WITH STOPLIST = SYSTEM;
END
GO
```

## Partitioning

```sql
-- Create partition function
IF NOT EXISTS (SELECT * FROM sys.partition_functions WHERE name = 'pfPosts_ByYear')
BEGIN
    CREATE PARTITION FUNCTION pfPosts_ByYear (DATETIME2)
    AS RANGE RIGHT FOR VALUES 
        ('2023-01-01', '2024-01-01', '2025-01-01', '2026-01-01');
END
GO

-- Create partition scheme
IF NOT EXISTS (SELECT * FROM sys.partition_schemes WHERE name = 'psPosts_ByYear')
BEGIN
    CREATE PARTITION SCHEME psPosts_ByYear
    AS PARTITION pfPosts_ByYear
    ALL TO ([PRIMARY]);
END
GO
```

## Constraints

```sql
-- Add check constraint
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_users_email_format')
BEGIN
    ALTER TABLE users
    ADD CONSTRAINT CK_users_email_format
    CHECK (email LIKE '%_@_%.__%');
END
GO

-- Add unique constraint
IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_users_username')
BEGIN
    ALTER TABLE users
    ADD CONSTRAINT UQ_users_username UNIQUE (username);
END
GO
```

## Usage in API

```javascript
// Example API request for SQL Server scripts
{
  "scripts": [
    {
      "scriptName": "001_create_tables.sql",
      "scriptContent": "IF OBJECT_ID('users', 'U') IS NULL BEGIN CREATE TABLE users (...); END GO",
      "executionOrder": 0,
      "haltOnError": true,
      "runInTransaction": true,
      "timeoutSeconds": 300
    },
    {
      "scriptName": "002_create_indexes.sql",
      "scriptContent": "IF NOT EXISTS (...) BEGIN CREATE INDEX ...; END GO",
      "executionOrder": 1,
      "haltOnError": false,  // Continue even if indexes exist
      "runInTransaction": true
    }
  ]
}
```

## Configuration

Set `dbEngine` to `sqlserver` or `mssql` in deployment configuration:

```javascript
{
  "enableRDS": true,
  "dbEngine": "sqlserver",  // or "mssql"
  "dbVersion": "15.00.4073.23.v1",  // SQL Server 2019
  "dbInstanceClass": "db.m5.large",
  "dbAllocatedStorage": 100,
  "dbUsername": "admin",
  "dbName": "main"
}
```

## Important Notes

### Transaction Support
- ✅ SQL Server **supports transactional DDL** (unlike MySQL)
- Set `runInTransaction: true` for automatic rollback on error
- Use explicit transactions for complex operations

### GO Statement
- The `GO` statement is a batch separator (SQL Server Management Studio command)
- Not required for programmatic execution via mssql package
- Safe to include but will be ignored by the driver

### String Types
- Use `NVARCHAR` for Unicode support (recommended)
- Use `VARCHAR` for ASCII-only data (smaller storage)
- Max length: `NVARCHAR(MAX)` or `VARCHAR(MAX)` for large text

### Identity Columns
- `IDENTITY(1,1)` for auto-increment (like `SERIAL` in PostgreSQL)
- Retrieve last inserted ID: `SELECT SCOPE_IDENTITY()`

### Date/Time
- Use `DATETIME2` for high precision (recommended)
- `GETDATE()` for current timestamp
- `DATEADD()`, `DATEDIFF()` for date arithmetic

### Connection String
RDS SQL Server endpoints typically format:
```
mydb.abc123.us-east-1.rds.amazonaws.com:1433
```

Default port: **1433**
