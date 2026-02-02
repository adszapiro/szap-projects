/**
 * Security utilities for input validation
 * Prevents common vulnerabilities like path traversal
 */

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate if a string is a valid UUID v4
 * Prevents directory traversal attacks in Supabase queries
 * 
 * @see CVE-2025-48370 - Supabase auth-js directory traversal vulnerability
 */
export function isValidUUID(id: string): boolean {
  if (!id || typeof id !== "string") return false;
  return UUID_REGEX.test(id);
}

/**
 * Sanitize a UUID - returns null if invalid
 */
export function sanitizeUUID(id: string): string | null {
  if (!isValidUUID(id)) return null;
  return id.toLowerCase();
}

/**
 * Validate multiple UUIDs
 */
export function validateUUIDs(ids: string[]): boolean {
  return ids.every(isValidUUID);
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize URL to prevent open redirect
 */
export function sanitizeRedirectUrl(url: string, allowedHosts: string[]): string | null {
  if (!url || typeof url !== "string") return null;
  
  try {
    const parsed = new URL(url);
    if (!allowedHosts.includes(parsed.host)) {
      return null;
    }
    return url;
  } catch {
    // Relative URLs are OK
    if (url.startsWith("/") && !url.startsWith("//")) {
      return url;
    }
    return null;
  }
}

/**
 * Create a secure headers middleware config
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}
