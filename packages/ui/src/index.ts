// Shared UI Component Library
// Based on Nielsen's Usability Heuristics and Norman's Design Principles

// Loading States (Nielsen #1: Visibility of System Status)
export { LoadingSpinner } from "./loading-spinner";
export { LoadingSkeleton, CardSkeleton, TableRowSkeleton } from "./loading-skeleton";
export { ProgressBar, CircularProgress } from "./progress-bar";

// Error Handling (Nielsen #9: Help Users Recognize, Diagnose, and Recover from Errors)
export { ErrorBoundary, ErrorFallback, InlineError } from "./error-boundary";
export { EmptyState, NoResultsState, ErrorState } from "./empty-state";
export {
  createApiError,
  createErrorResponse,
  createApiErrorResponse,
  createSuccessResponse,
  jsonErrorResponse,
  jsonSuccessResponse,
  generateRequestId,
  parseError,
  logError,
  formatUserError,
  isRetryable,
  ERROR_STATUS_CODES,
  ERROR_MESSAGES,
  type ApiError,
  type ErrorType,
  type ApiSuccessResponse,
  type ApiErrorResponse,
} from "./error-utils";

// Feedback (Norman: Feedback)
export { ToastProvider, useToast } from "./toast";

// User Control (Nielsen #3: User Control and Freedom)
export { ConfirmDialog } from "./confirm-dialog";

// Help & Documentation (Nielsen #10: Help and Documentation)
export { Tooltip, HelpTooltip } from "./tooltip";
export { useKeyboardShortcuts, ShortcutsPanel, Kbd } from "./keyboard-shortcuts";

// Existing components
export { Card } from "./card";

// Analytics & Monitoring
export { Analytics, trackEvent, trackError } from "./analytics";

// Rate Limiting (API Security Best Practice)
export {
  rateLimit,
  getClientIp,
  rateLimitResponse,
  type RateLimitConfig,
  type RateLimitResult,
} from "./rate-limit";

// Structured Logging (DevOps Best Practice)
export {
  logger,
  createLogger,
  createRequestLogger,
  type LogLevel,
  type LogContext,
} from "./logger";

// Fetch Utilities with Retry (Backend Reliability)
export {
  fetchWithRetry,
  fetchJsonWithRetry,
  createApiFetcher,
  type RetryConfig,
} from "./fetch-utils";

// Security Utilities (CVE-2025-48370 Supabase protection)
export {
  isValidUUID,
  sanitizeUUID,
  validateUUIDs,
  sanitizeInput,
  isValidEmail,
  sanitizeRedirectUrl,
  getSecurityHeaders,
} from "./security";
