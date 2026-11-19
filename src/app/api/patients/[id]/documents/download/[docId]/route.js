/**
 * Patient Document Download API
 * GET /api/patients/[id]/documents/download/[docId]
 * 
 * Download document file by patient ID and document ID
 * - MIMIC: documents from `documents` table (requires subject_id match)
 * - CLARA: documents from `clara_documents` table (requires patient_id match)
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { runQuery, verifyAuth, initializeDb, getDb } from '@/backend/database/connection.js';

const UPLOAD_DIR = join(process.cwd(), 'private', 'documents');

function validatePatientId(id) {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 ? num : null;
}

function isPatientMimic(patientId) {
  return patientId >= 10000000;
}

export async function GET(request, { params }) {
  try {
    // Verify authentication
    const session = verifyAuth(request);
    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
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
    let query, params_arr, doc;

    if (isMimic) {
      // MIMIC document - docId is the document_id (UUID)
      query = `
        SELECT 
          document_id,
          original_filename,
          mime_type,
          file_path
        FROM documents
        WHERE document_id = ? AND subject_id = ? AND is_deleted = 0
      `;
      params_arr = [docId, patientId];
    } else {
      // CLARA document - docId is the document_id (CLARA:X:Y format)
      query = `
        SELECT 
          document_id,
          file_name,
          mime_type,
          file_path
        FROM clara_documents
        WHERE document_id = ? AND patient_id = ? AND is_deleted = 0
      `;
      params_arr = [docId, patientId];
    }

    const result = runQuery(query, params_arr);
    if (!result.success || result.data.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Document not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    doc = result.data[0];
    const filePath = join(UPLOAD_DIR, doc.file_path);

    // Read and return file
    try {
      const buffer = await readFile(filePath);
      const filename = isMimic ? doc.original_filename : doc.file_name;

      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': doc.mime_type,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': buffer.length
        }
      });
    } catch (err) {
      console.error('[API] File read error:', err);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to read file' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[API] Document download error:', error);
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
      'Allow': 'GET, OPTIONS',
      'Content-Type': 'application/json'
    }
  });
}
