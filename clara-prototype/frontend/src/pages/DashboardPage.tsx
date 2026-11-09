/**
 * DashboardPage: Home page after login showing patient list.
 */

import { Header } from '../components/Header';
import { SyntheticDataBanner } from '../components/SyntheticDataBanner';
import { PatientList } from '../components/PatientList';
import { useNavigate } from 'react-router-dom';

export function DashboardPage() {
  const navigate = useNavigate();

  const handleSelectPatient = (patientId: string) => {
    navigate(`/patients/${patientId}`);
  };

  return (
    <div>
      <Header />

      <div className="container page">
        <SyntheticDataBanner />

        <h2 style={{ marginBottom: '20px' }}>Patients</h2>
        <PatientList onSelectPatient={handleSelectPatient} />
      </div>
    </div>
  );
}
