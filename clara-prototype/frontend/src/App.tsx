/**
 * Main App component with routing and navigation.
 */

import { useState } from 'react';
import { Header } from './components/Header';
import { SyntheticDataBanner } from './components/SyntheticDataBanner';
import { PatientList } from './components/PatientList';
import { PatientDetail } from './components/PatientDetail';
import { Timeline } from './components/Timeline';
import { LabChart } from './components/LabChart';
import { SummaryBox } from './components/SummaryBox';
import { useLabTrendData } from './hooks/useLabTrend';

type Page = 'list' | 'detail';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('list');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Load HbA1c data for selected patient
  const { data: hbA1cData } = useLabTrendData(selectedPatientId, 'HbA1c');

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setCurrentPage('detail');
  };

  const handleBack = () => {
    setSelectedPatientId(null);
    setCurrentPage('list');
  };

  return (
    <div>
      <Header />

      <div className="container page">
        <SyntheticDataBanner />

        {currentPage === 'list' && (
          <>
            <h2 style={{ marginBottom: '20px' }}>Patients</h2>
            <PatientList onSelectPatient={handleSelectPatient} />
          </>
        )}

        {currentPage === 'detail' && selectedPatientId && (
          <>
            <PatientDetail patientId={selectedPatientId} onBack={handleBack} />

            <div style={{ marginTop: '20px' }} />

            {/* HbA1c Trend Chart */}
            {hbA1cData && <LabChart data={hbA1cData} />}

            {/* Timeline */}
            <div style={{ marginTop: '20px' }} />
            <Timeline patientId={selectedPatientId} />

            {/* Summary */}
            <div style={{ marginTop: '20px' }} />
            <SummaryBox patientId={selectedPatientId} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
