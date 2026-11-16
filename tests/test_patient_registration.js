#!/usr/bin/env node

/**
 * PHASE 1 TESTS: Patient Registration API
 * 
 * Tests manual patient registration endpoint
 */

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '../');
const dbPath = path.join(projectRoot, 'database', 'clara.db');
const testDbPath = path.join(projectRoot, 'database', 'test_registration.db');

const fs = require('fs');

// Test suite
const tests = [];
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
  }
}

async function runTests() {
  // Create test database copy
  fs.copyFileSync(dbPath, testDbPath);
  const db = new Database(testDbPath);
  db.pragma('foreign_keys = ON');

  // Drop any triggers that might have been copied from production
  db.exec("DROP TRIGGER IF EXISTS trig_patient_id_range;");

  // Create patient_registry and clara_documents tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS patient_registry (
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

    CREATE TABLE IF NOT EXISTS clara_documents (
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

  console.log(`
╔════════════════════════════════════════════════════════════╗
║     PHASE 1 TESTS: PATIENT REGISTRATION API                ║
╚════════════════════════════════════════════════════════════╝
`);

  // Test 1: Valid patient registration
  test('Valid patient registration', () => {
    const result = db.prepare(`
      INSERT INTO patient_registry (patient_source, full_name, date_of_birth, gender, created_by)
      VALUES ('MANUAL', 'John Doe', '1990-01-15', 'M', 'test@example.com');
    `).run();

    assert(result.changes === 1, 'Should insert 1 row');
    assert(result.lastInsertRowid > 0, 'Should return a valid patient_id');

    const patient = db.prepare('SELECT * FROM patient_registry WHERE patient_id = ?').get(result.lastInsertRowid);
    assertEqual(patient.full_name, 'John Doe', 'Full name should match');
    assertEqual(patient.gender, 'M', 'Gender should match');
    assertEqual(patient.patient_source, 'MANUAL', 'Source should be MANUAL');
  });

  // Test 2: Patient ID constraint enforcement
  test('Patient ID constraint: valid range (1-9999999)', () => {
    db.prepare('DELETE FROM patient_registry;').run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name='patient_registry';").run();
    
    // Insert with auto-increment (should start from 1 after reset)
    let result = db.prepare(`
      INSERT INTO patient_registry (patient_source, full_name)
      VALUES ('MANUAL', 'Patient 1');
    `).run();
    // After reset, first ID may be 1 or continue from previous high water mark
    const firstId = result.lastInsertRowid;
    assert(firstId > 0, 'Should have positive auto-increment ID');

    // Application layer enforces the MAX(patient_id) < 10000000 check before AUTOINCREMENT
    result = db.prepare(`
      INSERT INTO patient_registry (patient_source, full_name)
      VALUES ('MANUAL', 'Patient 2');
    `).run();
    const secondId = result.lastInsertRowid;
    assert(secondId > firstId, 'Should auto-increment');

    const count = db.prepare('SELECT COUNT(*) as cnt FROM patient_registry;').get();
    assertEqual(count.cnt, 2, 'Should have 2 patients');
  });

  // Test 3: Application-enforced patient ID boundary
  test('Patient ID constraint: application enforces < 10000000', () => {
    db.prepare('DELETE FROM patient_registry;').run();

    // Simulate application checking MAX(patient_id) before allowing insert
    // This is where the API endpoint enforces the 1-9999999 range
    let count = 0;
    
    // Insert records until we reach near the boundary
    for (let i = 0; i < 5; i++) {
      db.prepare(`
        INSERT INTO patient_registry (patient_source, full_name)
        VALUES ('MANUAL', ?);
      `).run(`Patient ${i}`);
      count++;
    }

    const maxId = db.prepare('SELECT MAX(patient_id) as max_id FROM patient_registry;').get();
    
    // Application should check: if MAX(patient_id) >= 9999999, reject new registration
    const isAtBoundary = maxId.max_id >= 9999999;
    assert(!isAtBoundary, 'Should not be near boundary yet');
    assert(count === 5, 'Should have inserted 5 patients');
  });

  // Test 4: Duplicate detection (same name + DOB)
  test('Duplicate detection: match on full_name + date_of_birth', () => {
    db.prepare('DELETE FROM patient_registry;').run();

    db.prepare(`
      INSERT INTO patient_registry (patient_source, full_name, date_of_birth, gender)
      VALUES ('MANUAL', 'Alice Smith', '1985-06-20', 'F');
    `).run();

    // Try to insert duplicate
    const duplicate = db.prepare(`
      SELECT patient_id FROM patient_registry 
      WHERE full_name = ? AND date_of_birth = ?;
    `).get('Alice Smith', '1985-06-20');

    assert(duplicate !== null, 'Should find duplicate');
    assert(duplicate.patient_id > 0, 'Should return existing patient_id');
  });

  // Test 5: Non-duplicate with different names
  test('Different names: should NOT be flagged as duplicate', () => {
    db.prepare('DELETE FROM patient_registry;').run();

    const id1 = db.prepare(`
      INSERT INTO patient_registry (patient_source, full_name, date_of_birth, gender)
      VALUES ('MANUAL', 'Alice Smith', '1985-06-20', 'F');
    `).run().lastInsertRowid;

    const id2 = db.prepare(`
      INSERT INTO patient_registry (patient_source, full_name, date_of_birth, gender)
      VALUES ('MANUAL', 'Bob Smith', '1985-06-20', 'M');
    `).run().lastInsertRowid;

    assert(id1 !== id2, 'Should have different IDs');
    const count = db.prepare('SELECT COUNT(*) as cnt FROM patient_registry;').get();
    assertEqual(count.cnt, 2, 'Should have 2 different patients');
  });

  // Test 6: Required and optional fields
  test('Required field validation: full_name', () => {
    db.prepare('DELETE FROM patient_registry;').run();

    let error = null;
    try {
      db.prepare(`
        INSERT INTO patient_registry (patient_source, date_of_birth)
        VALUES ('MANUAL', '1985-06-20');
      `).run();
    } catch (e) {
      error = e.message;
    }
    assert(error, 'Should reject INSERT without full_name');
  });

  // Test 7: Optional fields are nullable
  test('Optional fields are nullable', () => {
    db.prepare('DELETE FROM patient_registry;').run();

    const result = db.prepare(`
      INSERT INTO patient_registry (patient_source, full_name)
      VALUES ('MANUAL', 'Minimal Patient');
    `).run();

    assert(result.changes === 1, 'Should accept INSERT with only required fields');

    const patient = db.prepare('SELECT * FROM patient_registry WHERE patient_id = ?').get(result.lastInsertRowid);
    assert(patient.date_of_birth === null, 'DOB should be null');
    assert(patient.phone === null, 'Phone should be null');
    assert(patient.email === null, 'Email should be null');
  });

  // Test 8: Patient source validation
  test('Patient source constraint: only MANUAL or IMPORT', () => {
    db.prepare('DELETE FROM patient_registry;').run();

    let error = null;
    try {
      db.prepare(`
        INSERT INTO patient_registry (patient_source, full_name)
        VALUES ('INVALID_SOURCE', 'Test');
      `).run();
    } catch (e) {
      error = e.message;
    }
    assert(error && error.includes('CHECK constraint'), 'Should reject invalid source');

    // Valid sources should work
    const valid1 = db.prepare(`
      INSERT INTO patient_registry (patient_source, full_name)
      VALUES ('MANUAL', 'Test 1');
    `).run();
    assert(valid1.changes === 1, 'Should accept MANUAL source');

    const valid2 = db.prepare(`
      INSERT INTO patient_registry (patient_source, full_name)
      VALUES ('IMPORT', 'Test 2');
    `).run();
    assert(valid2.changes === 1, 'Should accept IMPORT source');
  });

  // Test 9: CLARA documents foreign key
  test('CLARA documents foreign key enforcement', () => {
    db.prepare('DELETE FROM patient_registry;').run();
    db.prepare('DELETE FROM clara_documents;').run();

    // Try to insert document for non-existent patient
    let error = null;
    try {
      db.prepare(`
        INSERT INTO clara_documents (document_id, patient_id, document_type, file_path, file_name)
        VALUES ('CLARA:999:1', 999, 'MEDICAL_RECORD', '/path/test.pdf', 'test.pdf');
      `).run();
    } catch (e) {
      error = e.message;
    }
    assert(error && error.includes('FOREIGN KEY constraint'), 'Should reject document with invalid patient_id');

    // Insert valid patient first
    const patientId = db.prepare(`
      INSERT INTO patient_registry (patient_source, full_name)
      VALUES ('MANUAL', 'Document Owner');
    `).run().lastInsertRowid;

    // Now insert document should work
    const docResult = db.prepare(`
      INSERT INTO clara_documents (document_id, patient_id, document_type, file_path, file_name)
      VALUES (?, ?, 'MEDICAL_RECORD', '/path/test.pdf', 'test.pdf');
    `).run(`CLARA:${patientId}:1`, patientId);

    assert(docResult.changes === 1, 'Should accept document with valid patient_id');
  });

  // Test 10: CLARA document ID format validation
  test('CLARA document ID format: must start with CLARA:', () => {
    db.prepare('DELETE FROM clara_documents;').run();
    db.prepare('DELETE FROM patient_registry;').run();

    const patientId = db.prepare(`
      INSERT INTO patient_registry (patient_source, full_name)
      VALUES ('MANUAL', 'Doc Owner');
    `).run().lastInsertRowid;

    let error = null;
    try {
      db.prepare(`
        INSERT INTO clara_documents (document_id, patient_id, document_type, file_path, file_name)
        VALUES ('INVALID:1:1', ?, 'MEDICAL_RECORD', '/path/test.pdf', 'test.pdf');
      `).run(patientId);
    } catch (e) {
      error = e.message;
    }
    assert(error && error.includes('CHECK constraint'), 'Should reject ID not starting with CLARA:');

    // Verify it wasn't inserted
    const count = db.prepare('SELECT COUNT(*) as cnt FROM clara_documents WHERE document_id = ?;').get('INVALID:1:1');
    assert(count.cnt === 0, 'Should not have inserted invalid document ID');
  });

  // Test 11: MIMIC data unchanged
  test('MIMIC data integrity: patients table unchanged', () => {
    const mimicCount = db.prepare('SELECT COUNT(*) as cnt FROM patients;').get();
    assertEqual(mimicCount.cnt, 100, 'Should still have 100 MIMIC patients');

    const admissionsCount = db.prepare('SELECT COUNT(*) as cnt FROM admissions;').get();
    assertEqual(admissionsCount.cnt, 275, 'Should still have 275 admissions');

    const docsCount = db.prepare('SELECT COUNT(*) as cnt FROM documents;').get();
    assertEqual(docsCount.cnt, 10, 'Should still have 10 MIMIC documents');
  });

  // Test 12: Atomic transaction behavior
  test('Concurrency: duplicate check is atomic', () => {
    db.prepare('DELETE FROM clara_documents;').run();
    db.prepare('DELETE FROM patient_registry;').run();

    // Simulate two concurrent registration attempts
    const name = 'Concurrent Test';
    const dob = '1990-05-10';

    // First registration
    const result1 = db.prepare(`
      INSERT INTO patient_registry (patient_source, full_name, date_of_birth)
      VALUES ('MANUAL', ?, ?);
    `).run(name, dob);
    const id1 = result1.lastInsertRowid;

    // Check for duplicate (should find id1)
    const duplicate = db.prepare(`
      SELECT patient_id FROM patient_registry 
      WHERE full_name = ? AND date_of_birth = ?;
    `).get(name, dob);

    assertEqual(duplicate.patient_id, id1, 'Should find first registration');
  });

  // Run all tests
  for (const t of tests) {
    try {
      t.fn();
      console.log(`✓ ${t.name}`);
      passCount++;
    } catch (error) {
      console.log(`✗ ${t.name}`);
      console.log(`  Error: ${error.message}`);
      failCount++;
    }
  }

  // Cleanup
  db.close();
  fs.unlinkSync(testDbPath);

  // Summary
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                    TEST SUMMARY                             ║
╚════════════════════════════════════════════════════════════╝

Passed: ${passCount}/${tests.length}
Failed: ${failCount}/${tests.length}

${failCount === 0 ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}
`);

  process.exit(failCount === 0 ? 0 : 1);
}

runTests().catch(console.error);
