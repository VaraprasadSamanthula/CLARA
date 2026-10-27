"""Pydantic schemas for request/response validation."""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


# ============ Patient Schemas ============

class PatientBase(BaseModel):
    display_name: str
    birth_year: int
    sex: str  # 'M' or 'F'


class PatientCreate(PatientBase):
    patient_id: str


class PatientResponse(PatientBase):
    patient_id: str
    created_at: str

    class Config:
        from_attributes = True


class PatientListResponse(BaseModel):
    patient_id: str
    display_name: str
    birth_year: int
    sex: str
    encounter_count: int = 0


class PatientListResult(BaseModel):
    patients: List[PatientListResponse]
    total: int


# ============ Encounter Schemas ============

class EncounterBase(BaseModel):
    encounter_date: str  # ISO 8601
    encounter_type: str
    summary: Optional[str] = None


class EncounterCreate(EncounterBase):
    encounter_id: str
    patient_id: str


class EncounterResponse(EncounterBase):
    encounter_id: str
    patient_id: str
    created_at: str

    class Config:
        from_attributes = True


# ============ Medication Schemas ============

class MedicationBase(BaseModel):
    medication_name: str
    dose_text: str
    status: str  # 'active', 'completed', 'discontinued'
    recorded_date: str  # ISO 8601


class MedicationCreate(MedicationBase):
    medication_id: str
    patient_id: str
    encounter_id: str


class MedicationResponse(MedicationBase):
    medication_id: str
    patient_id: str
    encounter_id: str
    created_at: str

    class Config:
        from_attributes = True


# ============ Lab Result Schemas ============

class LabResultBase(BaseModel):
    test_name: str
    value: float
    unit: str
    reference_range_text: Optional[str] = None
    recorded_date: str  # ISO 8601


class LabResultCreate(LabResultBase):
    lab_id: str
    patient_id: str
    encounter_id: str


class LabResultResponse(LabResultBase):
    lab_id: str
    patient_id: str
    encounter_id: str
    created_at: str

    class Config:
        from_attributes = True


class LabTrendResponse(BaseModel):
    """Response for lab trend queries (e.g., HbA1c over time)."""
    test_name: str
    unit: str
    values: List[Dict[str, Any]]  # lab_id, value, recorded_date, encounter_id, reference_range_text


# ============ Timeline Schemas ============

class TimelineEncounterResponse(BaseModel):
    """Encounter with nested medications and labs."""
    encounter_id: str
    encounter_date: str
    encounter_type: str
    summary: Optional[str] = None
    medications: List[MedicationResponse]
    labs: List[LabResultResponse]

    class Config:
        from_attributes = True


class TimelineResponse(BaseModel):
    """Full patient timeline."""
    patient_id: str
    timeline: List[TimelineEncounterResponse]


# ============ Patient Detail Schemas ============

class PatientDetailResponse(BaseModel):
    """Comprehensive patient view: demographics, recent encounters, active meds, recent labs."""
    patient: PatientResponse
    recent_encounters: List[EncounterResponse]
    active_medications: List[MedicationResponse]
    recent_labs: List[LabResultResponse]


# ============ Summary Schemas ============

class SummaryRequest(BaseModel):
    """Optional parameters for summary generation."""
    max_encounters: int = 10
    focus_test: Optional[str] = None  # e.g., 'HbA1c'


class EvidenceReferences(BaseModel):
    """References to source records."""
    encounters: List[str]
    medications: List[str]
    labs: List[str]
    date_range: Dict[str, str]  # start, end


class SummaryResponse(BaseModel):
    """Summary response with evidence references."""
    patient_id: str
    summary_text: str
    evidence_references: EvidenceReferences
    mode: str  # 'local_llm' or 'template'
    status: str  # Safe disclaimer message


# ============ Health Check Schemas ============

class HealthCheckResponse(BaseModel):
    status: str
    version: str
    db_connected: bool
    ollama_available: bool


# ============ Error Schemas ============

class ErrorResponse(BaseModel):
    detail: str
