/**
 * Patient Document Delete API
 * DELETE /api/patients/[id]/documents/delete/[docId]
 * 
 * Soft delete document (mark as deleted without removing file)
 * - MIMIC: documents in `documents` table (read-only - return 403)
 * - CLARA: documents in `clara_documents` table (allow deletion)
 * 
 * Only the document creator or admin can delete
 */

import { verifyAuth, initializeDb, getDb } from '@/backend/database/connection.js';

function validatePatientId(id) {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 ? num : null;
}

function isPatientMimic(patientId) {
  return patientId >= 10000000;
}

export async function DELETE(request, { params }) {
  try {
    // Verify authentication
    const session = verifyAuth(request);
    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize and get database
    initializeDb();
    const db = getDb();
    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resolvedParams = await params;
    const patientId = validatePatientId(resolvedParams.id);
    const docId = resolvedParams.docId;

    if (!patientId || !docId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isMimic = isPatientMimic(patientId);

    if (isMimic) {
      // MIMIC documents are read-only in CLARA system
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cannot delete MIMIC documents',
          hint: 'MIMIC documents are part of the original dataset and cannot be modified'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // For CLARA patients: soft delete the document
    // Get document to verify ownership and existence
    const doc = db.prepare(`
      SELECT document_id, patient_id, created_by, is_deleted
      FROM clara_documents
      WHERE document_id = ? AND patient_id = ?
    `).get(docId, patientId);

    if (!doc) {
      return new Response(
        JSON.stringify({ success: false, error: 'Document not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if already deleted
    if (doc.is_deleted) {
      return new Response(
        JSON.stringify({ success: false, error: 'Document already deleted' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Permission check: only creator or admin can delete
    const isAdmin = session.email === 'admin@example.com' || session.role === 'admin';
    const isCreator = doc.created_by === session.email;

    if (!isCreator && !isAdmin) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Not authorized to delete this document',
          hint: 'Only the document creator or admin can delete'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Soft delete: mark as deleted and set deleted_at timestamp
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE clara_documents
      SET is_deleted = 1, deleted_at = ?
      WHERE document_id = ? AND patient_id = ?
    `).run(now, docId, patientId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Document deleted successfully',
        document_id: docId
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[API] Document delete error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Allow': 'DELETE, OPTIONS',
      'Content-Type': 'application/json'
    }
  });
}
