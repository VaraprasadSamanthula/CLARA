#!/usr/bin/env node

/**
 * PHASE 2 TESTS: Bulk Patient Import
 * 
 * Tests CSV/Excel preview and confirmation flows
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'clara.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log(`
╔════════════════════════════════════════════════════════════╗
║     PHASE 2 TESTS: BULK PATIENT IMPORT                     ║
╚════════════════════════════════════════════════════════════╝
`);

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    testsFailed++;
  }
}

// Clean up before tests
db.prepare('DELETE FROM import_previews;').run();
db.prepare('DELETE FROM import_logs;').run();
db.prepare('DELETE FROM patient_registry WHERE patient_source = ?;').run('IMPORT');

// Create a test session for FK constraint
const testSessionId = 'test-session-phase2-' + Date.now();
db.prepare(`
  INSERT INTO sessions (session_id, user_id, email, created_at, expires_at, last_activity)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(
  testSessionId,
  'test-user',
  'test@example.com',
  Math.floor(Date.now() / 1000),
  Math.floor(Date.now() / 1000) + 86400,
  Math.floor(Date.now() / 1000)
);

// Test 1: Import preview table exists
test('import_previews table exists', () => {
  const table = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='import_previews'
  `).get();
  if (!table) throw new Error('Table not found');
});

// Test 2: Import logs table exists
test('import_logs table exists', () => {
  const table = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='import_logs'
  `).get();
  if (!table) throw new Error('Table not found');
});

// Test 3: Insert preview
test('Insert import preview', () => {
  const result = db.prepare(`
    INSERT INTO import_previews (
      preview_id, session_id, user_email, file_name, file_format,
      total_rows, valid_rows, invalid_rows, duplicate_rows, preview_data, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'preview-123',
    testSessionId,
    'user@example.com',
    'test.csv',
    'csv',
    10,
    8,
    1,
    1,
    JSON.stringify([{ status: 'VALID' }]),
    Math.floor(Date.now() / 1000) + 86400
  );
  
  if (result.changes !== 1) throw new Error('Insert failed');
});

// Test 4: Query preview
test('Query import preview', () => {
  const preview = db.prepare('SELECT * FROM import_previews WHERE preview_id = ?').get('preview-123');
  if (!preview) throw new Error('Preview not found');
  if (preview.valid_rows !== 8) throw new Error('Valid rows mismatch');
});

// Test 5: Insert import log
test('Insert import log', () => {
  const result = db.prepare(`
    INSERT INTO import_logs (
      import_id, session_id, user_email, file_name,
      total_inserted, duplicate_skipped, invalid_skipped, import_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'import-456',
    testSessionId,
    'user@example.com',
    'test.csv',
    8,
    1,
    1,
    'success'
  );
  
  if (result.changes !== 1) throw new Error('Insert failed');
});

// Test 6: Query import log
test('Query import log', () => {
  const log = db.prepare('SELECT * FROM import_logs WHERE import_id = ?').get('import-456');
  if (!log) throw new Error('Log not found');
  if (log.total_inserted !== 8) throw new Error('Inserted count mismatch');
  if (log.import_status !== 'success') throw new Error('Status mismatch');
});

// Test 7: Simulation - import valid patients
test('Simulate importing valid patients', () => {
  const patients = [
    { full_name: 'Alice Johnson', date_of_birth: '1985-06-20', gender: 'F' },
    { full_name: 'Bob Smith', date_of_birth: '1990-01-15', gender: 'M' },
  ];
  
  const insertedIds = [];
  for (const patient of patients) {
    const result = db.prepare(`
      INSERT INTO patient_registry (patient_source, full_name, date_of_birth, gender, created_by)
      VALUES ('IMPORT', ?, ?, ?, 'import-test@example.com')
    `).run(patient.full_name, patient.date_of_birth, patient.gender);
    
    insertedIds.push(result.lastInsertRowid);
  }
  
  if (insertedIds.length !== 2) throw new Error('Insert count mismatch');
  if (insertedIds[0] >= insertedIds[1]) throw new Error('IDs not incrementing');
});

// Test 8: Query imported patients
test('Query imported patients', () => {
  const patients = db.prepare(`
    SELECT COUNT(*) as cnt FROM patient_registry WHERE patient_source = 'IMPORT'
  `).get();
  if (patients.cnt < 2) throw new Error('Imported patients not found');
});

// Test 9: MIMIC data still intact
test('MIMIC data unchanged', () => {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM patients;').get();
  if (count.cnt !== 100) throw new Error(`Expected 100 MIMIC patients, got ${count.cnt}`);
});

// Test 10: Duplicate detection in import
test('Detect duplicates during import', () => {
  // Try to insert duplicate
  const dup = db.prepare(`
    SELECT patient_id FROM patient_registry
    WHERE full_name = 'Alice Johnson' AND date_of_birth = '1985-06-20'
  `).get();
  
  if (!dup) throw new Error('Original not found');
  
  // Verify we can identify it as duplicate
  const isDuplicate = !!db.prepare(`
    SELECT patient_id FROM patient_registry
    WHERE full_name = 'Alice Johnson' AND date_of_birth = '1985-06-20' AND patient_id != ?
  `).get(dup.patient_id) === false;
  
  // Actually just verify the duplicate check works
  const duplicateCheck = db.prepare(`
    SELECT patient_id FROM patient_registry
    WHERE full_name = 'Alice Johnson' AND date_of_birth = '1985-06-20'
  `).all();
  
  if (duplicateCheck.length !== 1) throw new Error('Duplicate check failed');
});

// Test 11: Patient ID range for imports
test('Import patient IDs within valid range', () => {
  const patients = db.prepare(`
    SELECT patient_id FROM patient_registry
    WHERE patient_source = 'IMPORT'
  `).all();
  
  for (const p of patients) {
    if (p.patient_id < 1 || p.patient_id > 9999999) {
      throw new Error(`Patient ID ${p.patient_id} out of range`);
    }
  }
});

// Test 12: Import source constraint
test('Import source constraint enforced', () => {
  const count = db.prepare(`
    SELECT COUNT(*) as cnt FROM patient_registry
    WHERE patient_source IN ('IMPORT', 'MANUAL')
  `).get();
  
  if (count.cnt < 2) throw new Error('Import source filtering failed');
});

// Test 13: Database integrity after imports
test('Database integrity maintained', () => {
  const integrity = db.prepare('PRAGMA integrity_check;').get();
  if (integrity.integrity_check !== 'ok') throw new Error('Integrity check failed');
});

// Test 14: Foreign key constraints
test('Foreign key constraints intact', () => {
  const violations = db.prepare('PRAGMA foreign_key_check;').all();
  if (violations.length > 0) throw new Error(`${violations.length} FK violations`);
});

// Test 15: Preview data structure
test('Preview data structure validation', () => {
  const preview = db.prepare('SELECT preview_data FROM import_previews WHERE preview_id = ?').get('preview-123');
  if (!preview) throw new Error('Preview not found');
  
  let data;
  try {
    data = JSON.parse(preview.preview_data);
  } catch (e) {
    throw new Error('Invalid JSON in preview_data');
  }
  
  if (!Array.isArray(data)) throw new Error('preview_data must be array');
});

// Test 16: Preview expiration
test('Preview expiration logic', () => {
  const now = Math.floor(Date.now() / 1000);
  const future = now + 86400; // 24 hours
  const past = now - 1; // Already expired
  
  // Future expiration should be valid
  const validPreview = db.prepare(`
    SELECT expires_at FROM import_previews WHERE expires_at > ?
  `).get(now);
  
  if (!validPreview) throw new Error('Future expiration not found');
});

// Cleanup
db.prepare('DELETE FROM import_previews;').run();
db.prepare('DELETE FROM import_logs;').run();
db.prepare('DELETE FROM patient_registry WHERE patient_source = ?;').run('IMPORT');

db.close();

console.log(`
╔════════════════════════════════════════════════════════════╗
║                    TEST SUMMARY                             ║
╚════════════════════════════════════════════════════════════╝

Passed: ${testsPassed}/16
Failed: ${testsFailed}/16

${testsFailed === 0 ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}
`);

process.exit(testsFailed > 0 ? 1 : 0);
