/**
 * Shared TypeScript types for CLARA frontend.
 */

// ===== Patient =====
export interface Patient {
  patient_id: string;
  display_name: string;
  birth_year: number;
  sex: string;
  created_at: string;
}

export interface PatientListItem extends Patient {
  encounter_count: number;
}

export interface PatientListResponse {
  patients: PatientListItem[];
  total: number;
}

// ===== Encounter =====
export interface Encounter {
  encounter_id: string;
  patient_id: string;
  encounter_date: string;
  encounter_type: string;
  summary: string | null;
  created_at: string;
}

// ===== Medication =====
export interface Medication {
  medication_id: string;
  patient_id: string;
  encounter_id: string;
  medication_name: string;
  dose_text: string;
  status: string;
  recorded_date: string;
  created_at: string;
}

// ===== Lab Result =====
export interface LabResult {
  lab_id: string;
  patient_id: string;
  encounter_id: string;
  test_name: string;
  value: number;
  unit: string;
  reference_range_text: string | null;
  recorded_date: string;
  created_at: string;
}

export interface LabTrendValue {
  lab_id: string;
  value: number;
  recorded_date: string;
  encounter_id: string;
  reference_range_text: string | null;
}

export interface LabTrendResponse {
  test_name: string;
  unit: string;
  values: LabTrendValue[];
}

// ===== Timeline =====
export interface TimelineEncounter {
  encounter_id: string;
  encounter_date: string;
  encounter_type: string;
  summary: string | null;
  medications: Medication[];
  labs: LabResult[];
}

export interface TimelineResponse {
  patient_id: string;
  timeline: TimelineEncounter[];
}

// ===== Patient Detail =====
export interface PatientDetailResponse {
  patient: Patient;
  recent_encounters: Encounter[];
  active_medications: Medication[];
  recent_labs: LabResult[];
}

// ===== Summary =====
export interface EvidenceReferences {
  encounters: string[];
  medications: string[];
  labs: string[];
  date_range: {
    start: string;
    end: string;
  };
}

export interface SummaryResponse {
  patient_id: string;
  summary_text: string;
  evidence_references: EvidenceReferences;
  mode: string;
  status: string;
}

// ===== API Response Wrapper =====
export interface ApiError {
  detail: string;
}

// ===== UI State =====
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// ===== Diagnosis =====
export interface Diagnosis {
  diagnosis_id: string;
  patient_id: string;
  encounter_id: string;
  icd10_code: string | null;
  description: string;
  recorded_date: string;
  created_at: string;
}

// ===== Procedure =====
export interface Procedure {
  procedure_id: string;
  patient_id: string;
  encounter_id: string;
  procedure_code: string | null;
  description: string;
  procedure_date: string;
  created_at: string;
}

// ===== Admission =====
export interface Admission {
  admission_id: string;
  patient_id: string;
  admission_date: string;
  discharge_date: string | null;
  length_of_stay_days: number | null;
  admission_reason: string | null;
  discharge_summary: string | null;
  created_at: string;
}
