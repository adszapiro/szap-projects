/**
 * Standardized Error Handling Utilities
 * 
 * Use these across all apps for consistent error handling and responses.
 */

// Error types for categorization
export type ErrorType = 
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "NOT_FOUND_ERROR"
  | "TIMEOUT_ERROR"
  | "RATE_LIMIT_ERROR"
  | "EXTERNAL_SERVICE_ERROR"
  | "INTERNAL_ERROR";

// Standard error response structure
export interface ApiError {
  type: ErrorType;
  message: string;
  details?: string;
  code?: string;
  retryable: boolean;
}

// HTTP status codes for each error type
export const ERROR_STATUS_CODES: Record<ErrorType, number> = {
  VALIDATION_ERROR: 400,
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
  NOT_FOUND_ERROR: 404,
  TIMEOUT_ERROR: 408,
  RATE_LIMIT_ERROR: 429,
  EXTERNAL_SERVICE_ERROR: 502,
  INTERNAL_ERROR: 500,
};

// User-friendly error messages
export const ERROR_MESSAGES: Record<ErrorType, string> = {
  VALIDATION_ERROR: "Please check your input and try again.",
  AUTHENTICATION_ERROR: "Please log in to continue.",
  AUTHORIZATION_ERROR: "You don't have permission to perform this action.",
  NOT_FOUND_ERROR: "The requested resource was not found.",
  TIMEOUT_ERROR: "The request took too long. Please try again.",
  RATE_LIMIT_ERROR: "Too many requests. Please wait a moment and try again.",
  EXTERNAL_SERVICE_ERROR: "An external service is unavailable. Please try again later.",
  INTERNAL_ERROR: "Something went wrong. Please try again later.",
};

/**
 * Create a standardized API error
 */
export function createApiError(
  type: ErrorType,
  customMessage?: string,
  details?: string
): ApiError {
  return {
    type,
    message: customMessage || ERROR_MESSAGES[type],
    details,
    retryable: isRetryable(type),
  };
}

/**
 * Check if an error type is retryable
 */
export function isRetryable(type: ErrorType): boolean {
  return [
    "TIMEOUT_ERROR",
    "RATE_LIMIT_ERROR",
    "EXTERNAL_SERVICE_ERROR",
    "INTERNAL_ERROR",
  ].includes(type);
}

/**
 * Create a NextResponse-compatible error object
 */
export function createErrorResponse(type: ErrorType, customMessage?: string, details?: string) {
  return {
    error: createApiError(type, customMessage, details),
    status: ERROR_STATUS_CODES[type],
  };
}

/**
 * Parse an unknown error into a standardized format
 */
export function parseError(error: unknown): ApiError {
  if (error instanceof Error) {
    // Check for specific error types
    if (error.name === "AbortError") {
      return createApiError("TIMEOUT_ERROR");
    }
    
    if (error.message.includes("401") || error.message.toLowerCase().includes("unauthorized")) {
      return createApiError("AUTHENTICATION_ERROR");
    }
    
    if (error.message.includes("403") || error.message.toLowerCase().includes("forbidden")) {
      return createApiError("AUTHORIZATION_ERROR");
    }
    
    if (error.message.includes("404") || error.message.toLowerCase().includes("not found")) {
      return createApiError("NOT_FOUND_ERROR");
    }
    
    if (error.message.includes("429") || error.message.toLowerCase().includes("rate limit")) {
      return createApiError("RATE_LIMIT_ERROR");
    }
    
    return createApiError("INTERNAL_ERROR", undefined, error.message);
  }
  
  return createApiError("INTERNAL_ERROR");
}

/**
 * Log error with consistent formatting (for server-side use)
 */
export function logError(context: string, error: unknown): void {
  const parsed = parseError(error);
  console.error(`[${context}] ${parsed.type}: ${parsed.message}`, {
    details: parsed.details,
    originalError: error,
  });
}

/**
 * Format error for display to users
 */
export function formatUserError(error: ApiError): string {
  if (error.retryable) {
    return `${error.message} You can try again.`;
  }
  return error.message;
}

/**
 * Standard API response structure for success
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  requestId?: string;
}

/**
 * Standard API response structure for errors
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    code: string;
    message: string;
    details?: string;
    retryable: boolean;
  };
  requestId?: string;
}

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(data: T, requestId?: string): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    requestId,
  };
}

/**
 * Create a standardized error response for API routes
 */
export function createApiErrorResponse(
  type: ErrorType,
  customMessage?: string,
  details?: string,
  requestId?: string
): ApiErrorResponse {
  const error = createApiError(type, customMessage, details);
  return {
    success: false,
    error: {
      type: error.type,
      code: type,
      message: error.message,
      details: error.details,
      retryable: error.retryable,
    },
    requestId,
  };
}

/**
 * Create a JSON Response object for Next.js API routes
 */
export function jsonErrorResponse(
  type: ErrorType,
  customMessage?: string,
  details?: string
): Response {
  const requestId = generateRequestId();
  const body = createApiErrorResponse(type, customMessage, details, requestId);
  return new Response(JSON.stringify(body), {
    status: ERROR_STATUS_CODES[type],
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
    },
  });
}

/**
 * Create a JSON Response object for successful responses
 */
export function jsonSuccessResponse<T>(data: T, status = 200): Response {
  const requestId = generateRequestId();
  const body = createSuccessResponse(data, requestId);
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
    },
  });
}
