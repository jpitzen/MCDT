'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if indexes already exist before creating
    const checkIndex = async (tableName, indexName) => {
      const [results] = await queryInterface.sequelize.query(`
        SELECT indexname FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = '${tableName}' 
        AND indexname = '${indexName}';
      `);
      return results.length > 0;
    };

    // Index 1: Deployments by user and creation date (for recent deployments query)
    if (!await checkIndex('deployments', 'idx_deployments_user_created')) {
      await queryInterface.sequelize.query(`
        CREATE INDEX idx_deployments_user_created 
        ON deployments(user_id, created_at DESC);
      `);
      console.log('✓ Created index: idx_deployments_user_created');
    }

    // Index 2: Deployments by user and status (for dashboard stats)
    if (!await checkIndex('deployments', 'idx_deployments_user_status')) {
      await queryInterface.sequelize.query(`
        CREATE INDEX idx_deployments_user_status 
        ON deployments(user_id, status);
      `);
      console.log('✓ Created index: idx_deployments_user_status');
    }

    // Index 3: Credentials by cloud provider and user (for filtering)
    if (!await checkIndex('credentials', 'idx_credentials_provider')) {
      await queryInterface.sequelize.query(`
        CREATE INDEX idx_credentials_provider 
        ON credentials(cloud_provider, user_id);
      `);
      console.log('✓ Created index: idx_credentials_provider');
    }

    // Index 4: Deployment logs by deployment, level, and date (for log queries)
    if (!await checkIndex('deployment_logs', 'idx_logs_deployment_level')) {
      await queryInterface.sequelize.query(`
        CREATE INDEX idx_logs_deployment_level 
        ON deployment_logs(deployment_id, log_level, created_at);
      `);
      console.log('✓ Created index: idx_logs_deployment_level');
    }

    console.log('✓ All composite indexes created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes in reverse order
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_logs_deployment_level;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_credentials_provider;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_deployments_user_status;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_deployments_user_created;');
    
    console.log('✓ All composite indexes removed');
  }
};
