# Test runner script for meeting API tests
# This script runs all the test scripts and validates environment variables

# Make sure we exit on any error
$ErrorActionPreference = "Stop"

# Check for required environment variables
$googleVars = @("GOOGLE_CLIENT_EMAIL", "GOOGLE_PRIVATE_KEY", "GOOGLE_CALENDAR_ID")
$zoomVars = @("ZOOM_JWT_TOKEN", "ZOOM_USER_ID")
$generalVars = @("DEFAULT_MEETING_PLATFORM", "DEFAULT_MEETING_TIME", "DEFAULT_MEETING_DURATION", "ADMIN_PASSCODE")

Write-Host "`n===== Checking Environment Variables =====" -ForegroundColor Cyan

# Get platform to check appropriate variables
$platform = $env:DEFAULT_MEETING_PLATFORM
if (-not $platform) {
    $platform = "google-meet" # Default platform
    Write-Host "DEFAULT_MEETING_PLATFORM not set, assuming: $platform" -ForegroundColor Yellow
}

# Check platform-specific variables
Write-Host "`nChecking $platform integration variables..." -ForegroundColor Cyan
$platformVars = if ($platform -eq "google-meet") { $googleVars } else { $zoomVars }
$missingVars = @()

foreach ($var in $platformVars) {
    if (-not (Get-Item env:$var -ErrorAction SilentlyContinue)) {
        $missingVars += $var
        Write-Host "❌ Missing: $var" -ForegroundColor Red
    } else {
        Write-Host "✓ Set: $var" -ForegroundColor Green
    }
}

# Check general variables
Write-Host "`nChecking general meeting variables..." -ForegroundColor Cyan
foreach ($var in $generalVars) {
    if (-not (Get-Item env:$var -ErrorAction SilentlyContinue)) {
        $missingVars += $var
        Write-Host "❌ Missing: $var" -ForegroundColor Red
    } else {
        Write-Host "✓ Set: $var" -ForegroundColor Green
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "`n❌ Error: Missing required environment variables." -ForegroundColor Red
    Write-Host "Please set these variables in your .env file before running tests." -ForegroundColor Yellow
    Write-Host "You can use .env.example as a template." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n✅ All required environment variables are set" -ForegroundColor Green

# Function to run a test and report success/failure
function Run-Test {
    param (
        [string]$Name,
        [string]$Script
    )
    
    Write-Host "`n===== Running: $Name =====" -ForegroundColor Cyan
    
    try {
        # Run the test
        & npm run $Script
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ $Name completed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "`n❌ $Name failed with exit code $LASTEXITCODE" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "`n❌ $Name failed with error: $_" -ForegroundColor Red
        return $false
    }
}

# Run tests in sequence
$tests = @(
    @{Name="Meeting Environment Variables Test"; Script="test:meeting-env"},
    @{Name="Meeting API Integration Test"; Script="test:meeting-api"},
    @{Name="Admin Meetings API Test"; Script="test:admin-meetings"},
    @{Name="Daily Cron Job Test"; Script="test:cron-invites"}
)

$failedTests = 0

foreach ($test in $tests) {
    $success = Run-Test -Name $test.Name -Script $test.Script
    if (-not $success) {
        $failedTests++
    }
}

# Print summary
Write-Host "`n===== TEST SUMMARY =====" -ForegroundColor Cyan
Write-Host "Total tests: $($tests.Count)"
Write-Host "Passed: $($tests.Count - $failedTests)" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor $(if ($failedTests -gt 0) { "Red" } else { "Green" })

if ($failedTests -gt 0) {
    Write-Host "`n❌ Some tests failed. Please check the logs above for details." -ForegroundColor Red
    exit 1
} else {
    Write-Host "`n✅ All tests passed successfully!" -ForegroundColor Green
}
