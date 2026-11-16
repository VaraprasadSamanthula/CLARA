/**
 * Patient Document Upload API
 * POST /api/patients/[id]/documents/upload
 * 
 * Handles document uploads for both MIMIC and new patients
 * - MIMIC: stores in `documents` table with subject_id
 * - New: stores in `clara_documents` table with patient_id and CLARA:X:Y ID format
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = join(process.cwd(), 'private', 'documents');
const ALLOWED_MIMETYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function validatePatientId(id) {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 ? num : null;
}

function isPatientMimic(patientId) {
  return patientId >= 10000000;
}

function generateSafeFilename(originalFilename) {
  const extension = originalFilename.split('.').pop().toLowerCase();
  const uuid = randomUUID().replace(/-/g, '').substring(0, 12);
  return `${Date.now()}_${uuid}.${extension}`;
}

function getFileExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext) ? ext : null;
}

async function patientExists(patientId, runQuery, isMimic) {
  const table = isMimic ? 'patients' : 'patient_registry';
  const idField = isMimic ? 'subject_id' : 'patient_id';
  const query = `SELECT ${idField} FROM ${table} WHERE ${idField} = ?`;
  const result = runQuery(query, [patientId]);
  return result.success && result.data.length > 0;
}

export async function POST(request, { params }) {
  try {
    const { runQuery, runWriteQuery, verifyAuth } = await import('../../../../../../backend/database/connection.js');
    
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
    
    // Check if patient exists
    const exists = await patientExists(patientId, runQuery, isMimic);
    if (!exists) {
      return new Response(
        JSON.stringify({ success: false, error: `Patient ${patientId} not found` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    if (!ALLOWED_MIMETYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'File type not allowed',
          hint: `Allowed: ${ALLOWED_MIMETYPES.join(', ')}`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file extension
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

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'File too large',
          hint: `Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate safe filename and save file
    const safeFilename = generateSafeFilename(file.name);
    const filePath = join(UPLOAD_DIR, safeFilename);

    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
      const buffer = await file.arrayBuffer();
      await writeFile(filePath, Buffer.from(buffer));
    } catch (err) {
      console.error('[API] File write error:', err);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save file' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Store metadata in database
    let docId, insertQuery, insertParams;
    
    if (isMimic) {
      // MIMIC document
      docId = randomUUID();
      insertQuery = `
        INSERT INTO documents (
          document_id, subject_id, original_filename, stored_filename,
          mime_type, file_size, created_at, uploaded_by, is_deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `;
      insertParams = [
        docId,
        patientId,
        file.name,
        safeFilename,
        file.type,
        file.size,
        Math.floor(Date.now() / 1000),
        session.email || session.user_id || 'system'
      ];
    } else {
      // New patient document - CLARA:patient_id:sequence format
      // Get next sequence number
      const countResult = runQuery(
        'SELECT COUNT(*) as cnt FROM clara_documents WHERE patient_id = ?',
        [patientId]
      );
      const sequence = countResult.success ? (countResult.data[0].cnt + 1) : 1;
      
      docId = `CLARA:${patientId}:${sequence}`;
      insertQuery = `
        INSERT INTO clara_documents (
          document_id, patient_id, file_name, file_path,
          mime_type, file_size, upload_date, created_by, is_deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `;
      insertParams = [
        docId,
        patientId,
        file.name,
        safeFilename,
        file.type,
        file.size,
        new Date().toISOString(),
        session.email || session.user_id || 'system'
      ];
    }

    const insertResult = runWriteQuery(insertQuery, insertParams);
    if (!insertResult.success) {
      console.error('[API] Document insert error:', insertResult.error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to store document metadata' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        document: {
          id: docId,
          filename: file.name,
          type: file.type,
          size: file.size,
          createdAt: Math.floor(Date.now() / 1000)
        }
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Patient document upload error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Server error during upload' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
