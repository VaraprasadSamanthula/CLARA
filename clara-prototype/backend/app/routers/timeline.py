"""Router for patient timeline endpoint."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.services.retrieval import TimelineService
from app.schemas import TimelineResponse

router = APIRouter(prefix="/api/patients", tags=["timeline"])


@router.get("/{patient_id}/timeline", response_model=TimelineResponse)
def get_timeline(
    patient_id: str,
    start_date: Optional[str] = Query(None, description="ISO 8601 start date"),
    end_date: Optional[str] = Query(None, description="ISO 8601 end date"),
    encounter_type: Optional[str] = Query(None, description="Encounter type filter"),
    db: Session = Depends(get_db),
):
    """Retrieve full patient timeline with encounters, medications, and labs."""
    try:
        timeline = TimelineService.get_timeline(
            db,
            patient_id,
            start_date=start_date,
            end_date=end_date,
            encounter_type=encounter_type,
        )
        
        if not timeline:
            raise HTTPException(status_code=404, detail="Patient not found")

        # Serialize response
        response_timeline = []
        for enc in timeline["timeline"]:
            response_timeline.append({
                "encounter_id": enc["encounter_id"],
                "encounter_date": enc["encounter_date"],
                "encounter_type": enc["encounter_type"],
                "summary": enc["summary"],
                "medications": [
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
                    for m in enc["medications"]
                ],
                "labs": [
                    {
                        "lab_id": l.lab_id,
                        "test_name": l.test_name,
                        "value": l.value,
                        "unit": l.unit,
                        "reference_range_text": l.reference_range_text,
                        "recorded_date": l.recorded_date,
                        "patient_id": l.patient_id,
                        "encounter_id": l.encounter_id,
                        "created_at": l.created_at,
                    }
                    for l in enc["labs"]
                ],
            })

        return {
            "patient_id": timeline["patient_id"],
            "timeline": response_timeline,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
