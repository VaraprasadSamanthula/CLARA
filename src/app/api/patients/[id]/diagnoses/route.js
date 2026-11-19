/**
 * CLARA Patient Diagnoses API
 * GET /api/patients/[id]/diagnoses - Retrieve diagnoses
 * POST /api/patients/[id]/diagnoses - Add diagnosis
 * PUT /api/patients/[id]/diagnoses/[diagId] - Update diagnosis
 * DELETE /api/patients/[id]/diagnoses/[diagId] - Delete diagnosis
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

    // Get diagnoses
    const result = runQuery(
      `SELECT 
        diagnosis_id,
        patient_id,
        diagnosis_name,
        description,
        diagnosis_date,
        status,
        notes,
        created_at,
        updated_at
       FROM clara_diagnoses
       WHERE patient_id = ?
       ORDER BY diagnosis_date DESC`,
      [patientId]
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to retrieve diagnoses' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        diagnoses: result.data,
        count: result.data.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Diagnoses GET error:', error);
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
    const { diagnosis_name, description, diagnosis_date, status, notes } = body;

    if (!diagnosis_name || !diagnosis_date) {
      return new Response(
        JSON.stringify({ success: false, error: 'Diagnosis name and date are required' }),
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

    // Insert diagnosis
    const result = runQuery(
      `INSERT INTO clara_diagnoses (
        patient_id, diagnosis_name, description, diagnosis_date, status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        diagnosis_name.trim(),
        description || null,
        diagnosis_date,
        status || 'unknown',
        notes || null,
        session.email || 'unknown'
      ]
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error || 'Failed to save diagnosis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Diagnosis added successfully',
        diagnosis_id: result.lastInsertRowid
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Diagnoses POST error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
