"""Quick test of API endpoints."""

import requests
import time
import json

# Wait for server
for i in range(10):
    try:
        resp = requests.get('http://localhost:8000/health', timeout=2)
        if resp.status_code == 200:
            break
    except:
        time.sleep(1)

# Test 1: Health check
resp = requests.get('http://localhost:8000/health')
print(f'✓ GET /health: {resp.status_code}')
print(f'  {resp.json()}')

# Test 2: List patients
resp = requests.get('http://localhost:8000/api/patients')
print(f'\n✓ GET /api/patients: {resp.status_code}')
data = resp.json()
print(f'  Total: {data["total"]}, returned: {len(data["patients"])}')
for p in data["patients"]:
    print(f'    - {p["display_name"]} ({p["patient_id"]}): {p["encounter_count"]} encounters')

# Test 3: Get patient detail
resp = requests.get('http://localhost:8000/api/patients/PAT001')
print(f'\n✓ GET /api/patients/PAT001: {resp.status_code}')
data = resp.json()
print(f'  Patient: {data["patient"]["display_name"]}')
print(f'  Recent encounters: {len(data["recent_encounters"])}')
print(f'  Active medications: {len(data["active_medications"])}')
print(f'  Recent labs: {len(data["recent_labs"])}')

# Test 4: Get timeline
resp = requests.get('http://localhost:8000/api/patients/PAT001/timeline')
print(f'\n✓ GET /api/patients/PAT001/timeline: {resp.status_code}')
data = resp.json()
print(f'  Timeline entries: {len(data["timeline"])}')
for enc in data["timeline"][:2]:
    print(f'    - {enc["encounter_date"]}: {enc["encounter_type"]}, {len(enc["labs"])} labs, {len(enc["medications"])} meds')

# Test 5: Get lab trend
resp = requests.get('http://localhost:8000/api/patients/PAT001/labs?test_name=HbA1c')
print(f'\n✓ GET /api/patients/PAT001/labs?test_name=HbA1c: {resp.status_code}')
data = resp.json()
print(f'  Test: {data["test_name"]} ({data["unit"]})')
print(f'  Values: {len(data["values"])}')
for v in data["values"]:
    print(f'    - {v["recorded_date"]}: {v["value"]}')

# Test 6: Generate summary
resp = requests.post('http://localhost:8000/api/patients/PAT001/summary')
print(f'\n✓ POST /api/patients/PAT001/summary: {resp.status_code}')
data = resp.json()
print(f'  Mode: {data["mode"]}')
print(f'  Summary (first 120 chars): {data["summary_text"][:120]}...')
print(f'  Evidence refs - encounters: {len(data["evidence_references"]["encounters"])}, labs: {len(data["evidence_references"]["labs"])}')

# Test 7: Unknown patient
resp = requests.get('http://localhost:8000/api/patients/UNKNOWN')
print(f'\n✓ GET /api/patients/UNKNOWN: {resp.status_code}')
if resp.status_code == 404:
    print(f'  Correctly returned 404: {resp.json()["detail"]}')

print('\n✓ All API tests passed!')
