'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function PatientProfilePage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id;
  
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPatientProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/patients/${patientId}`, {
          credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || 'Patient not found');
          return;
        }

        if (data.patient) {
          // Map API response field names to component expectations
          const mappedPatient = {
            patient_id: data.patient.id,
            patient_source: data.patient.source,
            full_name: data.patient.fullName || null,
            gender: data.patient.gender || null,
            date_of_birth: data.patient.dateOfBirth || null,
            phone: data.patient.phone || null,
            email: data.patient.email || null,
            address: data.patient.address || null,
            created_at: data.patient.createdAt || new Date().toISOString(),
            created_by: data.patient.createdBy || null,
            age: data.patient.age
          };
          setPatient(mappedPatient);
        } else {
          setError('Patient not found');
        }
      } catch (err) {
        setError(err.message || 'Failed to load patient profile');
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchPatientProfile();
    }
  }, [patientId]);

  if (loading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--spacing-2xl)', justifyContent: 'center', alignItems: 'center' }}>
          <Loader size={40} style={{ color: 'var(--primary)' }} className="loading" />
          <p style={{ marginTop: 'var(--spacing-lg)', color: 'var(--text-secondary)' }}>Loading patient profile...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !patient) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--spacing-2xl)' }}>
          <button 
            onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '15px', fontWeight: 600 }}
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-2xl)',
            display: 'flex',
            gap: 'var(--spacing-lg)',
            alignItems: 'flex-start'
          }}>
            <AlertCircle size={24} style={{ color: 'var(--error)', flexShrink: 0 }} />
            <div>
              <h3 style={{ color: 'var(--error)', fontWeight: 700, fontSize: '18px', marginBottom: 'var(--spacing-md)' }}>Patient Not Found</h3>
              <p style={{ color: 'var(--error)', fontSize: '15px', lineHeight: 1.6 }}>
                {error || 'The patient record could not be found. Please check the patient ID and try again.'}
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--spacing-2xl)', gap: 'var(--spacing-lg)', overflow: 'auto' }}>
        {/* Header */}
        <button 
          onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '15px', fontWeight: 600 }}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        {/* Success Message */}
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-lg)',
          display: 'flex',
          gap: 'var(--spacing-lg)',
          alignItems: 'flex-start',
          marginBottom: 'var(--spacing-lg)'
        }}>
          <CheckCircle size={20} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ color: '#065f46', fontSize: '15px', fontWeight: 600, margin: 0 }}>Patient Registered Successfully</p>
            <p style={{ color: '#065f46', fontSize: '14px', margin: '4px 0 0 0' }}>
              Patient ID: <code style={{ fontFamily: 'monospace', fontWeight: 600 }}>{patient.patient_id}</code>
            </p>
          </div>
        </div>

        {/* Patient Profile Card */}
        <div className="card">
          <div className="card-header">
            <h1 className="card-title">Patient Profile</h1>
            <p className="card-subtitle">Complete patient information and demographics</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-2xl)' }}>
            {/* Basic Information */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--spacing-lg)' }}>Demographics</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--spacing-sm)' }}>Patient Name</p>
                  <p style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {patient.full_name || '—'}
                  </p>
                </div>

                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--spacing-sm)' }}>Patient ID</p>
                  <code style={{ fontSize: '17px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>
                    {patient.patient_id}
                  </code>
                </div>

                {patient.date_of_birth && (
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--spacing-sm)' }}>Date of Birth</p>
                    <p style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
                      {new Date(patient.date_of_birth).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                )}

                {patient.gender && (
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--spacing-sm)' }}>Gender</p>
                    <p style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
                      {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--spacing-lg)' }}>Contact Information</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                {patient.phone ? (
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--spacing-sm)' }}>Phone</p>
                    <p style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
                      {patient.phone}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--spacing-sm)' }}>Phone</p>
                    <p style={{ fontSize: '16px', color: 'var(--text-tertiary)' }}>Not provided</p>
                  </div>
                )}

                {patient.email ? (
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--spacing-sm)' }}>Email</p>
                    <p style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
                      {patient.email}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--spacing-sm)' }}>Email</p>
                    <p style={{ fontSize: '16px', color: 'var(--text-tertiary)' }}>Not provided</p>
                  </div>
                )}

                {patient.address ? (
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--spacing-sm)' }}>Address</p>
                    <p style={{ fontSize: '16px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                      {patient.address}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--spacing-sm)' }}>Address</p>
                    <p style={{ fontSize: '16px', color: 'var(--text-tertiary)' }}>Not provided</p>
                  </div>
                )}
              </div>
            </div>

            {/* Record Information */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--spacing-lg)' }}>Record Information</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--spacing-sm)' }}>Patient Source</p>
                  <div style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: patient.patient_source === 'MANUAL' ? '#ecfdf5' : '#e0e7ff',
                    color: patient.patient_source === 'MANUAL' ? '#065f46' : '#312e81',
                    fontSize: '14px',
                    fontWeight: 600
                  }}>
                    {patient.patient_source === 'MANUAL' ? '✓' : '📋'}
                    {patient.patient_source}
                  </div>
                </div>

                {patient.created_at && (
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--spacing-sm)' }}>Created</p>
                    <p style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
                      {new Date(patient.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}

                {patient.created_by && (
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--spacing-sm)' }}>Created By</p>
                    <p style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
                      {patient.created_by}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div style={{ 
          padding: 'var(--spacing-2xl)',
          background: 'var(--primary-50)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--primary-200)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--spacing-lg)' }}>Next Steps</h3>
          <ul style={{ 
            fontSize: '15px', 
            color: 'var(--text-secondary)',
            margin: 0,
            paddingLeft: 'var(--spacing-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-md)',
            lineHeight: 1.7
          }}>
            <li>You can now search for this patient using the Patient Search feature</li>
            <li>Access the patient's clinical data through the Clinical Chat interface</li>
            <li>Upload and manage patient documents in the Documents section</li>
            <li>Query the patient's medical history, medications, labs, and more</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn btn-primary"
            style={{ flex: 1, minWidth: '200px' }}
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => router.push(`/dashboard?tab=chat&patient=${patientId}`)}
            className="btn btn-secondary"
            style={{ flex: 1, minWidth: '200px' }}
          >
            View Patient Chat
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
