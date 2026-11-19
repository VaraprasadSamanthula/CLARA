/**
 * POST /api/patients/import/confirm
 * 
 * Confirm and execute an import based on a preview_id.
 * Revalidates all rows before inserting.
 * Uses atomic transaction for all inserts.
 * Rolls back on error.
 */

import { verifyAuth, initializeDb, getDb } from '@/backend/database/connection.js';
import { randomUUID } from 'crypto';

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

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { preview_id, skip_duplicates } = body;

    if (!preview_id || typeof preview_id !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'preview_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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

    // Get database connection from shared pool
    const db = getDb();
    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Retrieve preview
    const preview = db.prepare(`
      SELECT * FROM import_previews WHERE preview_id = ?
    `).get(preview_id);

    if (!preview) {
      return new Response(
        JSON.stringify({ success: false, error: 'Preview not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership
    if (preview.session_id !== session.sessionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Preview does not belong to current session' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (preview.expires_at < now) {
      return new Response(
        JSON.stringify({ success: false, error: 'Preview has expired' }),
        { status: 410, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse preview data
    let rows;
    try {
      rows = JSON.parse(preview.preview_data);
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid preview data' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filter rows for insertion
    const rowsToInsert = skip_duplicates 
      ? rows.filter(r => r.status === 'VALID')
      : rows.filter(r => r.status === 'VALID' || (r.status === 'DUPLICATE' && r.duplicate_within_file));

    if (rowsToInsert.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No valid rows to import after filtering'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Execute import in a transaction
    const importId = randomUUID();
    let insertedCount = 0;
    let duplicateSkipped = 0;
    let invalidSkipped = 0;
    let errorMessage = null;

    try {
      // Start transaction
      const transaction = db.transaction(() => {
        for (const row of rowsToInsert) {
          // Recheck for duplicate in case database changed since preview
          const duplicate = db.prepare(`
            SELECT patient_id FROM patient_registry
            WHERE full_name = ? AND date_of_birth = ?
          `).get(row.data.full_name.trim(), row.data.date_of_birth || null);

          if (duplicate) {
            duplicateSkipped++;
            continue;
          }

          // Insert patient
          try {
            db.prepare(`
              INSERT INTO patient_registry (
                patient_source, full_name, date_of_birth, gender, phone, email, address, created_by
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              'IMPORT',
              row.data.full_name.trim(),
              row.data.date_of_birth || null,
              row.data.gender || null,
              row.data.phone || null,
              row.data.email || null,
              row.data.address || null,
              session.email
            );

            insertedCount++;
          } catch (e) {
            if (e.message.includes('UNIQUE constraint')) {
              duplicateSkipped++;
            } else {
              throw e;
            }
          }
        }

        // Invalid rows
        invalidSkipped = rows.filter(r => r.status === 'INVALID').length;

        // Log the import
        db.prepare(`
          INSERT INTO import_logs (
            import_id, session_id, user_email, file_name,
            total_inserted, duplicate_skipped, invalid_skipped, import_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          importId,
          session.sessionId,
          session.email,
          preview.file_name,
          insertedCount,
          duplicateSkipped,
          invalidSkipped,
          insertedCount > 0 ? 'success' : 'partial'
        );
      });

      transaction();

    } catch (error) {
      // Transaction will automatically rollback
      errorMessage = error.message;
      console.error('[IMPORT_CONFIRM] Transaction error:', error);

      // Log failed import
      try {
        db.prepare(`
          INSERT INTO import_logs (
            import_id, session_id, user_email, file_name,
            total_inserted, duplicate_skipped, invalid_skipped, import_status, error_message
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          importId,
          session.sessionId,
          session.email,
          preview.file_name,
          insertedCount,
          duplicateSkipped,
          invalidSkipped,
          'failed',
          errorMessage
        );
      } catch (logError) {
        console.error('[IMPORT_CONFIRM] Failed to log error:', logError);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `Import transaction failed: ${errorMessage}`,
          inserted: insertedCount
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Mark preview as confirmed
    db.prepare('UPDATE import_previews SET confirmed = 1 WHERE preview_id = ?').run(preview_id);

    return new Response(
      JSON.stringify({
        success: true,
        import_id: importId,
        message: `Import completed successfully`,
        summary: {
          total_requested: rowsToInsert.length,
          inserted: insertedCount,
          duplicate_skipped: duplicateSkipped,
          invalid_skipped: invalidSkipped
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[IMPORT_CONFIRM] Error:', error);
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
