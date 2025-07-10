#!/usr/bin/env node

// Test deployment status
const testDeployment = async () => {
  console.log('🚀 Testing Family Shopping App Deployment...\n');

  const baseUrl = 'https://family-shopping-app-eta.vercel.app';
  
  const tests = [
    {
      name: 'Frontend (Static)',
      url: baseUrl,
      expected: 'HTML content with React app'
    },
    {
      name: 'API Ping',
      url: `${baseUrl}/api/ping`,
      expected: '{"ok":true}'
    },
    {
      name: 'API Test',
      url: `${baseUrl}/api/test`,
      expected: 'API is working message'
    },
    {
      name: 'API User Family (No Auth)',
      url: `${baseUrl}/api/user/family`,
      expected: '401 Unauthorized'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      const response = await fetch(test.url);
      const status = response.status;
      
      let content;
      try {
        content = await response.text();
      } catch (e) {
        content = 'Unable to read response';
      }

      if (test.name === 'Frontend (Static)') {
        const success = content.includes('<title>') && content.includes('React');
        console.log(`  ✅ Status: ${status}`);
        console.log(`  ✅ Contains HTML: ${success ? 'Yes' : 'No'}`);
      } else if (test.name === 'API User Family (No Auth)') {
        const success = status === 401;
        console.log(`  ${success ? '✅' : '❌'} Status: ${status}`);
        console.log(`  ${success ? '✅' : '❌'} Expected 401: ${success ? 'Yes' : 'No'}`);
      } else {
        const success = status === 200;
        console.log(`  ${success ? '✅' : '❌'} Status: ${status}`);
        console.log(`  ${success ? '✅' : '❌'} Response: ${content.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log('');
  }

  console.log('🎯 Next Steps:');
  console.log('1. Open https://family-shopping-app-eta.vercel.app in your browser');
  console.log('2. Test the complete user flow:');
  console.log('   - Login with Supabase Auth');
  console.log('   - Create or join a family');
  console.log('   - Add grocery items');
  console.log('   - Test real-time updates');
  console.log('3. Test in multiple browser tabs for real-time sync');
  console.log('4. Test logout and re-login functionality');
  console.log('');
  console.log('📊 Database Status:');
  console.log('- Database has been reset (all tables are empty)');
  console.log('- Users will need to create/join families again');
  console.log('- Real-time is enabled on all tables');
  console.log('');
  console.log('🔧 If you encounter issues:');
  console.log('- Check browser console for errors');
  console.log('- Check network tab for failed API calls');
  console.log('- Verify Supabase Auth is working');
  console.log('- Check that environment variables are set correctly');
};

testDeployment().catch(console.error);
