"""Quick test of services."""

from app.database import SessionLocal
from app.services.retrieval import PatientService, LabService, SummaryService
from app.services.summary import generate_summary

db = SessionLocal()

try:
    # Test 1: Get all patients
    patients, total = PatientService.get_all_patients(db)
    print(f'✓ Test 1: List patients: {total} patients found')

    # Test 2: Get patient detail
    detail = PatientService.get_patient_detail(db, 'PAT001')
    print(f'✓ Test 2: Patient detail: {detail["patient"].display_name} with {len(detail["recent_encounters"])} encounters')

    # Test 3: Get lab trend (HbA1c for Alice)
    labs = LabService.get_lab_trend(db, 'PAT001', 'HbA1c')
    print(f'✓ Test 3: HbA1c trend: {len(labs["values"])} values')
    for v in labs["values"]:
        print(f'    {v["recorded_date"]}: {v["value"]} {labs["unit"]}')

    # Test 4: Get summary context
    context = SummaryService.get_summary_context(db, 'PAT001')
    print(f'✓ Test 4: Summary context: {len(context["encounters"])} encounters, {len(context["labs"])} labs')

    # Test 5: Generate summary
    summary_text, mode = generate_summary(context, use_llm=False)
    print(f'✓ Test 5: Generated summary (mode: {mode})')
    print(f'    {summary_text[:150]}...')

    # Test 6: Unknown patient
    unknown = PatientService.get_patient_by_id(db, 'UNKNOWN')
    print(f'✓ Test 6: Unknown patient: {unknown}')

    print('\n✓ All tests passed!')

finally:
    db.close()
