/**
 * Logout API Endpoint
 * POST /api/auth/logout
 * 
 * Invalidates the user's server-side session.
 */

export async function POST(request) {
  try {
    // Dynamic import from backend at project root
    const { invalidateSession } = await import('../../../../../backend/database/connection.js');
    
    // Get session token from cookie
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = cookieHeader.split(';').map(c => c.trim());
    let sessionToken = null;
    
    // Check for session_id cookie first, fall back to auth for backwards compatibility
    let sessionCookie = cookies.find(c => c.startsWith('session_id='));
    if (!sessionCookie) {
      sessionCookie = cookies.find(c => c.startsWith('auth='));
    }
    
    if (sessionCookie) {
      const parts = sessionCookie.split('=');
      if (parts.length === 2) {
        sessionToken = parts[1].trim();
      }
    }

    if (sessionToken) {
      // Invalidate the session server-side
      invalidateSession(sessionToken);
      console.log(`[AUTH] Session invalidated for token: ${sessionToken.substring(0, 10)}...`);
    }

    // Clear the HttpOnly cookie by setting Max-Age=0
    const clearCookie = 'session_id=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax';

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Logged out successfully'
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Set-Cookie': clearCookie
        }
      }
    );

  } catch (error) {
    console.error('[AUTH] Logout error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server error during logout'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
