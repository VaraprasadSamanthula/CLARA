/**
 * Patient Documents API
 * GET /api/patients/[id]/documents - List documents for patient
 * POST /api/patients/[id]/documents/upload - Upload document for patient
 * 
 * Supports both MIMIC and new patients
 * - MIMIC documents in `documents` table (INTEGER IDs)
 * - New patient documents in `clara_documents` table (TEXT IDs: CLARA:X:Y)
 */

function validatePatientId(id) {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 ? num : null;
}

function isPatientMimic(patientId) {
  return patientId >= 10000000;
}

export async function GET(request, { params }) {
  const { runQuery, verifyAuth } = await import('../../../../../../backend/database/connection.js');
  
  try {
    const session = verifyAuth(request);
    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resolvedParams = await params;
    const patientId = validatePatientId(resolvedParams.id);
    
    if (!patientId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid patient ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isMimic = isPatientMimic(patientId);
    let query, docs = [];

    if (isMimic) {
      // MIMIC documents
      query = `
        SELECT 
          document_id,
          original_filename,
          mime_type,
          file_size,
          created_at,
          uploaded_by
        FROM documents
        WHERE subject_id = ? AND is_deleted = 0
        ORDER BY created_at DESC
      `;
      const result = runQuery(query, [patientId]);
      if (result.success && result.data.length > 0) {
        docs = result.data.map(doc => ({
          id: String(doc.document_id),
          filename: doc.original_filename,
          type: doc.mime_type,
          size: doc.file_size,
          createdAt: doc.created_at,
          uploadedBy: doc.uploaded_by,
          source: 'MIMIC'
        }));
      }
    } else {
      // New patient documents
      query = `
        SELECT 
          document_id,
          file_name,
          mime_type,
          file_size,
          upload_date,
          created_by
        FROM clara_documents
        WHERE patient_id = ? AND is_deleted = 0
        ORDER BY upload_date DESC
      `;
      const result = runQuery(query, [patientId]);
      if (result.success && result.data.length > 0) {
        docs = result.data.map(doc => ({
          id: doc.document_id,
          filename: doc.file_name,
          type: doc.mime_type,
          size: doc.file_size,
          createdAt: doc.upload_date,
          uploadedBy: doc.created_by,
          source: 'CLARA'
        }));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        patientId,
        source: isMimic ? 'MIMIC' : 'CLARA',
        documents: docs,
        count: docs.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Patient documents list error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
