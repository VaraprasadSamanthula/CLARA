# CLARA: Clinical Data Assistant

An interactive clinical data exploration system for healthcare professionals to query and analyze medical records using natural language, without requiring SQL knowledge.

**Current Version:** 0.2.0 (Phase 2: UI/UX Redesign Complete)  
**Status:** ✅ Fully Functional with Known Limitations  
**Last Updated:** November 18, 2026

---

## Overview

CLARA is a demonstration research platform that combines a pattern-based SQL chatbot with professional UI/UX for exploring clinical data. The system allows users to search patient records, view clinical histories, manage documents, and interact with AI-enhanced data retrieval—all through an intuitive web interface.

**⚠️ Important Limitations:**
- **Not Production-Ready for Real Clinical Use:** This is a demonstration/evaluation platform, not suitable for deployment in actual healthcare systems.
- **Not HIPAA-Compliant:** The application does not meet HIPAA requirements and cannot be used with real patient data.
- **Demo Data Only:** Includes 100 synthetic patients from MIMIC-IV. Do not use with real patient information.
- **Pattern-Based Chatbot:** Uses SQL pattern matching for queries, not AI/LLM-based natural language understanding.
- **Research Purpose:** Designed for UROP evaluation and technology demonstration only.

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- ~200 MB disk space
- Git (for cloning)

### Installation

```bash
# Clone the repository
git clone https://github.com/VaraprasadSamanthula/CLARA.git
cd CLARA

# Install dependencies
npm install

# (Optional) Set up environment variables
cp .env.example .env.local  # Create local environment file if needed
```

### Running Locally

**Development Mode:**
```bash
npm run dev
# Visit http://localhost:3000
```

**Production Build:**
```bash
npm run build
npm start
# Visit http://localhost:3000
```

---

## Demo Credentials

**Pre-configured Demo Account:**
- Email: `doctor@hospital.com`
- Password: `demo123`

This account provides access to 100 synthetic MIMIC-IV patients for testing and evaluation.

---

## Key Features

✅ **Patient Management**
- Search patients by ID, phone number, or name
- View complete patient profiles with demographics and clinical history
- Register new patients (manual entry)
- Bulk import patients via CSV or Excel

✅ **Clinical Data Exploration**
- View patient admissions, diagnoses, medications, and lab results
- Access longitudinal clinical records
- Document upload and management (PDF, PNG, JPG)
- Download clinical documents

✅ **Natural Language Interface**
- Query patient data using conversational language
- Pattern-based SQL query generation
- Support for common clinical queries (demographics, diagnoses, medications, etc.)

✅ **Gemini Integration**
- Optional AI-powered response generation for patient-specific questions
- Markdown-formatted clinical summaries
- Integration with Google's Gemini API (requires user-provided API key)

✅ **Professional UI/UX**
- Modern, responsive design with sidebar navigation
- Consistent design system across all pages
- Accessible form validation and error handling
- Clean, intuitive interface suitable for healthcare professionals

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | Next.js 14+, React 18, CSS variables (custom design system) |
| **Backend** | Node.js, Next.js API Routes |
| **Database** | SQLite3 (better-sqlite3) |
| **Authentication** | Session-based (HttpOnly cookies) |
| **UI Framework** | Custom CSS design system (no Tailwind) |
| **Icons** | Lucide-react |
| **AI Integration** | Google Gemini API (optional) |

---

## Project Structure

```
CLARA/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # Backend API routes
│   │   ├── dashboard/         # Main dashboard page
│   │   ├── login/             # Authentication page
│   │   ├── patients/          # Patient management pages
│   │   ├── globals.css        # Design system (CSS variables)
│   │   └── layout.js          # Root layout
│   ├── components/            # React components
│   │   ├── AppLayout.js       # Sidebar navigation layout
│   │   ├── PatientSearch.js   # Patient search component
│   │   ├── PatientProfile.js  # Patient clinical profile
│   │   ├── PatientChat.js     # Patient-specific chat
│   │   ├── DocumentManager.js # Document upload/download
│   │   └── MarkdownRenderer.js # Chat message formatting
│   └── providers/             # React context providers
│       └── ChatStateProvider.js # Chat history state
├── backend/                    # Backend utilities
│   └── database/              # Database connection and queries
├── database/
│   └── clara.db              # SQLite database (not tracked in Git)
├── middleware.ts              # Route protection middleware
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

---

## System Architecture

### Authentication Flow
1. User logs in with email/password at `/login`
2. Backend validates credentials (demo: hardcoded demo account)
3. Server creates session token and returns as HttpOnly cookie
4. Middleware validates cookie on protected routes
5. API endpoints validate session in database before processing

### Patient Search
- Users can search by patient ID, phone number, or full name
- Searches query the MIMIC-IV database
- Results display patient demographics and provide access to clinical records

### Clinical Data Access
- Patient profiles display demographics, admissions, diagnoses, medications, and lab results
- Data retrieved from SQLite database via parameterized queries
- Documents (PDFs, images) can be uploaded and associated with patients

### Chat System
1. **Clinical Chat (Dashboard):** Pattern-based SQL queries on patient population
2. **Patient Chat:** AI-enhanced summaries of individual patient records (requires Gemini API key)

---

## Database

**File:** `database/clara.db` (~48 MB)

**Contents:**
- 100 patient records (synthetic MIMIC-IV data)
- 275+ admissions
- 9,000+ diagnoses
- 36,000+ prescriptions
- 107,000+ lab events
- Reference tables for diagnosis codes, lab items, medications

**Database Integrity:** ✅ Verified via PRAGMA integrity_check

**Important:** The database contains demo/synthetic data only and is safe for development. Do not use with real patient information.

---

## Installation and Setup

### Environment Variables

Create a `.env.local` file (not tracked in Git) with:

```
# Optional: For Gemini AI integration
# Get your API key from https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_api_key_here

# Optional: For database path customization
DATABASE_PATH=database/clara.db
```

Note: `.env.local` is ignored by Git and should not be committed.

### Gemini API Integration (Optional)

The patient-specific chatbot can generate AI-powered clinical summaries using Google's Gemini API:

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Add `GEMINI_API_KEY=your_key` to `.env.local`
4. The chat feature will automatically use the key when available

If no API key is provided, the chatbot still functions using pattern-based responses.

---

## Running the Application

### Development
```bash
npm run dev
```
- Hot reload enabled
- Available at http://localhost:3000
- Use demo credentials to log in

### Production
```bash
npm run build    # Creates optimized build in .next/
npm start        # Starts production server
```

### Testing
```bash
npm run lint     # Run ESLint checks
```

---

## Current Limitations

### Chatbot
- ⚠️ Uses pattern matching, not true natural language understanding
- ⚠️ Limited query types supported (see supported patterns below)
- ⚠️ Cannot parse free-form clinical queries outside defined patterns

### Authentication
- ⚠️ Demo credentials are hardcoded (not production-grade)
- ⚠️ No user registration system
- ⚠️ No multi-factor authentication

### Data Management
- ⚠️ Single-file SQLite database (not suitable for multi-user production)
- ⚠️ No database replication or backup system
- ⚠️ No data encryption at rest

### Deployment
- ⚠️ Not HIPAA-compliant
- ⚠️ Not suitable for real clinical data
- ⚠️ No audit logging for compliance

### Supported Query Patterns

The chatbot recognizes these query types:
- Patient counts and demographics ("Show me all patients", "How many male patients")
- Specific patient IDs ("Get patient 100", "Show me patient with ID 150")
- Diagnostic queries ("Patients with hypertension", "Who has diabetes")
- Gender filtering ("All female patients", "Male patients over 50")

Queries outside these patterns return "no results" with helpful suggestions.

---

## Known Issues

- Patient import may skip duplicate names with identical dates of birth
- Document preview optimized for PDF format
- Chat history persists only during session (not persistent database storage)
- No support for custom clinical note formats

---

## Future Enhancements

The following features are planned but not yet implemented:

- **RAG Integration:** Retrieval-Augmented Generation for more sophisticated clinical query understanding
- **Persistent Chat History:** Store chat conversations in database
- **Advanced Analytics:** Clinical metrics and trend analysis
- **Real-time Collaboration:** Multiple users viewing same patient record
- **Audit Logging:** Full audit trail for compliance requirements
- **Custom Workflows:** User-defined clinical workflows
- **Integration APIs:** RESTful APIs for third-party applications

---

## Troubleshooting

### Port Already in Use
```bash
# Windows - Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti :3000 | xargs kill -9
```

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

### Database Not Found
- Ensure `database/clara.db` exists
- Verify working directory is project root
- Check `.gitignore` if re-cloning

### Chat Feature Not Working
- Verify Gemini API key is in `.env.local`
- Check that API key is valid at [Google AI Studio](https://aistudio.google.com/app/apikey)
- Try without API key (pattern-based responses still available)

---

## License

This project is provided for research and educational purposes. See LICENSE file for details.

---

## Citation

If you use CLARA in academic work, please cite:

```
CLARA - Clinical Data Assistant
Version 0.2.0 (2026)
https://github.com/VaraprasadSamanthula/CLARA
```

---

## Support & Feedback

For issues, questions, or feedback:
1. Check existing GitHub issues
2. Review the troubleshooting section above
3. Open a new GitHub issue with details

---

## Disclaimer

**THIS IS NOT A MEDICAL DEVICE**

CLARA is a research and demonstration platform. It is NOT:
- Approved for clinical use
- HIPAA-compliant
- Suitable for real patient data
- A replacement for proper EHR systems
- Validated for medical decision-making

Use only with synthetic or demonstration data in a development environment.

---

**Project:** CLARA - Clinical Data Assistant  
**Version:** 0.2.0  
**Status:** Research/Demonstration  
**Last Updated:** November 18, 2026

