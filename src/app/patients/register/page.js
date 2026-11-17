'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, AlertCircle, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function RegisterPatientPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    address: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDuplicateWarning('');
    setLoading(true);

    try {
      if (!formData.full_name.trim()) {
        setError('Patient name is required');
        setLoading(false);
        return;
      }

      if (formData.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(formData.date_of_birth)) {
        setError('Date of birth must be in YYYY-MM-DD format');
        setLoading(false);
        return;
      }

      if (formData.gender && !['M', 'F', 'Other'].includes(formData.gender)) {
        setError('Please select a valid gender');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/patients/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409 && result.existing_patient_id) {
          setDuplicateWarning(
            `A patient with this name and date of birth already exists (ID: ${result.existing_patient_id}). ` +
            'Please verify or contact an administrator.'
          );
        } else {
          setError(result.error || 'Failed to register patient');
        }
        setLoading(false);
        return;
      }

      setSuccess(`✓ Patient registered successfully! ID: ${result.patient_id}`);
      
      setFormData({
        full_name: '',
        date_of_birth: '',
        gender: '',
        phone: '',
        email: '',
        address: ''
      });

      setTimeout(() => {
        router.push(`/patients/${result.patient_id}`);
      }, 1500);

    } catch (err) {
      setError(err.message || 'An error occurred while registering the patient');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFormData({ full_name: '', date_of_birth: '', gender: '', phone: '', email: '', address: '' });
    setError('');
    setSuccess('');
    setDuplicateWarning('');
  };

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--spacing-lg)', gap: 'var(--spacing-lg)', overflow: 'auto' }}>
        {/* Header */}
        <div>
          <button 
            onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>Patient Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Register new patients and manage patient information</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <a href="/patients/register" style={{ padding: 'var(--spacing-md)', fontWeight: 500, fontSize: '0.875rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary)', textDecoration: 'none', marginBottom: '-1px' }}>
            Manual Registration
          </a>
          <a href="/patients/import" style={{ padding: 'var(--spacing-md)', fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-secondary)', borderBottom: '2px solid transparent', textDecoration: 'none', transition: 'all 200ms ease', marginBottom: '-1px' }}>
            Bulk Import (CSV/Excel)
          </a>
        </div>

        {/* Form Container */}
        <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Register New Patient</h2>
              <p className="card-subtitle">Enter patient information to create a new record</p>
            </div>

            {error && (
              <div style={{
                marginBottom: 'var(--spacing-lg)',
                padding: 'var(--spacing-md)',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                gap: 'var(--spacing-md)',
                alignItems: 'flex-start'
              }}>
                <AlertCircle size={18} style={{ color: 'var(--error)', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{error}</p>
              </div>
            )}
            
            {duplicateWarning && (
              <div style={{
                marginBottom: 'var(--spacing-lg)',
                padding: 'var(--spacing-md)',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                gap: 'var(--spacing-md)',
                alignItems: 'flex-start'
              }}>
                <AlertTriangle size={18} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ color: '#92400e', fontSize: '0.875rem' }}>{duplicateWarning}</p>
              </div>
            )}
            
            {success && (
              <div style={{
                marginBottom: 'var(--spacing-lg)',
                padding: 'var(--spacing-md)',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                gap: 'var(--spacing-md)',
                alignItems: 'flex-start'
              }}>
                <CheckCircle size={18} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ color: '#065f46', fontSize: '0.875rem' }}>{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
              <div className="form-group">
                <label className="form-label">Patient Name <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} placeholder="John Doe" className="form-input" required disabled={loading} />
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="form-input" disabled={loading} />
                <p className="form-hint">Format: YYYY-MM-DD (helps prevent duplicates)</p>
              </div>

              <div className="form-group">
                <label className="form-label">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="form-select" disabled={loading}>
                  <option value="">Select Gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="(555) 123-4567" className="form-input" disabled={loading} />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="patient@example.com" className="form-input" disabled={loading} />
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange} placeholder="123 Main St, Anytown, ST 12345" rows="3" className="form-textarea" disabled={loading}></textarea>
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-md)', paddingTop: 'var(--spacing-lg)' }}>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
                  {loading ? 'Registering...' : 'Register Patient'}
                </button>
                <button type="button" disabled={loading} onClick={handleClear} className="btn btn-secondary" style={{ flex: 1 }}>
                  Clear
                </button>
              </div>
            </form>
          </div>

          {/* Info Card */}
          <div style={{ marginTop: 'var(--spacing-2xl)', padding: 'var(--spacing-lg)', background: 'var(--primary-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--primary-200)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--spacing-sm)' }}>About Patient Registration</h3>
            <ul style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: 'var(--spacing-lg)', margin: 0 }}>
              <li style={{ marginBottom: 'var(--spacing-xs)' }}>Patient name is required; all other fields are optional</li>
              <li style={{ marginBottom: 'var(--spacing-xs)' }}>Date of birth helps prevent duplicate registrations</li>
              <li style={{ marginBottom: 'var(--spacing-xs)' }}>Each patient receives a unique ID for document uploads</li>
              <li>You can import multiple patients via CSV/Excel</li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
