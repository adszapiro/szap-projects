import { NextRequest, NextResponse } from "next/server";

// In-memory rate limiting (for single instance deployments)
// For production with multiple instances, use Redis
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 5; // 5 requests
const RATE_WINDOW = 60 * 1000; // per minute

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "anonymous";
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || entry.resetTime < now) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1, reset: Math.ceil((now + RATE_WINDOW) / 1000) };
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) {
    return { allowed: false, remaining: 0, reset: Math.ceil(entry.resetTime / 1000) };
  }

  return { allowed: true, remaining: RATE_LIMIT - entry.count, reset: Math.ceil(entry.resetTime / 1000) };
}

/**
 * Middleware to protect API routes with rate limiting and authentication.
 */
export function middleware(request: NextRequest) {
  // Only protect API routes
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Skip health check endpoint from rate limiting
  if (request.nextUrl.pathname === "/api/health") {
    return NextResponse.next();
  }

  // Rate limiting check
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit(ip);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: rateCheck.reset - Math.floor(Date.now() / 1000),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMIT),
          "X-RateLimit-Remaining": String(rateCheck.remaining),
          "X-RateLimit-Reset": String(rateCheck.reset),
          "Retry-After": String(rateCheck.reset - Math.floor(Date.now() / 1000)),
        },
      }
    );
  }

  // Get API key from environment
  const expectedApiKey = process.env.TRADING_API_KEY;

  // If no API key is configured, allow access (development mode)
  if (!expectedApiKey) {
    const response = NextResponse.next();
    response.headers.set("X-Auth-Warning", "No API key configured - running in open mode");
    response.headers.set("X-RateLimit-Remaining", String(rateCheck.remaining));
    return response;
  }

  // Check for API key in headers
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");

  let providedKey: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    providedKey = authHeader.slice(7);
  } else if (apiKeyHeader) {
    providedKey = apiKeyHeader;
  }

  // Validate the key
  if (!providedKey || providedKey !== expectedApiKey) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Valid API key required. Set x-api-key header or Authorization: Bearer <key>",
      },
      { status: 401 }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Remaining", String(rateCheck.remaining));
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
