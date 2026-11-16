/**
 * GET /api/patients/import/errors?preview_id=xxx
 * 
 * Download error report CSV for a preview with invalid rows.
 * Only accessible by the user who created the preview (session check).
 */

import { verifyAuth, initializeDb } from '@/backend/database/connection.js';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.join(__filename, '../../../../../../');
const dbPath = path.join(projectRoot, 'database', 'clara.db');

function generateErrorReportCSV(previewData, preview) {
  // Parse the preview data (array of row objects)
  let rows;
  try {
    rows = Array.isArray(previewData) ? previewData : JSON.parse(previewData);
  } catch {
    rows = [];
  }

  // Filter to only invalid rows and add useful info
  const invalidRows = rows.filter(row => row.status === 'INVALID').map(row => ({
    rowIndex: row.rowIndex,
    fullName: row.data?.full_name || '',
    errors: row.errors?.join('; ') || 'Unknown error',
    warnings: row.warnings?.join('; ') || ''
  }));

  // Also include duplicates info
  const duplicateRows = rows.filter(row => row.status === 'DUPLICATE').map(row => {
    const reason = row.duplicate_within_file ? 
      'Duplicate within file (same name + DOB)' : 
      `Duplicate in database (existing patient ID: ${row.existing_patient_id || 'unknown'})`;
    return {
      rowIndex: row.rowIndex,
      fullName: row.data?.full_name || '',
      errors: reason,
      warnings: ''
    };
  });

  // Combine all error rows
  const allErrorRows = [...invalidRows, ...duplicateRows].sort((a, b) => a.rowIndex - b.rowIndex);

  // Generate CSV
  const headers = ['Row #', 'Patient Name', 'Issue Type', 'Details', 'Warnings'];
  const csvLines = [headers.map(h => `"${h}"`).join(',')];

  allErrorRows.forEach(row => {
    // Determine issue type
    const isInvalid = invalidRows.some(r => r.rowIndex === row.rowIndex);
    const issueType = isInvalid ? 'Validation Error' : 'Duplicate Record';

    csvLines.push([
      row.rowIndex,
      `"${row.fullName}"`,
      `"${issueType}"`,
      `"${row.errors.replace(/"/g, '""')}"`, // Escape quotes in CSV
      `"${row.warnings.replace(/"/g, '""') || ''}"`
    ].join(','));
  });

  // Add summary at the end
  csvLines.push('');
  csvLines.push(`"Summary","",""," ",""`);
  csvLines.push(`"Total Invalid Rows","${invalidRows.length}","",""," "`);
  csvLines.push(`"Total Duplicate Rows","${duplicateRows.length}","",""," "`);
  csvLines.push(`"Total Error Rows","${allErrorRows.length}","",""," "`);
  csvLines.push(`"Valid Rows Ready to Import","${preview.valid_rows}","",""," "`);

  return csvLines.join('\n');
}

export async function GET(request) {
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

    // Get preview_id from query params
    const { searchParams } = new URL(request.url);
    const previewId = searchParams.get('preview_id');

    if (!previewId) {
      return new Response(
        JSON.stringify({ success: false, error: 'preview_id parameter required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Connect to database
    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');

    try {
      // Get preview from database
      const preview = db.prepare(`
        SELECT preview_id, preview_data, file_name, user_email, session_id,
               total_rows, valid_rows, invalid_rows, duplicate_rows, file_format
        FROM import_previews
        WHERE preview_id = ?
      `).get(previewId);

      if (!preview) {
        return new Response(
          JSON.stringify({ success: false, error: 'Preview not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Verify ownership: user can only access their own preview
      if (preview.user_email !== session.email) {
        return new Response(
          JSON.stringify({ success: false, error: 'Not authorized to access this preview' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check if there are any errors
      if (preview.invalid_rows === 0 && preview.duplicate_rows === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No errors in this preview - all rows are valid',
            message: 'There are no invalid or duplicate rows to report'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Generate CSV error report
      const csv = generateErrorReportCSV(preview.preview_data, preview);

      // Return CSV file
      const filename = `CLARA_Import_Errors_${previewId.substring(0, 8)}.csv`;
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

    } finally {
      db.close();
    }

  } catch (error) {
    console.error('[IMPORT_ERRORS] Error:', error);
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
      'Allow': 'GET, OPTIONS',
      'Content-Type': 'application/json'
    }
  });
}
