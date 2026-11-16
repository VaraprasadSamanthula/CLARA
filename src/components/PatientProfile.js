"use client";
import { useState, useEffect } from 'react';
import { ArrowLeft, Loader, AlertCircle, FileText } from 'lucide-react';
import DocumentManager from './DocumentManager';

export default function PatientProfile({ patientId, onBack }) {
  const [patient, setPatient] = useState(null);
  const [clinical, setClinical] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('demographics');

  useEffect(() => {
    fetchPatientProfile();
  }, [patientId]);

  const fetchPatientProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load patient profile');
        return;
      }

      setPatient(data.patient);
      setClinical(data.clinical);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader size={32} className="text-cyan-400 animate-spin" />
          <p className="text-amber-200">Loading patient profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4"
        >
          <ArrowLeft size={18} />
          Back to Search
        </button>
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
      >
        <ArrowLeft size={18} />
        Back to Search
      </button>

      {/* Patient Header */}
      <div className="glass rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-cyan-300 mb-1">Patient #{patient.id}</h2>
            <div className="flex items-center gap-3">
              <span className="text-amber-200 text-sm">{patient.source}</span>
              {patient.fullName && <p className="text-amber-200">{patient.fullName}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-amber-50"><span className="font-medium">Gender:</span> {patient.gender}</p>
            {patient.age !== null && patient.age !== undefined && <p className="text-amber-50"><span className="font-medium">Age:</span> {patient.age}</p>}
          </div>
        </div>

        {patient.dateOfDeath && (
          <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-400 text-sm">
            ⚠ Patient deceased: {patient.dateOfDeath}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-amber-700/20 overflow-x-auto">
        {[
          { id: 'demographics', label: 'Demographics' },
          ...(patient.source === 'MIMIC' ? [
            { id: 'admissions', label: `Admissions (${clinical?.admissions?.count || 0})` },
            { id: 'diagnoses', label: `Diagnoses (${clinical?.diagnoses?.count || 0})` },
            { id: 'prescriptions', label: `Prescriptions (${clinical?.prescriptions?.count || 0})` },
            { id: 'labs', label: `Lab Results (${clinical?.labResults?.count || 0})` },
            { id: 'icu', label: `ICU Stays (${clinical?.icuStays?.count || 0})` },
          ] : []),
          { id: 'documents', label: 'Documents' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium text-sm transition ${
              activeTab === tab.id
                ? 'text-cyan-300 border-b-2 border-cyan-400'
                : 'text-amber-200 hover:text-amber-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="glass rounded-lg p-6">
        {activeTab === 'demographics' && (
          <div className="space-y-2">
            <p className="text-amber-50"><span className="font-medium">Patient ID:</span> {patient.id}</p>
            <p className="text-amber-50"><span className="font-medium">Source:</span> {patient.source}</p>
            {patient.fullName && <p className="text-amber-50"><span className="font-medium">Name:</span> {patient.fullName}</p>}
            <p className="text-amber-50"><span className="font-medium">Gender:</span> {patient.gender}</p>
            {patient.age !== null && patient.age !== undefined && <p className="text-amber-50"><span className="font-medium">Age:</span> {patient.age}</p>}
            {patient.dateOfBirth && <p className="text-amber-50"><span className="font-medium">Date of Birth:</span> {new Date(patient.dateOfBirth).toLocaleDateString()}</p>}
            {patient.phone && <p className="text-amber-50"><span className="font-medium">Phone:</span> {patient.phone}</p>}
            {patient.email && <p className="text-amber-50"><span className="font-medium">Email:</span> {patient.email}</p>}
            {patient.yearGroup && <p className="text-amber-50"><span className="font-medium">Year Group:</span> {patient.yearGroup}</p>}
            {patient.source === 'MIMIC' && !clinical && (
              <p className="text-amber-300 text-sm mt-4">No clinical history available</p>
            )}
          </div>
        )}

        {activeTab === 'admissions' && patient.source === 'MIMIC' && (
          <AdminissionsTab admissions={clinical?.admissions?.records || []} />
        )}

        {activeTab === 'diagnoses' && patient.source === 'MIMIC' && (
          <DiagnosesTab diagnoses={clinical?.diagnoses?.records || []} />
        )}

        {activeTab === 'prescriptions' && patient.source === 'MIMIC' && (
          <PrescriptionsTab prescriptions={clinical?.prescriptions?.records || []} />
        )}

        {activeTab === 'labs' && patient.source === 'MIMIC' && (
          <LabsTab labs={clinical?.labResults?.records || []} />
        )}

        {activeTab === 'icu' && patient.source === 'MIMIC' && (
          <ICUTab icu={clinical?.icuStays?.records || []} />
        )}

        {activeTab === 'documents' && (
          <DocumentManager patientId={patientId} onDocumentUploaded={fetchPatientProfile} />
        )}
      </div>
    </div>
  );
}

function AdminissionsTab({ admissions }) {
  if (!admissions || admissions.length === 0) {
    return <p className="text-amber-300">No admission records found.</p>;
  }

  return (
    <div className="space-y-3">
      {admissions.map((adm, idx) => (
        <div key={idx} className="p-3 bg-amber-950/30 rounded border border-amber-700/20">
          <p className="text-amber-50 font-medium">Admission #{idx + 1}</p>
          <p className="text-sm text-amber-200">Admit: {new Date(adm.admittime).toLocaleDateString()}</p>
          {adm.dischtime && <p className="text-sm text-amber-200">Discharge: {new Date(adm.dischtime).toLocaleDateString()}</p>}
          <p className="text-sm text-amber-200">Type: {adm.admission_type}</p>
        </div>
      ))}
    </div>
  );
}

function DiagnosesTab({ diagnoses }) {
  if (!diagnoses || diagnoses.length === 0) {
    return <p className="text-amber-300">No diagnosis records found.</p>;
  }

  return (
    <div className="space-y-2">
      {diagnoses.map((diag, idx) => (
        <div key={idx} className="p-2 bg-amber-950/20 rounded text-sm text-amber-50">
          <span className="font-medium">{diag.icd_code}</span> - {diag.long_title || 'N/A'}
        </div>
      ))}
    </div>
  );
}

function PrescriptionsTab({ prescriptions }) {
  if (!prescriptions || prescriptions.length === 0) {
    return <p className="text-amber-300">No prescription records found.</p>;
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {prescriptions.map((rx, idx) => (
        <div key={idx} className="p-3 bg-amber-950/30 rounded border border-amber-700/20">
          <p className="text-amber-50 font-medium">{rx.drug}</p>
          {rx.starttime && <p className="text-sm text-amber-200">Start: {new Date(rx.starttime).toLocaleDateString()}</p>}
          {rx.dose_val_rx && <p className="text-sm text-amber-200">Dose: {rx.dose_val_rx} {rx.dose_unit_rx}</p>}
          {rx.route && <p className="text-sm text-amber-200">Route: {rx.route}</p>}
        </div>
      ))}
    </div>
  );
}

function LabsTab({ labs }) {
  if (!labs || labs.length === 0) {
    return <p className="text-amber-300">No lab results found.</p>;
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {labs.map((lab, idx) => (
        <div key={idx} className="p-3 bg-amber-950/30 rounded border border-amber-700/20">
          <p className="text-amber-50 font-medium">{lab.test_name || lab.itemid}</p>
          {lab.value && <p className="text-sm text-amber-200">Value: {lab.value}</p>}
          {lab.charttime && <p className="text-sm text-amber-200">Date: {new Date(lab.charttime).toLocaleDateString()}</p>}
        </div>
      ))}
    </div>
  );
}

function ICUTab({ icu }) {
  if (!icu || icu.length === 0) {
    return <p className="text-amber-300">No ICU stays found.</p>;
  }

  return (
    <div className="space-y-3">
      {icu.map((stay, idx) => (
        <div key={idx} className="p-3 bg-amber-950/30 rounded border border-amber-700/20">
          <p className="text-amber-50 font-medium">ICU Stay #{idx + 1}</p>
          {stay.first_careunit && <p className="text-sm text-amber-200">Unit: {stay.first_careunit}</p>}
          {stay.intime && <p className="text-sm text-amber-200">In: {new Date(stay.intime).toLocaleDateString()}</p>}
          {stay.los && <p className="text-sm text-amber-200">LOS: {stay.los} days</p>}
        </div>
      ))}
    </div>
  );
}
