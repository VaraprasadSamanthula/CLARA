/**
 * Deduplication Script for CLARA Database
 * Removes duplicate records from prescriptions and diagnoses_icd tables
 * 
 * Context:
 * - Prescriptions were loaded twice: 18,087 × 2 = 36,174
 * - Diagnoses were loaded twice: 4,506 × 2 = 9,012
 * 
 * Strategy:
 * 1. Use ROW_NUMBER() to identify duplicates
 * 2. Keep the first occurrence of each unique record
 * 3. Delete all rows with ROW_NUMBER > 1
 * 4. Verify results with integrity checks
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DeduplicationManager {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.stats = {
      prescriptionsDuplicatesFound: 0,
      prescriptionsDuplicatesRemoved: 0,
      diagnosesDuplicatesFound: 0,
      diagnosesDuplicatesRemoved: 0,
      startTime: null,
      endTime: null
    };
  }

  connect() {
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      console.log(`✓ Connected to database: ${this.dbPath}`);
      return true;
    } catch (e) {
      console.error(`✗ Connection failed: ${e.message}`);
      return false;
    }
  }

  /**
   * Verify database integrity before deduplication
   */
  verifyBefore() {
    console.log('\n[VERIFICATION BEFORE]');
    
    try {
      const integrityResult = this.db.prepare('PRAGMA integrity_check;').all();
      console.log(`Integrity Check: ${integrityResult[0].integrity_check}`);

      const prescriptionCount = this.db.prepare('SELECT COUNT(*) as count FROM prescriptions;').get();
      console.log(`Prescriptions before: ${prescriptionCount.count}`);

      const diagnosesCount = this.db.prepare('SELECT COUNT(*) as count FROM diagnoses_icd;').get();
      console.log(`Diagnoses before: ${diagnosesCount.count}`);

      // Count unique combinations
      const uniqueRx = this.db.prepare(`
        SELECT COUNT(DISTINCT subject_id || '|' || hadm_id || '|' || drug || '|' || starttime) as unique_count
        FROM prescriptions;
      `).get();
      console.log(`Unique prescriptions: ${uniqueRx.unique_count}`);

      const uniqueDiag = this.db.prepare(`
        SELECT COUNT(DISTINCT subject_id || '|' || hadm_id || '|' || icd_code) as unique_count
        FROM diagnoses_icd;
      `).get();
      console.log(`Unique diagnoses: ${uniqueDiag.unique_count}`);

      // Check for rowid duplicates
      const rxRowidCheck = this.db.prepare(`
        SELECT subject_id, hadm_id, drug, starttime, COUNT(*) as duplicate_count
        FROM prescriptions
        GROUP BY subject_id, hadm_id, drug, starttime
        HAVING COUNT(*) > 1;
      `).all();
      console.log(`Prescription groups with duplicates: ${rxRowidCheck.length}`);
      this.stats.prescriptionsDuplicatesFound = rxRowidCheck.length;

      const diagRowidCheck = this.db.prepare(`
        SELECT subject_id, hadm_id, icd_code, COUNT(*) as duplicate_count
        FROM diagnoses_icd
        GROUP BY subject_id, hadm_id, icd_code
        HAVING COUNT(*) > 1;
      `).all();
      console.log(`Diagnosis groups with duplicates: ${diagRowidCheck.length}`);
      this.stats.diagnosesDuplicatesFound = diagRowidCheck.length;

      return true;
    } catch (e) {
      console.error(`✗ Verification failed: ${e.message}`);
      return false;
    }
  }

  /**
   * Remove duplicate prescriptions
   * Keeps first occurrence, removes rest
   */
  removePrescritionDuplicates() {
    console.log('\n[REMOVING PRESCRIPTION DUPLICATES]');
    
    try {
      const transaction = this.db.transaction(() => {
        // Step 1: Identify duplicates
        const duplicateIds = this.db.prepare(`
          WITH ranked_rx AS (
            SELECT 
              rowid,
              ROW_NUMBER() OVER (PARTITION BY subject_id, hadm_id, drug, starttime ORDER BY rowid) as rn
            FROM prescriptions
          )
          SELECT rowid FROM ranked_rx WHERE rn > 1;
        `).all();

        console.log(`Found ${duplicateIds.length} duplicate prescription records to delete`);

        // Step 2: Delete duplicates
        if (duplicateIds.length > 0) {
          const deleteStmt = this.db.prepare('DELETE FROM prescriptions WHERE rowid = ?;');
          
          let deletedCount = 0;
          for (const row of duplicateIds) {
            deleteStmt.run(row.rowid);
            deletedCount++;
            if (deletedCount % 1000 === 0) {
              console.log(`  Deleted ${deletedCount} prescription duplicates...`);
            }
          }
          
          this.stats.prescriptionsDuplicatesRemoved = deletedCount;
          console.log(`✓ Deleted ${deletedCount} prescription duplicate records`);
        }
      });

      transaction();
      return true;
    } catch (e) {
      console.error(`✗ Prescription deduplication failed: ${e.message}`);
      console.error(e.stack);
      return false;
    }
  }

  /**
   * Remove duplicate diagnoses
   * Keeps first occurrence, removes rest
   */
  removeDiagnosesDuplicates() {
    console.log('\n[REMOVING DIAGNOSES DUPLICATES]');
    
    try {
      const transaction = this.db.transaction(() => {
        // Step 1: Identify duplicates
        const duplicateIds = this.db.prepare(`
          WITH ranked_diag AS (
            SELECT 
              rowid,
              ROW_NUMBER() OVER (PARTITION BY subject_id, hadm_id, icd_code ORDER BY rowid) as rn
            FROM diagnoses_icd
          )
          SELECT rowid FROM ranked_diag WHERE rn > 1;
        `).all();

        console.log(`Found ${duplicateIds.length} duplicate diagnoses records to delete`);

        // Step 2: Delete duplicates
        if (duplicateIds.length > 0) {
          const deleteStmt = this.db.prepare('DELETE FROM diagnoses_icd WHERE rowid = ?;');
          
          let deletedCount = 0;
          for (const row of duplicateIds) {
            deleteStmt.run(row.rowid);
            deletedCount++;
            if (deletedCount % 100 === 0) {
              console.log(`  Deleted ${deletedCount} diagnoses duplicates...`);
            }
          }
          
          this.stats.diagnosesDuplicatesRemoved = deletedCount;
          console.log(`✓ Deleted ${deletedCount} diagnoses duplicate records`);
        }
      });

      transaction();
      return true;
    } catch (e) {
      console.error(`✗ Diagnoses deduplication failed: ${e.message}`);
      console.error(e.stack);
      return false;
    }
  }

  /**
   * Verify results after deduplication
   */
  verifyAfter() {
    console.log('\n[VERIFICATION AFTER]');
    
    try {
      const integrityResult = this.db.prepare('PRAGMA integrity_check;').all();
      console.log(`Integrity Check: ${integrityResult[0].integrity_check}`);

      const fkResult = this.db.prepare('PRAGMA foreign_key_check;').all();
      console.log(`Foreign Key Check: ${fkResult.length === 0 ? 'OK' : fkResult.length + ' violations'}`);

      const prescriptionCount = this.db.prepare('SELECT COUNT(*) as count FROM prescriptions;').get();
      console.log(`Prescriptions after: ${prescriptionCount.count}`);

      const diagnosesCount = this.db.prepare('SELECT COUNT(*) as count FROM diagnoses_icd;').get();
      console.log(`Diagnoses after: ${diagnosesCount.count}`);

      // Count unique combinations (should match total)
      const uniqueRx = this.db.prepare(`
        SELECT COUNT(DISTINCT subject_id || '|' || hadm_id || '|' || drug || '|' || starttime) as unique_count
        FROM prescriptions;
      `).get();
      console.log(`Unique prescriptions: ${uniqueRx.unique_count}`);

      const uniqueDiag = this.db.prepare(`
        SELECT COUNT(DISTINCT subject_id || '|' || hadm_id || '|' || icd_code) as unique_count
        FROM diagnoses_icd;
      `).get();
      console.log(`Unique diagnoses: ${uniqueDiag.unique_count}`);

      // Verify no duplicates remain
      const remainingRxDups = this.db.prepare(`
        SELECT COUNT(*) as dup_count
        FROM (
          SELECT subject_id, hadm_id, drug, starttime, COUNT(*) as cnt
          FROM prescriptions
          GROUP BY subject_id, hadm_id, drug, starttime
          HAVING COUNT(*) > 1
        );
      `).get();
      console.log(`Remaining prescription duplicates: ${remainingRxDups.dup_count}`);

      const remainingDiagDups = this.db.prepare(`
        SELECT COUNT(*) as dup_count
        FROM (
          SELECT subject_id, hadm_id, icd_code, COUNT(*) as cnt
          FROM diagnoses_icd
          GROUP BY subject_id, hadm_id, icd_code
          HAVING COUNT(*) > 1
        );
      `).get();
      console.log(`Remaining diagnoses duplicates: ${remainingDiagDups.dup_count}`);

      return true;
    } catch (e) {
      console.error(`✗ Verification after failed: ${e.message}`);
      return false;
    }
  }

  /**
   * Run complete deduplication process
   */
  run() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║         CLARA DATABASE DEDUPLICATION PROCESS                  ║');
    console.log('║  Removing duplicate prescriptions and diagnoses records         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    this.stats.startTime = Date.now();

    if (!this.connect()) return false;

    if (!this.verifyBefore()) return false;

    if (!this.removePrescritionDuplicates()) return false;

    if (!this.removeDiagnosesDuplicates()) return false;

    if (!this.verifyAfter()) return false;

    this.stats.endTime = Date.now();
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    DEDUPLICATION COMPLETE                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log(`  Prescriptions duplicates removed: ${this.stats.prescriptionsDuplicatesRemoved}`);
    console.log(`  Diagnoses duplicates removed: ${this.stats.diagnosesDuplicatesRemoved}`);
    console.log(`  Total duplicates removed: ${this.stats.prescriptionsDuplicatesRemoved + this.stats.diagnosesDuplicatesRemoved}`);
    console.log(`  Duration: ${duration.toFixed(2)} seconds\n`);

    this.db.close();
    return true;
  }
}

// Main execution
const dbPath = process.argv[2] || path.join(__dirname, '../../clara.db');
console.log(`Database path: ${dbPath}\n`);

if (!fs.existsSync(dbPath)) {
  console.error(`✗ Database file not found: ${dbPath}`);
  process.exit(1);
}

const manager = new DeduplicationManager(dbPath);
const success = manager.run();

process.exit(success ? 0 : 1);
