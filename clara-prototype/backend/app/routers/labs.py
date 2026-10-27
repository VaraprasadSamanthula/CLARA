"""Router for lab results endpoint (trend queries)."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.retrieval import LabService
from app.schemas import LabTrendResponse

router = APIRouter(prefix="/api/patients", tags=["labs"])


@router.get("/{patient_id}/labs", response_model=LabTrendResponse)
def get_lab_trend(
    patient_id: str,
    test_name: str = Query(..., description="Lab test name (e.g., 'HbA1c')"),
    db: Session = Depends(get_db),
):
    """Retrieve lab results for a patient by test name, sorted by date."""
    try:
        result = LabService.get_lab_trend(db, patient_id, test_name)
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"Patient '{patient_id}' or lab test '{test_name}' not found",
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
