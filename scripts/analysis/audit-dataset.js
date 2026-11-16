const fs = require('fs');
const path = require('path');
const readline = require('readline');

const datasetPath = './mimic-iv-clinical-database-demo-2.2';
const categories = ['hosp', 'icu'];
const audit = [];

async function countLinesInFile(filepath) {
  return new Promise((resolve, reject) => {
    let lineCount = 0;
    const rl = readline.createInterface({
      input: fs.createReadStream(filepath),
      crlfDelay: Infinity
    });

    rl.on('line', () => lineCount++);
    rl.on('close', () => resolve(lineCount - 1)); // Subtract header row
    rl.on('error', reject);
  });
}

async function analyzeDataset() {
  for (const cat of categories) {
    const catPath = path.join(datasetPath, cat);
    const files = fs.readdirSync(catPath).filter(f => f.endsWith('.csv'));

    for (const file of files) {
      const filepath = path.join(catPath, file);
      const stats = fs.statSync(filepath);

      try {
        // Count rows
        const rowCount = await countLinesInFile(filepath);

        // Get headers
        const firstLine = fs.readFileSync(filepath, 'utf-8').split('\n')[0];
        const colCount = firstLine.split(',').length;

        audit.push({
          category: cat,
          file: file,
          rows: rowCount,
          columns: colCount,
          size_mb: parseFloat((stats.size / 1024 / 1024).toFixed(2)),
          headers: firstLine
        });

        console.log(`✓ ${cat}/${file}: ${rowCount} rows, ${colCount} cols, ${parseFloat((stats.size / 1024 / 1024).toFixed(2))} MB`);
      } catch (e) {
        audit.push({
          category: cat,
          file: file,
          rows: 'ERROR',
          columns: 'ERROR',
          size_mb: parseFloat((stats.size / 1024 / 1024).toFixed(2)),
          headers: 'ERROR: ' + e.message
        });
        console.log(`✗ ${cat}/${file}: ERROR - ${e.message}`);
      }
    }
  }

  // Output summary
  console.log('\n=== DATASET AUDIT SUMMARY ===\n');
  const totalRows = audit.reduce((sum, file) => {
    const rows = file.rows === 'ERROR' ? 0 : parseInt(file.rows);
    return sum + rows;
  }, 0);
  const totalSize = audit.reduce((sum, file) => sum + file.size_mb, 0);

  console.log(`Total CSV Files: ${audit.length}`);
  console.log(`Total Records: ${totalRows.toLocaleString()}`);
  console.log(`Total Size: ${totalSize.toFixed(2)} MB`);
  console.log(`\nFiles by Category:`);
  console.log(`  - HOSP: ${audit.filter(f => f.category === 'hosp').length} files`);
  console.log(`  - ICU: ${audit.filter(f => f.category === 'icu').length} files`);

  // Write detailed audit to JSON
  fs.writeFileSync('./DATASET_AUDIT.json', JSON.stringify(audit, null, 2));
  console.log('\n✓ Detailed audit saved to DATASET_AUDIT.json');
}

analyzeDataset().catch(e => {
  console.error('Error analyzing dataset:', e);
  process.exit(1);
});
