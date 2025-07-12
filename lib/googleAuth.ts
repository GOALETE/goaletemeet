import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

/**
 * Service account configuration
 * Using JWT (Service Account) authentication with Domain-Wide Delegation
 */
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

/**
 * Create JWT client for service account authentication with Domain-Wide Delegation
 * @param impersonateUser Email of the user to impersonate (optional for domain-wide delegation)
 */
export function createJWTClient(impersonateUser?: string): JWT {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Google service account credentials are missing. Please set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.'
    );
  }

  // Create JWT client with optional user impersonation for Domain-Wide Delegation
  const jwtConfig: any = {
    email: clientEmail,
    key: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines properly
    scopes: SCOPES,
  };

  // Add subject (user impersonation) if provided for Domain-Wide Delegation
  if (impersonateUser) {
    jwtConfig.subject = impersonateUser;
    console.log(`Creating JWT client with Domain-Wide Delegation for user: ${impersonateUser}`);
  } else {
    console.log('Creating JWT client without user impersonation (direct service account access)');
  }

  return new google.auth.JWT(jwtConfig);
}

/**
 * Get an authenticated Google Calendar client using service account
 * @param impersonateUser Email of the user to impersonate for Domain-Wide Delegation
 */
export async function getCalendarClient(impersonateUser?: string) {
  try {
    const jwtClient = createJWTClient(impersonateUser);
    
    // Authorize the client
    await jwtClient.authorize();
    
    console.log(`Successfully authenticated${impersonateUser ? ` as ${impersonateUser}` : ' with service account'}`);
    
    // Return the calendar client
    return google.calendar({ version: 'v3', auth: jwtClient });
  } catch (error) {
    console.error('Error creating Google Calendar client:', error);
    throw new Error(`Failed to authenticate with Google Calendar API: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Test authentication by making a simple API call
 * @param impersonateUser Email of the user to impersonate for testing
 */
export async function testAuthentication(impersonateUser?: string): Promise<boolean> {
  try {
    const calendar = await getCalendarClient(impersonateUser);
    
    // Try to get calendar info to verify authentication
    const calendarId = impersonateUser ? 'primary' : 'primary';
    await calendar.calendars.get({ calendarId });
    
    console.log(`✅ Authentication test successful${impersonateUser ? ` for user ${impersonateUser}` : ' with service account'}`);
    return true;
  } catch (error) {
    console.error(`❌ Authentication test failed${impersonateUser ? ` for user ${impersonateUser}` : ''}:`, error);
    return false;
  }
}

/**
 * Get authenticated JWT client with optional user impersonation
 * @param impersonateUser Email of the user to impersonate
 */
export async function getAuthenticatedJWT(impersonateUser?: string): Promise<JWT> {
  const jwtClient = createJWTClient(impersonateUser);
  await jwtClient.authorize();
  return jwtClient;
}

/**
 * Check if service account is properly configured
 */
export function isAuthenticated(): boolean {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  
  return !!(clientEmail && privateKey);
}

/**
 * Get default impersonation user from environment
 * This is useful for testing and default operations
 * Uses ADMIN_EMAIL as the primary source for consistency
 */
export function getDefaultImpersonationUser(): string | undefined {
  // Use ADMIN_EMAIL as the primary source for Domain-Wide Delegation
  return getAdminEmail();
}

/**
 * Create calendar client with default user impersonation
 * Uses environment variable for default user if available
 */
export async function getDefaultCalendarClient() {
  const defaultUser = getDefaultImpersonationUser();
  
  if (!defaultUser) {
    console.warn('No default impersonation user found, using direct service account access');
    return getCalendarClient();
  }
  
  console.log(`Using default impersonation user: ${defaultUser}`);
  return getCalendarClient(defaultUser);
}

/**
 * Test Domain-Wide Delegation setup
 * This function tests both direct service account access and user impersonation
 */
export async function testDomainWideDelegation(): Promise<{
  directAccess: boolean;
  userImpersonation: boolean;
  impersonationUser?: string;
  error?: string;
}> {
  const results = {
    directAccess: false,
    userImpersonation: false,
    impersonationUser: undefined as string | undefined,
    error: undefined as string | undefined
  };

  try {
    // Test 1: Direct service account access
    console.log('🔍 Testing direct service account access...');
    results.directAccess = await testAuthentication();

    // Test 2: User impersonation (Domain-Wide Delegation)
    const testUser = getDefaultImpersonationUser();
    if (testUser) {
      console.log(`🔍 Testing Domain-Wide Delegation with user: ${testUser}`);
      results.impersonationUser = testUser;
      results.userImpersonation = await testAuthentication(testUser);
    } else {
      console.log('⚠️  No test user found for Domain-Wide Delegation testing');
      results.error = 'No test user configured for impersonation testing';
    }

    return results;
  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
    return results;
  }
}

/**
 * Get admin email for consistent usage across the application
 * This is the email used for Domain-Wide Delegation impersonation
 */
export function getAdminEmail(): string | undefined {
  return process.env.ADMIN_EMAIL;
}

/**
 * Validate that admin email is configured
 * Throws an error if ADMIN_EMAIL is not set
 */
export function requireAdminEmail(): string {
  const adminEmail = getAdminEmail();
  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL environment variable is required for Domain-Wide Delegation');
  }
  return adminEmail;
}
