/**
 * ProceduresPanel: Display patient procedures.
 */

interface Procedure {
  procedure_id: string;
  procedure_code: string | null;
  description: string;
  procedure_date: string;
}

interface ProceduresPanelProps {
  procedures: Procedure[];
  isLoading?: boolean;
}

export function ProceduresPanel({ procedures, isLoading }: ProceduresPanelProps) {
  if (isLoading) {
    return (
      <div className="card">
        <h3>Procedures</h3>
        <p style={{ color: '#999' }}>Loading...</p>
      </div>
    );
  }

  if (!procedures || procedures.length === 0) {
    return (
      <div className="card">
        <h3>Procedures</h3>
        <p style={{ color: '#999' }}>No procedures recorded.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Procedures ({procedures.length})</h3>

      <div style={{ marginTop: '16px' }}>
        {procedures.map((procedure) => (
          <div
            key={procedure.procedure_id}
            style={{
              marginBottom: '12px',
              padding: '12px',
              backgroundColor: '#f0f8ff',
              borderLeft: '4px solid #00aa00',
              borderRadius: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{procedure.description}</div>
                {procedure.procedure_code && (
                  <div style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                    Code: {procedure.procedure_code}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#999', whiteSpace: 'nowrap', marginLeft: '16px' }}>
                {new Date(procedure.procedure_date).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
