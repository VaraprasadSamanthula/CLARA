'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, AlertCircle, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function ImportPatientPage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [preview, setPreview] = useState(null);
  const [previewId, setPreviewId] = useState(null);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      if (!f.name.endsWith('.csv') && !f.name.endsWith('.xlsx')) {
        setError('Please select a CSV or Excel file');
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setError('File must be less than 5 MB');
        return;
      }
      setFile(f);
      setError('');
    }
  };

  const handlePreview = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    setPreview(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/patients/import/preview', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to preview import');
        setUploading(false);
        return;
      }

      setPreview(result);
      setPreviewId(result.preview_id);
      setPreviewing(true);
      setUploading(false);

    } catch (err) {
      setError(err.message || 'An error occurred');
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewId) return;

    setImporting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/patients/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview_id: previewId, skip_duplicates: true })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to import patients');
        setImporting(false);
        return;
      }

      setSuccess(`✓ Import successful! ${result.summary.inserted} patients imported.`);
      setPreview(null);
      setPreviewId(null);
      setFile(null);
      setImporting(false);
      setPreviewing(false);

      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err) {
      setError(err.message || 'An error occurred');
      setImporting(false);
    }
  };

  const downloadTemplate = async (format) => {
    try {
      const response = await fetch(`/api/patients/import/template?format=${format}`);
      
      if (!response.ok) {
        const error = await response.json();
        setError(error.error || `Failed to download ${format.toUpperCase()} template`);
        return;
      }

      const blob = await response.blob();
      
      let filename = format === 'csv' 
        ? 'CLARA_Patient_Import_Template.csv'
        : 'CLARA_Patient_Import_Template.xlsx';

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setError('');
    } catch (err) {
      setError(`Failed to download ${format.toUpperCase()} template: ${err.message}`);
    }
  };

  const downloadErrorReport = async () => {
    if (!previewId) return;

    try {
      const response = await fetch(`/api/patients/import/errors?preview_id=${previewId}`);

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || 'Failed to download error report');
        return;
      }

      const blob = await response.blob();
      const filename = `CLARA_Import_Errors_${previewId.substring(0, 8)}.csv`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setError('');
    } catch (err) {
      setError(`Failed to download error report: ${err.message}`);
    }
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
          <a href="/patients/register" style={{ padding: 'var(--spacing-md)', fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-secondary)', borderBottom: '2px solid transparent', textDecoration: 'none', transition: 'all 200ms ease', marginBottom: '-1px' }}>
            Manual Registration
          </a>
          <a href="/patients/import" style={{ padding: 'var(--spacing-md)', fontWeight: 500, fontSize: '0.875rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary)', textDecoration: 'none', marginBottom: '-1px' }}>
            Bulk Import (CSV/Excel)
          </a>
        </div>

        {/* Form Container */}
        <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Bulk Patient Import</h2>
              <p className="card-subtitle">Upload CSV or Excel file to import multiple patients</p>
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

            {!previewing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                {/* Template Download */}
                <div style={{ padding: 'var(--spacing-lg)', background: 'var(--primary-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--primary-200)' }}>
                  <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--spacing-sm)' }}>Step 1: Download Template</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>Download a template to ensure your file has the correct format</p>
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                    <button onClick={() => downloadTemplate('csv')} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
                      <Download size={16} />
                      CSV Template
                    </button>
                    <button onClick={() => downloadTemplate('xlsx')} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
                      <Download size={16} />
                      Excel Template
                    </button>
                  </div>
                </div>

                {/* File Selection */}
                <div style={{ padding: 'var(--spacing-lg)', background: 'var(--background-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                  <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--spacing-sm)' }}>Step 2: Select File</h3>
                  <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-2xl)', textAlign: 'center', cursor: 'pointer', transition: 'all 200ms ease' }}>
                    <input
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={handleFileSelect}
                      disabled={uploading}
                      style={{ display: 'none' }}
                      id="file-input"
                    />
                    <label htmlFor="file-input" style={{ display: 'block', cursor: 'pointer' }}>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                        {file ? `✓ ${file.name} (${(file.size / 1024).toFixed(0)} KB)` : 'Drag and drop or click to select CSV/Excel file'}
                      </p>
                      <button
                        type="button"
                        onClick={() => document.getElementById('file-input').click()}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.875rem' }}
                      >
                        Choose File
                      </button>
                    </label>
                  </div>
                </div>

                {/* Preview Button */}
                <button
                  onClick={handlePreview}
                  disabled={!file || uploading}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  {uploading ? 'Processing...' : 'Step 3: Preview Import'}
                </button>
              </div>
            ) : (
              // Preview Results
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                <h3 style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-primary)' }}>Import Preview</h3>

                {preview && (
                  <>
                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--spacing-md)' }}>
                      <div style={{ padding: 'var(--spacing-lg)', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--success)', marginBottom: 'var(--spacing-xs)' }}>{preview.valid_rows}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Valid Rows</div>
                      </div>
                      <div style={{ padding: 'var(--spacing-lg)', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--warning)', marginBottom: 'var(--spacing-xs)' }}>{preview.duplicate_rows}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Duplicates</div>
                      </div>
                      <div style={{ padding: 'var(--spacing-lg)', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--error)', marginBottom: 'var(--spacing-xs)' }}>{preview.invalid_rows}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Invalid</div>
                      </div>
                      <div style={{ padding: 'var(--spacing-lg)', background: 'var(--primary-50)', border: '1px solid var(--primary-200)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 'var(--spacing-xs)' }}>{preview.total_rows}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total</div>
                      </div>
                    </div>

                    {/* Sample Rows Table */}
                    {preview.rows && preview.rows.length > 0 && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: 'var(--background-secondary)', borderBottom: '1px solid var(--border)' }}>
                              <th style={{ padding: 'var(--spacing-md)', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Row</th>
                              <th style={{ padding: 'var(--spacing-md)', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Name</th>
                              <th style={{ padding: 'var(--spacing-md)', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>DOB</th>
                              <th style={{ padding: 'var(--spacing-md)', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.rows.slice(0, 10).map((row, idx) => {
                              let rowBg = 'white';
                              if (row.status === 'VALID') rowBg = '#ecfdf5';
                              else if (row.status === 'INVALID') rowBg = '#fef2f2';
                              else rowBg = '#fffbeb';
                              
                              return (
                                <tr key={idx} style={{ background: rowBg, borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: 'var(--spacing-md)', color: 'var(--text-primary)' }}>{row.rowIndex}</td>
                                  <td style={{ padding: 'var(--spacing-md)', color: 'var(--text-primary)' }}>{row.data.full_name}</td>
                                  <td style={{ padding: 'var(--spacing-md)', color: 'var(--text-primary)' }}>{row.data.date_of_birth}</td>
                                  <td style={{ padding: 'var(--spacing-md)', fontWeight: 600, color: row.status === 'VALID' ? 'var(--success)' : row.status === 'INVALID' ? 'var(--error)' : 'var(--warning)' }}>{row.status}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', paddingTop: 'var(--spacing-lg)' }}>
                      <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                        <button
                          onClick={handleConfirmImport}
                          disabled={importing || preview.valid_rows === 0}
                          className="btn btn-success"
                          style={{ flex: 1 }}
                        >
                          {importing ? 'Importing...' : `Import ${preview.valid_rows} Valid Rows`}
                        </button>
                        <button
                          onClick={() => {
                            setPreviewing(false);
                            setPreview(null);
                            setPreviewId(null);
                          }}
                          disabled={importing}
                          className="btn btn-secondary"
                          style={{ flex: 1 }}
                        >
                          Back
                        </button>
                      </div>
                      
                      {(preview.invalid_rows > 0 || preview.duplicate_rows > 0) && (
                        <button
                          onClick={() => downloadErrorReport()}
                          disabled={importing}
                          className="btn btn-outline"
                          style={{ width: '100%' }}
                        >
                          <Download size={16} />
                          Download Error Report ({preview.invalid_rows + preview.duplicate_rows} issues)
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Guidelines Card */}
          <div style={{ marginTop: 'var(--spacing-2xl)', padding: 'var(--spacing-lg)', background: 'var(--primary-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--primary-200)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--spacing-sm)' }}>Import Guidelines</h3>
            <ul style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: 'var(--spacing-lg)', margin: 0 }}>
              <li style={{ marginBottom: 'var(--spacing-xs)' }}>Supported formats: CSV and Excel (XLSX)</li>
              <li style={{ marginBottom: 'var(--spacing-xs)' }}>Maximum file size: 5 MB</li>
              <li style={{ marginBottom: 'var(--spacing-xs)' }}>Required field: full_name</li>
              <li style={{ marginBottom: 'var(--spacing-xs)' }}>Optional fields: date_of_birth, gender, phone, email, address</li>
              <li style={{ marginBottom: 'var(--spacing-xs)' }}>Duplicates (same name + DOB) will be skipped</li>
              <li style={{ marginBottom: 'var(--spacing-xs)' }}>All rows are validated before import</li>
              <li>Date format must be YYYY-MM-DD</li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
