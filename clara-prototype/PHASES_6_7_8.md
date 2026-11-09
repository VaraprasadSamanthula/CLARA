# CLARA Phases 6-8: Production Hardening & Deployment

## Overview

This document describes the completion of Phases 6, 7, and 8 for CLARA production readiness.

## Phase 6: PostgreSQL Migration & Production Config

### New Files

#### `backend/config.py`
- **Purpose:** Centralized configuration using Pydantic Settings
- **Features:**
  - Environment-based settings (development, staging, production)
  - Database URL and connection pooling configuration
  - JWT and authentication settings
  - CORS configuration
  - LLM provider selection
  - Rate limiting settings
  - Security flags

#### `.env.production` & `.env.staging`
- **Purpose:** Environment templates for production and staging
- **Variables:**
  - `DATABASE_URL`: PostgreSQL connection string (set by Render.com)
  - `SECRET_KEY`: JWT secret (must be generated per environment)
  - `CORS_ORIGINS`: Allowed origins for frontend
  - `LLM_PROVIDER`: Which LLM to use (mock, gemini, openai)

#### `backend/scripts/migrate_to_postgres.py`
- **Purpose:** Safe data migration from SQLite → PostgreSQL
- **Features:**
  - Connects to both databases
  - Creates all tables in target PostgreSQL
  - Migrates data row by row in dependency order
  - Verifies row counts match after migration
  - Safety: `--drop-target` flag requires explicit confirmation
- **Usage:**
  ```bash
  python scripts/migrate_to_postgres.py \
    --source sqlite:///./clara.db \
    --target postgresql://user:password@localhost/clara_new
  ```

### Modified Files

#### `backend/app/database.py`
- **Changes:**
  - Uses `config.settings` instead of `os.getenv()`
  - Connection pooling for PostgreSQL:
    - `pool_size=20`: Max connections in pool
    - `max_overflow=10`: Additional connections if needed
    - `pool_recycle=3600`: Recycle connections after 1 hour
  - SQLite configuration unchanged (WAL mode for development)

#### `backend/requirements.txt`
- **Added:** `slowapi==0.1.9` for rate limiting

---

## Phase 7: Security Hardening

### New Files

#### `backend/app/security.py`
- **Purpose:** Security utilities and validation
- **Functions:**
  - `sanitize_string()`: Remove XSS/injection attempts
  - `validate_email()`: Email format validation
  - `validate_password_strength()`: Enforce strong passwords
  - `get_secure_headers()`: Security headers for production
- **Security Headers:**
  - `X-Content-Type-Options: nosniff` - Prevent MIME type sniffing
  - `X-Frame-Options: DENY` - Prevent clickjacking
  - `X-XSS-Protection: 1; mode=block` - Legacy XSS protection
  - `Strict-Transport-Security` - HTTPS enforcement (production only)
  - `Content-Security-Policy` - Restrict resource loading

### Modified Files

#### `backend/app/main.py`
- **Changes:**
  - Uses `config.settings` for configuration
  - Added middleware stack:
    - `GZIPMiddleware`: Compress responses (reduces bandwidth)
    - `TrustedHostMiddleware`: Prevent host header injection (production only)
    - `CORSMiddleware`: Uses settings from config
  - Initializes `slowapi.Limiter` for rate limiting
  - Debug mode controlled by `settings.debug`

#### `backend/app/routers/auth.py`
- **Changes:**
  - Uses `config.settings` instead of `os.getenv()`
  - Added rate limiting to login endpoint: `5 requests/minute`
  - Prevents brute force attacks
  - `@limiter.limit("5/minute")` decorator on POST /auth/login

---

## Phase 8: Render.com Deployment

### New Files

#### `backend/Procfile`
- **Purpose:** Tells Render.com how to start the backend
- **Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Note:** `$PORT` is set by Render.com (default 8000)

#### `backend/render.yaml`
- **Purpose:** Define all Render services in one file
- **Services:**
  1. **Backend (Web Service)**
     - Python 3.11 runtime
     - Build: Install requirements
     - Start: Run uvicorn
     - Environment: Production config
     - Database: Connected to PostgreSQL
  
  2. **Frontend (Web Service)**
     - Node 18 runtime
     - Build: npm install + npm run build
     - Start: npm run preview (or serve built files)
     - Environment: API URL points to backend
  
  3. **PostgreSQL (Database)**
     - Free tier, 0.5 GB storage
     - Automated backups
     - Internal + external access URLs

#### `backend/Dockerfile`
- **Purpose:** Build Docker image for backend (alternative deployment)
- **Stages:**
  - Builder: Compile Python dependencies
  - Runtime: Minimal image with only runtime dependencies
- **Features:**
  - Multi-stage to reduce image size
  - Health check endpoint
  - Non-root user security (optional enhancement)

#### `docker-compose.yml`
- **Purpose:** Local development with PostgreSQL + services
- **Services:**
  - PostgreSQL database (port 5432)
  - Backend API (port 8000)
  - Frontend (port 5173)
- **Usage:**
  ```bash
  docker-compose up
  ```

#### `DEPLOYMENT.md`
- **Purpose:** Complete deployment guide for Render.com
- **Sections:**
  - Prerequisites
  - Step-by-step deployment instructions
  - Service creation (PostgreSQL, Backend, Frontend)
  - Database migration
  - Verification steps
  - Troubleshooting guide
  - Post-deployment configuration
  - Cost information (free tier)
  - Monitoring and backups

#### `PHASES_6_7_8.md` (this file)
- **Purpose:** Technical summary of Phases 6-8 changes

### Modified Files

#### `.gitignore`
- **Added:**
  - `*.db-shm`, `*.db-wal`: SQLite WAL files
  - `.env.production`, `.env.staging`: Environment templates (not secrets)
  - Build artifacts and test cache

---

## Security Improvements

### Before (Phase 5)
- No rate limiting on login
- CORS allowed "*" (all origins)
- No security headers
- Hardcoded secrets in code
- SQLite only (no production DB)

### After (Phase 6-8)
- ✅ Rate limiting: 5 req/min on login endpoint
- ✅ CORS restricted to specific origins via config
- ✅ Security headers: X-Content-Type-Options, X-Frame-Options, CSP, HSTS
- ✅ Configuration management: Settings from environment, never hardcoded
- ✅ PostgreSQL support with connection pooling
- ✅ Gzip compression for responses
- ✅ Trusted host validation (production)
- ✅ Input sanitization utilities available
- ✅ Password strength validation utilities available

---

## Database Migration Strategy

### Local Testing (Before Production)

1. **Start PostgreSQL locally:**
   ```bash
   docker-compose up postgres -d
   ```

2. **Test migration:**
   ```bash
   export DATABASE_URL=postgresql://clara_user:clara_password@localhost:5432/clara_dev
   python scripts/migrate_to_postgres.py \
     --source sqlite:///./clara.db \
     --target $DATABASE_URL
   ```

3. **Verify:**
   ```bash
   # Check row counts
   psql -U clara_user -d clara_dev -c "SELECT COUNT(*) FROM users;"
   ```

### Production Deployment (Render.com)

1. **Create PostgreSQL service in Render**
2. **Populate with seed data:**
   - Option A: Run `app/seed.py` via Render SSH
   - Option B: Run `migrate_to_postgres.py` to copy from local SQLite
3. **Monitor logs for errors**

---

## Configuration Hierarchy

Settings are loaded in this order (last wins):

1. `.env.example` (defaults)
2. `.env` (local development)
3. `.env.production` (production template)
4. Environment variables (Render.com overrides)

### Example: Production Environment Setup

In Render dashboard → Backend service → Environment:

```
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql://user:...@host:5432/db
SECRET_KEY=[generated by Render or provided]
LLM_PROVIDER=mock
CORS_ORIGINS=["https://clara-frontend.onrender.com"]
```

---

## Performance Optimizations

### Connection Pooling
- **PostgreSQL**: 20 connections in pool, 10 overflow, recycle after 1 hour
- **SQLite**: Static pool (one connection) for development

### Compression
- Gzip compression on all responses > 1KB
- Reduces bandwidth by ~60-80%

### Caching
- JWT tokens cached in frontend localStorage
- No redundant auth checks per request

### Database
- Indexes on frequently queried fields (added in Phase 2)
- WAL mode on SQLite for concurrent reads

---

## Monitoring & Logging

### Render.com Dashboard
- Real-time logs available
- Service health status
- CPU/memory usage
- Build/deploy history

### Application Metrics
- Health check endpoint: `/health`
- Returns:
  - Database connection status
  - LLM provider availability
  - API version
  - Provider name (mock/gemini/openai)

### Error Handling
- All errors logged to stdout (captured by Render)
- Frontend errors reported to browser console
- Check `backend/logs/` for local development

---

## Cost Analysis (Free Tier)

| Component | Free Tier | Cost |
|-----------|-----------|------|
| Backend API | Limited compute | $0 |
| Frontend | Limited compute | $0 |
| PostgreSQL | 0.5 GB storage | $0 |
| **Total** | | **$0** |

**Limitations:**
- Services sleep after 15 min inactivity
- First request after sleep: 30+ sec startup
- 0.5 GB database storage
- Limited to 10 services per account

**Upgrade Path:**
- Backend: $12/month → Paid tier (always running, 1GB RAM)
- Frontend: $12/month → Paid tier (always running)
- PostgreSQL: $15/month → Paid tier (2GB RAM, automated backups)

---

## Next Steps After Deployment

1. **Monitor initial traffic**
2. **Configure custom domain** (optional)
3. **Enable real LLM provider** (Gemini/OpenAI API keys)
4. **Set up alerting** (via Render logs)
5. **Plan scaling** (upgrade from free tier if needed)
6. **Document runbook** for maintenance

---

## Troubleshooting Reference

### "502 Bad Gateway"
- Backend service not running
- Check: Build logs, startCommand, environment variables

### "Connection refused" from frontend
- Backend service not reachable
- Check: CORS_ORIGINS includes frontend URL
- Check: Firewall/network policies

### "Relation does not exist" error
- Database migration not run
- Check: Run seed script or migration script

### "Rate limit exceeded"
- Hit login attempt limit (5/min)
- Wait 1 minute before retrying

---

## Security Checklist

- [x] Rate limiting on authentication endpoints
- [x] CORS restricted to specific origins
- [x] Security headers configured
- [x] Environment variables (no hardcoded secrets)
- [x] Password hashing (argon2)
- [x] JWT token expiration (24h)
- [x] Input sanitization utilities
- [x] HTTPS enforced in production (HSTS header)
- [x] Gzip compression enabled
- [x] Database connection pooling
- [ ] WAF/DDoS protection (requires paid Render tier)
- [ ] API key rotation policy
- [ ] Audit logging (optional enhancement)

---

## Rollback Procedure

If deployment fails:

1. **In Render dashboard:**
   - Go to Backend service → Deploys
   - Select previous successful deploy
   - Click "Redeploy"

2. **If database is corrupt:**
   - Restore from backup (PostgreSQL service → Backups)
   - Re-run migration/seed script

3. **If secrets are compromised:**
   - Rotate `SECRET_KEY` in Render
   - All existing JWT tokens become invalid
   - Users must log in again

---

## File Structure

```
clara-prototype/
├── backend/
│   ├── app/
│   │   ├── main.py (updated: config, middleware, rate limiting)
│   │   ├── database.py (updated: connection pooling)
│   │   ├── security.py (new: sanitization, validation, headers)
│   │   ├── routers/
│   │   │   └── auth.py (updated: rate limiting)
│   │   └── ... (other files unchanged)
│   ├── scripts/
│   │   ├── migrate_to_postgres.py (new: SQLite → PostgreSQL)
│   │   └── __init__.py (new)
│   ├── config.py (new: centralized settings)
│   ├── Dockerfile (new: container build)
│   ├── Procfile (new: Render start command)
│   ├── render.yaml (new: Render services definition)
│   ├── requirements.txt (updated: +slowapi)
│   └── .env.{production,staging} (new: templates)
├── frontend/
│   └── ... (unchanged, configured via .env)
├── docker-compose.yml (new: local dev with PostgreSQL)
├── DEPLOYMENT.md (new: complete deployment guide)
├── PHASES_6_7_8.md (this file)
└── .gitignore (updated: exclude env files, build artifacts)
```

---

## Summary

**Phase 6** established production-ready infrastructure:
- PostgreSQL support with connection pooling
- Centralized configuration management
- Data migration tools
- Environment-specific configurations

**Phase 7** hardened security:
- Rate limiting on auth endpoints
- Security middleware and headers
- Input validation utilities
- CORS configuration

**Phase 8** prepared deployment:
- Render.com deployment files (Procfile, render.yaml)
- Docker containerization
- Comprehensive deployment guide
- Local testing with docker-compose

**Result:** CLARA is production-ready and deployable to Render.com free tier with:
- ✅ PostgreSQL database
- ✅ Security hardening
- ✅ Zero deployment cost
- ✅ Automated backups
- ✅ Easy rollback capability
