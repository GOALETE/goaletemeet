// Test script for the admin users API

import { NextRequest } from "next/server";
import { GET as getUsersList } from "../app/api/admin/users/route";
import { GET as getUserById, PATCH as updateUser } from "../app/api/admin/users/[id]";

// Mock environment variable
process.env.ADMIN_PASSCODE = "test-passcode";

// Test function to simulate Next.js request
async function simulateRequest(url: string, method: string = 'GET', body?: any, headers: Record<string, string> = {}) {
  // Create mock request
  const request = new Request(url, {
    method,
    headers: new Headers({
      ...headers,
      'Authorization': 'Bearer test-passcode' // Add auth header
    }),
    ...(body && { body: JSON.stringify(body) })
  }) as unknown as NextRequest;

  // Determine which handler to call based on URL and method
  if (url.includes('/api/admin/users') && !url.includes('/api/admin/users/')) {
    // List users endpoint
    return await getUsersList(request);
  } else if (url.includes('/api/admin/users/') && method === 'GET') {
    // Get user by ID endpoint
    const userId = url.split('/api/admin/users/')[1];
    return await getUserById(request, { params: { id: userId } });
  } else if (url.includes('/api/admin/users/') && method === 'PATCH') {
    // Update user endpoint
    const userId = url.split('/api/admin/users/')[1];
    return await updateUser(request, { params: { id: userId } });
  }

  throw new Error(`Unhandled request: ${method} ${url}`);
}

// Run tests
async function runTests() {
  try {
    console.log('Testing getUsersList...');
    const usersResponse = await simulateRequest('http://localhost:3000/api/admin/users');
    const usersData = await usersResponse.json();
    console.log('Users list response:', usersData);

    if (usersData.users && Array.isArray(usersData.users)) {
      console.log(`✅ getUsersList: Found ${usersData.users.length} users`);
      
      // If we have users, test getUserById with the first one
      if (usersData.users.length > 0) {
        const firstUser = usersData.users[0];
        console.log(`Testing getUserById with user ID: ${firstUser.id}...`);
        
        const userResponse = await simulateRequest(`http://localhost:3000/api/admin/users/${firstUser.id}`);
        const userData = await userResponse.json();
        console.log('User details response:', userData);
        
        if (userData.id === firstUser.id) {
          console.log(`✅ getUserById: Successfully retrieved user ${userData.id}`);
          
          // Test granting superuser status
          console.log(`Testing updateUser to grant superuser status...`);
          const updateResponse = await simulateRequest(
            `http://localhost:3000/api/admin/users/${firstUser.id}`,
            'PATCH',
            { grantSuperUser: true, createInfiniteSubscription: true }
          );
          const updateData = await updateResponse.json();
          console.log('Update response:', updateData);
          
          if (updateData.message && updateData.message.includes('superuser')) {
            console.log(`✅ updateUser: Successfully granted superuser status`);
          } else {
            console.log(`❌ updateUser: Failed to grant superuser status`);
          }
        } else {
          console.log(`❌ getUserById: Failed to retrieve user ${firstUser.id}`);
        }
      }
    } else {
      console.log(`❌ getUsersList: Failed to retrieve users list`);
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the tests
runTests();
