// Test script to call API directly and see what it returns
async function testAPI() {
  try {
    const familyId = '7d38b985-1012-4942-ae00-f8a272ceed07';
    
    // Add a timestamp to bypass cache
    const response = await fetch(`http://localhost:5000/api/grocery-items/${familyId}?t=${Date.now()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('Response not ok:', response.status, response.statusText);
      return;
    }
    
    const items = await response.json();
    console.log(`API returned ${items.length} items:`);
    items.forEach((item, index) => {
      console.log(`${index + 1}. ID: ${item.id}, Name: ${item.name}, Added by: ${item.addedBy}`);
    });
    
    // Check for duplicates
    const idCounts = {};
    items.forEach(item => {
      idCounts[item.id] = (idCounts[item.id] || 0) + 1;
    });
    
    const duplicates = Object.entries(idCounts).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.warn('DUPLICATES FOUND:', duplicates);
    } else {
      console.log('No duplicates found in API response');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();
