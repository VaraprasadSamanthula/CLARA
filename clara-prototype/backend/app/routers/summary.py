"""Router for summary generation endpoint."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.retrieval import SummaryService
from app.services.summary import generate_summary, SAFE_DISCLAIMER
from app.schemas import SummaryRequest, SummaryResponse

router = APIRouter(prefix="/api/patients", tags=["summary"])


@router.post("/{patient_id}/summary", response_model=SummaryResponse)
def generate_patient_summary(
    patient_id: str,
    request: SummaryRequest = SummaryRequest(),
    db: Session = Depends(get_db),
):
    """Generate clinical summary from retrieved records with optional LLM support."""
    try:
        # Get summary context (all records for patient)
        context = SummaryService.get_summary_context(
            db,
            patient_id,
            max_encounters=request.max_encounters,
        )
        
        if not context:
            raise HTTPException(status_code=404, detail="Patient not found or no records available")

        # Generate summary (LLM or template)
        summary_text, mode = generate_summary(context, use_llm=True)

        # Get evidence references
        evidence_refs = SummaryService.get_evidence_references(context)

        return {
            "patient_id": patient_id,
            "summary_text": summary_text,
            "evidence_references": evidence_refs,
            "mode": mode,
            "status": SAFE_DISCLAIMER,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")
