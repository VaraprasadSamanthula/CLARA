"""Router for patient endpoints: list, get, detail."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.retrieval import PatientService
from app.schemas import (
    PatientListResult,
    PatientDetailResponse,
    PatientResponse,
    ErrorResponse,
)

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.get("", response_model=PatientListResult)
def list_patients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all patients with pagination."""
    try:
        patients, total = PatientService.get_all_patients(db, skip=skip, limit=limit)
        return {"patients": patients, "total": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/{patient_id}", response_model=PatientDetailResponse)
def get_patient_detail(patient_id: str, db: Session = Depends(get_db)):
    """Retrieve patient overview: demographics, recent encounters, active meds, recent labs."""
    try:
        detail = PatientService.get_patient_detail(db, patient_id)
        if not detail:
            raise HTTPException(status_code=404, detail="Patient not found")

        patient = detail["patient"]
        recent_encounters = detail["recent_encounters"]
        active_medications = detail["active_medications"]
        recent_labs = detail["recent_labs"]

        return {
            "patient": {
                "patient_id": patient.patient_id,
                "display_name": patient.display_name,
                "birth_year": patient.birth_year,
                "sex": patient.sex,
                "created_at": patient.created_at,
            },
            "recent_encounters": [
                {
                    "encounter_id": e.encounter_id,
                    "patient_id": e.patient_id,
                    "encounter_date": e.encounter_date,
                    "encounter_type": e.encounter_type,
                    "summary": e.summary,
                    "created_at": e.created_at,
                }
                for e in recent_encounters
            ],
            "active_medications": [
                {
                    "medication_id": m.medication_id,
                    "medication_name": m.medication_name,
                    "dose_text": m.dose_text,
                    "status": m.status,
                    "recorded_date": m.recorded_date,
                    "patient_id": m.patient_id,
                    "encounter_id": m.encounter_id,
                    "created_at": m.created_at,
                }
                for m in active_medications
            ],
            "recent_labs": [
                {
                    "lab_id": l.lab_id,
                    "test_name": l.test_name,
                    "value": l.value,
                    "unit": l.unit,
                    "recorded_date": l.recorded_date,
                    "reference_range_text": l.reference_range_text,
                    "patient_id": l.patient_id,
                    "encounter_id": l.encounter_id,
                    "created_at": l.created_at,
                }
                for l in recent_labs
            ],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
