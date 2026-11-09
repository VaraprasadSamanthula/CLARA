/**
 * Summary display component with streaming support and evidence references.
 */

import { useState, useEffect } from 'react';
import type { SummaryResponse } from '../types';
import { apiClient } from '../services/api';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorBox } from './ErrorBox';
import { Disclaimer } from './Disclaimer';

interface SummaryBoxProps {
  patientId: string;
}

interface StreamingState {
  isStreaming: boolean;
  currentText: string;
  startTime: number | null;
  elapsedSeconds: number;
  estimatedProgress: number;
}

export function SummaryBox({ patientId }: SummaryBoxProps) {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [streaming, setStreaming] = useState<StreamingState>({
    isStreaming: false,
    currentText: '',
    startTime: null,
    elapsedSeconds: 0,
    estimatedProgress: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [showEvidenceDetails, setShowEvidenceDetails] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);

  // Update elapsed time
  useEffect(() => {
    if (!streaming.isStreaming) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - (streaming.startTime || now)) / 1000);
      setStreaming((prev) => ({
        ...prev,
        elapsedSeconds: elapsed,
        estimatedProgress: Math.min(95, 10 + elapsed * 5), // Rough estimate
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [streaming.isStreaming, streaming.startTime]);

  async function generateSummaryStream() {
    try {
      setError(null);
      setStreaming({
        isStreaming: true,
        currentText: '',
        startTime: Date.now(),
        elapsedSeconds: 0,
        estimatedProgress: 10,
      });

      await apiClient.generateSummaryStream(
        patientId,
        (chunk) => {
          // Accumulate chunks
          setStreaming((prev) => ({
            ...prev,
            currentText: prev.currentText + chunk,
          }));
        },
        () => {
          // On complete
          setStreaming((prev) => ({
            ...prev,
            isStreaming: false,
            estimatedProgress: 100,
          }));

          // Create summary response from streamed text
          setSummary({
            patient_id: patientId,
            summary_text: streaming.currentText,
            evidence_references: {
              encounters: [],
              medications: [],
              labs: [],
              date_range: { start: '', end: '' },
            },
            mode: 'llm',
            status: 'Synthetic demo data — not for clinical use.',
          });
        },
        (err) => {
          // On error - try fallback to non-streaming
          console.error('Streaming error:', err);
          if (useStreaming) {
            setError(null);
            generateSummaryNonStreaming();
          } else {
            setError(err.message || 'Failed to generate summary');
            setStreaming((prev) => ({ ...prev, isStreaming: false }));
          }
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
      setStreaming((prev) => ({ ...prev, isStreaming: false }));
    }
  }

  async function generateSummaryNonStreaming() {
    try {
      setError(null);
      setStreaming({
        isStreaming: true,
        currentText: 'Generating summary...',
        startTime: Date.now(),
        elapsedSeconds: 0,
        estimatedProgress: 50,
      });

      const response = await apiClient.generateSummary(patientId);
      setSummary(response);
      setStreaming((prev) => ({
        ...prev,
        isStreaming: false,
        currentText: response.summary_text,
        estimatedProgress: 100,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
      setStreaming((prev) => ({ ...prev, isStreaming: false }));
    }
  }

  function handleRegenerate() {
    setSummary(null);
    setStreaming({
      isStreaming: false,
      currentText: '',
      startTime: null,
      elapsedSeconds: 0,
      estimatedProgress: 0,
    });
    setError(null);
  }

  function copyToClipboard() {
    const textToCopy = summary?.summary_text || streaming.currentText;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      alert('Summary copied to clipboard!');
    }
  }

  // Show loading spinner while streaming
  if (streaming.isStreaming && !streaming.currentText) {
    return <LoadingSpinner />;
  }

  if (error && !streaming.currentText) {
    return (
      <div className="card">
        <h3>Clinical Summary</h3>
        <ErrorBox error={error} title="Failed to Generate Summary" />
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <button className="button" onClick={generateSummaryStream}>
            Try Again
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={useStreaming}
              onChange={(e) => setUseStreaming(e.target.checked)}
            />
            Use streaming (real-time display)
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Clinical Summary</h3>
        {(summary || streaming.currentText) && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="button button-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={copyToClipboard}
              title="Copy to clipboard"
            >
              📋 Copy
            </button>
            <button
              className="button button-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={handleRegenerate}
              title="Generate new summary"
            >
              🔄 Regenerate
            </button>
          </div>
        )}
      </div>

      {!summary && !streaming.currentText ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <button className="button" onClick={generateSummaryStream}>
            Generate Summary
          </button>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '12px' }}>
            Click to generate a summary from retrieved clinical records.
          </p>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px', marginTop: '12px' }}>
            <input
              type="checkbox"
              checked={useStreaming}
              onChange={(e) => setUseStreaming(e.target.checked)}
            />
            Use streaming (real-time display)
          </label>
        </div>
      ) : (
        <>
          {/* Streaming progress */}
          {streaming.isStreaming && (
            <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f0f8ff', borderRadius: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ animation: 'spin 1s linear infinite', fontSize: '16px' }}>⏳</div>
                <span style={{ fontSize: '13px', color: '#0066cc', fontWeight: 'bold' }}>
                  Generating summary... {streaming.elapsedSeconds}s
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: '#0066cc',
                    width: `${streaming.estimatedProgress}%`,
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            </div>
          )}

          {/* Summary text */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {streaming.currentText || summary?.summary_text}
            </div>
          </div>

          {/* Mode indicator */}
          {(summary || !streaming.isStreaming) && (
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
              Generated using: <strong>{summary?.mode === 'llm' ? 'LLM' : 'Template'}</strong>
              {streaming.elapsedSeconds > 0 && ` • ${streaming.elapsedSeconds}s`}
            </div>
          )}

          {/* Evidence references */}
          {summary && (
            <div style={{ marginBottom: '12px' }}>
              <button
                className="button button-secondary"
                style={{ fontSize: '12px' }}
                onClick={() => setShowEvidenceDetails(!showEvidenceDetails)}
              >
                {showEvidenceDetails ? '▼' : '▶'} Evidence References ({summary.evidence_references.encounters.length} encounters)
              </button>

              {showEvidenceDetails && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '12px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Date Range:</strong> {summary.evidence_references.date_range.start} to {summary.evidence_references.date_range.end}
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <strong>Encounters:</strong>
                    <div style={{ marginLeft: '16px', color: '#555' }}>
                      {summary.evidence_references.encounters.join(', ') || 'None'}
                    </div>
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <strong>Labs:</strong>
                    <div style={{ marginLeft: '16px', color: '#555' }}>
                      {summary.evidence_references.labs.join(', ') || 'None'}
                    </div>
                  </div>

                  <div>
                    <strong>Medications:</strong>
                    <div style={{ marginLeft: '16px', color: '#555' }}>
                      {summary.evidence_references.medications.join(', ') || 'None'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          {summary && <Disclaimer text={summary.status} />}

          {/* CSS for spinner animation */}
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
