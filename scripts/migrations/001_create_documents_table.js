/**
 * Database Migration: Create documents table
 * Migration 001: Create patient documents table
 * 
 * This migration creates a table to store metadata for patient documents
 * Documents themselves are stored on the filesystem, not in the database
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class DocumentTableMigration {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  connect() {
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      return true;
    } catch (e) {
      console.error(`Failed to connect: ${e.message}`);
      return false;
    }
  }

  run() {
    console.log('\n' + '='.repeat(70));
    console.log('MIGRATION 001: Create documents table');
    console.log('='.repeat(70));

    try {
      // Check if table already exists
      const existing = this.db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='documents'`
      ).get();

      if (existing) {
        console.log('✓ Table "documents" already exists - skipping creation');
        return true;
      }

      // Create documents table
      this.db.exec(`
        CREATE TABLE documents (
          document_id INTEGER PRIMARY KEY AUTOINCREMENT,
          subject_id INTEGER NOT NULL,
          original_filename TEXT NOT NULL,
          stored_filename TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          storage_path TEXT NOT NULL,
          uploaded_by TEXT DEFAULT 'system',
          uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (subject_id) REFERENCES patients(subject_id) ON DELETE CASCADE
        );
      `);

      console.log('✓ Created: documents table');

      // Create indexes for efficient queries
      this.db.exec(`
        CREATE INDEX idx_documents_subject_id ON documents(subject_id);
        CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at DESC);
        CREATE UNIQUE INDEX idx_documents_stored_filename ON documents(stored_filename);
      `);

      console.log('✓ Created: indexes on documents table');

      // Verify table
      const result = this.db.prepare(
        `SELECT COUNT(*) as count FROM documents`
      ).get();

      console.log(`✓ Verified: documents table is functional (${result.count} records)`);
      return true;
    } catch (error) {
      console.error(`✗ Migration failed: ${error.message}`);
      return false;
    }
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const dbPath = process.argv[2] || path.join(__dirname, '../../clara.db');
  
  const migration = new DocumentTableMigration(dbPath);
  
  if (!migration.connect()) {
    process.exit(1);
  }

  const success = migration.run();
  migration.close();
  
  process.exit(success ? 0 : 1);
}

module.exports = DocumentTableMigration;
