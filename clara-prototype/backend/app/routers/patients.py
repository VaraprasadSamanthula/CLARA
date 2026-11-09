"""Router for patient endpoints: list, get, detail, create, chat."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.retrieval import PatientService
from app.schemas import (
    PatientListResult,
    PatientDetailResponse,
    EncounterResponse,
    EncounterBase,
    MedicationResponse,
    MedicationBase,
    LabResultResponse,
    LabResultBase,
)
from app.models import Encounter, Medication, LabResult, Patient
from datetime import datetime
import uuid
from pydantic import BaseModel

router = APIRouter(prefix="/api/patients", tags=["patients"])


# Request/Response schemas for chat
class ChatRequest(BaseModel):
    """Chat message from doctor."""
    message: str


class ChatResponse(BaseModel):
    """Chat response from AI."""
    response: str
    mode: str  # 'local_llm' or 'template'


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


# ============ POST ENDPOINTS (Data Creation) ============


@router.post("/{patient_id}/encounters", response_model=EncounterResponse, status_code=201)
def create_encounter(
    patient_id: str,
    encounter: EncounterBase,
    db: Session = Depends(get_db)
):
    """Create a new encounter for a patient."""
    try:
        # Validate patient exists
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Validate encounter_date format (basic ISO 8601 check)
        try:
            datetime.fromisoformat(encounter.encounter_date.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            raise HTTPException(status_code=400, detail="Invalid encounter_date format. Use ISO 8601 (YYYY-MM-DD)")
        
        # Create encounter
        encounter_id = f"ENC{uuid.uuid4().hex[:8].upper()}"
        now = datetime.utcnow().isoformat()
        
        new_encounter = Encounter(
            encounter_id=encounter_id,
            patient_id=patient_id,
            encounter_date=encounter.encounter_date,
            encounter_type=encounter.encounter_type,
            summary=encounter.summary,
            created_at=now
        )
        
        db.add(new_encounter)
        db.commit()
        db.refresh(new_encounter)
        
        return {
            "encounter_id": new_encounter.encounter_id,
            "patient_id": new_encounter.patient_id,
            "encounter_date": new_encounter.encounter_date,
            "encounter_type": new_encounter.encounter_type,
            "summary": new_encounter.summary,
            "created_at": new_encounter.created_at,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create encounter: {str(e)}")


@router.post("/{patient_id}/medications", response_model=MedicationResponse, status_code=201)
def create_medication(
    patient_id: str,
    medication: MedicationBase,
    encounter_id: str = None,
    db: Session = Depends(get_db)
):
    """Create a new medication for a patient."""
    try:
        # Validate patient exists
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # If encounter_id not provided, use the most recent encounter
        if not encounter_id:
            latest_encounter = db.query(Encounter)\
                .filter(Encounter.patient_id == patient_id)\
                .order_by(Encounter.encounter_date.desc())\
                .first()
            
            if not latest_encounter:
                raise HTTPException(status_code=400, detail="No encounter found. Provide encounter_id or create an encounter first.")
            
            encounter_id = latest_encounter.encounter_id
        else:
            # Validate encounter exists
            encounter_obj = db.query(Encounter).filter(Encounter.encounter_id == encounter_id).first()
            if not encounter_obj:
                raise HTTPException(status_code=404, detail="Encounter not found")
        
        # Validate recorded_date format
        try:
            datetime.fromisoformat(medication.recorded_date.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            raise HTTPException(status_code=400, detail="Invalid recorded_date format. Use ISO 8601 (YYYY-MM-DD)")
        
        # Create medication
        medication_id = f"MED{uuid.uuid4().hex[:8].upper()}"
        now = datetime.utcnow().isoformat()
        
        new_medication = Medication(
            medication_id=medication_id,
            patient_id=patient_id,
            encounter_id=encounter_id,
            medication_name=medication.medication_name,
            dose_text=medication.dose_text,
            status=medication.status,
            recorded_date=medication.recorded_date,
            created_at=now
        )
        
        db.add(new_medication)
        db.commit()
        db.refresh(new_medication)
        
        return {
            "medication_id": new_medication.medication_id,
            "patient_id": new_medication.patient_id,
            "encounter_id": new_medication.encounter_id,
            "medication_name": new_medication.medication_name,
            "dose_text": new_medication.dose_text,
            "status": new_medication.status,
            "recorded_date": new_medication.recorded_date,
            "created_at": new_medication.created_at,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create medication: {str(e)}")


@router.post("/{patient_id}/labs", response_model=LabResultResponse, status_code=201)
def create_lab(
    patient_id: str,
    lab: LabResultBase,
    encounter_id: str = None,
    db: Session = Depends(get_db)
):
    """Create a new lab result for a patient."""
    try:
        # Validate patient exists
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # If encounter_id not provided, use the most recent encounter
        if not encounter_id:
            latest_encounter = db.query(Encounter)\
                .filter(Encounter.patient_id == patient_id)\
                .order_by(Encounter.encounter_date.desc())\
                .first()
            
            if not latest_encounter:
                raise HTTPException(status_code=400, detail="No encounter found. Provide encounter_id or create an encounter first.")
            
            encounter_id = latest_encounter.encounter_id
        else:
            # Validate encounter exists
            encounter_obj = db.query(Encounter).filter(Encounter.encounter_id == encounter_id).first()
            if not encounter_obj:
                raise HTTPException(status_code=404, detail="Encounter not found")
        
        # Validate recorded_date format
        try:
            datetime.fromisoformat(lab.recorded_date.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            raise HTTPException(status_code=400, detail="Invalid recorded_date format. Use ISO 8601 (YYYY-MM-DD)")
        
        # Create lab result
        lab_id = f"LAB{uuid.uuid4().hex[:8].upper()}"
        now = datetime.utcnow().isoformat()
        
        new_lab = LabResult(
            lab_id=lab_id,
            patient_id=patient_id,
            encounter_id=encounter_id,
            test_name=lab.test_name,
            value=lab.value,
            unit=lab.unit,
            reference_range_text=lab.reference_range_text,
            recorded_date=lab.recorded_date,
            created_at=now
        )
        
        db.add(new_lab)
        db.commit()
        db.refresh(new_lab)
        
        return {
            "lab_id": new_lab.lab_id,
            "patient_id": new_lab.patient_id,
            "encounter_id": new_lab.encounter_id,
            "test_name": new_lab.test_name,
            "value": new_lab.value,
            "unit": new_lab.unit,
            "reference_range_text": new_lab.reference_range_text,
            "recorded_date": new_lab.recorded_date,
            "created_at": new_lab.created_at,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create lab result: {str(e)}")


# ============ CHAT ENDPOINT (Conversational Query) ============


def build_chat_context(patient_id: str, db: Session) -> dict:
    """Build comprehensive patient context for LLM chat."""
    try:
        detail = PatientService.get_patient_detail(db, patient_id)
        if not detail:
            return None
        
        patient = detail["patient"]
        encounters = detail["recent_encounters"]
        medications = detail["active_medications"]
        labs = detail["recent_labs"]
        
        # Get all historical data for more context (not just recent)
        all_encounters = db.query(Encounter)\
            .filter(Encounter.patient_id == patient_id)\
            .order_by(Encounter.encounter_date.desc())\
            .all()
        
        all_medications = db.query(Medication)\
            .filter(Medication.patient_id == patient_id)\
            .order_by(Medication.recorded_date.desc())\
            .all()
        
        all_labs = db.query(LabResult)\
            .filter(LabResult.patient_id == patient_id)\
            .order_by(LabResult.recorded_date.desc())\
            .all()
        
        # Format context for LLM
        context = {
            "patient_name": patient.display_name,
            "patient_id": patient.patient_id,
            "age": datetime.now().year - patient.birth_year,
            "sex": patient.sex,
            "birth_year": patient.birth_year,
            "encounters": [
                {
                    "encounter_date": e.encounter_date,
                    "encounter_type": e.encounter_type,
                    "summary": e.summary
                }
                for e in all_encounters
            ],
            "medications": [
                {
                    "medication_name": m.medication_name,
                    "dose_text": m.dose_text,
                    "status": m.status,
                    "recorded_date": m.recorded_date
                }
                for m in all_medications
            ],
            "labs": [
                {
                    "test_name": l.test_name,
                    "value": l.value,
                    "unit": l.unit,
                    "recorded_date": l.recorded_date,
                    "reference_range_text": l.reference_range_text
                }
                for l in all_labs
            ],
        }
        
        if all_encounters:
            context["date_range"] = {
                "start": all_encounters[-1].encounter_date,
                "end": all_encounters[0].encounter_date
            }
        else:
            context["date_range"] = {"start": "N/A", "end": "N/A"}
        
        return context
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build patient context: {str(e)}")


def build_chat_prompt(doctor_question: str, context: dict) -> str:
    """Build LLM prompt for chat interaction."""
    patient_name = context.get("patient_name", "Patient")
    age = context.get("age", "unknown")
    sex = context.get("sex", "unknown")
    
    # Format encounters with full summaries
    encounters = context.get("encounters", [])
    enc_text = ""
    if encounters:
        for e in encounters:
            enc_text += f"- {e['encounter_date']} ({e['encounter_type']}): {e['summary'] or 'No summary'}\n"
    else:
        enc_text = "- No encounters recorded\n"
    
    # Format medications
    medications = context.get("medications", [])
    med_text = ""
    if medications:
        for m in medications:
            med_text += f"- {m['medication_name']}: {m['dose_text']} (Status: {m['status']}, recorded {m['recorded_date']})\n"
    else:
        med_text = "- No medications recorded\n"
    
    # Format labs
    labs = context.get("labs", [])
    lab_text = ""
    if labs:
        for l in labs:
            ref_range = f" (Range: {l['reference_range_text']})" if l['reference_range_text'] else ""
            lab_text += f"- {l['test_name']}: {l['value']} {l['unit']}{ref_range} (recorded {l['recorded_date']})\n"
    else:
        lab_text = "- No lab results recorded\n"
    
    prompt = f"""You are a clinical assistant helping doctors understand patient data. 
You have access to the patient's medical record below. Answer the doctor's question based ONLY on the information provided.
Do NOT make up or infer information not in the record.
Do NOT make diagnoses or treatment recommendations - only summarize what is in the record.
Be concise and conversational.

PATIENT INFORMATION:
Name: {patient_name}
Age: {age}
Sex: {sex}

CLINICAL ENCOUNTERS:
{enc_text}

MEDICATIONS:
{med_text}

LABORATORY RESULTS:
{lab_text}

DOCTOR'S QUESTION: {doctor_question}

RESPONSE (conversational, based only on the record above):"""
    
    return prompt


@router.post("/{patient_id}/chat", response_model=ChatResponse)
def chat_with_patient(
    patient_id: str,
    chat_request: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    Conversational chat endpoint for doctors to query patient data using natural language.
    
    The AI responds based on patient's complete medical history and context.
    This enables new doctors to quickly understand a patient's condition by asking natural language questions.
    """
    try:
        # Validate patient exists
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Validate question is not empty
        if not chat_request.message or not chat_request.message.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        # Build patient context
        context = build_chat_context(patient_id, db)
        if not context:
            raise HTTPException(status_code=404, detail="Failed to retrieve patient context")
        
        # Build prompt for LLM
        prompt = build_chat_prompt(chat_request.message, context)
        
        # Try LLM first, fallback to template
        response_text = None
        mode = "template"
        
        # Try calling Ollama LLM
        response_text = call_ollama_api(prompt)
        
        if response_text:
            mode = "local_llm"
            response_text = response_text.strip()
        else:
            # Fallback: simple template response
            mode = "template"
            response_text = generate_template_chat_response(chat_request.message, context)
        
        return {
            "response": response_text,
            "mode": mode
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


def generate_template_chat_response(question: str, context: dict) -> str:
    """Fallback template-based response when LLM is not available."""
    patient_name = context.get("patient_name", "Patient")
    
    # Simple template responses based on question keywords
    question_lower = question.lower()
    
    medications = context.get("medications", [])
    encounters = context.get("encounters", [])
    labs = context.get("labs", [])
    
    if any(word in question_lower for word in ["medication", "drug", "taking", "medicine"]):
        if medications:
            med_list = "; ".join([f"{m['medication_name']} ({m['dose_text']})" for m in medications[:5]])
            return f"{patient_name} is currently on: {med_list}."
        else:
            return f"No medications are recorded for {patient_name}."
    
    elif any(word in question_lower for word in ["history", "encounter", "visit", "appointment", "clinic"]):
        if encounters:
            enc_list = "; ".join([f"{e['encounter_date']} - {e['encounter_type']}" for e in encounters[:5]])
            return f"{patient_name}'s recent encounters: {enc_list}."
        else:
            return f"No encounters are recorded for {patient_name}."
    
    elif any(word in question_lower for word in ["lab", "result", "test", "value", "abnormal"]):
        if labs:
            lab_list = "; ".join([f"{l['test_name']} {l['value']} {l['unit']}" for l in labs[:5]])
            return f"Recent lab results for {patient_name}: {lab_list}."
        else:
            return f"No lab results are recorded for {patient_name}."
    
    else:
        # Generic response
        summary_parts = []
        if encounters:
            summary_parts.append(f"{len(encounters)} encounter(s)")
        if medications:
            summary_parts.append(f"{len(medications)} medication(s)")
        if labs:
            summary_parts.append(f"{len(labs)} lab result(s)")
        
        if summary_parts:
            return f"{patient_name}'s record includes: {', '.join(summary_parts)}."
        else:
            return f"No clinical data available for {patient_name}."
