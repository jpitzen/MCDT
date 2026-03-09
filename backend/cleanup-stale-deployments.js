const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('eks_deployer', 'eks_user', 'eks_password_123', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function cleanup() {
  try {
    // Delete all old deployments for this cluster name
    const result = await sequelize.query(
      `DELETE FROM deployments WHERE cluster_name = 'usw1-zlps-k8s-01' RETURNING id`
    );
    console.log('Deleted', result[0].length, 'stale deployment records');
    
    // Verify
    const remaining = await sequelize.query(
      `SELECT COUNT(*) as count FROM deployments WHERE cluster_name = 'usw1-zlps-k8s-01'`
    );
    console.log('Remaining records for this cluster:', remaining[0][0].count);
    
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

cleanup();
