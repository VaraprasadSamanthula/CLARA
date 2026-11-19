# CLARA - Clinical Language Assistant for Research Analytics

A web-based clinical data exploration platform designed for healthcare professionals and researchers to query medical records using conversational language without requiring SQL knowledge.

**Current Version:** 1.0.0  
**Status:** ✅ Fully Functional  
**Last Updated:** November 2025

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Problem Statement](#problem-statement)
3. [Objectives](#objectives)
4. [Key Features](#key-features)
5. [Technology Stack](#technology-stack)
6. [System Architecture](#system-architecture)
7. [Project Folder Structure](#project-folder-structure)
8. [Database Overview](#database-overview)
9. [Backend Architecture](#backend-architecture)
10. [Frontend Architecture](#frontend-architecture)
11. [Authentication and Security](#authentication-and-security)
12. [Installation and Setup](#installation-and-setup)
13. [Environment Variables](#environment-variables)
14. [Running the Project](#running-the-project)
15. [Example Queries](#example-queries)
16. [API Endpoints](#api-endpoints)
17. [Implementation Status](#implementation-status)
18. [Future Scope](#future-scope)
19. [Important Limitations](#important-limitations)

---

## 🎯 Project Overview

CLARA (Clinical Language Assistant for Research Analytics) is a demonstration platform that enables healthcare professionals to explore and analyze clinical data through a conversational interface. The system bridges the gap between complex medical data and intuitive data access by allowing users to pose clinical questions in natural language.

### What CLARA Does

- **Patient Search & Management**: Find patients by name, phone, demographics, or ID
- **Clinical Data Exploration**: View medical histories, diagnoses, medications, lab results, and admissions
- **Natural Language Interface**: Ask clinical questions conversationally; system converts to SQL
- **Document Management**: Upload, store, and retrieve clinical documents for patients
- **AI-Enhanced Insights**: Optional Gemini AI integration for clinical summaries (with proper API key)
- **User Authentication**: Session-based access control for patient data

### What CLARA Is NOT

- **Not Production-Ready**: This is a research/demonstration platform, not suitable for real clinical deployment
- **Not HIPAA-Compliant**: Does not meet healthcare compliance requirements
- **Not LLM-Based**: Does not use advanced language models for query generation (planned for future)
- **Not RAG-Enabled**: Does not use Retrieval-Augmented Generation (planned for future)
- **Not a Medical Device**: Cannot be used for clinical decision-making

---

## 🔍 Problem Statement

Healthcare professionals often need to query clinical databases but lack SQL expertise. Existing systems either:
1. Require deep technical knowledge (SQL queries)
2. Lack flexibility (pre-built reports only)
3. Are too complex for quick data exploration
4. Provide poor user experience for medical workflows

CLARA addresses this by providing an intuitive interface where doctors and researchers can ask questions in natural language and receive structured clinical data without writing SQL.

---

## 🎓 Objectives

1. **Improve Data Accessibility**: Enable clinicians to query medical data without SQL knowledge
2. **Reduce Time-to-Insight**: Faster clinical data analysis through conversational interface
3. **Maintain Data Privacy**: Session-based authentication and secure data handling
4. **Provide Flexible Querying**: Support for diverse clinical questions and data exploration patterns
5. **Create Scalable Architecture**: Build a foundation for future AI/ML enhancements
6. **Demonstrate Modern Healthcare IT**: Show practical application of web technologies in healthcare

---

## ✨ Key Features

### 1. Patient Management ✅
- **Search Functionality**
  - By Patient ID
  - By Phone Number
  - By Full Name
  - Supports both MIMIC and manually registered patients
- **Registration**
  - Manual patient entry form
  - CSV/Excel bulk import
  - Automatic deduplication
- **Patient Profiles**
  - Complete demographics (name, DOB, gender, contact)
  - Clinical history (MIMIC patients only)
  - Associated documents

### 2. Clinical Data Access ✅
- **MIMIC-IV Database Integration** (100 synthetic patients)
  - Admissions and hospitalization records
  - Diagnoses (ICD-10 coded)
  - Medications and prescriptions
  - Laboratory results and values
  - ICU stays and intensive care history
- **CLARA Patient Records** (Manually entered)
  - Demographic information
  - Medications (custom entry)
  - Diagnoses (custom entry)

### 3. Conversational Query Interface ✅
- **9-Intent Detection System**
  1. Medications – Ask about prescribed medications
  2. Laboratory Results – Request lab values and tests
  3. Diagnoses – Retrieve diagnostic information
  4. Admissions – View admission history
  5. ICU Stays – Query intensive care records
  6. Treatment – Information about procedures/interventions
  7. Timeline – Chronological clinical progression
  8. Demographics – Patient background and characteristics
  9. Complete – Full patient summary
- **Pattern-Based Query Generation**
  - Analyzes user input to detect clinical intent
  - Generates appropriate SQL queries
  - Formats responses with markdown

### 4. Optional AI Integration ✅
- **Gemini API Support** (optional, requires user API key)
  - Natural language response generation
  - Clinical summary formatting
  - Markdown-rendered answers
- **Fallback Mode**
  - Works without API key (returns structured data)
  - Graceful degradation

### 5. Document Management ✅
- **Upload Support**
  - PDF files
  - Image files (PNG, JPG)
  - Automatic virus scanning recommendations
- **Document Storage**
  - Organized by patient
  - Metadata tracking
  - Download/preview capabilities
- **Access Control**
  - Per-patient document privacy
  - Audit logging

### 6. Professional User Interface ✅
- **Responsive Design**
  - Works on desktop and tablets
  - Mobile-optimized views
- **Sidebar Navigation**
  - Dashboard
  - Patient Search
  - Clinical Chat
  - Documents
  - Patient Registration
  - Bulk Import
  - User Management
- **Consistent Design System**
  - Professional color palette (Navy, Teal, Gold)
  - Accessible typography (16px minimum)
  - Clear visual hierarchy
  - Form validation and error handling
- **Dashboard Features**
  - Tab-based navigation
  - URL state synchronization
  - Chat history persistence

### 7. Data Persistence ✅
- **Session Storage** (Chat history)
  - Messages stored in browser sessionStorage
  - Persists during browser session
  - Clears on session end
- **Database Storage** (Clinical data)
  - Patient records in SQLite
  - Documents stored on disk
  - Automatic timestamps and audit trails

---

## 🛠 Technology Stack

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS 4
- **UI Components**: Lucide React Icons
- **Markdown Rendering**: React Markdown
- **Language**: TypeScript/JavaScript
- **Authentication**: Session Cookies

### Backend
- **Runtime**: Node.js
- **Framework**: Next.js API Routes
- **Database**: SQLite (better-sqlite3)
- **Data Processing**: Node.js native
- **AI Integration**: Google Gemini API (optional)
- **File Handling**: CSV-Parser, XLSX

### Database
- **Type**: SQLite
- **Location**: `./database/clara.db`
- **Source Data**: MIMIC-IV Clinical Database (100 patients sample)
- **Tables**: 15+ core tables + clinical references
- **Capacity**: ~15-20MB database file

### Development Tools
- **Build Tool**: Next.js 16
- **Package Manager**: npm
- **Testing**: Jest (available)
- **Linting**: ESLint
- **Version Control**: Git

### Deployment Options
- **Development**: `npm run dev` (localhost:3000)
- **Production Build**: `npm run build && npm start`
- **Deployment Platforms**: Vercel, AWS, DigitalOcean, etc.

---

## 🏗 System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser Client                        │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  React Pages     │  │  Chat Interface  │                │
│  │  (Dashboard,     │  │  (Message Mgmt)  │                │
│  │   Patient        │  └──────────────────┘                │
│  │   Profiles)      │                                      │
│  └──────────────────┘                                      │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP/REST
┌─────────────────▼───────────────────────────────────────────┐
│              Next.js API Routes (Backend)                    │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Auth Handler    │  │  Patient APIs    │                │
│  │  (Session Mgmt)  │  │  (Search, Reg.)  │                │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Chatbot APIs    │  │  Document APIs   │                │
│  │  (Query Engine)  │  │  (Upload/View)   │                │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────┐                                      │
│  │  Gemini Bridge   │                                      │
│  │  (Optional AI)   │                                      │
│  └──────────────────┘                                      │
└─────────────────┬───────────────────────────────────────────┘
                  │ SQL Queries / AI Requests
         ┌────────┴─────────┬──────────────────┐
         │                  │                  │
    ┌────▼────┐      ┌─────▼───┐      ┌──────▼──────┐
    │ SQLite  │      │ Google  │      │  File System│
    │ Database│      │ Gemini  │      │ (Documents) │
    │ (clara. │      │ API     │      └─────────────┘
    │   db)   │      └─────────┘
    └─────────┘
```

### Data Flow

1. **User Query** → Chatbot Interface
2. **Intent Detection** → Analyze query language
3. **SQL Generation** → Create database query based on intent
4. **Database Query** → Execute against SQLite
5. **Response Formatting** → Prepare structured data
6. **AI Enhancement** (optional) → Send to Gemini if enabled
7. **Display** → Show markdown-formatted response to user

### Security Model

- **Authentication**: Session-based (cookie)
- **Authorization**: Patient data filtered by user session
- **Data Protection**: No encryption of SQLite file (not production)
- **Input Validation**: Server-side validation on all inputs
- **SQL Safety**: Parameterized queries to prevent injection
- **Rate Limiting**: Not implemented (research project)

---

## 📁 Project Folder Structure

```
CLARA/
│
├── src/                          # Frontend & API source code
│   ├── app/
│   │   ├── api/                 # Next.js API routes
│   │   │   ├── auth/            # Authentication endpoints
│   │   │   ├── chat/            # General chat endpoint
│   │   │   ├── patient-chat/    # Patient-specific chat
│   │   │   └── patients/        # Patient management APIs
│   │   │       ├── search/      # Search functionality
│   │   │       ├── register/    # Registration API
│   │   │       ├── import/      # Bulk import
│   │   │       ├── [id]/        # Patient-specific routes
│   │   │       │   ├── documents/  # Document management
│   │   │       │   ├── medications/ # CLARA patient meds
│   │   │       │   └── diagnoses/   # CLARA patient diagnoses
│   │   │       └── ...
│   │   ├── dashboard/           # Main dashboard page
│   │   ├── login/               # Login page
│   │   ├── patients/            # Patient management pages
│   │   ├── globals.css          # Global styles & design system
│   │   └── layout.tsx           # Root layout
│   │
│   ├── components/              # React components
│   │   ├── AppLayout.jsx        # Sidebar & main layout
│   │   ├── PatientChat.jsx      # Chat interface
│   │   ├── PatientSearch.jsx    # Search interface
│   │   ├── PatientProfile.jsx   # Patient details
│   │   ├── DocumentManager.jsx  # Document upload/view
│   │   └── ...
│   │
│   ├── providers/               # React context providers
│   │   ├── ChatStateProvider.jsx # Chat message management
│   │   ├── ThemeProvider.jsx    # Theme/styling
│   │   └── ...
│   │
│   ├── utils/                   # Utility functions
│   └── styles/                  # Shared styles
│
├── backend/                      # Backend utilities & database
│   ├── database/
│   │   ├── connection.js        # SQLite database connection
│   │   ├── schema.sql           # Database schema
│   │   └── init.js              # Database initialization
│   │
│   └── utils/                   # Backend utilities
│       ├── auth.js              # Authentication helpers
│       └── ...
│
├── database/                     # Database files
│   └── clara.db                 # SQLite database file (NOT in repo)
│
├── public/                       # Static assets
│   └── favicon.ico
│
├── scripts/                      # Utility scripts
│   ├── schema/                  # Database schema creation
│   │   ├── create-schema.js
│   │   ├── add-clara-clinical-tables.js
│   │   └── ...
│   └── ...
│
├── config/                       # Configuration files
│   ├── auth.config.js           # Authentication config
│   └── ...
│
├── docs/                         # Documentation
│   └── (various technical docs)
│
├── package.json                 # NPM dependencies
├── package-lock.json            # Locked dependency versions
├── tsconfig.json                # TypeScript configuration
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js            # PostCSS configuration
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
└── README.md                    # This file
```

### Key Directories Explained

- **`src/app/api/`**: All backend API endpoints
  - RESTful endpoints for chat, patient search, document management
  - Authentication and session handling
  - Database queries and responses

- **`src/components/`**: Reusable React components
  - Chat interface with message display
  - Patient search and profile views
  - Document upload and preview
  - Form components

- **`backend/database/`**: Database abstraction layer
  - SQLite connection pooling
  - Query execution and transaction management
  - Database initialization scripts

- **`database/`**: Data storage
  - `clara.db` file (not committed to repo)
  - Created during first run or from backup

- **`scripts/`**: Utility and maintenance scripts
  - Database schema creation
  - Data migration scripts
  - Initialization helpers

---

## 🗄 Database Overview

### Database Technology
- **Type**: SQLite (embedded, file-based)
- **File Location**: `./database/clara.db`
- **Size**: ~15-20 MB (with 100 sample patients)
- **Backup Strategy**: Manual backups to `./backups/` directory

### Core Tables

#### Patient Tables
- **`patients`** (MIMIC-IV)
  - MIMIC patient demographics
  - Fields: subject_id, gender, anchor_age, anchor_year, anchor_year_group
  - 100 synthetic patients

- **`patient_registry`** (CLARA Custom)
  - Manually registered patients and imported patients
  - Fields: patient_id, patient_source, full_name, date_of_birth, gender, phone, email, address
  - Supports unlimited custom patients

#### Clinical Data Tables (MIMIC)
- **`admissions`** – Hospital stays and encounters
- **`diagnoses_icd`** – ICD-10 diagnosis codes
- **`prescriptions`** – Medication records
- **`labevents`** – Laboratory test results
- **`icustays`** – ICU admission records

#### Reference Tables
- **`d_icd_diagnoses`** – ICD-10 code descriptions
- **`d_labitems`** – Lab test definitions
- **`d_items`** – ICU vital sign definitions

#### CLARA Custom Tables
- **`clara_medications`** – Medications entered for CLARA patients
  - Fields: medication_id, patient_id, medication_name, dosage, route, frequency, start_date, end_date, status, notes
  
- **`clara_diagnoses`** – Diagnoses entered for CLARA patients
  - Fields: diagnosis_id, patient_id, diagnosis_name, description, diagnosis_date, status, notes

#### Management Tables
- **`documents`** – MIMIC patient document references
- **`clara_documents`** – CLARA patient document references
- **`import_logs`** – Bulk import operation logs

### Data Characteristics
- **Total Records**: ~300,000 (clinical events)
- **Patient Count**: 100 (MIMIC) + unlimited (CLARA custom)
- **Temporal Range**: ~10 years (2008-2018 in MIMIC data)
- **Data Source**: MIMIC-IV v2.2 (synthetic, de-identified)

### Database Access
- **Connection Method**: `backend/database/connection.js`
- **Query Execution**: Parameterized queries for safety
- **Transactions**: Supported for multi-step operations
- **Indexes**: Strategic indexes for common queries

---

## 🖥 Backend Architecture

### API Route Structure

#### Authentication API
- **`POST /api/auth/login`** – User login
  - Input: email, password
  - Output: Session cookie, redirect to dashboard
  - Error: Invalid credentials (401)

- **`GET /api/auth/logout`** – User logout
  - Clears session
  - Redirects to login

- **`GET /api/auth/session`** – Check current session
  - Output: Current user info or null

#### Patient APIs
- **`GET /api/patients/search`** – Search patients
  - Query params: type (id/phone/name), value
  - Output: Patient list matching criteria
  - Searches both MIMIC and CLARA patients

- **`POST /api/patients/register`** – Register new patient
  - Input: name, DOB, gender, phone, email, address
  - Output: New patient_id
  - Auto-generates unique ID

- **`GET /api/patients/[id]`** – Get patient profile
  - Path param: patient ID
  - Output: Complete patient data + clinical records

- **`GET /api/patients/[id]/medications`** – Get patient medications
  - Returns: All medications (CLARA) or prescriptions (MIMIC)

- **`POST /api/patients/[id]/medications`** – Add medication
  - Input: medication_name, dosage, route, frequency, dates
  - Output: medication_id

- **`GET /api/patients/[id]/diagnoses`** – Get patient diagnoses
  - Returns: All diagnoses

- **`POST /api/patients/[id]/diagnoses`** – Add diagnosis
  - Input: diagnosis_name, description, date, status
  - Output: diagnosis_id

- **`POST /api/patients/import/preview`** – Preview bulk import
  - Input: CSV/Excel file
  - Output: Sample rows, validation issues

- **`POST /api/patients/import/confirm`** – Execute bulk import
  - Input: File, confirmed data
  - Output: Import result, count imported

#### Chat APIs
- **`POST /api/chat`** – General patient database queries
  - Input: question (text)
  - Output: Answer with clinical data
  - Uses 9-intent detection system

- **`POST /api/patient-chat`** – Patient-specific queries
  - Input: patientId, question
  - Output: Patient-specific answer
  - Retrieves from MIMIC or CLARA data

#### Document APIs
- **`POST /api/patients/[id]/documents/upload`** – Upload document
  - Input: File (PDF, PNG, JPG)
  - Output: Document metadata

- **`GET /api/patients/[id]/documents/download/[docId]`** – Download document
  - Output: File content

- **`GET /api/patients/[id]/documents/preview/[docId]`** – Preview document
  - Output: Encoded image/document data

- **`DELETE /api/patients/[id]/documents/delete/[docId]`** – Delete document
  - Output: Deletion confirmation

### Intent Detection System

The chatbot uses 9 predefined intents to understand user questions:

```javascript
// Intent keywords and detection logic
1. medications    - "medication", "drug", "prescription", "dosage"
2. labs          - "lab", "test", "result", "value", "blood"
3. diagnoses     - "diagnosis", "condition", "disease", "illness"
4. admissions    - "admission", "admit", "hospitalization", "encounter"
5. icu           - "icu", "intensive care", "critical", "ventilator"
6. treatment     - "treatment", "procedure", "intervention", "surgery"
7. timeline      - "when", "timeline", "progression", "trending"
8. demographics  - "age", "gender", "background", "personal"
9. complete      - Default intent for general summaries
```

### Query Processing Pipeline

1. **Receive Query** → User submits question
2. **Detect Intent** → Analyze keywords to determine clinical intent
3. **Generate SQL** → Create appropriate database query
4. **Execute Query** → Run against SQLite database
5. **Format Response** → Prepare markdown-formatted answer
6. **Optional AI** → Send to Gemini API if enabled
7. **Return** → Send response to client

### Error Handling
- Validation errors: 400 Bad Request
- Authentication errors: 401 Unauthorized
- Patient not found: 404 Not Found
- Server errors: 500 Internal Server Error
- All errors include helpful error messages and hints

### Security Measures
- Parameterized SQL queries (prevent injection)
- Session-based authentication
- CORS headers configured
- Input validation on all endpoints
- Foreign key constraints in database

---

## 🎨 Frontend Architecture

### Page Structure

#### Authentication Pages
- **Login Page** (`/login`)
  - Email and password form
  - Demo credentials available
  - Session validation

#### Dashboard Pages
- **Dashboard** (`/dashboard`)
  - Tabbed interface:
    - Clinical Chat – Query-based patient data exploration
    - Patient Search – Find and browse patients
  - Tab state persists in URL

#### Patient Management
- **Patient Search** (`/dashboard?tab=search`)
  - Search form (ID, phone, name)
  - Results list with clickable patients
  - Quick filters

- **Patient Profile** (`/patients/[id]`)
  - Demographics display
  - Clinical history (for MIMIC patients)
  - Document links
  - Medications & diagnoses (for CLARA patients)

- **Patient Registration** (`/patients/register`)
  - Form for manual patient entry
  - Demographics fields
  - Validation and error handling

- **Bulk Import** (`/patients/import`)
  - File upload interface
  - CSV/Excel preview
  - Confirmation dialog
  - Import progress tracking

#### Chat Interface
- **Clinical Chat** (on dashboard)
  - Message display area
  - Message history (per patient)
  - Input field with send button
  - Markdown-formatted responses
  - Timestamp display
  - Clear chat button

#### Document Management
- **Documents** (after patient selection)
  - Upload interface
  - Document list with preview
  - Download/delete options
  - File type indicators

### Component Hierarchy

```
AppLayout (Main wrapper)
├── Sidebar (Navigation)
│   ├── Dashboard
│   ├── Patient Search
│   ├── Chat
│   ├── Documents
│   └── User Menu
├── Main Content
│   ├── PatientChat
│   ├── PatientSearch
│   ├── PatientProfile
│   ├── DocumentManager
│   └── Form Components
└── Footer
```

### State Management

- **Chat Messages**: Managed by `ChatStateProvider`
  - Session-based (sessionStorage)
  - Per-patient message persistence
  - Timestamp normalization

- **Authentication**: Session cookies
  - Server-side session tracking
  - Client-side cookies

- **UI State**: React component state
  - Tab selection
  - Form inputs
  - Loading indicators

### Styling System

#### Design Tokens
- **Primary Color**: #183B4E (Navy)
- **Secondary Color**: #237C80 (Teal)
- **Accent Color**: #D7A66B (Gold)
- **Background**: #EDF3F4 (Light gray)
- **Text Primary**: #243746 (Dark gray)

#### Typography
- **Base Font**: Inter (Google Fonts)
- **Font Sizes**: 16px minimum for accessibility
- **Line Height**: 1.5-1.7 for readability
- **Monospace**: JetBrains Mono for code

#### Responsive Design
- **Breakpoints**: Mobile-first approach
- **Max Width**: Chat interface capped at 1000px
- **Sidebar**: Collapsible on mobile
- **Tables**: Scrollable on smaller screens

### User Interaction Patterns

1. **Login** → Enter credentials → Dashboard
2. **Search Patient** → Enter criteria → View profile
3. **Ask Question** → Type query → Chat API → Display response
4. **Upload Document** → Select file → Confirm → Store
5. **Register Patient** → Fill form → Submit → Redirect to profile
6. **Bulk Import** → Upload file → Preview → Confirm → Import

---

## 🔐 Authentication and Security

### Authentication Flow

```
Browser                          Server
   │                              │
   ├─ Submit (email, password) ──>│
   │                              │ Validate credentials
   │                              │ Create session
   │                              │
   │<─ Set session cookie ────────┤
   │<─ Redirect to /dashboard ────┤
   │                              │
   ├─ All requests with cookie ──>│
   │                              │ Check session validity
   │<─ Respond with data ────────┤
```

### Session Management
- **Cookie-Based**: HttpOnly cookies (not accessible to JavaScript)
- **Session Duration**: Browser session (cleared on logout)
- **Storage**: Server-side session tracking
- **Validation**: Checked on every API request

### Credential Storage
- **Demo Account**: Pre-configured (email: `doctor@hospital.com`, password: `demo123`)
- **Database**: Credentials stored in SQLite
- **Password**: Not hashed in demo (research project only)

### Authorization
- **Patient Data Access**: Filtered by user session
- **Document Access**: Per-patient authorization
- **Admin Functions**: Registration/import (requires login)

### Input Validation
- **Client-Side**: Form validation in React
- **Server-Side**: Validation on all API endpoints
- **SQL Safety**: Parameterized queries prevent injection
- **File Upload**: Type validation, size limits

### Data Protection Measures
- **No HTTPS Requirement** (development only)
- **CORS Headers**: Configured for local development
- **SQL Injection Prevention**: Parameterized queries
- **XSS Prevention**: React automatic escaping
- **Rate Limiting**: Not implemented (research project)

### Known Security Limitations
- ⚠️ Not HIPAA-compliant
- ⚠️ No encryption of database file
- ⚠️ Demo credentials hardcoded
- ⚠️ No rate limiting
- ⚠️ Not suitable for production deployment with real patient data

---

## 📦 Installation and Setup

### Prerequisites
- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Git**: For cloning the repository
- **Disk Space**: ~500 MB (with node_modules)
- **Operating System**: Windows, macOS, or Linux

### Step 1: Clone the Repository

```bash
git clone https://github.com/VaraprasadSamanthula/CLARA.git
cd CLARA
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- Next.js and React
- Tailwind CSS and styling tools
- Database driver (better-sqlite3)
- File processing utilities
- Development dependencies

### Step 3: Set Up Environment Variables (Optional)

```bash
# Create local environment file
cp .env.example .env.local

# Edit .env.local with your settings
# Add GEMINI_API_KEY if you want AI integration
```

### Step 4: Build the Application (Optional)

```bash
# For production build
npm run build
```

This creates optimized production assets in `.next/` directory.

### Step 5: Run the Application

```bash
# Development mode (recommended for first run)
npm run dev

# Production mode
npm start
```

The application will start on `http://localhost:3000`

---

## 🔧 Environment Variables

### Configuration File
Create `.env.local` in the project root with the following variables:

```env
# Google Gemini API (Optional)
# Leave blank to use fallback mode (returns structured data without AI)
GEMINI_API_KEY=your_gemini_api_key_here

# Database Configuration (Usually auto-detected)
DATABASE_PATH=./database/clara.db

# Optional: Session Configuration
SESSION_SECRET=your_session_secret_here
```

### How to Obtain Gemini API Key
1. Visit https://makersuite.google.com/app/apikeys
2. Create a new API key
3. Copy the key
4. Add to `.env.local` as `GEMINI_API_KEY=your_key`

### Without Gemini API Key
- The application works perfectly without Gemini integration
- Returns structured SQL results instead of AI-formatted responses
- No functionality is lost, only natural language enhancement

---

## ▶️ Running the Project

### Development Mode

```bash
npm run dev
```

- Hot reload enabled
- Development server on `http://localhost:3000`
- Console logging active
- Slower performance (for debugging)

**Access the Application:**
1. Open browser to `http://localhost:3000`
2. You will be redirected to login page
3. Use demo credentials:
   - Email: `doctor@hospital.com`
   - Password: `demo123`
4. Click "Login" to enter dashboard

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm start
```

- Optimized bundle
- `http://localhost:3000`
- Better performance
- Pre-compiled code

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint on code
npm test         # Run tests (if configured)
```

---

## 💬 Example Queries

### Patient Search Examples
```
Search for patient by ID: "Show me patient 10001"
Search by phone: "Find patient with phone 555-0123"
Search by name: "Search for John Smith"
```

### Clinical Query Examples

**Medications:**
- "What medications is this patient taking?"
- "Show me all prescriptions"
- "List the drugs prescribed"

**Lab Results:**
- "What are the latest lab results?"
- "Show me the patient's blood tests"
- "Give me the lab values"

**Diagnoses:**
- "What are the patient's diagnoses?"
- "What condition does this patient have?"
- "List all medical conditions"

**Admissions:**
- "How many times was this patient admitted?"
- "When was the admission date?"
- "Show hospital stay history"

**ICU:**
- "Did the patient have ICU stays?"
- "How long was ICU admission?"
- "Show intensive care records"

**Timeline:**
- "Show chronological progression"
- "When did things happen?"
- "What's the patient's medical timeline?"

**Demographics:**
- "How old is the patient?"
- "What's the patient's gender?"
- "Show patient background"

**Complete Summary:**
- "Give me a complete summary"
- "Tell me everything about this patient"
- "Show complete medical history"

---

## 🔌 API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

| Method | Endpoint | Input | Output |
|--------|----------|-------|--------|
| POST | `/auth/login` | email, password | session, user_id |
| GET | `/auth/logout` | — | confirmation |
| GET | `/auth/session` | — | current_user or null |

### Patient Endpoints

| Method | Endpoint | Input | Output |
|--------|----------|-------|--------|
| GET | `/patients/search` | type, value | patient_list |
| POST | `/patients/register` | demographics | patient_id |
| GET | `/patients/[id]` | patient_id | patient_data |
| GET | `/patients/[id]/medications` | patient_id | medications |
| POST | `/patients/[id]/medications` | medication_data | medication_id |
| GET | `/patients/[id]/diagnoses` | patient_id | diagnoses |
| POST | `/patients/[id]/diagnoses` | diagnosis_data | diagnosis_id |

### Chat Endpoints

| Method | Endpoint | Input | Output |
|--------|----------|-------|--------|
| POST | `/chat` | question | answer |
| POST | `/patient-chat` | patientId, question | patient_specific_answer |

### Document Endpoints

| Method | Endpoint | Input | Output |
|--------|----------|-------|--------|
| POST | `/patients/[id]/documents/upload` | file | doc_id |
| GET | `/patients/[id]/documents/download/[docId]` | — | file |
| GET | `/patients/[id]/documents/preview/[docId]` | — | preview |
| DELETE | `/patients/[id]/documents/delete/[docId]` | — | confirmation |

---

## ✅ Implementation Status

### ✅ Completed Features

**Core Functionality**
- ✅ User authentication and session management
- ✅ Patient search and management
- ✅ MIMIC-IV database integration
- ✅ CLARA patient registration and custom data entry
- ✅ Chatbot with 9-intent detection system
- ✅ Document upload and management
- ✅ Professional UI with responsive design
- ✅ Optional Gemini AI integration
- ✅ Bulk patient import (CSV/Excel)

**APIs**
- ✅ Authentication endpoints
- ✅ Patient management endpoints
- ✅ Chat and query endpoints
- ✅ Document management endpoints
- ✅ Search functionality
- ✅ Bulk import endpoints

**Database**
- ✅ SQLite database with MIMIC data
- ✅ CLARA patient tables (demographics, medications, diagnoses)
- ✅ Document tracking tables
- ✅ Proper indexes and constraints
- ✅ Foreign key relationships

**Frontend**
- ✅ Login page
- ✅ Dashboard with tab navigation
- ✅ Patient search interface
- ✅ Chat interface with history
- ✅ Patient profiles
- ✅ Document manager
- ✅ Registration forms
- ✅ Bulk import interface
- ✅ Professional design system

**Quality**
- ✅ Input validation (client & server)
- ✅ Error handling and recovery
- ✅ SQL injection prevention
- ✅ Session-based security
- ✅ Responsive design
- ✅ Accessibility considerations
- ✅ Build verification (0 errors)
- ✅ Code documentation

### ⏳ Future Scope

**AI/ML Enhancements**
- 🔄 Advanced natural language processing
- 🔄 Machine learning for intent detection
- 🔄 Retrieval-Augmented Generation (RAG)
- 🔄 LLM-based query generation
- 🔄 Clinical decision support

**Data Management**
- 🔄 More comprehensive MIMIC dataset (>100 patients)
- 🔄 Real-time data integration
- 🔄 Data visualization (charts, graphs)
- 🔄 Cohort analysis tools
- 🔄 Statistical analysis modules

**System Enhancements**
- 🔄 Caching system for query optimization
- 🔄 Database query result caching
- 🔄 Full-text search capabilities
- 🔄 Advanced filtering and sorting
- 🔄 Multi-patient comparisons

**Production Readiness**
- 🔄 HIPAA compliance implementation
- 🔄 Data encryption at rest
- 🔄 Audit logging system
- 🔄 User role-based access control
- 🔄 Rate limiting and throttling
- 🔄 Database connection pooling
- 🔄 API key management

**Deployment**
- 🔄 Docker containerization
- 🔄 Kubernetes orchestration
- 🔄 CI/CD pipeline
- 🔄 Automated testing
- 🔄 Performance monitoring
- 🔄 Cloud deployment guides

**Additional Features**
- 🔄 Mobile app (iOS/Android)
- 🔄 Desktop app (Electron)
- 🔄 API documentation (Swagger/OpenAPI)
- 🔄 User management dashboard
- 🔄 Advanced reporting
- 🔄 Clinical templates
- 🔄 Care pathway integration

---

## ⚠️ Important Limitations

### Not Suitable For

❌ **Real Clinical Deployment**
- Demo/research platform only
- Not HIPAA-compliant
- Cannot be used with real patient data

❌ **Medical Decision-Making**
- Not approved as medical device
- Cannot be used for clinical diagnosis
- Not for treatment planning

❌ **Data Protection**
- No encryption of database
- No sophisticated access control
- No audit trails for compliance

### Known Issues & Workarounds

| Issue | Workaround |
|-------|-----------|
| Gemini integration is optional | Leave API key blank, app works without it |
| Only 100 sample patients | More data can be imported via CSV |
| Chat history lost on browser close | Data stored in sessionStorage (by design) |
| No advanced filtering | Use chat interface for queries |
| Single user per session | Each browser/device logs in separately |

### Data Privacy Note

⚠️ **IMPORTANT**: This application is for demonstration only. Do not use with:
- Real patient names or identifiers
- Actual medical records
- Sensitive health information
- Production healthcare environments

All data is stored unencrypted in SQLite. Use only with synthetic or approved demo data.

---

## 📚 Additional Resources

### Project Documentation
- [Installation Guide](./INSTALL.md) – Detailed setup instructions
- [API Reference](./API.md) – Complete API documentation
- [Database Schema](./DATABASE.md) – Schema details and relationships
- [Architecture Guide](./ARCHITECTURE.md) – System design documentation

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [MIMIC-IV Database](https://mimic.mit.edu)
- [Google Gemini API](https://ai.google.dev)

### Support
For issues or questions:
1. Check existing documentation
2. Review example queries
3. Test with demo credentials
4. Check browser console for errors

---

## 👥 Contributors

**Project Developer**: Varaprasad Samanthula

**Based On**: MIMIC-IV Clinical Database (MIT-LCP)

**Advisors**: [Academic advisors if applicable]

**Collaborators**: [List any other contributors]

---

## 📄 License

This project is provided for academic and research purposes. See LICENSE file for details.

---

## 🙏 Acknowledgments

- **MIMIC-IV Database**: Beth Israel Deaconess Medical Center, MIT
- **Next.js Community**: Framework and tooling
- **Tailwind CSS**: Styling framework
- **Open Source Contributors**: Libraries and tools used

---

**Last Updated**: November 2025  
**Current Version**: 1.0.0  
**Status**: ✅ Ready for Research & Demonstration

For the latest updates, visit: https://github.com/VaraprasadSamanthula/CLARA
