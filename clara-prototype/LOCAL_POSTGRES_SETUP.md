# Local PostgreSQL Setup Guide

## Quick Start: Docker

### Option 1: Using Docker Compose (Easiest)

```bash
cd clara-prototype
docker-compose up
```

This starts:
- PostgreSQL on localhost:5432
- Backend API on localhost:8000
- Frontend on localhost:5173

Open http://localhost:5173 and login with:
- Email: `doctor@clara.local`
- Password: `demo123`

### Option 2: Manual PostgreSQL Setup

**Prerequisites:**
- Docker installed, OR
- PostgreSQL 15+ installed locally

#### Step 1: Start PostgreSQL

**With Docker:**
```bash
docker run --name clara-postgres \
  -e POSTGRES_DB=clara_dev \
  -e POSTGRES_USER=clara_user \
  -e POSTGRES_PASSWORD=clara_password \
  -p 5432:5432 \
  -d postgres:15-alpine
```

**Or with local PostgreSQL:**
```bash
# Create database and user
psql -U postgres -c "CREATE DATABASE clara_dev;"
psql -U postgres -c "CREATE USER clara_user WITH PASSWORD 'clara_password';"
psql -U postgres -c "ALTER DATABASE clara_dev OWNER TO clara_user;"
```

#### Step 2: Set Environment Variable

**PowerShell:**
```powershell
$env:DATABASE_URL = "postgresql://clara_user:clara_password@localhost:5432/clara_dev"
```

**Bash:**
```bash
export DATABASE_URL="postgresql://clara_user:clara_password@localhost:5432/clara_dev"
```

#### Step 3: Start Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Backend runs on http://localhost:8000

#### Step 4: Initialize Database (Choose One)

**Option A: Seed with demo data:**
```bash
python app/seed.py
```

**Option B: Migrate from SQLite:**
```bash
python scripts/migrate_to_postgres.py \
  --source sqlite:///./clara.db \
  --target $DATABASE_URL
```

#### Step 5: Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

---

## Testing the Setup

### 1. Check Backend Health

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "db_connected": true,
  "llm_available": true,
  "llm_provider": "mock"
}
```

### 2. Test Login

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=doctor@clara.local&password=demo123"
```

Expected response:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

### 3. Test Patient List

```bash
curl http://localhost:8000/api/patients
```

Should return list of 3 patients with full medical histories.

### 4. Test Streaming Summary

```bash
# Get a patient ID first
PATIENT_ID=$(curl -s http://localhost:8000/api/patients | jq -r '.[0].patient_id')

# Generate summary (streams chunks)
curl http://localhost:8000/api/patients/$PATIENT_ID/summary/stream \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Troubleshooting

### PostgreSQL Connection Refused

**Problem:** `FATAL: Ident authentication failed`

**Solution:** Check PostgreSQL is running:
```bash
docker ps | grep postgres
# or
psql -U clara_user -d clara_dev -c "SELECT 1;"
```

### "Database does not exist"

**Solution:** Run seed script or migration:
```bash
python app/seed.py
# or
python scripts/migrate_to_postgres.py --source sqlite:///./clara.db --target $DATABASE_URL
```

### "Table does not exist"

**Solution:** The database.py should auto-create tables on startup. If not:
```bash
python -c "from app.database import init_db; init_db()"
```

### Frontend can't connect to backend

**Problem:** CORS error in browser console

**Solution:** Check CORS_ORIGINS in .env or config.py:
```python
# Should include http://localhost:5173 for development
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

### Port Already in Use

**Problem:** `Address already in use`

**Solution:** Kill the process:
```bash
# PowerShell - find and kill process on port 8000
$port = 8000
Get-NetTCPConnection -LocalPort $port | Select-Object OwningProcess | 
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Or use a different port
uvicorn app.main:app --port 8001 --reload
```

---

## Environment Variables for Local Testing

Create/update `backend/.env`:

```env
DATABASE_URL=postgresql://clara_user:clara_password@localhost:5432/clara_dev
ENVIRONMENT=development
DEBUG=true
LLM_PROVIDER=mock
SECRET_KEY=dev-secret-key-only-for-testing
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

---

## Database Inspection

### View Tables and Data

```bash
# Connect to database
psql -U clara_user -d clara_dev

# List tables
\dt

# View users
SELECT * FROM users;

# View patients
SELECT * FROM patients;

# View diagnoses
SELECT COUNT(*) FROM diagnoses;
```

### Backup Database

```bash
pg_dump -U clara_user -d clara_dev > clara_backup.sql
```

### Restore Database

```bash
psql -U clara_user -d clara_dev < clara_backup.sql
```

---

## Performance Testing

### 1. Load Test Backend

```bash
# Install Apache Bench (comes with Apache or can install standalone)
ab -n 100 -c 10 http://localhost:8000/health
```

### 2. Monitor Database Connections

```bash
psql -U clara_user -d clara_dev -c \
  "SELECT count(*) as active_connections FROM pg_stat_activity;"
```

### 3. Check Query Performance

```bash
psql -U clara_user -d clara_dev

# Enable query timing
\timing

# Run a query
SELECT * FROM patients;
```

---

## Cleanup

### Stop Services

**Docker Compose:**
```bash
docker-compose down
```

**Individual Services:**
```bash
# Stop backend (Ctrl+C in terminal)

# Stop frontend (Ctrl+C in terminal)

# Stop PostgreSQL container
docker stop clara-postgres
docker rm clara-postgres
```

### Delete Database

```bash
# Delete PostgreSQL container and volume
docker-compose down -v
```

---

## Next: Deploy to Render.com

Once verified locally, see `DEPLOYMENT.md` for production deployment steps.
