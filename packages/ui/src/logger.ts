/**
 * Structured Logging Utility
 *
 * Provides structured JSON logging for API routes and services.
 * In production, this can be extended to use external logging services.
 *
 * Based on roadmap.sh DevOps best practices.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  service?: string;
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
  duration?: number;
  status?: number;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
  return envLevel && LOG_LEVELS[envLevel] !== undefined ? envLevel : "info";
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = getLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatLog(level: LogLevel, message: string, context?: LogContext): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };
}

function output(entry: LogEntry): void {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // JSON output for production (easier to parse by log aggregators)
    console.log(JSON.stringify(entry));
  } else {
    // Formatted output for development
    const levelColors: Record<LogLevel, string> = {
      debug: "\x1b[36m", // cyan
      info: "\x1b[32m", // green
      warn: "\x1b[33m", // yellow
      error: "\x1b[31m", // red
    };
    const reset = "\x1b[0m";
    const color = levelColors[entry.level];
    const contextStr = entry.context
      ? ` ${JSON.stringify(entry.context)}`
      : "";
    console.log(
      `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} - ${entry.message}${contextStr}`
    );
  }
}

/**
 * Create a logger instance for a specific service
 */
export function createLogger(service: string) {
  return {
    debug(message: string, context?: Omit<LogContext, "service">) {
      if (shouldLog("debug")) {
        output(formatLog("debug", message, { service, ...context }));
      }
    },

    info(message: string, context?: Omit<LogContext, "service">) {
      if (shouldLog("info")) {
        output(formatLog("info", message, { service, ...context }));
      }
    },

    warn(message: string, context?: Omit<LogContext, "service">) {
      if (shouldLog("warn")) {
        output(formatLog("warn", message, { service, ...context }));
      }
    },

    error(message: string, context?: Omit<LogContext, "service">) {
      if (shouldLog("error")) {
        output(formatLog("error", message, { service, ...context }));
      }
    },

    /**
     * Log an API request with timing
     */
    request(
      method: string,
      path: string,
      status: number,
      durationMs: number,
      context?: Omit<LogContext, "service" | "method" | "path" | "status" | "duration">
    ) {
      const level: LogLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
      if (shouldLog(level)) {
        output(
          formatLog(level, `${method} ${path} ${status}`, {
            service,
            method,
            path,
            status,
            duration: durationMs,
            ...context,
          })
        );
      }
    },
  };
}

/**
 * Default logger instance
 */
export const logger = createLogger("app");

/**
 * Middleware helper to log request timing
 */
export function createRequestLogger(service: string) {
  const log = createLogger(service);

  return {
    start(): number {
      return Date.now();
    },

    end(
      startTime: number,
      method: string,
      path: string,
      status: number,
      context?: LogContext
    ) {
      const duration = Date.now() - startTime;
      log.request(method, path, status, duration, context);
    },
  };
}
