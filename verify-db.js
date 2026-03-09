// Verify database tables and data
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'zl_mcdt_dev',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function verifyDatabase() {
  try {
    await sequelize.authenticate();
    console.log('\n✓ Database connection successful\n');

    // Get all tables
    const tables = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name != 'spatial_ref_sys'
      ORDER BY table_name
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('📊 TABLES CREATED:');
    console.log('═══════════════════════════════════════════\n');

    for (const table of tables) {
      const columns = await sequelize.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = '${table.table_name}'
        ORDER BY ordinal_position
      `, { type: sequelize.QueryTypes.SELECT });

      console.log(`\n${table.table_name}:`);
      console.log(`├─ Columns: ${columns.length}`);
      
      const indexes = await sequelize.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = '${table.table_name}'
        AND indexname NOT LIKE '%pkey'
      `, { type: sequelize.QueryTypes.SELECT });

      console.log(`├─ Indexes: ${indexes.length}`);

      // Get row count
      const countResult = await sequelize.query(`SELECT COUNT(*) FROM "${table.table_name}"`, 
        { type: sequelize.QueryTypes.SELECT });
      console.log(`└─ Records: ${countResult[0].count}`);
    }

    console.log('\n═══════════════════════════════════════════');
    console.log(`\n✓ Total tables created: ${tables.length}`);

    // Get seeded users
    const users = await sequelize.query(`
      SELECT id, email, first_name, role FROM "users"
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`\n👥 SEEDED USERS (${users.length}):`);
    console.log('───────────────────────────────────────────');
    users.forEach(user => {
      console.log(`  • ${user.email} (${user.role})`);
    });

    console.log('\n✓ Database deployment completed successfully!\n');

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

verifyDatabase();
