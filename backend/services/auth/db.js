/**
 * Database Session Functions
 * 
 * Re-exports session management functions from the main database connection module.
 * This file provides a clean separation of concerns - session-auth.js imports
 * session-related functions from here, while the actual database implementation
 * remains in backend/database/connection.js
 */

export { createSession, validateSession, invalidateSession } from '../../database/connection.js';
