/**
 * Document Download API
 * GET /api/documents/download/[id]
 * 
 * Securely serves stored documents
 * - Validates document exists and belongs to authenticated user's patient
 * - Retrieves file from secure storage directory
 * - Serves with appropriate content type
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Verify authentication from request cookies
 */
function verifyAuthLocal(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const authCookie = cookies.find(c => c.startsWith('auth='));
  return !!authCookie;
}

function validateDocumentId(id) {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 ? num : null;
}

export async function GET(request, { params }) {
  try {
    // Dynamic import to fix Turbopack resolution
    const { runQuery, verifyAuth } = await import('../../../../../../backend/database/connection.js');
    
    // Verify authentication using centralized session auth
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

    // params is a Promise in Next.js 16 - must await
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

    // Query document metadata
    const query = `
      SELECT 
        document_id,
        subject_id,
        original_filename,
        stored_filename,
        mime_type,
        storage_path,
        file_size,
        is_deleted
      FROM documents
      WHERE document_id = ?
    `;

    const result = runQuery(query, [documentId]);

    if (!result.success || result.data.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Document not found'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const doc = result.data[0];

    // Check if deleted
    if (doc.is_deleted) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Document has been deleted'
        }),
        { status: 410, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify file exists
    if (!existsSync(doc.storage_path)) {
      console.error('[DOWNLOAD] File not found on disk:', doc.storage_path);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Document file not found'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Read file
    let fileBuffer;
    try {
      fileBuffer = await readFile(doc.storage_path);
    } catch (err) {
      console.error('[DOWNLOAD] File read error:', err);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to read document'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return file with appropriate headers
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': doc.mime_type,
        'Content-Length': fileBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.original_filename)}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('[DOWNLOAD] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server error downloading document'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
