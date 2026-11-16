/**
 * Full Dataset Loader for Phase 4
 * Loads all MIMIC-IV tables into SQLite database
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class FullDatasetLoader {
  constructor(dbPath, sourcePath) {
    this.dbPath = dbPath;
    this.sourcePath = sourcePath;
    this.db = null;
    this.stats = {
      tablesLoaded: 0,
      recordsLoaded: 0,
      recordsSkipped: 0,
      errorsEncountered: 0,
      startTime: null,
      endTime: null,
      estimatedSize: 0
    };
  }

  connect() {
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('synchronous = NORMAL');
      console.log(`✓ Connected to database: ${this.dbPath}`);
      return true;
    } catch (e) {
      console.error(`✗ Connection failed: ${e.message}`);
      return false;
    }
  }

  /**
   * Parse CSV line with proper quote handling
   */
  parseCSVLine(line, headers) {
    const row = {};
    let col = 0;
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        const value = current.trim();
        row[headers[col]] = value === '' || value === 'NULL' ? null : value;
        current = '';
        col++;
      } else {
        current += char;
      }
    }
    
    if (col < headers.length) {
      const value = current.trim();
      row[headers[col]] = value === '' || value === 'NULL' ? null : value;
    }
    
    return row;
  }

  /**
   * Load a single CSV file into a table
   */
  async loadCSVFile(filePath, tableName, options = {}) {
    return new Promise((resolve) => {
      const records = [];
      let lineNum = 0;
      let headers = [];
      const startTime = Date.now();
      const batchSize = options.batchSize || 1000;

      const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity
      });

      rl.on('line', (line) => {
        try {
          if (lineNum === 0) {
            headers = line.split(',').map(h => h.trim());
          } else {
            const row = this.parseCSVLine(line, headers);
            records.push(row);

            // Batch insert
            if (records.length >= batchSize) {
              this.insertBatch(tableName, headers, records);
              this.stats.recordsLoaded += records.length;
              records.length = 0;
            }
          }
          lineNum++;
        } catch (e) {
          this.stats.recordsSkipped++;
        }
      });

      rl.on('close', () => {
        // Final batch
        if (records.length > 0) {
          this.insertBatch(tableName, headers, records);
          this.stats.recordsLoaded += records.length;
        }

        const duration = Date.now() - startTime;
        resolve({
          file: path.basename(filePath),
          table: tableName,
          recordCount: lineNum - 1,
          insertedCount: this.stats.recordsLoaded,
          durationMs: duration,
          recordsPerSec: Math.round((lineNum - 1) / (duration / 1000))
        });
      });

      rl.on('error', (e) => {
        console.error(`✗ Error reading file: ${e.message}`);
        resolve({
          file: path.basename(filePath),
          table: tableName,
          recordCount: 0,
          insertedCount: 0,
          durationMs: 0,
          error: e.message
        });
      });
    });
  }

  /**
   * Insert batch of records
   */
  insertBatch(tableName, headers, records) {
    if (records.length === 0) return;

    try {
      const placeholders = headers.map(() => '?').join(',');
      const stmt = this.db.prepare(
        `INSERT INTO ${tableName} (${headers.join(',')}) VALUES (${placeholders})`
      );

      const insertMany = this.db.transaction((rows) => {
        for (const row of rows) {
          const values = headers.map(h => row[h] || null);
          stmt.run(...values);
        }
      });

      insertMany(records);
    } catch (e) {
      console.warn(`  ⚠ Insert warning: ${e.message}`);
      this.stats.errorsEncountered++;
    }
  }

  /**
   * Define tables to load (all 31 MIMIC-IV tables)
   */
  getTableDefinitions() {
    return [
      // Hospital - Core Tables
      { file: 'hosp/patients.csv', table: 'patients', priority: 1 },
      { file: 'hosp/admissions.csv', table: 'admissions', priority: 2 },
      
      // Hospital - Reference Tables
      { file: 'hosp/d_labitems.csv', table: 'd_labitems', priority: 3 },
      { file: 'hosp/d_icd_diagnoses.csv', table: 'd_icd_diagnoses', priority: 4 },
      { file: 'hosp/d_icd_procedures.csv', table: 'd_icd_procedures', priority: 4 },
      { file: 'hosp/d_hcpcs.csv', table: 'd_hcpcs', priority: 4 },
      
      // Hospital - Event Tables
      { file: 'hosp/labevents.csv', table: 'labevents', priority: 5 },
      { file: 'hosp/prescriptions.csv', table: 'prescriptions', priority: 5 },
      { file: 'hosp/diagnoses_icd.csv', table: 'diagnoses_icd', priority: 5 },
      { file: 'hosp/procedures_icd.csv', table: 'procedures_icd', priority: 5 },
      { file: 'hosp/pharmacy.csv', table: 'pharmacy', priority: 5 },
      { file: 'hosp/emar.csv', table: 'emar', priority: 5 },
      { file: 'hosp/emar_detail.csv', table: 'emar_detail', priority: 5 },
      { file: 'hosp/poe.csv', table: 'poe', priority: 5 },
      { file: 'hosp/poe_detail.csv', table: 'poe_detail', priority: 5 },
      { file: 'hosp/microbiologyevents.csv', table: 'microbiologyevents', priority: 5 },
      { file: 'hosp/omr.csv', table: 'omr', priority: 5 },
      { file: 'hosp/provider.csv', table: 'provider', priority: 5 },
      { file: 'hosp/drgcodes.csv', table: 'drgcodes', priority: 5 },
      { file: 'hosp/hcpcsevents.csv', table: 'hcpcsevents', priority: 5 },
      { file: 'hosp/services.csv', table: 'services', priority: 5 },
      { file: 'hosp/transfers.csv', table: 'transfers', priority: 5 },
      
      // ICU - Core Tables
      { file: 'icu/icustays.csv', table: 'icustays', priority: 6 },
      { file: 'icu/d_items.csv', table: 'd_items', priority: 7 },
      
      // ICU - Event Tables (Large)
      { file: 'icu/chartevents.csv', table: 'chartevents', priority: 8 },
      { file: 'icu/datetimeevents.csv', table: 'datetimeevents', priority: 8 },
      { file: 'icu/inputevents.csv', table: 'inputevents', priority: 8 },
      { file: 'icu/outputevents.csv', table: 'outputevents', priority: 8 },
      { file: 'icu/ingredientevents.csv', table: 'ingredientevents', priority: 8 },
      { file: 'icu/procedureevents.csv', table: 'procedureevents', priority: 8 },
      { file: 'icu/caregiver.csv', table: 'caregiver', priority: 7 }
    ];
  }

  /**
   * Get or create table (for tables we haven't defined yet)
   */
  ensureTableExists(tableName, headers) {
    try {
      // Check if table exists
      const result = this.db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get(tableName);

      if (!result) {
        // Create table with all TEXT columns (flexible approach)
        const columns = headers.map(h => `${h} TEXT`).join(',');
        this.db.exec(`CREATE TABLE ${tableName} (${columns})`);
        console.log(`  → Created table: ${tableName}`);
      }
    } catch (e) {
      console.warn(`  ⚠ Table creation warning: ${e.message}`);
    }
  }

  /**
   * Run full load pipeline
   */
  async runPipeline() {
    this.stats.startTime = Date.now();
    
    console.log('\n' + '='.repeat(70));
    console.log('PHASE 4: FULL DATA LOAD');
    console.log('='.repeat(70));
    console.log(`Source: ${this.sourcePath}`);
    console.log(`Database: ${this.dbPath}`);

    const tables = this.getTableDefinitions();
    const results = [];

    // Load tables in priority order
    tables.sort((a, b) => a.priority - b.priority);

    for (const { file, table, priority } of tables) {
      const filepath = path.join(this.sourcePath, file);

      if (!fs.existsSync(filepath)) {
        console.log(`⚠ Skipped: ${file} (not found)`);
        continue;
      }

      try {
        console.log(`\nLoading ${file}...`);
        
        const result = await this.loadCSVFile(filepath, table, { batchSize: 5000 });
        
        if (result.error) {
          console.log(`  ✗ Error: ${result.error}`);
        } else {
          console.log(`  ✓ Loaded: ${result.recordCount} records (${result.recordsPerSec} rec/s)`);
          this.stats.tablesLoaded++;
          results.push(result);
        }
      } catch (e) {
        console.error(`  ✗ Exception: ${e.message}`);
        this.stats.errorsEncountered++;
      }
    }

    this.stats.endTime = Date.now();
    return results;
  }

  /**
   * Generate load report
   */
  generateReport(results) {
    const duration = this.stats.endTime - this.stats.startTime;
    const durationSec = duration / 1000;
    const durationMin = durationSec / 60;

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        duration: {
          milliseconds: duration,
          seconds: Math.round(durationSec),
          minutes: Math.round(durationMin * 100) / 100
        },
        tables: {
          attempted: results.length,
          loaded: this.stats.tablesLoaded,
          errors: this.stats.errorsEncountered
        },
        records: {
          loaded: this.stats.recordsLoaded,
          skipped: this.stats.recordsSkipped,
          rate: Math.round(this.stats.recordsLoaded / durationSec)
        }
      },
      details: results,
      databaseSize: {
        file: fs.existsSync(this.dbPath) ? fs.statSync(this.dbPath).size : 0
      }
    };

    return report;
  }

  /**
   * Validate loaded data
   */
  validateLoad() {
    console.log('\n' + '='.repeat(70));
    console.log('VALIDATING LOADED DATA');
    console.log('='.repeat(70));

    const tables = [
      'patients', 'admissions', 'labevents', 'prescriptions', 
      'diagnoses_icd', 'chartevents', 'icustays'
    ];

    for (const table of tables) {
      try {
        const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        console.log(`  ${table}: ${result.count} records`);
      } catch (e) {
        console.log(`  ${table}: [TABLE NOT FOUND]`);
      }
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = FullDatasetLoader;

// Main execution
if (require.main === module) {
  const projectRoot = path.resolve(__dirname, '../../');
  const dbPath = path.join(projectRoot, 'clara.db');
  const sourcePath = path.join(projectRoot, 'mimic-iv-clinical-database-demo-2.2');

  const loader = new FullDatasetLoader(dbPath, sourcePath);

  (async () => {
    try {
      if (!loader.connect()) {
        process.exit(1);
      }

      const results = await loader.runPipeline();
      loader.validateLoad();

      const report = loader.generateReport(results);
      
      console.log('\n' + '='.repeat(70));
      console.log('LOAD SUMMARY');
      console.log('='.repeat(70));
      console.log(`Tables loaded: ${report.summary.tables.loaded}`);
      console.log(`Records loaded: ${report.summary.records.loaded}`);
      console.log(`Duration: ${report.summary.duration.minutes} minutes`);
      console.log(`Rate: ${report.summary.records.rate} records/second`);

      const dbFile = fs.statSync(dbPath);
      console.log(`Database size: ${(dbFile.size / 1024 / 1024).toFixed(2)} MB`);

      // Save report
      const reportPath = path.join(projectRoot, 'PHASE_4_LOAD_REPORT.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n✓ Report saved: ${reportPath}`);

      loader.close();
      console.log('\n✓ Phase 4 data load complete');
      process.exit(0);
    } catch (e) {
      console.error('✗ Fatal error:', e.message);
      loader.close();
      process.exit(1);
    }
  })();
}
