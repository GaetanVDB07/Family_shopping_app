// Simple test endpoint
module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    return res.status(200).json({ 
      message: 'Simple test API is working!', 
      method: req.method,
      timestamp: new Date().toISOString(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasDatabaseUrl: !!process.env.DATABASE_URL
      }
    });
  } catch (error) {
    console.error('Test API Error:', error);
    return res.status(500).json({ 
      message: 'Test API error',
      error: error.message
    });
  }
};
