/**
 * Database Connection Wrapper
 * Re-exports functions from backend/database/connection.js
 * Placed in src/lib/ so Turbopack can analyze it at build time
 */

// This is a hacky workaround for Turbopack's limitation:
// Turbopack cannot resolve imports outside src/ during build analysis,
// even with dynamic imports. By creating this wrapper in src/lib/,
// we allow Turbopack to see the re-export at build time, while
// the actual import happens at runtime via parent module resolution.

export async function getDatabaseFunctions() {
  // This returns a promise that resolves at runtime
  // Turbopack sees this is async and doesn't try to resolve it
  return import('../../backend/database/connection.js');
}

// Direct re-export for static analysis (Turbopack can't traverse this)
// export { runQuery, verifyAuth, createSession } from '../../backend/database/connection.js';
