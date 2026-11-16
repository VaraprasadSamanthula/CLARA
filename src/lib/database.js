/**
 * Database Module Wrapper
 * 
 * This module wraps the backend database connection module.
 * It uses require() to load backend modules at runtime, which allows
 * Turbopack to build successfully (it sees this as a JS file in src/lib/)
 * while still accessing the database modules at runtime.
 */

// Use require.resolve to find the module path dynamically
let connectionModule = null;

function getConnectionModule() {
  if (!connectionModule) {
    try {
      // Use require to load the backend module
      // This works because require() is evaluated at runtime, not build time
      connectionModule = require('../../backend/database/connection.js');
    } catch (e) {
      console.error('[DATABASE] Failed to load connection module:', e.message);
      throw e;
    }
  }
  return connectionModule;
}

// Re-export all functions with lazy loading
export function initializeDb() {
  const mod = getConnectionModule();
  return mod.initializeDb();
}

export function runQuery(sql, params) {
  const mod = getConnectionModule();
  return mod.runQuery(sql, params);
}

export function getSchema() {
  const mod = getConnectionModule();
  return mod.getSchema();
}

export function verifyAuth(request) {
  const mod = getConnectionModule();
  return mod.verifyAuth(request);
}

export function createSession(userId, email, expirationHours) {
  const mod = getConnectionModule();
  return mod.createSession(userId, email, expirationHours);
}

export function validateSession(sessionId) {
  const mod = getConnectionModule();
  return mod.validateSession(sessionId);
}

export function invalidateSession(sessionId) {
  const mod = getConnectionModule();
  return mod.invalidateSession(sessionId);
}

export function healthCheck() {
  const mod = getConnectionModule();
  return mod.healthCheck();
}
