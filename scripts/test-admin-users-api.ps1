# Test script for the admin users API using curl

# Set the admin passcode
$ADMIN_PASSCODE = $env:ADMIN_PASSCODE
if (-not $ADMIN_PASSCODE) {
    $ADMIN_PASSCODE = "your-test-passcode"
}
$BASE_URL = "http://localhost:3000"

Write-Host "Testing Admin Users API" -ForegroundColor Green
Write-Host "====================" -ForegroundColor Green

# Test 1: Get all users
Write-Host "`nTesting GET /api/admin/users..." -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users" -Headers @{
    "Authorization" = "Bearer $ADMIN_PASSCODE"
} -Method GET -ErrorAction SilentlyContinue -StatusCodeVariable statusCode

if ($statusCode -eq 200) {
    Write-Host "✅ GET /api/admin/users returned $($response.users.Count) users" -ForegroundColor Green
    
    # If we have users, test the other endpoints
    if ($response.users -and $response.users.Count -gt 0) {
        $firstUser = $response.users[0]
        
        # Test 2: Get user by ID
        Write-Host "`nTesting GET /api/admin/users/$($firstUser.id)..." -ForegroundColor Cyan
        $userResponse = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/$($firstUser.id)" -Headers @{
            "Authorization" = "Bearer $ADMIN_PASSCODE"
        } -Method GET -ErrorAction SilentlyContinue -StatusCodeVariable statusCode
        
        if ($statusCode -eq 200) {
            Write-Host "✅ GET /api/admin/users/$($firstUser.id) returned user: $($userResponse.name)" -ForegroundColor Green
            
            # Test 3: Update user to grant superuser status
            Write-Host "`nTesting PATCH /api/admin/users/$($firstUser.id) to grant superuser status..." -ForegroundColor Cyan
            $updateBody = @{
                grantSuperUser = $true
                createInfiniteSubscription = $true
            } | ConvertTo-Json
            
            $updateResponse = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/$($firstUser.id)" -Headers @{
                "Authorization" = "Bearer $ADMIN_PASSCODE"
                "Content-Type" = "application/json"
            } -Method PATCH -Body $updateBody -ErrorAction SilentlyContinue -StatusCodeVariable statusCode
            
            if ($statusCode -eq 200) {
                Write-Host "✅ PATCH /api/admin/users/$($firstUser.id) response: $($updateResponse.message)" -ForegroundColor Green
                
                # Test 4: Get updated user to verify superuser status
                Write-Host "`nTesting GET /api/admin/users/$($firstUser.id) to verify superuser status..." -ForegroundColor Cyan
                $updatedUserResponse = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/$($firstUser.id)" -Headers @{
                    "Authorization" = "Bearer $ADMIN_PASSCODE"
                } -Method GET -ErrorAction SilentlyContinue -StatusCodeVariable statusCode
                
                if ($statusCode -eq 200) {
                    Write-Host "✅ User role is now: $($updatedUserResponse.role)" -ForegroundColor Green
                    Write-Host "✅ User has $($updatedUserResponse.subscriptions.Count) subscriptions" -ForegroundColor Green
                } else {
                    Write-Host "❌ GET /api/admin/users/$($firstUser.id) failed with status: $statusCode" -ForegroundColor Red
                }
            } else {
                Write-Host "❌ PATCH /api/admin/users/$($firstUser.id) failed with status: $statusCode" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ GET /api/admin/users/$($firstUser.id) failed with status: $statusCode" -ForegroundColor Red
        }
    } else {
        Write-Host "No users found, skipping user-specific tests" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ GET /api/admin/users failed with status: $statusCode" -ForegroundColor Red
}

Write-Host "`nAll tests completed!" -ForegroundColor Green
