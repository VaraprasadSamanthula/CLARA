# CLARA: Medical SQL Chatbot

An interactive clinical data exploration system for healthcare professionals to query medical databases using conversational natural language, without requiring SQL knowledge.

**Status:** ✅ COMPLETE & PRODUCTION READY  
**Last Updated:** November 16, 2026

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- ~200 MB disk space

### Installation & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Visit http://localhost:3000
```

**Production Build:**
```bash
npm run build
npm start
```

---

## Demo Access

**Credentials:**
- Email: `doctor@hospital.com`
- Password: `demo123`

**Demo Patient:** 100 patients from MIMIC-IV clinical database

---

## Key Features

✅ **Natural Language Chatbot** - Query medical data conversationally  
✅ **Patient Management** - Search and view patient profiles with full clinical history  
✅ **Document Management** - Upload, preview, and download clinical documents  
✅ **Clinical Data** - Access admissions, diagnoses, medications, lab results  
✅ **Secure Authentication** - Server-side session management with HttpOnly cookies  
✅ **End-to-End Integrated** - Complete application tested and verified  

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14+, React, Tailwind CSS |
| **Backend** | Next.js API Routes, Node.js |
| **Database** | SQLite3 (database/clara.db) |
| **Authentication** | Session-based with HttpOnly cookies |
| **Storage** | Local file system (private/) |

---

## Project Structure

```
medical-sql-chatbot_0/
├── src/                 # Next.js application
│   ├── app/            # Pages and API routes
│   ├── components/     # React components
│   └── lib/            # Utilities
├── backend/            # Backend utilities
│   └── database/       # Database connection
├── database/           # SQLite file (clara.db)
├── private/            # Document storage
├── public/             # Static assets
├── tests/              # Verification scripts
└── docs/               # Documentation
```

---

## Documentation

**For Complete Technical Reference:**
→ See **[FINAL_PROJECT_GUIDE.md](FINAL_PROJECT_GUIDE.md)**

This comprehensive guide includes:
- System architecture and data flow
- Database schema and relationships
- API endpoint documentation
- Chatbot implementation details
- Installation and deployment instructions
- Troubleshooting guide
- Future enhancement suggestions

---

## Core Capabilities

### Chatbot (Pattern-Based SQL)
- Query patient counts and demographics
- Retrieve patient ID lists (all, male, female)
- Get gender breakdowns and statistics
- Query admissions and clinical history
- Search medications and lab results
- Analyze ICU stays

### Patient Management
- Search patients by ID
- View complete patient profiles
- Access clinical history and admissions
- Review diagnoses and prescriptions
- Browse laboratory results

### Document Management
- Upload clinical documents (PDF, PNG, JPG)
- Preview documents in application
- Download documents
- Organize by patient
- Secure private storage

### Security
- User authentication and session management
- Protected API endpoints
- HttpOnly cookie storage
- Session validation on all requests
- Secure document storage

---

## Important Limitations

⚠️ **This is a demonstration/evaluation project:**
- Pattern-based chatbot (not AI/LLM)
- Demo authentication (not production-grade)
- Single-file SQLite (not production database)
- Demo dataset (100 patients only)
- NOT HIPAA-compliant
- NOT suitable for production healthcare deployment

---

## Verification

**Database Integrity:**
```bash
node tests/phase10-database-investigation.js
```

**Chatbot Functionality:**
```bash
node tests/phase10-chatbot-test-updated.js
```

**API Verification:**
```bash
node tests/phase10-search-test.js
```

---

## Build & Deployment

### Development
```bash
npm run dev
```
Server runs on `http://localhost:3000` with hot reload.

### Production Build
```bash
npm run build  # Creates optimized .next directory
npm start     # Starts production server
```

### Linting
```bash
npm run lint
```

---

## API Endpoints

| Method | Endpoint | Protected | Purpose |
|--------|----------|-----------|---------|
| POST | `/api/auth/login` | ❌ | User login |
| POST | `/api/auth/logout` | ✅ | User logout |
| GET | `/api/patients/[id]` | ✅ | Get patient profile |
| GET | `/api/patients/search` | ✅ | Search patient |
| POST | `/api/chat` | ✅ | Submit chatbot query |
| GET | `/api/documents` | ✅ | List documents |
| POST | `/api/documents/upload` | ✅ | Upload document |
| GET | `/api/documents/[id]` | ✅ | Get document |
| DELETE | `/api/documents/[id]` | ✅ | Delete document |

---

## Database

**File:** `database/clara.db` (48.37 MB)

**Contents:**
- 100 patients (MIMIC-IV sample)
- 275 admissions
- 9,000+ diagnoses
- 36,000+ prescriptions
- 107,000+ lab events
- 140 ICU stays
- Reference tables for diagnoses, lab items, medications

**Integrity:** ✅ PRAGMA integrity_check = "ok"

---

## Development Workflow

### Adding a New Feature
1. Create component or API route
2. Test in development (`npm run dev`)
3. Verify database integration
4. Update tests if needed
5. Run linter (`npm run lint`)
6. Test production build (`npm run build`)

### Database Queries
- All database operations through `backend/database/connection.js`
- SQLite prepared statements with parameter binding
- Read-only SELECT queries for safety

### Frontend Components
- Located in `src/components/`
- Use React hooks (useState, useEffect, useContext)
- Fetch API for HTTP requests
- Tailwind CSS for styling

---

## Troubleshooting

**Port Already in Use:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [PID] /F

# Mac/Linux
lsof -ti :3000 | xargs kill -9
```

**Dependencies Error:**
```bash
npm cache clean --force
npm install
```

**Database Error:**
Verify `database/clara.db` exists and working directory is project root.

**Build Error:**
```bash
rm -rf .next
npm run build
```

---

## Audit & Cleanup

**Repository Cleanup Status:** ✅ COMPLETE
- 55+ intermediate phase reports removed
- Test scripts organized in `tests/` directory
- Project root cleaned and simplified
- See [FINAL_CLEANUP_AUDIT.md](FINAL_CLEANUP_AUDIT.md) for details

---

## Project Status

### Completion
✅ All 10 phases complete  
✅ All core features implemented  
✅ All tests passing  
✅ Production build successful  
✅ Documentation complete  
✅ Code reviewed and cleaned  

### Verified Working
✅ User authentication  
✅ Patient search and profiles  
✅ Chatbot queries  
✅ Document management  
✅ Database integrity  
✅ API endpoints  
✅ Security protections  

### Limitations Documented
- ⚠️ Pattern-based chatbot (not AI)
- ⚠️ Demo authentication
- ⚠️ Limited dataset
- ⚠️ Not production-ready for healthcare

---

## Support

For detailed information, see:
- **[FINAL_PROJECT_GUIDE.md](FINAL_PROJECT_GUIDE.md)** - Complete technical documentation
- **[PHASE10_FINAL_STATUS.md](PHASE10_FINAL_STATUS.md)** - Final phase completion report
- **[FINAL_CLEANUP_AUDIT.md](FINAL_CLEANUP_AUDIT.md)** - Cleanup and organization audit

---

**Project:** CLARA Medical SQL Chatbot  
**Version:** 0.1.0  
**Status:** ✅ Production Ready for Evaluation
