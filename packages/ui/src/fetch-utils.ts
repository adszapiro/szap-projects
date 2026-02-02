/**
 * Fetch Utilities with Retry Logic
 *
 * Provides reliable HTTP fetching with exponential backoff retry.
 * Based on roadmap.sh backend reliability best practices.
 */

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** HTTP status codes that should trigger a retry (default: [429, 500, 502, 503, 504]) */
  retryStatusCodes?: number[];
  /** Timeout in milliseconds for each request (default: 30000) */
  timeoutMs?: number;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryStatusCodes: [429, 500, 502, 503, 504],
  timeoutMs: 30000,
};

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with jitter to avoid thundering herd
 */
function calculateDelay(
  attempt: number,
  config: Required<RetryConfig>
): number {
  const baseDelay =
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const delay = Math.min(baseDelay, config.maxDelayMs);
  // Add jitter: random value between 0-25% of delay
  const jitter = delay * Math.random() * 0.25;
  return Math.floor(delay + jitter);
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors, timeouts
    return (
      error.name === "AbortError" ||
      error.name === "TypeError" ||
      error.message.includes("network") ||
      error.message.includes("timeout") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ETIMEDOUT")
    );
  }
  return false;
}

/**
 * Fetch with retry and exponential backoff
 *
 * @example
 * ```typescript
 * const response = await fetchWithRetry('https://api.example.com/data', {
 *   method: 'GET',
 *   headers: { 'Authorization': 'Bearer token' }
 * }, {
 *   maxRetries: 3,
 *   timeoutMs: 5000
 * });
 * ```
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = {}
): Promise<Response> {
  const config = { ...DEFAULT_CONFIG, ...retryConfig };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if we should retry based on status code
      if (
        !response.ok &&
        config.retryStatusCodes.includes(response.status) &&
        attempt < config.maxRetries
      ) {
        const delay = calculateDelay(attempt, config);
        console.warn(
          `[fetchWithRetry] Retrying ${url} (attempt ${attempt + 1}/${config.maxRetries}) after ${delay}ms - status ${response.status}`
        );
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry this error
      if (isRetryableError(error) && attempt < config.maxRetries) {
        const delay = calculateDelay(attempt, config);
        console.warn(
          `[fetchWithRetry] Retrying ${url} (attempt ${attempt + 1}/${config.maxRetries}) after ${delay}ms - ${lastError.message}`
        );
        await sleep(delay);
        continue;
      }

      throw lastError;
    }
  }

  // Should not reach here, but just in case
  throw lastError || new Error("Max retries exceeded");
}

/**
 * Fetch JSON with retry and automatic parsing
 */
export async function fetchJsonWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = {}
): Promise<T> {
  const response = await fetchWithRetry(url, options, retryConfig);

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Create a configured fetch function for a specific API
 */
export function createApiFetcher(
  baseUrl: string,
  defaultHeaders: Record<string, string> = {},
  defaultRetryConfig: RetryConfig = {}
) {
  return {
    async get<T>(path: string, options: RequestInit = {}): Promise<T> {
      return fetchJsonWithRetry<T>(
        `${baseUrl}${path}`,
        {
          ...options,
          method: "GET",
          headers: { ...defaultHeaders, ...options.headers },
        },
        defaultRetryConfig
      );
    },

    async post<T>(
      path: string,
      body: unknown,
      options: RequestInit = {}
    ): Promise<T> {
      return fetchJsonWithRetry<T>(
        `${baseUrl}${path}`,
        {
          ...options,
          method: "POST",
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            ...defaultHeaders,
            ...options.headers,
          },
        },
        defaultRetryConfig
      );
    },

    async raw(
      path: string,
      options: RequestInit = {}
    ): Promise<Response> {
      return fetchWithRetry(
        `${baseUrl}${path}`,
        {
          ...options,
          headers: { ...defaultHeaders, ...options.headers },
        },
        defaultRetryConfig
      );
    },
  };
}
