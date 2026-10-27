/**
 * Patient detail component with demographics, encounters, medications, and labs.
 */

import { useState, useEffect } from 'react';
import type { PatientDetailResponse } from '../types';
import { apiClient } from '../services/api';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorBox } from './ErrorBox';

interface PatientDetailProps {
  patientId: string;
  onBack: () => void;
}

export function PatientDetail({ patientId, onBack }: PatientDetailProps) {
  const [detail, setDetail] = useState<PatientDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDetail() {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getPatientDetail(patientId);
        setDetail(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load patient');
      } finally {
        setLoading(false);
      }
    }

    loadDetail();
  }, [patientId]);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <>
        <div className="nav">
          <button onClick={onBack}>← Back to Patients</button>
        </div>
        <ErrorBox error={error} title="Failed to Load Patient" />
      </>
    );
  }

  if (!detail) {
    return (
      <>
        <div className="nav">
          <button onClick={onBack}>← Back to Patients</button>
        </div>
        <div className="empty-state">
          <p>Patient not found.</p>
        </div>
      </>
    );
  }

  const patient = detail.patient;
  const age = new Date().getFullYear() - patient.birth_year;

  return (
    <>
      <div className="nav">
        <button onClick={onBack}>← Back to Patients</button>
      </div>

      <div className="card">
        <h3>Patient Demographics</h3>
        <table className="table">
          <tbody>
            <tr>
              <td><strong>Name</strong></td>
              <td>{patient.display_name}</td>
            </tr>
            <tr>
              <td><strong>ID</strong></td>
              <td>{patient.patient_id}</td>
            </tr>
            <tr>
              <td><strong>Birth Year</strong></td>
              <td>{patient.birth_year}</td>
            </tr>
            <tr>
              <td><strong>Age</strong></td>
              <td>{age}</td>
            </tr>
            <tr>
              <td><strong>Sex</strong></td>
              <td>{patient.sex === 'M' ? 'Male' : 'Female'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Recent Encounters ({detail.recent_encounters.length})</h3>
        {detail.recent_encounters.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px' }}>
            <p>No encounters recorded.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {detail.recent_encounters.map((enc) => (
                  <tr key={enc.encounter_id}>
                    <td>{enc.encounter_date}</td>
                    <td>{enc.encounter_type}</td>
                    <td>{enc.summary || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Active Medications ({detail.active_medications.length})</h3>
        {detail.active_medications.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px' }}>
            <p>No active medications.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Medication</th>
                  <th>Dose</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {detail.active_medications.map((med) => (
                  <tr key={med.medication_id}>
                    <td>{med.medication_name}</td>
                    <td>{med.dose_text}</td>
                    <td>{med.status}</td>
                    <td>{med.recorded_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Recent Labs ({detail.recent_labs.length})</h3>
        {detail.recent_labs.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px' }}>
            <p>No lab results.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Value</th>
                  <th>Unit</th>
                  <th>Reference Range</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {detail.recent_labs.map((lab) => (
                  <tr key={lab.lab_id}>
                    <td>{lab.test_name}</td>
                    <td>{lab.value}</td>
                    <td>{lab.unit}</td>
                    <td>{lab.reference_range_text || '—'}</td>
                    <td>{lab.recorded_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
