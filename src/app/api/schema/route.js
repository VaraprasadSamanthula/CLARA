export async function GET(request) {
  // Dynamic import to avoid Turbopack resolution issues
  const { getSchema, initializeDb, verifyAuth } = await import('../../../../backend/database/connection.js');
  
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

  return new Response(JSON.stringify({ schema: getSchema() }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

