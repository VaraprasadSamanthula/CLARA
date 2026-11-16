/**
 * Document Upload API
 * POST /api/documents/upload
 * 
 * Handles document uploads for patients
 * - Validates file type and size
 * - Generates unique filename
 * - Stores file on disk
 * - Stores metadata in database
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Configuration
const UPLOAD_DIR = join(process.cwd(), 'private', 'documents');
const ALLOWED_MIMETYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Validate patient ID
 */
function validatePatientId(id) {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 ? num : null;
}

/**
 * Check if patient exists
 */
function patientExists(patientId, runQuery) {
  const result = runQuery('SELECT subject_id FROM patients WHERE subject_id = ?', [patientId]);
  return result.success && result.data.length > 0;
}

/**
 * Generate unique safe filename
 */
function generateSafeFilename(originalFilename) {
  const extension = originalFilename.split('.').pop().toLowerCase();
  const uuid = randomUUID().replace(/-/g, '').substring(0, 12);
  return `${Date.now()}_${uuid}.${extension}`;
}

/**
 * Extract and validate file extension
 */
function getFileExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext) ? ext : null;
}

/**
 * Sanitize filename for display
 */
function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(request) {
  try {
    // Dynamic import to avoid Turbopack resolution issues
    const { runQuery, runWriteQuery, verifyAuth } = await import('../../../../../backend/database/connection.js');
    
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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');
    const patientIdStr = formData.get('patientId');

    // Validation: Required fields
    if (!file || !patientIdStr) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields',
          hint: 'Provide file and patientId'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validation: Patient ID
    const patientId = validatePatientId(patientIdStr);
    if (!patientId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid patient ID',
          hint: 'Patient ID must be a positive integer'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validation: Patient exists
    if (!patientExists(patientId, runQuery)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Patient ${patientId} not found`
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validation: File is actually a file
    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid file object'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validation: File MIME type
    if (!ALLOWED_MIMETYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'File type not allowed',
          hint: `Allowed types: ${ALLOWED_MIMETYPES.join(', ')}`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validation: File extension
    const extension = getFileExtension(file.name);
    if (!extension) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid file extension',
          hint: `Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validation: File size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'File too large',
          hint: `Maximum file size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Ensure upload directory exists
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
    } catch (err) {
      console.error('[UPLOAD] Directory creation failed:', err);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate safe filename
    const safeFilename = generateSafeFilename(file.name);
    const filePath = join(UPLOAD_DIR, safeFilename);

    // Convert file to buffer and write
    const buffer = await file.arrayBuffer();
    try {
      await writeFile(filePath, Buffer.from(buffer));
    } catch (err) {
      console.error('[UPLOAD] File write failed:', err);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to save file'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Store metadata in database
    const sanitized = sanitizeFilename(file.name);
    const insertQuery = `
      INSERT INTO documents (
        subject_id,
        original_filename,
        stored_filename,
        mime_type,
        file_size,
        storage_path,
        uploaded_by,
        document_type,
        document_date,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const params = [
      patientId,
      sanitized,
      safeFilename,
      file.type,
      file.size,
      filePath,
      session ? session.email : 'system',
      'medical_document',
      new Date().toISOString()
    ];

    const dbResult = runWriteQuery(insertQuery, params);
    
    if (!dbResult.success) {
      console.error('[UPLOAD] Database insert failed:', dbResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to store document metadata'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Document uploaded successfully',
        document: {
          originalFilename: sanitized,
          storedFilename: safeFilename,
          mimeType: file.type,
          fileSize: file.size,
          patientId: patientId,
          uploadedAt: new Date().toISOString()
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[UPLOAD] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server error during upload'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
