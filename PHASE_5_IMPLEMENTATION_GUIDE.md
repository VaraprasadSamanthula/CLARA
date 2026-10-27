# Phase 5: Form Integration & Data Persistence
## Quick Implementation Guide

**Objective**: Wire Doctor and Admin dashboard forms to backend POST endpoints for data entry and persistence

**Estimated Time**: 2-3 weeks  
**Priority**: 🔴 CRITICAL  
**Status**: Ready to Start

---

## Quick Start: What to Do First

### Day 1: Backend POST Endpoints Setup

#### Task 1.1: Add New Pydantic Schemas
**File**: `backend/app/schemas.py`

Add these new schemas at the end of the file:

```python
class EncounterCreate(BaseModel):
    """Schema for creating new encounter"""
    encounter_date: str  # ISO 8601 format: "2025-10-20T00:00:00"
    encounter_type: str  # "clinic", "telehealth", "lab", "emergency"
    summary: str  # 10-500 characters
    
    class Config:
        example = {
            "encounter_date": "2025-10-20T00:00:00",
            "encounter_type": "clinic",
            "summary": "Patient doing well, continue medication"
        }

class EncounterResponse(BaseModel):
    """Response schema for encounter"""
    encounter_id: str
    patient_id: str
    encounter_date: str
    encounter_type: str
    summary: str
    created_at: str
    
    class Config:
        from_attributes = True

class MedicationCreate(BaseModel):
    """Schema for prescribing medication"""
    encounter_id: str
    medication_name: str  # 2-100 characters
    dose_text: str  # e.g., "500 mg twice daily"
    status: str  # "active" or "inactive"
    recorded_date: str  # ISO 8601 format
    
    class Config:
        example = {
            "encounter_id": "ENC004",
            "medication_name": "Aspirin",
            "dose_text": "81 mg once daily",
            "status": "active",
            "recorded_date": "2025-10-20T00:00:00"
        }

class MedicationResponse(BaseModel):
    """Response schema for medication"""
    medication_id: str
    patient_id: str
    encounter_id: str
    medication_name: str
    dose_text: str
    status: str
    recorded_date: str
    created_at: str
    
    class Config:
        from_attributes = True

class LabResultCreate(BaseModel):
    """Schema for recording lab result"""
    encounter_id: str
    test_name: str  # "HbA1c", "glucose", "blood_pressure", etc.
    value: float  # Numeric value
    unit: str  # "%", "mg/dL", "mmHg", etc.
    reference_range_text: str  # e.g., "4.0-6.0"
    recorded_date: str  # ISO 8601 format
    
    class Config:
        example = {
            "encounter_id": "ENC004",
            "test_name": "HbA1c",
            "value": 7.1,
            "unit": "%",
            "reference_range_text": "4.0-6.0",
            "recorded_date": "2025-10-20T00:00:00"
        }

class LabResultResponse(BaseModel):
    """Response schema for lab result"""
    lab_id: str
    patient_id: str
    encounter_id: str
    test_name: str
    value: float
    unit: str
    reference_range_text: str
    recorded_date: str
    created_at: str
    
    class Config:
        from_attributes = True
```

#### Task 1.2: Add POST Endpoint for Encounters
**File**: `backend/app/routers/patients.py`

Add this new endpoint after the existing GET endpoints:

```python
@router.post("/api/patients/{patient_id}/encounters", status_code=201, response_model=dict)
def create_encounter(
    patient_id: str,
    encounter: EncounterCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new encounter for a patient.
    
    - **patient_id**: Patient ID (e.g., "PAT001")
    - **encounter_date**: Date of encounter in ISO 8601 format
    - **encounter_type**: Type of encounter (clinic, telehealth, lab, emergency)
    - **summary**: Clinical summary of the visit
    
    Returns: Created encounter with 201 status code
    """
    
    # Validate patient exists
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    
    # Validate encounter_type
    valid_types = ["clinic", "telehealth", "lab", "emergency"]
    if encounter.encounter_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid encounter_type. Must be one of: {valid_types}"
        )
    
    # Validate summary length
    if len(encounter.summary) < 10 or len(encounter.summary) > 500:
        raise HTTPException(
            status_code=400,
            detail="Summary must be between 10-500 characters"
        )
    
    # Validate date format (basic check)
    try:
        from datetime import datetime
        datetime.fromisoformat(encounter.encounter_date.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use ISO 8601 (e.g., '2025-10-20T00:00:00')"
        )
    
    # Generate encounter ID
    last_encounter = db.query(Encounter).order_by(Encounter.encounter_id.desc()).first()
    encounter_num = int(last_encounter.encounter_id[3:]) + 1 if last_encounter else 1
    encounter_id = f"ENC{encounter_num:03d}"
    
    # Create new encounter
    from datetime import datetime
    new_encounter = Encounter(
        encounter_id=encounter_id,
        patient_id=patient_id,
        encounter_date=encounter.encounter_date,
        encounter_type=encounter.encounter_type,
        summary=encounter.summary,
        created_at=datetime.utcnow().isoformat()
    )
    
    db.add(new_encounter)
    db.commit()
    db.refresh(new_encounter)
    
    return {
        "success": True,
        "message": "Encounter created successfully",
        "encounter_id": new_encounter.encounter_id,
        "encounter": {
            "encounter_id": new_encounter.encounter_id,
            "patient_id": new_encounter.patient_id,
            "encounter_date": new_encounter.encounter_date,
            "encounter_type": new_encounter.encounter_type,
            "summary": new_encounter.summary,
            "created_at": new_encounter.created_at
        }
    }
```

#### Task 1.3: Add POST Endpoint for Medications
**File**: `backend/app/routers/patients.py`

Add after the encounter endpoint:

```python
@router.post("/api/patients/{patient_id}/medications", status_code=201, response_model=dict)
def create_medication(
    patient_id: str,
    medication: MedicationCreate,
    db: Session = Depends(get_db)
):
    """
    Prescribe a new medication for a patient.
    
    - **patient_id**: Patient ID (e.g., "PAT001")
    - **encounter_id**: Encounter ID where medication was prescribed
    - **medication_name**: Name of medication
    - **dose_text**: Dosage instructions (e.g., "500 mg twice daily")
    - **status**: "active" or "inactive"
    - **recorded_date**: When medication was recorded
    """
    
    # Validate patient exists
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    
    # Validate encounter exists and belongs to patient
    encounter = db.query(Encounter).filter(Encounter.encounter_id == medication.encounter_id).first()
    if not encounter:
        raise HTTPException(status_code=404, detail=f"Encounter {medication.encounter_id} not found")
    if encounter.patient_id != patient_id:
        raise HTTPException(status_code=400, detail="Encounter does not belong to this patient")
    
    # Validate medication name
    if not medication.medication_name or len(medication.medication_name) < 2:
        raise HTTPException(status_code=400, detail="Medication name must be at least 2 characters")
    
    # Validate status
    if medication.status not in ["active", "inactive"]:
        raise HTTPException(status_code=400, detail="Status must be 'active' or 'inactive'")
    
    # Generate medication ID
    last_med = db.query(Medication).order_by(Medication.medication_id.desc()).first()
    med_num = int(last_med.medication_id[3:]) + 1 if last_med else 1
    medication_id = f"MED{med_num:03d}"
    
    # Create new medication
    from datetime import datetime
    new_medication = Medication(
        medication_id=medication_id,
        patient_id=patient_id,
        encounter_id=medication.encounter_id,
        medication_name=medication.medication_name,
        dose_text=medication.dose_text,
        status=medication.status,
        recorded_date=medication.recorded_date,
        created_at=datetime.utcnow().isoformat()
    )
    
    db.add(new_medication)
    db.commit()
    db.refresh(new_medication)
    
    return {
        "success": True,
        "message": "Medication added successfully",
        "medication_id": new_medication.medication_id,
        "medication": {
            "medication_id": new_medication.medication_id,
            "patient_id": new_medication.patient_id,
            "encounter_id": new_medication.encounter_id,
            "medication_name": new_medication.medication_name,
            "dose_text": new_medication.dose_text,
            "status": new_medication.status,
            "recorded_date": new_medication.recorded_date,
            "created_at": new_medication.created_at
        }
    }
```

#### Task 1.4: Add POST Endpoint for Lab Results
**File**: `backend/app/routers/labs.py`

Add at the end of the file:

```python
@router.post("/api/patients/{patient_id}/labs", status_code=201, response_model=dict)
def create_lab_result(
    patient_id: str,
    lab: LabResultCreate,
    db: Session = Depends(get_db)
):
    """
    Record a new lab test result for a patient.
    
    - **patient_id**: Patient ID (e.g., "PAT001")
    - **encounter_id**: Encounter ID where lab was ordered
    - **test_name**: Name of lab test (e.g., "HbA1c")
    - **value**: Numeric lab value
    - **unit**: Unit of measurement (e.g., "%", "mg/dL")
    - **reference_range_text**: Normal range (e.g., "4.0-6.0")
    - **recorded_date**: When lab result was recorded
    """
    
    # Validate patient exists
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    
    # Validate encounter exists and belongs to patient
    encounter = db.query(Encounter).filter(Encounter.encounter_id == lab.encounter_id).first()
    if not encounter:
        raise HTTPException(status_code=404, detail=f"Encounter {lab.encounter_id} not found")
    if encounter.patient_id != patient_id:
        raise HTTPException(status_code=400, detail="Encounter does not belong to this patient")
    
    # Validate test name
    valid_tests = ["HbA1c", "glucose", "blood_pressure", "cholesterol", "creatinine"]
    if lab.test_name not in valid_tests:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid test name. Must be one of: {valid_tests}"
        )
    
    # Validate value is numeric
    try:
        float(lab.value)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Value must be numeric")
    
    # Generate lab ID
    last_lab = db.query(LabResult).order_by(LabResult.lab_id.desc()).first()
    lab_num = int(last_lab.lab_id[3:]) + 1 if last_lab else 1
    lab_id = f"LAB{lab_num:03d}"
    
    # Create new lab result
    from datetime import datetime
    new_lab = LabResult(
        lab_id=lab_id,
        patient_id=patient_id,
        encounter_id=lab.encounter_id,
        test_name=lab.test_name,
        value=lab.value,
        unit=lab.unit,
        reference_range_text=lab.reference_range_text,
        recorded_date=lab.recorded_date,
        created_at=datetime.utcnow().isoformat()
    )
    
    db.add(new_lab)
    db.commit()
    db.refresh(new_lab)
    
    return {
        "success": True,
        "message": "Lab result recorded successfully",
        "lab_id": new_lab.lab_id,
        "lab": {
            "lab_id": new_lab.lab_id,
            "patient_id": new_lab.patient_id,
            "encounter_id": new_lab.encounter_id,
            "test_name": new_lab.test_name,
            "value": new_lab.value,
            "unit": new_lab.unit,
            "reference_range_text": new_lab.reference_range_text,
            "recorded_date": new_lab.recorded_date,
            "created_at": new_lab.created_at
        }
    }
```

---

### Day 2-3: Frontend Form Wiring

#### Task 2.1: Wire Doctor Dashboard - Add Encounter Form
**File**: `doctor-dashboard.html`

Find the form submission section and add:

```javascript
// Add event listener to Add Encounter form
document.getElementById('add-encounter-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Submitting encounter form');
    
    const formData = {
        encounter_date: document.getElementById('encounter-date').value,
        encounter_type: document.getElementById('encounter-type').value,
        summary: document.getElementById('encounter-summary').value
    };
    
    // Validation
    if (!formData.encounter_date || !formData.encounter_type || !formData.summary) {
        alert('Please fill in all fields');
        return;
    }
    
    if (formData.summary.length < 10) {
        alert('Summary must be at least 10 characters');
        return;
    }
    
    console.log('Form data:', formData);
    
    try {
        const response = await fetch(
            `http://localhost:8000/api/patients/${selectedPatientId}/encounters`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            }
        );
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            alert('✅ Encounter added successfully!');
            document.getElementById('add-encounter-form').reset();
            // Reload patient data to show new encounter
            loadPatientData(selectedPatientId);
        } else {
            alert('❌ Failed to add encounter: ' + (data.detail || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error: ' + error.message);
    }
});

// Similar for medications form
document.getElementById('add-medication-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        encounter_id: document.getElementById('med-encounter-id').value,
        medication_name: document.getElementById('medication-name').value,
        dose_text: document.getElementById('dose-text').value,
        status: document.getElementById('med-status').value,
        recorded_date: document.getElementById('med-date').value
    };
    
    // Validation
    if (!formData.encounter_id || !formData.medication_name || !formData.dose_text) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        const response = await fetch(
            `http://localhost:8000/api/patients/${selectedPatientId}/medications`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            }
        );
        
        if (response.ok) {
            alert('✅ Medication added successfully!');
            document.getElementById('add-medication-form').reset();
            loadPatientData(selectedPatientId);
        } else {
            const data = await response.json();
            alert('❌ Failed: ' + (data.detail || 'Unknown error'));
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
});

// Similar for labs form
document.getElementById('add-lab-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        encounter_id: document.getElementById('lab-encounter-id').value,
        test_name: document.getElementById('test-name').value,
        value: parseFloat(document.getElementById('lab-value').value),
        unit: document.getElementById('lab-unit').value,
        reference_range_text: document.getElementById('reference-range').value,
        recorded_date: document.getElementById('lab-date').value
    };
    
    // Validation
    if (!formData.test_name || !formData.value || !formData.unit) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        const response = await fetch(
            `http://localhost:8000/api/patients/${selectedPatientId}/labs`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            }
        );
        
        if (response.ok) {
            alert('✅ Lab result added successfully!');
            document.getElementById('add-lab-form').reset();
            loadPatientData(selectedPatientId);
        } else {
            const data = await response.json();
            alert('❌ Failed: ' + (data.detail || 'Unknown error'));
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
});
```

---

### Day 4-5: Testing

#### Task 3.1: Test POST Endpoints Manually
```bash
# Terminal 1: Make sure backend is running
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Test encounter endpoint
curl -X POST http://localhost:8000/api/patients/PAT001/encounters \
  -H "Content-Type: application/json" \
  -d '{
    "encounter_date": "2025-10-20T00:00:00",
    "encounter_type": "clinic",
    "summary": "Regular checkup, patient doing well"
  }'

# Test medication endpoint
curl -X POST http://localhost:8000/api/patients/PAT001/medications \
  -H "Content-Type: application/json" \
  -d '{
    "encounter_id": "ENC001",
    "medication_name": "Ibuprofen",
    "dose_text": "200 mg every 6 hours",
    "status": "active",
    "recorded_date": "2025-10-20T00:00:00"
  }'

# Test lab endpoint
curl -X POST http://localhost:8000/api/patients/PAT001/labs \
  -H "Content-Type: application/json" \
  -d '{
    "encounter_id": "ENC001",
    "test_name": "HbA1c",
    "value": 7.2,
    "unit": "%",
    "reference_range_text": "4.0-6.0",
    "recorded_date": "2025-10-20T00:00:00"
  }'
```

#### Task 3.2: Manual UI Testing
1. Start backend: `uvicorn app.main:app --port 8000`
2. Start frontend: `python -m http.server 8080`
3. Open `http://localhost:8080/INDEX.html`
4. Login as doctor (DOC001 / doctor123)
5. Go to "View Records" → select patient
6. Click "Add Encounter" tab
7. Fill form with valid data
8. Click "Add" button
9. Verify success message appears
10. Verify new encounter appears in patient record
11. Repeat for medications and labs

---

## Testing Checklist

- [ ] POST `/api/patients/{id}/encounters` creates encounter
- [ ] POST `/api/patients/{id}/medications` creates medication
- [ ] POST `/api/patients/{id}/labs` creates lab result
- [ ] Form validation prevents invalid data
- [ ] Success messages show on valid submission
- [ ] Error messages show on invalid data
- [ ] New data appears in dashboard immediately after submission
- [ ] Database persists new records (check with sqlite3)
- [ ] API responds with correct status codes (201 for success, 400/404 for errors)

---

## Troubleshooting

**Error: "Encounter does not belong to this patient"**
- Ensure encounter_id exists and belongs to selected patient
- Check patient ID matches

**Error: "Invalid encounter_type"**
- Use one of: clinic, telehealth, lab, emergency

**Error: "Value must be numeric"**
- Lab value must be a number (e.g., 7.2, not "7.2 high")

**Error: "CORS error"**
- Ensure frontend is on port 8080 and backend on 8000
- Verify CORS is enabled in `app/main.py`

---

## What's Next After Phase 5?

Once POST endpoints are working:
1. ✅ Commit changes to GitHub
2. ✅ Update README with new endpoints
3. ✅ Move to Phase 6: JWT Authentication
4. ✅ Move to Phase 7: Advanced Features (search, pagination)

---

**Status**: Ready to implement  
**First Task**: Add Pydantic schemas to `schemas.py`  
**Estimated Completion**: 5 business days
