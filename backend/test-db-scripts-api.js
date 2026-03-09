/**
 * Database Script Deployment Feature - API Test Examples
 * 
 * Prerequisites:
 * 1. Backend server running (npm run dev)
 * 2. User authenticated (obtain JWT token from /api/auth/login)
 * 3. Deployment created with enableRDS=true
 * 
 * Run with: node test-db-scripts-api.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const AUTH_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token

// Create axios instance with auth
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

/**
 * Test 1: Upload SQL Scripts
 */
async function testUploadScripts(deploymentId) {
  console.log('\n📤 Test 1: Upload SQL Scripts');
  console.log('='.repeat(50));
  
  try {
    const response = await api.post(`/deployments/${deploymentId}/sql-scripts`, {
      scripts: [
        {
          scriptName: '001_create_users_table.sql',
          scriptContent: `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
          `,
          executionOrder: 0,
          haltOnError: true,
          runInTransaction: true,
          timeoutSeconds: 300,
        },
        {
          scriptName: '002_create_posts_table.sql',
          scriptContent: `
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
          `,
          executionOrder: 1,
          haltOnError: true,
          runInTransaction: true,
        },
        {
          scriptName: '003_create_indexes.sql',
          scriptContent: `
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
          `,
          executionOrder: 2,
          haltOnError: false, // Continue even if indexes already exist
          runInTransaction: true,
        },
      ],
    });
    
    console.log('✅ Success:', response.data.message);
    console.log('Uploaded scripts:', response.data.scripts.length);
    response.data.scripts.forEach(s => {
      console.log(`  - ${s.scriptName} (order: ${s.executionOrder}, status: ${s.status})`);
    });
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

/**
 * Test 1b: Upload SQL Server Scripts
 */
async function testUploadSQLServerScripts(deploymentId) {
  console.log('\n📤 Test 1b: Upload SQL Server Scripts');
  console.log('='.repeat(50));
  
  try {
    const response = await api.post(`/deployments/${deploymentId}/sql-scripts`, {
      scripts: [
        {
          scriptName: '001_create_users_table_mssql.sql',
          scriptContent: `
IF OBJECT_ID('users', 'U') IS NULL
BEGIN
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(50) NOT NULL UNIQUE,
        email NVARCHAR(100) NOT NULL UNIQUE,
        created_at DATETIME2 DEFAULT GETDATE()
    );
END
GO
          `,
          executionOrder: 0,
          haltOnError: true,
          runInTransaction: true,
          timeoutSeconds: 300,
        },
        {
          scriptName: '002_create_posts_table_mssql.sql',
          scriptContent: `
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
          `,
          executionOrder: 1,
          haltOnError: true,
          runInTransaction: true,
        },
        {
          scriptName: '003_create_indexes_mssql.sql',
          scriptContent: `
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
          `,
          executionOrder: 2,
          haltOnError: false,
          runInTransaction: true,
        },
      ],
    });
    
    console.log('✅ Success:', response.data.message);
    console.log('Uploaded SQL Server scripts:', response.data.scripts.length);
    response.data.scripts.forEach(s => {
      console.log(`  - ${s.scriptName} (order: ${s.executionOrder}, status: ${s.status})`);
    });
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

/**
 * Test 2: List Scripts
 */
async function testListScripts(deploymentId) {
  console.log('\n📋 Test 2: List SQL Scripts');
  console.log('='.repeat(50));
  
  try {
    const response = await api.get(`/deployments/${deploymentId}/sql-scripts`);
    
    console.log(`✅ Found ${response.data.scripts.length} scripts:`);
    response.data.scripts.forEach(s => {
      console.log(`\n  📄 ${s.scriptName}`);
      console.log(`     Status: ${s.status}`);
      console.log(`     Order: ${s.executionOrder}`);
      if (s.executedAt) {
        console.log(`     Executed: ${s.executedAt}`);
        console.log(`     Duration: ${s.executionDurationMs}ms`);
        console.log(`     Rows affected: ${s.rowsAffected || 0}`);
      }
      if (s.errorMessage) {
        console.log(`     ⚠️  Error: ${s.errorMessage}`);
      }
    });
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

/**
 * Test 3: Get Single Script
 */
async function testGetScript(deploymentId, scriptId) {
  console.log('\n🔍 Test 3: Get Single Script');
  console.log('='.repeat(50));
  
  try {
    const response = await api.get(`/deployments/${deploymentId}/sql-scripts/${scriptId}`);
    const script = response.data.script;
    
    console.log('✅ Script Details:');
    console.log(`  Name: ${script.scriptName}`);
    console.log(`  Status: ${script.status}`);
    console.log(`  Order: ${script.executionOrder}`);
    console.log(`  Halt on error: ${script.haltOnError}`);
    console.log(`  Run in transaction: ${script.runInTransaction}`);
    console.log(`  Timeout: ${script.timeoutSeconds}s`);
    console.log(`  Uploaded by: ${script.uploader?.username || 'N/A'}`);
    console.log(`\n  Content (first 200 chars):`);
    console.log(`  ${script.scriptContent.substring(0, 200)}...`);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

/**
 * Test 4: Update Script (only if pending)
 */
async function testUpdateScript(deploymentId, scriptId) {
  console.log('\n✏️  Test 4: Update Script');
  console.log('='.repeat(50));
  
  try {
    const response = await api.put(`/deployments/${deploymentId}/sql-scripts/${scriptId}`, {
      scriptName: '001_create_users_table_v2.sql',
      haltOnError: false,
    });
    
    console.log('✅ Success:', response.data.message);
    console.log(`  Updated: ${response.data.script.scriptName}`);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

/**
 * Test 5: Delete Script (only if pending)
 */
async function testDeleteScript(deploymentId, scriptId) {
  console.log('\n🗑️  Test 5: Delete Script');
  console.log('='.repeat(50));
  
  try {
    const response = await api.delete(`/deployments/${deploymentId}/sql-scripts/${scriptId}`);
    
    console.log('✅ Success:', response.data.message);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

/**
 * Test 6: Manually Execute Scripts (Admin only)
 */
async function testExecuteScripts(deploymentId) {
  console.log('\n🚀 Test 6: Execute Scripts (Admin)');
  console.log('='.repeat(50));
  
  try {
    const response = await api.post(`/deployments/${deploymentId}/sql-scripts/execute`);
    
    console.log('✅ Success:', response.data.message);
    console.log('💡 Check deployment logs for real-time progress');
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

/**
 * Test 7: Add Incremental Scripts (Update DB Function)
 */
async function testIncrementalUpdate(deploymentId) {
  console.log('\n📦 Test 7: Add Incremental Scripts');
  console.log('='.repeat(50));
  console.log('💡 This demonstrates adding new scripts to an existing deployment\n');
  
  try {
    const response = await api.post(`/deployments/${deploymentId}/sql-scripts`, {
      scripts: [
        {
          scriptName: '004_add_user_profile_column.sql',
          scriptContent: `
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT;
          `,
          executionOrder: 3,
          haltOnError: true,
          runInTransaction: true,
        },
        {
          scriptName: '005_add_post_tags.sql',
          scriptContent: `
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
          `,
          executionOrder: 4,
          haltOnError: true,
          runInTransaction: true,
        },
      ],
    });
    
    console.log('✅ Success:', response.data.message);
    console.log('📝 New scripts added for incremental schema update');
    response.data.scripts.forEach(s => {
      console.log(`  - ${s.scriptName} (order: ${s.executionOrder})`);
    });
    console.log('\n💡 Now trigger execution to apply these changes:');
    console.log(`   POST /api/deployments/${deploymentId}/sql-scripts/execute`);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Main execution
async function main() {
  console.log('\n' + '='.repeat(50));
  console.log('🧪 Database Script Deployment - API Tests');
  console.log('='.repeat(50));
  
  // Replace with your actual deployment ID
  const DEPLOYMENT_ID = 'YOUR_DEPLOYMENT_ID_HERE';
  const SCRIPT_ID = 'YOUR_SCRIPT_ID_HERE'; // From upload response
  
  if (AUTH_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.log('\n⚠️  Please update AUTH_TOKEN in the script first!');
    console.log('   1. Login: POST /api/auth/login');
    console.log('   2. Copy the token from response');
    console.log('   3. Update AUTH_TOKEN variable in this file');
    return;
  }
  
  if (DEPLOYMENT_ID === 'YOUR_DEPLOYMENT_ID_HERE') {
    console.log('\n⚠️  Please update DEPLOYMENT_ID in the script!');
    console.log('   1. Create a deployment with enableRDS=true');
    console.log('   2. Copy the deployment ID');
    console.log('   3. Update DEPLOYMENT_ID variable in this file');
    return;
  }
  
  // Run tests
  await testUploadScripts(DEPLOYMENT_ID);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Uncomment for SQL Server testing
  // await testUploadSQLServerScripts(DEPLOYMENT_ID);
  // await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testListScripts(DEPLOYMENT_ID);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Uncomment these tests after getting script IDs
  // await testGetScript(DEPLOYMENT_ID, SCRIPT_ID);
  // await testUpdateScript(DEPLOYMENT_ID, SCRIPT_ID);
  // await testDeleteScript(DEPLOYMENT_ID, SCRIPT_ID);
  
  await testIncrementalUpdate(DEPLOYMENT_ID);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Uncomment to trigger execution (admin only)
  // await testExecuteScripts(DEPLOYMENT_ID);
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Tests completed!');
  console.log('='.repeat(50) + '\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testUploadScripts,
  testUploadSQLServerScripts,
  testListScripts,
  testGetScript,
  testUpdateScript,
  testDeleteScript,
  testExecuteScripts,
  testIncrementalUpdate,
};
