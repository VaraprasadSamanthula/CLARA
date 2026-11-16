#!/usr/bin/env node

/**
 * PHASE 2 MIGRATION: Import preview table
 * 
 * Creates temporary table for storing import preview data
 * Previews expire after 24 hours
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'clara.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log(`
╔════════════════════════════════════════════════════════════╗
║        PHASE 2 MIGRATION: Import Preview Table             ║
╚════════════════════════════════════════════════════════════╝
`);

try {
  // Create import_previews table
  db.exec(`
    CREATE TABLE IF NOT EXISTS import_previews (
      preview_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_format TEXT CHECK (file_format IN ('csv', 'xlsx')),
      total_rows INTEGER NOT NULL,
      valid_rows INTEGER NOT NULL DEFAULT 0,
      invalid_rows INTEGER NOT NULL DEFAULT 0,
      duplicate_rows INTEGER NOT NULL DEFAULT 0,
      preview_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      confirmed INTEGER DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );
  `);
  
  console.log('✓ import_previews table created');
  
  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_import_previews_session 
      ON import_previews(session_id);
    
    CREATE INDEX IF NOT EXISTS idx_import_previews_expires 
      ON import_previews(expires_at);
    
    CREATE INDEX IF NOT EXISTS idx_import_previews_user
      ON import_previews(user_email, created_at DESC);
  `);
  
  console.log('✓ import_previews indexes created');
  
  // Create import_logs table for audit trail
  db.exec(`
    CREATE TABLE IF NOT EXISTS import_logs (
      import_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      file_name TEXT NOT NULL,
      total_inserted INTEGER NOT NULL,
      duplicate_skipped INTEGER NOT NULL DEFAULT 0,
      invalid_skipped INTEGER NOT NULL DEFAULT 0,
      import_status TEXT CHECK (import_status IN ('success', 'partial', 'failed')),
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );
  `);
  
  console.log('✓ import_logs table created');
  
  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_import_logs_user 
      ON import_logs(user_email, created_at DESC);
    
    CREATE INDEX IF NOT EXISTS idx_import_logs_status
      ON import_logs(import_status, created_at DESC);
  `);
  
  console.log('✓ import_logs indexes created');
  
  // Verify tables exist
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name IN ('import_previews', 'import_logs')
    ORDER BY name;
  `).all();
  
  console.log(`\n✓ Tables verified: ${tables.map(t => t.name).join(', ')}`);
  
  // Verify integrity
  const integrity = db.prepare('PRAGMA integrity_check;').get();
  if (integrity.integrity_check !== 'ok') {
    throw new Error(`Integrity check failed: ${integrity.integrity_check}`);
  }
  console.log('✓ Database integrity verified');
  
  const fkViolations = db.prepare('PRAGMA foreign_key_check;').all();
  if (fkViolations.length > 0) {
    console.warn(`⚠ ${fkViolations.length} foreign key violations detected`);
  } else {
    console.log('✓ No foreign key violations');
  }
  
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           PHASE 2 MIGRATION COMPLETE                       ║
╚════════════════════════════════════════════════════════════╝

✓ import_previews table ready
✓ import_logs table ready for audit trail
✓ All indexes created
✓ Database integrity verified

Next: Implement Phase 2 API endpoints
  - POST /api/patients/import/preview
  - POST /api/patients/import/confirm
`);
  
  db.close();
  process.exit(0);

} catch (error) {
  console.error(`✗ Migration failed: ${error.message}`);
  db.close();
  process.exit(1);
}
