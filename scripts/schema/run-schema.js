#!/usr/bin/env node

/**
 * Schema Creation Runner
 * Phase 3: Create and populate SQLite database
 */

const path = require('path');
const SchemaCreator = require('./create-schema');

async function main() {
  try {
    const projectRoot = path.resolve(__dirname, '../../');
    const dbPath = path.join(projectRoot, 'clara.db');

    console.log('\n' + '='.repeat(70));
    console.log('PHASE 3: SCHEMA OPTIMIZATION & DATABASE CREATION');
    console.log('='.repeat(70));
    console.log(`Database: ${dbPath}`);

    const creator = new SchemaCreator(dbPath);
    const success = await creator.run();

    if (success) {
      console.log('\n✓ Phase 3 complete. Database ready: ' + dbPath);
      process.exit(0);
    } else {
      console.error('\n✗ Phase 3 failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
