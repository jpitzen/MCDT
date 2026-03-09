const { sequelize } = require('./src/models');
const logger = require('./src/services/logger');

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Check if table exists
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'deployment_sql_scripts'
    `);
    
    if (tables.length > 0) {
      console.log('✓ Table deployment_sql_scripts already exists');
    } else {
      console.log('Creating deployment_sql_scripts table...');
      
      await sequelize.query(`
        CREATE TABLE deployment_sql_scripts (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE ON UPDATE CASCADE,
          script_name VARCHAR(255) NOT NULL,
          script_content TEXT NOT NULL,
          execution_order INTEGER NOT NULL DEFAULT 0,
          status VARCHAR(50) DEFAULT 'pending' NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE,
          execution_duration_ms INTEGER,
          rows_affected INTEGER,
          error_message TEXT,
          error_stack TEXT,
          halt_on_error BOOLEAN DEFAULT true NOT NULL,
          run_in_transaction BOOLEAN DEFAULT true NOT NULL,
          timeout_seconds INTEGER DEFAULT 300 NOT NULL,
          uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          UNIQUE(deployment_id, script_name)
        );
      `);
      
      console.log('✓ Created deployment_sql_scripts table');
      
      // Create indexes
      await sequelize.query(`
        CREATE INDEX idx_deployment_sql_scripts_deployment ON deployment_sql_scripts(deployment_id);
      `);
      await sequelize.query(`
        CREATE INDEX idx_deployment_sql_scripts_status ON deployment_sql_scripts(status);
      `);
      await sequelize.query(`
        CREATE INDEX idx_deployment_sql_scripts_order ON deployment_sql_scripts(deployment_id, execution_order);
      `);
      
      console.log('✓ Created indexes');
    }
    
    // Add database phases to enum (if not exists)
    console.log('Adding database phases to deployment_phase enum...');
    try {
      // Get current enum values
      const [enumValues] = await sequelize.query(`
        SELECT enumlabel 
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname LIKE '%deployments_deployment_phase%'
        ORDER BY e.enumsortorder;
      `);
      
      const currentValues = enumValues.map(row => row.enumlabel);
      console.log('Current enum values:', currentValues);
      
      if (!currentValues.includes('database-init')) {
        await sequelize.query(`
          ALTER TYPE enum_deployments_deployment_phase ADD VALUE 'database-init';
        `);
        console.log('✓ Added database-init phase');
      } else {
        console.log('✓ database-init phase already exists');
      }
      
      if (!currentValues.includes('database-ready')) {
        await sequelize.query(`
          ALTER TYPE enum_deployments_deployment_phase ADD VALUE 'database-ready';
        `);
        console.log('✓ Added database-ready phase');
      } else {
        console.log('✓ database-ready phase already exists');
      }
    } catch (enumError) {
      console.log('Note: Could not modify enum (may not exist yet):', enumError.message);
    }
    
    console.log('\n✅ Migrations completed successfully!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runMigrations();
