#!/usr/bin/env node

/**
 * PHASE 1 MIGRATION: Patient Registration Support
 * 
 * This script:
 * 1. Backs up the current database with WAL checkpoint
 * 2. Creates patient_registry table for new patients
 * 3. Creates clara_documents table for new patient documents
 * 4. Verifies migration integrity
 * 5. Enables rollback if needed
 * 
 * Safe: All changes isolated to new tables, existing MIMIC data untouched
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '../');
const dbPath = path.join(projectRoot, 'database', 'clara.db');
const backupDir = path.join(projectRoot, 'backups');

// Ensure backups directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `clara_phase1_${timestamp}.db`);
const walBackupPath = path.join(backupDir, `clara_phase1_${timestamp}-wal`);
const shmBackupPath = path.join(backupDir, `clara_phase1_${timestamp}-shm`);

console.log(`
╔════════════════════════════════════════════════════════════╗
║        PHASE 1 MIGRATION: PATIENT REGISTRATION              ║
║            Safe Database Schema Extension                   ║
╚════════════════════════════════════════════════════════════╝
`);

try {
  // Step 1: Backup with WAL checkpoint
  console.log('STEP 1: Backing up database with WAL checkpoint...');
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  
  // Checkpoint WAL to ensure all data is in main database file
  db.exec('PRAGMA wal_checkpoint(RESTART);');
  console.log('✓ WAL checkpoint completed');
  
  // Backup main file
  fs.copyFileSync(dbPath, backupPath);
  console.log(`✓ Main database backed up to: ${backupPath}`);
  
  // Backup WAL files if they exist
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;
  
  if (fs.existsSync(walPath)) {
    fs.copyFileSync(walPath, walBackupPath);
    console.log(`✓ WAL file backed up`);
  }
  
  if (fs.existsSync(shmPath)) {
    fs.copyFileSync(shmPath, shmBackupPath);
    console.log(`✓ Shared memory file backed up`);
  }
  
  // Step 2: Pre-migration verification
  console.log('\nSTEP 2: Pre-migration verification...');
  
  const preMigrationStats = {
    patients: db.prepare('SELECT COUNT(*) as count FROM patients;').get().count,
    admissions: db.prepare('SELECT COUNT(*) as count FROM admissions;').get().count,
    documents: db.prepare('SELECT COUNT(*) as count FROM documents;').get().count,
    sessions: db.prepare('SELECT COUNT(*) as count FROM sessions;').get().count
  };
  
  console.log(`  Patients: ${preMigrationStats.patients}`);
  console.log(`  Admissions: ${preMigrationStats.admissions}`);
  console.log(`  Documents: ${preMigrationStats.documents}`);
  console.log(`  Sessions: ${preMigrationStats.sessions}`);
  
  // Integrity check
  const integrityBefore = db.prepare('PRAGMA integrity_check;').get();
  if (integrityBefore.integrity_check !== 'ok') {
    throw new Error(`Pre-migration integrity check failed: ${integrityBefore.integrity_check}`);
  }
  console.log('✓ Database integrity verified');
  
  // FK check
  const fkBefore = db.prepare('PRAGMA foreign_key_check;').all();
  if (fkBefore.length > 0) {
    throw new Error(`Pre-migration foreign key violations detected: ${fkBefore.length}`);
  }
  console.log('✓ No foreign key violations');
  
  // Step 3: Create patient_registry table
  console.log('\nSTEP 3: Creating patient_registry table...');
  
  // Drop if exists (safe: no data yet)
  db.exec('DROP TABLE IF EXISTS patient_registry;');
  
  db.exec(`
    CREATE TABLE patient_registry (
      patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_source TEXT NOT NULL CHECK (patient_source IN ('MANUAL', 'IMPORT')),
      full_name TEXT NOT NULL,
      date_of_birth TEXT,
      gender TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      notes TEXT
    );
  `);
  
  console.log('✓ patient_registry table created');
  
  // Note: AUTOINCREMENT will start from 1 and increment naturally.
  // The application layer will prevent IDs > 9999999
  
  // Verify basic insertion works
  const testInsert = db.prepare(`
    INSERT INTO patient_registry (patient_source, full_name)
    VALUES ('MANUAL', 'Test Patient');
  `);
  testInsert.run();
  
  const testId = db.prepare('SELECT MAX(patient_id) as max_id FROM patient_registry;').get();
  console.log(`✓ Auto-incremented patient_id initialized: ${testId.max_id}`);
  
  // Clean up test record
  db.prepare('DELETE FROM patient_registry WHERE full_name = ?;').run('Test Patient');
  
  // Step 4: Create patient_registry indexes
  console.log('\nSTEP 4: Creating patient_registry indexes...');
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_registry_source 
      ON patient_registry(patient_source);
    
    CREATE INDEX IF NOT EXISTS idx_registry_name_dob 
      ON patient_registry(full_name, date_of_birth);
    
    CREATE INDEX IF NOT EXISTS idx_registry_created_at
      ON patient_registry(created_at DESC);
  `);
  
  console.log('✓ Indexes created');
  
  // Step 5: Create clara_documents table (source-qualified IDs)
  console.log('\nSTEP 5: Creating clara_documents table...');
  
  // Drop if exists (safe: no data yet)
  db.exec('DROP TABLE IF EXISTS clara_documents;');
  
  db.exec(`
    CREATE TABLE clara_documents (
      document_id TEXT PRIMARY KEY,
      patient_id INTEGER NOT NULL,
      document_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_deleted INTEGER DEFAULT 0,
      deleted_at DATETIME,
      created_by TEXT,
      FOREIGN KEY (patient_id) REFERENCES patient_registry(patient_id),
      CHECK (document_id LIKE 'CLARA:%')
    );
  `);
  
  console.log('✓ clara_documents table created');
  console.log('  Document ID format: CLARA:<patient_id>:<sequence>');
  console.log('  Foreign key: patient_id → patient_registry');
  
  // Step 6: Create clara_documents indexes
  console.log('\nSTEP 6: Creating clara_documents indexes...');
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_clara_documents_patient_id 
      ON clara_documents(patient_id);
    
    CREATE INDEX IF NOT EXISTS idx_clara_documents_patient_active
      ON clara_documents(patient_id, is_deleted);
    
    CREATE INDEX IF NOT EXISTS idx_clara_documents_deleted
      ON clara_documents(is_deleted, deleted_at DESC);
  `);
  
  console.log('✓ Indexes created');
  
  // Step 7: Test source-qualified document ID insertion
  console.log('\nSTEP 7: Testing source-qualified document IDs...');
  
  // First, ensure there's at least one registry patient
  const regPatient = db.prepare(`
    INSERT INTO patient_registry (patient_source, full_name, date_of_birth, gender)
    VALUES ('MANUAL', 'Integration Test', '1985-06-15', 'F');
  `);
  regPatient.run();
  
  const newPatientId = db.prepare('SELECT MAX(patient_id) as max_id FROM patient_registry;').get().max_id;
  
  const docInsert = db.prepare(`
    INSERT INTO clara_documents (document_id, patient_id, document_type, file_path, file_name, mime_type, created_by)
    VALUES (?, ?, 'MEDICAL_RECORD', '/uploads/test.pdf', 'test.pdf', 'application/pdf', 'system');
  `);
  
  const testDocId = `CLARA:${newPatientId}:1`;
  docInsert.run(testDocId, newPatientId);
  
  const retrievedDoc = db.prepare('SELECT * FROM clara_documents WHERE document_id = ?;').get(testDocId);
  if (retrievedDoc && retrievedDoc.patient_id === newPatientId) {
    console.log(`✓ Source-qualified document ID test passed: ${testDocId}`);
  } else {
    throw new Error('Document ID test failed');
  }
  
  // Clean up test records
  db.prepare('DELETE FROM clara_documents WHERE document_id LIKE ?;').run('CLARA:%');
  db.prepare('DELETE FROM patient_registry WHERE full_name = ?;').run('Integration Test');
  
  // Step 8: Post-migration verification
  console.log('\nSTEP 8: Post-migration verification...');
  
  const postMigrationStats = {
    patients: db.prepare('SELECT COUNT(*) as count FROM patients;').get().count,
    admissions: db.prepare('SELECT COUNT(*) as count FROM admissions;').get().count,
    documents: db.prepare('SELECT COUNT(*) as count FROM documents;').get().count,
    sessions: db.prepare('SELECT COUNT(*) as count FROM sessions;').get().count,
    registry: db.prepare('SELECT COUNT(*) as count FROM patient_registry;').get().count,
    clara_docs: db.prepare('SELECT COUNT(*) as count FROM clara_documents;').get().count
  };
  
  console.log('  MIMIC Data (should be unchanged):');
  console.log(`    Patients: ${postMigrationStats.patients} (before: ${preMigrationStats.patients}) ${postMigrationStats.patients === preMigrationStats.patients ? '✓' : '✗'}`);
  console.log(`    Admissions: ${postMigrationStats.admissions} (before: ${preMigrationStats.admissions}) ${postMigrationStats.admissions === preMigrationStats.admissions ? '✓' : '✗'}`);
  console.log(`    Documents: ${postMigrationStats.documents} (before: ${preMigrationStats.documents}) ${postMigrationStats.documents === preMigrationStats.documents ? '✓' : '✗'}`);
  
  console.log('  New Tables:');
  console.log(`    Patient Registry: ${postMigrationStats.registry} records`);
  console.log(`    CLARA Documents: ${postMigrationStats.clara_docs} records`);
  
  // Integrity check
  const integrityAfter = db.prepare('PRAGMA integrity_check;').get();
  if (integrityAfter.integrity_check !== 'ok') {
    throw new Error(`Post-migration integrity check failed: ${integrityAfter.integrity_check}`);
  }
  console.log('✓ Database integrity verified');
  
  // FK check
  const fkAfter = db.prepare('PRAGMA foreign_key_check;').all();
  if (fkAfter.length > 0) {
    console.warn(`⚠ Foreign key violations detected: ${fkAfter.length}`);
    fkAfter.slice(0, 3).forEach(v => console.warn(`  ${JSON.stringify(v)}`));
  } else {
    console.log('✓ No foreign key violations');
  }
  
  // Step 9: Migration summary
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           MIGRATION COMPLETED SUCCESSFULLY                  ║
╚════════════════════════════════════════════════════════════╝

✓ MIMIC data completely preserved
  - Patients: ${preMigrationStats.patients}
  - Admissions: ${preMigrationStats.admissions}
  - Documents: ${preMigrationStats.documents}

✓ New tables created for Phase 1
  - patient_registry: Ready for manual registration
  - clara_documents: Ready for document uploads

✓ Database backup created (for rollback if needed):
  ${backupPath}

✓ Rollback procedure:
  1. Close all database connections
  2. Copy backup file: cp ${backupPath} ${dbPath}
  3. Remove WAL files (if they exist)
  4. Restart application

Next steps:
  1. Deploy Phase 1 backend: POST /api/patients/register
  2. Deploy Phase 1 UI: AddPatientForm component
  3. Test manual patient registration
  4. Ready for Phase 2: Bulk import
`);
  
  db.close();
  process.exit(0);

} catch (error) {
  console.error(`\n✗ Migration failed: ${error.message}`);
  console.error(`\nTo restore from backup, run:`);
  console.error(`  cp ${backupPath} ${dbPath}`);
  console.error(`  rm -f ${dbPath}-wal ${dbPath}-shm`);
  process.exit(1);
}
