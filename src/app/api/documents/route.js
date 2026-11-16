/**
 * Documents API
 * GET /api/documents?patientId=<id> - List documents for patient
 */

function validatePatientId(id) {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 ? num : null;
}

export async function GET(request) {
  const { runQuery, verifyAuth } = await import('../../../../backend/database/connection.js');
  
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

    const { searchParams } = new URL(request.url);
    const patientIdStr = searchParams.get('patientId');

    if (!patientIdStr) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing patientId parameter'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const patientId = validatePatientId(patientIdStr);
    if (!patientId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid patient ID'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Query documents for patient (only non-deleted)
    const query = `
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

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Format response
    const documents = result.data.map(doc => ({
      id: doc.document_id,
      filename: doc.original_filename,
      type: doc.mime_type,
      size: doc.file_size,
      createdAt: doc.created_at,
      uploadedBy: doc.uploaded_by,
      sizeFormatted: formatFileSize(doc.file_size)
    }));

    return new Response(
      JSON.stringify({
        success: true,
        patientId,
        documentCount: documents.length,
        documents
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Document list error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server error fetching documents'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
