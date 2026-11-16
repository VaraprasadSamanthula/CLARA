/**
 * Session-Based Authentication Module
 * 
 * Provides robust server-side session management and authentication verification
 * using cryptographically secure session tokens stored server-side.
 * 
 * SECURITY NOTES:
 * - Session tokens are generated server-side and stored in the database
 * - Clients receive tokens via HttpOnly cookies (in production)
 * - Tokens are cryptographically random and non-guessable
 * - Each request validates the token against server state
 * - Forged cookies are rejected (not accepted blindly)
 * - Sessions can expire and be invalidated independently
 */

import { validateSession, invalidateSession, createSession } from '../../database/connection.js';

/**
 * Extract session token from request cookies
 * @param {NextRequest} request - The incoming request object
 * @returns {string|null} Session token if found, null otherwise
 */
function getSessionTokenFromCookie(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  
  if (!cookieHeader) {
    return null;
  }
  
  // Parse cookies
  const cookies = cookieHeader.split(';').map(c => c.trim());
  
  // Find session cookie (changed from 'auth' to 'session_id' for clarity)
  // For backwards compatibility during transition, also check 'auth'
  let sessionCookie = cookies.find(c => c.startsWith('session_id='));
  
  if (!sessionCookie) {
    // Fallback to legacy 'auth' cookie for transition period
    // But only accept it if it's NOT the boolean 'auth=true' value
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
    
    // Otherwise use it as a potential session token
    return value;
  }
  
  // Extract token value
  const parts = sessionCookie.split('=');
  if (parts.length !== 2) {
    return null;
  }
  
  return parts[1].trim();
}

/**
 * Verify authentication from request and retrieve session information
 * 
 * This function:
 * 1. Extracts the session token from cookies
 * 2. Validates the token against server-side storage
 * 3. Rejects forged, expired, or invalid tokens
 * 
 * @param {NextRequest} request - The incoming request object
 * @returns {object|null} Session object if valid, null if authentication fails
 * 
 * Returns object with structure:
 * {
 *   sessionId: string,
 *   userId: string,
 *   email: string,
 *   createdAt: number,
 *   expiresAt: number
 * }
 */
function verifySession(request) {
  const token = getSessionTokenFromCookie(request);
  
  if (!token) {
    console.log('[AUTH] No session token found in request');
    return null;
  }
  
  // Validate token against server-side storage
  const session = validateSession(token);
  
  if (!session) {
    console.log('[AUTH] Invalid, expired, or forged session token attempted');
    return null;
  }
  
  return session;
}

/**
 * Create authentication error response (401 Unauthorized)
 * @param {string} message - Optional custom error message
 * @returns {Response} 401 Unauthorized JSON response
 */
function authError(message = 'Authentication required') {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      hint: 'Please log in to access this resource'
    }),
    { 
      status: 401, 
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Verify authentication middleware for API routes
 * 
 * Usage in API route:
 * ```javascript
 * import { verifyAuth } from '@/lib/session-auth';
 * 
 * export async function GET(request) {
 *   const session = verifyAuth(request);
 *   if (!session) {
 *     return new Response(JSON.stringify({error: 'Unauthorized'}), {status: 401});
 *   }
 *   // Safe to proceed - user is authenticated
 * }
 * ```
 * 
 * @param {NextRequest} request - The incoming request
 * @returns {object|null} Session object if authenticated, null otherwise
 */
export function verifyAuth(request) {
  return verifySession(request);
}

/**
 * Create authentication error response for API handlers
 * @param {string} message - Error message
 * @returns {Response} 401 Unauthorized response
 */
export function sendAuthError(message = 'Authentication required') {
  return authError(message);
}

/**
 * Generate a new authenticated session for login
 * @param {string} userId - User identifier
 * @param {string} email - User email address
 * @returns {string} Session token to be set in cookie
 */
export function generateSessionToken(userId, email) {
  return createSession(userId, email, 24); // 24 hour expiration
}

/**
 * Invalidate a session (logout)
 * @param {string} sessionToken - Session token to invalidate
 */
export function logout(sessionToken) {
  invalidateSession(sessionToken);
}

/**
 * Check if request is authenticated
 * Returns true if valid session exists, false otherwise
 * @param {NextRequest} request
 * @returns {boolean}
 */
export function isAuthenticated(request) {
  return verifySession(request) !== null;
}
