# CLARA Prototype 1 — Phase 4 Demo Walkthrough

## Setup (One-Time)

### 1. Start the Backend

```bash
cd d:\CLARA\clara-prototype\backend

# Activate virtual environment (Windows)
venv\Scripts\activate

# Seed the database (one-time only)
python -m app.seed

# Start the server
uvicorn app.main:app --reload --port 8000
```

**Expected Output**:
```
INFO:     Uvicorn running on http://localhost:8000 (Press CTRL+C to quit)
```

### 2. Open the Frontend

Open any of these in your browser:
- **Direct file**: `file:///d:/CLARA/clara-prototype/INDEX.html`
- **Local server** (if available): `http://localhost:8080/INDEX.html`

---

## Demo Flows

### FLOW 1: Patient Login & Dashboard

**Step 1: Login Page**
1. Open `INDEX.html`
2. You see: 3 role cards (Patient, Doctor, Admin)
3. "Patient" is selected by default

**Step 2: Enter Patient Credentials**
- Patient ID: `PAT001`
- Date of Birth: `1965`
- Click "Login"

**Step 3: Patient Dashboard**
You see:
- ✅ **Profile Card** at top showing:
  - Name: Alice Smith
  - Age: 59 (calculated from 1965)
  - Sex: Female
  - ID: PAT001

- ✅ **Recent Encounters** table:
  | Date | Type | Summary |
  |------|------|---------|
  | 2025-10-15 | clinic | Annual diabetes check. Continue current regimen. |
  | 2025-04-20 | clinic | Follow-up diabetes visit. Weight stable. |
  | 2024-10-15 | clinic | Annual diabetes check. BP controlled. |

- ✅ **Active Medications** table:
  | Medication | Dose | Status |
  |-----------|------|--------|
  | Metformin | 500 mg twice daily | active |
  | Lisinopril | 10 mg once daily | active |

- ✅ **Recent Labs** table:
  | Test | Value | Unit | Reference | Date |
  |------|-------|------|-----------|------|
  | HbA1c | 6.8 | % | 4.0-6.0 | 2025-10-15 |
  | glucose | 150.0 | mg/dL | 70-100 | 2025-10-15 |
  | HbA1c | 6.8 | % | 4.0-6.0 | 2025-04-20 |
  | HbA1c | 6.5 | % | 4.0-6.0 | 2024-10-15 |
  | glucose | 145.0 | mg/dL | 70-100 | 2024-10-15 |

**Step 4: Logout**
- Click "Logout" button (top right)
- Returns to login page
- Session cleared

---

### FLOW 2: Patient Switching (Same Role)

**From Patient Dashboard**:
1. Logout
2. Login as `PAT002` (Bob Johnson, 1958)
   - See his profile: Age 67, Male
   - See his 2 encounters
   - See his 2 medications
   - See his labs

3. Or try `PAT003` (Carol Davis, 1972)
   - See her profile: Age 53, Female
   - See her 1 encounter
   - See her 1 medication
   - See her 1 lab

---

### FLOW 3: Doctor Login & Dashboard

**Step 1: Return to Login Page**
- Logout from current role
- Or open `INDEX.html` again

**Step 2: Select Doctor Role**
- Click the "👨‍⚕️ Doctor" card
- Form changes to show Doctor fields

**Step 3: Enter Doctor Credentials**
- Doctor ID: `DOC001`
- Password: `doctor123`
- Click "Login"

**Step 4: Doctor Dashboard — View Records Tab**
(This tab is open by default)

- ✅ **Select Patient** (patient cards appear):
  - Alice Smith (PAT001)
  - Bob Johnson (PAT002)
  - Carol Davis (PAT003)

- Click "Alice Smith"
- See patient summary card + tables:
  - Demographics
  - All encounters
  - All medications
  - All recent labs

**Step 5: Doctor Dashboard — Add Encounter Tab**
- Click "Add Encounter" tab
- See form with fields:
  - Patient: (dropdown) select PAT001
  - Encounter Type: Select "clinic"
  - Date: Pick a date
  - Clinical Summary: Type "Follow-up visit - patient improving"
  - Click "Add Encounter"
- ✅ Success message appears: "Encounter added successfully!"
- ⏳ Note: Form not yet wired to backend (data not saved to DB)

**Step 6: Doctor Dashboard — Add Medication Tab**
- Click "Add Medication" tab
- See form with fields:
  - Patient: Select PAT001
  - Medication Name: "Atorvastatin"
  - Dose: "20 mg once daily"
  - Status: "active"
  - Click "Add Medication"
- ✅ Success message appears
- ⏳ Form not yet wired to backend

**Step 7: Doctor Dashboard — Add Lab Result Tab**
- Click "Add Lab Result" tab
- See form with fields:
  - Patient: Select PAT001
  - Test Name: "HbA1c"
  - Value: "6.7"
  - Unit: "%"
  - Reference Range: "4.0-6.0"
  - Date: Pick today
  - Click "Add Lab Result"
- ✅ Success message appears
- ⏳ Form not yet wired to backend

**Step 8: Logout**
- Click "Logout"
- Returns to login page

---

### FLOW 4: Admin Login & Dashboard

**Step 1: Select Admin Role**
- From login page, click "⚙️ Admin" card
- Form changes to show Admin fields

**Step 2: Enter Admin Credentials**
- Username: `admin`
- Password: `admin123`
- Click "Login"

**Step 3: Admin Dashboard — Overview Tab**
(This tab is open by default)

- ✅ **System Stats**:
  - Total Patients: 3
  - Total Doctors: 1
  - Total Encounters: 5
  - Lab Results: 15

- ✅ **System Activity Log** (scrollable):
  ```
  [14:23:15] System initialized
  [14:24:32] Admin login: admin
  [14:25:01] Database connected
  [14:25:30] All services operational
  ```

**Step 4: Admin Dashboard — User Management Tab**
- Click "User Management" tab
- See form to add new user:
  - Username: (text field)
  - User Type: (dropdown) Doctor or Admin
  - Full Name: (text field)
  - Email: (text field)
  - Temporary Password: (text field)
  - Click "Add User"
  - ✅ Success message, user appears in list

- ✅ **Active Users List**:
  - DOC001 - Dr. Robert Johnson (Doctor, Active)
    - Buttons: Edit, Deactivate
  - admin - System Administrator (Admin, Active)
    - Buttons: Edit

**Step 5: Admin Dashboard — Patient Management Tab**
- Click "Patient Management" tab
- See form to add new patient:
  - Patient ID: "PAT004"
  - Display Name: "Diana Williams"
  - Birth Year: 1970
  - Sex: Female
  - Diagnosis: "Asthma, Allergic Rhinitis"
  - Click "Add Patient"
  - ✅ Success message, patient appears in table

- ✅ **Patient Directory Table**:
  | ID | Name | Age | Sex | Status | Actions |
  |----|------|-----|-----|--------|---------|
  | PAT001 | Alice Smith | 59 | F | Active | Edit, Archive |
  | PAT002 | Bob Johnson | 67 | M | Active | Edit, Archive |
  | PAT003 | Carol Davis | 53 | F | Active | Edit, Archive |

**Step 6: Admin Dashboard — System Settings Tab**
- Click "System Settings" tab

- ✅ **General Settings**:
  - System Name: "CLARA System"
  - Organization: "University Hospital"
  - API URL: "http://localhost:8000"
  - Click "Save General Settings" → Success message

- ✅ **Security Settings**:
  - Checkboxes: Require MFA, Enable Audit Logging
  - Session Timeout: 30 minutes
  - Click "Save Security Settings" → Success message

- ✅ **Data Management**:
  - Buttons: "Backup Database", "Reset Demo Data"
  - Click each → Confirmation dialog

- ✅ **About CLARA**:
  - Version: 0.1.0
  - Backend: FastAPI + SQLite
  - Frontend: Pure HTML/JavaScript
  - Disclaimer: Not for clinical use

**Step 7: Logout**
- Click "Logout"
- Returns to login page

---

## What You Can Test Now (Phase 4)

✅ **Login System**
- [x] All 3 roles (Patient, Doctor, Admin)
- [x] Credential validation
- [x] Error messages for invalid credentials
- [x] Session storage on login
- [x] Correct redirect to role dashboard

✅ **Patient Dashboard**
- [x] Profile data loads from API
- [x] Encounters, medications, labs display correctly
- [x] Age calculation works
- [x] Logout works

✅ **Doctor Dashboard**
- [x] View Records tab shows live patient data from API
- [x] Forms display correctly
- [x] Success notifications work
- [x] Form validation (required fields)
- [x] Logout works

✅ **Admin Dashboard**
- [x] All 4 tabs load and display correctly
- [x] Forms display correctly
- [x] Success notifications work
- [x] User/patient lists populate
- [x] System stats display
- [x] Logout works

⏳ **Not Yet Implemented (Phase 5)**
- [ ] Doctor forms wired to backend POST endpoints
- [ ] Admin forms wired to backend CRUD endpoints
- [ ] Data persistence to database from form submissions
- [ ] Proper error handling from backend API responses

---

## Demo Credentials (Quick Reference)

### Patients
```
ID: PAT001  Birth Year: 1965  →  Alice Smith, 59F, Diabetic
ID: PAT002  Birth Year: 1958  →  Bob Johnson, 72M, Hypertension
ID: PAT003  Birth Year: 1972  →  Carol Davis, 55F, Hyperlipidemia
```

### Doctors
```
ID: DOC001  Password: doctor123  →  Dr. Robert Johnson
```

### Admin
```
Username: admin  Password: admin123  →  System Administrator
```

---

## Backend API Verification

### Check Backend Health
```bash
curl http://localhost:8000/health
```

### List All Patients
```bash
curl http://localhost:8000/api/patients
```

### Get Patient Detail
```bash
curl http://localhost:8000/api/patients/PAT001
```

### View API Docs
```
http://localhost:8000/docs
```

---

## Next Steps (What You'll Build in Phase 5)

1. **Wire Doctor Forms to Backend**
   - POST `/api/patients/{id}/encounters`
   - POST `/api/patients/{id}/medications`
   - POST `/api/patients/{id}/labs`

2. **Add Backend Validation**
   - Input validation for all form fields
   - Error responses from API

3. **Test Full Data Entry Flow**
   - Submit form → Data saved to DB → Verify in View Records tab

4. **Improve UX**
   - Error notifications from API
   - Loading spinners during form submission
   - Real-time form validation

---

## Troubleshooting

### Backend Not Responding
```bash
# Check if running on port 8000
netstat -an | findstr 8000

# Restart backend
# Stop (Ctrl+C), then restart:
uvicorn app.main:app --reload --port 8000
```

### Database Issues
```bash
# Reseed database
# Stop backend
rm backend/clara.db
python -m app.seed
# Restart backend
```

### Session Errors
- Clear browser cache/cookies
- Try in incognito/private window
- Try different browser

### Form Not Submitting
- Check browser console (F12 → Console tab)
- Verify all required fields filled
- Backend may not be running

---

**Demo Version**: Phase 4 Complete  
**Date**: October 26, 2026  
**Status**: Ready for Phase 5 (Backend Integration)
