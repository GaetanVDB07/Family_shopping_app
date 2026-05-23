// Clean up duplicate items via the API (requires a logged-in user's Bearer token).
// Usage: CLEANUP_BEARER_TOKEN=your_jwt npm run ... or pass Authorization manually.

async function cleanupDuplicates() {
  const token = process.env.CLEANUP_BEARER_TOKEN;
  if (!token) {
    console.error('❌ Set CLEANUP_BEARER_TOKEN to a valid Supabase access token');
    process.exit(1);
  }

  try {
    console.log('🧹 Starting database cleanup...');
    
    const baseUrl = process.env.CLEANUP_BASE_URL || 'http://localhost:5000';
    const response = await fetch(`${baseUrl}/api/cleanup-duplicates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Cleanup complete:', result);
    } else {
      console.error('❌ Cleanup failed:', response.statusText);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

cleanupDuplicates();
