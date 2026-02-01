// Shared UI Component Library
// Based on Nielsen's Usability Heuristics and Norman's Design Principles

// Loading States (Nielsen #1: Visibility of System Status)
export { LoadingSpinner } from "./loading-spinner";
export { LoadingSkeleton, CardSkeleton, TableRowSkeleton } from "./loading-skeleton";
export { ProgressBar, CircularProgress } from "./progress-bar";

// Error Handling (Nielsen #9: Help Users Recognize, Diagnose, and Recover from Errors)
export { ErrorBoundary, ErrorFallback, InlineError } from "./error-boundary";
export { EmptyState, NoResultsState, ErrorState } from "./empty-state";

// Feedback (Norman: Feedback)
export { ToastProvider, useToast } from "./toast";

// User Control (Nielsen #3: User Control and Freedom)
export { ConfirmDialog } from "./confirm-dialog";

// Help & Documentation (Nielsen #10: Help and Documentation)
export { Tooltip, HelpTooltip } from "./tooltip";
export { useKeyboardShortcuts, ShortcutsPanel, Kbd } from "./keyboard-shortcuts";

// Existing components
export { Card } from "./card";
