/**
 * Patient timeline component showing encounters with medications and labs.
 */

import { useState, useEffect } from 'react';
import type { TimelineResponse } from '../types';
import { apiClient } from '../services/api';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorBox } from './ErrorBox';

interface TimelineProps {
  patientId: string;
}

export function Timeline({ patientId }: TimelineProps) {
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTimeline() {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getTimeline(patientId);
        setTimeline(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load timeline');
      } finally {
        setLoading(false);
      }
    }

    loadTimeline();
  }, [patientId]);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return <ErrorBox error={error} title="Failed to Load Timeline" />;
  }

  if (!timeline || timeline.timeline.length === 0) {
    return (
      <div className="empty-state">
        <p>No timeline data available.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Full Timeline ({timeline.timeline.length} encounters)</h3>

      <div style={{ marginTop: '16px' }}>
        {timeline.timeline.map((encounter, idx) => (
          <div key={encounter.encounter_id} style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
              <strong>{encounter.encounter_date}</strong>
              <span style={{ fontSize: '13px', color: '#666' }}>
                {encounter.encounter_type}
              </span>
            </div>

            {encounter.summary && (
              <p style={{ fontSize: '13px', color: '#333', marginBottom: '8px' }}>{encounter.summary}</p>
            )}

            {/* Medications in this encounter */}
            {encounter.medications.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px' }}>
                  Medications ({encounter.medications.length}):
                </div>
                <ul style={{ fontSize: '12px', marginLeft: '16px', color: '#555' }}>
                  {encounter.medications.map((med) => (
                    <li key={med.medication_id}>
                      {med.medication_name} {med.dose_text} ({med.status})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Labs in this encounter */}
            {encounter.labs.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px' }}>
                  Labs ({encounter.labs.length}):
                </div>
                <ul style={{ fontSize: '12px', marginLeft: '16px', color: '#555' }}>
                  {encounter.labs.map((lab) => (
                    <li key={lab.lab_id}>
                      {lab.test_name}: {lab.value} {lab.unit}
                      {lab.reference_range_text && ` (ref: ${lab.reference_range_text})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
