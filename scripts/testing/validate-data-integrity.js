/**
 * Data Integrity Validation Tests
 * Phase 5: Comprehensive validation of loaded data
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class DataIntegrityValidator {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.results = {
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      issues: [],
      warnings: [],
      metrics: {}
    };
  }

  connect() {
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('foreign_keys = ON');
      console.log(`✓ Connected to database: ${this.dbPath}`);
      return true;
    } catch (e) {
      console.error(`✗ Connection failed: ${e.message}`);
      return false;
    }
  }

  /**
   * Test 1: Verify record counts
   */
  testRecordCounts() {
    console.log('\n[TEST 1] Record Counts');
    console.log('━'.repeat(50));

    const tables = [
      { name: 'patients', expected: 100 },
      { name: 'admissions', expected: 275 },
      { name: 'labevents', expected: 107727 },
      { name: 'prescriptions', expected: 18087 },
      { name: 'diagnoses_icd', expected: 4506 },
      { name: 'd_labitems', expected: 1622 },
      { name: 'd_icd_diagnoses', expected: 109775 },
      { name: 'd_items', expected: 4014 },
      { name: 'icustays', expected: 140 }
    ];

    for (const table of tables) {
      try {
        const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        const actual = result.count;
        const match = actual === table.expected;
        
        if (match) {
          console.log(`  ✓ ${table.name}: ${actual} records`);
          this.results.testsPassed++;
        } else {
          console.log(`  ✗ ${table.name}: Expected ${table.expected}, got ${actual}`);
          this.results.testsFailed++;
          this.results.issues.push(`${table.name} record count mismatch`);
        }
        this.results.testsRun++;
      } catch (e) {
        console.log(`  ✗ ${table.name}: ERROR - ${e.message}`);
        this.results.testsFailed++;
        this.results.testsRun++;
      }
    }
  }

  /**
   * Test 2: Verify primary keys are unique
   */
  testPrimaryKeyUniqueness() {
    console.log('\n[TEST 2] Primary Key Uniqueness');
    console.log('━'.repeat(50));

    const tables = [
      { name: 'patients', pk: 'subject_id' },
      { name: 'admissions', pk: 'hadm_id' },
      { name: 'labevents', pk: 'labevent_id' },
      { name: 'd_labitems', pk: 'itemid' },
      { name: 'd_icd_diagnoses', pk: ['icd_code', 'icd_version'] },
      { name: 'd_items', pk: 'itemid' },
      { name: 'icustays', pk: 'stay_id' }
    ];

    for (const table of tables) {
      try {
        const pk = Array.isArray(table.pk) ? table.pk.join(', ') : table.pk;
        const result = this.db.prepare(`
          SELECT COUNT(*) as total, COUNT(DISTINCT ${pk}) as unique
          FROM ${table.name}
        `).get();

        if (result.total === result.unique) {
          console.log(`  ✓ ${table.name}: All ${result.total} PKs are unique`);
          this.results.testsPassed++;
        } else {
          console.log(`  ✗ ${table.name}: ${result.total} records, ${result.unique} unique`);
          this.results.testsFailed++;
          this.results.issues.push(`${table.name} has duplicate primary keys`);
        }
        this.results.testsRun++;
      } catch (e) {
        console.log(`  ✗ ${table.name}: ERROR - ${e.message}`);
        this.results.testsFailed++;
        this.results.testsRun++;
      }
    }
  }

  /**
   * Test 3: Verify foreign key relationships
   */
  testForeignKeyIntegrity() {
    console.log('\n[TEST 3] Foreign Key Integrity');
    console.log('━'.repeat(50));

    const fkTests = [
      {
        table: 'admissions',
        column: 'subject_id',
        refTable: 'patients',
        refColumn: 'subject_id'
      },
      {
        table: 'prescriptions',
        column: 'subject_id',
        refTable: 'patients',
        refColumn: 'subject_id'
      },
      {
        table: 'labevents',
        column: 'subject_id',
        refTable: 'patients',
        refColumn: 'subject_id'
      },
      {
        table: 'diagnoses_icd',
        column: 'subject_id',
        refTable: 'patients',
        refColumn: 'subject_id'
      },
      {
        table: 'icustays',
        column: 'subject_id',
        refTable: 'patients',
        refColumn: 'subject_id'
      }
    ];

    for (const fk of fkTests) {
      try {
        const result = this.db.prepare(`
          SELECT COUNT(*) as orphaned
          FROM ${fk.table} t
          LEFT JOIN ${fk.refTable} r ON t.${fk.column} = r.${fk.refColumn}
          WHERE r.${fk.refColumn} IS NULL
        `).get();

        if (result.orphaned === 0) {
          console.log(`  ✓ ${fk.table}.${fk.column} → ${fk.refTable}.${fk.refColumn}`);
          this.results.testsPassed++;
        } else {
          console.log(`  ✗ ${fk.table}.${fk.column}: ${result.orphaned} orphaned records`);
          this.results.testsFailed++;
          this.results.issues.push(`${fk.table} has ${result.orphaned} orphaned records`);
        }
        this.results.testsRun++;
      } catch (e) {
        console.log(`  ✗ ${fk.table}.${fk.column}: ERROR - ${e.message}`);
        this.results.testsFailed++;
        this.results.testsRun++;
      }
    }
  }

  /**
   * Test 4: Verify no excessive NULL values
   */
  testNullValues() {
    console.log('\n[TEST 4] NULL Value Analysis');
    console.log('━'.repeat(50));

    const tables = [
      { name: 'patients', columns: ['subject_id', 'gender', 'anchor_age'] },
      { name: 'admissions', columns: ['hadm_id', 'subject_id', 'admission_type'] },
      { name: 'prescriptions', columns: ['subject_id', 'drug'] },
      { name: 'labevents', columns: ['subject_id', 'charttime'] }
    ];

    for (const table of tables) {
      for (const column of table.columns) {
        try {
          const total = this.db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get().count;
          const nulls = this.db.prepare(`
            SELECT COUNT(*) as count FROM ${table.name} WHERE ${column} IS NULL
          `).get().count;
          
          const nullPct = (nulls / total * 100).toFixed(2);
          const warning = nullPct > 50 ? ' ⚠ HIGH' : '';

          if (nullPct > 50) {
            console.log(`  ⚠ ${table.name}.${column}: ${nullPct}% NULL${warning}`);
            this.results.warnings.push(`High NULL percentage in ${table.name}.${column}`);
          } else {
            console.log(`  ✓ ${table.name}.${column}: ${nullPct}% NULL`);
          }
          this.results.testsPassed++;
          this.results.testsRun++;
        } catch (e) {
          console.log(`  ✗ ${table.name}.${column}: ERROR - ${e.message}`);
          this.results.testsFailed++;
          this.results.testsRun++;
        }
      }
    }
  }

  /**
   * Test 5: Verify data type consistency
   */
  testDataTypeConsistency() {
    console.log('\n[TEST 5] Data Type Consistency');
    console.log('━'.repeat(50));

    const tests = [
      {
        sql: 'SELECT COUNT(*) as count FROM patients WHERE typeof(subject_id) != "integer"',
        name: 'patients.subject_id should be INTEGER'
      },
      {
        sql: 'SELECT COUNT(*) as count FROM admissions WHERE typeof(hadm_id) != "integer"',
        name: 'admissions.hadm_id should be INTEGER'
      },
      {
        sql: 'SELECT COUNT(*) as count FROM labevents WHERE valuenum IS NOT NULL AND typeof(valuenum) NOT IN ("real", "integer")',
        name: 'labevents.valuenum should be REAL/INTEGER'
      },
      {
        sql: 'SELECT COUNT(*) as count FROM prescriptions WHERE typeof(drug) != "text"',
        name: 'prescriptions.drug should be TEXT'
      }
    ];

    for (const test of tests) {
      try {
        const result = this.db.prepare(test.sql).get();
        if (result.count === 0) {
          console.log(`  ✓ ${test.name}`);
          this.results.testsPassed++;
        } else {
          console.log(`  ✗ ${test.name}: ${result.count} violations`);
          this.results.testsFailed++;
          this.results.issues.push(test.name);
        }
        this.results.testsRun++;
      } catch (e) {
        console.log(`  ✗ ${test.name}: ERROR - ${e.message}`);
        this.results.testsFailed++;
        this.results.testsRun++;
      }
    }
  }

  /**
   * Test 6: Verify temporal data consistency
   */
  testTemporalConsistency() {
    console.log('\n[TEST 6] Temporal Data Consistency');
    console.log('━'.repeat(50));

    const tests = [
      {
        sql: `SELECT COUNT(*) as count FROM admissions 
              WHERE dischtime IS NOT NULL AND admittime > dischtime`,
        name: 'admissions: dischtime should be >= admittime'
      },
      {
        sql: `SELECT COUNT(*) as count FROM prescriptions 
              WHERE stoptime IS NOT NULL AND starttime > stoptime`,
        name: 'prescriptions: stoptime should be >= starttime'
      },
      {
        sql: `SELECT COUNT(*) as count FROM icustays 
              WHERE outtime IS NOT NULL AND intime > outtime`,
        name: 'icustays: outtime should be >= intime'
      }
    ];

    for (const test of tests) {
      try {
        const result = this.db.prepare(test.sql).get();
        if (result.count === 0) {
          console.log(`  ✓ ${test.name}`);
          this.results.testsPassed++;
        } else {
          console.log(`  ✗ ${test.name}: ${result.count} violations`);
          this.results.testsFailed++;
          this.results.issues.push(test.name);
        }
        this.results.testsRun++;
      } catch (e) {
        console.log(`  ✗ ${test.name}: ERROR - ${e.message}`);
        this.results.testsFailed++;
        this.results.testsRun++;
      }
    }
  }

  /**
   * Test 7: Verify sample queries work correctly
   */
  testSampleQueries() {
    console.log('\n[TEST 7] Sample Query Execution');
    console.log('━'.repeat(50));

    const queries = [
      {
        sql: 'SELECT * FROM patients WHERE subject_id = 10014729 LIMIT 1',
        name: 'Get single patient'
      },
      {
        sql: 'SELECT a.*, COUNT(DISTINCT l.labevent_id) as lab_count FROM admissions a LEFT JOIN labevents l ON a.hadm_id = l.hadm_id WHERE a.subject_id = 10014729 GROUP BY a.hadm_id',
        name: 'Patient admissions with lab count'
      },
      {
        sql: 'SELECT l.*, d.label FROM labevents l JOIN d_labitems d ON l.itemid = d.itemid WHERE l.subject_id = 10014729 LIMIT 10',
        name: 'Patient labs with descriptions'
      },
      {
        sql: 'SELECT * FROM prescriptions WHERE subject_id = 10014729 AND stoptime IS NULL',
        name: 'Active prescriptions'
      },
      {
        sql: 'SELECT di.*, dd.long_title FROM diagnoses_icd di LEFT JOIN d_icd_diagnoses dd ON di.icd_code = dd.icd_code WHERE di.subject_id = 10014729',
        name: 'Patient diagnoses with descriptions'
      }
    ];

    for (const query of queries) {
      try {
        const result = this.db.prepare(query.sql).all();
        console.log(`  ✓ ${query.name}: ${result.length} records`);
        this.results.testsPassed++;
        this.results.testsRun++;
      } catch (e) {
        console.log(`  ✗ ${query.name}: ${e.message}`);
        this.results.testsFailed++;
        this.results.testsRun++;
      }
    }
  }

  /**
   * Test 8: Generate performance baseline
   */
  testPerformanceBaseline() {
    console.log('\n[TEST 8] Performance Baseline');
    console.log('━'.repeat(50));

    const queries = [
      { sql: 'SELECT * FROM patients', name: 'Full table scan: patients' },
      { sql: 'SELECT * FROM admissions WHERE subject_id = 10014729', name: 'Indexed query: admissions by subject_id' },
      { sql: 'SELECT * FROM labevents WHERE subject_id = 10014729 AND charttime > datetime("2125-01-01")', name: 'Composite query: labs by subject and date' },
      { sql: 'SELECT COUNT(*) FROM labevents', name: 'Aggregate: labevents count' },
      { sql: 'SELECT l.*, d.label FROM labevents l JOIN d_labitems d ON l.itemid = d.itemid WHERE l.subject_id = 10014729 LIMIT 100', name: 'Join query: labs with descriptions' }
    ];

    this.results.metrics.queryPerformance = {};

    for (const query of queries) {
      try {
        const start = Date.now();
        const result = this.db.prepare(query.sql).all();
        const duration = Date.now() - start;

        console.log(`  ✓ ${query.name}: ${duration}ms (${result.length} rows)`);
        this.results.metrics.queryPerformance[query.name] = {
          durationMs: duration,
          rowCount: result.length
        };
        this.results.testsPassed++;
        this.results.testsRun++;
      } catch (e) {
        console.log(`  ✗ ${query.name}: ${e.message}`);
        this.results.testsFailed++;
        this.results.testsRun++;
      }
    }
  }

  /**
   * Run all tests
   */
  runAllTests() {
    console.log('\n' + '='.repeat(70));
    console.log('PHASE 5: DATA INTEGRITY VALIDATION');
    console.log('='.repeat(70));

    this.testRecordCounts();
    this.testPrimaryKeyUniqueness();
    this.testForeignKeyIntegrity();
    this.testNullValues();
    this.testDataTypeConsistency();
    this.testTemporalConsistency();
    this.testSampleQueries();
    this.testPerformanceBaseline();

    return this.generateReport();
  }

  /**
   * Generate validation report
   */
  generateReport() {
    const passRate = ((this.results.testsPassed / this.results.testsRun) * 100).toFixed(1);

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        testsRun: this.results.testsRun,
        testsPassed: this.results.testsPassed,
        testsFailed: this.results.testsFailed,
        passRate: parseFloat(passRate) + '%'
      },
      issues: this.results.issues,
      warnings: this.results.warnings,
      metrics: this.results.metrics
    };

    console.log('\n' + '='.repeat(70));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Tests run: ${report.summary.testsRun}`);
    console.log(`Tests passed: ${report.summary.testsPassed}`);
    console.log(`Tests failed: ${report.summary.testsFailed}`);
    console.log(`Pass rate: ${report.summary.passRate}`);

    if (this.results.issues.length > 0) {
      console.log(`\nIssues found: ${this.results.issues.length}`);
      this.results.issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('\n✓ No data integrity issues found');
    }

    if (this.results.warnings.length > 0) {
      console.log(`\nWarnings: ${this.results.warnings.length}`);
      this.results.warnings.forEach(warn => console.log(`  - ${warn}`));
    }

    return report;
  }

  close() {
    if (this.db) this.db.close();
  }
}

module.exports = DataIntegrityValidator;

// Main execution
if (require.main === module) {
  const dbPath = path.join(__dirname, '../../clara.db');
  const validator = new DataIntegrityValidator(dbPath);

  if (!validator.connect()) {
    process.exit(1);
  }

  const report = validator.runAllTests();
  
  // Save report
  const reportPath = path.join(__dirname, '../../PHASE_5_DATA_VALIDATION_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n✓ Validation report saved: ${reportPath}`);

  validator.close();
  process.exit(report.summary.testsFailed > 0 ? 1 : 0);
}
