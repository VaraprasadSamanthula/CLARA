#!/usr/bin/env python3
"""
Phase 5 End-to-End Test: Complete workflow verification
Tests the full data entry pipeline: Form → API → Database → Retrieval
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"
PATIENT_ID = "PAT001"

print("=" * 60)
print("PHASE 5 END-TO-END TEST")
print("=" * 60)

# Step 1: Get initial state
print("\n[1/6] Getting initial patient state...")
response = requests.get(f"{BASE_URL}/api/patients/{PATIENT_ID}")
initial_data = response.json()
initial_encounters = len(initial_data['recent_encounters'])
initial_meds = len(initial_data['active_medications'])
initial_labs = len(initial_data['recent_labs'])
print(f"✓ Initial state: {initial_encounters} encounters, {initial_meds} meds, {initial_labs} labs")

# Step 2: Create encounter
print("\n[2/6] Creating new encounter...")
today = datetime.now().strftime("%Y-%m-%d")
encounter_payload = {
    "encounter_date": today,
    "encounter_type": "clinic",
    "summary": "Test encounter from Phase 5 automation"
}
response = requests.post(
    f"{BASE_URL}/api/patients/{PATIENT_ID}/encounters",
    json=encounter_payload
)
assert response.status_code == 201, f"Failed: {response.status_code} - {response.text}"
encounter_data = response.json()
encounter_id = encounter_data['encounter_id']
print(f"✓ Encounter created: {encounter_id}")

# Step 3: Create medication
print("\n[3/6] Creating new medication...")
med_payload = {
    "medication_name": "Test Medication",
    "dose_text": "100 mg daily",
    "status": "active",
    "recorded_date": today
}
response = requests.post(
    f"{BASE_URL}/api/patients/{PATIENT_ID}/medications",
    json=med_payload
)
assert response.status_code == 201, f"Failed: {response.status_code} - {response.text}"
med_data = response.json()
med_id = med_data['medication_id']
print(f"✓ Medication created: {med_id}")

# Step 4: Create lab
print("\n[4/6] Creating new lab result...")
lab_payload = {
    "test_name": "Test Lab",
    "value": 99.9,
    "unit": "mg/dL",
    "reference_range_text": "80-120",
    "recorded_date": today
}
response = requests.post(
    f"{BASE_URL}/api/patients/{PATIENT_ID}/labs",
    json=lab_payload
)
assert response.status_code == 201, f"Failed: {response.status_code} - {response.text}"
lab_data = response.json()
lab_id = lab_data['lab_id']
print(f"✓ Lab result created: {lab_id}")

# Step 5: Verify data persisted (immediately)
print("\n[5/6] Verifying data persisted in database...")
response = requests.get(f"{BASE_URL}/api/patients/{PATIENT_ID}")
updated_data = response.json()

# Check that we can find our newly created records
found_encounter = any(e['encounter_id'] == encounter_id for e in updated_data['recent_encounters'])
found_med = any(m['medication_id'] == med_id for m in updated_data['active_medications'])
found_lab = any(l['lab_id'] == lab_id for l in updated_data['recent_labs'])

assert found_encounter, "Created encounter not found in response!"
assert found_med, "Created medication not found in response!"
assert found_lab, "Created lab not found in response!"

print(f"✓ All data persisted correctly!")
print(f"  ✓ Encounter {encounter_id} found")
print(f"  ✓ Medication {med_id} found")
print(f"  ✓ Lab {lab_id} found")

# Step 6: Verify data structure
print("\n[6/6] Verifying data structure...")

# Find our specific records in the response
found_encounter = next((e for e in updated_data['recent_encounters'] if e['encounter_id'] == encounter_id), None)
assert found_encounter is not None, "Encounter not found!"
assert found_encounter['summary'] == encounter_payload['summary']
print(f"✓ Encounter data validated: {encounter_id}")

found_med = next((m for m in updated_data['active_medications'] if m['medication_id'] == med_id), None)
assert found_med is not None, "Medication not found!"
assert found_med['medication_name'] == med_payload['medication_name']
print(f"✓ Medication data validated: {med_id}")

found_lab = next((l for l in updated_data['recent_labs'] if l['lab_id'] == lab_id), None)
assert found_lab is not None, "Lab not found!"
assert found_lab['test_name'] == lab_payload['test_name']
assert found_lab['value'] == lab_payload['value']
print(f"✓ Lab data validated: {lab_id}")

print("\n" + "=" * 60)
print("✅ PHASE 5 END-TO-END TEST PASSED!")
print("=" * 60)
print("\nSummary:")
print(f"  ✓ All 3 POST endpoints working")
print(f"  ✓ Data persisting correctly")
print(f"  ✓ Data structure validated")
print(f"  ✓ Ready for frontend integration")
print("\n")
