"use client";
import { useState, useEffect, useRef } from 'react';
import { Upload, Download, FileText, Loader, AlertCircle, CheckCircle, Trash2, Eye, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

export default function DocumentManager({ patientId, onDocumentUploaded }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [previewingDoc, setPreviewingDoc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [pdfPages, setPdfPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
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
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadDocument = async (file) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate file type and size on client
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setError('File type not allowed. Allowed: PDF, JPEG, PNG');
        setUploading(false);
        return;
      }

      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        setError('File too large. Maximum: 50MB');
        setUploading(false);
        return;
      }

      // Prepare multipart form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload to patient-specific endpoint
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
      
      // Refresh document list
      await fetchDocuments();
      
      // Call parent callback if provided
      if (onDocumentUploaded) {
        onDocumentUploaded();
      }

      // Clear success message after 3 seconds
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
    setCurrentPage(1);
    setZoom(1);

    try {
      const response = await fetch(`/api/documents/preview/${doc.id}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        setPreviewError('Failed to load document');
        return;
      }

      // Document loaded successfully - for PDFs, the browser will handle it
      if (doc.type === 'application/pdf') {
        // PDF will be displayed in embed, no additional action needed
      } else if (doc.type.startsWith('image/')) {
        // Image will be displayed directly
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
    <div className="space-y-6">
      {/* Preview Modal */}
      {previewingDoc && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Preview Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-cyan-300 truncate">
                {previewingDoc.filename}
              </h3>
              <button
                onClick={() => setPreviewingDoc(null)}
                className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto bg-gray-950">
              {previewLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader className="animate-spin mx-auto mb-2 text-cyan-400" />
                    <p className="text-amber-200">Loading document...</p>
                  </div>
                </div>
              ) : previewError ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <AlertCircle className="mx-auto mb-2 text-red-400" size={32} />
                    <p className="text-red-400">{previewError}</p>
                  </div>
                </div>
              ) : previewingDoc.type === 'application/pdf' ? (
                <iframe
                  src={`/api/documents/preview/${previewingDoc.id}`}
                  className="w-full h-full"
                  style={{ minHeight: '500px' }}
                />
              ) : previewingDoc.type.startsWith('image/') ? (
                <div className="flex items-center justify-center h-full p-4">
                  <img
                    src={`/api/documents/preview/${previewingDoc.id}`}
                    alt={previewingDoc.filename}
                    className="max-w-full max-h-full"
                    style={{ transform: `scale(${zoom})` }}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-amber-200">Preview not available for this file type</p>
                </div>
              )}
            </div>

            {/* Preview Footer */}
            <div className="border-t border-gray-700 p-4 flex justify-between items-center">
              <div className="flex gap-2">
                {previewingDoc.type.startsWith('image/') && (
                  <>
                    <button
                      onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                      className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
                      title="Zoom out"
                    >
                      <ZoomOut size={18} />
                    </button>
                    <span className="px-3 py-2 text-sm text-gray-400">{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                      className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
                      title="Zoom in"
                    >
                      <ZoomIn size={18} />
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => handleDownload(previewingDoc.id, previewingDoc.filename)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 rounded transition"
              >
                <Download size={16} />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-cyan-300">Upload Document</h3>
        
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-cyan-500/30 rounded-lg p-8 text-center cursor-pointer hover:border-cyan-500/60 hover:bg-cyan-500/5 transition"
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={uploading}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <>
                <Loader size={32} className="text-cyan-400 animate-spin" />
                <p className="text-amber-200">Uploading...</p>
              </>
            ) : (
              <>
                <Upload size={32} className="text-cyan-400" />
                <p className="text-amber-50 font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-amber-200">PDF, JPEG, PNG (max 50MB)</p>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
            <div className="flex items-start gap-2">
              <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-cyan-300">
          Documents ({documents.length})
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <Loader size={24} className="text-cyan-400 animate-spin" />
              <p className="text-amber-200 text-sm">Loading documents...</p>
            </div>
          </div>
        ) : documents.length === 0 ? (
          <p className="text-amber-300 text-center py-8">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 bg-amber-950/30 rounded border border-amber-700/20 hover:border-amber-600/40 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl flex-shrink-0">{getFileIcon(doc.type)}</span>
                      <p className="text-amber-50 font-medium truncate">{doc.filename}</p>
                      <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded flex-shrink-0">
                        {getFileTypeLabel(doc.type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-amber-200">
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
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handlePreview(doc)}
                      disabled={previewLoading}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded text-sm transition disabled:opacity-50"
                    >
                      <Eye size={16} />
                      Preview
                    </button>
                    <button
                      onClick={() => handleDownload(doc.id, doc.filename)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 rounded text-sm transition"
                    >
                      <Download size={16} />
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded text-sm transition disabled:opacity-50"
                    >
                      {deletingId === doc.id ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
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
