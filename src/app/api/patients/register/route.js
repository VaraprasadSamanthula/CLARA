/**
 * POST /api/patients/register
 * 
 * Register a new patient manually into the patient_registry table.
 * 
 * Request body:
 * {
 *   full_name: string (required),
 *   date_of_birth: string (YYYY-MM-DD, optional),
 *   gender: string (M/F/Other, optional),
 *   phone: string (optional),
 *   email: string (optional),
 *   address: string (optional)
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   patient_id?: number,
 *   message?: string,
 *   error?: string
 * }
 */

import { verifyAuth, initializeDb } from '@/backend/database/connection.js';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.join(__filename, '../../../../');
const dbPath = path.join(projectRoot, 'database', 'clara.db');

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

    // Validate required fields
    const { full_name, date_of_birth, gender, phone, email, address } = body;

    if (!full_name || typeof full_name !== 'string' || full_name.trim() === '') {
      return new Response(
        JSON.stringify({ success: false, error: 'full_name is required and must be a non-empty string' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate optional fields
    if (date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
      return new Response(
        JSON.stringify({ success: false, error: 'date_of_birth must be in YYYY-MM-DD format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (gender && !['M', 'F', 'Other'].includes(gender)) {
      return new Response(
        JSON.stringify({ success: false, error: 'gender must be M, F, or Other' }),
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

    // Connect to database
    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');

    try {
      // Check for potential duplicates (concurrency-safe: atomic transaction)
      const duplicate = db.prepare(`
        SELECT patient_id, created_at 
        FROM patient_registry
        WHERE full_name = ? AND date_of_birth = ?
      `).get(full_name.trim(), date_of_birth || null);

      if (duplicate) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'A patient with this name and date of birth already exists',
            existing_patient_id: duplicate.patient_id,
            existing_created_at: duplicate.created_at
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Insert new patient into registry within a transaction
      const transaction = db.transaction((data) => {
        return db.prepare(`
          INSERT INTO patient_registry (
            patient_source,
            full_name,
            date_of_birth,
            gender,
            phone,
            email,
            address,
            created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'MANUAL',
          data.full_name,
          data.date_of_birth,
          data.gender,
          data.phone,
          data.email,
          data.address,
          data.created_by
        );
      });

      const result = transaction({
        full_name: full_name.trim(),
        date_of_birth: date_of_birth || null,
        gender: gender || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        created_by: session.email || 'unknown'
      });

      const patientId = result.lastInsertRowid;

      return new Response(
        JSON.stringify({
          success: true,
          patient_id: patientId,
          message: `Patient registered successfully with ID: ${patientId}`
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );

    } finally {
      db.close();
    }

  } catch (error) {
    console.error('[REGISTER_API] Error:', error);
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
