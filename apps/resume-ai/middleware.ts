import { NextRequest, NextResponse } from "next/server";

/**
 * Rate limiting middleware for ResumeAI API
 * Protects against abuse and excessive OpenAI API costs
 *
 * Limits: 10 requests per minute per IP
 */

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 10; // 10 requests
const RATE_WINDOW = 60 * 1000; // per minute

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();
  return "anonymous";
}

function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  reset: number;
} {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || entry.resetTime < now) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return {
      allowed: true,
      remaining: RATE_LIMIT - 1,
      reset: Math.ceil((now + RATE_WINDOW) / 1000),
    };
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      reset: Math.ceil(entry.resetTime / 1000),
    };
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT - entry.count,
    reset: Math.ceil(entry.resetTime / 1000),
  };
}

export function middleware(request: NextRequest) {
  // Only rate limit API routes
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Skip health check endpoint
  if (request.nextUrl.pathname === "/api/health") {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const rateCheck = checkRateLimit(ip);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please wait before trying again.",
        retryAfter: rateCheck.reset - Math.floor(Date.now() / 1000),
      },
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(RATE_LIMIT),
          "X-RateLimit-Remaining": String(rateCheck.remaining),
          "X-RateLimit-Reset": String(rateCheck.reset),
          "Retry-After": String(rateCheck.reset - Math.floor(Date.now() / 1000)),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT));
  response.headers.set("X-RateLimit-Remaining", String(rateCheck.remaining));
  response.headers.set("X-RateLimit-Reset", String(rateCheck.reset));
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
