/**
 * ETL Engine - Main data cleaning and transformation
 * Processes CSV files according to config rules
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const config = require('./config');

class ETLEngine {
  constructor() {
    this.stats = {
      filesProcessed: 0,
      recordsProcessed: 0,
      recordsSkipped: 0,
      errorsFound: [],
      warnings: [],
      foreignKeyIssues: []
    };
    this.cache = {
      validIds: {} // Track valid foreign keys
    };
  }

  /**
   * Parse and validate a date string
   */
  parseDate(value, column) {
    if (!value || this.isNull(value)) return null;

    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0] + ' ' + date.toISOString().split('T')[1].split('.')[0];
    } catch (e) {
      return null;
    }
  }

  /**
   * Check if value represents null
   */
  isNull(value) {
    if (value === null || value === undefined) return true;
    const str = String(value).trim();
    return config.global.nullRepresentations.includes(str) || str === '';
  }

  /**
   * Coerce value to specified type
   */
  coerceType(value, type) {
    if (this.isNull(value)) return null;

    const str = String(value).trim();

    switch (type) {
      case 'INTEGER':
        const int = parseInt(str, 10);
        return isNaN(int) ? null : int;

      case 'FLOAT':
        const float = parseFloat(str);
        return isNaN(float) ? null : float;

      case 'DATETIME':
        return this.parseDate(str);

      case 'TEXT':
      default:
        return str;
    }
  }

  /**
   * Apply text transformations (trim, case)
   */
  transformText(value, columnConfig) {
    if (this.isNull(value)) return null;

    let result = String(value);

    if (columnConfig.trim !== false && config.global.trimWhitespace) {
      result = result.trim();
    }

    if (columnConfig.lowercase) {
      result = result.toLowerCase();
    } else if (columnConfig.uppercase) {
      result = result.toUpperCase();
    }

    return result;
  }

  /**
   * Transform a single record according to schema
   */
  transformRecord(record, headers, tableConfig) {
    const transformed = {};
    const issues = [];

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const value = record[i];
      const columnConfig = tableConfig.columns[header];

      if (!columnConfig) {
        // Unknown column
        issues.push(`Unknown column: ${header}`);
        transformed[header] = value;
        continue;
      }

      // Apply type coercion
      let typed = this.coerceType(value, columnConfig.type);

      // Apply text transformations
      if (columnConfig.type === 'TEXT' && typed !== null) {
        typed = this.transformText(typed, columnConfig);
      }

      // Validate nullable
      if (typed === null && !columnConfig.nullable) {
        if (!this.isNull(value)) {
          issues.push(`Failed to parse ${header}: "${value}" as ${columnConfig.type}`);
        } else {
          issues.push(`Null value not allowed in ${header}`);
        }
      }

      transformed[header] = typed;
    }

    return { transformed, issues };
  }

  /**
   * Load valid IDs from a lookup table
   */
  async loadValidIds(table, idColumn) {
    const cacheKey = `${table}:${idColumn}`;
    if (this.cache.validIds[cacheKey]) {
      return this.cache.validIds[cacheKey];
    }

    const ids = new Set();
    const tableConfig = Object.values(config.tables).find(t => t.category === 'hosp' || t.category === 'icu');
    
    // This would load from processed file in production
    // For now, return empty set (will check in validation phase)
    this.cache.validIds[cacheKey] = ids;
    return ids;
  }

  /**
   * Validate foreign key references
   */
  async validateForeignKey(value, fkConfig, record) {
    if (fkConfig.nullable && this.isNull(value)) {
      return true;
    }

    // In full implementation, would check against loaded reference data
    return true;
  }

  /**
   * Process a single CSV file
   */
  async processFile(filePath, tableConfig) {
    return new Promise((resolve, reject) => {
      const records = [];
      const issues = [];
      let lineNum = 0;
      let headers = [];

      const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity
      });

      rl.on('line', (line) => {
        try {
          if (lineNum === 0) {
            // Parse headers
            headers = line.split(',').map(h => h.trim());
          } else {
            // Parse data
            const values = line.split(',').map(v => v.trim());
            const record = {};

            headers.forEach((header, idx) => {
              record[header] = values[idx] || '';
            });

            // Transform record
            const { transformed, issues: recIssues } = this.transformRecord(
              Object.values(record),
              headers,
              tableConfig
            );

            records.push(transformed);
            if (recIssues.length > 0) {
              issues.push({ line: lineNum, issues: recIssues });
            }

            this.stats.recordsProcessed++;
          }
          lineNum++;
        } catch (e) {
          issues.push({ line: lineNum, error: e.message });
          this.stats.recordsSkipped++;
        }
      });

      rl.on('close', () => {
        resolve({
          headers,
          records,
          issues,
          lineCount: lineNum - 1
        });
      });

      rl.on('error', reject);
    });
  }

  /**
   * Export cleaned data to CSV
   */
  exportToCSV(filePath, headers, records) {
    return new Promise((resolve, reject) => {
      try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Write header
        const csv = [headers.join(',')];

        // Write records
        for (const record of records) {
          const row = headers.map(h => {
            let value = record[h];
            if (value === null || value === undefined) {
              return '';
            }
            // Escape quotes in values
            value = String(value).replace(/"/g, '""');
            // Quote if contains comma or newline
            if (value.includes(',') || value.includes('\n') || value.includes('"')) {
              return `"${value}"`;
            }
            return value;
          });
          csv.push(row.join(','));
        }

        fs.writeFileSync(filePath, csv.join('\n'), 'utf-8');
        resolve(records.length);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Run full ETL pipeline for a table
   */
  async processTable(tableName, sourceDir, outputDir) {
    try {
      const tableConfig = config.tables[tableName];
      if (!tableConfig) {
        throw new Error(`No config found for table: ${tableName}`);
      }

      const sourceFile = path.join(sourceDir, tableConfig.category, tableName);
      const outputFile = path.join(outputDir, tableName);

      console.log(`\nProcessing ${tableName}...`);
      console.log(`  Source: ${sourceFile}`);

      if (!fs.existsSync(sourceFile)) {
        console.log(`  ✗ File not found`);
        return null;
      }

      // Process file
      const result = await this.processFile(sourceFile, tableConfig);
      console.log(`  ✓ Parsed ${result.lineCount} records`);

      // Export cleaned data
      await this.exportToCSV(outputFile, result.headers, result.records);
      console.log(`  ✓ Exported to ${outputFile}`);

      // Report issues
      if (result.issues.length > 0) {
        console.log(`  ⚠ ${result.issues.length} transformation issues found`);
        if (result.issues.length <= 5) {
          result.issues.forEach(issue => {
            console.log(`     Line ${issue.line}: ${issue.issues?.join('; ') || issue.error}`);
          });
        }
      }

      this.stats.filesProcessed++;
      return result;
    } catch (e) {
      console.error(`  ✗ Error: ${e.message}`);
      this.stats.errorsFound.push({ table: tableName, error: e.message });
      return null;
    }
  }

  /**
   * Run ETL for all tables in phase 2 scope
   */
  async runPipeline(sourceDir, outputDir) {
    console.log('\n' + '='.repeat(70));
    console.log('DATA CLEANING PIPELINE - PHASE 2');
    console.log('='.repeat(70));
    console.log(`\nSource: ${sourceDir}`);
    console.log(`Output: ${outputDir}`);
    console.log(`Tables: ${config.phase2Scope.length}`);

    const results = {};

    for (const tableName of config.phase2Scope) {
      results[tableName] = await this.processTable(tableName, sourceDir, outputDir);
    }

    return results;
  }

  /**
   * Generate transformation report
   */
  generateReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      details: {}
    };

    for (const [table, result] of Object.entries(results)) {
      if (result) {
        report.details[table] = {
          recordsProcessed: result.lineCount,
          issuesFound: result.issues.length,
          headers: result.headers.length
        };
      }
    }

    return report;
  }
}

module.exports = ETLEngine;
