/**
 * Error handling utilities for GoaleteMeet
 * This module provides standardized error handling, logging, and response formatting
 */

import { NextResponse } from 'next/server';

/**
 * Interface for error response structure
 */
export interface ErrorResponse {
  success: boolean;
  message: string;
  error?: string;
  details?: any;
  timestamp: string;
}

/**
 * Interface for success response structure
 */
export interface SuccessResponse {
  success: boolean;
  message: string;
  [key: string]: any;
}

/**
 * Standard error types with appropriate HTTP status codes
 */
export enum ErrorType {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_ERROR = 500,
}

/**
 * Map of error types to default messages
 */
const ERROR_MESSAGES = {
  [ErrorType.BAD_REQUEST]: 'Invalid request data',
  [ErrorType.UNAUTHORIZED]: 'Authentication required',
  [ErrorType.FORBIDDEN]: 'You do not have permission to access this resource',
  [ErrorType.NOT_FOUND]: 'Resource not found',
  [ErrorType.INTERNAL_ERROR]: 'Internal server error',
};

/**
 * Log error details with consistent formatting
 */
export function logError(
  message: string, 
  error: unknown, 
  context: Record<string, any> = {}
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const timestamp = new Date().toISOString();
  
  console.error(`[ERROR] ${message}`, {
    error: errorObj.message,
    stack: errorObj.stack,
    context,
    timestamp,
  });
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  errorType: ErrorType,
  message?: string,
  error?: unknown,
  details?: any
): NextResponse<ErrorResponse> {
  const errorMessage = error instanceof Error ? error.message : String(error || '');
  
  if (error) {
    logError(message || ERROR_MESSAGES[errorType], error, { details });
  }
  
  return NextResponse.json({
    success: false,
    message: message || ERROR_MESSAGES[errorType],
    error: errorMessage || undefined,
    details,
    timestamp: new Date().toISOString(),
  }, { status: errorType });
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse(
  data: any,
  message: string = 'Operation completed successfully'
): NextResponse<SuccessResponse> {
  return NextResponse.json({
    success: true,
    message,
    ...data,
    timestamp: new Date().toISOString(),
  }, { status: 200 });
}

/**
 * Wrap an async handler with standardized error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ErrorResponse>> {
  return handler().catch((error) => {
    return createErrorResponse(
      ErrorType.INTERNAL_ERROR,
      'An unexpected error occurred',
      error
    );
  });
}

/**
 * A specialized error class for API errors
 */
export class ApiError extends Error {
  statusCode: number;
  details?: any;
  
  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
  
  toResponse(): NextResponse<ErrorResponse> {
    return createErrorResponse(
      this.statusCode as ErrorType,
      this.message,
      this,
      this.details
    );
  }
}

/**
 * Create a standardized validation error response from Zod errors
 */
export function createValidationErrorResponse(
  validationError: any
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    ErrorType.BAD_REQUEST,
    'Validation failed',
    new Error('Invalid input data'),
    validationError.flatten()
  );
}
