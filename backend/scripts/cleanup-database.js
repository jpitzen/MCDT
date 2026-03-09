#!/usr/bin/env node

/**
 * Database Cleanup Script
 * Cleans up deployment-related database records
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'zlaws_db',
  process.env.DB_USER || 'zlaws_user',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

async function cleanupDatabase() {
  try {
    console.log('\n========================================');
    console.log('DATABASE CLEANUP SCRIPT');
    console.log('========================================\n');

    // Test connection
    await sequelize.authenticate();
    console.log('✓ Database connection successful\n');

    // Get table counts before cleanup
    console.log('Current database state:');
    const beforeCounts = {};
    
    const tables = [
      'deployments',
      'deployment_sql_scripts',
      'credentials',
      'users',
      'deployment_drafts'
    ];

    for (const table of tables) {
      try {
        const [results] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table}`);
        beforeCounts[table] = parseInt(results[0].count);
        console.log(`  ${table}: ${beforeCounts[table]} records`);
      } catch (error) {
        console.log(`  ${table}: Table not found or error`);
        beforeCounts[table] = 0;
      }
    }

    console.log('\n========================================');
    console.log('Select cleanup option:');
    console.log('1. Delete ALL deployment records');
    console.log('2. Delete failed deployments only');
    console.log('3. Delete deployments older than 30 days');
    console.log('4. Delete specific deployment by ID');
    console.log('5. Delete all deployment drafts');
    console.log('6. Show deployment list');
    console.log('7. Exit without changes');
    console.log('========================================\n');

    const option = process.argv[2] || '7';

    switch (option) {
      case '1':
        await deleteAllDeployments();
        break;
      case '2':
        await deleteFailedDeployments();
        break;
      case '3':
        await deleteOldDeployments();
        break;
      case '4':
        await deleteSpecificDeployment(process.argv[3]);
        break;
      case '5':
        await deleteAllDrafts();
        break;
      case '6':
        await listDeployments();
        break;
      default:
        console.log('No cleanup performed. Exiting...');
    }

    // Show final counts
    if (option !== '6' && option !== '7') {
      console.log('\n========================================');
      console.log('Final database state:');
      for (const table of tables) {
        try {
          const [results] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table}`);
          const afterCount = parseInt(results[0].count);
          const deleted = beforeCounts[table] - afterCount;
          console.log(`  ${table}: ${afterCount} records ${deleted > 0 ? `(${deleted} deleted)` : ''}`);
        } catch (error) {
          console.log(`  ${table}: Error reading count`);
        }
      }
    }

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

async function deleteAllDeployments() {
  console.log('\n⚠️  WARNING: This will delete ALL deployments and related records!');
  
  // Delete related records first (foreign key constraints)
  const [sqlScripts] = await sequelize.query('DELETE FROM deployment_sql_scripts');
  console.log(`✓ Deleted deployment_sql_scripts: ${sqlScripts.rowCount || 0} records`);
  
  const [deployments] = await sequelize.query('DELETE FROM deployments');
  console.log(`✓ Deleted deployments: ${deployments.rowCount || 0} records`);
  
  console.log('\n✓ All deployments deleted successfully');
}

async function deleteFailedDeployments() {
  console.log('\nDeleting failed deployments...');
  
  // Get failed deployment IDs
  const [failedDeployments] = await sequelize.query(
    "SELECT id, cluster_name, status FROM deployments WHERE status IN ('failed', 'error')"
  );
  
  if (failedDeployments.length === 0) {
    console.log('No failed deployments found.');
    return;
  }
  
  console.log(`Found ${failedDeployments.length} failed deployments:`);
  failedDeployments.forEach(d => {
    console.log(`  - ${d.cluster_name} (${d.id}) - ${d.status}`);
  });
  
  const ids = failedDeployments.map(d => d.id);
  
  // Delete related records
  await sequelize.query(
    'DELETE FROM deployment_sql_scripts WHERE deployment_id = ANY($1)',
    { bind: [ids] }
  );
  
  const [result] = await sequelize.query(
    'DELETE FROM deployments WHERE id = ANY($1)',
    { bind: [ids] }
  );
  
  console.log(`\n✓ Deleted ${failedDeployments.length} failed deployments`);
}

async function deleteOldDeployments() {
  console.log('\nDeleting deployments older than 30 days...');
  
  const [oldDeployments] = await sequelize.query(
    "SELECT id, cluster_name, created_at FROM deployments WHERE created_at < NOW() - INTERVAL '30 days'"
  );
  
  if (oldDeployments.length === 0) {
    console.log('No deployments older than 30 days found.');
    return;
  }
  
  console.log(`Found ${oldDeployments.length} old deployments:`);
  oldDeployments.forEach(d => {
    console.log(`  - ${d.cluster_name} (${d.id}) - ${new Date(d.created_at).toLocaleDateString()}`);
  });
  
  const ids = oldDeployments.map(d => d.id);
  
  // Delete related records
  await sequelize.query(
    'DELETE FROM deployment_sql_scripts WHERE deployment_id = ANY($1)',
    { bind: [ids] }
  );
  
  await sequelize.query(
    'DELETE FROM deployments WHERE id = ANY($1)',
    { bind: [ids] }
  );
  
  console.log(`\n✓ Deleted ${oldDeployments.length} old deployments`);
}

async function deleteSpecificDeployment(deploymentId) {
  if (!deploymentId) {
    console.log('Error: Please provide a deployment ID');
    console.log('Usage: node cleanup-database.js 4 <deployment-id>');
    return;
  }
  
  console.log(`\nDeleting deployment: ${deploymentId}...`);
  
  const [deployment] = await sequelize.query(
    'SELECT id, cluster_name, status FROM deployments WHERE id = $1',
    { bind: [deploymentId] }
  );
  
  if (deployment.length === 0) {
    console.log(`Deployment ${deploymentId} not found.`);
    return;
  }
  
  console.log(`Found: ${deployment[0].cluster_name} - ${deployment[0].status}`);
  
  // Delete related records
  await sequelize.query(
    'DELETE FROM deployment_sql_scripts WHERE deployment_id = $1',
    { bind: [deploymentId] }
  );
  
  await sequelize.query(
    'DELETE FROM deployments WHERE id = $1',
    { bind: [deploymentId] }
  );
  
  console.log(`\n✓ Deleted deployment ${deploymentId}`);
}

async function deleteAllDrafts() {
  console.log('\nDeleting all deployment drafts...');
  
  const [result] = await sequelize.query('DELETE FROM deployment_drafts');
  console.log(`✓ Deleted ${result.rowCount || 0} draft records`);
}

async function listDeployments() {
  console.log('\nCurrent Deployments:');
  console.log('========================================\n');
  
  const [deployments] = await sequelize.query(
    `SELECT 
      id, 
      cluster_name, 
      cloud_provider, 
      status, 
      progress,
      created_at,
      updated_at
    FROM deployments 
    ORDER BY created_at DESC`
  );
  
  if (deployments.length === 0) {
    console.log('No deployments found.');
    return;
  }
  
  deployments.forEach((d, idx) => {
    console.log(`${idx + 1}. ${d.cluster_name}`);
    console.log(`   ID: ${d.id}`);
    console.log(`   Provider: ${d.cloud_provider}`);
    console.log(`   Status: ${d.status} (${d.progress}%)`);
    console.log(`   Created: ${new Date(d.created_at).toLocaleString()}`);
    console.log(`   Updated: ${new Date(d.updated_at).toLocaleString()}`);
    console.log('');
  });
  
  console.log(`Total: ${deployments.length} deployments`);
  
  // Show drafts
  console.log('\nDeployment Drafts:');
  console.log('========================================\n');
  
  const [drafts] = await sequelize.query(
    `SELECT 
      id, 
      name, 
      status,
      created_at
    FROM deployment_drafts 
    ORDER BY created_at DESC`
  );
  
  if (drafts.length === 0) {
    console.log('No drafts found.');
  } else {
    drafts.forEach((d, idx) => {
      console.log(`${idx + 1}. ${d.name} (${d.status})`);
      console.log(`   ID: ${d.id}`);
      console.log(`   Created: ${new Date(d.created_at).toLocaleString()}`);
      console.log('');
    });
    console.log(`Total: ${drafts.length} drafts`);
  }
}

// Usage information
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('\nUsage: node cleanup-database.js [option] [args]');
  console.log('\nOptions:');
  console.log('  1              Delete ALL deployment records');
  console.log('  2              Delete failed deployments only');
  console.log('  3              Delete deployments older than 30 days');
  console.log('  4 <id>         Delete specific deployment by ID');
  console.log('  5              Delete all deployment drafts');
  console.log('  6              Show deployment list');
  console.log('  7              Exit without changes (default)');
  console.log('\nExamples:');
  console.log('  node cleanup-database.js 1        # Delete all deployments');
  console.log('  node cleanup-database.js 2        # Delete failed only');
  console.log('  node cleanup-database.js 4 abc123 # Delete specific ID');
  console.log('  node cleanup-database.js 6        # List all deployments');
  console.log('');
  process.exit(0);
}

// Run cleanup
cleanupDatabase();
