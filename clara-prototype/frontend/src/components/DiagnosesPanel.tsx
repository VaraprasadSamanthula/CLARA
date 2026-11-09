/**
 * DiagnosesPanel: Display patient diagnoses.
 */

interface Diagnosis {
  diagnosis_id: string;
  icd10_code: string | null;
  description: string;
  recorded_date: string;
}

interface DiagnosesPanelProps {
  diagnoses: Diagnosis[];
  isLoading?: boolean;
}

export function DiagnosesPanel({ diagnoses, isLoading }: DiagnosesPanelProps) {
  if (isLoading) {
    return (
      <div className="card">
        <h3>Diagnoses</h3>
        <p style={{ color: '#999' }}>Loading...</p>
      </div>
    );
  }

  if (!diagnoses || diagnoses.length === 0) {
    return (
      <div className="card">
        <h3>Diagnoses</h3>
        <p style={{ color: '#999' }}>No diagnoses recorded.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Diagnoses ({diagnoses.length})</h3>

      <div style={{ marginTop: '16px' }}>
        {diagnoses.map((diagnosis) => (
          <div
            key={diagnosis.diagnosis_id}
            style={{
              marginBottom: '12px',
              padding: '12px',
              backgroundColor: '#f9f9f9',
              borderLeft: '4px solid #0066cc',
              borderRadius: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{diagnosis.description}</div>
                {diagnosis.icd10_code && (
                  <div style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                    ICD-10: {diagnosis.icd10_code}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#999', whiteSpace: 'nowrap', marginLeft: '16px' }}>
                {new Date(diagnosis.recorded_date).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
