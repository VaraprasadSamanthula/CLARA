/**
 * Login API Endpoint
 * POST /api/auth/login
 * 
 * Validates user credentials and creates a server-side session.
 * Returns a session token to be stored as an HttpOnly cookie.
 */

// Demo credentials
const DEMO_USER = {
  email: 'doctor@hospital.com',
  password: 'demo123',
  userId: 'demo-user-001'
};

/**
 * Validate login credentials
 * In production: Check against hashed passwords in user database
 */
function validateCredentials(email, password) {
  if (email === DEMO_USER.email && password === DEMO_USER.password) {
    return {
      success: true,
      userId: DEMO_USER.userId,
      email: DEMO_USER.email
    };
  }
  
  return {
    success: false,
    error: 'Invalid email or password'
  };
}

export async function POST(request) {
  try {
    // Import from backend at project root
    const { initializeDb, createSession } = await import('../../../../../backend/database/connection.js');
    
    initializeDb();
    
    const { email, password } = await request.json();

    // Input validation
    if (!email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email and password are required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate credentials
    const validation = validateCredentials(email, password);
    
    if (!validation.success) {
      console.log(`[AUTH] Failed login attempt for email: ${email}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create server-side session
    const sessionToken = createSession(validation.userId, validation.email, 24); // 24 hour expiration
    
    console.log(`[AUTH] Successfully created session for: ${email}`);

    // Determine if running in production (HTTPS)
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Configure secure cookie with appropriate flags
    // Max-Age: 24 hours (86400 seconds) - must match server-side session expiration
    const cookieFlags = [
      `session_id=${sessionToken}`,
      'Path=/',
      'Max-Age=86400',  // 24 hours, matching server-side session expiration
      'HttpOnly',       // Prevent JavaScript access - SECURITY: Session token not accessible to XSS
      'SameSite=Lax',   // CSRF protection while allowing safe navigation
      isProduction ? 'Secure' : ''  // HTTPS only in production
    ]
      .filter(Boolean)
      .join('; ');

    // Return success with Set-Cookie header for HttpOnly cookie
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Login successful',
        user: {
          email: validation.email,
          userId: validation.userId
        }
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Set-Cookie': cookieFlags
        }
      }
    );

  } catch (error) {
    console.error('[AUTH] Login error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server error during login'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
