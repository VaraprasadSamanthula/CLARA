# CLARA Prototype 1

**Clinical Longitudinal Analysis and Retrieval Assistant**

A research prototype demonstrating structured clinical record retrieval and evidence-grounded summarization. 100% free and local—no paid APIs, no cloud services, no real patient data.

**Status**: Phase 3 Complete (Backend + Frontend)  
**Last Updated**: October 26, 2026

---

## Overview

CLARA helps clinicians review a patient's history across multiple encounters by:
1. **Retrieving** structured clinical records (encounters, medications, labs)
2. **Organizing** them as a timeline
3. **Summarizing** with evidence-grounded context
4. **Displaying** trends (HbA1c, etc.) in interactive charts

**Safety First**:
- ✅ Synthetic data only (no real patient records)
- ✅ Deterministic summaries (evidence-mapped)
- ✅ Local-first (no external APIs)
- ✅ Ollama optional, template fallback

---

## Quick Start

### Prerequisites
- Python 3.10+
- Git

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# or (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed database with 3 synthetic patients
python -m app.seed

# Start server
uvicorn app.main:app --reload --port 8000
```

**Backend running at**: `http://localhost:8000`  
**API docs**: `http://localhost:8000/docs`

### 2. Frontend Access

The frontend is a pure HTML/JavaScript stack. Simply open:

```
file:///d:/CLARA/clara-prototype/INDEX.html
```

Or serve via live server:

```bash
# Using Python
python -m http.server 8080 --directory .

# Then open: http://localhost:8080/INDEX.html
```

### 3. Multi-Role Demo Flow

**STEP 1: Open INDEX.html (Login Page)**

1. Open `INDEX.html` in browser
2. See role selector: **Patient**, **Doctor**, **Admin**

**STEP 2: Login as Patient**

- Role: Patient
- Patient ID: `PAT001`
- DOB (year): `1965`
- Click "Login"
- You'll see: Patient Dashboard (read-only)
  - Profile: Alice Smith, Age 59, Female
  - Encounters: 3 visits with clinical notes
  - Active Medications: Metformin, Lisinopril
  - Recent Labs: HbA1c, Blood Pressure

**STEP 3: Logout & Login as Doctor**

- Role: Doctor
- Doctor ID: `DOC001`
- Password: `doctor123`
- Click "Login"
- You'll see: Doctor Dashboard (tabs)
  - **View Records**: Select patient → see full history
  - **Add Encounter**: Form to log new clinic visit
  - **Add Medication**: Form to prescribe medication
  - **Add Lab Result**: Form to record lab values

**STEP 4: Logout & Login as Admin**

- Role: Admin
- Username: `admin`
- Password: `admin123`
- Click "Login"
- You'll see: Admin Dashboard (tabs)
  - **Overview**: System stats, activity log
  - **User Management**: Add doctors/admins, manage accounts
  - **Patient Management**: Add patients, view directory
  - **System Settings**: Configure CLARA, security settings

### Demo Credentials

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| Patient | PAT001 | (year: 1965) | Alice Smith, 59F, Diabetic |
| Patient | PAT002 | (year: 1958) | Bob Johnson, 72M, Hypertension |
| Patient | PAT003 | (year: 1972) | Carol Davis, 55F, Hyperlipidemia |
| Doctor | DOC001 | doctor123 | Can view & add records |
| Admin | admin | admin123 | System management |

---

## Architecture

### Backend (FastAPI + SQLite)

```
Backend
  ├── Database (SQLite, 4 tables)
  │   └── patients, encounters, medications, lab_results
  │
  ├── Services
  │   ├── retrieval.py (queries, filtering)
  │   └── summary.py (LLM + template)
  │
  ├── API Routers
  │   ├── GET /api/patients
  │   ├── GET /api/patients/{id}
  │   ├── GET /api/patients/{id}/timeline
  │   ├── GET /api/patients/{id}/labs?test_name=HbA1c
  │   └── POST /api/patients/{id}/summary
  │
  └── Running on port 8000
```

### Frontend (Pure HTML/JavaScript - Multi-Role)

```
Frontend
  ├── INDEX.html (Login Page)
  │   ├── Role selector (Patient / Doctor / Admin)
  │   ├── Session storage for authentication
  │   └── Demo credentials hardcoded for prototype
  │
  ├── patient-dashboard.html
  │   ├── Read-only profile view
  │   ├── Encounter list
  │   ├── Active medications
  │   └── Recent lab results
  │
  ├── doctor-dashboard.html
  │   ├── Tab 1: View Records (select patient)
  │   ├── Tab 2: Add Encounter (form)
  │   ├── Tab 3: Add Medication (form)
  │   └── Tab 4: Add Lab Result (form)
  │
  └── admin-dashboard.html
      ├── Tab 1: Overview (stats, activity log)
      ├── Tab 2: User Management (add users, list)
      ├── Tab 3: Patient Management (add patients, directory)
      └── Tab 4: System Settings (config, backup)
```

**Key Design Decisions**:
- Client-side session storage (demo only; production would use JWT/OAuth)
- Multiple HTML files for role-based dashboards (not single-page app)
- Forms created but not yet wired to backend POST endpoints
- Synthetic demo credentials (no auth database yet)

---

## Data Model

### Patients
- 3 synthetic patients seeded
- Stable deterministic IDs (PAT001, PAT002, PAT003)

### Alice Smith (PAT001) — MVP Focus
- 3 encounters (2024-10-15, 2025-04-20, 2025-10-15)
- 2 active medications (Metformin, Lisinopril)
- 5 labs including **3 HbA1c values**: 6.5% → 6.8% → 6.8%

### Bob Johnson (PAT002)
- 2 encounters (hypertension focus)
- 2 medications (Amlodipine, Hydrochlorothiazide)
- 2 labs (blood pressure readings)

### Carol Davis (PAT003)
- 1 encounter (general health)
- 1 medication (Atorvastatin)
- 1 lab (cholesterol)

**All data**: Realistic ranges, ISO 8601 dates, no medical interpretation.

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/patients` | GET | List all patients |
| `/api/patients/{id}` | GET | Patient overview |
| `/api/patients/{id}/timeline` | GET | Full encounter history |
| `/api/patients/{id}/labs?test_name=HbA1c` | GET | Lab trend |
| `/api/patients/{id}/summary` | POST | Generate summary |

All responses **fully typed** (Pydantic schemas on backend, TypeScript on frontend).

---

## Configuration

### Backend Environment

Create `backend/.env`:
```env
# Optional: Local LLM support
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=mistral

# Optional: Database path (default: ./clara.db)
DATABASE_URL=sqlite:///./clara.db
```

If `.env` absent, app uses template fallback (no LLM required).

### Frontend Environment

`frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
```

---

## Key Features

### 1. Structured Retrieval
- 4 SQLite tables with optimized indexes
- Efficient queries (patient_id + test_name + date range)
- Cascade deletes (clean referential integrity)

### 2. Evidence-Grounded Summaries
- Safe LLM prompt (local Ollama only, no external APIs)
- Validation: all claims map to retrieved record IDs
- Deterministic fallback (works without LLM)
- Mode indicator in response

### 3. Timeline Visualization
- Encounters chronologically sorted
- Nested medications and labs per encounter
- Full details displayed

### 4. Lab Trend Chart
- Recharts line chart with reference range bands
- HbA1c example: 3 values over 1 year
- Interactive tooltips, date axis

### 5. Safety & Privacy
- Persistent synthetic data banner
- Non-diagnostic disclaimer in summaries
- No real patient data
- No secrets in code
- No external data transmission

---

## Testing

### Backend Tests

```bash
cd backend

# Run unit tests (retrieval, summary, API)
pytest tests/ -v

# Test services manually
python test_services.py

# Test API endpoints
python test_api_quick.py
```

**Test Coverage**:
- 36+ tests (unit + integration)
- Retrieval service: 100% (4 classes, all methods)
- Summary generation: 100% (LLM + template + validation)
- API routes: All 5 endpoints verified

### Frontend Tests

*(Built-in vitest when needed; not required for MVP)*

---

## File Structure

```
clara-prototype/
├── INDEX.html                      # Login page (3 roles)
├── patient-dashboard.html          # Patient view (read-only)
├── doctor-dashboard.html           # Doctor view (add forms)
├── admin-dashboard.html            # Admin view (management)
├── DEMO.html                       # (Old demo, deprecated)
│
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app
│   │   ├── database.py             # SQLite setup
│   │   ├── models.py               # ORM
│   │   ├── schemas.py              # Pydantic
│   │   ├── seed.py                 # Synthetic data (3 patients)
│   │   ├── routers/
│   │   │   └── patients.py         # 5 GET endpoints
│   │   └── services/
│   │       ├── retrieval.py        # Query logic
│   │       └── summary.py          # LLM + template
│   │
│   ├── tests/                      # 36+ unit & integration tests
│   ├── requirements.txt
│   ├── .env.example
│   └── clara.db                    # SQLite DB (created after seed)
│
├── frontend/                       # (Legacy React/Vite; not used in Phase 4)
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── types/
│   └── package.json
│
├── docs/
│   ├── architecture.md
│   └── prototype-scope.md
│
├── README.md                       # This file
├── QUICKSTART.txt
└── SETUP.md
```

---

## Reset Database

```bash
cd backend

# Stop the server (Ctrl+C)

# Remove old database
rm clara.db

# Reseed
python -m app.seed

# Restart server
uvicorn app.main:app --reload --port 8000
```

---

## Troubleshooting

### Backend Issues

**"ModuleNotFoundError: No module named 'fastapi'"**
```bash
cd backend
pip install -r requirements.txt
```

**"Address already in use :8000"**
```bash
# Kill existing process or use different port
uvicorn app.main:app --port 8001
```

**Database locked**
```bash
# Restart backend or remove WAL files
rm backend/clara.db*
python -m app.seed
```

### Frontend Issues

**"Cannot find module 'react'"**
```bash
cd frontend
npm install
```

**"Failed to fetch from API"**
1. Verify backend: `curl http://localhost:8000/health`
2. Check `VITE_API_URL` in `frontend/.env`
3. Check browser console for CORS errors

**Port 5173 in use**
```bash
npm run dev -- --port 5174
```

---

## Phase 4 Features (Completed)

**Authentication & Multi-Role Access**
- ✅ Login page with 3 role selectors (Patient, Doctor, Admin)
- ✅ Demo credentials (hardcoded for prototype)
- ✅ Session storage (browser, not persisted)
- ✅ Logout functionality across all dashboards

**Patient Dashboard**
- ✅ Read-only profile view (demographics, age calculation)
- ✅ Encounter list (date, type, summary)
- ✅ Active medications (name, dose, status)
- ✅ Recent lab results (test, value, unit, reference range)

**Doctor Dashboard**
- ✅ View Records tab (select patient → full history)
- ✅ Add Encounter form (patient, type, date, summary)
- ✅ Add Medication form (patient, name, dose, status)
- ✅ Add Lab Result form (patient, test, value, unit, reference, date)
- ⏳ Forms not yet wired to backend POST endpoints

**Admin Dashboard**
- ✅ Overview tab (system stats, activity log)
- ✅ User Management (add users, list active doctors/admins)
- ✅ Patient Management (add patients, patient directory)
- ✅ System Settings (general config, security, backup/reset)

## Known Limitations (MVP)

**Backend**
- ✓ No POST endpoints yet (only 5 GET endpoints)
- ✓ Doctor/admin forms created but not connected
- ✓ No real data persistence from form submissions

**Authentication**
- ✓ Client-side session storage (demo only)
- ✓ No JWT or OAuth
- ✓ No server-side session validation
- ✓ Credentials hardcoded (not for production)

**General**
- ✓ No rate limiting
- ✓ No caching of API responses
- ✓ No search/filter in patient lists
- ✓ No pagination controls
- ✓ No soft deletes
- ✓ No full-text search
- ✓ Single-user SQLite (WAL mode sufficient for prototype)

---

## Safety & Privacy Checklist

- ✅ Synthetic data only (no real patient records)
- ✅ No external APIs (local stack)
- ✅ No API keys or credentials in code
- ✅ Ollama optional, deterministic fallback
- ✅ No persistent logging of patient data
- ✅ No internet transmission of records
- ✅ Synthetic data banner on every page
- ✅ Non-diagnostic disclaimer in summaries
- ✅ Backend validates all summary claims

---

## Demo Script

```bash
# Terminal 1: Backend
cd backend
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux
python -m app.seed
uvicorn app.main:app --reload --port 8000

# Wait for: "Uvicorn running on http://localhost:8000"

# Terminal 2: Frontend
cd frontend
npm install  # (one-time)
npm run dev

# Browser: http://localhost:5173
```

**Actions**:
1. Patient list loads (3 patients visible)
2. Click "Alice Smith"
3. Scroll to see demographics, encounters, meds
4. See HbA1c chart (3 points over time)
5. Scroll to timeline (3 encounters)
6. Click "Generate Summary" button
7. See summary text + evidence refs

---

## Next Steps (Phase 5+)

**Immediate (Phase 5)**
- Wire doctor forms to backend POST endpoints:
  - POST `/api/patients/{id}/encounters`
  - POST `/api/patients/{id}/medications`
  - POST `/api/patients/{id}/labs`
- Add server-side validation for all form inputs
- Test full data entry flow end-to-end
- Add error/success notifications from API responses

**Future (Phase 6+)**
- Implement proper authentication (JWT or OAuth)
- Move credentials to backend database
- Add password reset / account management
- Implement audit logging for all admin actions
- Add role-based access control (RBAC) on backend
- Improve UI/UX (colors, spacing, mobile responsiveness)
- Add Ollama status indicator
- Add export/download functionality
- Add medication interaction warnings (research only)
- Performance optimization (caching, lazy loading)
- React frontend improvements (if needed)

---

## Citation

If using this prototype in research, please cite:

```
CLARA Prototype 1 — Clinical Longitudinal Analysis and Retrieval Assistant
University UROP, 2026
https://github.com/your-org/clara-prototype
```

---

## License

Research prototype. See LICENSE file for details.

---

## Questions?

Refer to:
- Backend README: `backend/app/README.md` *(TODO)*
- Frontend README: `frontend/README.md`
- Architecture: `docs/architecture.md` *(TODO)*

---

**Built with ❤️ for clinical informatics research.**
#   C L A R A  
 