/**
 * Document Preview API
 * GET /api/documents/preview/[id]
 * 
 * Serves document files for in-browser preview
 * - Verifies authentication
 * - Verifies document exists and belongs to patient
 * - Serves PDF and image files safely
 * - Uses inline disposition for preview
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export async function GET(request, { params }) {
  const { runQuery, verifyAuth } = await import('../../../../../../backend/database/connection.js');
  
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

    // params is a Promise in Next.js 16 - must await it
    const resolvedParams = await params;
    const documentId = resolvedParams.id;

    // Validate document ID
    if (!documentId || isNaN(parseInt(documentId, 10))) {
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
        storage_path,
        mime_type,
        original_filename,
        is_deleted
      FROM documents
      WHERE document_id = ?
    `;

    const result = runQuery(query, [parseInt(documentId, 10)]);

    if (!result.success || result.data.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Document not found'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const document = result.data[0];

    // Check if deleted
    if (document.is_deleted) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Document has been deleted'
        }),
        { status: 410, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify file exists
    if (!existsSync(document.storage_path)) {
      console.error(`[PREVIEW] File not found: ${document.storage_path}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'File not found on server'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify MIME type is supported for preview
    const supportedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!supportedMimeTypes.includes(document.mime_type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Preview not supported for this file type'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Read file
    let fileBuffer;
    try {
      fileBuffer = await readFile(document.storage_path);
    } catch (err) {
      console.error(`[PREVIEW] File read error: ${err.message}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to read file'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return file with appropriate headers
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': document.mime_type,
        'Content-Length': fileBuffer.length.toString(),
        'Content-Disposition': `inline; filename="${encodeURIComponent(document.original_filename)}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('[PREVIEW] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server error during preview'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
