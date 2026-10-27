"""Data retrieval and query logic. Keeps database and ORM logic separate from routes."""

from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional, Dict, Any
from app.models import Patient, Encounter, Medication, LabResult


class PatientService:
    """Service for patient-related queries."""

    @staticmethod
    def get_all_patients(db: Session, skip: int = 0, limit: int = 100):
        """Retrieve all patients with encounter count."""
        patients = db.query(Patient).offset(skip).limit(limit).all()
        total = db.query(Patient).count()
        
        result = []
        for patient in patients:
            encounter_count = db.query(Encounter).filter(
                Encounter.patient_id == patient.patient_id
            ).count()
            result.append({
                "patient_id": patient.patient_id,
                "display_name": patient.display_name,
                "birth_year": patient.birth_year,
                "sex": patient.sex,
                "encounter_count": encounter_count,
            })
        
        return result, total

    @staticmethod
    def get_patient_by_id(db: Session, patient_id: str):
        """Retrieve a single patient by ID."""
        return db.query(Patient).filter(Patient.patient_id == patient_id).first()

    @staticmethod
    def get_patient_age(birth_year: int) -> int:
        """Calculate patient age from birth year."""
        from datetime import datetime
        return datetime.now().year - birth_year

    @staticmethod
    def get_patient_detail(db: Session, patient_id: str):
        """Retrieve patient overview: demographics, recent encounters, active meds, recent labs."""
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if not patient:
            return None

        # Recent encounters (sorted by date, newest first, limit 5)
        recent_encounters = db.query(Encounter).filter(
            Encounter.patient_id == patient_id
        ).order_by(desc(Encounter.encounter_date)).limit(5).all()

        # Active medications
        active_medications = db.query(Medication).filter(
            and_(
                Medication.patient_id == patient_id,
                Medication.status == "active"
            )
        ).order_by(desc(Medication.recorded_date)).limit(10).all()

        # Recent labs (sorted by date, newest first, limit 5)
        recent_labs = db.query(LabResult).filter(
            LabResult.patient_id == patient_id
        ).order_by(desc(LabResult.recorded_date)).limit(5).all()

        return {
            "patient": patient,
            "recent_encounters": recent_encounters,
            "active_medications": active_medications,
            "recent_labs": recent_labs,
        }


class TimelineService:
    """Service for patient timeline queries."""

    @staticmethod
    def get_timeline(
        db: Session,
        patient_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        encounter_type: Optional[str] = None,
    ):
        """Retrieve full patient timeline with encounters, medications, and labs."""
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if not patient:
            return None

        # Build encounter query
        query = db.query(Encounter).filter(Encounter.patient_id == patient_id)
        
        if start_date:
            query = query.filter(Encounter.encounter_date >= start_date)
        if end_date:
            query = query.filter(Encounter.encounter_date <= end_date)
        if encounter_type:
            query = query.filter(Encounter.encounter_type == encounter_type)

        encounters = query.order_by(desc(Encounter.encounter_date)).all()

        # For each encounter, get medications and labs
        timeline = []
        for enc in encounters:
            meds = db.query(Medication).filter(
                Medication.encounter_id == enc.encounter_id
            ).all()
            labs = db.query(LabResult).filter(
                LabResult.encounter_id == enc.encounter_id
            ).all()

            timeline.append({
                "encounter_id": enc.encounter_id,
                "encounter_date": enc.encounter_date,
                "encounter_type": enc.encounter_type,
                "summary": enc.summary,
                "medications": meds,
                "labs": labs,
            })

        return {
            "patient_id": patient_id,
            "timeline": timeline,
        }


class LabService:
    """Service for lab result queries."""

    @staticmethod
    def get_lab_trend(db: Session, patient_id: str, test_name: str):
        """Retrieve all lab results for a patient by test name, sorted by date."""
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if not patient:
            return None

        labs = db.query(LabResult).filter(
            and_(
                LabResult.patient_id == patient_id,
                LabResult.test_name == test_name
            )
        ).order_by(LabResult.recorded_date).all()

        if not labs:
            return None

        # Determine unit from first result
        unit = labs[0].unit

        # Build values list
        values = [
            {
                "lab_id": lab.lab_id,
                "value": lab.value,
                "recorded_date": lab.recorded_date,
                "encounter_id": lab.encounter_id,
                "reference_range_text": lab.reference_range_text,
            }
            for lab in labs
        ]

        return {
            "test_name": test_name,
            "unit": unit,
            "values": values,
        }


class SummaryService:
    """Service for summary generation (retrieval context)."""

    @staticmethod
    def get_summary_context(
        db: Session,
        patient_id: str,
        max_encounters: int = 10,
    ) -> Optional[Dict[str, Any]]:
        """Retrieve all records for a patient to build summary context."""
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if not patient:
            return None

        # Get encounters (limit)
        encounters = db.query(Encounter).filter(
            Encounter.patient_id == patient_id
        ).order_by(Encounter.encounter_date).limit(max_encounters).all()

        if not encounters:
            return None

        encounter_ids = [e.encounter_id for e in encounters]

        # Get medications for these encounters
        medications = db.query(Medication).filter(
            Medication.encounter_id.in_(encounter_ids)
        ).all()

        # Get labs for these encounters
        labs = db.query(LabResult).filter(
            LabResult.encounter_id.in_(encounter_ids)
        ).all()

        # Collect evidence references
        evidence = {
            "patient_id": patient_id,
            "patient_name": patient.display_name,
            "birth_year": patient.birth_year,
            "sex": patient.sex,
            "encounters": [
                {
                    "encounter_id": e.encounter_id,
                    "encounter_date": e.encounter_date,
                    "encounter_type": e.encounter_type,
                    "summary": e.summary,
                }
                for e in encounters
            ],
            "medications": [
                {
                    "medication_id": m.medication_id,
                    "medication_name": m.medication_name,
                    "dose_text": m.dose_text,
                    "status": m.status,
                    "recorded_date": m.recorded_date,
                }
                for m in medications
            ],
            "labs": [
                {
                    "lab_id": l.lab_id,
                    "test_name": l.test_name,
                    "value": l.value,
                    "unit": l.unit,
                    "recorded_date": l.recorded_date,
                }
                for l in labs
            ],
            "date_range": {
                "start": encounters[0].encounter_date,
                "end": encounters[-1].encounter_date,
            },
        }

        return evidence

    @staticmethod
    def get_evidence_references(context: Dict[str, Any]):
        """Extract evidence references from context."""
        return {
            "encounters": [e["encounter_id"] for e in context.get("encounters", [])],
            "medications": [m["medication_id"] for m in context.get("medications", [])],
            "labs": [l["lab_id"] for l in context.get("labs", [])],
            "date_range": context.get("date_range", {}),
        }
