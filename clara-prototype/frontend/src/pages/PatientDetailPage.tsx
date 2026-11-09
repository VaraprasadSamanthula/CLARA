/**
 * PatientDetailPage: Full patient view with tabs.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Breadcrumb } from '../components/Breadcrumb';
import { PatientDetail } from '../components/PatientDetail';
import { Timeline } from '../components/Timeline';
import { LabChart } from '../components/LabChart';
import { SummaryBox } from '../components/SummaryBox';
import { DiagnosesPanel } from '../components/DiagnosesPanel';
import { ProceduresPanel } from '../components/ProceduresPanel';
import { AdmissionsPanel } from '../components/AdmissionsPanel';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBox } from '../components/ErrorBox';
import { apiClient } from '../services/api';
import { useLabTrendData } from '../hooks/useLabTrend';
import type { Patient, Diagnosis, Procedure, Admission } from '../types';

type TabType = 'overview' | 'timeline' | 'labs' | 'diagnoses' | 'procedures' | 'admissions' | 'summary';

export function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: hbA1cData } = useLabTrendData(patientId || null, 'HbA1c');

  useEffect(() => {
    async function loadPatient() {
      if (!patientId) {
        setError('Patient ID not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getPatientDetail(patientId);
        setPatient(response.patient);

        // For now, these would come from extended API endpoints
        // In Phase 3.5, we'll extend the API to return these
        setDiagnoses([]);
        setProcedures([]);
        setAdmissions([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load patient');
      } finally {
        setLoading(false);
      }
    }

    loadPatient();
  }, [patientId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !patient) {
    return (
      <div>
        <Header />
        <div className="container page">
          <ErrorBox error={error || 'Patient not found'} />
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Back to Patients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />

      <div className="container page">
        <Breadcrumb
          items={[
            { label: 'Patients', path: '/' },
            { label: patient.display_name },
          ]}
        />

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            borderBottom: '1px solid #eee',
            flexWrap: 'wrap',
          }}
        >
          {(['overview', 'timeline', 'labs', 'diagnoses', 'procedures', 'admissions', 'summary'] as TabType[]).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: activeTab === tab ? '#007bff' : 'transparent',
                  color: activeTab === tab ? 'white' : '#333',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px 4px 0 0',
                  fontSize: '14px',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            )
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <PatientDetail patientId={patientId!} onBack={() => navigate('/')} />}

        {activeTab === 'timeline' && <Timeline patientId={patientId!} />}

        {activeTab === 'labs' && hbA1cData && (
          <div>
            <LabChart data={hbA1cData} />
          </div>
        )}

        {activeTab === 'diagnoses' && <DiagnosesPanel diagnoses={diagnoses} />}

        {activeTab === 'procedures' && <ProceduresPanel procedures={procedures} />}

        {activeTab === 'admissions' && <AdmissionsPanel admissions={admissions} />}

        {activeTab === 'summary' && <SummaryBox patientId={patientId!} />}
      </div>
    </div>
  );
}
