/**
 * CLARA Patient Medications API
 * GET /api/patients/[id]/medications - Retrieve medications
 * POST /api/patients/[id]/medications - Add medication
 * PUT /api/patients/[id]/medications/[medId] - Update medication
 * DELETE /api/patients/[id]/medications/[medId] - Delete medication
 */

import { verifyAuth, runQuery } from '@/backend/database/connection.js';

export async function GET(request, { params }) {
  try {
    const session = verifyAuth(request);
    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id, 10);

    if (isNaN(patientId) || patientId <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid patient ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify patient exists
    const patient = runQuery(
      'SELECT patient_id FROM patient_registry WHERE patient_id = ?',
      [patientId]
    );

    if (!patient.success || patient.data.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Patient not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get medications
    const result = runQuery(
      `SELECT 
        medication_id,
        patient_id,
        medication_name,
        dosage,
        route,
        frequency,
        start_date,
        end_date,
        status,
        notes,
        created_at,
        updated_at
       FROM clara_medications
       WHERE patient_id = ?
       ORDER BY start_date DESC`,
      [patientId]
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to retrieve medications' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        medications: result.data,
        count: result.data.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Medications GET error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const session = verifyAuth(request);
    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id, 10);

    if (isNaN(patientId) || patientId <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid patient ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();

    // Validate required fields
    const { medication_name, dosage, route, frequency, start_date, end_date, status, notes } = body;

    if (!medication_name || !start_date) {
      return new Response(
        JSON.stringify({ success: false, error: 'Medication name and start date are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify patient exists
    const patient = runQuery(
      'SELECT patient_id FROM patient_registry WHERE patient_id = ?',
      [patientId]
    );

    if (!patient.success || patient.data.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Patient not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert medication
    const result = runQuery(
      `INSERT INTO clara_medications (
        patient_id, medication_name, dosage, route, frequency, 
        start_date, end_date, status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        medication_name.trim(),
        dosage || null,
        route || null,
        frequency || null,
        start_date,
        end_date || null,
        status || 'unknown',
        notes || null,
        session.email || 'unknown'
      ]
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error || 'Failed to save medication' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Medication added successfully',
        medication_id: result.lastInsertRowid
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Medications POST error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
