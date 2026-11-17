"use client";
import { useState, useEffect, useRef } from 'react';
import { Upload, Download, FileText, Loader, AlertCircle, CheckCircle, Trash2, Eye, X, ZoomIn, ZoomOut } from 'lucide-react';

export default function DocumentManager({ patientId, onDocumentUploaded }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [previewingDoc, setPreviewingDoc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [deletingId, setDeletingId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (patientId) {
      fetchDocuments();
    }
  }, [patientId]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/patients/${patientId}/documents`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load documents');
        setDocuments([]);
        return;
      }

      setDocuments(data.documents || []);
    } catch (err) {
      setError(err.message || 'An error occurred');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadDocument(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadDocument = async (file) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setError('File type not allowed. Allowed: PDF, JPEG, PNG');
        setUploading(false);
        return;
      }

      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File too large. Maximum: 50MB');
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/patients/${patientId}/documents/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Upload failed');
        setUploading(false);
        return;
      }

      setSuccess(`Document uploaded: ${file.name}`);
      await fetchDocuments();
      
      if (onDocumentUploaded) {
        onDocumentUploaded();
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (doc) => {
    setPreviewingDoc(doc);
    setPreviewLoading(true);
    setPreviewError(null);
    setZoom(1);

    try {
      const response = await fetch(`/api/documents/preview/${doc.id}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        setPreviewError('Failed to load document');
        return;
      }
    } catch (err) {
      setPreviewError(err.message || 'Failed to load document');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (docId, filename) => {
    try {
      const response = await fetch(`/api/documents/download/${docId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        setError('Download failed');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message || 'Download failed');
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm('Are you sure? This will permanently delete this document.')) {
      return;
    }

    setDeletingId(docId);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Delete failed');
        setDeletingId(null);
        return;
      }

      setSuccess('Document deleted successfully');
      await fetchDocuments();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    return '📃';
  };

  const getFileTypeLabel = (mimeType) => {
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('jpeg')) return 'JPEG';
    if (mimeType.includes('png')) return 'PNG';
    return 'File';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2xl)' }}>
      {/* Preview Modal */}
      {previewingDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 'var(--spacing-lg)' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            {/* Preview Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {previewingDoc.filename}
              </h3>
              <button
                onClick={() => setPreviewingDoc(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 'var(--spacing-md)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Preview Content */}
            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--background)' }}>
              {previewLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Loader size={32} style={{ margin: '0 auto var(--spacing-md)', color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Loading document...</p>
                  </div>
                </div>
              ) : previewError ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <div style={{ textAlign: 'center' }}>
                    <AlertCircle size={32} style={{ margin: '0 auto var(--spacing-md)', color: 'var(--error)' }} />
                    <p style={{ color: 'var(--error)' }}>{previewError}</p>
                  </div>
                </div>
              ) : previewingDoc.type === 'application/pdf' ? (
                <iframe
                  src={`/api/documents/preview/${previewingDoc.id}`}
                  style={{ width: '100%', height: '100%', minHeight: '500px', border: 'none' }}
                />
              ) : previewingDoc.type.startsWith('image/') ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 'var(--spacing-lg)' }}>
                  <img
                    src={`/api/documents/preview/${previewingDoc.id}`}
                    alt={previewingDoc.filename}
                    style={{ maxWidth: '100%', maxHeight: '100%', transform: `scale(${zoom})` }}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>Preview not available for this file type</p>
                </div>
              )}
            </div>

            {/* Preview Footer */}
            <div style={{ borderTop: '1px solid var(--border)', padding: 'var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                {previewingDoc.type.startsWith('image/') && (
                  <>
                    <button
                      onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 'var(--spacing-md)' }}
                      title="Zoom out"
                    >
                      <ZoomOut size={18} />
                    </button>
                    <span style={{ padding: 'var(--spacing-md)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 'var(--spacing-md)' }}
                      title="Zoom in"
                    >
                      <ZoomIn size={18} />
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => handleDownload(previewingDoc.id, previewingDoc.filename)}
                className="btn btn-primary"
                style={{ fontSize: '0.875rem' }}
              >
                <Download size={16} />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Upload Document</h3>
        
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-2xl)',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 200ms ease'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={uploading}
            style={{ display: 'none' }}
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            {uploading ? (
              <>
                <Loader size={32} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Uploading...</p>
              </>
            ) : (
              <>
                <Upload size={32} style={{ color: 'var(--primary)' }} />
                <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Click to upload or drag and drop</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>PDF, JPEG, PNG (max 50MB)</p>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div style={{
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
      </div>

      {/* Documents List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Documents ({documents.length})
        </h3>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              <Loader size={24} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading documents...</p>
            </div>
          </div>
        ) : documents.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>No documents uploaded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', maxHeight: '400px', overflowY: 'auto' }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  padding: 'var(--spacing-lg)',
                  background: 'var(--background-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  transition: 'all 200ms ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-lg)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xs)' }}>
                      <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{getFileIcon(doc.type)}</span>
                      <p style={{ color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</p>
                      <span style={{ fontSize: '0.75rem', background: 'var(--primary-50)', color: 'var(--primary)', padding: 'var(--spacing-xs) var(--spacing-md)', borderRadius: 'var(--radius-md)', flexShrink: 0 }}>
                        {getFileTypeLabel(doc.type)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)', fontSize: '0.875rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                      <span>{doc.sizeFormatted}</span>
                      {doc.uploadedAt && (
                        <span>
                          {new Date(doc.uploadedAt).toLocaleDateString()} at{' '}
                          {new Date(doc.uploadedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                      {doc.uploadedBy && <span>by {doc.uploadedBy}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexShrink: 0 }}>
                    <button
                      onClick={() => handlePreview(doc)}
                      disabled={previewLoading}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: 'var(--spacing-sm) var(--spacing-md)' }}
                    >
                      <Eye size={14} />
                      Preview
                    </button>
                    <button
                      onClick={() => handleDownload(doc.id, doc.filename)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: 'var(--spacing-sm) var(--spacing-md)' }}
                    >
                      <Download size={14} />
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      className="btn btn-danger"
                      style={{ fontSize: '0.75rem', padding: 'var(--spacing-sm) var(--spacing-md)' }}
                    >
                      {deletingId === doc.id ? (
                        <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
