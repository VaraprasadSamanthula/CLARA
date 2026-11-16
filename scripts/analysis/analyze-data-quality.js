const fs = require('fs');
const path = require('path');
const readline = require('readline');

const datasetPath = './mimic-iv-clinical-database-demo-2.2';
const analysis = {
  timestamp: new Date().toISOString(),
  summary: {},
  tables: {},
  issues: [],
  warnings: []
};

// Analyze specific files for data quality
async function analyzeFile(category, filename, filepath, maxSamples = 100) {
  return new Promise((resolve) => {
    const fileAnalysis = {
      file: filename,
      category: category,
      nullable_count: {},
      duplicates_check: null,
      data_types: {},
      sample_values: {},
      issues: []
    };

    let lineCount = 0;
    let headers = [];
    const samples = [];
    const rows = [];

    const rl = readline.createInterface({
      input: fs.createReadStream(filepath),
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      if (lineCount === 0) {
        headers = line.split(',').map(h => h.trim());
        headers.forEach(h => {
          fileAnalysis.nullable_count[h] = 0;
          fileAnalysis.sample_values[h] = [];
          fileAnalysis.data_types[h] = new Set();
        });
      } else {
        const values = line.split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, idx) => {
          const val = values[idx] || null;
          row[h] = val;
          
          // Track nulls
          if (!val || val === '' || val === 'NULL' || val === 'nan') {
            fileAnalysis.nullable_count[h]++;
          }
          
          // Infer data type
          if (val && val !== '') {
            if (/^\d+$/.test(val)) {
              fileAnalysis.data_types[h].add('INTEGER');
            } else if (/^\d+\.\d+$/.test(val)) {
              fileAnalysis.data_types[h].add('FLOAT');
            } else if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
              fileAnalysis.data_types[h].add('DATETIME');
            } else {
              fileAnalysis.data_types[h].add('TEXT');
            }
            
            // Collect sample values
            if (fileAnalysis.sample_values[h].length < 3) {
              fileAnalysis.sample_values[h].push(val);
            }
          }
        });
        
        if (lineCount <= maxSamples) {
          samples.push(row);
        }
        rows.push(row);
      }
      lineCount++;
    });

    rl.on('close', () => {
      // Convert Sets to Arrays
      Object.keys(fileAnalysis.data_types).forEach(key => {
        fileAnalysis.data_types[key] = Array.from(fileAnalysis.data_types[key]);
      });

      // Calculate null percentages
      Object.keys(fileAnalysis.nullable_count).forEach(col => {
        const nullPct = ((fileAnalysis.nullable_count[col] / (lineCount - 1)) * 100).toFixed(2);
        if (nullPct > 30) {
          fileAnalysis.issues.push(`Column '${col}' has ${nullPct}% null/empty values`);
        }
        fileAnalysis.nullable_count[col] = {
          count: fileAnalysis.nullable_count[col],
          percentage: parseFloat(nullPct)
        };
      });

      // Check for potential duplicates (on primary keys if identifiable)
      const primaryKeyColumns = headers.filter(h => 
        h.includes('id') && !h.includes('provider') && !h.includes('caregiver')
      );
      
      if (primaryKeyColumns.length > 0 && lineCount <= 5000) {
        const uniqueKeys = new Set();
        let duplicateCount = 0;
        rows.forEach(row => {
          const keyValues = primaryKeyColumns.map(col => row[col]).join('|');
          if (uniqueKeys.has(keyValues)) {
            duplicateCount++;
          }
          uniqueKeys.add(keyValues);
        });
        
        if (duplicateCount > 0) {
          fileAnalysis.issues.push(`Found ${duplicateCount} potential duplicate rows on key columns: ${primaryKeyColumns.join(', ')}`);
        }
      }

      resolve(fileAnalysis);
    });
  });
}

async function runAnalysis() {
  console.log('Starting comprehensive data quality analysis...\n');
  
  const categories = ['hosp', 'icu'];
  const filesToAnalyze = [
    { cat: 'hosp', file: 'patients.csv' },
    { cat: 'hosp', file: 'admissions.csv' },
    { cat: 'hosp', file: 'prescriptions.csv' },
    { cat: 'hosp', file: 'labevents.csv' },
    { cat: 'hosp', file: 'diagnoses_icd.csv' },
    { cat: 'icu', file: 'icustays.csv' },
    { cat: 'icu', file: 'chartevents.csv' },
    { cat: 'icu', file: 'd_items.csv' }
  ];

  for (const fileSpec of filesToAnalyze) {
    const filepath = path.join(datasetPath, fileSpec.cat, fileSpec.file);
    if (fs.existsSync(filepath)) {
      console.log(`Analyzing ${fileSpec.cat}/${fileSpec.file}...`);
      const result = await analyzeFile(fileSpec.cat, fileSpec.file, filepath);
      analysis.tables[`${fileSpec.cat}/${fileSpec.file}`] = result;
      
      if (result.issues.length > 0) {
        result.issues.forEach(issue => {
          analysis.issues.push(`${fileSpec.cat}/${fileSpec.file}: ${issue}`);
        });
      }
    }
  }

  // Identify schema relationships
  console.log('\nAnalyzing schema relationships...');
  analysis.relationships = {
    patients: {
      primary_key: 'subject_id',
      references_from: ['admissions', 'prescriptions', 'labevents', 'diagnoses_icd']
    },
    admissions: {
      primary_key: 'hadm_id',
      foreign_keys: ['subject_id -> patients'],
      references_from: ['prescriptions', 'labevents', 'diagnoses_icd']
    }
  };

  // Summary statistics
  analysis.summary = {
    total_files_analyzed: Object.keys(analysis.tables).length,
    total_issues_found: analysis.issues.length,
    files_with_issues: analysis.issues.length,
    recommendations: [
      'Implement data type validation in ingestion',
      'Handle NULL/empty values consistently',
      'Validate referential integrity (foreign keys)',
      'Create indexes on frequently queried columns',
      'Deduplicates records where applicable',
      'Standardize date/time formats'
    ]
  };

  // Write analysis
  fs.writeFileSync('./DATA_QUALITY_ANALYSIS.json', JSON.stringify(analysis, null, 2));
  console.log('\n✓ Data quality analysis saved to DATA_QUALITY_ANALYSIS.json');
  
  return analysis;
}

runAnalysis().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
