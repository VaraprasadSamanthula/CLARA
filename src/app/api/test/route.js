export async function GET(request) {
  try {
    // Dynamic import to avoid Turbopack resolution issues
    const { runQuery, getSchema, initializeDb, verifyAuth } = await import('../../../../backend/database/connection.js');
    
    initializeDb();
    
    // Verify authentication
    const session = verifyAuth(request);
    if (!session) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication required'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      // Test query
      const result = runQuery('SELECT COUNT(*) as patient_count FROM patients');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Database connection successful',
          result: result
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error) {
    console.error('[TEST] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server error: ' + error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
