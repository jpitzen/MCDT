require('dotenv').config({ path: '../backend/.env' });
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('eks_deployer', 'eks_user', 'eks_password_123', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function getDraft() {
  const [results] = await sequelize.query(
    "SELECT id, name, status, configuration FROM deployment_drafts ORDER BY updated_at DESC LIMIT 1"
  );
  
  if (results.length === 0) {
    console.log('No drafts found');
    return;
  }
  
  const draft = results[0];
  const config = typeof draft.configuration === 'string' 
    ? JSON.parse(draft.configuration) 
    : draft.configuration;
  
  console.log('=== Deployment Draft ===');
  console.log('ID:', draft.id);
  console.log('Name:', draft.name);
  console.log('Status:', draft.status);
  console.log('\n=== Cluster Configuration ===');
  console.log(JSON.stringify(config.clusterConfig || config, null, 2));
  
  await sequelize.close();
}

getDraft().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
