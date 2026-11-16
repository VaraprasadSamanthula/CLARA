'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
        router.push('/patients/search');
      }, 2000);

    } catch (err) {
      setError(err.message || 'An error occurred');
      setImporting(false);
    }
  };

  const downloadTemplate = (format) => {
    const headers = ['full_name', 'date_of_birth', 'gender', 'phone_number', 'email', 'address', 'registration_date'];
    const sample = [
      ['John Doe', '1985-06-20', 'M', '555-123-4567', 'john@example.com', '123 Main St', '2026-11-16'],
      ['Jane Smith', '1990-01-15', 'F', '555-987-6543', 'jane@example.com', '456 Oak Ave', '2026-11-16'],
    ];

    if (format === 'csv') {
      const csv = [headers.join(','), ...sample.map(row => row.map(v => `"${v}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'import_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'xlsx') {
      // For Excel, just download CSV for now (full xlsx support requires xlsx library)
      alert('Excel template download requires additional setup. Please use the CSV template.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Patient Management</h1>
          <p className="text-gray-600">Register new patients and manage patient information</p>
        </div>

        <div className="flex gap-2 mb-8 border-b border-gray-300">
          <a href="/patients/register" className="px-4 py-3 font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50">
            Manual Registration
          </a>
          <a href="/patients/import" className="px-4 py-3 font-medium text-blue-600 border-b-2 border-blue-600 hover:bg-blue-50">
            Bulk Import (CSV/Excel)
          </a>
          <a href="/patients/search" className="px-4 py-3 font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50">
            Search Patients
          </a>
        </div>

        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Bulk Patient Import</h2>

          {error && <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
          {success && <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">{success}</div>}

          {!previewing ? (
            <div className="space-y-6">
              {/* Template Download */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 className="font-semibold text-gray-800 mb-3">Step 1: Download Template</h3>
                <p className="text-sm text-gray-600 mb-3">Download a template to ensure your file has the correct format</p>
                <div className="flex gap-2">
                  <button onClick={() => downloadTemplate('csv')} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Download CSV Template
                  </button>
                  <button onClick={() => downloadTemplate('xlsx')} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Download Excel Template
                  </button>
                </div>
              </div>

              {/* File Selection */}
              <div className="p-4 bg-gray-50 border border-gray-300 rounded">
                <h3 className="font-semibold text-gray-800 mb-3">Step 2: Select File</h3>
                <div className="border-2 border-dashed border-gray-400 rounded p-6 text-center">
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="block cursor-pointer">
                    <p className="text-gray-600 mb-2">
                      {file ? `✓ ${file.name} (${(file.size / 1024).toFixed(0)} KB)` : 'Drag and drop or click to select CSV/Excel file'}
                    </p>
                    <button
                      type="button"
                      onClick={() => document.getElementById('file-input').click()}
                      className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                    >
                      Choose File
                    </button>
                  </label>
                </div>
              </div>

              {/* Preview */}
              <div>
                <button
                  onClick={handlePreview}
                  disabled={!file || uploading}
                  className={`w-full px-4 py-3 rounded-md font-medium transition-colors ${
                    uploading || !file
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {uploading ? 'Processing...' : 'Step 3: Preview Import'}
                </button>
              </div>
            </div>
          ) : (
            // Preview Results
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 text-lg">Import Preview</h3>

              {preview && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded">
                      <div className="text-3xl font-bold text-green-600">{preview.valid_rows}</div>
                      <div className="text-sm text-gray-600">Valid Rows</div>
                    </div>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="text-3xl font-bold text-yellow-600">{preview.duplicate_rows}</div>
                      <div className="text-sm text-gray-600">Duplicates</div>
                    </div>
                    <div className="p-4 bg-red-50 border border-red-200 rounded">
                      <div className="text-3xl font-bold text-red-600">{preview.invalid_rows}</div>
                      <div className="text-sm text-gray-600">Invalid</div>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-3xl font-bold text-blue-600">{preview.total_rows}</div>
                      <div className="text-sm text-gray-600">Total</div>
                    </div>
                  </div>

                  {/* Sample Rows */}
                  {preview.rows && preview.rows.length > 0 && (
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-200">
                            <th className="px-3 py-2 text-left">Row</th>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-left">DOB</th>
                            <th className="px-3 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.slice(0, 10).map((row, idx) => (
                            <tr key={idx} className={row.status === 'VALID' ? 'bg-green-50' : row.status === 'INVALID' ? 'bg-red-50' : 'bg-yellow-50'}>
                              <td className="px-3 py-2">{row.rowIndex}</td>
                              <td className="px-3 py-2">{row.data.full_name}</td>
                              <td className="px-3 py-2">{row.data.date_of_birth}</td>
                              <td className="px-3 py-2 font-semibold">{row.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleConfirmImport}
                      disabled={importing || preview.valid_rows === 0}
                      className={`flex-1 px-4 py-3 rounded-md font-medium transition-colors ${
                        importing || preview.valid_rows === 0
                          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
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
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Information */}
          <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-200">
            <h3 className="font-semibold text-gray-800 mb-2">Import Guidelines</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Supported formats: CSV and Excel (XLSX)</li>
              <li>• Maximum file size: 5 MB</li>
              <li>• Required field: full_name</li>
              <li>• Optional fields: date_of_birth, gender, phone_number, email, address</li>
              <li>• Duplicates (same name + DOB) will be skipped</li>
              <li>• All rows are validated before import</li>
              <li>• Date format must be YYYY-MM-DD</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
