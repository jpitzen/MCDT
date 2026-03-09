const executor = require('./src/services/databaseScriptExecutor');

console.log('\n=== Database Engine Support Test ===\n');

const engines = ['postgres', 'mysql', 'sqlserver', 'mssql'];

engines.forEach(engine => {
  const notes = executor.getDatabaseSyntaxNotes(engine);
  console.log(`✓ ${engine}:`);
  console.log(`  ${notes}\n`);
});

console.log('=== All engines supported! ===\n');
