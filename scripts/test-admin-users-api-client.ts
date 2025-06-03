// Simple API test script for the admin users API using fetch

// Set the admin passcode - in a real scenario, this would be stored securely
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "your-test-passcode";
const BASE_URL = "http://localhost:3000";

// Helper function for API requests
async function callApi(endpoint: string, method: string = 'GET', body?: any) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_PASSCODE}`
    },
    ...(body && { body: JSON.stringify(body) })
  });
  
  return response;
}

// Run tests
async function runTests() {
  try {
    // Test 1: Get all users
    console.log('Testing GET /api/admin/users...');
    const usersResponse = await callApi('/api/admin/users');
    
    if (!usersResponse.ok) {
      console.log(`❌ GET /api/admin/users failed with status: ${usersResponse.status}`);
      console.log(await usersResponse.text());
      return;
    }
    
    const usersData = await usersResponse.json();
    console.log(`✅ GET /api/admin/users returned ${usersData.users?.length || 0} users`);
    
    if (!usersData.users || usersData.users.length === 0) {
      console.log('No users found, skipping user-specific tests');
      return;
    }
    
    // Test 2: Get user by ID
    const firstUser = usersData.users[0];
    console.log(`Testing GET /api/admin/users/${firstUser.id}...`);
    const userResponse = await callApi(`/api/admin/users/${firstUser.id}`);
    
    if (!userResponse.ok) {
      console.log(`❌ GET /api/admin/users/${firstUser.id} failed with status: ${userResponse.status}`);
      console.log(await userResponse.text());
      return;
    }
    
    const userData = await userResponse.json();
    console.log(`✅ GET /api/admin/users/${firstUser.id} returned user: ${userData.name || userData.email}`);
    
    // Test 3: Update user to grant superuser status
    console.log(`Testing PATCH /api/admin/users/${firstUser.id} to grant superuser status...`);
    const updateResponse = await callApi(
      `/api/admin/users/${firstUser.id}`,
      'PATCH',
      { grantSuperUser: true, createInfiniteSubscription: true }
    );
    
    if (!updateResponse.ok) {
      console.log(`❌ PATCH /api/admin/users/${firstUser.id} failed with status: ${updateResponse.status}`);
      console.log(await updateResponse.text());
      return;
    }
    
    const updateData = await updateResponse.json();
    console.log(`✅ PATCH /api/admin/users/${firstUser.id} response: ${updateData.message}`);
    
    // Test 4: Get updated user to verify superuser status
    console.log(`Testing GET /api/admin/users/${firstUser.id} to verify superuser status...`);
    const updatedUserResponse = await callApi(`/api/admin/users/${firstUser.id}`);
    
    if (!updatedUserResponse.ok) {
      console.log(`❌ GET /api/admin/users/${firstUser.id} failed with status: ${updatedUserResponse.status}`);
      console.log(await updatedUserResponse.text());
      return;
    }
    
    const updatedUserData = await updatedUserResponse.json();
    console.log(`✅ User role is now: ${updatedUserData.role}`);
    console.log(`✅ User has ${updatedUserData.subscriptions?.length || 0} subscriptions`);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Tests failed with error:', error);
  }
}

// Run the tests
runTests();
