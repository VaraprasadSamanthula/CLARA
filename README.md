# CLARA - Clinical Longitudinal Analysis and Retrieval Assistant
## Prototype 1: Multi-Role Clinical Data Management System

**CLARA** is a comprehensive clinical data management system designed to provide secure, role-based access to patient medical information. The prototype demonstrates a full-stack implementation with patient, doctor, and administrator dashboards.

---

## 🎯 Project Overview

CLARA Prototype 1 is a synthetic demo system showcasing:
- ✅ **Multi-role Authentication** (Patient, Doctor, Admin)
- ✅ **Patient Dashboard** - View medical diagnoses, medications, lab results, and encounters
- ✅ **Doctor Dashboard** - Access patient records, add encounters, medications, and labs
- ✅ **Admin Dashboard** - System management and user oversight
- ✅ **FastAPI Backend** - RESTful API with SQLite database
- ✅ **HTML/JavaScript Frontend** - Client-side session management
- ✅ **Complete Test Suite** - 36+ unit and integration tests

> ⚠️ **Note**: This is synthetic demo data for development purposes only—not suitable for clinical use.

---

## 📋 Quick Start

### Prerequisites
- Python 3.8+
- pip (Python package manager)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/VaraprasadSamanthula/CLARA.git
   cd CLARA
   ```

2. **Install backend dependencies**
   ```bash
   cd clara-prototype/backend
   pip install -r requirements.txt
   ```

3. **Start the backend server** (Terminal 1)
   ```bash
   cd clara-prototype/backend
   uvicorn app.main:app --reload --port 8000
   ```
   
   Expected output:
   ```
   Uvicorn running on http://127.0.0.1:8000
   INFO:     Application startup complete
   ```

4. **Start the frontend server** (Terminal 2)
   ```bash
   cd clara-prototype
   python -m http.server 8080
   ```

5. **Open the website**
   - Navigate to: **http://localhost:8080/INDEX.html**
   - Login with demo credentials (see below)

---

## 🔐 Demo Credentials

### Patient Access
| Username | Password | Notes |
|----------|----------|-------|
| PAT001 | 1965 | Alice Smith, 59 years old, Type 2 Diabetes |
| PAT002 | 1958 | Bob Johnson, 66 years old, Hypertension |
| PAT003 | 1972 | Carol Davis, 54 years old, Dyslipidemia |

### Doctor Access
| Username | Password |
|----------|----------|
| DOC001 | doctor123 |

### Admin Access
| Username | Password |
|----------|----------|
| admin | admin123 |

---

## 🏗️ System Architecture

### Backend Stack
- **Framework**: FastAPI (Python)
- **Database**: SQLite with SQLAlchemy ORM
- **Testing**: pytest (36+ tests)
- **API Endpoints**: 7 RESTful endpoints with CORS support

### Frontend Stack
- **HTML5/CSS3** with responsive design
- **Vanilla JavaScript** for client-side logic
- **Session Storage** for user authentication
- **Fetch API** for server communication

### Data Layer
- **3 Sample Patients** with complete medical history
- **Encounters**: Doctor visit records with summaries
- **Medications**: Active prescriptions with dosages
- **Lab Results**: Historical test values and trends

---

## 📁 Project Structure

```
CLARA/
├── README.md                           # Project documentation
├── CLARA_Prototype_1_Assessment_Plan_and_Kiro_Prompt.docx
│
└── clara-prototype/
    ├── INDEX.html                      # Login page (all 3 roles)
    ├── patient-dashboard.html          # Patient view (7 sections)
    ├── doctor-dashboard.html           # Doctor view (4 tabs)
    ├── admin-dashboard.html            # Admin view (4 tabs)
    ├── DEMO.html                       # Legacy patient list demo
    ├── README.md                       # Setup documentation
    ├── SETUP.md                        # Detailed setup guide
    ├── QUICKSTART.txt                  # Quick reference
    │
    ├── backend/                        # FastAPI backend
    │   ├── app/
    │   │   ├── main.py                 # FastAPI app + CORS config
    │   │   ├── database.py             # SQLAlchemy setup
    │   │   ├── models.py               # Database models
    │   │   ├── schemas.py              # Pydantic schemas
    │   │   ├── seed.py                 # Sample data generation
    │   │   ├── routers/
    │   │   │   ├── patients.py         # Patient endpoints
    │   │   │   ├── timeline.py         # Encounter endpoints
    │   │   │   ├── labs.py             # Lab results endpoints
    │   │   │   └── summary.py          # Summary endpoints
    │   │   └── services/
    │   │       ├── retrieval.py        # Data retrieval logic
    │   │       └── summary.py          # AI summary service (Ollama)
    │   │
    │   ├── tests/
    │   │   ├── test_api.py             # API endpoint tests
    │   │   ├── test_retrieval.py       # Data retrieval tests
    │   │   └── test_summary.py         # Summary service tests
    │   │
    │   ├── clara.db                    # SQLite database
    │   ├── requirements.txt            # Python dependencies
    │   └── test_api_quick.py           # Quick API tests
    │
    └── frontend/                       # React/Vite project (future)
        ├── src/
        │   ├── components/             # React components
        │   ├── hooks/                  # Custom React hooks
        │   ├── services/               # API services
        │   └── App.tsx                 # Main app component
        └── package.json                # Node dependencies
```

---

## 🔌 API Endpoints

All endpoints return JSON data. Base URL: `http://localhost:8000`

### Health Check
- **GET** `/health`
  - Response: `{ "status": "ok", "db_connected": true, "ollama_available": false }`

### Patient Data
- **GET** `/api/patients`
  - Returns: List of all patients
  
- **GET** `/api/patients/{patient_id}`
  - Returns: Complete patient profile with:
    - Patient demographics
    - Recent encounters (visits)
    - Active medications
    - Recent lab results
  
- **GET** `/api/patients/{patient_id}/timeline`
  - Returns: Encounter history with provider notes

- **GET** `/api/patients/{patient_id}/labs`
  - Returns: Lab results with trends

- **GET** `/api/patients/{patient_id}/summary`
  - Returns: AI-generated clinical summary (requires Ollama)

### Example Request
```bash
curl http://localhost:8000/api/patients/PAT001
```

---

## 📊 Dashboard Features

### 👤 Patient Dashboard
After login, patients see 7 sections:

1. **Your Profile**
   - Name, Patient ID, Age, Gender

2. **Medical Diagnoses & Conditions**
   - Primary conditions (e.g., Type 2 Diabetes, Hypertension)

3. **Your Healthcare Provider**
   - Primary care physician details and specialty

4. **Recent Medical Visits**
   - Encounter dates, types, and visit summaries

5. **Your Active Medications**
   - Medication names, dosages, and usage instructions

6. **Lab Results & Test Values**
   - Recent tests (HbA1c, Glucose) with normal ranges
   - Trend indicators

7. **Health Information & Guidance**
   - When to contact doctor
   - Medication safety tips
   - Lifestyle recommendations

### 👨‍⚕️ Doctor Dashboard
Four tabs for clinical record management:

1. **View Records** - Search and view patient data
2. **Add Encounter** - Record clinic visits and summaries
3. **Add Medication** - Prescribe medications
4. **Add Lab** - Record lab test results

### ⚙️ Admin Dashboard
Four tabs for system management:

1. **Overview** - System statistics
2. **User Management** - User administration
3. **Patient Management** - Patient records oversight
4. **System Settings** - Configuration options

---

## 🗄️ Database Schema

### Patients Table
```sql
CREATE TABLE patients (
    patient_id VARCHAR PRIMARY KEY,
    display_name VARCHAR NOT NULL,
    birth_year INTEGER NOT NULL,
    sex VARCHAR(1) NOT NULL,
    created_at VARCHAR NOT NULL
);
```

### Encounters Table
```sql
CREATE TABLE encounters (
    encounter_id VARCHAR PRIMARY KEY,
    patient_id VARCHAR NOT NULL,
    encounter_date VARCHAR NOT NULL,
    encounter_type VARCHAR NOT NULL,
    summary VARCHAR,
    created_at VARCHAR NOT NULL,
    FOREIGN KEY(patient_id) REFERENCES patients(patient_id)
);
```

### Medications Table
```sql
CREATE TABLE medications (
    medication_id VARCHAR PRIMARY KEY,
    patient_id VARCHAR NOT NULL,
    encounter_id VARCHAR NOT NULL,
    medication_name VARCHAR NOT NULL,
    dose_text VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    recorded_date VARCHAR NOT NULL,
    created_at VARCHAR NOT NULL,
    FOREIGN KEY(patient_id) REFERENCES patients(patient_id)
);
```

### Lab Results Table
```sql
CREATE TABLE lab_results (
    lab_id VARCHAR PRIMARY KEY,
    patient_id VARCHAR NOT NULL,
    encounter_id VARCHAR NOT NULL,
    test_name VARCHAR NOT NULL,
    value FLOAT NOT NULL,
    unit VARCHAR NOT NULL,
    reference_range_text VARCHAR,
    recorded_date VARCHAR NOT NULL,
    created_at VARCHAR NOT NULL,
    FOREIGN KEY(patient_id) REFERENCES patients(patient_id)
);
```

---

## ✅ Testing

The project includes a comprehensive test suite (36+ tests).

### Run All Tests
```bash
cd clara-prototype/backend
pytest
```

### Run Specific Test File
```bash
pytest tests/test_api.py -v
```

### Run Quick API Tests
```bash
python test_api_quick.py
```

### Test Coverage
- API endpoints (GET requests for all patient routes)
- Data retrieval services
- Database queries
- Error handling

---

## 🔧 Configuration

### Backend (.env)
Create a `.env` file in `clara-prototype/backend/`:
```
DATABASE_URL=sqlite:///clara.db
OLLAMA_BASE_URL=http://localhost:11434
DEBUG=False
```

### CORS Settings
Frontend runs on `http://localhost:8080`
Backend allows this origin in `app/main.py`:
```python
allow_origins=["http://localhost:8080", "http://localhost:5173", "http://localhost:3000"]
```

---

## 🚀 Deployment Considerations

### Production Setup
1. Use PostgreSQL instead of SQLite
2. Deploy backend to cloud service (AWS, Azure, Heroku)
3. Use environment variables for secrets
4. Enable HTTPS (SSL/TLS)
5. Implement proper authentication (JWT, OAuth2)
6. Add database migrations (Alembic)
7. Set up CI/CD pipeline

### Security Hardening
- Input validation and sanitization
- Rate limiting on API endpoints
- HIPAA compliance for medical data
- Audit logging for data access
- Encryption at rest and in transit

---

## 📝 Sample Data

### Patient: Alice Smith (PAT001)
- **Age**: 59, Female
- **Primary Condition**: Type 2 Diabetes Mellitus
- **Active Medications**:
  - Metformin 500 mg twice daily
  - Lisinopril 10 mg once daily
- **Recent Labs**:
  - HbA1c: 6.8% (reference: 4.0-6.0%)
  - Glucose: 150 mg/dL (reference: 70-100 mg/dL)

### Recent Encounters
1. **2025-10-15** - Annual diabetes check. Continue current regimen.
2. **2025-04-20** - Follow-up diabetes visit. Weight stable.
3. **2024-10-15** - Annual diabetes check. BP controlled.

---

## 🐛 Troubleshooting

### Backend Server Won't Start
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Kill process using that port
taskkill /PID <PID> /F

# Restart backend
uvicorn app.main:app --reload --port 8000
```

### Frontend Shows "Failed to Fetch"
- Ensure backend is running on `http://localhost:8000`
- Check browser console (F12) for error details
- Verify CORS settings in `app/main.py`
- Restart both servers

### Login Not Working
- Clear browser cache and session storage (F12 → Application → Storage)
- Verify credentials match demo credentials table
- Check browser console for JavaScript errors
- Try incognito/private browsing mode

### Database Errors
```bash
# Reset database
rm clara-prototype/backend/clara.db*

# Restart backend to reinitialize database
uvicorn app.main:app --reload --port 8000
```

---

## 📚 Future Enhancements

- [ ] JWT-based authentication with refresh tokens
- [ ] Role-based access control (RBAC)
- [ ] AI-powered clinical summaries (Ollama integration)
- [ ] Prescription writing and e-pharmacy integration
- [ ] Appointment scheduling
- [ ] Telemedicine video consultation
- [ ] Mobile app (React Native)
- [ ] Advanced search and filtering
- [ ] Data export (PDF, HL7)
- [ ] Integration with EHR systems (HL7 FHIR)

---

## 📄 License

This project is provided as-is for educational and demonstration purposes. 

**⚠️ Clinical Disclaimer**: This synthetic demo system is not approved for real clinical use. For actual healthcare applications, consult with medical informatics specialists and ensure HIPAA compliance.

---

## 👥 Authors & Contributors

- **Developer**: Kiro AI
- **Project Owner**: Varaprasad Samanthula

---

## 📞 Support & Contact

For issues, feature requests, or questions:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review existing GitHub issues
3. Create a new GitHub issue with detailed description

---

## 🎓 Learning Resources

### Understanding CLARA
- Read `CLARA_Prototype_1_Assessment_Plan_and_Kiro_Prompt.docx`
- Review `SETUP.md` for detailed installation
- Check `QUICKSTART.txt` for quick reference

### FastAPI Documentation
- https://fastapi.tiangolo.com/

### SQLAlchemy ORM
- https://docs.sqlalchemy.org/

### JavaScript Fetch API
- https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API

---

**Last Updated**: October 2026 | **Version**: 1.0.0 | **Status**: Active Development

---

## 🎉 Getting Started Now

1. Clone the repository
2. Install dependencies
3. Run both servers (backend + frontend)
4. Open `http://localhost:8080/INDEX.html`
5. Login with demo credentials
6. Explore the dashboards!

**Happy coding! 🚀**
