/**
 * AdmissionsPanel: Display patient hospital admissions.
 */

interface Admission {
  admission_id: string;
  admission_date: string;
  discharge_date: string | null;
  length_of_stay_days: number | null;
  admission_reason: string | null;
  discharge_summary: string | null;
}

interface AdmissionsPanelProps {
  admissions: Admission[];
  isLoading?: boolean;
}

export function AdmissionsPanel({ admissions, isLoading }: AdmissionsPanelProps) {
  if (isLoading) {
    return (
      <div className="card">
        <h3>Hospital Admissions</h3>
        <p style={{ color: '#999' }}>Loading...</p>
      </div>
    );
  }

  if (!admissions || admissions.length === 0) {
    return (
      <div className="card">
        <h3>Hospital Admissions</h3>
        <p style={{ color: '#999' }}>No hospital admissions recorded.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Hospital Admissions ({admissions.length})</h3>

      <div style={{ marginTop: '16px' }}>
        {admissions.map((admission) => (
          <div
            key={admission.admission_id}
            style={{
              marginBottom: '12px',
              padding: '12px',
              backgroundColor: '#fff5f5',
              borderLeft: '4px solid #cc0000',
              borderRadius: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  Admitted: {new Date(admission.admission_date).toLocaleDateString()}
                  {admission.discharge_date && (
                    <> - Discharged: {new Date(admission.discharge_date).toLocaleDateString()}</>
                  )}
                </div>

                {admission.length_of_stay_days !== null && (
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    Length of Stay: {admission.length_of_stay_days} day{admission.length_of_stay_days !== 1 ? 's' : ''}
                  </div>
                )}

                {admission.admission_reason && (
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    Reason: {admission.admission_reason}
                  </div>
                )}

                {admission.discharge_summary && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
                    {admission.discharge_summary}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
