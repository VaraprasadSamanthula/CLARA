/**
 * Authentication utilities (DEPRECATED)
 * This module is kept for backwards compatibility.
 * New code should use @/lib/session-auth instead.
 * 
 * This now delegates to the session-based authentication system.
 */

import { verifyAuth as verifySessionAuth, sendAuthError } from './session-auth';

/**
 * DEPRECATED: Use verifyAuth from session-auth instead
 * 
 * Verify authentication from request cookies
 * 
 * @param {NextRequest} request - The incoming request object
 * @returns {object|null} - Session object if valid, null otherwise
 */
export function verifyAuth(request) {
  return verifySessionAuth(request);
}

/**
 * Generate authentication error response
 * @param {string} message - Optional custom message
 * @returns {Response} - 401 Unauthorized response
 */
export function authError(message = 'Authentication required') {
  return sendAuthError(message);
}
