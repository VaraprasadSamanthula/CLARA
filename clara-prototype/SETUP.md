# CLARA Setup & Run Guide

Complete step-by-step instructions to get the prototype running locally.

## System Requirements

- **OS**: Windows, macOS, or Linux
- **Python**: 3.10 or later
- **Node.js**: 16+ (LTS recommended)
- **Disk Space**: ~200 MB (node_modules + venv)

## 1. Backend Setup

### Step 1.1: Navigate to Backend

```bash
cd clara-prototype/backend
```

### Step 1.2: Create Virtual Environment

**Windows (PowerShell)**:
```powershell
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux**:
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 1.3: Install Dependencies

```bash
pip install -r requirements.txt
```

Expected output:
```
Successfully installed fastapi uvicorn sqlalchemy pydantic python-dotenv pytest httpx requests
```

### Step 1.4: Seed Database

```bash
python -m app.seed
```

Expected output:
```
✓ Database seeded successfully with 3 synthetic patients
  - PAT001: Alice Smith (3 HbA1c values, diabetes focus)
  - PAT002: Bob Johnson (hypertension)
  - PAT003: Carol Davis (general health)
```

Verify:
```bash
ls -lh clara.db  # Should be ~50 KB
```

### Step 1.5: Start Backend Server

```bash
uvicorn app.main:app --reload --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started server process [1234]
INFO:     Waiting for application startup.
```

**Backend is now ready at**: `http://localhost:8000`

Test health check:
```bash
curl http://localhost:8000/health
```

Expected:
```json
{"status":"ok","version":"0.1.0","db_connected":true,"ollama_available":false}
```

---

## 2. Frontend Setup

### Step 2.1: Open New Terminal

Keep backend running in Terminal 1. Open Terminal 2.

### Step 2.2: Navigate to Frontend

```bash
cd clara-prototype/frontend
```

### Step 2.3: Install Dependencies

```bash
npm install
```

This will take 2-5 minutes and download ~500 MB.

Expected output:
```
up to date, audited 200 packages in 3s
```

### Step 2.4: Start Dev Server

```bash
npm run dev
```

Expected output:
```
VITE v5.0.8  ready in 234 ms

➜  Local:   http://localhost:5173/
➜  Press h to show help
```

**Frontend is now ready at**: `http://localhost:5173`

---

## 3. Demo Walkthrough

### Open Browser

Navigate to: `http://localhost:5173`

### Expected Screens

#### Screen 1: Patient List
- Yellow banner: "Synthetic demo data — not for clinical use"
- 3 patients visible:
  - Alice Smith (PAT001) — 3 encounters
  - Bob Johnson (PAT002) — 2 encounters
  - Carol Davis (PAT003) — 1 encounter

**Action**: Click on "Alice Smith"

#### Screen 2: Patient Detail
- Demographics (name, ID, birth year, age, sex)
- Recent encounters table (3 rows)
- Active medications (Metformin, Lisinopril)
- Recent labs (5 rows)

**Action**: Scroll down

#### Screen 3: HbA1c Chart
- Line chart with 3 data points
- X-axis: dates (Oct 2024, Apr 2025, Oct 2025)
- Y-axis: HbA1c % (6.5, 6.8, 6.8)
- Reference range bands (green)

**Action**: Scroll down

#### Screen 4: Full Timeline
- 3 encounters in reverse chronological order
- Each encounter shows:
  - Date and type
  - Summary text
  - Nested medications
  - Nested labs

**Action**: Scroll down

#### Screen 5: Summary Box
- Button: "Generate Summary"

**Action**: Click button

#### Screen 6: Generated Summary
- Summary text (2-3 paragraphs)
- Mode: "template" (unless Ollama is running)
- "Evidence References" dropdown
- When expanded:
  - Date range
  - Encounter IDs
  - Lab IDs
  - Medication IDs
- Disclaimer box

---

## 4. Stopping the App

### Stop Backend

In Terminal 1:
```bash
Ctrl+C
```

### Stop Frontend

In Terminal 2:
```bash
Ctrl+C
```

---

## 5. Reset Database

To clear and reseed:

```bash
cd backend
rm clara.db
python -m app.seed
```

Then restart backend.

---

## 6. Troubleshooting

### Issue: Backend won't start (Port 8000 in use)

```bash
# Use different port
uvicorn app.main:app --reload --port 8001

# Then update frontend .env
# VITE_API_URL=http://localhost:8001
```

### Issue: Frontend won't start (Port 5173 in use)

```bash
npm run dev -- --port 5174
```

### Issue: "ModuleNotFoundError: No module named 'fastapi'"

```bash
cd backend
pip install -r requirements.txt
```

### Issue: "Cannot find module 'react'" after npm install

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Issue: API calls failing (Cannot GET /api/patients)

1. **Verify backend is running**: `curl http://localhost:8000/health`
2. **Check API URL**: `frontend/.env` should have `VITE_API_URL=http://localhost:8000`
3. **Check browser console**: Look for CORS or network errors
4. **Restart both servers**

### Issue: HbA1c chart not showing

- Patient might not have HbA1c labs
- Check: `curl http://localhost:8000/api/patients/PAT001/labs?test_name=HbA1c`
- Should return 3 values for Alice Smith

---

## 7. Optional: Configure Ollama (Advanced)

To use local LLM for summaries:

### 7.1: Install Ollama

Download from: https://ollama.ai

### 7.2: Run Ollama in Background

```bash
# Default: http://localhost:11434
ollama serve
```

Or use Docker:
```bash
docker run -p 11434:11434 ollama/ollama
```

### 7.3: Pull a Model

```bash
ollama pull mistral
```

### 7.4: Update Backend .env

```bash
cd backend
echo 'OLLAMA_API_URL=http://localhost:11434' >> .env
echo 'OLLAMA_MODEL=mistral' >> .env
```

### 7.5: Restart Backend

```bash
uvicorn app.main:app --reload --port 8000
```

### 7.6: Test

Generate a summary. Should show `"mode": "local_llm"` instead of `"template"`.

---

## 8. Build for Production

### Build Frontend

```bash
cd frontend
npm run build
```

Creates `dist/` folder with optimized static files.

### Serve Production Build

```bash
npm run preview
```

Or serve with any static HTTP server:
```bash
python -m http.server 8080 --directory dist
```

---

## 9. Using the API Directly

### Get Patient List

```bash
curl http://localhost:8000/api/patients
```

### Get Patient Detail

```bash
curl http://localhost:8000/api/patients/PAT001
```

### Get HbA1c Trend

```bash
curl "http://localhost:8000/api/patients/PAT001/labs?test_name=HbA1c"
```

### Generate Summary

```bash
curl -X POST http://localhost:8000/api/patients/PAT001/summary
```

### View API Docs

Open: `http://localhost:8000/docs` (Swagger UI)

---

## 10. Common Workflows

### Add a New Synthetic Patient

Edit `backend/app/seed.py` and run:
```bash
python -m app.seed
```

### Change Backend Port

```bash
uvicorn app.main:app --port 8001
```

Update `frontend/.env`:
```
VITE_API_URL=http://localhost:8001
```

### Run Backend Tests

```bash
cd backend
pytest tests/ -v
```

### Quick API Test

```bash
cd backend
python test_api_quick.py
```

---

## 11. Next Steps

- **Phase 4**: Add chart interactivity, improve UI design
- **Phase 5**: Ollama integration (already prepared)
- **Phase 6**: Tests, docs, demo script

---

## Support

If you encounter issues:
1. Check this document
2. Read `README.md` for overview
3. Check backend `requirements.txt` versions
4. Verify Python 3.10+ and Node 16+
5. Review error messages in terminal

---

**Ready to get started?**

```bash
# Terminal 1
cd backend
python -m venv venv
venv\Scripts\activate  # or: source venv/bin/activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload --port 8000

# Terminal 2 (new)
cd frontend
npm install
npm run dev

# Browser
# Open http://localhost:5173
```

**Enjoy exploring CLARA!**
