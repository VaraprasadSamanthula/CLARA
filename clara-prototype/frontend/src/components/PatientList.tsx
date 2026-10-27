/**
 * Patient list component.
 */

import { useState, useEffect } from 'react';
import type { PatientListItem } from '../types';
import { apiClient } from '../services/api';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorBox } from './ErrorBox';

interface PatientListProps {
  onSelectPatient: (patientId: string) => void;
}

export function PatientList({ onSelectPatient }: PatientListProps) {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPatients() {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.listPatients();
        setPatients(response.patients);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load patients');
      } finally {
        setLoading(false);
      }
    }

    loadPatients();
  }, []);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return <ErrorBox error={error} title="Failed to Load Patients" />;
  }

  if (patients.length === 0) {
    return (
      <div className="empty-state">
        <p>No patients found.</p>
      </div>
    );
  }

  return (
    <div className="list">
      {patients.map((patient) => (
        <div
          key={patient.patient_id}
          className="list-item"
          onClick={() => onSelectPatient(patient.patient_id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSelectPatient(patient.patient_id);
            }
          }}
        >
          <div className="list-item-title">{patient.display_name}</div>
          <div className="list-item-subtitle">
            ID: {patient.patient_id} • Age: {new Date().getFullYear() - patient.birth_year} • Sex: {patient.sex === 'M' ? 'Male' : 'Female'} •{' '}
            {patient.encounter_count} encounter{patient.encounter_count !== 1 ? 's' : ''}
          </div>
        </div>
      ))}
    </div>
  );
}
