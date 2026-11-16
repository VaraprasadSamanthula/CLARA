#!/usr/bin/env node

/**
 * Data Cleaning Pipeline Runner
 * Phase 2: Transform and clean MIMIC-IV dataset
 */

const fs = require('fs');
const path = require('path');
const ETLEngine = require('./etl-engine');

async function main() {
  try {
    // Directories
    const projectRoot = path.resolve(__dirname, '../../');
    const sourceDir = path.join(projectRoot, 'mimic-iv-clinical-database-demo-2.2');
    const outputDir = path.join(projectRoot, 'data/processed');

    // Verify source directory
    if (!fs.existsSync(sourceDir)) {
      console.error(`✗ Source directory not found: ${sourceDir}`);
      process.exit(1);
    }

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Run pipeline
    const engine = new ETLEngine();
    const results = await engine.runPipeline(sourceDir, outputDir);

    // Generate report
    const report = engine.generateReport(results);

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('PIPELINE SUMMARY');
    console.log('='.repeat(70));
    console.log(`\nFiles Processed: ${engine.stats.filesProcessed}`);
    console.log(`Records Processed: ${engine.stats.recordsProcessed}`);
    console.log(`Records Skipped: ${engine.stats.recordsSkipped}`);
    console.log(`Errors Found: ${engine.stats.errorsFound.length}`);

    if (engine.stats.errorsFound.length > 0) {
      console.log('\nErrors:');
      engine.stats.errorsFound.forEach(err => {
        console.log(`  - ${err.table}: ${err.error}`);
      });
    }

    // Save report
    const reportPath = path.join(outputDir, 'TRANSFORMATION_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✓ Report saved: ${reportPath}`);

    // List output files
    console.log('\n' + '='.repeat(70));
    console.log('OUTPUT FILES');
    console.log('='.repeat(70));
    const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.csv'));
    files.forEach(f => {
      const filepath = path.join(outputDir, f);
      const stat = fs.statSync(filepath);
      console.log(`  ✓ ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
    });

    console.log(`\n✓ Pipeline complete. ${files.length} cleaned files generated.`);
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Pipeline failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
