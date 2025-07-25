// Clean up duplicate items in the database
import { apiRequest } from '../client/src/lib/queryClient.js';

async function cleanupDuplicates() {
  try {
    console.log('🧹 Starting database cleanup...');
    
    // Call the cleanup API endpoint
    const response = await fetch('http://localhost:5000/api/cleanup-duplicates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
