// Quick test script to check admin APIs
const adminPasscode = "adminGoaleteM33t2025!";

async function testAdminAPIs() {
  console.log('Testing Admin APIs...');
  
  try {
    // Test statistics API
    console.log('\n1. Testing Statistics API...');
    const statsResponse = await fetch('http://localhost:3000/api/admin/statistics', {
      headers: {
        'Authorization': `Bearer ${adminPasscode}`
      }
    });
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✓ Statistics API working');
      console.log('Stats:', statsData.stats);
      console.log('Revenue:', statsData.revenue);
    } else {
      console.log('✗ Statistics API failed:', statsResponse.status);
    }
    
    // Test users API
    console.log('\n2. Testing Users API...');
    const usersResponse = await fetch('http://localhost:3000/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${adminPasscode}`
      }
    });
    
    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      console.log('✓ Users API working');
      console.log('Total users:', usersData.total);
      console.log('Users count:', usersData.users.length);
    } else {
      console.log('✗ Users API failed:', usersResponse.status);
    }
    
    // Test meetings API
    console.log('\n3. Testing Meetings API...');
    const meetingsResponse = await fetch('http://localhost:3000/api/admin/meetings', {
      headers: {
        'Authorization': `Bearer ${adminPasscode}`
      }
    });
    
    if (meetingsResponse.ok) {
      const meetingsData = await meetingsResponse.json();
      console.log('✓ Meetings API working');
      console.log('Meetings count:', meetingsData.meetings.length);
    } else {
      console.log('✗ Meetings API failed:', meetingsResponse.status);
    }
    
  } catch (error) {
    console.error('Error testing APIs:', error);
  }
}

testAdminAPIs();
