/**
 * Summary display component with evidence references.
 */

import { useState } from 'react';
import type { SummaryResponse } from '../types';
import { apiClient } from '../services/api';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorBox } from './ErrorBox';
import { Disclaimer } from './Disclaimer';

interface SummaryBoxProps {
  patientId: string;
}

export function SummaryBox({ patientId }: SummaryBoxProps) {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEvidenceDetails, setShowEvidenceDetails] = useState(false);

  async function generateSummary() {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.generateSummary(patientId);
      setSummary(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  if (error) {
    return <ErrorBox error={error} title="Failed to Generate Summary" />;
  }

  return (
    <div className="card">
      <h3>Clinical Summary</h3>

      {!summary ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <button className="button" onClick={generateSummary}>
            Generate Summary
          </button>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '12px' }}>
            Click to generate a summary from retrieved clinical records.
          </p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {summary.summary_text}
            </div>
          </div>

          {/* Mode indicator */}
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
            Generated using: <strong>{summary.mode === 'local_llm' ? 'Local LLM' : 'Template'}</strong>
          </div>

          {/* Evidence references */}
          <div style={{ marginBottom: '12px' }}>
            <button
              className="button button-secondary"
              style={{ fontSize: '12px' }}
              onClick={() => setShowEvidenceDetails(!showEvidenceDetails)}
            >
              {showEvidenceDetails ? '▼' : '▶'} Evidence References ({summary.evidence_references.encounters.length} encounters, {summary.evidence_references.labs.length} labs, {summary.evidence_references.medications.length} meds)
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

          {/* Regenerate button */}
          <button
            className="button button-secondary"
            style={{ fontSize: '12px', marginTop: '12px' }}
            onClick={() => {
              setSummary(null);
            }}
          >
            Generate New Summary
          </button>

          {/* Disclaimer */}
          <Disclaimer text={summary.status} />
        </>
      )}
    </div>
  );
}
