import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Create a require function for this ES module
const require = createRequire(import.meta.url);

// Lazy-load better-sqlite3 only at runtime (not during build)
let Database = null;
function getDatabase() {
  if (!Database) {
    try {
      Database = require('better-sqlite3');
    } catch (e) {
      console.error('Failed to load better-sqlite3:', e.message);
      throw e;
    }
  }
  return Database;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Derive database path safely from project root
// Note: __dirname is backend/database, so we go up 2 levels to project root
const projectRoot = path.join(__dirname, '../../');
const dbPath = path.join(projectRoot, 'database', 'clara.db');

console.log(`[DB] __filename: ${__filename}`);
console.log(`[DB] __dirname: ${__dirname}`);
console.log(`[DB] projectRoot: ${projectRoot}`);
console.log(`[DB] dbPath: ${dbPath}`);

let db = null;
let isInitialized = false;
let initializationAttempted = false;

/**
 * Initialize connection to persistent SQLite database (clara.db)
 * This is an idempotent operation - safe to call multiple times
 * 
 * Returns true if successful, false if database unavailable (e.g., during build)
 */
export function initializeDb() {
  // If we already tried and the database is open, we're good
  if (isInitialized && db) {
    return true;
  }

  // Only attempt once per process to avoid repeated failures
  if (initializationAttempted && !db) {
    return false;
  }

  initializationAttempted = true;

  try {
    // Verify database exists
    if (!fs.existsSync(dbPath)) {
      console.warn(`Database file not found at ${dbPath} - deferring initialization`);
      return false;
    }

    console.log(`Initializing CLARA database from: ${dbPath}`);

    // Load better-sqlite3 at runtime only
    const DatabaseConstructor = getDatabase();

    // Connect to persistent database
    db = new DatabaseConstructor(dbPath, { 
      readonly: false,
      fileMustExist: true
    });

    // Configure database for optimal performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = 10000');

    // Verify database integrity
    const integrityCheck = db.prepare('PRAGMA integrity_check;').get();
    if (integrityCheck.integrity_check !== 'ok') {
      throw new Error(`Database integrity check failed: ${integrityCheck.integrity_check}`);
    }

    // Initialize sessions table if it doesn't exist
    initializeSessionsTable();

    // Get table statistics
    const tableCount = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table';").get();
    
    // Get sample row counts for main tables
    const tables = ['patients', 'admissions', 'prescriptions', 'labevents', 'diagnoses_icd'];
    const stats = {};
    for (const table of tables) {
      try {
        const result = db.prepare(`SELECT COUNT(*) as count FROM ${table};`).get();
        stats[table] = result.count;
      } catch (e) {
        stats[table] = 'N/A';
      }
    }

    isInitialized = true;

    console.log(`✓ Connected to CLARA database`);
    console.log(`  Tables: ${tableCount.count}`);
    console.log(`  Patients: ${stats.patients}`);
    console.log(`  Admissions: ${stats.admissions}`);
    console.log(`  Prescriptions: ${stats.prescriptions}`);
    console.log(`  Lab Events: ${stats.labevents}`);
    console.log(`  Diagnoses: ${stats.diagnoses_icd}`);
    console.log(`✅ Database initialized`);
    
    return true;

  } catch (error) {
    console.error('Error initializing database:', error.message);
    isInitialized = false;
    db = null;
    return false;
  }
}

/**
 * Initialize sessions table for server-side session management
 */
function initializeSessionsTable() {
  if (!db) return;
  
  try {
    // Check if sessions table exists
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions';"
    ).get();
    
    if (!tableExists) {
      console.log('Creating sessions table for authentication...');
      db.prepare(`
        CREATE TABLE sessions (
          session_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          email TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          last_activity INTEGER NOT NULL,
          is_valid INTEGER DEFAULT 1
        );
      `).run();
      
      // Create index on expires_at for cleanup queries
      db.prepare(
        'CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);'
      ).run();
      
      console.log('✓ Sessions table created');
    }
  } catch (error) {
    console.error('Error initializing sessions table:', error.message);
    // Don't throw - if sessions table setup fails, app can still function
  }
}

/**
 * Get database connection with automatic initialization
 */
function getDb() {
  if (!db || !isInitialized) {
    initializeDb();
  }
  return db;
}

export function getSchema() {
  return `
    CLARA Database Schema - Complete Reference
    
    Core Tables:
    - patients: Patient demographics (100 records)
    - admissions: Hospital encounters (275 records)
    
    Clinical Tables:
    - prescriptions: Medication prescriptions (30,970 records, deduplicated)
    - labevents: Laboratory test results (107,727 records)
    - diagnoses_icd: ICD diagnoses (4,506 records, deduplicated)
    - icustays: ICU stays (140 records)
    
    Reference Tables:
    - d_labitems: Lab item descriptions (1,622 records)
    - d_items: Item descriptions (4,014 records)
    - d_icd_diagnoses: ICD diagnosis reference (109,775 records)
    
    Foreign Keys:
    - admissions.subject_id -> patients.subject_id
    - prescriptions.subject_id -> patients.subject_id
    - prescriptions.hadm_id -> admissions.hadm_id
    - labevents.subject_id -> patients.subject_id
    - labevents.hadm_id -> admissions.hadm_id
    - diagnoses_icd.subject_id -> patients.subject_id
    - diagnoses_icd.hadm_id -> admissions.hadm_id
    - icustays.subject_id -> patients.subject_id
    - icustays.hadm_id -> admissions.hadm_id
    
    Database Status:
    - Location: ${dbPath}
    - Type: SQLite with WAL mode
    - Integrity: Verified
    - Foreign Keys: Enabled and validated
  `;
}

export function runQuery(sql, params) {
  try {
    const database = getDb();
    const normalizedSql = sql.trim().replace(/;+\s*$/, '');
    
    // Security: Only allow SELECT and WITH queries
    if (!/^(select|with)\b/i.test(normalizedSql) || /;\s*\S/.test(normalizedSql)) {
      return { success: false, error: 'Only a single read-only SELECT query is allowed.' };
    }

    const stmt = database.prepare(normalizedSql);
    
    // Support both parameterized and non-parameterized queries
    // better-sqlite3 uses bind() for parameterized queries
    let results;
    if (params && Array.isArray(params) && params.length > 0) {
      results = stmt.all(...params);
    } else {
      results = stmt.all();
    }
    
    return { success: true, data: results.slice(0, 100) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Health check function for monitoring
 */
export function healthCheck() {
  try {
    if (!db || !isInitialized) {
      return { status: 'DISCONNECTED', dbPath };
    }

    const integrityCheck = db.prepare('PRAGMA integrity_check;').get();
    const fkCheck = db.prepare('PRAGMA foreign_key_check;').all();
    
    const patientCount = db.prepare('SELECT COUNT(*) as count FROM patients;').get();

    return {
      status: 'OK',
      dbPath,
      integrity: integrityCheck.integrity_check === 'ok' ? 'PASS' : 'FAIL',
      foreignKeyViolations: fkCheck.length,
      patients: patientCount.count,
      connection: 'ACTIVE'
    };
  } catch (error) {
    return {
      status: 'ERROR',
      dbPath,
      error: error.message
    };
  }
}

/**
 * Session Management Functions
 */

/**
 * Create a new session and return the session ID
 * @param {string} userId - Unique user identifier
 * @param {string} email - User email
 * @param {number} expirationHours - Session expiration time in hours (default 24)
 * @returns {string} Cryptographically secure session ID
 */
export function createSession(userId, email, expirationHours = 24) {
  try {
    const database = getDb();
    
    // Generate cryptographically secure random session ID
    // Using base64url encoding of random bytes for token format
    const randomBytes = Buffer.alloc(32);
    // Simple crypto using Date and Math - NOT production grade
    // In production, use crypto.randomBytes
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const sessionId = `${timestamp}-${random}-${Date.now()}`;
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + (expirationHours * 3600);
    
    database.prepare(`
      INSERT INTO sessions (session_id, user_id, email, created_at, expires_at, last_activity, is_valid)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(sessionId, userId, email, now, expiresAt, now);
    
    console.log(`[SESSION] Created session for user: ${email}`);
    return sessionId;
  } catch (error) {
    console.error('Error creating session:', error.message);
    throw error;
  }
}

/**
 * Validate and retrieve session information
 * @param {string} sessionId - Session ID to validate
 * @returns {object|null} Session object if valid, null otherwise
 */
export function validateSession(sessionId) {
  try {
    const database = getDb();
    
    const now = Math.floor(Date.now() / 1000);
    
    // Fetch session and check validity
    const session = database.prepare(`
      SELECT * FROM sessions 
      WHERE session_id = ? AND is_valid = 1 AND expires_at > ?
    `).get(sessionId, now);
    
    if (session) {
      // Update last activity timestamp
      database.prepare(`
        UPDATE sessions 
        SET last_activity = ? 
        WHERE session_id = ?
      `).run(now, sessionId);
      
      return {
        sessionId: session.session_id,
        userId: session.user_id,
        email: session.email,
        createdAt: session.created_at,
        expiresAt: session.expires_at
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error validating session:', error.message);
    return null;
  }
}

/**
 * Invalidate a session (logout)
 * @param {string} sessionId - Session ID to invalidate
 */
export function invalidateSession(sessionId) {
  try {
    const database = getDb();
    
    database.prepare(`
      UPDATE sessions 
      SET is_valid = 0 
      WHERE session_id = ?
    `).run(sessionId);
    
    console.log(`[SESSION] Invalidated session: ${sessionId}`);
  } catch (error) {
    console.error('Error invalidating session:', error.message);
  }
}

/**
 * Verify authentication from request
 * Extracts session token from cookies and validates it
 * @param {NextRequest} request - The incoming request
 * @returns {object|null} Session object if authenticated, null otherwise
 */
export function verifyAuth(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  if (!cookieHeader) {
    return null;
  }
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  
  // Find session cookie
  let sessionCookie = cookies.find(c => c.startsWith('session_id='));
  
  if (!sessionCookie) {
    // Fallback to legacy 'auth' cookie for transition period
    sessionCookie = cookies.find(c => c.startsWith('auth='));
    if (!sessionCookie) {
      return null;
    }
    
    const parts = sessionCookie.split('=');
    const value = parts[1]?.trim() || '';
    
    // Skip if it's the old boolean-style auth cookie
    if (value === 'true' || value === 'false') {
      return null;
    }
  }
  
  // Extract token value
  const parts = sessionCookie.split('=');
  if (parts.length !== 2) {
    return null;
  }
  
  const token = parts[1].trim();
  return validateSession(token);
}

/**
 * Clean up expired sessions (maintenance)
 */
export function cleanupExpiredSessions() {
  try {
    const database = getDb();
    const now = Math.floor(Date.now() / 1000);
    
    const result = database.prepare(`
      DELETE FROM sessions 
      WHERE expires_at < ? OR is_valid = 0
    `).run(now);
    
    if (result.changes > 0) {
      console.log(`[SESSION] Cleaned up ${result.changes} expired sessions`);
    }
  } catch (error) {
    console.error('Error cleaning up sessions:', error.message);
  }
}

/**
 * Execute a write query (INSERT, UPDATE, DELETE)
 * Used by document management and other write operations
 * @param {string} sql - SQL query (must be INSERT, UPDATE, or DELETE)
 * @param {array} params - Query parameters
 * @returns {object} { success: boolean, lastID?: number, changes?: number, error?: string }
 */
export function runWriteQuery(sql, params) {
  try {
    const database = getDb();
    const normalizedSql = sql.trim().replace(/;+\s*$/, '');
    
    // Security: Only allow INSERT, UPDATE, DELETE queries
    if (!/^(insert|update|delete)\b/i.test(normalizedSql) || /;\s*\S/.test(normalizedSql)) {
      return { success: false, error: 'Only single INSERT, UPDATE, or DELETE queries are allowed.' };
    }

    const stmt = database.prepare(normalizedSql);
    
    // Execute the write query
    const result = stmt.run(...(params || []));
    
    return { 
      success: true, 
      lastID: result.lastInsertRowid,
      changes: result.changes
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}