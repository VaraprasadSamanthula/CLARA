"use client";
import { useState, useEffect } from 'react';
import { ArrowLeft, Loader, AlertCircle, FileText } from 'lucide-react';
import DocumentManager from './DocumentManager';

export default function PatientProfile({ patientId, onBack }) {
  const [patient, setPatient] = useState(null);
  const [clinical, setClinical] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('demographics');

  useEffect(() => {
    fetchPatientProfile();
  }, [patientId]);

  const fetchPatientProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load patient profile');
        return;
      }

      setPatient(data.patient);
      setClinical(data.clinical);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 'var(--spacing-2xl)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <Loader size={32} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading patient profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', marginBottom: 'var(--spacing-lg)', padding: 0 }}
        >
          <ArrowLeft size={18} />
          Back to Search
        </button>
        <div style={{ padding: 'var(--spacing-lg)', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-lg)', display: 'flex', gap: 'var(--spacing-md)' }}>
          <AlertCircle size={18} style={{ color: 'var(--error)', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2xl)' }}>
      {/* Back Button */}
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', padding: 0 }}
      >
        <ArrowLeft size={18} />
        Back to Search
      </button>

      {/* Patient Header Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--spacing-sm)', color: 'var(--primary)' }}>Patient #{patient.id}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{patient.source}</span>
              {patient.fullName && <p style={{ color: 'var(--text-secondary)' }}>{patient.fullName}</p>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-xs)' }}><span style={{ fontWeight: 600 }}>Gender:</span> {patient.gender}</p>
            {patient.age !== null && patient.age !== undefined && <p style={{ color: 'var(--text-primary)' }}><span style={{ fontWeight: 600 }}>Age:</span> {patient.age}</p>}
          </div>
        </div>

        {patient.dateOfDeath && (
          <div style={{ padding: 'var(--spacing-md)', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-lg)', color: '#92400e', fontSize: '0.875rem', display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
            <span>⚠</span>
            <span>Patient deceased: {patient.dateOfDeath}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--spacing-md)', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {[
          { id: 'demographics', label: 'Demographics' },
          ...(patient.source === 'MIMIC' ? [
            { id: 'admissions', label: `Admissions (${clinical?.admissions?.count || 0})` },
            { id: 'diagnoses', label: `Diagnoses (${clinical?.diagnoses?.count || 0})` },
            { id: 'prescriptions', label: `Prescriptions (${clinical?.prescriptions?.count || 0})` },
            { id: 'labs', label: `Lab Results (${clinical?.labResults?.count || 0})` },
            { id: 'icu', label: `ICU Stays (${clinical?.icuStays?.count || 0})` },
          ] : []),
          { id: 'documents', label: 'Documents' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: 'var(--spacing-md)',
              fontWeight: 500,
              fontSize: '0.875rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'all 200ms ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'demographics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <p style={{ color: 'var(--text-primary)' }}><span style={{ fontWeight: 600 }}>Patient ID:</span> {patient.id}</p>
            <p style={{ color: 'var(--text-primary)' }}><span style={{ fontWeight: 600 }}>Source:</span> {patient.source}</p>
            {patient.fullName && <p style={{ color: 'var(--text-primary)' }}><span style={{ fontWeight: 600 }}>Name:</span> {patient.fullName}</p>}
            <p style={{ color: 'var(--text-primary)' }}><span style={{ fontWeight: 600 }}>Gender:</span> {patient.gender}</p>
            {patient.age !== null && patient.age !== undefined && <p style={{ color: 'var(--text-primary)' }}><span style={{ fontWeight: 600 }}>Age:</span> {patient.age}</p>}
            {patient.dateOfBirth && <p style={{ color: 'var(--text-primary)' }}><span style={{ fontWeight: 600 }}>Date of Birth:</span> {new Date(patient.dateOfBirth).toLocaleDateString()}</p>}
            {patient.phone && <p style={{ color: 'var(--text-primary)' }}><span style={{ fontWeight: 600 }}>Phone:</span> {patient.phone}</p>}
            {patient.email && <p style={{ color: 'var(--text-primary)' }}><span style={{ fontWeight: 600 }}>Email:</span> {patient.email}</p>}
            {patient.yearGroup && <p style={{ color: 'var(--text-primary)' }}><span style={{ fontWeight: 600 }}>Year Group:</span> {patient.yearGroup}</p>}
            {patient.source === 'MIMIC' && !clinical && (
              <p style={{ color: 'var(--warning)', fontSize: '0.875rem', marginTop: 'var(--spacing-lg)' }}>No clinical history available</p>
            )}
          </div>
        )}

        {activeTab === 'admissions' && patient.source === 'MIMIC' && (
          <AdminissionsTab admissions={clinical?.admissions?.records || []} />
        )}

        {activeTab === 'diagnoses' && patient.source === 'MIMIC' && (
          <DiagnosesTab diagnoses={clinical?.diagnoses?.records || []} />
        )}

        {activeTab === 'prescriptions' && patient.source === 'MIMIC' && (
          <PrescriptionsTab prescriptions={clinical?.prescriptions?.records || []} />
        )}

        {activeTab === 'labs' && patient.source === 'MIMIC' && (
          <LabsTab labs={clinical?.labResults?.records || []} />
        )}

        {activeTab === 'icu' && patient.source === 'MIMIC' && (
          <ICUTab icu={clinical?.icuStays?.records || []} />
        )}

        {activeTab === 'documents' && (
          <DocumentManager patientId={patientId} onDocumentUploaded={fetchPatientProfile} />
        )}
      </div>
    </div>
  );
}

function AdminissionsTab({ admissions }) {
  if (!admissions || admissions.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>No admission records found.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {admissions.map((adm, idx) => (
        <div key={idx} style={{ padding: 'var(--spacing-md)', background: 'var(--background-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>Admission #{idx + 1}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Admit: {new Date(adm.admittime).toLocaleDateString()}</p>
          {adm.dischtime && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Discharge: {new Date(adm.dischtime).toLocaleDateString()}</p>}
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Type: {adm.admission_type}</p>
        </div>
      ))}
    </div>
  );
}

function DiagnosesTab({ diagnoses }) {
  if (!diagnoses || diagnoses.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>No diagnosis records found.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
      {diagnoses.map((diag, idx) => (
        <div key={idx} style={{ padding: 'var(--spacing-md)', background: 'var(--background-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
          <span style={{ fontWeight: 600 }}>{diag.icd_code}</span> - {diag.long_title || 'N/A'}
        </div>
      ))}
    </div>
  );
}

function PrescriptionsTab({ prescriptions }) {
  if (!prescriptions || prescriptions.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>No prescription records found.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', maxHeight: '400px', overflowY: 'auto' }}>
      {prescriptions.map((rx, idx) => (
        <div key={idx} style={{ padding: 'var(--spacing-md)', background: 'var(--background-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>{rx.drug}</p>
          {rx.starttime && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Start: {new Date(rx.starttime).toLocaleDateString()}</p>}
          {rx.dose_val_rx && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Dose: {rx.dose_val_rx} {rx.dose_unit_rx}</p>}
          {rx.route && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Route: {rx.route}</p>}
        </div>
      ))}
    </div>
  );
}

function LabsTab({ labs }) {
  if (!labs || labs.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>No lab results found.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', maxHeight: '400px', overflowY: 'auto' }}>
      {labs.map((lab, idx) => (
        <div key={idx} style={{ padding: 'var(--spacing-md)', background: 'var(--background-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>{lab.test_name || lab.itemid}</p>
          {lab.value && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Value: {lab.value}</p>}
          {lab.charttime && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Date: {new Date(lab.charttime).toLocaleDateString()}</p>}
        </div>
      ))}
    </div>
  );
}

function ICUTab({ icu }) {
  if (!icu || icu.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>No ICU stays found.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {icu.map((stay, idx) => (
        <div key={idx} style={{ padding: 'var(--spacing-md)', background: 'var(--background-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>ICU Stay #{idx + 1}</p>
          {stay.first_careunit && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Unit: {stay.first_careunit}</p>}
          {stay.intime && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>In: {new Date(stay.intime).toLocaleDateString()}</p>}
          {stay.los && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>LOS: {stay.los} days</p>}
        </div>
      ))}
    </div>
  );
}
