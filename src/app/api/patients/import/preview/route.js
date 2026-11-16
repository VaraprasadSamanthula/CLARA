/**
 * POST /api/patients/import/preview
 * 
 * Parse and validate an uploaded CSV or Excel file without inserting data.
 * Detects duplicates and categorizes rows for user review.
 * 
 * Returns a preview_id for later confirmation.
 */

import { verifyAuth, initializeDb } from '@/backend/database/connection.js';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.join(__filename, '../../../../../../');
const dbPath = path.join(projectRoot, 'database', 'clara.db');

// CSV parsing function
function parseCSV(content) {
  const lines = content.toString().split('\n');
  if (lines.length < 2) throw new Error('CSV must have header and at least one data row');
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

// Excel parsing (simplified - requires xlsx library)
function parseExcel(buffer) {
  let xlsx;
  try {
    xlsx = require('xlsx');
  } catch (e) {
    throw new Error('Excel parsing not available. Please use CSV format.');
  }
  
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);
    
    return rows.map(row => {
      const normalized = {};
      for (const key in row) {
        normalized[key.toLowerCase()] = String(row[key] || '');
      }
      return normalized;
    });
  } catch (e) {
    throw new Error(`Excel parsing error: ${e.message}`);
  }
}

// Validate a single patient row
function validatePatientRow(row, rowIndex) {
  const errors = [];
  const warnings = [];
  
  // Required field: full_name
  if (!row.full_name || !row.full_name.trim()) {
    errors.push('Missing or empty full_name');
  } else if (row.full_name.trim().length > 255) {
    errors.push('full_name too long (max 255 characters)');
  }
  
  // Optional: date_of_birth
  if (row.date_of_birth && row.date_of_birth.trim()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date_of_birth)) {
      errors.push('Invalid date_of_birth format (must be YYYY-MM-DD)');
    } else {
      const dob = new Date(row.date_of_birth);
      if (dob > new Date()) {
        errors.push('date_of_birth is in the future');
      }
      if (dob.getFullYear() < 1900) {
        warnings.push('date_of_birth is very old (before 1900)');
      }
    }
  }
  
  // Optional: gender
  if (row.gender && row.gender.trim()) {
    if (!['M', 'F', 'Other', 'Male', 'Female'].includes(row.gender.trim())) {
      warnings.push(`Unusual gender value: ${row.gender}`);
    }
  }
  
  // Optional: email
  if (row.email && row.email.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
      warnings.push('Invalid email format');
    }
  }
  
  // Optional: phone
  if (row.phone && row.phone.trim()) {
    if (row.phone.trim().length > 20) {
      warnings.push('Phone number seems very long');
    }
  }
  
  return {
    rowIndex,
    isValid: errors.length === 0,
    errors,
    warnings,
    data: row
  };
}

export async function POST(request) {
  try {
    // Verify authentication
    const session = verifyAuth(request);
    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize database
    const dbInitialized = initializeDb();
    if (!dbInitialized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database connection failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file uploaded' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file
    const fileName = file.name;
    const fileSize = file.size;
    const maxSize = 5 * 1024 * 1024; // 5 MB
    
    if (fileSize > maxSize) {
      return new Response(
        JSON.stringify({ success: false, error: `File exceeds maximum size of 5 MB (${(fileSize / 1024 / 1024).toFixed(2)} MB uploaded)` }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Determine file format
    let fileFormat;
    let rows;
    
    if (fileName.endsWith('.csv')) {
      fileFormat = 'csv';
      const buffer = await file.arrayBuffer();
      const content = Buffer.from(buffer).toString('utf-8');
      rows = parseCSV(content);
    } else if (fileName.endsWith('.xlsx')) {
      fileFormat = 'xlsx';
      const buffer = await file.arrayBuffer();
      rows = parseExcel(Buffer.from(buffer));
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Unsupported file format. Please upload CSV or XLSX.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'File contains no data rows' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Connect to database
    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');

    try {
      // Validate each row
      const validatedRows = rows.map((row, idx) => validatePatientRow(row, idx + 2)); // Row numbering starts at 2 (header is 1)
      
      // Categorize rows
      let validCount = 0;
      let invalidCount = 0;
      let duplicateCount = 0;
      
      const processedRows = validatedRows.map(vRow => {
        if (!vRow.isValid) {
          invalidCount++;
          return { ...vRow, status: 'INVALID' };
        }
        
        // Check for duplicate in database
        const duplicate = db.prepare(`
          SELECT patient_id, created_at FROM patient_registry
          WHERE full_name = ? AND date_of_birth = ?
        `).get(vRow.data.full_name.trim(), vRow.data.date_of_birth || null);
        
        if (duplicate) {
          duplicateCount++;
          return { ...vRow, status: 'DUPLICATE', existing_patient_id: duplicate.patient_id };
        }
        
        validCount++;
        return { ...vRow, status: 'VALID' };
      });
      
      // Check for duplicates within the file itself
      const nameDobCombos = new Set();
      const internalDuplicates = [];
      
      processedRows.forEach(pRow => {
        if (pRow.status === 'VALID') {
          const combo = `${pRow.data.full_name}|${pRow.data.date_of_birth || ''}`;
          if (nameDobCombos.has(combo)) {
            internalDuplicates.push(pRow.rowIndex);
            pRow.status = 'DUPLICATE';
            pRow.duplicate_within_file = true;
            validCount--;
            duplicateCount++;
          } else {
            nameDobCombos.add(combo);
          }
        }
      });

      // Generate preview ID
      const previewId = randomUUID();
      
      // Store preview in database
      const previewData = JSON.stringify(processedRows);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      db.prepare(`
        INSERT INTO import_previews (
          preview_id, session_id, user_email, file_name, file_format,
          total_rows, valid_rows, invalid_rows, duplicate_rows, preview_data, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        previewId,
        session.sessionId,
        session.email,
        fileName,
        fileFormat,
        rows.length,
        validCount,
        invalidCount,
        duplicateCount,
        previewData,
        Math.floor(expiresAt.getTime() / 1000)
      );

      return new Response(
        JSON.stringify({
          success: true,
          preview_id: previewId,
          file_name: fileName,
          file_format: fileFormat,
          total_rows: rows.length,
          valid_rows: validCount,
          invalid_rows: invalidCount,
          duplicate_rows: duplicateCount,
          expires_at: expiresAt.toISOString(),
          rows: processedRows.slice(0, 50) // Return first 50 rows for preview
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } finally {
      db.close();
    }

  } catch (error) {
    console.error('[IMPORT_PREVIEW] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Allow': 'POST, OPTIONS',
      'Content-Type': 'application/json'
    }
  });
}
