/**
 * Document Operations API
 * DELETE /api/documents/[id] - Soft-delete document
 */

import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

function validateDocumentId(id) {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 ? num : null;
}

export async function DELETE(request, { params }) {
  const { runQuery, runWriteQuery, verifyAuth } = await import('../../../../../backend/database/connection.js');
  
  try {
    // Verify authentication
    const session = verifyAuth(request);
    if (!session) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication required'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // params is a Promise in Next.js 16
    const resolvedParams = await params;
    const documentId = validateDocumentId(resolvedParams.id);

    if (!documentId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid document ID'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get document info before deletion
    const selectQuery = `
      SELECT 
        document_id,
        storage_path,
        is_deleted
      FROM documents
      WHERE document_id = ?
    `;

    const selectResult = runQuery(selectQuery, [documentId]);

    if (!selectResult.success || selectResult.data.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Document not found'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const document = selectResult.data[0];

    // Check if already deleted
    if (document.is_deleted) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Document is already deleted'
        }),
        { status: 410, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Soft delete - mark as deleted in database
    const deleteQuery = `
      UPDATE documents
      SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP
      WHERE document_id = ?
    `;

    const deleteResult = runWriteQuery(deleteQuery, [documentId]);

    if (!deleteResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to delete document'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // NOTE: Physical file is intentionally NOT deleted
    // Soft-delete with retained files supports recovery and audit requirements
    // File cleanup should be handled by a scheduled maintenance process
    // based on defined retention policy (e.g., 90 days after deletion)
    console.log(`[DELETE] Document soft-deleted (file retained for recovery): ${document.storage_path}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Document deleted successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[DELETE] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server error deleting document'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
