/**
 * Referential Integrity Validator
 * Checks foreign key relationships and data consistency
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const config = require('./config');

class IntegrityValidator {
  constructor() {
    this.validIds = {};
    this.violations = [];
    this.stats = {
      tablesValidated: 0,
      recordsValidated: 0,
      violationsFound: 0,
      orphanedRecords: 0
    };
  }

  /**
   * Load all ID values from a reference table
   */
  async loadReferenceIds(tableName, idColumn, dataDir) {
    const cacheKey = `${tableName}:${idColumn}`;
    if (this.validIds[cacheKey]) {
      return this.validIds[cacheKey];
    }

    const ids = new Set();
    const filePath = path.join(dataDir, tableName);

    return new Promise((resolve, reject) => {
      const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity
      });

      let lineNum = 0;
      let columnIndex = -1;

      rl.on('line', (line) => {
        if (lineNum === 0) {
          // Find column index
          const headers = line.split(',').map(h => h.trim());
          columnIndex = headers.indexOf(idColumn);
          if (columnIndex === -1) {
            console.error(`Column ${idColumn} not found in ${tableName}`);
          }
        } else if (columnIndex >= 0) {
          const values = line.split(',').map(v => v.trim());
          const id = values[columnIndex];
          if (id && id !== '') {
            ids.add(id);
          }
        }
        lineNum++;
      });

      rl.on('close', () => {
        this.validIds[cacheKey] = ids;
        resolve(ids);
      });

      rl.on('error', reject);
    });
  }

  /**
   * Validate foreign key references in a table
   */
  async validateTable(tableName, dataDir) {
    const tableConfig = config.tables[tableName];
    if (!tableConfig || !tableConfig.foreignKeys || tableConfig.foreignKeys.length === 0) {
      return { violations: [] };
    }

    const filePath = path.join(dataDir, tableName);
    if (!fs.existsSync(filePath)) {
      return { violations: [] };
    }

    const violations = [];
    let recordNum = 0;
    let headers = [];

    console.log(`\nValidating ${tableName}...`);

    // Load reference ID sets
    const refIdSets = {};
    for (const fk of tableConfig.foreignKeys) {
      const [refTable, refColumn] = fk.references.split(':');
      const key = `${refTable}:${refColumn}`;
      if (!refIdSets[key]) {
        try {
          refIdSets[key] = await this.loadReferenceIds(refTable, refColumn, dataDir);
        } catch (e) {
          console.warn(`  ⚠ Could not load reference IDs for ${key}: ${e.message}`);
          refIdSets[key] = new Set();
        }
      }
    }

    // Check each record
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity
      });

      rl.on('line', (line) => {
        if (recordNum === 0) {
          headers = line.split(',').map(h => h.trim());
        } else {
          const values = line.split(',').map(v => v.trim());
          const record = {};

          headers.forEach((h, idx) => {
            record[h] = values[idx];
          });

          // Check each foreign key
          for (const fk of tableConfig.foreignKeys) {
            const value = record[fk.column];
            const [refTable, refColumn] = fk.references.split(':');
            const key = `${refTable}:${refColumn}`;
            const refIds = refIdSets[key];

            if (value && value !== '') {
              if (!refIds || !refIds.has(value)) {
                violations.push({
                  record: recordNum,
                  column: fk.column,
                  value: value,
                  expected: `${refTable}.${refColumn}`,
                  severity: fk.nullable ? 'warning' : 'error'
                });
              }
            } else if (!fk.nullable && config.global.validateForeignKeys) {
              violations.push({
                record: recordNum,
                column: fk.column,
                value: null,
                expected: `NOT NULL FOREIGN KEY`,
                severity: 'error'
              });
            }
          }

          this.stats.recordsValidated++;
        }
        recordNum++;
      });

      rl.on('close', () => {
        this.stats.tablesValidated++;
        this.stats.violationsFound += violations.length;
        resolve({ violations, recordCount: recordNum - 1 });
      });

      rl.on('error', (err) => {
        console.error(`  ✗ Error reading file: ${err.message}`);
        resolve({ violations: [], recordCount: 0 });
      });
    });
  }

  /**
   * Run validation on all tables
   */
  async validateAll(dataDir) {
    console.log('\n' + '='.repeat(70));
    console.log('REFERENTIAL INTEGRITY VALIDATION');
    console.log('='.repeat(70));
    console.log(`Data Directory: ${dataDir}`);

    const results = {};
    const tablesToValidate = config.phase2Scope.filter(t => 
      config.tables[t] && config.tables[t].foreignKeys && config.tables[t].foreignKeys.length > 0
    );

    for (const tableName of tablesToValidate) {
      const result = await this.validateTable(tableName, dataDir);
      results[tableName] = result;

      console.log(`  ✓ Validated ${result.recordCount} records`);
      if (result.violations.length > 0) {
        console.log(`    ⚠ Found ${result.violations.length} violations`);
        if (result.violations.length <= 3) {
          result.violations.slice(0, 3).forEach(v => {
            console.log(`       Record ${v.record}: ${v.column} = "${v.value}" (missing in ${v.expected})`);
          });
        }
      }
    }

    return results;
  }

  /**
   * Generate validation report
   */
  generateReport(validationResults) {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      violations: {},
      summary: {
        tablesWithViolations: 0,
        totalViolations: 0,
        severityCount: { error: 0, warning: 0 }
      }
    };

    for (const [table, result] of Object.entries(validationResults)) {
      if (result.violations.length > 0) {
        report.violations[table] = result.violations;
        report.summary.tablesWithViolations++;
        report.summary.totalViolations += result.violations.length;

        result.violations.forEach(v => {
          report.summary.severityCount[v.severity]++;
        });
      }
    }

    return report;
  }
}

module.exports = IntegrityValidator;
