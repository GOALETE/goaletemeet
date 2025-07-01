// Test admin authentication
async function testAuth() {
  const passcode = "adminGoaleteM33t2025!";
  
  try {
    console.log('Testing admin auth with passcode:', passcode);
    
    const response = await fetch('http://localhost:3000/api/admin/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ passcode })
    });
    
    console.log('Response status:', response.status);
    const data = await response.text();
    console.log('Response:', data);
    
    if (response.ok) {
      console.log('✅ Admin auth successful');
      
      // Test getting statistics
      const statsResponse = await fetch('http://localhost:3000/api/admin/statistics', {
        headers: {
          'Authorization': `Bearer ${passcode}`
        }
      });
      
      console.log('Stats response status:', statsResponse.status);
      const statsData = await statsResponse.text();
      console.log('Stats response:', statsData.substring(0, 200) + '...');
      
    } else {
      console.log('❌ Admin auth failed');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAuth();
