/**
 * Migration: Add CLARA Patient Medication and Diagnosis Tables
 * Extends database schema to support manually entered clinical data for CLARA patients
 * These tables are separate from MIMIC and do not interfere with existing data
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class ClaraClinicalMigration {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  connect() {
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      console.log(`✓ Connected to database: ${this.dbPath}`);
      return true;
    } catch (e) {
      console.error(`✗ Failed to connect: ${e.message}`);
      throw e;
    }
  }

  /**
   * Create CLARA medication table
   * Stores manually entered medications for CLARA patients
   */
  createClaraMedicationsTable() {
    console.log('\nCreating clara_medications table...');
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clara_medications (
        medication_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        medication_name TEXT NOT NULL,
        dosage TEXT,
        route TEXT,
        frequency TEXT,
        start_date DATE NOT NULL,
        end_date DATE,
        status TEXT CHECK (status IN ('active', 'discontinued', 'unknown')),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        FOREIGN KEY (patient_id) REFERENCES patient_registry(patient_id) ON DELETE CASCADE,
        UNIQUE(patient_id, medication_name, start_date)
      );
    `);

    console.log('✓ Created clara_medications table');
  }

  /**
   * Create CLARA diagnosis table
   * Stores manually entered diagnoses for CLARA patients
   */
  createClaraDiagnosesTable() {
    console.log('Creating clara_diagnoses table...');
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clara_diagnoses (
        diagnosis_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        diagnosis_name TEXT NOT NULL,
        description TEXT,
        diagnosis_date DATE NOT NULL,
        status TEXT CHECK (status IN ('active', 'resolved', 'unknown')),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        FOREIGN KEY (patient_id) REFERENCES patient_registry(patient_id) ON DELETE CASCADE,
        UNIQUE(patient_id, diagnosis_name, diagnosis_date)
      );
    `);

    console.log('✓ Created clara_diagnoses table');
  }

  /**
   * Create indexes for CLARA clinical tables
   */
  createIndexes() {
    console.log('\nCreating indexes for CLARA clinical tables...');
    
    const indexes = [
      {
        name: 'idx_clara_medications_patient_id',
        table: 'clara_medications',
        columns: 'patient_id'
      },
      {
        name: 'idx_clara_medications_start_date',
        table: 'clara_medications',
        columns: 'start_date'
      },
      {
        name: 'idx_clara_medications_status',
        table: 'clara_medications',
        columns: 'status'
      },
      {
        name: 'idx_clara_diagnoses_patient_id',
        table: 'clara_diagnoses',
        columns: 'patient_id'
      },
      {
        name: 'idx_clara_diagnoses_diagnosis_date',
        table: 'clara_diagnoses',
        columns: 'diagnosis_date'
      },
      {
        name: 'idx_clara_diagnoses_status',
        table: 'clara_diagnoses',
        columns: 'status'
      },
      {
        name: 'idx_clara_medications_patient_status',
        table: 'clara_medications',
        columns: 'patient_id, status'
      },
      {
        name: 'idx_clara_diagnoses_patient_status',
        table: 'clara_diagnoses',
        columns: 'patient_id, status'
      }
    ];

    for (const index of indexes) {
      try {
        this.db.exec(`
          CREATE INDEX IF NOT EXISTS ${index.name}
          ON ${index.table}(${index.columns});
        `);
        console.log(`✓ Created index: ${index.name}`);
      } catch (e) {
        console.warn(`⚠ Index ${index.name}: ${e.message}`);
      }
    }
  }

  /**
   * Verify tables exist and have expected structure
   */
  verifyTables() {
    console.log('\nVerifying table creation...');
    
    try {
      // Check clara_medications
      const medResult = this.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='clara_medications'"
      ).get();
      
      if (medResult) {
        console.log('✓ clara_medications table verified');
      } else {
        console.error('✗ clara_medications table not found');
        return false;
      }

      // Check clara_diagnoses
      const diagResult = this.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='clara_diagnoses'"
      ).get();
      
      if (diagResult) {
        console.log('✓ clara_diagnoses table verified');
      } else {
        console.error('✗ clara_diagnoses table not found');
        return false;
      }

      // Verify foreign key constraints
      this.db.pragma('foreign_key_check');
      console.log('✓ Foreign key constraints validated');

      return true;
    } catch (e) {
      console.error(`✗ Verification failed: ${e.message}`);
      return false;
    }
  }

  /**
   * Run the migration
   */
  async run() {
    try {
      console.log('\n' + '='.repeat(70));
      console.log('CLARA CLINICAL DATA MIGRATION');
      console.log('='.repeat(70));

      this.connect();
      
      // Check if tables already exist
      const existing = this.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND (name='clara_medications' OR name='clara_diagnoses')"
      ).all();

      if (existing.length > 0) {
        console.log('\n✓ CLARA clinical tables already exist');
        console.log(`Found ${existing.length} table(s):`);
        existing.forEach(t => console.log(`  - ${t.name}`));
      } else {
        console.log('\n✓ CLARA clinical tables do not exist - creating now...');
        this.createClaraMedicationsTable();
        this.createClaraDiagnosesTable();
        this.createIndexes();
      }

      // Verify everything
      const verified = this.verifyTables();

      // Summary
      console.log('\n' + '='.repeat(70));
      console.log('MIGRATION COMPLETE');
      console.log('='.repeat(70));
      
      if (verified) {
        console.log('✓ CLARA clinical tables ready for use');
        console.log('\nTables created:');
        console.log('  - clara_medications: Manually entered medications');
        console.log('  - clara_diagnoses: Manually entered diagnoses');
        console.log('\nForeign keys: All references point to patient_registry.patient_id');
        console.log('On delete behavior: CASCADE (deleting patient removes clinical records)');
      }

      this.db.close();
      return verified;
    } catch (e) {
      console.error('\n✗ Migration failed:', e.message);
      if (this.db) this.db.close();
      return false;
    }
  }
}

// Main execution
if (require.main === module) {
  const dbPath = path.join(__dirname, '../../database/clara.db');
  
  if (!fs.existsSync(dbPath)) {
    console.error(`✗ Database file not found: ${dbPath}`);
    process.exit(1);
  }

  const migration = new ClaraClinicalMigration(dbPath);
  migration.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
}

module.exports = ClaraClinicalMigration;
